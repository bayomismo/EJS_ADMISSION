"use client";

import { useState } from "react";
import { Search, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { digitsOnly } from "@/lib/validators";
import { toArabicDigits } from "@/lib/arabic";

interface StatusResult {
  referenceNo: string;
  status: string;
  statusLabel: string;
  submittedAt: string;
  updatedAt: string;
  statusNote: string | null;
  applicantName: string;
  schoolName: string | null;
  gradeName: string | null;
}

const STATUS_META: Record<string, { icon: any; cls: string; bgCls: string }> = {
  PENDING: { icon: Clock, cls: "text-amber-700", bgCls: "bg-amber-100" },
  REVIEW: { icon: FileText, cls: "text-blue-700", bgCls: "bg-blue-100" },
  ACCEPTED: { icon: CheckCircle2, cls: "text-emerald-700", bgCls: "bg-emerald-100" },
  REJECTED: { icon: XCircle, cls: "text-rose-700", bgCls: "bg-rose-100" },
  WAITLIST: { icon: Clock, cls: "text-indigo-700", bgCls: "bg-indigo-100" },
};

export function StatusCheckForm() {
  const [type, setType] = useState<"students" | "teachers">("students");
  const [referenceNo, setReferenceNo] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StatusResult | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!referenceNo.trim()) {
      setError("الرجاء إدخال الرقم المرجعي");
      return;
    }
    if (nationalId.length !== 14) {
      setError("الرقم القومي يجب أن يكون ١٤ رقماً");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ type, referenceNo: referenceNo.trim(), nationalId });
      const res = await fetch(`/api/public/applications/status?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "حدث خطأ غير متوقع");
        return;
      }
      setResult(data);
    } catch (e: any) {
      setError(e.message || "حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <Tabs value={type} onValueChange={(v) => { setType(v as any); setResult(null); setError(null); }}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="students">طلب طالب</TabsTrigger>
            <TabsTrigger value="teachers">طلب معلم</TabsTrigger>
          </TabsList>

          <form onSubmit={check} className="space-y-4">
            <TabsContent value="students" className="m-0">
              <p className="text-xs text-muted-foreground">تقديم لطالب في إحدى المدارس المصرية اليابانية</p>
            </TabsContent>
            <TabsContent value="teachers" className="m-0">
              <p className="text-xs text-muted-foreground">تقديم للعمل كمعلم في المدارس المصرية اليابانية</p>
            </TabsContent>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">
                الرقم المرجعي <span className="text-rose-600">*</span>
              </label>
              <Input
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value.toUpperCase())}
                placeholder="EJS-S-2027-000001-AB12"
                dir="ltr"
                className="nums"
              />
              <p className="text-[11px] text-muted-foreground">يبدأ بـ EJS-S- للطلاب أو EJS-T- للمعلمين</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">
                الرقم القومي <span className="text-rose-600">*</span>
              </label>
              <Input
                value={nationalId}
                onChange={(e) => setNationalId(digitsOnly(e.target.value).slice(0, 14))}
                placeholder="14 رقم"
                dir="ltr"
                inputMode="numeric"
                maxLength={14}
                className="nums"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? (
                <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري البحث...</>
              ) : (
                <><Search className="ml-2 h-4 w-4" /> تحقق من الحالة</>
              )}
            </Button>
          </form>
        </Tabs>
      </Card>

      {error && (
        <Card className="p-5 border-2 border-rose-200 bg-rose-50">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-rose-700 mb-1">تعذّر العثور على الطلب</h3>
              <p className="text-sm text-rose-600">{error}</p>
              <p className="text-xs text-rose-500 mt-2">تأكد من الرقم المرجعي والرقم القومي، أو تواصل مع الإدارة.</p>
            </div>
          </div>
        </Card>
      )}

      {result && (() => {
        const meta = STATUS_META[result.status] || STATUS_META.PENDING;
        const Icon = meta.icon;
        return (
          <Card className="p-6 border-2 border-primary/20">
            <div className="flex items-start gap-3 mb-4">
              <span className={cn("inline-flex h-12 w-12 items-center justify-center rounded-2xl", meta.bgCls)}>
                <Icon className={cn("h-6 w-6", meta.cls)} />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className={cn(meta.bgCls, meta.cls, "border-0 font-bold")}>{result.statusLabel}</Badge>
                  <span className="text-xs text-muted-foreground nums">{result.referenceNo}</span>
                </div>
                <h3 className="text-lg font-bold">{result.applicantName}</h3>
                {result.schoolName && (
                  <p className="text-sm text-muted-foreground">
                    {result.schoolName}{result.gradeName ? ` — ${result.gradeName}` : ""}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-sm border-t pt-4">
              <div>
                <span className="text-xs text-muted-foreground block">تاريخ التقديم</span>
                <span className="font-medium nums">{toArabicDigits(new Date(result.submittedAt).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }))}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">آخر تحديث</span>
                <span className="font-medium nums">{toArabicDigits(new Date(result.updatedAt).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }))}</span>
              </div>
            </div>

            {result.statusNote && (
              <div className="mt-4 rounded-lg bg-secondary/40 p-3 text-sm">
                <span className="text-xs font-bold text-muted-foreground block mb-1">ملاحظة من الإدارة</span>
                <p>{result.statusNote}</p>
              </div>
            )}

            {result.status === "ACCEPTED" && (
              <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>تهانينا! تم قبول طلبك. يرجى متابعة المدرسة لإجراءات التسجيل.</span>
              </div>
            )}
            {result.status === "REJECTED" && (
              <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>تم رفض الطلب. إذا كنت تعتقد أن هناك خطأ، يرجى التواصل مع الإدارة.</span>
              </div>
            )}
            {(result.status === "PENDING" || result.status === "REVIEW" || result.status === "WAITLIST") && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
                <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                <span>طلبك قيد المعالجة. سيتم تحديث الحالة تلقائياً عند أي تغيير.</span>
              </div>
            )}
          </Card>
        );
      })()}
    </div>
  );
}