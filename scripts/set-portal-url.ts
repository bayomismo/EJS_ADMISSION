// One-shot helper: update the global "apply portal URL" setting + clear
// per-school applicationUrl so every school's "قدّم الآن" button points
// to the same URL.
//
// Usage (PowerShell):
//   $env:DATABASE_URL = "postgresql://...neon.../neondb?sslmode=require"   # DIRECT URL
//   npx tsx scripts/set-portal-url.ts "https://ejs-admission.vercel.app/admission/students"
//
// Settings are stored as Setting(key, value:JSON, group). The general
// settings live under SETTING_KEYS.general = "general".

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

async function main() {
  const url = process.argv[2] ?? "https://ejs-admission.vercel.app/admission/students";
  if (!/^https?:\/\//.test(url)) {
    console.error("URL must start with http(s)://");
    process.exit(1);
  }

  const db = new PrismaClient();
  try {
    const row = await db.setting.findUnique({ where: { key: "general" } });
    if (!row) {
      console.error("No Setting(key='general') row found. Run `npm run db:seed` first.");
      process.exit(1);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(row.value);
    } catch {
      console.error("Setting(key='general').value is not valid JSON, aborting.");
      process.exit(1);
    }

    parsed.applicationPortalUrl = url;
    await db.setting.update({
      where: { key: "general" },
      data: { value: JSON.stringify(parsed) },
    });
    console.log("✓ Setting(general).applicationPortalUrl =", url);

    // Clear all school-level applicationUrl so every school falls back to the global setting
    const r = await db.school.updateMany({
      where: { applicationUrl: { not: null } },
      data: { applicationUrl: null },
    });
    console.log(`✓ Cleared applicationUrl on ${r.count} school(s)`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});