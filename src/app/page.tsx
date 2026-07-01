import Link from "next/link";
import {
  Search, FileText, HelpCircle, Newspaper, Phone, Building2,
  ArrowLeft, Calendar, Clock, MapPin, Download, ChevronLeft,
  GraduationCap, Users, TrendingUp, Award, Megaphone,
} from "lucide-react";
import { db } from "@/lib/db";
import { getSiteSettings, computeLiveStatus } from "@/lib/settings";
import { toArabicNumber, toArabicDigits } from "@/lib/arabic";
import { PublicShell } from "@/components/public/public-shell";
import { SectionHeading } from "@/components/public/section-heading";
import { SchoolCard } from "@/components/public/school-card";
import { HeroCountdown } from "@/components/public/hero-countdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ANNOUNCEMENT_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

async function getHomeData() {
  const settings = await getSiteSettings();
  const [featured, news, faqs, docs, announcements, banners, counts] = await Promise.all([
    db.school.findMany({
      where: { isActive: true, isArchived: false, isFeatured: true },
      take: 6,
      orderBy: { sortOrder: "asc" },
      include: { governorate: { select: { nameAr: true } }, city: { select: { nameAr: true } } },
    }),
    db.news.findMany({
      where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
      take: 3,
      orderBy: { publishedAt: "desc" },
      include: { category: true },
    }),
    db.faq.findMany({ where: { isActive: true }, take: 4, orderBy: { sortOrder: "asc" } }),
    db.document.findMany({ where: { isActive: true }, take: 4, orderBy: { downloadCount: "desc" }, include: { category: true } }),
    db.announcement.findMany({
      where: { isActive: true, startDate: { lte: new Date() }, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
      orderBy: { sortOrder: "asc" }, take: 4,
    }),
    db.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, take: 3 }),
    {
      schools: await db.school.count({ where: { isActive: true, isArchived: false } }),
      governorates: await db.governorate.count({ where: { isActive: true } }),
      cities: await db.city.count({ where: { isActive: true } }),
    },
  ]);
  return { settings, featured, news, faqs, docs, announcements, banners, counts };
}

const QUICK_ACCESS = [
  { href: "/schools", label: "ابحث عن مدرسة", desc: "حدّد محافظتك ومدينتك واعثر على أقرب مدرسة", icon: Search, color: "from-blue-600 to-blue-800" },
  { href: "/faq", label: "الأسئلة الشائعة", desc: "إجابات على أكثر الأسئلة شيوعاً حول القبول", icon: HelpCircle, color: "from-rose-500 to-red-600" },
  { href: "/documents", label: "مركز المستندات", desc: "شروط القبول ونماذج التقديم والأدلة الإرشادية", icon: FileText, color: "from-amber-500 to-orange-600" },
  { href: "/news", label: "آخر الأخبار", desc: "تابع آخر إعلانات وأخبار المدارس", icon: Newspaper, color: "from-blue-600 to-blue-800" },
];

