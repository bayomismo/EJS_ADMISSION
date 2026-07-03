"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2,
  User, GraduationCap, Briefcase, ClipboardList, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { TermsGate } from "@/components/public/terms-gate";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { arabicOnly, englishOnly, digitsOnly } from "@/lib/validators";

interface Gov { id: string; nameAr: string; }

type Step = "terms" | "personal" | "qualifications" | "review";

const STEPS: { key: Step; label: string; icon: any }[] = [
  { key: "terms", label: "الشروط", icon: CheckCircle2 },
  { key: "personal", label: "البيانات الشخصية", icon: User },
  { key: "qualifications", label: "المؤهلات والخبرات", icon: GraduationCap },
  { key: "review", label: "المراجعة", icon: ClipboardList },
];

export function TeacherApplicationForm({ governorates }: { governorates: Gov[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("terms");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<any>({
    fullNameAr: "", fullNameEn: "", birthDate: "", gender: "MALE", nationalId: "",
    phone: "", email: "", addressAr: "",
    qualification: "Bachelor", university: "", graduationYear: new Date().getFullYear() - 5,
    specialization: "", subjects: "", yearsOfExperience: 0,
    currentEmployer: "", currentPosition: "", hasTeachingCert: false,
    preferredGovernorateId: "", notes: "",
  });

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  function validateStep(s: Step): string | null {
    if (s === "personal") {
      if (!form.fullNameAr || form.fullNameAr.length < 3) return "الاسم بالعربية مطلوب";
      if (!form.birthDate) return "تاريخ الميلاد مطلوب";
      if (!form.nationalId || form.nationalId.length !== 14) return "الرقم القومي مطلوب (١٤ رقم)";
      if (!form.phone || form.phone.length < 10) return "رقم الهاتف مطلوب";
      if (form.email && !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) return "البريد الإلكتروني غير صحيح";
      if (!form.addressAr) return "العنوان مطلوب";
    }
    if (s === "qualifications") {
      if (!form.university) return "الجامعة مطلوبة";
      if (!form.graduationYear) return "سنة التخرج مطلوبة";
      if (!form.subjects) return "المواد الدراسية مطلوبة";
    }
    return null;
  }

  function scrollToTop() {
    requestAnimationFrame(() => {
      const el = document.getElementById("teacher-form-top");
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
    if (pi >= 0) { setStep(STEPS[pi - 1]?.key ?? step); scrollToTop(); }
  }

  async function submit() {
    for (const s of ["personal", "qualifications"] as Step[]) {
      const err = validateStep(s);
      if (err) { toast.error(err); setStep(s); return; }
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/applications/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, termsAccepted: true, termsVersion: "2026-v1" }),
      });
      const data = await res.json();
      if (!res.ok) {
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
        throw new Error(data.error || "فشل إرسال الطلب");
      }
      toast.success("تم إرسال طلبك بنجاح");
      router.push(`/admission/teachers/success?ref=${encodeURIComponent(data.referenceNo)}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* stepper */}
      <div id="teacher-form-top" />
      <Card className="p-4">
        <div className="flex items-center justify-between overflow-x-auto">
          {STEPS.map((s, i) => {
            const done = stepIndex > i;
            const active = stepIndex === i;
            return (
              <div key={s.key} className="flex items-center shrink-0">
                <div className={cn("flex flex-col items-center gap-1.5 px-2", !active && !done && "opacity-50")}>
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                    done ? "bg-emerald-600 text-white" : active ? "bg-amber-600 text-white" : "bg-secondary text-muted-foreground")}>
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                  </div>
                  <span className={cn("text-[11px] font-medium whitespace-nowrap", active && "text-amber-700 font-bold")}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={cn("h-0.5 w-8 sm:w-16 mx-1", done ? "bg-emerald-600" : "bg-border")} />}
              </div>
            );
          })}
        </div>
      </Card>

      {step === "terms" && (
        <TermsGate termsSlug="teacher-terms" accent="gold" ctaLabel="أوافق وأبدأ التقديم" onAccepted={() => { setStep("personal"); scrollToTop(); }} />
      )}

      {step === "personal" && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><User className="h-5 w-5 text-amber-600" /> البيانات الشخصية</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الاسم بالعربية *"><Input value={form.fullNameAr} onChange={(e) => set("fullNameAr", arabicOnly(e.target.value))} placeholder="الاسم رباعي" maxLength={120} /></Field>
            <Field label="الاسم بالإنجليزية (اختياري)"><Input value={form.fullNameEn} onChange={(e) => set("fullNameEn", englishOnly(e.target.value))} dir="ltr" maxLength={120} /></Field>
            <Field label="تاريخ الميلاد *"><Input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} dir="ltr" /></Field>
            <Field label="الرقم القومي * (١٤ رقم)"><Input value={form.nationalId} onChange={(e) => set("nationalId", e.target.value.replace(/\D/g, "").slice(0, 14))} dir="ltr" className="nums" /></Field>
            <Field label="رقم الهاتف *" help="11 رقماً يبدأ بـ 01"><Input value={form.phone} onChange={(e) => set("phone", digitsOnly(e.target.value).slice(0, 11))} dir="ltr" inputMode="tel" maxLength={11} placeholder="01XXXXXXXXX" /></Field>
            <Field label="البريد الإلكتروني"><Input value={form.email} onChange={(e) => set("email", e.target.value)} dir="ltr" /></Field>
          </div>
          <Field label="النوع">
            <RadioGroup value={form.gender} onValueChange={(v) => set("gender", v)} className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="MALE" id="tg-m" /><Label htmlFor="tg-m">ذكر</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="FEMALE" id="tg-f" /><Label htmlFor="tg-f">أنثى</Label></div>
            </RadioGroup>
          </Field>
          <Field label="العنوان *"><Input value={form.addressAr} onChange={(e) => set("addressAr", e.target.value)} /></Field>
          <StepFooter onPrev={prev} onNext={next} />
        </Card>
      )}

      {step === "qualifications" && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><GraduationCap className="h-5 w-5 text-amber-600" /> المؤهلات والخبرات</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="المؤهل العلمي *">
              <Select value={form.qualification} onValueChange={(v) => set("qualification", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bachelor">بكالوريوس / ليسانس</SelectItem>
                  <SelectItem value="Master">ماجستير</SelectItem>
                  <SelectItem value="PhD">دكتوراه</SelectItem>
                  <SelectItem value="Other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="الجامعة *"><Input value={form.university} onChange={(e) => set("university", e.target.value)} /></Field>
            <Field label="سنة التخرج *"><Input type="number" value={form.graduationYear} onChange={(e) => set("graduationYear", Number(e.target.value))} dir="ltr" min={1970} max={new Date().getFullYear()} /></Field>
            <Field label="التخصص"><Input value={form.specialization} onChange={(e) => set("specialization", e.target.value)} placeholder="مثال: تربية لغة عربية" /></Field>
            <Field label="المواد الدراسية القادر على تدريسها *"><Input value={form.subjects} onChange={(e) => set("subjects", e.target.value)} placeholder="مثال: اللغة العربية، الدراسات الاجتماعية" /></Field>
            <Field label="سنوات الخبرة"><Input type="number" value={form.yearsOfExperience} onChange={(e) => set("yearsOfExperience", Number(e.target.value))} dir="ltr" min={0} /></Field>
            <Field label="جهة العمل الحالية"><Input value={form.currentEmployer} onChange={(e) => set("currentEmployer", e.target.value)} /></Field>
            <Field label="الوظيفة الحالية"><Input value={form.currentPosition} onChange={(e) => set("currentPosition", e.target.value)} /></Field>
          </div>
          <Field label="المحافظة المفضلة للعمل">
            <Select value={form.preferredGovernorateId || "none"} onValueChange={(v) => set("preferredGovernorateId", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="أي محافظة" /></SelectTrigger>
              <SelectContent className="max-h-72"><SelectItem value="none">أي محافظة</SelectItem>{governorates.map((g) => <SelectItem key={g.id} value={g.id}>{g.nameAr}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <label className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-accent/30">
            <Checkbox checked={form.hasTeachingCert} onCheckedChange={(v) => set("hasTeachingCert", v === true)} />
            <span className="text-sm">أحمل شهادة كفاءة تربوية / دبلوم تربوي</span>
          </label>
          <Field label="ملاحظات (اختياري)"><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} /></Field>
          <StepFooter onPrev={prev} onNext={next} nextLabel="مراجعة الطلب" />
        </Card>
      )}

      {step === "review" && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5 text-amber-600" /> مراجعة الطلب</h2>
          <div className="rounded-xl bg-secondary/30 p-4 text-sm space-y-3">
            <ReviewRow label="الاسم" value={form.fullNameAr} />
            <ReviewRow label="الرقم القومي" value={form.nationalId} mono />
            <ReviewRow label="الهاتف" value={form.phone} mono />
            <ReviewRow label="المؤهل" value={form.qualification} />
            <ReviewRow label="الجامعة" value={form.university} />
            <ReviewRow label="التخصص" value={form.specialization} />
            <ReviewRow label="المواد" value={form.subjects} />
            <ReviewRow label="سنوات الخبرة" value={String(form.yearsOfExperience)} mono />
            <ReviewRow label="المحافظة المفضلة" value={governorates.find((g) => g.id === form.preferredGovernorateId)?.nameAr || "أي محافظة"} />
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>لقد وافقت على الشروط والأحكام. بتأكيدك سيتم إرسال الطلب.</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={prev} className="flex-1 h-11"><ArrowRight className="ml-2 h-4 w-4" /> السابق</Button>
            <Button onClick={submit} disabled={submitting} className="flex-1 h-11 bg-amber-600 hover:bg-amber-600/90 text-white">
              {submitting ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ الإرسال...</> : <><CheckCircle2 className="ml-2 h-4 w-4" /> تأكيد وإرسال الطلب</>}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>);
}
function StepFooter({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex gap-2 pt-2">
      <Button variant="outline" onClick={onPrev} className="flex-1 h-11"><ArrowRight className="ml-2 h-4 w-4" /> السابق</Button>
      <Button onClick={onNext} className="flex-1 h-11 bg-amber-600 hover:bg-amber-600/90 text-white">التالي <ArrowLeft className="mr-2 h-4 w-4" /></Button>
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
