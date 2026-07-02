// One-shot helper: update the global "apply portal URL" setting + clear
// per-school applicationUrl so every school's "قدّم الآن" button points
// to the same URL.
//
// Usage (PowerShell):
//   $env:DATABASE_URL = "postgresql://...neon.../neondb?sslmode=require"   # DIRECT URL
//   npx tsx scripts/set-portal-url.ts "https://ejs-admission.vercel.app/admission/students"
//
// Or just run with no argument to set it to the default Vercel URL.

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
    const settings = await db.siteSettings.findFirst();
    if (!settings) {
      console.error("No SiteSettings row found. Run `npm run db:seed` first.");
      process.exit(1);
    }

    const general = (settings.general ?? {}) as Record<string, unknown>;
    general.applicationPortalUrl = url;

    await db.siteSettings.update({
      where: { id: settings.id },
      data: { general: general as any },
    });
    console.log("✓ SiteSettings.general.applicationPortalUrl =", url);

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