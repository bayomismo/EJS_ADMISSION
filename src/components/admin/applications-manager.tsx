"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Pencil, Trash2, Loader2, X, Eye, GraduationCap, Users,
  Filter, ChevronRight, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { toArabicNumber, toArabicDigits } from "@/lib/arabic";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "قيد الانتظار", cls: "bg-amber-100 text-amber-700" },
  REVIEW: { label: "قيد المراجعة", cls: "bg-blue-100 text-blue-700" },
  ACCEPTED: { label: "مقبول", cls: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "مرفوض", cls: "bg-rose-100 text-rose-700" },
  WAITLIST: { label: "قائمة انتظار", cls: "bg-indigo-100 text-indigo-700" },
};

interface App {
  id: string; referenceNo: string;
  studentNameAr?: string; fullNameAr?: string;
  guardianName?: string; guardianPhone?: string; phone?: string; email?: string;
  birthDate?: string; gender?: string; nationalId?: string; addressAr?: string;
  subjects?: string; specialization?: string; qualification?: string; university?: string;
  yearsOfExperience?: number; preferredGovernorate?: { nameAr: string };
  school?: { nameAr: string; code: string }; grade?: { nameAr: string };
  governorate?: { nameAr: string }; city?: { nameAr: string };
  status: string; statusNote?: string | null; submittedAt: string; notes?: string | null;
}

