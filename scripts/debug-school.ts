// Diagnostic: list every school with its key fields so we can see why
// a school appears in search but 404s on /schools/[code].
//
// Usage (PowerShell):
//   $env:DATABASE_URL = "postgresql://...neon.../neondb?sslmode=require"   # DIRECT URL
//   npx tsx scripts/debug-school.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const schools = await db.school.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      code: true,
      nameAr: true,
      isActive: true,
      isArchived: true,
      governorateId: true,
      cityId: true,
      createdAt: true,
      governorate: { select: { nameAr: true } },
      city: { select: { nameAr: true } },
    },
  });

  console.log(`Found ${schools.length} school(s), newest first:\n`);
  for (const s of schools) {
    console.log(`• code=${JSON.stringify(s.code)}  (length=${s.code.length})`);
    console.log(`  name=${s.nameAr}`);
    console.log(`  isActive=${s.isActive}  isArchived=${s.isArchived}`);
    console.log(`  gov=${s.governorate?.nameAr}  city=${s.city?.nameAr}`);
    console.log(`  created=${s.createdAt.toISOString()}`);
    console.log(`  detail-url=/schools/${encodeURIComponent(s.code)}`);
    console.log();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });