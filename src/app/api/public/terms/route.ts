import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/public/terms?slug=student-terms|teacher-terms
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug مطلوب" }, { status: 400 });
  const page = await db.page.findUnique({ where: { slug } });
  if (!page || !page.isActive) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(page);
}
