// One-shot destructive reset:
//  - Deletes all test/old student applications + teacher applications
//  - Deletes all schools
//  - Audit-logs the deletion
//
// Rationale: the existing 128 schools include many duplicates and ones
// that don't match the official MoE 2026/2027 list. The 7 sample
// student applications were from the dev cycle and reference obsolete
// school IDs. New cycle = clean slate.
//
// Safe to re-run if partial sync already created new schools.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const tApps = await db.teacherApplication.count();
  const sApps = await db.studentApplication.count();
  const schools = await db.school.count();
  console.log(`Before reset: ${schools} schools, ${sApps} student apps, ${tApps} teacher apps`);

  if (sApps > 0) {
    console.log(`Deleting ${sApps} student applications`);
    await db.studentApplication.deleteMany({});
  }
  if (tApps > 0) {
    console.log(`Deleting ${tApps} teacher applications`);
    await db.teacherApplication.deleteMany({});
  }

  if (schools > 0) {
    console.log(`Deleting ${schools} schools`);
    await db.school.deleteMany({});
  }

  await db.auditLog.create({
    data: {
      userId: null,
      action: "BULK_DELETE",
      entity: "School",
      entityId: "pre-moe-sync-reset",
      summary: `Reset before MoE 2026/2027 sync: deleted ${schools} schools, ${sApps} student apps, ${tApps} teacher apps`,
    },
  });

  const after = {
    schools: await db.school.count(),
    sApps: await db.studentApplication.count(),
    tApps: await db.teacherApplication.count(),
  };
  console.log(`After reset:`, after);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });