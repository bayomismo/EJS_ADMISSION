import Link from "next/link";
import {
  GraduationCap, CheckCircle2, FileText, Clock, MapPin, Users,
  ArrowLeft, ShieldCheck, AlertCircle,
} from "lucide-react";
import { db } from "@/lib/db";
import { getSiteSettings, computeLiveStatus } from "@/lib/settings";
import { PublicShell } from "@/components/public/public-shell";
import { SectionHeading } from "@/components/public/section-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toArabicNumber } from "@/lib/arabic";

export const dynamic = "force-dynamic";

export default async function StudentAdmissionLandingPage() {
  const settings = await getSiteSettings();
  const live = computeLiveStatus(settings.admission);
  const schoolsCount = await db.school.count({ where: { isActive: true, isArchived: false } });

  const steps = [
    { icon: FileText, title: "قراءة الشروط", desc: "استعراض شروط وأحكام التقديم بالكامل والموافقة عليها" },
    { icon: Users, title: "بيانات الطالب وولي الأمر", desc: "تعبئة البيانات الشخصية للطالب وولي الأمر والرقم القومي" },
    { icon: MapPin, title: "اختيار المدرسة", desc: "تحديد المحافظة والمدينة والمدرسة والمرحلة الدراسية" },
    { icon: CheckCircle2, title: "المراجعة والإرسال", desc: "مراجعة البيانات وإرسال الطلب والحصول على رقم مرجعي" },
  ];

  const requirements = [
    "أن يكون الطفل مصري الجنسية من أبوين مصريين",
    "أن يكون سن الطفل ضمن الشريحة العمرية للمرحلة المتقدم لها",
    "التقديم للصفوف من KG1 حتى الصف الثالث الابتدائي",
    "تعبئة جميع البيانات بدقة وأمانة",
    "الرقم القومي لولي الأمر والطفل (إن وجد)",
    "بيانات المدرسة المختارة من قائمة المدارس المعتمدة",
  ];

  return (
    <PublicShell>
      {/* hero */}
      <section className="relative overflow-hidden border-b border-border bg-hero-radial">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-4 py-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-crimson/10 px-4 py-1.5 text-sm font-bold text-crimson">
            <GraduationCap className="h-4 w-4" /> القسم B — تقديم الطلاب
          </div>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl text-balance">
            تقديم طلب الالتحاق بالمدارس المصرية اليابانية
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
            للعام الدراسي {settings.admission.year} — {settings.admission.phasesLabel}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Badge className={`${live.status === "OPEN" ? "bg-emerald-600" : live.status === "UPCOMING" ? "bg-amber-500" : "bg-rose-600"} text-white`}>
              حالة التقديم: {live.label}
            </Badge>
            <Badge variant="outline" className="nums">
              <Clock className="ml-1 h-3 w-3" /> {toArabicNumber(schoolsCount)} مدرسة متاحة
            </Badge>
          </div>
          {live.status === "CLOSED" && (
            <div className="mx-auto mt-6 flex max-w-xl items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              التقديم مغلق حالياً لهذا العام الدراسي. لا يمكن تقديم طلبات جديدة.
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12 space-y-12">
        {/* steps */}
        <section>
          <SectionHeading title="خطوات التقديم" subtitle="أربع خطوات بسيطة لإتمام طلب الالتحاق" centered />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Card key={s.title} className="relative p-5 text-center">
                <span className="absolute -top-3 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-crimson text-xs font-bold text-white nums">
                  {toArabicNumber(i + 1)}
                </span>
                <s.icon className="mx-auto mb-3 h-9 w-9 text-crimson" />
                <h3 className="mb-1.5 font-bold text-sm">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* requirements + terms preview */}
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

          <Card className="p-6 bg-gradient-to-bl from-crimson/5 to-transparent">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
              <FileText className="h-5 w-5 text-crimson" /> ملاحظات هامة
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-crimson" />
                <span><strong className="text-foreground">عامل الوقت معيار تقييمي:</strong> يُنصح بالتقديم مبكراً خلال الفترة المحددة</span>
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-crimson" />
                <span><strong className="text-foreground">الموافقة على الشروط إلزامية:</strong> يجب قراءة الشروط بالكامل والموافقة عليها قبل التقديم</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-crimson" />
                <span><strong className="text-foreground">المقابلة الشخصية:</strong> تُعقد مقابلة للطالب وولي الأمر بعد المرحلة الأولى للفرز</span>
              </p>
              <p className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-crimson" />
                <span><strong className="text-foreground">صحة البيانات:</strong> أي بيانات غير صحيحة تؤدي لإلغاء الطلب</span>
              </p>
            </div>
          </Card>
        </div>

        {/* CTA */}
        <section className="text-center">
          <Card className="inline-block p-8 bg-gradient-to-l from-crimson to-rose-600 text-white">
            <h2 className="text-2xl font-extrabold mb-2">جاهز للتقديم؟</h2>
            <p className="mb-5 text-white/85 max-w-md">
              ابدأ طلب التقديم الآن — ستحتاج لقراءة الشروط والموافقة عليها أولاً
            </p>
            <Button
              asChild={live.status !== "CLOSED"}
              disabled={live.status === "CLOSED"}
              size="lg"
              className="bg-white text-crimson hover:bg-white/90 px-8 h-12 text-base disabled:opacity-60"
            >
              {live.status === "CLOSED" ? (
                <span><AlertCircle className="ml-2 h-5 w-5" /> التقديم مغلق</span>
              ) : (
                <Link href="/admission/students/apply">
                  ابدأ التقديم <ArrowLeft className="mr-2 h-5 w-5" />
                </Link>
              )}
            </Button>
          </Card>
          <div className="mt-4">
            <Link
              href="/admission/status?type=students"
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
