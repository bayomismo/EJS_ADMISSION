/**
 * Retention sweep. Run via `npm run db:retention` (or via cron / systemd timer
 * in production). Idempotent — only deletes expired rows.
 *
 * Currently purges:
 *  - VerificationCode where expiresAt < now() - 30 days (older than the
 *    useful audit window; codes are already inert after expiresAt).
 *  - AuditLog where createdAt < now() - 2 years (PII minimization).
 *
 * Add new purge rules here and document them in /privacy.
 */
import { db } from "../lib/db";

const VERIFICATION_GRACE_MS = 30 * 24 * 60 * 60 * 1000;
const AUDITLOG_RETENTION_MS = 2 * 365 * 24 * 60 * 60 * 1000;

async function purgeVerificationCodes() {
  const cutoff = new Date(Date.now() - VERIFICATION_GRACE_MS);
  const r = await db.verificationCode.deleteMany({ where: { expiresAt: { lt: cutoff } } });
  return { kind: "verification_codes", deleted: r.count };
}

async function purgeAuditLogs() {
  const cutoff = new Date(Date.now() - AUDITLOG_RETENTION_MS);
  const r = await db.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return { kind: "audit_logs", deleted: r.count };
}

async function main() {
  const results = [];
  results.push(await purgeVerificationCodes());
  results.push(await purgeAuditLogs());
  console.log(JSON.stringify({ at: new Date().toISOString(), results }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });