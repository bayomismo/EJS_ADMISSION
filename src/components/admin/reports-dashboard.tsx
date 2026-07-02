"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, GraduationCap, TrendingUp, School, MapPin, Award,
  ArrowLeft, ClipboardList, UserCheck, Clock, FileSpreadsheet, Download,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toArabicNumber, toArabicDigits } from "@/lib/arabic";
import { cn } from "@/lib/utils";

interface Metrics {
  students: {
    total: number;
    byStatus: { status: string; count: number }[];
    byGrade: { name: string; count: number }[];
    byGovernorate: { name: string; count: number }[];
    bySchool: { name: string; gov: string; count: number }[];
    recent: any[];
    trend: { date: string; count: number }[];
  };
  teachers: {
    total: number;
    byStatus: { status: string; count: number }[];
    bySubject: { name: string; count: number }[];
    byGovernorate: { name: string; count: number }[];
    recent: any[];
  };
}

const statusLabels: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "قيد الانتظار", cls: "bg-amber-100 text-amber-700" },
  REVIEW: { label: "قيد المراجعة", cls: "bg-blue-100 text-blue-700" },
  ACCEPTED: { label: "مقبول", cls: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "مرفوض", cls: "bg-rose-100 text-rose-700" },
  WAITLIST: { label: "قائمة انتظار", cls: "bg-indigo-100 text-indigo-700" },
};

function maxBar(items: { count: number }[]) { return Math.max(1, ...items.map((i) => i.count)); }

