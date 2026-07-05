"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, AlertCircle,
  User, Users, MapPin, FileCheck, ClipboardList, Mail, MailCheck,
  IdCard, Calendar, GraduationCap, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TermsGate } from "@/components/public/terms-gate";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { computeStudentPlacement } from "@/lib/egyptian-id";
import { toArabicNumber, toArabicDigits } from "@/lib/arabic";
import { arabicOnly, englishOnly, digitsOnly, formatAgeArabic } from "@/lib/validators";

interface Gov { id: string; nameAr: string; }
interface City { id: string; nameAr: string; governorateId: string; }
interface School { id: string; nameAr: string; code: string; governorateId: string; cityId: string; type?: string; }
interface Grade { id: string; nameAr: string; }

type Step = "terms" | "student" | "guardian" | "placement" | "review";

const STEPS: { key: Step; label: string; icon: any }[] = [
  { key: "terms", label: "الشروط", icon: FileCheck },
  { key: "student", label: "بيانات الطالب", icon: User },
  { key: "guardian", label: "ولي الأمر", icon: Users },
  { key: "placement", label: "المدرسة", icon: MapPin },
  { key: "review", label: "المراجعة", icon: ClipboardList },
];

export function StudentApplicationForm({
  governorates, cities, schools, grades, admissionOpen, admissionYear,
}: {
  governorates: Gov[];
  cities: City[];
  schools: School[];
  grades: Grade[];
  admissionOpen: boolean;
  admissionYear: string; // e.g. "2026/2027"
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("terms");
  const [submitting, setSubmitting] = useState(false);

  const STORAGE_KEY = "ejs-student-application-draft";
  const [form, setForm] = useState<any>(() => {
    if (typeof window === "undefined") {
      return {
        studentNameAr: "", studentNameEn: "", nationalId: "",
        gender: "MALE",
        guardianEmail: "", guardianEmailConfirm: "",
        guardianName: "", guardianRelation: "father", guardianPhone: "",
        guardianNationalId: "", guardianOccupation: "",
        governorateId: "", cityId: "", schoolId: "", schoolType: "", gradeId: "", previousSchool: "",
        addressAr: "",
        skillsAnswers: "", notes: "",
      };
    }
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const restored = JSON.parse(raw);
        return { ...{
          studentNameAr: "", studentNameEn: "", nationalId: "",
          gender: "MALE",
          guardianEmail: "", guardianEmailConfirm: "",
          guardianName: "", guardianRelation: "father", guardianPhone: "",
          guardianNationalId: "", guardianOccupation: "",
          governorateId: "", cityId: "", schoolId: "", schoolType: "", gradeId: "", previousSchool: "",
          addressAr: "",
          skillsAnswers: "", notes: "",
        }, ...restored };
      }
    } catch { /* ignore */ }
    return {
      studentNameAr: "", studentNameEn: "", nationalId: "",
      gender: "MALE",
      guardianEmail: "", guardianEmailConfirm: "",
      guardianName: "", guardianRelation: "father", guardianPhone: "",
      guardianNationalId: "", guardianOccupation: "",
      governorateId: "", cityId: "", schoolId: "", schoolType: "", gradeId: "", previousSchool: "",
      addressAr: "",
      skillsAnswers: "", notes: "",
    };
  });

  // Persist on every change. Skip during initial SSR (window is undefined).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch { /* quota */ }
  }, [form]);

  // ── CRITICAL: auto age + grade from Student ID (national ID) ──
  // Year extracted from admission year string e.g. "2026/2027" → 2026
  const admYear = useMemo(() => {
    const m = admissionYear.match(/^(\d{4})/);
    return m ? parseInt(m[1], 10) : new Date().getFullYear();
  }, [admissionYear]);

  const placement = useMemo(() => {
    if (!form.nationalId || form.nationalId.length !== 14) return null;
    return computeStudentPlacement(form.nationalId, admYear);
  }, [form.nationalId, admYear]);

  // auto-populate grade whenever the computed grade changes
  const computedGrade = useMemo(() => {
    if (!placement || !placement.parsed.valid || placement.age == null || !placement.grade) return null;
    if (placement.grade.gradeId === "too-young" || placement.grade.gradeId === "too-old") return placement.grade;
    // match DB grade by name
    const dbGrade = grades.find((g) => g.nameAr === placement.grade!.gradeName);
    if (dbGrade) return { gradeId: dbGrade.id, gradeName: dbGrade.nameAr };
    return { gradeId: placement.grade.gradeId, gradeName: placement.grade.gradeName };
  }, [placement, grades]);

  // Sync the computed grade into form.gradeId via effect (NOT during render).
  // The previous render-time setForm broke under React 19 concurrent mode.
  const lastSyncedGradeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!computedGrade) {
      if (lastSyncedGradeRef.current !== null) {
        lastSyncedGradeRef.current = null;
        setForm((p: any) => (p.gradeId ? { ...p, gradeId: "" } : p));
      }
      return;
    }
    if (computedGrade.gradeId !== lastSyncedGradeRef.current) {
      lastSyncedGradeRef.current = computedGrade.gradeId;
      setForm((p: any) => {
        if (p.gradeId === computedGrade.gradeId) return p;
        return { ...p, gradeId: computedGrade.gradeId, gender: placement?.gender || p.gender };
      });
    }
  }, [computedGrade, placement?.gender]);

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  // Cascade filters: schoolType → governorate → city → school
  // Each level only shows options that lead to a valid choice in the next level.
  const schoolsOfType = useMemo(
    () => form.schoolType ? schools.filter((s) => s.type === form.schoolType) : [],
    [schools, form.schoolType]
  );
  const filteredGovernorates = useMemo(
    () => form.schoolType
      ? governorates.filter((g) => schoolsOfType.some((s) => s.governorateId === g.id))
      : governorates,
    [governorates, schoolsOfType, form.schoolType]
  );
  const filteredCities = useMemo(
    () => form.schoolType
      ? cities.filter((c) => c.governorateId === form.governorateId && schoolsOfType.some((s) => s.cityId === c.id))
      : cities.filter((c) => c.governorateId === form.governorateId),
    [cities, schoolsOfType, form.schoolType, form.governorateId]
  );
  const filteredSchools = useMemo(
    () => form.schoolType
      ? schoolsOfType.filter((s) => s.governorateId === form.governorateId && s.cityId === form.cityId)
      : schools.filter((s) => s.governorateId === form.governorateId && s.cityId === form.cityId),
    [schoolsOfType, schools, form.schoolType, form.governorateId, form.cityId]
  );

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  function validateStep(s: Step): string | null {
    if (s === "student") {
      if (!form.studentNameAr || form.studentNameAr.length < 3) return "اسم الطالب مطلوب (٣ أحرف على الأقل)";
      if (!form.nationalId || form.nationalId.length !== 14) return "الرقم القومي (Student ID) مطلوب (١٤ رقم)";
      if (placement && !placement.parsed.valid) return placement.parsed.error || "الرقم القومي غير صحيح";
      // email mandatory + retype confirmation
      if (!form.guardianEmail || !/^[^@]+@[^@]+\.[^@]+$/.test(form.guardianEmail)) return "بريد ولي الأمر الإلكتروني مطلوب وصحيح";
      if (!form.guardianEmailConfirm) return "يجب إعادة كتابة البريد الإلكتروني للتأكيد";
      if (form.guardianEmail !== form.guardianEmailConfirm) return "البريد الإلكتروني وتأكيده غير متطابقين";
      // age/grade must be valid
      if (computedGrade && (computedGrade.gradeId === "too-young" || computedGrade.gradeId === "too-old")) {
        return computedGrade.gradeId === "too-young" ? "عمر الطفل أقل من المطلوب للقبول" : "عمر الطفل يتجاوز المراحل المتاحة";
      }
      if (!computedGrade || !form.gradeId) return "تعذّر تحديد المرحلة الدراسية من الرقم القومي";
    }
    if (s === "guardian") {
      if (!form.guardianName || form.guardianName.length < 3) return "اسم ولي الأمر مطلوب";
      if (!form.guardianPhone || form.guardianPhone.length < 10) return "رقم هاتف ولي الأمر مطلوب";
      if (!form.guardianNationalId || form.guardianNationalId.length !== 14) return "الرقم القومي لولي الأمر مطلوب (١٤ رقم)";
      if (!form.addressAr) return "العنوان مطلوب";
    }
    if (s === "placement") {
      if (!form.schoolType) return "اختر نوع التعليم (عربي / لغات)";
      if (!form.governorateId) return "اختر المحافظة";
      if (!form.cityId) return "اختر المدينة";
      if (!form.schoolId) return "اختر المدرسة";
      if (!form.gradeId) return "المرحلة الدراسية غير محددة (تأكد من صحة الرقم القومي)";
    }
    return null;
  }

  function scrollToTop() {
    requestAnimationFrame(() => {
      const el = document.getElementById("apply-form-top");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  function next() {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    const ni = stepIndex + 1;
    if (ni < STEPS.length) { setStep(STEPS[ni].key); scrollToTop(); }
  }
  function prev() {
    const pi = stepIndex - 1;
    if (pi >= 0) { setStep(STEPS[pi].key); scrollToTop(); }
  }

  async function submit() {
    for (const s of ["student", "guardian", "placement"] as Step[]) {
      const err = validateStep(s);
      if (err) { toast.error(err); setStep(s); return; }
    }
    setSubmitting(true);
    try {
      // birthDate is derived from nationalId on the server, schoolType is a UI-only filter.
      const { birthDate: _bd, schoolType: _st, ...formToSend } = form as any;
      const res = await fetch("/api/public/applications/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formToSend,
          termsAccepted: true,
          termsVersion: "2026-v1",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Special handling: 409 duplicate application
        if (res.status === 409 && data.code === "DUPLICATE_APPLICATION") {
          const refNo = data.details?.referenceNo;
          toast.error(
            refNo
              ? `يوجد طلب سابق بنفس الرقم القومي\nالرقم المرجعي: ${refNo}\nيمكنك متابعة حالته بدلاً من تقديم طلب جديد.`
              : "يوجد طلب سابق بنفس الرقم القومي ولم تتم معالجته بعد.",
            { duration: 10000 }
          );
          throw new Error("DUPLICATE_APPLICATION");
        }
        // Build a detailed error message from the Zod field errors
        const details = data.details?.fieldErrors;
        let detailMsg = data.error || "فشل إرسال الطلب";
        if (details) {
          const fieldNames = {
            studentNameAr: "اسم الطالب",
            studentNameEn: "اسم الطالب بالإنجليزية",
            birthDate: "تاريخ الميلاد",
            gender: "النوع",
            nationalId: "الرقم القومي",
            nationality: "الجنسية",
            guardianName: "اسم ولي الأمر",
            guardianRelation: "صلة القرابة",
            guardianPhone: "هاتف ولي الأمر",
            guardianEmail: "بريد ولي الأمر",
            guardianNationalId: "الرقم القومي لولي الأمر",
            governorateId: "المحافظة",
            cityId: "المدينة",
            schoolId: "المدرسة",
            gradeId: "المرحلة",
            addressAr: "العنوان",
            termsAccepted: "الموافقة على الشروط",
            termsVersion: "إصدار الشروط",
          };
          const msgs = Object.entries(details)
            .filter(([_, v]) => Array.isArray(v) && v.length > 0)
            .map(([k, v]) => `${fieldNames[k] || k}: ${(v as string[]).join(", ")}`)
            .join("\n");
          if (msgs) detailMsg = `${data.error || "بيانات غير صالحة"}\n${msgs}`;
        }
        throw new Error(detailMsg);
      }
      toast.success("تم إرسال طلبك بنجاح");
      router.push(`/admission/students/success?ref=${encodeURIComponent(data.referenceNo)}`);
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ أثناء الإرسال");
    } finally {
      setSubmitting(false);
    }
  }

  if (!admissionOpen) {
    return (
      <Card className="p-10 text-center">
        <AlertCircle className="mx-auto mb-3 h-12 w-12 text-rose-500" />
        <h2 className="text-xl font-bold mb-2">التقديم مغلق</h2>
        <p className="text-muted-foreground mb-4">لا يمكن تقديم طلبات جديدة في الوقت الحالي</p>
        <Button asChild variant="outline"><a href="/admission/students">العودة لصفحة التقديم</a></Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* stepper */}
      <Card id="apply-form-top" className="p-4 scroll-mt-4">
        <div className="flex items-center justify-between overflow-x-auto">
          {STEPS.map((s, i) => {
            const done = stepIndex > i;
            const active = stepIndex === i;
            return (
              <div key={s.key} className="flex items-center shrink-0">
                <div className={cn("flex flex-col items-center gap-1.5 px-2", !active && !done && "opacity-50")}>
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                    done ? "bg-primary text-primary-foreground" : active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  )}>
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                  </div>
                  <span className={cn("text-[11px] font-medium whitespace-nowrap", active && "text-primary font-bold")}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={cn("h-0.5 w-8 sm:w-16 mx-1", done ? "bg-primary" : "bg-border")} />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* step content */}
      {step === "terms" && (
        <TermsGate
          contentKey="terms.student"
          fallbackTitle="شروط وأحكام تقديم الطلاب"
          fallbackBody="يجب قراءة الشروط والموافقة عليها قبل التقديم."
          accent="crimson"
          ctaLabel="أوافق وأبدأ التقديم"
          fullTermsHref="/terms"
          onAccepted={() => { setStep("student"); scrollToTop(); }}
        />
      )}

      {step === "student" && (
        <Card className="p-6 space-y-5">
          <h2 className="text-lg font-bold flex items-center gap-2"><User className="h-5 w-5 text-primary" /> بيانات الطالب</h2>

          {/* Student identity */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسم الطالب بالعربية *"><Input value={form.studentNameAr} onChange={(e) => set("studentNameAr", arabicOnly(e.target.value))} placeholder="الاسم رباعي" maxLength={120} /></Field>
            <Field label="الاسم بالإنجليزية (اختياري)"><Input value={form.studentNameEn} onChange={(e) => set("studentNameEn", englishOnly(e.target.value))} dir="ltr" maxLength={120} /></Field>
          </div>

          {/* Student ID — CRITICAL: triggers auto age + grade */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <IdCard className="h-3.5 w-3.5 text-primary" /> الرقم القومي للطالب (Student ID) *
            </Label>
            <Input
              value={form.nationalId}
              onChange={(e) => set("nationalId", e.target.value.replace(/\D/g, "").slice(0, 14))}
              dir="ltr"
              placeholder="٠١٢٣٤٥٦٧٨٩٠١٢٣"
              className={cn("nums text-lg tracking-wider", form.nationalId.length === 14 && (computedGrade ? "border-emerald-500" : "border-rose-500"))}
            />
            <p className="text-[11px] text-muted-foreground">يتم تلقائياً حساب عمر الطالب وتحديد المرحلة المناسبة من الرقم القومي</p>
            <details className="text-[11px] text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground transition-colors">
                أين أجد الرقم القومي للطالب على شهادة الميلاد؟
              </summary>
              <div className="mt-2 rounded-lg border border-border bg-secondary/20 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/id-reference.svg"
                  alt="مكان الرقم القومي في شهادة الميلاد — مربع أحمر يحدد الـ ١٤ رقم"
                  className="w-full h-auto rounded"
                  width={600}
                  height={360}
                />
                <p className="mt-1.5 text-[10px]">
                  الرقم القومي المكوّن من ١٤ رقم موجود في شهادة الميلاد المصرية
                  (الإصدار الحديث). أدخله كما هو بدون أي فواصل.
                </p>
              </div>
            </details>
          </div>

          {/* ── CRITICAL: live age + grade display + alert ── */}
          {form.nationalId.length === 14 && placement && (
            <>
              {placement.parsed.valid && placement.age != null ? (
                <div className="space-y-3">
                  {/* Age + grade alert banner */}
                  <div className={cn(
                    "rounded-xl border-2 p-4",
                    computedGrade && (computedGrade.gradeId === "too-young" || computedGrade.gradeId === "too-old")
                      ? "border-rose-300 bg-rose-50"
                      : "border-emerald-300 bg-emerald-50"
                  )}>
                    <div className="flex items-start gap-3">
                      <AlertCircle className={cn("mt-0.5 h-5 w-5 shrink-0",
                        computedGrade && (computedGrade.gradeId === "too-young" || computedGrade.gradeId === "too-old") ? "text-rose-600" : "text-emerald-600")} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="text-sm font-bold text-foreground">
                            عمر الطالب في ١ أكتوبر {toArabicDigits(String(admYear))}: <span className="nums text-lg">{placement.parsed.birthDate ? formatAgeArabic(placement.parsed.birthDate) : `${toArabicNumber(placement.age)} سنوات`}</span>
                          </span>
                        </div>
                        {computedGrade && (computedGrade.gradeId === "too-young" || computedGrade.gradeId === "too-old") ? (
                          <p className="text-sm font-medium text-rose-700">{computedGrade.gradeName}</p>
                        ) : (
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            <span className="text-sm text-muted-foreground">المرحلة الدراسية المناسبة:</span>
                            <Badge className="bg-primary text-primary-foreground">{computedGrade?.gradeName}</Badge>
                          </div>
                        )}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          تاريخ الميلاد المستخرج: <span className="nums">{toArabicDigits(`${placement.parsed.year}/${String(placement.parsed.month).padStart(2, "0")}/${String(placement.parsed.day).padStart(2, "0")}`)}</span>
                          {" "}• الجنس المستخرج: {placement.parsed.gender === "MALE" ? "ذكر" : "أنثى"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-1.5">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>تم تحديد المرحلة تلقائياً بناءً على العمر المحسوب. لن تحتاج لاختيار المرحلة في الخطوات التالية.</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-rose-300 bg-rose-50 p-4 flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-rose-700">تنبيه: الرقم القومي غير صحيح</p>
                    <p className="text-xs text-rose-600 mt-0.5">{placement.parsed.error}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Parent email + retype confirmation — mandatory */}
          <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-1.5"><Mail className="h-4 w-4 text-primary" /> بريد ولي الأمر الإلكتروني (إلزامي)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">البريد الإلكتروني *</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={form.guardianEmail} onChange={(e) => set("guardianEmail", e.target.value)} dir="ltr" type="email" placeholder="parent@example.com" className="pr-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <MailCheck className="h-3.5 w-3.5 text-primary" /> تأكيد البريد الإلكتروني *
                </Label>
                <div className="relative">
                  <MailCheck className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={form.guardianEmailConfirm}
                    onChange={(e) => set("guardianEmailConfirm", e.target.value)}
                    dir="ltr" type="email" placeholder="أعد كتابة البريد الإلكتروني" className="pr-9"
                    aria-invalid={form.guardianEmailConfirm.length > 0 && form.guardianEmail !== form.guardianEmailConfirm}
                  />
                </div>
                {form.guardianEmailConfirm.length > 0 && form.guardianEmail !== form.guardianEmailConfirm && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> البريد غير متطابق</p>
                )}
                {form.guardianEmailConfirm.length > 0 && form.guardianEmail === form.guardianEmailConfirm && (
                  <p className="text-[11px] text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> البريد متطابق</p>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">يجب إعادة كتابة البريد الإلكتروني للتأكيد قبل المتابعة</p>
          </div>

          <StepFooter onPrev={prev} onNext={next} nextLabel="التالي" />
        </Card>
      )}

      {step === "guardian" && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> بيانات ولي الأمر</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسم ولي الأمر *"><Input value={form.guardianName} onChange={(e) => set("guardianName", arabicOnly(e.target.value))} maxLength={120} /></Field>
            <Field label="صلة القرابة">
              <Select value={form.guardianRelation} onValueChange={(v) => set("guardianRelation", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">الأب</SelectItem>
                  <SelectItem value="mother">الأم</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="رقم الهاتف *" help="11 رقماً يبدأ بـ 01"><Input value={form.guardianPhone} onChange={(e) => set("guardianPhone", digitsOnly(e.target.value).slice(0, 11))} dir="ltr" inputMode="tel" maxLength={11} placeholder="01XXXXXXXXX" /></Field>
            <Field label="الرقم القومي لولي الأمر * (١٤ رقم)">
              <Input value={form.guardianNationalId} onChange={(e) => set("guardianNationalId", e.target.value.replace(/\D/g, "").slice(0, 14))} dir="ltr" className="nums" />
            </Field>
            <Field label="المهنة (اختياري)"><Input value={form.guardianOccupation} onChange={(e) => set("guardianOccupation", e.target.value)} /></Field>
          </div>
          <Field label="عنوان السكن *">
            <Input value={form.addressAr} onChange={(e) => set("addressAr", e.target.value)} placeholder="العنوان بالتفصيل" />
          </Field>
          {/* email shown read-only (already confirmed in step 1) */}
          <div className="rounded-lg bg-secondary/30 p-3 text-sm flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">البريد المؤكد:</span>
            <span className="font-medium" dir="ltr">{form.guardianEmail}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <StepFooter onPrev={prev} onNext={next} nextLabel="التالي" />
        </Card>
      )}

      {step === "placement" && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> اختيار المدرسة</h2>

          {/* school type — first filter */}
          <Field label="نوع التعليم *" help="يحدد نوع المدارس المعروضة في القوائم التالية">
            <Select value={form.schoolType} onValueChange={(v) => { set("schoolType", v); set("governorateId", ""); set("cityId", ""); set("schoolId", ""); }}>
              <SelectTrigger><SelectValue placeholder="اختر نوع التعليم" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ARABIC">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    مدارس عربي
                  </span>
                </SelectItem>
                <SelectItem value="LANGUAGES">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                    مدارس لغات
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* grade auto-set, shown read-only */}
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">المرحلة الدراسية (محددة تلقائياً من العمر):</span>
              <Badge className="bg-primary text-primary-foreground">{grades.find((g) => g.id === form.gradeId)?.nameAr || "—"}</Badge>
              <span className="text-[11px] text-muted-foreground mr-auto">يُحدد النظام المرحلة تلقائياً</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="المحافظة *" help={form.schoolType ? "المحافظات التي بها مدارس من النوع المختار" : "اختر نوع التعليم أولاً"}>
              <Select value={form.governorateId} onValueChange={(v) => { set("governorateId", v); set("cityId", ""); set("schoolId", ""); }} disabled={!form.schoolType}>
                <SelectTrigger><SelectValue placeholder={form.schoolType ? "اختر المحافظة" : "اختر نوع التعليم أولاً"} /></SelectTrigger>
                <SelectContent className="max-h-72">{filteredGovernorates.map((g) => <SelectItem key={g.id} value={g.id}>{g.nameAr}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="المدينة / الإدارة *">
              <Select value={form.cityId} onValueChange={(v) => { set("cityId", v); set("schoolId", ""); }} disabled={!form.governorateId}>
                <SelectTrigger><SelectValue placeholder={form.governorateId ? "اختر المدينة" : "اختر المحافظة أولاً"} /></SelectTrigger>
                <SelectContent className="max-h-72">{filteredCities.map((c) => <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="المدرسة *">
            <Select value={form.schoolId} onValueChange={(v) => set("schoolId", v)} disabled={!form.cityId}>
              <SelectTrigger><SelectValue placeholder={form.cityId ? "اختر المدرسة" : "اختر المدينة أولاً"} /></SelectTrigger>
              <SelectContent className="max-h-72">{filteredSchools.map((s) => <SelectItem key={s.id} value={s.id}>{s.nameAr}{s.type === "ARABIC" ? " - عربي" : " - لغات"} ({s.code})</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="المدرسة السابقة (إن وجدت)"><Input value={form.previousSchool} onChange={(e) => set("previousSchool", e.target.value)} /></Field>
          <Field label="ملاحظات / مهارات الطفل (اختياري)">
            <Textarea value={form.skillsAnswers} onChange={(e) => set("skillsAnswers", e.target.value)} rows={3} placeholder="اذكر أي مهارات أو أنشطة يتمتع بها طفلك" />
          </Field>
          <StepFooter onPrev={prev} onNext={next} nextLabel="مراجعة الطلب" />
        </Card>
      )}

      {step === "review" && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> مراجعة الطلب</h2>
          <div className="rounded-xl bg-secondary/30 p-4 text-sm space-y-3">
            <ReviewRow label="اسم الطالب" value={form.studentNameAr} />
            <ReviewRow label="الرقم القومي" value={form.nationalId} mono />
            <ReviewRow label="العمر" value={placement?.parsed.birthDate ? formatAgeArabic(placement.parsed.birthDate) : "—"} />
            <ReviewRow label="المرحلة" value={grades.find((g) => g.id === form.gradeId)?.nameAr} />
            <ReviewRow label="البريد الإلكتروني" value={form.guardianEmail} mono />
            <ReviewRow label="ولي الأمر" value={`${form.guardianName} (${form.guardianRelation})`} />
            <ReviewRow label="الهاتف" value={form.guardianPhone} mono />
            <ReviewRow label="المحافظة" value={governorates.find((g) => g.id === form.governorateId)?.nameAr} />
            <ReviewRow label="المدينة" value={cities.find((c) => c.id === form.cityId)?.nameAr} />
            <ReviewRow label="المدرسة" value={(() => {
              const sc = schools.find((s) => s.id === form.schoolId);
              if (!sc) return undefined;
              const typeLabel = sc.type === "ARABIC" ? " - عربي" : " - لغات";
              return `${sc.nameAr}${typeLabel} (${sc.code})`;
            })()} />
            <ReviewRow label="العنوان" value={form.addressAr} />
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>لقد وافقت على الشروط والأحكام في الخطوة الأولى. بتأكيدك سيتم إرسال الطلب ولا يمكن التعديل عليه لاحقاً.</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={prev} className="flex-1 h-11"><ArrowRight className="ml-2 h-4 w-4" /> السابق</Button>
            <Button onClick={submit} disabled={submitting} className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground">
              {submitting ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ الإرسال...</> : <><CheckCircle2 className="ml-2 h-4 w-4" /> تأكيد وإرسال الطلب</>}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
function StepFooter({ onPrev, onNext, nextLabel }: { onPrev: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <div className="flex gap-2 pt-2">
      <Button variant="outline" onClick={onPrev} className="flex-1 h-11"><ArrowRight className="ml-2 h-4 w-4" /> السابق</Button>
      <Button onClick={onNext} className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground">{nextLabel} <ArrowLeft className="mr-2 h-4 w-4" /></Button>
    </div>
  );
}
function ReviewRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn("font-medium text-left", mono && "nums")} dir={mono ? "ltr" : "rtl"}>{value || "—"}</span>
    </div>
  );
}
