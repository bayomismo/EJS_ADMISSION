import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  // personal
  fullNameAr: z.string().min(3),
  fullNameEn: z.string().optional().nullable(),
  birthDate: z.string().min(6),
  gender: z.enum(["MALE", "FEMALE", "MIXED"]),
  nationalId: z.string().length(14),
  nationality: z.string().default("مصري"),
  phone: z.string().min(10),
  email: z.string().email().optional().nullable(),
  addressAr: z.string().min(3),
  // qualifications
  qualification: z.string().min(2),
  university: z.string().min(2),
  graduationYear: z.number().int().min(1970).max(new Date().getFullYear()),
  specialization: z.string().optional().nullable(),
  subjects: z.string().optional().nullable(),
  yearsOfExperience: z.number().int().min(0).default(0),
  currentEmployer: z.string().optional().nullable(),
  currentPosition: z.string().optional().nullable(),
  hasTeachingCert: z.boolean().default(false),
  // preference
  preferredGovernorateId: z.string().optional().nullable(),
  // misc
  cvUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // terms (CRITICAL)
  termsAccepted: z.literal(true),
  termsVersion: z.string().min(1),
});

// POST /api/public/applications/teachers
export async function POST(req: NextRequest) {
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

  const count = await db.teacherApplication.count();
  const year = new Date().getFullYear();
  const referenceNo = `EJS-T-${year}-${String(count + 1).padStart(6, "0")}`;

  const app = await db.teacherApplication.create({
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

  return NextResponse.json({ success: true, referenceNo: app.referenceNo, id: app.id }, { status: 201 });
}
