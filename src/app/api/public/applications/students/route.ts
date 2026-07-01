import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { computeLiveStatus, getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const schema = z.object({
  // student
  studentNameAr: z.string().min(3),
  studentNameEn: z.string().optional().nullable(),
  birthDate: z.string().min(6),
  gender: z.enum(["MALE", "FEMALE", "MIXED"]),
  nationalId: z.string().length(14),
  nationality: z.string().default("مصري"),
  // guardian
  guardianName: z.string().min(3),
  guardianRelation: z.string().min(2),
  guardianPhone: z.string().min(10),
  guardianEmail: z.string().email().optional().nullable(),
  guardianNationalId: z.string().length(14),
  guardianOccupation: z.string().optional().nullable(),
  // placement
  governorateId: z.string().min(1),
  cityId: z.string().min(1),
  schoolId: z.string().min(1),
  gradeId: z.string().min(1),
  previousSchool: z.string().optional().nullable(),
  addressAr: z.string().min(3),
  // assessment
  skillsAnswers: z.string().optional().nullable(), // JSON string
  notes: z.string().optional().nullable(),
  // terms (CRITICAL)
  termsAccepted: z.literal(true),
  termsVersion: z.string().min(1),
});

// POST /api/public/applications/students
export async function POST(req: NextRequest) {
  const settings = await getSiteSettings();
  const live = computeLiveStatus(settings.admission);

  // hard gate: no submissions when admission closed
  if (live.status === "CLOSED") {
    return NextResponse.json(
      { error: "التقديم مغلق حالياً لهذا العام الدراسي" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // CRITICAL: enforce terms acceptance server-side
  if (!parsed.data.termsAccepted) {
    return NextResponse.json(
      { error: "يجب الموافقة على الشروط والأحكام قبل التقديم" },
      { status: 403 }
    );
  }

  // validate school exists and matches governorate/city
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

  // generate reference number
  const count = await db.studentApplication.count();
  const year = new Date().getFullYear();
  const referenceNo = `EJS-S-${year}-${String(count + 1).padStart(6, "0")}`;

  const app = await db.studentApplication.create({
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

  return NextResponse.json({ success: true, referenceNo: app.referenceNo, id: app.id }, { status: 201 });
}
