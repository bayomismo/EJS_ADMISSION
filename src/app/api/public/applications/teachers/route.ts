import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { randomBytes } from "crypto";
import { teacherApplicationSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const schema = teacherApplicationSchema;

function genReferenceNo(year: number, yearCount: number, suffix: string): string {
  return `EJS-T-${year}-${String(yearCount + 1).padStart(6, "0")}-${suffix}`;
}

export async function POST(req: NextRequest) {
  // 1. Rate limit by IP — 5/hour, 30/day. Teachers are far less frequent.
  const ip = clientIp(req.headers, "unknown");
  const ipHourly = rateLimit({ key: `teachers:ip:${ip}:h`, max: 5, windowMs: 60 * 60 * 1000 });
  if (!ipHourly.allowed) {
    return NextResponse.json(
      { error: "تجاوزت الحد المسموح من المحاولات. يرجى المحاولة لاحقاً." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(ipHourly.resetMs / 1000)) } }
    );
  }
  const ipDaily = rateLimit({ key: `teachers:ip:${ip}:d`, max: 30, windowMs: 24 * 60 * 60 * 1000 });
  if (!ipDaily.allowed) {
    return NextResponse.json(
      { error: "تجاوزت الحد اليومي من المحاولات." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(ipDaily.resetMs / 1000)) } }
    );
  }

  // 2. Parse + validate.
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة", details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  if (!parsed.data.termsAccepted) {
    return NextResponse.json(
      { error: "يجب الموافقة على الشروط والأحكام قبل التقديم" },
      { status: 403 }
    );
  }

  // 3. Optional per-email daily cap if email provided.
  if (parsed.data.email) {
    const emailDaily = rateLimit({
      key: `teachers:email:${parsed.data.email.toLowerCase()}:d`,
      max: 3,
      windowMs: 24 * 60 * 60 * 1000,
    });
    if (!emailDaily.allowed) {
      return NextResponse.json(
        { error: "تم استلام 3 طلبات من هذا البريد خلال 24 ساعة." },
        { status: 429 }
      );
    }
  }

  // 4b. One active application per national ID. A teacher may only have
  // ONE non-rejected application at a time. Resubmission is allowed
  // after the admin marks the previous one REJECTED.
  const existing = await db.teacherApplication.findFirst({
    where: {
      nationalId: parsed.data.nationalId,
      status: { not: "REJECTED" },
    },
    select: { id: true, referenceNo: true, status: true, submittedAt: true },
    orderBy: { submittedAt: "desc" },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: "يوجد طلب سابق مسجل بنفس الرقم القومي ولم تتم معالجته بعد.",
        code: "DUPLICATE_APPLICATION",
        details: {
          referenceNo: existing.referenceNo,
          status: existing.status,
          submittedAt: existing.submittedAt.toISOString(),
        },
      },
      { status: 409 }
    );
  }

  // 4. Validate preferred governorate if supplied.
  if (parsed.data.preferredGovernorateId) {
    const gov = await db.governorate.findUnique({
      where: { id: parsed.data.preferredGovernorateId },
    });
    if (!gov || !gov.isActive) {
      return NextResponse.json(
        { error: "المحافظة المفضلة غير متاحة" },
        { status: 404 }
      );
    }
  }

  // 5. Atomic create + audit. ReferenceNo is `<prefix>-<year>-<count>-<suffix>`
  //    to break the count()+1 race; uniqueness is enforced by the schema.
  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00Z`);
  const yearCount = await db.teacherApplication.count({
    where: { submittedAt: { gte: yearStart } },
  });

  let app;
  for (let attempt = 0; attempt < 3; attempt++) {
    const suffix = randomBytes(2).toString("hex").toUpperCase();
    const referenceNo = genReferenceNo(year, yearCount, suffix);
    try {
      app = await db.$transaction(async (tx) => {
        const created = await tx.teacherApplication.create({
          data: {
            referenceNo,
            fullNameAr: parsed.data.fullNameAr,
            fullNameEn: parsed.data.fullNameEn || null,
            birthDate: parsed.data.birthDate,
            gender: parsed.data.gender,
            nationalId: parsed.data.nationalId,
            nationality: parsed.data.nationality,
            phone: parsed.data.phone,
            email: parsed.data.email || null,
            addressAr: parsed.data.addressAr,
            qualification: parsed.data.qualification,
            university: parsed.data.university,
            graduationYear: parsed.data.graduationYear,
            specialization: parsed.data.specialization || null,
            subjects: parsed.data.subjects || null,
            yearsOfExperience: parsed.data.yearsOfExperience,
            currentEmployer: parsed.data.currentEmployer || null,
            currentPosition: parsed.data.currentPosition || null,
            hasTeachingCert: parsed.data.hasTeachingCert,
            preferredGovernorateId: parsed.data.preferredGovernorateId || null,
            cvUrl: parsed.data.cvUrl || null,
            notes: parsed.data.notes || null,
            termsAccepted: true,
            termsAcceptedAt: new Date(),
            termsVersion: parsed.data.termsVersion,
            status: "PENDING",
          },
        });
        await tx.auditLog.create({
          data: {
            userId: null,
            action: "CREATE",
            entity: "teacherApplication",
            entityId: created.id,
            newValue: JSON.stringify({ referenceNo: created.referenceNo, submittedAt: created.submittedAt }),
            summary: `تقديم معلم جديد: ${created.referenceNo}`,
            ip,
            userAgent: req.headers.get("user-agent") || undefined,
          },
        });
        return created;
      });
      break;
    } catch (e: any) {
      const isUnique =
        e?.code === "P2002" || /UNIQUE constraint failed/i.test(String(e?.message));
      if (!isUnique || attempt === 2) throw e;
    }
  }

  if (!app) {
    return NextResponse.json({ error: "فشل توليد رقم مرجعي، يرجى إعادة المحاولة." }, { status: 500 });
  }

  return NextResponse.json({ success: true, referenceNo: app.referenceNo }, { status: 201 });
}
