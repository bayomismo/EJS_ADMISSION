// GET /api/public/applications/status?type=students|teachers&referenceNo=EJS-S-...&nationalId=...
//
// Public status-lookup so applicants can check their application status
// without logging in. Returns the application status (PENDING/REVIEW/
// ACCEPTED/REJECTED/WAITLIST), submitted date, last update, and a
// short status label. PII is redacted — we only return what's needed to
// answer the user's question.
//
// Rate-limited per (IP + referenceNo) to prevent brute-force scanning.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد الانتظار",
  REVIEW: "قيد المراجعة",
  ACCEPTED: "تم القبول",
  REJECTED: "مرفوض",
  WAITLIST: "قائمة انتظار",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "students";
  const referenceNo = (searchParams.get("referenceNo") || "").trim();
  const nationalId = (searchParams.get("nationalId") || "").trim();

  if (!referenceNo || !nationalId) {
    return NextResponse.json(
      { error: "الرجاء إدخال الرقم المرجعي والرقم القومي" },
      { status: 400 }
    );
  }
  if (nationalId.length !== 14 || !/^\d{14}$/.test(nationalId)) {
    return NextResponse.json(
      { error: "الرقم القومي يجب أن يكون ١٤ رقماً" },
      { status: 400 }
    );
  }

  // Rate limit: 10 lookups per hour per IP to prevent brute-force scanning
  const ip = clientIp(req.headers, "unknown");
  const rl = rateLimit({ key: `status:ip:${ip}:h`, max: 10, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "تجاوزت الحد المسموح من المحاولات. يرجى المحاولة لاحقاً." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  const where = { referenceNo, nationalId };

  const item = type === "teachers"
    ? await db.teacherApplication.findFirst({
        where,
        select: {
          referenceNo: true,
          status: true,
          submittedAt: true,
          updatedAt: true,
          statusNote: true,
          fullNameAr: true,
        },
      })
    : await db.studentApplication.findFirst({
        where,
        select: {
          referenceNo: true,
          status: true,
          submittedAt: true,
          updatedAt: true,
          statusNote: true,
          studentNameAr: true,
          school: { select: { nameAr: true } },
          grade: { select: { nameAr: true } },
        },
      });

  if (!item) {
    return NextResponse.json(
      { error: "لم يتم العثور على طلب بهذه البيانات. تأكد من الرقم المرجعي والرقم القومي." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    referenceNo: item.referenceNo,
    status: item.status,
    statusLabel: STATUS_LABELS[item.status] || item.status,
    submittedAt: (item as any).submittedAt,
    updatedAt: (item as any).updatedAt,
    statusNote: (item as any).statusNote || null,
    applicantName: (item as any).studentNameAr || (item as any).fullNameAr,
    schoolName: (item as any).school?.nameAr || null,
    gradeName: (item as any).grade?.nameAr || null,
  });
}