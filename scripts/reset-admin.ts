/**
 * Reset the super-admin password to a known value.
 * Run via:  npx tsx reset-admin.ts "NewPassword123"
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const newPassword = process.argv[2];
if (!newPassword) {
  console.error("Usage: npx tsx reset-admin.ts 'YourNewPassword'");
  console.error("  (no shell special chars in the password: no $ & ! < > #)");
  process.exit(1);
}

const db = new PrismaClient();
(async () => {
  const hash = await hashPassword(newPassword);
  const user = await db.user.update({
    where: { email: "admin@ejs.gov.eg" },
    data: { passwordHash: hash, mustChangePassword: false },
  });
  console.log("✅ admin@ejs.gov.eg password reset.");
  console.log("   User ID:    ", user.id);
  console.log("   New pass:   ", newPassword);
  console.log("   Active:     ", user.isActive);
  console.log("");
  console.log("You can now log in with:");
  console.log("   email:    admin@ejs.gov.eg");
  console.log("   password: " + newPassword);
  await db.$disconnect();
})();
