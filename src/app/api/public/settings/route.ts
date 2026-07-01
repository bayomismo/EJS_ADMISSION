import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSiteSettings();
  const [banners, announcements] = await Promise.all([
    db.banner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 5,
    }),
    db.announcement.findMany({
      where: {
        isActive: true,
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      orderBy: { sortOrder: "asc" },
      take: 6,
    }),
  ]);
  return NextResponse.json({ settings, banners, announcements });
}
