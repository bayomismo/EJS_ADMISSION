import { db } from "@/lib/db";
import { UsersManager } from "@/components/admin/users-manager";
export const dynamic = "force-dynamic";
export default async function AdminUsersPage() {
  const data = await db.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, roleId: true, isActive: true, lastLoginAt: true, createdAt: true, role: { select: { id: true, name: true, description: true } } } });
  const roles = await db.role.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: true } } } });
  return <UsersManager roles={roles} />;
}
