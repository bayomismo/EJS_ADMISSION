import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SYSTEM_ROLES } from "@/lib/permissions";
import { ApplicationsManager } from "@/components/admin/applications-manager";

export const dynamic = "force-dynamic";

// Only super-admin, admin, and Student Admission Manager can access student applications
const ALLOWED = [
  SYSTEM_ROLES.SUPER_ADMIN,
  SYSTEM_ROLES.ADMIN,
  SYSTEM_ROLES.STUDENT_ADMISSION_MANAGER,
];

export default async function AdminReportsStudentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/admin/login?callbackUrl=/admin/reports/students");
  const roleName = (session.user as any).roleName as string;
  if (!ALLOWED.includes(roleName)) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-md rounded-xl border-2 border-rose-200 bg-rose-50 p-8 text-center">
          <h1 className="text-xl font-bold text-rose-700 mb-2">صلاحية غير كافية</h1>
          <p className="text-sm text-rose-600">إدارة طلبات الطلاب مخصصة فقط لمدير قبول الطلاب.</p>
          <p className="text-xs text-rose-500 mt-2">يتم تعيين هذا الدور من قبل مدير النظام.</p>
        </div>
      </div>
    );
  }
  return <ApplicationsManager type="students" />;
}
