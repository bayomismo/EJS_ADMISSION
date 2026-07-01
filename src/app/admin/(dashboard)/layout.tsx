import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/admin/login?callbackUrl=/admin");
  }
  const user = {
    name: session.user.name || "مستخدم",
    email: session.user.email || "",
    roleName: (session.user as any).roleName || "",
  };
  const permissions: string[] = (session.user as any).permissions || [];

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar user={user} permissions={permissions} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
