import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { computeLiveStatus, getSiteSettings } from "@/lib/settings";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { randomBytes } from "crypto";
import { studentApplicationSchema } from "@/lib/schemas";
import { parseEgyptianId } from "@/lib/egyptian-id";

export const dynamic = "force-dynamic";

const schema = studentApplicationSchema;

/**
 * Generate a unique, human-readable reference number for a student application.
 * Format: EJS-S-YYYY-NNNNNN (year-scoped, monotonic, collision-resistant).
 * Uses the row count for the year + a 2-digit random suffix to break the
 * TOCTOU race of plain count()+1.
 */
function genReferenceNo(year: number, yearCount: number, suffix: string): string {
  return `EJS-S-${year}-${String(yearCount + 1).padStart(6, "0")}-${suffix}`;
}

export async function POST(req: NextRequest) {
  // 1. Admission-closed gate.
  const settings = await getSiteSettings();
  const live = computeLiveStatus(settings.admission);
  if (live.status === "CLOSED") {
    return NextResponse.json(
      { error: "التقديم مغلق حالياً لهذا العام الدراسي" },
      { status: 403 }
    );
  }

  // 2. Rate limit by IP — 5 submissions per hour, 30 per day.
  const ip = clientIp(req.headers, "unknown");
  const ipHourly = rateLimit({ key: `students:ip:${ip}:h`, max: 5, windowMs: 60 * 60 * 1000 });
  if (!ipHourly.allowed) {
    return NextResponse.json(
      { error: "تجاوزت الحد المسموح من المحاولات. يرجى المحاولة لاحقاً." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(ipHourly.resetMs / 1000)) } }
    );
  }
  const ipDaily = rateLimit({ key: `students:ip:${ip}:d`, max: 30, windowMs: 24 * 60 * 60 * 1000 });
  if (!ipDaily.allowed) {
    return NextResponse.json(
      { error: "تجاوزت الحد اليومي من المحاولات." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(ipDaily.resetMs / 1000)) } }
    );
  }

  // 3. Parse + validate.
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة", details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  // 3a. Server-side birth date extraction from national ID. Never trust the
  // client’s birthDate — the client may submit an empty or stale value.
  const idParsed = parseEgyptianId(parsed.data.nationalId);
  if (!idParsed.valid || !idParsed.birthDate) {
    return NextResponse.json(
      { error: "الرقم القومي غير صالح أو لا يمكن استخراج تاريخ الميلاد منه" },
      { status: 422 }
    );
  }
  parsed.data.birthDate = idParsed.birthDate.toISOString().slice(0, 10);
  if (!parsed.data.termsAccepted) {
    return NextResponse.json(
      { error: "يجب الموافقة على الشروط والأحكام قبل التقديم" },
      { status: 403 }
    );
  }

  // 4. Per-email daily cap (deduplicates the same guardian spamming).
  const emailKey = `students:email:${parsed.data.guardianEmail.toLowerCase()}:d`;
  const emailDaily = rateLimit({ key: emailKey, max: 3, windowMs: 24 * 60 * 60 * 1000 });
  if (!emailDaily.allowed) {
    return NextResponse.json(
      { error: "تم استلام 3 طلبات من هذا البريد خلال 24 ساعة. يرجى المحاولة لاحقاً." },
      { status: 429 }
    );
  }

  // 5. Validate school exists and matches the supplied governorate/city.
  const school = await db.school.findFirst({
    where: {
      id: parsed.data.schoolId,
      governorateId: parsed.data.governorateId,
      cityId: parsed.data.cityId,
      isActive: true,
      isArchived: false,
    },
  });
  if (!school) {
    return NextResponse.json({ error: "المدرسة المختارة غير متاحة" }, { status: 404 });
  }

  // 6. Atomic create + audit. Use cuid-based referenceNo suffix to avoid the
  //    count()+1 TOCTOU race. Uniqueness on `referenceNo` is enforced by
  //    the schema; if the (year, count, suffix) triple collides the unique
  //    constraint throws and we retry once with a fresh suffix.
  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00Z`);
  const yearCount = await db.studentApplication.count({
    where: { submittedAt: { gte: yearStart } },
  });

  let app;
  for (let attempt = 0; attempt < 3; attempt++) {
    const suffix = randomBytes(2).toString("hex").toUpperCase();
    const referenceNo = genReferenceNo(year, yearCount, suffix);
    try {
      app = await db.$transaction(async (tx) => {
        const created = await tx.studentApplication.create({
          data: {
            referenceNo,
            studentNameAr: parsed.data.studentNameAr,
            studentNameEn: parsed.data.studentNameEn || null,
            birthDate: parsed.data.birthDate,
            gender: parsed.data.gender,
            nationalId: parsed.data.nationalId,
            nationality: parsed.data.nationality,
            guardianName: parsed.data.guardianName,
            guardianRelation: parsed.data.guardianRelation,
            guardianPhone: parsed.data.guardianPhone,
            guardianEmail: parsed.data.guardianEmail || null,
            guardianNationalId: parsed.data.guardianNationalId,
            guardianOccupation: parsed.data.guardianOccupation || null,
            governorateId: parsed.data.governorateId,
            cityId: parsed.data.cityId,
            schoolId: parsed.data.schoolId,
            gradeId: parsed.data.gradeId,
            previousSchool: parsed.data.previousSchool || null,
            addressAr: parsed.data.addressAr,
            skillsAnswers: parsed.data.skillsAnswers || null,
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
            entity: "studentApplication",
            entityId: created.id,
            newValue: JSON.stringify({ referenceNo: created.referenceNo, submittedAt: created.submittedAt }),
            summary: `تقديم طالب جديد: ${created.referenceNo}`,
            ip,
            userAgent: req.headers.get("user-agent") || undefined,
          },
        });
        return created;
      });
      break;
    } catch (e: any) {
      // Unique violation on referenceNo → retry with a new suffix.
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
