import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schoolSchema = z.object({
  code: z.string().min(2).max(50),
  nameAr: z.string().min(2),
  nameEn: z.string().optional().nullable(),
  governorateId: z.string().min(1),
  cityId: z.string().min(1),
  type: z.enum(["ARABIC", "LANGUAGES"]).default("ARABIC"),
  gender: z.enum(["MIXED", "MALE", "FEMALE"]).default("MIXED"),
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
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  facilityIds: z.array(z.string()).optional(),
  gradeIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const guard = await requirePermission("schools", "view");
  if (!guard.ok) return guard.response!;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const governorateId = searchParams.get("governorateId") || undefined;
  const cityId = searchParams.get("cityId") || undefined;
  const type = searchParams.get("type") || undefined;
  const status = searchParams.get("status") || undefined; // active|inactive|archived|featured
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "15")));

  const where: any = {};
  if (q) where.OR = [
    { nameAr: { contains: q } },
    { nameEn: { contains: q } },
    { code: { contains: q } },
  ];
  if (governorateId) where.governorateId = governorateId;
  if (cityId) where.cityId = cityId;
  if (type) where.type = type;
  if (status === "active") { where.isActive = true; where.isArchived = false; }
  if (status === "inactive") { where.isActive = false; }
  if (status === "archived") { where.isArchived = true; }
  if (status === "featured") { where.isFeatured = true; }

  const [items, total] = await Promise.all([
    db.school.findMany({
      where,
      include: {
        governorate: { select: { nameAr: true } },
        city: { select: { nameAr: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.school.count({ where }),
  ]);

  return ok({ items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("schools", "create");
  if (!guard.ok) return guard.response!;

  const body = await req.json().catch(() => null);
  const parsed = schoolSchema.safeParse(body);
  if (!parsed.success) {
    return fail(JSON.stringify(parsed.error.flatten()), 422);
  }
  const { facilityIds, gradeIds, ...data } = parsed.data;

  const existing = await db.school.findUnique({ where: { code: data.code } });
  if (existing) return fail("كود المدرسة مستخدم بالفعل", 409);

  const school = await db.school.create({
    data: {
      ...data,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      capacity: data.capacity ?? null,
      facilities: facilityIds?.length ? { create: facilityIds.map((id) => ({ facilityId: id })) } : undefined,
      grades: gradeIds?.length ? { create: gradeIds.map((id) => ({ gradeId: id })) } : undefined,
    },
  });

  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "CREATE",
    entity: "school",
    entityId: school.id,
    newValue: school,
    summary: `إضافة مدرسة: ${school.nameAr}`,
    req,
  });

  return ok(school, 201);
}
