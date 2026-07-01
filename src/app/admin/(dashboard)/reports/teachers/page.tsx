import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SYSTEM_ROLES } from "@/lib/permissions";
import { ApplicationsManager } from "@/components/admin/applications-manager";

export const dynamic = "force-dynamic";

// Only super-admin, admin, and Teacher Admission Manager can access teacher applications
const ALLOWED = [
  SYSTEM_ROLES.SUPER_ADMIN,
  SYSTEM_ROLES.ADMIN,
  SYSTEM_ROLES.TEACHER_ADMISSION_MANAGER,
];

export default async function AdminReportsTeachersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/admin/login?callbackUrl=/admin/reports/teachers");
  const roleName = (session.user as any).roleName as string;
  if (!ALLOWED.includes(roleName)) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-md rounded-xl border-2 border-rose-200 bg-rose-50 p-8 text-center">
          <h1 className="text-xl font-bold text-rose-700 mb-2">صلاحية غير كافية</h1>
          <p className="text-sm text-rose-600">إدارة طلبات المعلمين مخصصة فقط لمدير قبول المعلمين.</p>
          <p className="text-xs text-rose-500 mt-2">يتم تعيين هذا الدور من قبل مدير النظام.</p>
        </div>
      </div>
    );
  }
  return <ApplicationsManager type="teachers" />;
}