export function ReportsDashboard() {
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reports/metrics").then((r) => r.json()).then((d) => { setM(d); setLoading(false); });
  }, []);

  if (loading || !m) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div>
      </div>
    );
  }

  const maxGrade = maxBar(m.students.byGrade);
  const maxGov = maxBar(m.students.byGovernorate);
  const maxSchool = maxBar(m.students.bySchool);
  const maxSubject = maxBar(m.teachers.bySubject);
  const trendMax = maxBar(m.students.trend);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">التقارير والإحصائيات</h1>
          <p className="text-sm text-muted-foreground">إحصائيات طلبات القبول للطلاب والمعلمين</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/admin/reports/students"><GraduationCap className="ml-1.5 h-4 w-4" /> طلبات الطلاب</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/admin/reports/teachers"><Users className="ml-1.5 h-4 w-4" /> طلبات المعلمين</Link></Button>
          <Button asChild variant="default" size="sm">
            <a href="/api/admin/reports/metrics/export" download>
              <FileSpreadsheet className="ml-1.5 h-4 w-4" /> تصدير ملخص Excel
            </a>
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">إجمالي طلبات الطلاب</p><p className="text-3xl font-extrabold nums mt-1">{toArabicNumber(m.students.total)}</p></div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-crimson/10 text-crimson"><GraduationCap className="h-6 w-6" /></span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">طلبات مقبولة</p><p className="text-3xl font-extrabold nums mt-1 text-emerald-600">{toArabicNumber(m.students.byStatus.find((s) => s.status === "ACCEPTED")?.count || 0)}</p></div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><UserCheck className="h-6 w-6" /></span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">إجمالي طلبات المعلمين</p><p className="text-3xl font-extrabold nums mt-1">{toArabicNumber(m.teachers.total)}</p></div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Users className="h-6 w-6" /></span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">قيد المراجعة (طالب)</p><p className="text-3xl font-extrabold nums mt-1 text-blue-600">{toArabicNumber(m.students.byStatus.find((s) => s.status === "REVIEW")?.count || 0)}</p></div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Clock className="h-6 w-6" /></span>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Student status distribution */}
        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><TrendingUp className="h-5 w-5 text-primary" /> توزيع طلبات الطلاب حسب الحالة</h2>
          <div className="space-y-2.5">
            {m.students.byStatus.map((s) => {
              const sl = statusLabels[s.status] || { label: s.status, cls: "bg-muted" };
              const pct = m.students.total > 0 ? (s.count / m.students.total) * 100 : 0;
              return (
                <div key={s.status} className="flex items-center gap-3">
                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold w-28 text-center", sl.cls)}>{sl.label}</span>
                  <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", sl.cls.split(" ")[0].replace("bg-", "bg-").replace("-100", "-500"))} style={{ width: `${Math.max(pct, 3)}%` }} />
                  </div>
                  <span className="font-bold text-sm w-10 text-left nums">{toArabicNumber(s.count)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Trend last 14 days */}
        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><TrendingUp className="h-5 w-5 text-primary" /> تقديمات آخر ١٤ يوماً (طلاب)</h2>
          <div className="flex items-end justify-between gap-1 h-40">
            {m.students.trend.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full bg-primary/80 hover:bg-primary rounded-t transition-colors" style={{ height: `${(d.count / trendMax) * 100}%`, minHeight: d.count > 0 ? "4px" : "2px" }}>
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 nums">{toArabicNumber(d.count)}</span>
                </div>
                <span className="text-[9px] text-muted-foreground nums">{toArabicDigits(d.date.slice(5))}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* By grade */}
        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><GraduationCap className="h-5 w-5 text-primary" /> الطلاب حسب المرحلة</h2>
          <div className="space-y-2">
            {m.students.byGrade.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">لا توجد بيانات</p> :
              m.students.byGrade.map((g) => (
                <div key={g.name} className="flex items-center gap-3">
                  <span className="text-xs w-32 truncate">{g.name}</span>
                  <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-crimson/70 rounded-full" style={{ width: `${(g.count / maxGrade) * 100}%` }} />
                  </div>
                  <span className="font-bold text-xs w-8 text-left nums">{toArabicNumber(g.count)}</span>
                </div>
              ))}
          </div>
        </Card>

        {/* By governorate */}
        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><MapPin className="h-5 w-5 text-primary" /> الطلاب حسب المحافظة (أعلى ١٠)</h2>
          <div className="space-y-2">
            {m.students.byGovernorate.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">لا توجد بيانات</p> :
              m.students.byGovernorate.map((g) => (
                <div key={g.name} className="flex items-center gap-3">
                  <span className="text-xs w-24 truncate">{g.name}</span>
                  <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600/70 rounded-full" style={{ width: `${(g.count / maxGov) * 100}%` }} />
                  </div>
                  <span className="font-bold text-xs w-8 text-left nums">{toArabicNumber(g.count)}</span>
                </div>
              ))}
          </div>
        </Card>

        {/* By school */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><School className="h-5 w-5 text-primary" /> أكثر المدارس استقبالاً للطلبات</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr><th className="text-right p-2 font-medium">المدرسة</th><th className="text-right p-2 font-medium">المحافظة</th><th className="text-right p-2 font-medium w-full">العدد</th><th className="text-left p-2 font-medium">العدد</th></tr>
              </thead>
              <tbody>
                {m.students.bySchool.length === 0 ? <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">لا توجد بيانات</td></tr> :
                  m.students.bySchool.map((s) => (
                    <tr key={s.name} className="border-b last:border-0">
                      <td className="p-2 font-medium truncate max-w-[200px]">{s.name}</td>
                      <td className="p-2 text-muted-foreground">{s.gov}</td>
                      <td className="p-2"><div className="h-3 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-crimson/60 rounded-full" style={{ width: `${(s.count / maxSchool) * 100}%` }} /></div></td>
                      <td className="p-2 text-left font-bold nums">{toArabicNumber(s.count)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Teachers by subject */}
        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><Award className="h-5 w-5 text-primary" /> المعلمون حسب التخصص</h2>
          <div className="space-y-2">
            {m.teachers.bySubject.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">لا توجد بيانات</p> :
              m.teachers.bySubject.map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-xs w-32 truncate">{s.name}</span>
                  <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500/70 rounded-full" style={{ width: `${(s.count / maxSubject) * 100}%` }} />
                  </div>
                  <span className="font-bold text-xs w-8 text-left nums">{toArabicNumber(s.count)}</span>
                </div>
              ))}
          </div>
        </Card>

        {/* Teacher status */}
        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><Users className="h-5 w-5 text-primary" /> حالات طلبات المعلمين</h2>
          <div className="grid grid-cols-2 gap-3">
            {m.teachers.byStatus.map((s) => {
              const sl = statusLabels[s.status] || { label: s.status, cls: "bg-muted" };
              return (
                <div key={s.status} className={cn("rounded-xl p-3 text-center", sl.cls)}>
                  <div className="text-2xl font-extrabold nums">{toArabicNumber(s.count)}</div>
                  <div className="text-xs">{sl.label}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Recent submissions */}
      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold"><GraduationCap className="h-5 w-5 text-crimson" /> أحدث طلبات الطلاب</h2>
            <Button asChild variant="ghost" size="sm"><Link href="/admin/reports/students">عرض الكل <ArrowLeft className="mr-1 h-4 w-4" /></Link></Button>
          </div>
          <div className="space-y-2">
            {m.students.recent.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/30">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crimson/10 text-crimson text-xs font-bold">{r.studentNameAr.charAt(0)}</span>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{r.studentNameAr}</p><p className="text-[11px] text-muted-foreground nums">{r.referenceNo} — {r.school?.nameAr}</p></div>
                <Badge variant="outline" className={`text-[9px] ${statusLabels[r.status]?.cls}`}>{statusLabels[r.status]?.label || r.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold"><Users className="h-5 w-5 text-amber-600" /> أحدث طلبات المعلمين</h2>
            <Button asChild variant="ghost" size="sm"><Link href="/admin/reports/teachers">عرض الكل <ArrowLeft className="mr-1 h-4 w-4" /></Link></Button>
          </div>
          <div className="space-y-2">
            {m.teachers.recent.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/30">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 text-xs font-bold">{r.fullNameAr.charAt(0)}</span>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{r.fullNameAr}</p><p className="text-[11px] text-muted-foreground nums">{r.referenceNo} — {r.subjects}</p></div>
                <Badge variant="outline" className={`text-[9px] ${statusLabels[r.status]?.cls}`}>{statusLabels[r.status]?.label || r.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
