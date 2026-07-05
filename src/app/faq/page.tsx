import { db } from "@/lib/db";
import { PublicShell } from "@/components/public/public-shell";
import { FaqClient } from "@/components/public/faq-client";

export const revalidate = 3600;

export const metadata = {
  title: "الأسئلة الشائعة | المدارس المصرية اليابانية",
  description: "أجوبة عن الأسئلة الأكثر شيوعاً حول التقديم والمناهج والقبول",
};

export default async function FaqPage() {
  const [categories, items] = await Promise.all([
    db.faqCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    db.faq.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
  ]);
  return (
    <PublicShell>
      <FaqClient items={items as any} categories={categories} />
    </PublicShell>
  );
}
