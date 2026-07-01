import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (slug) {
    const page = await db.page.findUnique({ where: { slug } });
    if (!page || !page.isActive) {
      return NextResponse.json({ error: "الصفحة غير موجودة" }, { status: 404 });
    }
    return NextResponse.json(page);
  }
  const pages = await db.page.findMany({
    where: { isActive: true },
    select: { slug: true, titleAr: true, titleEn: true },
    orderBy: { titleAr: "asc" },
  });
  return NextResponse.json(pages);
}
