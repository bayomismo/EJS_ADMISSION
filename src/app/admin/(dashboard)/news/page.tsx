import { db } from "@/lib/db";
import { NewsManager } from "@/components/admin/news-manager";
export const dynamic = "force-dynamic";
export default async function AdminNewsPage() {
  const categories = await db.newsCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true } });
  return <NewsManager categories={categories} />;
}
