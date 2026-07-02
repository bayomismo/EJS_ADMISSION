import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint. Returns whether the DB is reachable, whether
 * NEXTAUTH_URL matches the request, and the count of seeded users.
 * Use this when /admin/login is failing to identify the cause.
 *
 * GET /api/auth/debug  (no auth — public for debugging)
 */
export async function GET(req: NextRequest) {
  const expectedBase =
    process.env.NEXTAUTH_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const urlMatch =
    req.nextUrl.protocol + "//" + req.nextUrl.host === expectedBase ||
    new URL(expectedBase).host === req.nextUrl.host;

  let userCount = -1;
  let dbOk = false;
  let dbError: string | null = null;
  try {
    userCount = await db.user.count();
    dbOk = true;
  } catch (e: any) {
    dbError = e?.message?.slice(0, 200) || "unknown";
  }

  return NextResponse.json({
    now: new Date().toISOString(),
    requestHost: req.nextUrl.host,
    requestOrigin: `${req.nextUrl.protocol}//${req.nextUrl.host}`,
    envNEXTAUTH_URL: process.env.NEXTAUTH_URL || null,
    envDATABASE_URL_set: Boolean(process.env.DATABASE_URL),
    envNEXTAUTH_SECRET_set: Boolean(process.env.NEXTAUTH_SECRET),
    urlMatch,
    db: {
      ok: dbOk,
      userCount,
      error: dbError,
    },
  });
}
