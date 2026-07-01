import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [categories, items] = await Promise.all([
    db.faqCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    db.faq.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
  ]);
  return NextResponse.json({ categories, items });
}
