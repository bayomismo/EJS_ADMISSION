import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, SYSTEM_ROLES } from "@/lib/permissions";
import { NextResponse } from "next/server";

export async function getAdminSession() {
  return getServerSession(authOptions);
}

export async function requirePermission(module: string, action: string) {
  const session = await getAdminSession();
  if (!session?.user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "غير مصرح — يرجى تسجيل الدخول" },
        { status: 401 }
      ),
      session: null,
    };
  }
  const perms = new Set((session.user as any).permissions ?? []);
  if (!hasPermission(perms, module, action)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "ليست لديك صلاحية لهذا الإجراء" },
        { status: 403 }
      ),
      session: null,
    };
  }
  return { ok: true as const, response: null, session };
}

/**
 * Require one of the specialized admission-manager roles (or super-admin/admin
 * which inherit everything). Used to gate the student/teacher admission
 * management sections so only the assigned manager can access them.
 *
 * On success, returns the user's `scope` parsed from the User row. Callers
 * MUST inject `where: { schoolId: { in: scope.schoolIds } }` (or governorate)
 * into every list/get/update/delete query. A scope of `{ schoolIds: null }`
 * means full-access (super-admin/admin). An empty array means "no access".
 */
export type AdmissionScope = {
  schoolIds: string[] | null; // null = unrestricted
  governorateIds: string[] | null;
};

export async function requireAdmissionManager(kind: "student" | "teacher") {
  const session = await getAdminSession();
  if (!session?.user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "غير مصرح — يرجى تسجيل الدخول" },
        { status: 401 }
      ),
      session: null,
      scope: null,
    };
  }
  const roleName = (session.user as any).roleName as string;
  const allowed =
    roleName === SYSTEM_ROLES.SUPER_ADMIN ||
    roleName === SYSTEM_ROLES.ADMIN ||
    (kind === "student" && roleName === SYSTEM_ROLES.STUDENT_ADMISSION_MANAGER) ||
    (kind === "teacher" && roleName === SYSTEM_ROLES.TEACHER_ADMISSION_MANAGER);
  if (!allowed) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "هذا القسم مخصص فقط لمدير القبول المختص" },
        { status: 403 }
      ),
      session: null,
      scope: null,
    };
  }

  // Load scope from DB to be safe (the JWT doesn't carry it).
  const userId = (session.user as any).id as string;
  const { db } = await import("@/lib/db");
  const row = await db.user.findUnique({
    where: { id: userId },
    select: { scope: true, role: { select: { name: true } } },
  });
  const isUnrestricted =
    row?.role.name === SYSTEM_ROLES.SUPER_ADMIN || row?.role.name === SYSTEM_ROLES.ADMIN;
  let scope: AdmissionScope = { schoolIds: null, governorateIds: null };
  if (!isUnrestricted && row?.scope) {
    try {
      const parsed = JSON.parse(row.scope);
      scope = {
        schoolIds: Array.isArray(parsed.schoolIds) ? parsed.schoolIds : null,
        governorateIds: Array.isArray(parsed.governorateIds) ? parsed.governorateIds : null,
      };
    } catch {
      scope = { schoolIds: [], governorateIds: [] };
    }
  }
  return { ok: true as const, response: null, session, scope };
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
