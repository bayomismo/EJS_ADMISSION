/**
 * Reset the super-admin password to a value you choose.
 *
 * Run from your machine with the DIRECT Neon URL (not the pooler):
 *   $env:DATABASE_URL = 'postgresql://neondb_owner:PASS@HOST/DB?sslmode=require'
 *   npx tsx reset-admin.ts "MyNewPassword123"
 *
 * The password must be ASCII letters and digits only — no $ & ! @ # etc.
 * to avoid URL-escaping issues in PowerShell.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const newPassword = process.argv[2];
if (!newPassword) {
  console.error("Usage: npx tsx reset-admin.ts <NewPassword>");
  console.error("Example: npx tsx reset-admin.ts AdminEJS2026");
  process.exit(1);
}
if (!/^[A-Za-z0-9]+$/.test(newPassword)) {
  console.error("Error: password must be ASCII letters and digits only (no special chars).");
  process.exit(1);
}

const db = new PrismaClient();
(async () => {
  // First, check the user exists and is active
  const existing = await db.user.findUnique({
    where: { email: "admin@ejs.gov.eg" },
    select: { id: true, isActive: true, mustChangePassword: true },
  });
  if (!existing) {
    console.error("ERROR: admin@ejs.gov.eg does not exist in the DB.");
    console.error("Re-run the seed first: ALLOW_PROD_SEED=1 NODE_ENV=production npx tsx prisma/seed.ts");
    await db.$disconnect();
    process.exit(1);
  }
  if (!existing.isActive) {
    console.error("WARN: user isActive=false. Activating...");
    await db.user.update({ where: { id: existing.id }, data: { isActive: true } });
  }

  const hash = await hashPassword(newPassword);
  const updated = await db.user.update({
    where: { id: existing.id },
    data: { passwordHash: hash, mustChangePassword: false, isActive: true },
  });
  console.log("OK: admin password reset.");
  console.log("   email:    admin@ejs.gov.eg");
  console.log("   password: " + newPassword);
  console.log("   active:   " + updated.isActive);
  await db.$disconnect();
})().catch((e) => {
  console.error("Reset failed:", e?.message || e);
  process.exit(1);
});
