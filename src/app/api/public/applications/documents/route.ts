// /api/public/applications/documents
//
// Lets applicants attach supporting documents (PDF/scans) to their own
// application so admission managers can review everything online — no onsite
// visit required. Ownership is verified by referenceNo + nationalId on every
// call; nothing is returned or writable without that pair.
//
//   GET  ?type=students|teachers&referenceNo=...&nationalId=...
//        → metadata list of the caller's documents (+ required checklist)
//   POST  multipart/form-data:
//         type, referenceNo, nationalId, docType, file
//        → creates an ApplicationDocument row + stores the bytes

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { detectFileType, writeUploadFile } from "@/lib/media-storage";
import {
  APPLICATION_DOC_TYPES,
  MAX_DOCS_PER_APPLICATION,
} from "@/lib/constants";
import {
  findOwnedApplication,
  countDocuments,
  exceedsMaxSize,
  isDocTypeAllowed,
  isDocMimeAllowed,
  isApplicationKind,
  type ApplicationKind,
} from "@/lib/application-docs";

export const dynamic = "force-dynamic";

const DOC_SELECT = {
  id: true,
  docType: true,
  originalName: true,
  mimeType: true,
  size: true,
  uploadedBy: true,
  reviewStatus: true,
  reviewNote: true,
  createdAt: true,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "students";
  const referenceNo = (searchParams.get("referenceNo") || "").trim();
  const nationalId = (searchParams.get("nationalId") || "").trim();

  if (!isApplicationKind(type)) {
    return NextResponse.json({ error: "نوع طلب غير صالح" }, { status: 400 });
  }
  // Rate limit like the status endpoint — this is a credential-scoped lookup.
  const ip = clientIp(req.headers, "unknown");
  const rl = rateLimit({ key: `docs:get:ip:${ip}:h`, max: 30, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "تجاوزت الحد المسموح من المحاولات. يرجى المحاولة لاحقاً." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  const app = await findOwnedApplication(type, referenceNo, nationalId);
  if (!app) {
    return NextResponse.json(
      { error: "لم يتم العثور على طلب بهذه البيانات." },
      { status: 404 }
    );
  }

  const docs =
    type === "teachers"
      ? await db.applicationDocument.findMany({
          where: { teacherAppId: app.id },
          orderBy: { createdAt: "desc" },
          select: DOC_SELECT,
        })
      : await db.applicationDocument.findMany({
          where: { studentAppId: app.id },
          orderBy: { createdAt: "desc" },
          select: DOC_SELECT,
        });

  return NextResponse.json({
    applicationStatus: app.status,
    docTypes: APPLICATION_DOC_TYPES[type],
    documents: docs,
  });
}

export async function POST(req: NextRequest) {
  // Rate limit uploads per IP: 12 per hour.
  const ip = clientIp(req.headers, "unknown");
  const rl = rateLimit({ key: `docs:post:ip:${ip}:h`, max: 12, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "تجاوزت الحد المسموح من الرفعات. يرجى المحاولة لاحقاً." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "صيغة الطلب غير صالحة" }, { status: 400 });
  }

  const type = String(form.get("type") || "");
  const referenceNo = String(form.get("referenceNo") || "").trim();
  const nationalId = String(form.get("nationalId") || "").trim();
  const docType = String(form.get("docType") || "");

  if (!isApplicationKind(type)) {
    return NextResponse.json({ error: "نوع طلب غير صالح" }, { status: 400 });
  }
  if (!isDocTypeAllowed(type as ApplicationKind, docType)) {
    return NextResponse.json({ error: "نوع المستند غير معروف" }, { status: 422 });
  }

  const app = await findOwnedApplication(type as ApplicationKind, referenceNo, nationalId);
  if (!app) {
    return NextResponse.json(
      { error: "لم يتم العثور على طلب بهذه البيانات." },
      { status: 404 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "الرجاء اختيار ملف" }, { status: 422 });
  }
  if (exceedsMaxSize(file.size)) {
    return NextResponse.json(
      { error: "حجم الملف يتجاوز ١٠ ميجابايت" },
      { status: 413 }
    );
  }

  // Verify real content type from magic bytes, not the browser-declared one.
  const buf = Buffer.from(await file.arrayBuffer());
  const detected = detectFileType(buf);
  const detectedOk = !!detected && isDocMimeAllowed(detected.mime);
  // Empty declared type is tolerated; a wrong declared type is not.
  const declaredOk = !file.type || isDocMimeAllowed(file.type);
  if (!detectedOk || !declaredOk || !detected) {
    return NextResponse.json(
      { error: "نوع الملف غير مدعوم. المسموح: PDF أو صور JPG/PNG/WebP" },
      { status: 415 }
    );
  }

  const existingCount = await countDocuments(app.id, type as ApplicationKind);
  if (existingCount >= MAX_DOCS_PER_APPLICATION) {
    return NextResponse.json(
      { error: `لا يمكن رفع أكثر من ${MAX_DOCS_PER_APPLICATION} مستند للطلب` },
      { status: 409 }
    );
  }

  const id = randomUUID();
  const ext = detected.ext;

  const data =
    type === "teachers"
      ? {
          teacherAppId: app.id,
          docType,
          filename: await writeUploadFile(id, ext, buf, detected.mime),
          originalName: file.name.slice(0, 255),
          mimeType: detected.mime,
          size: buf.byteLength,
          uploadedBy: "APPLICANT",
        }
      : {
          studentAppId: app.id,
          docType,
          filename: await writeUploadFile(id, ext, buf, detected.mime),
          originalName: file.name.slice(0, 255),
          mimeType: detected.mime,
          size: buf.byteLength,
          uploadedBy: "APPLICANT",
        };

  const doc = await db.applicationDocument.create({ data });

  await logAudit({
    userId: null,
    action: "CREATE",
    entity: "applicationDocument",
    entityId: doc.id,
    newValue: { docType, size: doc.size, kind: type, referenceNo: app.referenceNo },
    summary: `رفع مستند (${docType}) على الطلب ${app.referenceNo}`,
    req,
  });

  return NextResponse.json({ success: true, document: doc }, { status: 201 });
}
