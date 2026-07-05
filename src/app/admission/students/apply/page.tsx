import { db } from "@/lib/db";
import { getSiteSettings, computeLiveStatus } from "@/lib/settings";
import { PublicShell } from "@/components/public/public-shell";
import { StudentApplicationForm } from "@/components/public/student-application-form";

export const dynamic = "force-dynamic";

export default async function StudentApplyPage() {
  const settings = await getSiteSettings();
  const live = computeLiveStatus(settings.admission);

  const [governorates, cities, schools, grades] = await Promise.all([
    db.governorate.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true } }),
    db.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true, governorateId: true } }),
    db.school.findMany({ where: { isActive: true, isArchived: false }, orderBy: { nameAr: "asc" }, select: { id: true, nameAr: true, code: true, governorateId: true, cityId: true, type: true } }),
    db.grade.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true } }),
  ]);

  return (
    <PublicShell>
      <div className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <a href="/" className="hover:text-primary">الرئيسية</a>
            <span className="opacity-50">/</span>
            <a href="/admission/students" className="hover:text-primary">تقديم الطلاب</a>
            <span className="opacity-50">/</span>
            <span className="text-foreground font-medium">استمارة التقديم</span>
          </div>
          <h1 className="text-2xl font-extrabold">استمارة تقديم طالب</h1>
          <p className="text-sm text-muted-foreground mt-1">العام الدراسي {settings.admission.year}</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <StudentApplicationForm
          governorates={governorates}
          cities={cities}
          schools={schools}
          grades={grades}
          admissionOpen={live.status === "OPEN"}
          admissionYear={settings.admission.year}
        />
      </div>
    </PublicShell>
  );
}
