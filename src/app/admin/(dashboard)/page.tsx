import Link from "next/link";
import {
  Building2, Map, MapPin, Newspaper, Users, Megaphone, FileText,
  HelpCircle, TrendingUp, ArrowLeft, ScrollText, Eye, Settings,
} from "lucide-react";
import { db } from "@/lib/db";
import { getSiteSettings, computeLiveStatus } from "@/lib/settings";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toArabicNumber, toArabicDigits } from "@/lib/arabic";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const settings = await getSiteSettings();
  const live = computeLiveStatus(settings.admission);

  const [
    schoolsCount, activeSchools, featuredSchools, governoratesCount,
    citiesCount, newsCount, publishedNews, faqCount, announcementsCount,
    documentsCount, usersCount, recentAudits, recentNews, topSchools,
  ] = await Promise.all([
    db.school.count(),
    db.school.count({ where: { isActive: true, isArchived: false } }),
    db.school.count({ where: { isFeatured: true } }),
    db.governorate.count(),
    db.city.count(),
    db.news.count(),
    db.news.count({ where: { status: "PUBLISHED" } }),
    db.faq.count(),
    db.announcement.count({ where: { isActive: true } }),
    db.document.count({ where: { isActive: true } }),
    db.user.count(),
    db.auditLog.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { user: true } }),
    db.news.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { category: true } }),
    db.school.findMany({
      take: 6, orderBy: { createdAt: "desc" },
      include: { governorate: { select: { nameAr: true } }, city: { select: { nameAr: true } } },
    }),
  ]);

  const stats = [
    { label: "إجمالي المدارس", value: schoolsCount, active: activeSchools, icon: Building2, color: "from-emerald-500 to-teal-600", href: "/admin/schools" },
    { label: "المحافظات", value: governoratesCount, active: citiesCount, icon: Map, color: "from-rose-500 to-red-600", href: "/admin/governorates" },
    { label: "الأخبار", value: newsCount, active: publishedNews, icon: Newspaper, color: "from-amber-500 to-orange-600", href: "/admin/news" },
    { label: "المستخدمون", value: usersCount, active: 0, icon: Users, color: "from-teal-500 to-cyan-600", href: "/admin/users" },
  ];

  const statusColor =
    live.status === "OPEN" ? "bg-emerald-500" : live.status === "UPCOMING" ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">لوحة المعلومات</h1>
          <p className="text-sm text-muted-foreground">نظرة عامة على منصة المدارس المصرية اليابانية</p>
        </div>
        <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-white ${statusColor}`}>
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          <span className="text-sm font-bold">حالة القبول: {live.label}</span>
          <span className="text-sm opacity-90 nums">— {settings.admission.year}</span>
        </div>
      </div>

      {/* stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="group relative overflow-hidden p-5 transition-all hover:shadow-card hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-3xl font-extrabold nums">{toArabicNumber(s.value)}</p>
                  {s.active > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="nums">{toArabicNumber(s.active)}</span> نشط
                    </p>
                  )}
                </div>
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-bl ${s.color} text-white shadow-soft`}>
                  <s.icon className="h-6 w-6" />
                </span>
              </div>
              <ArrowLeft className="absolute bottom-3 left-3 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* recent schools */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <Building2 className="h-5 w-5 text-primary" /> أحدث المدارس المضافة
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/schools">عرض الكل <ArrowLeft className="mr-1 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="space-y-2">
            {topSchools.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/40 transition-colors">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{s.nameAr}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.governorate.nameAr} — {s.city.nameAr}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] nums">{s.code}</Badge>
                {s.isFeatured && <Badge className="bg-amber-500 text-[10px]">مميزة</Badge>}
              </div>
            ))}
          </div>
        </Card>

        {/* quick stats */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <TrendingUp className="h-5 w-5 text-primary" /> إحصائيات سريعة
            </h2>
            <div className="space-y-2.5 text-sm">
              <Row label="مدارس مميزة" value={featuredSchools} />
              <Row label="مدن وإدارات" value={citiesCount} />
              <Row label="أسئلة شائعة" value={faqCount} />
              <Row label="إعلانات نشطة" value={announcementsCount} />
              <Row label="مستندات" value={documentsCount} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <Megaphone className="h-5 w-5 text-primary" /> إجراءات سريعة
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm" className="h-auto flex-col py-3">
                <Link href="/admin/schools"><Building2 className="mb-1 h-4 w-4" /> مدارس</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-auto flex-col py-3">
                <Link href="/admin/news"><Newspaper className="mb-1 h-4 w-4" /> خبر</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-auto flex-col py-3">
                <Link href="/admin/announcements"><Megaphone className="mb-1 h-4 w-4" /> إعلان</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-auto flex-col py-3">
                <Link href="/admin/settings"><Settings className="mb-1 h-4 w-4" /> إعدادات</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* recent activity + news */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <ScrollText className="h-5 w-5 text-primary" /> سجل النشاط الأخير
          </h2>
          <div className="space-y-2 max-h-72 overflow-y-auto scroll-area-custom">
            {recentAudits.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">لا يوجد نشاط بعد</p>
            ) : recentAudits.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg p-2 hover:bg-accent/40">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                  {a.action.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{a.user?.name || "النظام"}</span>
                    {" — "}
                    <span className="text-muted-foreground">{a.summary || `${a.action} ${a.entity}`}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground nums">
                    {toArabicDigits(new Date(a.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" }))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <Newspaper className="h-5 w-5 text-primary" /> أحدث الأخبار
          </h2>
          <div className="space-y-2 max-h-72 overflow-y-auto scroll-area-custom">
            {recentNews.map((n) => (
              <div key={n.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/40">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <Newspaper className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{n.titleAr}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {n.category?.nameAr || "بدون تصنيف"}
                  </p>
                </div>
                <Badge variant={n.status === "PUBLISHED" ? "default" : "secondary"} className="text-[10px]">
                  {n.status === "PUBLISHED" ? "منشور" : n.status === "DRAFT" ? "مسودة" : n.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold nums">{toArabicNumber(value)}</span>
    </div>
  );
}
