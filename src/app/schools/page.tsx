import { db } from "@/lib/db";
import { PublicShell } from "@/components/public/public-shell";
import { SchoolFinder } from "@/components/public/school-finder";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "المدارس | المدارس المصرية اليابانية",
  description: "ابحث عن أقرب مدرسة مصرية يابانية حسب المحافظة والمدينة ونوع التعليم",
  openGraph: { title: "مدارسنا", locale: "ar_EG", type: "website" },
};

export default async function SchoolsPage() {
  const governorates = await db.governorate.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      cities: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, nameAr: true, nameEn: true },
      },
      _count: { select: { schools: { where: { isActive: true, isArchived: false } } } },
    },
  });

  return (
    <PublicShell>
      <SchoolFinder governorates={governorates as any} />
    </PublicShell>
  );
}
