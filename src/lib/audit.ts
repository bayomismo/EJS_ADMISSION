import { db } from "@/lib/db";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";

export async function logAudit(params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  summary?: string;
  req?: NextRequest;
}) {
  let ip: string | undefined;
  let userAgent: string | undefined;
  if (params.req) {
    ip =
      params.req.headers.get("x-real-ip") ||
      params.req.headers.get("x-forwarded-for")?.split(",")[0] ||
      undefined;
    userAgent = params.req.headers.get("user-agent") || undefined;
  } else {
    const h = await headers();
    ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || undefined;
    userAgent = h.get("user-agent") || undefined;
  }

  try {
    await db.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
        summary: params.summary ?? null,
        ip,
        userAgent,
      },
    });
  } catch (e) {
    // audit logging must never break the main operation
    console.error("audit log failed", e);
  }
}
