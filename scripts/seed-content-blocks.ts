// Idempotent seed: insert default ContentBlock rows for the marketing
// copy that is currently hardcoded in the public pages. Re-runnable;
// will only insert rows that don't already exist (so admins' custom
// edits are preserved).
//
// Usage (PowerShell):
//   $env:DATABASE_URL = "postgresql://...neon DIRECT URL..."
//   npx tsx scripts/seed-content-blocks.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface BlockDef {
  key: string;
  valueAr: string;
  valueEn?: string;
  group: string;
  label: string;
  description?: string;
}

const BLOCKS: BlockDef[] = [
  // Homepage hero
  { key: "home.hero.titleSuffix", group: "homepage", label: "عنوان الهيرو (السطر الثاني)",
    description: "السطر الثاني من عنوان الصفحة الرئيسية، يظهر تحت اسم الموقع",
    valueAr: "بوابة القبول الإلكتروني 2026/2027" },
  { key: "home.hero.description", group: "homepage", label: "وصف الهيرو",
    description: "الفقرة التعريفية تحت العنوان",
    valueAr: "ابحث عن مدرستك من بين أكثر من {schools} مدرسة موزعة على {governorates} محافظة. تابع شروط القبول، واطّلع على تفاصيل المدارس، وقدّم طلبك إلكترونياً عبر البوابة الرسمية." },
  { key: "home.hero.ctaPrimary", group: "homepage", label: "زر الهيرو الأول",
    description: "نص الزر الرئيسي في الهيرو (يوجه للبحث عن مدارس)",
    valueAr: "ابحث عن مدرسة" },
  { key: "home.hero.ctaSecondary", group: "homepage", label: "زر الهيرو الثاني",
    description: "نص الزر الثانوي في الهيرو (يوجه للمستندات)",
    valueAr: "شروط القبول" },

  // Footer
  { key: "footer.description", group: "footer", label: "وصف الفوتر",
    description: "الفقرة التعريفية تحت شعار الموقع في الفوتر",
    valueAr: "تجربة تعليمية تستحق — البوابة الرسمية للقبول الإلكتروني للمدارس المصرية اليابانية." },
  { key: "footer.quickLinksTitle", group: "footer", label: "عنوان عمود الروابط السريعة",
    valueAr: "روابط سريعة" },
  { key: "footer.contactTitle", group: "footer", label: "عنوان عمود التواصل",
    valueAr: "تواصل معنا" },
  { key: "footer.socialTitle", group: "footer", label: "عنوان عمود التواصل الاجتماعي",
    valueAr: "تابعنا" },

  // Student admission landing
  { key: "admission.students.heroTitle", group: "admission.students", label: "عنوان هيرو تقديم الطلاب",
    description: "العنوان الرئيسي في صفحة /admission/students",
    valueAr: "تقديم طلب الالتحاق بالمدارس المصرية اليابانية" },
  { key: "admission.students.heroSubtitle", group: "admission.students", label: "وصف هيرو تقديم الطلاب",
    description: "السطر تحت العنوان",
    valueAr: "للعام الدراسي 2026/2027 — رياض أطفال KG1 حتى الصف الثالث الابتدائي" },
  { key: "admission.students.stepsSubtitle", group: "admission.students", label: "وصف قسم الخطوات",
    valueAr: "أربع خطوات بسيطة لإتمام طلب الالتحاق" },
  { key: "admission.students.requirementsTitle", group: "admission.students", label: "عنوان قسم الشروط",
    valueAr: "شروط ومتطلبات التقديم" },

  // Teacher admission landing
  { key: "admission.teachers.heroTitle", group: "admission.teachers", label: "عنوان هيرو تقديم المعلمين",
    valueAr: "انضم لفريق المدارس المصرية اليابانية" },
  { key: "admission.teachers.heroSubtitle", group: "admission.teachers", label: "وصف هيرو تقديم المعلمين",
    valueAr: "تقدم للعمل بمنهجية «توكاتسو» اليابانية — بيئة تعليمية متميزة في أكثر من {schools} مدرسة على مستوى الجمهورية" },
];

async function main() {
  console.log(`🌱 Seeding ${BLOCKS.length} ContentBlocks...\n`);
  let created = 0, skipped = 0;
  for (const b of BLOCKS) {
    const existing = await db.contentBlock.findUnique({ where: { key: b.key } });
    if (existing) {
      console.log(`  ⏭ ${b.key} (exists)`);
      skipped++;
      continue;
    }
    await db.contentBlock.create({
      data: {
        key: b.key,
        valueAr: b.valueAr,
        valueEn: b.valueEn || null,
        group: b.group,
        label: b.label,
        description: b.description || null,
        isActive: true,
      },
    });
    console.log(`  ✓ ${b.key}`);
    created++;
  }
  console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });