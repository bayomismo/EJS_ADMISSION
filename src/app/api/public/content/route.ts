// GET /api/public/content?key=X
//
// Returns the public-facing valueAr (and label, optional valueEn) for a
// ContentBlock by key, or 404 if missing. Used by the public site
// (TermsGate, etc.) to load admin-editable text.
//
// Rate-limited to 60/hour/IP — it's a small public endpoint, no abuse.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 60;
const hits = new Map<string, number[]>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const arr = hits.get(ip) || [];
  const fresh = arr.filter((t) => now - t < WINDOW_MS);
  fresh.push(now);
  hits.set(ip, fresh);
  return fresh.length <= LIMIT;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "تجاوز الحد المسموح" }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key مطلوب" }, { status: 400 });
  const block = await db.contentBlock.findUnique({
    where: { key },
    select: { key: true, valueAr: true, valueEn: true, label: true, isActive: true },
  });
  if (!block || !block.isActive) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }
  return NextResponse.json({
    key: block.key,
    valueAr: block.valueAr,
    valueEn: block.valueEn,
    label: block.label,
  });
}