export default async function HomePage() {
  const { settings, featured, news, faqs, docs, announcements, counts } = await getHomeData();
  const live = computeLiveStatus(settings.admission);
  const statusColor =
    live.status === "OPEN" ? "green" : live.status === "UPCOMING" ? "gold" : "red";
  const colorMap: Record<string, string> = {
    green: "bg-emerald-600", gold: "bg-amber-500", red: "bg-rose-600",
  };

  return (
    <PublicShell>
      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden border-b border-border bg-hero-radial">
        <div className="absolute inset-0 bg-grid opacity-[0.35] pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                <GraduationCap className="h-4 w-4" />
                {settings.branding.taglineAr}
              </div>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
                {settings.branding.siteNameAr}
                <span className="mt-2 block text-2xl font-bold text-primary sm:text-3xl">
                  بوابة القبول الإلكتروني {settings.admission.year}
                </span>
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
                ابحث عن مدرستك من بين أكثر من {toArabicNumber(counts.schools)} مدرسة موزعة على
                {" "}{toArabicNumber(counts.governorates)} محافظة. تابع شروط القبول، واطّلع على
                تفاصيل المدارس، وقدّم طلبك إلكترونياً عبر البوابة الرسمية.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="bg-crimson hover:bg-crimson/90 text-white px-7 h-12 text-base">
                  <Link href="/schools">
                    <Search className="ml-2 h-5 w-5" />
                    ابحث عن مدرسة
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 text-base px-7">
                  <Link href="/documents">
                    <FileText className="ml-2 h-5 w-5" />
                    شروط القبول
                  </Link>
                </Button>
              </div>

              {/* stats */}
              <div className="grid grid-cols-3 gap-3 pt-4">
                {[
                  { label: "مدارس", value: counts.schools, icon: Building2 },
                  { label: "محافظات", value: counts.governorates, icon: MapPin },
                  { label: "مدن وإدارات", value: counts.cities, icon: Users },
                ].map((s) => (
                  <Card key={s.label} className="p-4">
                    <s.icon className="mb-1 h-5 w-5 text-primary" />
                    <div className="text-2xl font-extrabold text-foreground nums">
                      {toArabicNumber(s.value)}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </Card>
                ))}
              </div>
            </div>

            {/* admission status card */}
            <div className="lg:col-span-5">
              <Card className="overflow-hidden p-0 shadow-card">
                <div className={`${colorMap[statusColor]} px-6 py-5 text-white`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium opacity-90">حالة القبول</span>
                    <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
                      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                      {live.label}
                    </span>
                  </div>
                  <div className="mt-2 text-3xl font-extrabold nums">
                    العام الدراسي {toArabicDigits(settings.admission.year)}
                  </div>
                </div>
                <div className="p-6">
                  <HeroCountdown
                    openDate={settings.admission.openDate}
                    closeDate={settings.admission.closeDate}
                    status={live.status}
                  />
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>{settings.admission.phasesLabel}</span>
                    </div>
                  </div>
                  <Button asChild className="mt-4 w-full bg-crimson hover:bg-crimson/90 text-white h-11">
                    <Link href="/schools">
                      قدّم الآن
                      <ArrowLeft className="mr-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── THREE-SECTION ENTRY (A: Public · B: Student · C: Teacher) ───────── */}
      <section className="border-b border-border bg-gradient-to-b from-background to-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold text-primary">
              بوابة شاملة لكل خدمات القبول
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl text-balance">
              ثلاث بوابات متكاملة لخدمتك
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              اختر البوابة المناسبة لك — المعلومات العامة للجميع، تقديم الطلاب لأولياء الأمور، وتقديم المعلمين للكوادر التعليمية
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Section A — Public */}
            <Link href="/news" className="group">
              <Card className="relative h-full overflow-hidden p-6 transition-all hover:shadow-card hover:-translate-y-1">
                <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-blue-600/10 blur-2xl" />
                <div className="relative">
                  <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-bl from-blue-600 to-blue-800 text-white shadow-soft">
                    <Megaphone className="h-7 w-7" />
                  </span>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-md bg-blue-600/10 px-2 py-0.5 text-[11px] font-bold text-blue-600">القسم A</span>
                  </div>
                  <h3 className="mb-1.5 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    البوابة العامة
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                    الإعلانات والأخبار والأسئلة الشائعة ومركز المستندات — كل ما تحتاج معرفته عن المدارس المصرية اليابانية
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <Badge variant="secondary" className="text-[10px]">إعلانات</Badge>
                    <Badge variant="secondary" className="text-[10px]">أخبار</Badge>
                    <Badge variant="secondary" className="text-[10px]">أسئلة شائعة</Badge>
                    <Badge variant="secondary" className="text-[10px]">مستندات</Badge>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-600">
                    استعرض المحتوى <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  </span>
                </div>
              </Card>
            </Link>

            {/* Section B — Student Admission */}
            <Link href="/admission/students" className="group">
              <Card className="relative h-full overflow-hidden p-6 transition-all hover:shadow-card hover:-translate-y-1 ring-2 ring-crimson/20">
                <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-crimson/15 blur-2xl" />
                <div className="relative">
                  <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-bl from-crimson to-rose-600 text-white shadow-soft">
                    <GraduationCap className="h-7 w-7" />
                  </span>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-md bg-crimson/10 px-2 py-0.5 text-[11px] font-bold text-crimson">القسم B</span>
                    {live.status === "OPEN" && (
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">التقديم مفتوح</span>
                    )}
                  </div>
                  <h3 className="mb-1.5 text-xl font-bold text-foreground group-hover:text-crimson transition-colors">
                    تقديم الطلاب
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                    قدّم طلب التحاق طفلك بالمدارس المصرية اليابانية إلكترونياً — من رياض أطفال حتى الصف الثالث الابتدائي
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <Badge variant="secondary" className="text-[10px]">KG1 - الصف الثالث</Badge>
                    <Badge variant="secondary" className="text-[10px]">تقديم إلكتروني</Badge>
                    <Badge variant="secondary" className="text-[10px]">شروط وقواعد</Badge>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-crimson">
                    ابدأ التقديم <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  </span>
                </div>
              </Card>
            </Link>

            {/* Section C — Teacher Admission */}
            <Link href="/admission/teachers" className="group">
              <Card className="relative h-full overflow-hidden p-6 transition-all hover:shadow-card hover:-translate-y-1">
                <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-gold/15 blur-2xl" />
                <div className="relative">
                  <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-bl from-amber-500 to-orange-600 text-white shadow-soft">
                    <Users className="h-7 w-7" />
                  </span>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-md bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-amber-700">القسم C</span>
                  </div>
                  <h3 className="mb-1.5 text-xl font-bold text-foreground group-hover:text-amber-700 transition-colors">
                    تقديم المعلمين
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                    تقدم للعمل بالمدارس المصرية اليابانية — انضم إلى فريق تعليمي يطبق منهجية «توكاتسو» اليابانية
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <Badge variant="secondary" className="text-[10px]">معلمون</Badge>
                    <Badge variant="secondary" className="text-[10px]">توكاتسو</Badge>
                    <Badge variant="secondary" className="text-[10px]">وظائف تعليمية</Badge>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-700">
                    تقدم الآن <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  </span>
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── QUICK ACCESS TILES ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACCESS.map((q) => (
            <Link key={q.href} href={q.href}>
              <Card className="group h-full p-6 transition-all hover:shadow-card hover:-translate-y-1">
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-bl ${q.color} text-white shadow-soft`}>
                  <q.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-1.5 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {q.label}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{q.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  التفاصيل <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── ANNOUNCEMENTS ───────── */}
      {announcements.length > 0 && (
        <section className="border-y border-border bg-secondary/30">
          <div className="mx-auto max-w-7xl px-4 py-12">
            <SectionHeading
              title="الإعلانات"
              subtitle="آخر الإعلانات والتنبيهات الخاصة بالقبول"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/announcements">عرض الكل <ArrowLeft className="mr-1 h-4 w-4" /></Link>
                </Button>
              }
            />
            <div className="grid gap-4 md:grid-cols-2">
              {announcements.map((a) => {
                const t = ANNOUNCEMENT_TYPES.find((x) => x.value === a.type) || ANNOUNCEMENT_TYPES[0];
                const tone: Record<string, string> = {
                  teal: "border-r-emerald-500 bg-emerald-50 text-emerald-900",
                  green: "border-r-emerald-600 bg-emerald-50 text-emerald-900",
                  gold: "border-r-amber-500 bg-amber-50 text-amber-900",
                  red: "border-r-rose-500 bg-rose-50 text-rose-900",
                };
                return (
                  <Card key={a.id} className={`flex items-start gap-3 border-r-4 p-4 ${tone[t.color] || tone.teal}`}>
                    <Megaphone className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="font-bold">{a.titleAr}</h3>
                        <Badge variant="outline" className="text-[10px]">{t.labelAr}</Badge>
                      </div>
                      <p className="text-sm opacity-90 leading-relaxed">{a.bodyAr}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ───────── FEATURED SCHOOLS ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <SectionHeading
          title="مدارس مميزة"
          subtitle="نخبة من المدارس المصرية اليابانية في مختلف المحافظات"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/schools">كل المدارس <ArrowLeft className="mr-1 h-4 w-4" /></Link>
            </Button>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((s) => (
            <SchoolCard key={s.id} school={s as any} />
          ))}
        </div>
      </section>

      {/* ───────── NEWS + FAQ ───────── */}
      <section className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="grid gap-10 lg:grid-cols-2">
            {/* news */}
            <div>
              <SectionHeading
                title="أحدث الأخبار"
                action={
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/news">المزيد <ArrowLeft className="mr-1 h-4 w-4" /></Link>
                  </Button>
                }
              />
              <div className="space-y-3">
                {news.map((n) => (
                  <Link key={n.id} href={`/news/${n.slug}`}>
                    <Card className="flex gap-4 p-4 transition-all hover:shadow-card hover:-translate-y-0.5">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Newspaper className="h-7 w-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {n.category && (
                          <Badge variant="secondary" className="mb-1.5 text-[10px]">{n.category.nameAr}</Badge>
                        )}
                        <h3 className="font-bold leading-snug line-clamp-2 group-hover:text-primary">
                          {n.titleAr}
                        </h3>
                        {n.excerptAr && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{n.excerptAr}</p>
                        )}
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="nums">
                            {toArabicDigits(new Date(n.publishedAt || n.createdAt).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }))}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
            {/* faq */}
            <div>
              <SectionHeading
                title="الأسئلة الشائعة"
                action={
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/faq">المزيد <ArrowLeft className="mr-1 h-4 w-4" /></Link>
                  </Button>
                }
              />
              <div className="space-y-3">
                {faqs.map((f) => (
                  <Card key={f.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-crimson/10 text-crimson">
                        <HelpCircle className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="font-bold text-sm leading-snug mb-1">{f.questionAr}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{f.answerAr}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── DOCUMENT CENTER ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <SectionHeading
          title="مركز المستندات"
          subtitle="شروط القبول، نماذج التقديم، والأدلة الإرشادية"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/documents">كل المستندات <ArrowLeft className="mr-1 h-4 w-4" /></Link>
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {docs.map((d) => (
            <Card key={d.id} className="p-5 transition-all hover:shadow-card hover:-translate-y-0.5">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </span>
                <Badge variant="outline" className="text-[10px] uppercase">{d.fileType || "pdf"}</Badge>
              </div>
              <h3 className="mb-1 font-bold text-sm leading-snug line-clamp-2">{d.titleAr}</h3>
              {d.descriptionAr && (
                <p className="text-xs text-muted-foreground line-clamp-2">{d.descriptionAr}</p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  <span className="nums">{toArabicNumber(d.downloadCount)}</span> تحميل
                </span>
                <Link href="/documents" className="font-medium text-primary">تحميل</Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="border-t border-border bg-gradient-to-l from-primary to-blue-900">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center text-white">
          <Award className="mx-auto mb-4 h-12 w-12" />
          <h2 className="text-2xl font-extrabold sm:text-3xl mb-3">
            تجربة تعليمية تستحق — ابدأ التقديم الآن
          </h2>
          <p className="mx-auto mb-6 max-w-2xl text-white/85">
            انضم إلى آلاف الأسر التي اختارت المدارس المصرية اليابانية لتعليم أبنائها بنظام «توكاتسو» الياباني.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 px-7 h-12">
              <Link href="/schools"><Search className="ml-2 h-5 w-5" /> ابحث عن مدرسة</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 px-7 h-12">
              <Link href="/contact"><Phone className="ml-2 h-5 w-5" /> تواصل معنا</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