export function ApplicationsManager({ type }: { type: "students" | "teachers" }) {
  const isStudent = type === "students";
  const [items, setItems] = useState<App[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<App | null>(null);
  const [viewing, setViewing] = useState<App | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/applications/${type}?${params}`);
    const data = await res.json();
    setItems(data.items || []); setTotal(data.total || 0); setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [type, q, statusFilter, page]);

  useEffect(() => { load(); }, [load]);
  function setQReset(v: string) { setQ(v); setPage(1); }
  function setStatusReset(v: string) { setStatusFilter(v); setPage(1); }

  function openEdit(a: App) {
    setEditing(a);
    setForm({
      status: a.status,
      statusNote: a.statusNote || "",
      notes: a.notes || "",
      ...(isStudent ? {
        studentNameAr: a.studentNameAr, guardianName: a.guardianName,
        guardianPhone: a.guardianPhone, guardianEmail: a.email, addressAr: a.addressAr,
      } : {
        fullNameAr: a.fullNameAr, phone: a.phone, email: a.email, addressAr: a.addressAr,
        subjects: a.subjects, specialization: a.specialization,
      }),
    });
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/applications/${type}/${editing!.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("تم تحديث الطلب");
      setEditing(null); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع.")) return;
    const res = await fetch(`/api/admin/applications/${type}/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("فشل الحذف");
    toast.success("تم حذف الطلب"); load();
  }

  const accent = isStudent ? "crimson" : "amber";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            {isStudent ? <GraduationCap className="h-6 w-6 text-crimson" /> : <Users className="h-6 w-6 text-amber-600" />}
            طلبات {isStudent ? "الطلاب" : "المعلمين"}
          </h1>
          <p className="text-sm text-muted-foreground">{toArabicNumber(total)} طلب — يمكن التعديل والحذف</p>
        </div>
      </div>

      <Card className="mb-4 p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQReset(e.target.value)} placeholder="بحث بالاسم، الرقم المرجعي، الهاتف..." className="pr-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusReset}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/40">
              <tr>
                <th className="p-3 text-right font-medium text-muted-foreground">الرقم المرجعي</th>
                <th className="p-3 text-right font-medium text-muted-foreground">الاسم</th>
                <th className="p-3 text-right font-medium text-muted-foreground hidden md:table-cell">{isStudent ? "المدرسة" : "التخصص"}</th>
                <th className="p-3 text-right font-medium text-muted-foreground hidden lg:table-cell">{isStudent ? "ولي الأمر" : "الهاتف"}</th>
                <th className="p-3 text-right font-medium text-muted-foreground">الحالة</th>
                <th className="p-3 text-right font-medium text-muted-foreground hidden sm:table-cell">التاريخ</th>
                <th className="p-3 text-left font-medium text-muted-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={7} className="p-4"><div className="h-10 animate-pulse rounded bg-muted" /></td></tr>) :
                items.length === 0 ? <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">لا توجد طلبات مطابقة</td></tr> :
                items.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-accent/30">
                    <td className="p-3"><span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-bold nums">{a.referenceNo}</span></td>
                    <td className="p-3 font-medium">{a.studentNameAr || a.fullNameAr}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">{isStudent ? a.school?.nameAr : a.subjects}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs nums">{isStudent ? a.guardianPhone : a.phone}</td>
                    <td className="p-3"><Badge variant="outline" className={cn("text-[10px]", statusLabels[a.status]?.cls)}>{statusLabels[a.status]?.label || a.status}</Badge></td>
                    <td className="p-3 hidden sm:table-cell text-xs text-muted-foreground nums">{toArabicDigits(new Date(a.submittedAt).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }))}</td>
                    <td className="p-3 text-left">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewing(a)} title="عرض"><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)} title="تعديل"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => del(a.id)} title="حذف"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-3">
            <span className="text-xs text-muted-foreground nums">صفحة {toArabicNumber(page)} من {toArabicNumber(totalPages)}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronRight className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronLeft className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </Card>

      {/* View drawer */}
      {viewing && (
        <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
          <SheetContent side="left" className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>تفاصيل الطلب {isStudent ? "(طالب)" : "(معلم)"}</SheetTitle>
              <SheetDescription className="nums">{viewing.referenceNo}</SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-2 text-sm">
              <DetailRow label="الاسم" value={viewing.studentNameAr || viewing.fullNameAr} />
              <DetailRow label="الرقم القومي" value={viewing.nationalId} mono />
              <DetailRow label="تاريخ الميلاد" value={viewing.birthDate} mono />
              <DetailRow label="النوع" value={viewing.gender === "MALE" ? "ذكر" : viewing.gender === "FEMALE" ? "أنثى" : "—"} />
              <DetailRow label="العنوان" value={viewing.addressAr} />
              {isStudent ? (
                <>
                  <DetailRow label="ولي الأمر" value={viewing.guardianName} />
                  <DetailRow label="هاتف ولي الأمر" value={viewing.guardianPhone} mono />
                  <DetailRow label="المحافظة" value={viewing.governorate?.nameAr} />
                  <DetailRow label="المدينة" value={viewing.city?.nameAr} />
                  <DetailRow label="المدرسة" value={viewing.school?.nameAr} />
                  <DetailRow label="المرحلة" value={viewing.grade?.nameAr} />
                </>
              ) : (
                <>
                  <DetailRow label="الهاتف" value={viewing.phone} mono />
                  <DetailRow label="البريد" value={viewing.email} mono />
                  <DetailRow label="المؤهل" value={viewing.qualification} />
                  <DetailRow label="الجامعة" value={viewing.university} />
                  <DetailRow label="التخصص" value={viewing.specialization} />
                  <DetailRow label="المواد" value={viewing.subjects} />
                  <DetailRow label="سنوات الخبرة" value={String(viewing.yearsOfExperience || 0)} mono />
                  <DetailRow label="المحافظة المفضلة" value={viewing.preferredGovernorate?.nameAr} />
                </>
              )}
              <div className="pt-2 border-t">
                <span className="text-xs text-muted-foreground">الحالة</span>
                <div className="mt-1"><Badge variant="outline" className={statusLabels[viewing.status]?.cls}>{statusLabels[viewing.status]?.label || viewing.status}</Badge></div>
              </div>
              {viewing.statusNote && <div><span className="text-xs text-muted-foreground">ملاحظة الحالة</span><p className="mt-1">{viewing.statusNote}</p></div>}
              {viewing.notes && <div><span className="text-xs text-muted-foreground">ملاحظات</span><p className="mt-1">{viewing.notes}</p></div>}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Edit drawer */}
      {editing && (
        <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <SheetContent side="left" className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>تعديل الطلب</SheetTitle>
              <SheetDescription className="nums">{editing.referenceNo}</SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {isStudent ? (
                <>
                  <div className="space-y-1.5"><Label>اسم الطالب</Label><Input value={form.studentNameAr} onChange={(e) => setForm({ ...form, studentNameAr: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>ولي الأمر</Label><Input value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>هاتف ولي الأمر</Label><Input value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} dir="ltr" /></div>
                  <div className="space-y-1.5"><Label>العنوان</Label><Textarea value={form.addressAr} onChange={(e) => setForm({ ...form, addressAr: e.target.value })} rows={2} /></div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5"><Label>الاسم</Label><Input value={form.fullNameAr} onChange={(e) => setForm({ ...form, fullNameAr: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" /></div>
                  <div className="space-y-1.5"><Label>المواد الدراسية</Label><Input value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>العنوان</Label><Textarea value={form.addressAr} onChange={(e) => setForm({ ...form, addressAr: e.target.value })} rows={2} /></div>
                </>
              )}
              <div className="space-y-1.5"><Label>ملاحظة الحالة (داخلية)</Label><Textarea value={form.statusNote} onChange={(e) => setForm({ ...form, statusNote: e.target.value })} rows={2} /></div>
              <div className="space-y-1.5"><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            </div>
            <SheetFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button>
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}حفظ التعديلات</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-2">
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
      <span className={cn("font-medium text-left text-sm", mono && "nums")} dir={mono ? "ltr" : "rtl"}>{value || "—"}</span>
    </div>
  );
}
