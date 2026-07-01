import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schoolUpdateSchema = z.object({
  code: z.string().min(2).max(50).optional(),
  nameAr: z.string().min(2).optional(),
  nameEn: z.string().optional().nullable(),
  governorateId: z.string().min(1).optional(),
  cityId: z.string().min(1).optional(),
  type: z.enum(["ARABIC", "LANGUAGES"]).optional(),
  gender: z.enum(["MIXED", "MALE", "FEMALE"]).optional(),
  addressAr: z.string().optional().nullable(),
  addressEn: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  capacity: z.number().int().optional().nullable(),
  applicationUrl: z.string().optional().nullable(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  facilityIds: z.array(z.string()).optional(),
  gradeIds: z.array(z.string()).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("schools", "view");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const school = await db.school.findUnique({
    where: { id },
    include: {
      governorate: true,
      city: true,
      facilities: { include: { facility: true } },
      grades: { include: { grade: true } },
    },
  });
  if (!school) return fail("المدرسة غير موجودة", 404);
  return ok(school);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("schools", "update");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schoolUpdateSchema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);

  const { facilityIds, gradeIds, ...data } = parsed.data;
  const old = await db.school.findUnique({ where: { id } });
  if (!old) return fail("المدرسة غير موجودة", 404);

  if (data.code && data.code !== old.code) {
    const dup = await db.school.findUnique({ where: { code: data.code } });
    if (dup) return fail("كود المدرسة مستخدم بالفعل", 409);
  }

  const school = await db.school.update({ where: { id }, data });

  if (facilityIds) {
    await db.schoolFacility.deleteMany({ where: { schoolId: id } });
    if (facilityIds.length) {
      await db.schoolFacility.createMany({ data: facilityIds.map((fid) => ({ schoolId: id, facilityId: fid })) });
    }
  }
  if (gradeIds) {
    await db.schoolGrade.deleteMany({ where: { schoolId: id } });
    if (gradeIds.length) {
      await db.schoolGrade.createMany({ data: gradeIds.map((gid) => ({ schoolId: id, gradeId: gid })) });
    }
  }

  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "UPDATE",
    entity: "school",
    entityId: id,
    oldValue: old,
    newValue: school,
    summary: `تعديل مدرسة: ${school.nameAr}`,
    req,
  });

  return ok(school);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("schools", "delete");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const old = await db.school.findUnique({ where: { id } });
  if (!old) return fail("المدرسة غير موجودة", 404);

  await db.school.delete({ where: { id } });

  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "DELETE",
    entity: "school",
    entityId: id,
    oldValue: old,
    summary: `حذف مدرسة: ${old.nameAr}`,
    req,
  });

  return ok({ success: true });
}
