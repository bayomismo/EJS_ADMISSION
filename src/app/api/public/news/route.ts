import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/public/news?slug=&category=&featured=&page=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const category = searchParams.get("category") || undefined;
  const featured = searchParams.get("featured") === "true" ? true : undefined;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(30, Math.max(1, Number(searchParams.get("pageSize") || "9")));

  if (slug) {
    const news = await db.news.findUnique({
      where: { slug },
      include: { category: true },
    });
    if (!news || news.status !== "PUBLISHED") {
      return NextResponse.json({ error: "الخبر غير موجود" }, { status: 404 });
    }
    await db.news.update({ where: { id: news.id }, data: { viewCount: { increment: 1 } } });
    return NextResponse.json(news);
  }

  const where = {
    status: "PUBLISHED" as const,
    publishedAt: { lte: new Date() },
    ...(category ? { category: { slug: category } } : {}),
    ...(featured ? { isFeatured: true } : {}),
  };
  const [items, total, categories] = await Promise.all([
    db.news.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: true },
    }),
    db.news.count({ where }),
    db.newsCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    categories,
  });
}
