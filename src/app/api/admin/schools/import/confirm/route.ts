import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const confirmSchema = z.array(z.object({
  code: z.string(),
  nameAr: z.string(),
  nameEn: z.string().optional(),
  governorateId: z.string(),
  cityId: z.string(),
  type: z.enum(["ARABIC", "LANGUAGES"]),
  gender: z.enum(["MIXED", "MALE", "FEMALE"]),
  address: z.string().optional(),
  capacity: z.number().nullable().optional(),
}));

export async function POST(req: NextRequest) {
  const guard = await requirePermission("schools", "create");
  if (!guard.ok) return guard.response!;

  const body = await req.json().catch(() => null);
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);

  const data = parsed.data.map((r) => ({
    code: r.code,
    nameAr: r.nameAr,
    nameEn: r.nameEn || null,
    governorateId: r.governorateId,
    cityId: r.cityId,
    type: r.type,
    gender: r.gender,
    addressAr: r.address || null,
    capacity: r.capacity ?? null,
    descriptionAr: `تتبنى ${r.nameAr} نظام التعليم الياباني «توكاتسو» الذي يركز على تنمية شخصية الطفل بشكل متكامل.`,
    applicationUrl: "https://ejs-admission.vercel.app/admission/students",
    isActive: true,
    isArchived: false,
    isFeatured: false,
  }));

  const result = await db.school.createMany({ data, skipDuplicates: true });

  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "BULK",
    entity: "school",
    newValue: { count: result.count },
    summary: `استيراد ${result.count} مدرسة من ملف Excel`,
    req,
  });

  return ok({ success: true, count: result.count });
}
