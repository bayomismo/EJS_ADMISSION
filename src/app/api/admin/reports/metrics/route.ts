import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession, requireAdmissionManager, ok } from "@/lib/guards";
import { SYSTEM_ROLES } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/admin/reports/metrics — aggregated admission metrics
// Accessible to super-admin, admin, student-admission-manager, teacher-admission-manager
// Scope-restricted for the manager roles.
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

  // Resolve the caller's scope once, up front.
  const userId = (session.user as any).id as string;
  const isUnrestricted = roleName === SYSTEM_ROLES.SUPER_ADMIN || roleName === SYSTEM_ROLES.ADMIN;
  let scope: { schoolIds: string[] | null; governorateIds: string[] | null } = {
    schoolIds: null, governorateIds: null,
  };
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

  // Build scoped `where` fragments for student and teacher queries.
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
    recentStudents, studentsByDay,
    totalTeachers, teachersByStatus, teachersBySubject, teachersByGovernorate,
    recentTeachers,
  ] = await Promise.all([
    db.studentApplication.count({ where: studentWhere }),
    db.studentApplication.groupBy({ by: ["status"], where: studentWhere, _count: true }),
    db.studentApplication.groupBy({ by: ["gradeId"], where: studentWhere, _count: true }),
    db.studentApplication.groupBy({ by: ["governorateId"], where: studentWhere, _count: true }),
    db.studentApplication.groupBy({ by: ["schoolId"], where: studentWhere, _count: true }),
    db.studentApplication.findMany({ where: studentWhere, take: 5, orderBy: { submittedAt: "desc" }, include: { school: { select: { nameAr: true } }, grade: { select: { nameAr: true } } } }),
    db.studentApplication.findMany({ where: studentWhere, select: { submittedAt: true }, orderBy: { submittedAt: "desc" }, take: 200 }),
    db.teacherApplication.count({ where: teacherWhere }),
    db.teacherApplication.groupBy({ by: ["status"], where: teacherWhere, _count: true }),
    db.teacherApplication.groupBy({ by: ["subjects"], where: teacherWhere, _count: true }),
    db.teacherApplication.groupBy({ by: ["preferredGovernorateId"], where: teacherWhere, _count: true }),
    db.teacherApplication.findMany({ where: teacherWhere, take: 5, orderBy: { submittedAt: "desc" }, include: { preferredGovernorate: { select: { nameAr: true } } } }),
  ]);

  // resolve names for grade/governorate/school breakdowns
  const [grades, govs, schools] = await Promise.all([
    db.grade.findMany(),
    db.governorate.findMany(),
    db.school.findMany({ select: { id: true, nameAr: true, governorate: { select: { nameAr: true } } } }),
  ]);

  const gradeMap = new Map(grades.map((g) => [g.id, g.nameAr]));
  const govMap = new Map(govs.map((g) => [g.id, g.nameAr]));
  const schoolMap = new Map(schools.map((s) => [s.id, s]));

  const byGrade = studentsByGrade.map((r) => ({ name: gradeMap.get(r.gradeId || "") || "غير محدد", count: r._count })).sort((a, b) => b.count - a.count);
  const byGovernorate = studentsByGovernorate.map((r) => ({ name: govMap.get(r.governorateId) || "غير محدد", count: r._count })).sort((a, b) => b.count - a.count).slice(0, 10);
  const bySchool = studentsBySchool.map((r) => {
    const s = schoolMap.get(r.schoolId);
    return { name: s?.nameAr || "غير محدد", gov: s?.governorate.nameAr || "", count: r._count };
  }).sort((a, b) => b.count - a.count).slice(0, 10);

  // teachers by subject: split comma-separated
  const subjectAgg = new Map<string, number>();
  for (const r of teachersBySubject) {
    if (!r.subjects) continue;
    for (const subj of r.subjects.split(/[,،]/).map((s) => s.trim()).filter(Boolean)) {
      subjectAgg.set(subj, (subjectAgg.get(subj) || 0) + r._count);
    }
  }
  const bySubject = Array.from(subjectAgg.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const byGovTeachers = teachersByGovernorate.map((r) => ({ name: govMap.get(r.preferredGovernorateId || "") || "أي محافظة", count: r._count })).sort((a, b) => b.count - a.count).slice(0, 10);

  // last 14 days trend (student submissions)
  const days: { date: string; count: number }[] = [];
  const dayMap = new Map<string, number>();
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: 0 });
    dayMap.set(key, 0);
  }
  for (const s of studentsByDay) {
    const key = new Date(s.submittedAt).toISOString().slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) || 0) + 1);
  }
  days.forEach((d, i) => { d.count = dayMap.get(d.date) || 0; });

  return ok({
    students: {
      total: totalStudents,
      byStatus: studentsByStatus.map((r) => ({ status: r.status, count: r._count })),
      byGrade, byGovernorate, bySchool,
      recent: recentStudents,
      trend: days,
    },
    teachers: {
      total: totalTeachers,
      byStatus: teachersByStatus.map((r) => ({ status: r.status, count: r._count })),
      bySubject, byGovernorate: byGovTeachers,
      recent: recentTeachers,
    },
  });
}
