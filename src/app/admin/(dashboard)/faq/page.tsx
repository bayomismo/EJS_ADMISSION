import { db } from "@/lib/db";
import { FaqManager } from "@/components/admin/faq-manager";
export const dynamic = "force-dynamic";
export default async function AdminFaqPage() {
  const categories = await db.faqCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true } });
  return <FaqManager categories={categories} />;
}
