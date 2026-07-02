// GET /api/admin/reports/metrics/export
// Streams the same metrics that the dashboard renders as a multi-sheet .xlsx

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/guards";
import { SYSTEM_ROLES } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const roleName = (session.user as any).roleName as string;
  const allowed = [
    SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.STUDENT_ADMISSION_MANAGER, SYSTEM_ROLES.TEACHER_ADMISSION_MANAGER,
  ];
  if (!allowed.includes(roleName)) {
    return NextResponse.json({ error: "هذا القسم مخصص فقط لمديري القبول" }, { status: 403 });
  }

  const userId = (session.user as any).id as string;
  const isUnrestricted = roleName === SYSTEM_ROLES.SUPER_ADMIN || roleName === SYSTEM_ROLES.ADMIN;
  let scope: { schoolIds: string[] | null; governorateIds: string[] | null } = { schoolIds: null, governorateIds: null };
  if (!isUnrestricted) {
    const u = await db.user.findUnique({ where: { id: userId }, select: { scope: true } });
    if (u?.scope) {
      try {
        const p = JSON.parse(u.scope);
        scope = {
          schoolIds: Array.isArray(p.schoolIds) ? p.schoolIds : null,
          governorateIds: Array.isArray(p.governorateIds) ? p.governorateIds : null,
        };
      } catch { scope = { schoolIds: [], governorateIds: [] }; }
    }
  }

  const studentWhere: Prisma.StudentApplicationWhereInput =
    scope.schoolIds !== null
      ? { schoolId: scope.schoolIds.length === 0 ? { in: [] } : { in: scope.schoolIds } }
      : scope.governorateIds !== null
      ? { governorateId: scope.governorateIds.length === 0 ? { in: [] } : { in: scope.governorateIds } }
      : {};
  const teacherWhere: Prisma.TeacherApplicationWhereInput =
    scope.governorateIds !== null
      ? { preferredGovernorateId: scope.governorateIds.length === 0 ? { in: [] } : { in: scope.governorateIds } }
      : {};

  const [
    totalStudents, studentsByStatus, studentsByGrade, studentsByGovernorate, studentsBySchool,
    totalTeachers, teachersByStatus, teachersBySubject, teachersByGovernorate,
  ] = await Promise.all([
    db.studentApplication.count({ where: studentWhere }),
    db.studentApplication.groupBy({ by: ["status"], where: studentWhere, _count: true }),
    db.studentApplication.groupBy({ by: ["gradeId"], where: studentWhere, _count: true }),
    db.studentApplication.groupBy({ by: ["governorateId"], where: studentWhere, _count: true }),
    db.studentApplication.groupBy({ by: ["schoolId"], where: studentWhere, _count: true }),
    db.teacherApplication.count({ where: teacherWhere }),
    db.teacherApplication.groupBy({ by: ["status"], where: teacherWhere, _count: true }),
    db.teacherApplication.groupBy({ by: ["subjects"], where: teacherWhere, _count: true }),
    db.teacherApplication.groupBy({ by: ["preferredGovernorateId"], where: teacherWhere, _count: true }),
  ]);

  const [grades, govs, schools] = await Promise.all([
    db.grade.findMany(),
    db.governorate.findMany(),
    db.school.findMany({ select: { id: true, nameAr: true, governorate: { select: { nameAr: true } } } }),
  ]);
  const gradeMap = new Map(grades.map((g) => [g.id, g.nameAr]));
  const govMap = new Map(govs.map((g) => [g.id, g.nameAr]));
  const schoolMap = new Map(schools.map((s) => [s.id, s]));

  const STATUS_LABELS: Record<string, string> = {
    PENDING: "قيد الانتظار",
    REVIEW: "قيد المراجعة",
    ACCEPTED: "مقبول",
    REJECTED: "مرفوض",
    WAITLIST: "قائمة انتظار",
  };

  const wb = XLSX.utils.book_new();

  // Sheet 1 — Summary
  const summary = [
    ["البيان", "القيمة"],
    ["إجمالي طلبات الطلاب", totalStudents],
    ["إجمالي طلبات المعلمين", totalTeachers],
    ["تاريخ التقرير", new Date().toLocaleString("ar-EG")],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "ملخص");

  // Sheet 2 — Students by status
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      studentsByStatus.map((r) => ({ الحالة: STATUS_LABELS[r.status] || r.status, العدد: r._count }))
    ),
    "حالات الطلاب"
  );

  // Sheet 3 — Students by grade
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      studentsByGrade
        .map((r) => ({ المرحلة: gradeMap.get(r.gradeId || "") || "غير محدد", العدد: r._count }))
        .sort((a, b) => b.العدد - a.العدد)
    ),
    "المراحل"
  );

  // Sheet 4 — Students by governorate
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      studentsByGovernorate
        .map((r) => ({ المحافظة: govMap.get(r.governorateId) || "غير محدد", العدد: r._count }))
        .sort((a, b) => b.العدد - a.العدد)
    ),
    "المحافظات (طلاب)"
  );

  // Sheet 5 — Students by school
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      studentsBySchool
        .map((r) => {
          const s = schoolMap.get(r.schoolId);
          return { المدرسة: s?.nameAr || "غير محدد", المحافظة: s?.governorate.nameAr || "", العدد: r._count };
        })
        .sort((a, b) => b.العدد - a.العدد)
    ),
    "المدارس (طلاب)"
  );

  // Sheet 6 — Teachers by status
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      teachersByStatus.map((r) => ({ الحالة: STATUS_LABELS[r.status] || r.status, العدد: r._count }))
    ),
    "حالات المعلمين"
  );

  // Sheet 7 — Teachers by subject
  const subjectAgg = new Map<string, number>();
  for (const r of teachersBySubject) {
    if (!r.subjects) continue;
    for (const subj of r.subjects.split(/[,،]/).map((s) => s.trim()).filter(Boolean)) {
      subjectAgg.set(subj, (subjectAgg.get(subj) || 0) + r._count);
    }
  }
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      Array.from(subjectAgg.entries())
        .map(([التخصص, العدد]) => ({ التخصص, العدد }))
        .sort((a, b) => b.العدد - a.العدد)
    ),
    "التخصصات"
  );

  // Sheet 8 — Teachers by governorate
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      teachersByGovernorate
        .map((r) => ({ المحافظة: govMap.get(r.preferredGovernorateId || "") || "أي محافظة", العدد: r._count }))
        .sort((a, b) => b.العدد - a.العدد)
    ),
    "المحافظات (معلمين)"
  );

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ejs-reports-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}