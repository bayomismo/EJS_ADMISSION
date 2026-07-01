import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron entry point. Verifies the bearer token (set as Vercel env var
 * `CRON_SECRET`; Vercel injects `Authorization: Bearer <CRON_SECRET>` on
 * cron invocations), runs the retention sweep, and returns a summary.
 *
 * Configure in vercel.json:
 *   "crons": [{ "path": "/api/cron/retention", "schedule": "0 3 * * *" }]
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const VERIFICATION_GRACE_MS = 30 * 24 * 60 * 60 * 1000;
  const AUDITLOG_RETENTION_MS = 2 * 365 * 24 * 60 * 60 * 1000;

  const vcCutoff = new Date(Date.now() - VERIFICATION_GRACE_MS);
  const alCutoff = new Date(Date.now() - AUDITLOG_RETENTION_MS);

  const vcRes = await db.verificationCode.deleteMany({ where: { expiresAt: { lt: vcCutoff } } });
  const alRes = await db.auditLog.deleteMany({ where: { createdAt: { lt: alCutoff } } });

  const summary = {
    ok: true,
    at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    purged: {
      verification_codes: vcRes.count,
      audit_logs: alRes.count,
    },
  };

  await logAudit({
    action: "BULK",
    entity: "retention",
    summary: `Retention sweep: ${vcRes.count} VerificationCodes, ${alRes.count} AuditLogs purged`,
  });

  return NextResponse.json(summary);
}