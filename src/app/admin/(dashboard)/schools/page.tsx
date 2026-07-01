import { db } from "@/lib/db";
import { SchoolsManager } from "@/components/admin/schools-manager";

export const dynamic = "force-dynamic";

export default async function AdminSchoolsPage() {
  const [governorates, cities, facilities, grades] = await Promise.all([
    db.governorate.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true } }),
    db.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true, governorateId: true } }),
    db.facility.findMany({ orderBy: { nameAr: "asc" }, select: { id: true, nameAr: true } }),
    db.grade.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true } }),
  ]);

  return <SchoolsManager governorates={governorates} cities={cities} facilities={facilities} grades={grades} />;
}
