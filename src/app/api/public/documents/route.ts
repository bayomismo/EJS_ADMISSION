import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;

  const where = {
    isActive: true,
    ...(category ? { category: { slug: category } } : {}),
  };
  const [items, categories] = await Promise.all([
    db.document.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    db.documentCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return NextResponse.json({ items, categories });
}
