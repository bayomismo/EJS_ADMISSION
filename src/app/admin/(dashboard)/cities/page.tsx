import { db } from "@/lib/db";
import { CitiesManager } from "@/components/admin/cities-manager";
export const dynamic = "force-dynamic";
export default async function AdminCitiesPage() {
  const governorates = await db.governorate.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true } });
  return <CitiesManager governorates={governorates} />;
}
