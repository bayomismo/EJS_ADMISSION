import { db } from "@/lib/db";
import { PublicShell } from "@/components/public/public-shell";
import { TeacherApplicationForm } from "@/components/public/teacher-application-form";

export const dynamic = "force-dynamic";

export default async function TeacherApplyPage() {
  const governorates = await db.governorate.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true } });
  return (
    <PublicShell>
      <div className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <a href="/" className="hover:text-primary">الرئيسية</a>
            <span className="opacity-50">/</span>
            <a href="/admission/teachers" className="hover:text-primary">تقديم المعلمين</a>
            <span className="opacity-50">/</span>
            <span className="text-foreground font-medium">استمارة التقديم</span>
          </div>
          <h1 className="text-2xl font-extrabold">استمارة تقديم معلم</h1>
          <p className="text-sm text-muted-foreground mt-1">للعمل بالمدارس المصرية اليابانية</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <TeacherApplicationForm governorates={governorates} />
      </div>
    </PublicShell>
  );
}
