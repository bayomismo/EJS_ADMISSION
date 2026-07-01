import { db } from "@/lib/db";
import { DocumentsManager } from "@/components/admin/documents-manager";
export const dynamic = "force-dynamic";
export default async function AdminDocumentsPage() {
  const categories = await db.documentCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true } });
  return <DocumentsManager categories={categories} />;
}
