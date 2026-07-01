import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
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

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
