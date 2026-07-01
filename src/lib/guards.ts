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
 */
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
    };
  }
  return { ok: true as const, response: null, session };
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
