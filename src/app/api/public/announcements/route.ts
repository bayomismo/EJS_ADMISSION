import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await db.announcement.findMany({
    where: {
      isActive: true,
      startDate: { lte: new Date() },
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(items);
}
