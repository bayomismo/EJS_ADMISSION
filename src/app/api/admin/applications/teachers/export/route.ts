// GET /api/admin/applications/teachers/export
// Streams all teacher applications matching filters as .xlsx

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { requireAdmissionManager } from "@/lib/guards";
import { canSeeFullPII, redactTeacherApp } from "@/lib/redact";
import { logAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ARABIC_HEADERS: Array<[keyof TeacherRow | string, string]> = [
  ["referenceNo", "الرقم المرجعي"],
  ["submittedAt", "تاريخ التقديم"],
  ["status", "الحالة"],
  ["fullNameAr", "الاسم الكامل"],
  ["nationalId", "الرقم القومي"],
  ["gender", "النوع"],
  ["birthDate", "تاريخ الميلاد"],
  ["phone", "الهاتف"],
  ["email", "البريد الإلكتروني"],
  ["qualification", "المؤهل"],
  ["specialization", "التخصص"],
  ["subjects", "المواد"],
  ["university", "الجامعة"],
  ["graduationYear", "سنة التخرج"],
  ["yearsOfExperience", "سنوات الخبرة"],
  ["currentEmployer", "جهة العمل الحالية"],
  ["currentPosition", "الوظيفة الحالية"],
  ["preferredGovernorate", "المحافظة المفضلة"],
  ["addressAr", "العنوان"],
  ["notes", "ملاحظات"],
];

interface TeacherRow {
  referenceNo: string;
  submittedAt: string;
  status: string;
  fullNameAr: string;
  nationalId: string;
  gender: string;
  birthDate: string;
  phone: string;
  email: string;
  qualification: string;
  specialization: string;
  subjects: string;
  university: string;
  graduationYear: string;
  yearsOfExperience: string;
  currentEmployer: string;
  currentPosition: string;
  preferredGovernorate: string;
  addressAr: string;
  notes: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد الانتظار",
  REVIEW: "قيد المراجعة",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  WAITLIST: "قائمة انتظار",
};

export async function GET(req: NextRequest) {
  const guard = await requireAdmissionManager("teacher");
  if (!guard.ok) return guard.response!;
  const { scope, session } = guard;
  const canSeeFull = canSeeFullPII((session?.user as any)?.roleName);

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const status = searchParams.get("status") || undefined;

  const where: Prisma.TeacherApplicationWhereInput = {};
  if (q) {
    where.OR = [
      { fullNameAr: { contains: q } },
      { referenceNo: { contains: q } },
      { phone: { contains: q } },
      { nationalId: { contains: q } },
      { subjects: { contains: q } },
      { specialization: { contains: q } },
    ];
  }
  if (status && status !== "all") where.status = status;

  if (scope.governorateIds !== null) {
    where.preferredGovernorateId = scope.governorateIds.length === 0
      ? { in: [] }
      : { in: scope.governorateIds };
  } else if (scope.schoolIds !== null && scope.schoolIds.length > 0) {
    // Teacher apps don't have schoolId; conservatively return empty
    const empty = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([ARABIC_HEADERS.map(([, l]) => l)]);
    const buf = XLSX.write(empty, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="ejs-teachers-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  }

  const items = await db.teacherApplication.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    take: 5000,
    include: { preferredGovernorate: { select: { nameAr: true } } },
  });

  const safe = items.map((it) => redactTeacherApp(it as any, canSeeFull));

  const rows: TeacherRow[] = safe.map((a: any) => ({
    referenceNo: a.referenceNo || "",
    submittedAt: a.submittedAt ? new Date(a.submittedAt).toLocaleString("ar-EG") : "",
    status: STATUS_LABELS[a.status] || a.status || "",
    fullNameAr: a.fullNameAr || "",
    nationalId: a.nationalId || "",
    gender: a.gender === "MALE" ? "ذكر" : a.gender === "FEMALE" ? "أنثى" : "",
    birthDate: a.birthDate ? new Date(a.birthDate).toLocaleDateString("ar-EG") : "",
    phone: a.phone || "",
    email: a.email || "",
    qualification: a.qualification || "",
    specialization: a.specialization || "",
    subjects: a.subjects || "",
    university: a.university || "",
    graduationYear: a.graduationYear ? String(a.graduationYear) : "",
    yearsOfExperience: a.yearsOfExperience != null ? String(a.yearsOfExperience) : "",
    currentEmployer: a.currentEmployer || "",
    currentPosition: a.currentPosition || "",
    preferredGovernorate: a.preferredGovernorate?.nameAr || "",
    addressAr: a.addressAr || "",
    notes: a.notes || "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(
    rows.map((r) => Object.fromEntries(ARABIC_HEADERS.map(([k, label]) => [label, (r as any)[k]])))
  );
  ws["!cols"] = ARABIC_HEADERS.map(([, label], i) => ({ wch: i === 0 ? 22 : Math.max(14, label.length + 4) }));
  XLSX.utils.book_append_sheet(wb, ws, "طلبات المعلمين");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  await logAudit({
    action: "BULK",
    entity: "TeacherApplication",
    entityId: "export",
    newValue: { count: rows.length, filters: { q, status } },
  });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ejs-teachers-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}