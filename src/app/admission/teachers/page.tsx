import Link from "next/link";
import {
  Users, CheckCircle2, FileText, Briefcase, GraduationCap,
  ArrowLeft, ShieldCheck, Award,
} from "lucide-react";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import { PublicShell } from "@/components/public/public-shell";
import { SectionHeading } from "@/components/public/section-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toArabicNumber } from "@/lib/arabic";

export const dynamic = "force-dynamic";

export default async function TeacherAdmissionLandingPage() {
  const settings = await getSiteSettings();
  const schoolsCount = await db.school.count({ where: { isActive: true, isArchived: false } });

  const steps = [
    { icon: FileText, title: "قراءة الشروط", desc: "استعراض شروط وأحكام التقديم للمعلمين بالكامل والموافقة عليها" },
    { icon: Users, title: "البيانات الشخصية", desc: "تعبئة البيانات الشخصية والمؤهلات العلمية والخبرات" },
    { icon: Briefcase, title: "التخصص والمهارات", desc: "تحديد المواد الدراسية والتخصص والمحافظة المفضلة" },
    { icon: CheckCircle2, title: "المراجعة والإرسال", desc: "مراجعة البيانات وإرسال الطلب والحصول على رقم مرجعي" },
  ];

  const requirements = [
    "أن يكون المتقدم مصري الجنسية",
    "بكالوريوس تربية أو ليسانس آداب/علوم + دبلوم تربوي",
    "تقدير عام جيد جداً على الأقل",
    "اجتياز اختبارات الكفاءة التربوية المعتمدة",
    "إتقان اللغة الإنجليزية (لمدارس اللغات)",
    "الاستعداد للتدريب على منهجية «توكاتسو»",
  ];

  return (
    <PublicShell>
      <section className="relative overflow-hidden border-b border-border bg-hero-radial">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-4 py-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-4 py-1.5 text-sm font-bold text-amber-700">
            <Users className="h-4 w-4" /> القسم C — تقديم المعلمين
          </div>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl text-balance">
            انضم لفريق المدارس المصرية اليابانية
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
            تقدم للعمل بمنهجية «توكاتسو» اليابانية — بيئة تعليمية متميزة في {toArabicNumber(schoolsCount)} مدرسة على مستوى الجمهورية
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
              <Award className="ml-1 h-3 w-3" /> تجربة تعليمية متميزة
            </Badge>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12 space-y-12">
        <section>
          <SectionHeading title="خطوات التقديم" subtitle="أربع خطوات لإتمام طلب التقديم للعمل" centered />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Card key={s.title} className="relative p-5 text-center">
                <span className="absolute -top-3 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white nums">
                  {toArabicNumber(i + 1)}
                </span>
                <s.icon className="mx-auto mb-3 h-9 w-9 text-amber-600" />
                <h3 className="mb-1.5 font-bold text-sm">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <ShieldCheck className="h-5 w-5 text-primary" /> شروط ومتطلبات التقديم
            </h2>
            <ul className="space-y-2.5">
              {requirements.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="text-foreground/90">{r}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6 bg-gradient-to-bl from-amber-500/5 to-transparent">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
              <GraduationCap className="h-5 w-5 text-amber-600" /> لماذا المدارس المصرية اليابانية؟
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p className="flex items-start gap-2">
                <Award className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span><strong className="text-foreground">منهجية توكاتسو:</strong> تطبق نظام التعليم الياباني القائم على تنمية شخصية الطفل بشكل متكامل</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span><strong className="text-foreground">تطوير مهني:</strong> برامج تدريب مستمر بالشراكة مع JICA اليابانية</span>
              </p>
              <p className="flex items-start gap-2">
                <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span><strong className="text-foreground">بيئة عمل متميزة:</strong> فريق تعليمي ملتزم ببيئة محفزة للابتكار</span>
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span><strong className="text-foreground">استقرار وظيفي:</strong> الفرصة للنمو في مشروع تعليمي وطني متنامٍ</span>
              </p>
            </div>
          </Card>
        </div>

        <section className="text-center">
          <Card className="inline-block p-8 bg-gradient-to-l from-amber-600 to-orange-600 text-white">
            <h2 className="text-2xl font-extrabold mb-2">جاهز للتقديم؟</h2>
            <p className="mb-5 text-white/85 max-w-md">
              ابدأ طلب التقديم للعمل — ستحتاج لقراءة الشروط والموافقة عليها أولاً
            </p>
            <Button asChild size="lg" className="bg-white text-amber-700 hover:bg-white/90 px-8 h-12 text-base">
              <Link href="/admission/teachers/apply">
                ابدأ التقديم <ArrowLeft className="mr-2 h-5 w-5" />
              </Link>
            </Button>
          </Card>
          <div className="mt-4">
            <Link
              href="/admission/status?type=teachers"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <FileText className="h-4 w-4" /> هل تقدمت من قبل؟ تحقق من حالة طلبك
            </Link>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
