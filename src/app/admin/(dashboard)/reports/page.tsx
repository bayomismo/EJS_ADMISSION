import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SYSTEM_ROLES } from "@/lib/permissions";
import { ReportsDashboard } from "@/components/admin/reports-dashboard";

export const dynamic = "force-dynamic";

const ALLOWED = [
  SYSTEM_ROLES.SUPER_ADMIN,
  SYSTEM_ROLES.ADMIN,
  SYSTEM_ROLES.STUDENT_ADMISSION_MANAGER,
  SYSTEM_ROLES.TEACHER_ADMISSION_MANAGER,
];

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/admin/login?callbackUrl=/admin/reports");
  const roleName = (session.user as any).roleName as string;
  if (!ALLOWED.includes(roleName)) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-md rounded-xl border-2 border-rose-200 bg-rose-50 p-8 text-center">
          <h1 className="text-xl font-bold text-rose-700 mb-2">صلاحية غير كافية</h1>
          <p className="text-sm text-rose-600">هذا القسم مخصص فقط لمديري القبول المختصين.</p>
        </div>
      </div>
    );
  }
  return <ReportsDashboard />;
}
