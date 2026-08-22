// /api/public/applications/documents/[id]
//
// DELETE lets an applicant remove one of their own uploaded documents as
// long as it has not been verified by the admission team yet. Ownership is
// re-checked against referenceNo + nationalId query params.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { deleteUploadFile } from "@/lib/media-storage";
import { findOwnedApplication, isApplicationKind } from "@/lib/application-docs";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = clientIp(req.headers, "unknown");
  const rl = rateLimit({ key: `docs:del:ip:${ip}:h`, max: 20, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "تجاوزت الحد المسموح من المحاولات. يرجى المحاولة لاحقاً." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "";
  const referenceNo = (searchParams.get("referenceNo") || "").trim();
  const nationalId = (searchParams.get("nationalId") || "").trim();

  if (!isApplicationKind(type)) {
    return NextResponse.json({ error: "نوع طلب غير صالح" }, { status: 400 });
  }

  const app = await findOwnedApplication(type, referenceNo, nationalId);
  if (!app) {
    return NextResponse.json(
      { error: "لم يتم العثور على طلب بهذه البيانات." },
      { status: 404 }
    );
  }

  const where =
    type === "teachers"
      ? { id, teacherAppId: app.id }
      : { id, studentAppId: app.id };
  const doc = await db.applicationDocument.findFirst({ where });
  if (!doc) return NextResponse.json({ error: "المستند غير موجود" }, { status: 404 });

  if (doc.reviewStatus === "VERIFIED") {
    return NextResponse.json(
      { error: "لا يمكن حذف مستند تم اعتماده من الإدارة" },
      { status: 409 }
    );
  }

  await db.applicationDocument.delete({ where: { id: doc.id } });
  await deleteUploadFile(doc.filename);

  await logAudit({
    userId: null,
    action: "DELETE",
    entity: "applicationDocument",
    entityId: doc.id,
    oldValue: { docType: doc.docType, kind: type, referenceNo: app.referenceNo },
    summary: `حذف مستند (${doc.docType}) من الطلب ${app.referenceNo} بواسطة مقدم الطلب`,
    req,
  });

  return NextResponse.json({ success: true });
}
