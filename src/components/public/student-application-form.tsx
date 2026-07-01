"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, AlertCircle,
  User, Users, MapPin, FileCheck, ClipboardList,
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

interface Gov { id: string; nameAr: string; }
interface City { id: string; nameAr: string; governorateId: string; }
interface School { id: string; nameAr: string; code: string; governorateId: string; cityId: string; }
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
  governorates, cities, schools, grades, admissionOpen,
}: {
  governorates: Gov[];
  cities: City[];
  schools: School[];
  grades: Grade[];
  admissionOpen: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("terms");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<any>({
    studentNameAr: "", studentNameEn: "", birthDate: "", gender: "MALE", nationalId: "",
    guardianName: "", guardianRelation: "father", guardianPhone: "", guardianEmail: "", guardianNationalId: "", guardianOccupation: "",
    governorateId: "", cityId: "", schoolId: "", gradeId: "", previousSchool: "", addressAr: "",
    skillsAnswers: "", notes: "",
  });

  const filteredCities = useMemo(() => cities.filter((c) => c.governorateId === form.governorateId), [cities, form.governorateId]);
  const filteredSchools = useMemo(() => schools.filter((s) => s.governorateId === form.governorateId && s.cityId === form.cityId), [schools, form.governorateId, form.cityId]);

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  function validateStep(s: Step): string | null {
    if (s === "student") {
      if (!form.studentNameAr || form.studentNameAr.length < 3) return "اسم الطالب مطلوب (٣ أحرف على الأقل)";
      if (!form.birthDate) return "تاريخ الميلاد مطلوب";
      if (!form.nationalId || form.nationalId.length !== 14) return "الرقم القومي للطالب مطلوب (١٤ رقم)";
    }
    if (s === "guardian") {
      if (!form.guardianName || form.guardianName.length < 3) return "اسم ولي الأمر مطلوب";
      if (!form.guardianPhone || form.guardianPhone.length < 10) return "رقم هاتف ولي الأمر مطلوب";
      if (!form.guardianNationalId || form.guardianNationalId.length !== 14) return "الرقم القومي لولي الأمر مطلوب (١٤ رقم)";
      if (form.guardianEmail && !/^[^@]+@[^@]+\.[^@]+$/.test(form.guardianEmail)) return "البريد الإلكتروني غير صحيح";
    }
    if (s === "placement") {
      if (!form.governorateId) return "اختر المحافظة";
      if (!form.cityId) return "اختر المدينة";
      if (!form.schoolId) return "اختر المدرسة";
      if (!form.gradeId) return "اختر المرحلة الدراسية";
      if (!form.addressAr) return "العنوان مطلوب";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) setStep(STEPS[nextIdx].key);
  }
  function prev() {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) setStep(STEPS[prevIdx].key);
  }

  async function submit() {
    // final validation
    for (const s of ["student", "guardian", "placement"] as Step[]) {
      const err = validateStep(s);
      if (err) { toast.error(err); setStep(s); return; }
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/applications/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, termsAccepted: true, termsVersion: "2026-v1" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال الطلب");
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
      <Card className="p-4">
        <div className="flex items-center justify-between overflow-x-auto">
          {STEPS.map((s, i) => {
            const done = stepIndex > i;
            const active = stepIndex === i;
            return (
              <div key={s.key} className="flex items-center shrink-0">
                <div className={cn("flex flex-col items-center gap-1.5 px-2", !active && !done && "opacity-50")}>
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                    done ? "bg-emerald-600 text-white" : active ? "bg-crimson text-white" : "bg-secondary text-muted-foreground"
                  )}>
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                  </div>
                  <span className={cn("text-[11px] font-medium whitespace-nowrap", active && "text-crimson font-bold")}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={cn("h-0.5 w-8 sm:w-16 mx-1", done ? "bg-emerald-600" : "bg-border")} />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* step content */}
      {step === "terms" && (
        <TermsGate
          termsSlug="student-terms"
          accent="crimson"
          ctaLabel="أوافق وأبدأ التقديم"
          onAccepted={() => setStep("student")}
        />
      )}

      {step === "student" && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><User className="h-5 w-5 text-crimson" /> بيانات الطالب</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسم الطالب بالعربية *"><Input value={form.studentNameAr} onChange={(e) => set("studentNameAr", e.target.value)} placeholder="الاسم رباعي" /></Field>
            <Field label="الاسم بالإنجليزية (اختياري)"><Input value={form.studentNameEn} onChange={(e) => set("studentNameEn", e.target.value)} dir="ltr" /></Field>
            <Field label="تاريخ الميلاد *"><Input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} dir="ltr" /></Field>
            <Field label="الرقم القومي للطالب * (١٤ رقم)">
              <Input value={form.nationalId} onChange={(e) => set("nationalId", e.target.value.replace(/\D/g, "").slice(0, 14))} dir="ltr" placeholder="٠١٢٣٤٥٦٧٨٩٠١٢٣" className="nums" />
            </Field>
          </div>
          <Field label="النوع">
            <RadioGroup value={form.gender} onValueChange={(v) => set("gender", v)} className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="MALE" id="g-m" /><Label htmlFor="g-m">ذكر</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="FEMALE" id="g-f" /><Label htmlFor="g-f">أنثى</Label></div>
            </RadioGroup>
          </Field>
          <StepFooter onPrev={prev} onNext={next} nextLabel="التالي" />
        </Card>
      )}

      {step === "guardian" && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Users className="h-5 w-5 text-crimson" /> بيانات ولي الأمر</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسم ولي الأمر *"><Input value={form.guardianName} onChange={(e) => set("guardianName", e.target.value)} /></Field>
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
            <Field label="رقم الهاتف *"><Input value={form.guardianPhone} onChange={(e) => set("guardianPhone", e.target.value.replace(/[^\d+]/g, ""))} dir="ltr" placeholder="01XXXXXXXXX" /></Field>
            <Field label="البريد الإلكتروني (اختياري)"><Input value={form.guardianEmail} onChange={(e) => set("guardianEmail", e.target.value)} dir="ltr" /></Field>
            <Field label="الرقم القومي لولي الأمر * (١٤ رقم)">
              <Input value={form.guardianNationalId} onChange={(e) => set("guardianNationalId", e.target.value.replace(/\D/g, "").slice(0, 14))} dir="ltr" className="nums" />
            </Field>
            <Field label="المهنة (اختياري)"><Input value={form.guardianOccupation} onChange={(e) => set("guardianOccupation", e.target.value)} /></Field>
          </div>
          <Field label="عنوان السكن *">
            <Input value={form.addressAr} onChange={(e) => set("addressAr", e.target.value)} placeholder="العنوان بالتفصيل" />
          </Field>
          <StepFooter onPrev={prev} onNext={next} nextLabel="التالي" />
        </Card>
      )}

      {step === "placement" && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><MapPin className="h-5 w-5 text-crimson" /> اختيار المدرسة والمرحلة</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="المحافظة *">
              <Select value={form.governorateId} onValueChange={(v) => { set("governorateId", v); set("cityId", ""); set("schoolId", ""); }}>
                <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                <SelectContent className="max-h-72">{governorates.map((g) => <SelectItem key={g.id} value={g.id}>{g.nameAr}</SelectItem>)}</SelectContent>
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
              <SelectContent className="max-h-72">{filteredSchools.map((s) => <SelectItem key={s.id} value={s.id}>{s.nameAr} ({s.code})</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="المرحلة الدراسية *">
            <Select value={form.gradeId} onValueChange={(v) => set("gradeId", v)}>
              <SelectTrigger><SelectValue placeholder="اختر المرحلة" /></SelectTrigger>
              <SelectContent>{grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.nameAr}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="المدرسة السابقة (إن وجدت)"><Input value={form.previousSchool} onChange={(e) => set("previousSchool", e.target.value)} /></Field>
          <Field label="ملاحظات / مهارات الطالب (اختياري)">
            <Textarea value={form.skillsAnswers} onChange={(e) => set("skillsAnswers", e.target.value)} rows={3} placeholder="اذكر أي مهارات أو أنشطة يتمتع بها طفلك" />
          </Field>
          <StepFooter onPrev={prev} onNext={next} nextLabel="مراجعة الطلب" />
        </Card>
      )}

      {step === "review" && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5 text-crimson" /> مراجعة الطلب</h2>
          <div className="rounded-xl bg-secondary/30 p-4 text-sm space-y-3">
            <ReviewRow label="اسم الطالب" value={form.studentNameAr} />
            <ReviewRow label="الرقم القومي" value={form.nationalId} mono />
            <ReviewRow label="تاريخ الميلاد" value={form.birthDate} mono />
            <ReviewRow label="ولي الأمر" value={`${form.guardianName} (${form.guardianRelation})`} />
            <ReviewRow label="الهاتف" value={form.guardianPhone} mono />
            <ReviewRow label="المحافظة" value={governorates.find((g) => g.id === form.governorateId)?.nameAr} />
            <ReviewRow label="المدينة" value={cities.find((c) => c.id === form.cityId)?.nameAr} />
            <ReviewRow label="المدرسة" value={schools.find((s) => s.id === form.schoolId)?.nameAr} />
            <ReviewRow label="المرحلة" value={grades.find((g) => g.id === form.gradeId)?.nameAr} />
            <ReviewRow label="العنوان" value={form.addressAr} />
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>لقد وافقت على الشروط والأحكام في الخطوة الأولى. بتأكيدك سيتم إرسال الطلب ولا يمكن التعديل عليه لاحقاً.</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={prev} className="flex-1 h-11"><ArrowRight className="ml-2 h-4 w-4" /> السابق</Button>
            <Button onClick={submit} disabled={submitting} className="flex-1 h-11 bg-crimson hover:bg-crimson/90 text-white">
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
      <Button onClick={onNext} className="flex-1 h-11 bg-crimson hover:bg-crimson/90 text-white">{nextLabel} <ArrowLeft className="mr-2 h-4 w-4" /></Button>
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
