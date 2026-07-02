"use client";

import {
  Plus, Search, Download, Upload, MoreHorizontal, Pencil, Trash2,
  Star, Archive, Power, Loader2, X, FileSpreadsheet, CheckCircle2,
  AlertCircle, Building2, MapPin, Phone, FileText, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { toArabicNumber } from "@/lib/arabic";
import { cn } from "@/lib/utils";
import { Field, FormSection } from "@/components/admin/field";
import { parseFieldErrors, extractErrorMessage, focusFirstError } from "@/lib/form-errors";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Gov { id: string; nameAr: string; }
interface City { id: string; nameAr: string; governorateId: string; }
interface School {
  id: string; code: string; nameAr: string; nameEn: string | null;
  type: string; gender: string; capacity: number | null;
  isFeatured: boolean; isActive: boolean; isArchived: boolean;
  governorate: { nameAr: string }; city: { nameAr: string };
}

export function SchoolsManager({ governorates, cities, facilities, grades }: {
  governorates: Gov[];
  cities: City[];
  facilities: { id: string; nameAr: string }[];
  grades: { id: string; nameAr: string }[];
}) {
  const [items, setItems] = useState<School[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [govFilter, setGovFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorErrors, setEditorErrors] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<School | null>(null);
  const [saving, setSaving] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (govFilter !== "all") params.set("governorateId", govFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("page", String(page));
    params.set("pageSize", "15");
    try {
      const res = await fetch(`/api/admin/schools?${params}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }, [q, govFilter, statusFilter, page]);

  useEffect(() => {
    const t = setTimeout(fetchList, 250);
    return () => clearTimeout(t);
  }, [fetchList]);

  // reset page when filters change
  function setQAndReset(v: string) { setQ(v); setPage(1); }
  function setGovFilterAndReset(v: string) { setGovFilter(v); setPage(1); }
  function setStatusFilterAndReset(v: string) { setStatusFilter(v); setPage(1); }

  const filteredCities = editing
    ? cities.filter((c) => c.governorateId === (editing as any).governorateId)
    : cities;

  function openCreate() {
    setEditing({
      id: "", code: "", nameAr: "", nameEn: "", type: "ARABIC", gender: "MIXED",
      capacity: null, isFeatured: false, isActive: true, isArchived: false,
      governorate: { nameAr: "" }, city: { nameAr: "" },
    } as any);
    setEditorOpen(true);
    setEditorErrors({});
  }

  async function openEdit(s: School) {
    const res = await fetch(`/api/admin/schools/${s.id}`);
    const data = await res.json();
    setEditing({ ...s, ...data });
    setEditorOpen(true);
    setEditorErrors({});
  }

  async function saveSchool(payload: any) {
    setSaving(true);
    try {
      const isEdit = !!editing?.id;
      const res = await fetch(`/api/admin/schools${isEdit ? `/${editing!.id}` : ""}`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fieldErrors = parseFieldErrors(data);
        setEditorErrors(fieldErrors);
        const firstError = Object.values(fieldErrors)[0];
        toast.error(firstError || data.error || "فشل الحفظ");
        return;
      }
      toast.success(isEdit ? "تم تحديث المدرسة" : "تمت إضافة المدرسة");
      setEditorOpen(false);
      setEditing(null);
      setEditorErrors({});
      fetchList();
    } catch (e: any) {
      toast.error(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function bulkAction(action: string) {
    if (selected.size === 0) return;
    try {
      const res = await fetch("/api/admin/schools/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`تم تنفيذ الإجراء على ${data.count} مدرسة`);
      setSelected(new Set());
      fetchList();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleExport() {
    toast.info("جارٍ تصدير المدارس...");
    const res = await fetch("/api/admin/schools/export");
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ejs-schools-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تصدير المدارس");
    }
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/schools/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImportData(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setImporting(false);
    }
  }

  async function confirmImport() {
    if (!importData) return;
    setImporting(true);
    try {
      const validRows = importData.rows.filter((r: any) => r.errors.length === 0).map((r: any) => ({
        code: r.code, nameAr: r.nameAr, nameEn: r.nameEn,
        governorateId: r.resolved.governorateId, cityId: r.resolved.cityId,
        type: r.type, gender: r.gender, address: r.address, capacity: r.capacity,
      }));
      const res = await fetch("/api/admin/schools/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validRows),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`تم استيراد ${data.count} مدرسة بنجاح`);
      setImportOpen(false);
      setImportData(null);
      fetchList();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setImporting(false);
    }
  }

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">إدارة المدارس</h1>
          <p className="text-sm text-muted-foreground">إجمالي <span className="nums font-bold">{toArabicNumber(total)}</span> مدرسة</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => { setImportOpen(true); setImportData(null); }}>
            <Upload className="ml-1.5 h-4 w-4" /> استيراد
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="ml-1.5 h-4 w-4" /> تصدير
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="ml-1.5 h-4 w-4" /> مدرسة جديدة
          </Button>
        </div>
      </div>

      {/* filters */}
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQAndReset(e.target.value)} placeholder="بحث بالاسم أو الكود..." className="pr-9" />
          </div>
          <Select value={govFilter} onValueChange={setGovFilterAndReset}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="كل المحافظات" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">كل المحافظات</SelectItem>
              {governorates.map((g) => <SelectItem key={g.id} value={g.id}>{g.nameAr}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilterAndReset}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشطة</SelectItem>
              <SelectItem value="inactive">غير نشطة</SelectItem>
              <SelectItem value="archived">مؤرشفة</SelectItem>
              <SelectItem value="featured">مميزة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* bulk bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <span className="text-sm font-medium">تم تحديد <span className="nums">{toArabicNumber(selected.size)}</span> مدرسة</span>
          <div className="flex flex-wrap gap-1.5 mr-auto">
            <Button size="sm" variant="outline" onClick={() => bulkAction("activate")}><Power className="ml-1 h-3.5 w-3.5" /> تفعيل</Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("deactivate")}>إيقاف</Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("feature")}><Star className="ml-1 h-3.5 w-3.5" /> تمييز</Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("archive")}><Archive className="ml-1 h-3.5 w-3.5" /> أرشفة</Button>
            <Button size="sm" variant="destructive" onClick={() => bulkAction("delete")}><Trash2 className="ml-1 h-3.5 w-3.5" /> حذف</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="ml-1 h-3.5 w-3.5" /> إلغاء</Button>
          </div>
        </div>
      )}

      {/* table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40">
              <tr>
                <th className="p-3"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></th>
                <th className="p-3 text-right font-medium text-muted-foreground">الكود</th>
                <th className="p-3 text-right font-medium text-muted-foreground">اسم المدرسة</th>
                <th className="p-3 text-right font-medium text-muted-foreground hidden md:table-cell">المحافظة</th>
                <th className="p-3 text-right font-medium text-muted-foreground hidden lg:table-cell">النوع</th>
                <th className="p-3 text-right font-medium text-muted-foreground hidden lg:table-cell">الحالة</th>
                <th className="p-3 text-left font-medium text-muted-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={7} className="p-4"><div className="h-10 animate-pulse rounded bg-muted" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">لا توجد مدارس مطابقة</td></tr>
              ) : items.map((s) => (
                <tr key={s.id} className="border-b border-border hover:bg-accent/30">
                  <td className="p-3"><Checkbox checked={selected.has(s.id)} onCheckedChange={(v) => {
                    const next = new Set(selected);
                    if (v) next.add(s.id); else next.delete(s.id);
                    setSelected(next);
                  }} /></td>
                  <td className="p-3"><span className="rounded-md bg-secondary px-2 py-1 text-xs font-bold nums">{s.code}</span></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium line-clamp-1">{s.nameAr}</span>
                      {s.isFeatured && <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500 shrink-0" />}
                    </div>
                    <div className="text-xs text-muted-foreground md:hidden">{s.governorate.nameAr} — {s.city.nameAr}</div>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{s.governorate.nameAr} — {s.city.nameAr}</td>
                  <td className="p-3 hidden lg:table-cell">
                    <Badge variant="outline" className="text-[10px]">{s.type === "ARABIC" ? "عربي" : "لغات"}</Badge>
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    {s.isArchived ? <Badge variant="secondary" className="text-[10px]">مؤرشفة</Badge>
                      : s.isActive ? <Badge className="bg-emerald-600 text-[10px]">نشطة</Badge>
                      : <Badge variant="secondary" className="text-[10px]">متوقفة</Badge>}
                  </td>
                  <td className="p-3 text-left">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(s)}><Pencil className="ml-2 h-4 w-4" /> تعديل</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => bulkActionSingle(s.id, s.isFeatured ? "unfeature" : "feature")}>
                          <Star className="ml-2 h-4 w-4" /> {s.isFeatured ? "إلغاء التمييز" : "تمييز"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => bulkActionSingle(s.id, s.isActive ? "deactivate" : "activate")}>
                          <Power className="ml-2 h-4 w-4" /> {s.isActive ? "إيقاف" : "تفعيل"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-rose-600" onClick={() => bulkActionSingle(s.id, "delete")}>
                          <Trash2 className="ml-2 h-4 w-4" /> حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border p-3">
            <span className="text-xs text-muted-foreground">صفحة <span className="nums">{toArabicNumber(page)}</span> من <span className="nums">{toArabicNumber(totalPages)}</span></span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>السابق</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>التالي</Button>
            </div>
          </div>
        )}
      </Card>

      {/* editor drawer */}
      {editing && (
        <SchoolEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          school={editing}
          governorates={governorates}
          cities={filteredCities}
          allCities={cities}
          facilities={facilities}
          grades={grades}
          saving={saving}
          onSave={saveSchool}
          errors={editorErrors}
          onErrorsChange={setEditorErrors}
        />
      )}

      {/* import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" /> استيراد مدارس من Excel</DialogTitle>
          </DialogHeader>
          {!importData ? (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
                <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="mb-2 font-medium">اسحب ملف Excel هنا أو اضغط للاختيار</p>
                <p className="mb-4 text-xs text-muted-foreground">يدعم صيغ .xlsx و .xls — يجب أن يحتوي على أعمدة: الكود، الاسم بالعربية، المحافظة، المدينة، النوع</p>
                <input
                  type="file" accept=".xlsx,.xls" className="hidden" id="import-file"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
                />
                <Button asChild disabled={importing}>
                  <label htmlFor="import-file" className="cursor-pointer">
                    {importing ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ التحليل...</> : "اختر ملف"}
                  </label>
                </Button>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">الأعمدة المتوقعة:</p>
                <p>الكود، الاسم بالعربية، الاسم بالإنجليزية، المحافظة، المدينة، النوع (عربي/لغات)، النوع (بنين/بنات)، العنوان، السعة</p>
                <Button variant="link" size="sm" className="h-auto p-0 mt-1" onClick={handleExport}>تحميل قالب فارغ</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Stat label="إجمالي الصفوف" value={importData.total} color="text-foreground" />
                <Stat label="صحيح" value={importData.valid} color="text-emerald-600" />
                <Stat label="أخطاء" value={importData.errorCount} color="text-rose-600" />
              </div>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-secondary">
                    <tr>
                      <th className="p-2 text-right">الصف</th>
                      <th className="p-2 text-right">الكود</th>
                      <th className="p-2 text-right">الاسم</th>
                      <th className="p-2 text-right">المحافظة/المدينة</th>
                      <th className="p-2 text-right">الأخطاء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.rows.map((r: any) => (
                      <tr key={r.rowIndex} className={cn("border-t border-border", r.errors.length > 0 && "bg-rose-50")}>
                        <td className="p-2 nums">{toArabicNumber(r.rowIndex)}</td>
                        <td className="p-2 nums">{r.code}</td>
                        <td className="p-2">{r.nameAr}</td>
                        <td className="p-2 text-muted-foreground">{r.governorate} — {r.city}</td>
                        <td className="p-2">
                          {r.errors.length > 0 ? (
                            <span className="text-rose-600">{r.errors.join("، ")}</span>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importData.canImport ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> جميع الصفوف صالحة. جاهز للاستيراد.
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> يوجد {importData.errorCount} صف به أخطاء. صححها ثم أعد رفع الملف، أو ستُستورد الصفوف الصالحة فقط.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportData(null); }}>إلغاء</Button>
            {importData?.valid > 0 && (
              <Button onClick={confirmImport} disabled={importing}>
                {importing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                استيراد {importData.valid} مدرسة
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  async function bulkActionSingle(id: string, action: string) {
    try {
      const res = await fetch("/api/admin/schools/bulk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("تم تنفيذ الإجراء");
      fetchList();
    } catch (e: any) { toast.error(e.message); }
  }
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
      <div className={cn("text-2xl font-extrabold nums", color)}>{toArabicNumber(value)}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function SchoolEditor({ open, onOpenChange, school, governorates, cities, allCities, facilities, grades, saving, onSave, errors = {}, onErrorsChange }: any) {
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>(errors || {});
  useEffect(() => { setFieldErrors(errors || {}); }, [errors]);
  function clearError(k: string) {
    setFieldErrors((p) => { const next = { ...p }; delete next[k]; return next; });
    onErrorsChange?.(next);
  }
  useEffect(() => {
    if (Object.keys(fieldErrors).length > 0) focusFirstError(formRef.current);
  }, [fieldErrors]);

  const [form, setForm] = useState<any>(() => ({
    code: school.code || "",
    nameAr: school.nameAr || "",
    nameEn: school.nameEn || "",
    governorateId: school.governorateId || "",
    cityId: school.cityId || "",
    type: school.type || "ARABIC",
    gender: school.gender || "MIXED",
    addressAr: school.addressAr || "",
    phone: school.phone || "",
    email: school.email || "",
    capacity: school.capacity || "",
    applicationUrl: school.applicationUrl || "",
    descriptionAr: school.descriptionAr || "",
    lat: school.lat || "",
    lng: school.lng || "",
    isFeatured: school.isFeatured ?? false,
    isActive: school.isActive ?? true,
    isArchived: school.isArchived ?? false,
    sortOrder: school.sortOrder ?? 0,
    facilityIds: (school.facilities || []).map((f: any) => f.facilityId),
    gradeIds: (school.grades || []).map((g: any) => g.gradeId),
  }));

  const isEdit = !!school.id;
  const availableCities = allCities.filter((c: City) => c.governorateId === form.governorateId);

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    onErrorsChange?.({});
    const payload = {
      ...form,
      capacity: form.capacity ? Number(form.capacity) : null,
      lat: form.lat ? Number(form.lat) : null,
      lng: form.lng ? Number(form.lng) : null,
      sortOrder: Number(form.sortOrder) || 0,
    };
    onSave(payload);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[95vw] max-w-2xl overflow-y-auto" side="left">
        <SheetHeader>
          <SheetTitle>{isEdit ? "تعديل مدرسة" : "إضافة مدرسة جديدة"}</SheetTitle>
          <SheetDescription>أدخل بيانات المدرسة بدقة. الحقول المطلوبة مميزة بـ *</SheetDescription>
        </SheetHeader>
        <form ref={formRef} onSubmit={submit} noValidate className="space-y-6 py-4">
          {/* basic */}
          <FormSection title="البيانات الأساسية" description="المعلومات التعريفية للمدرسة" icon={Settings2}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="كود المدرسة *" htmlFor="school-code" error={fieldErrors.code} help="حروف إنجليزية كبيرة وأرقام وشرطات فقط">
                <Input id="school-code" value={form.code} onChange={(e) => { set("code", e.target.value.replace(/\s+/g, "-").toUpperCase()); clearError("code"); }} required className="nums" maxLength={50} />
              </Field>
              <Field label="النوع" htmlFor="school-type">
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger id="school-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARABIC">عربي</SelectItem>
                    <SelectItem value="LANGUAGES">لغات</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="الاسم بالعربية *" htmlFor="school-nameAr" error={fieldErrors.nameAr}>
              <Input id="school-nameAr" value={form.nameAr} onChange={(e) => { set("nameAr", e.target.value); clearError("nameAr"); }} required />
            </Field>
            <Field label="الاسم بالإنجليزية" htmlFor="school-nameEn" error={fieldErrors.nameEn} help="اختياري - يُستخدم في السجلات الإنجليزية">
              <Input id="school-nameEn" value={form.nameEn} onChange={(e) => { set("nameEn", e.target.value); clearError("nameEn"); }} dir="ltr" />
            </Field>
            <Field label="النوع (بنين/بنات/مختلط)" htmlFor="school-gender" error={fieldErrors.gender}>
              <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger id="school-gender"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MIXED">مختلط</SelectItem>
                  <SelectItem value="MALE">بنين</SelectItem>
                  <SelectItem value="FEMALE">بنات</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FormSection>

          {/* location */}
          <FormSection title="الموقع" description="المحافظة والمدينة والعنوان الجغرافي" icon={MapPin}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="المحافظة *" htmlFor="school-gov" error={fieldErrors.governorateId}>
                <Select value={form.governorateId} onValueChange={(v) => { set("governorateId", v); set("cityId", ""); clearError("governorateId"); clearError("cityId"); }}>
                  <SelectTrigger id="school-gov"><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {governorates.map((g: Gov) => <SelectItem key={g.id} value={g.id}>{g.nameAr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="المدينة / الإدارة *" htmlFor="school-city" error={fieldErrors.cityId}>
                <Select value={form.cityId} onValueChange={(v) => { set("cityId", v); clearError("cityId"); }} disabled={!form.governorateId}>
                  <SelectTrigger id="school-city"><SelectValue placeholder={form.governorateId ? "اختر المدينة" : "اختر المحافظة أولاً"} /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {availableCities.map((c: City) => <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="العنوان" htmlFor="school-addr" error={fieldErrors.addressAr}>
              <Input id="school-addr" value={form.addressAr} onChange={(e) => { set("addressAr", e.target.value); clearError("addressAr"); }} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="خط العرض (Lat)" htmlFor="school-lat" error={fieldErrors.lat} help="رقم بين -90 و 90">
                <Input id="school-lat" value={form.lat} onChange={(e) => { set("lat", e.target.value); clearError("lat"); }} type="number" step="any" dir="ltr" />
              </Field>
              <Field label="خط الطول (Lng)" htmlFor="school-lng" error={fieldErrors.lng} help="رقم بين -180 و 180">
                <Input id="school-lng" value={form.lng} onChange={(e) => { set("lng", e.target.value); clearError("lng"); }} type="number" step="any" dir="ltr" />
              </Field>
            </div>
          </FormSection>

          {/* contact + capacity */}
          <FormSection title="التواصل والسعة" description="بيانات الاتصال والسعة الاستيعابية" icon={Phone}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="الهاتف" htmlFor="school-phone" error={fieldErrors.phone} help="11 رقماً يبدأ بـ 01">
                <Input id="school-phone" value={form.phone} onChange={(e) => { set("phone", e.target.value); clearError("phone"); }} dir="ltr" inputMode="tel" maxLength={11} />
              </Field>
              <Field label="البريد" htmlFor="school-email" error={fieldErrors.email}>
                <Input id="school-email" type="email" value={form.email} onChange={(e) => { set("email", e.target.value); clearError("email"); }} dir="ltr" />
              </Field>
              <Field label="السعة" htmlFor="school-capacity" error={fieldErrors.capacity}>
                <Input id="school-capacity" value={form.capacity} onChange={(e) => { set("capacity", e.target.value); clearError("capacity"); }} type="number" dir="ltr" />
              </Field>
            </div>
            <Field label="رابط التقديم الخارجي" htmlFor="school-url" error={fieldErrors.applicationUrl} help="اتركه فارغاً لاستخدام رابط البوابة العامة">
              <Input id="school-url" value={form.applicationUrl} onChange={(e) => { set("applicationUrl", e.target.value); clearError("applicationUrl"); }} dir="ltr" placeholder="https://ejs-admission.vercel.app/admission/students" />
            </Field>
          </FormSection>

          {/* facilities + grades */}
          <FormSection title="المرافق والمراحل" description="اختر ما ينطبق على هذه المدرسة" icon={Building2} count={form.facilityIds.length + form.gradeIds.length}>
            <Field label="المرافق" error={fieldErrors.facilityIds}>
              <div className="flex flex-wrap gap-2">
                {facilities.map((f: any) => {
                  const checked = form.facilityIds.includes(f.id);
                  return (
                    <button type="button" key={f.id} onClick={() => {
                      set("facilityIds", checked ? form.facilityIds.filter((x: string) => x !== f.id) : [...form.facilityIds, f.id]);
                    }} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", checked ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-accent")}>
                      {f.nameAr}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="المراحل الدراسية" error={fieldErrors.gradeIds}>
              <div className="flex flex-wrap gap-2">
                {grades.map((g: any) => {
                  const checked = form.gradeIds.includes(g.id);
                  return (
                    <button type="button" key={g.id} onClick={() => {
                      set("gradeIds", checked ? form.gradeIds.filter((x: string) => x !== g.id) : [...form.gradeIds, g.id]);
                    }} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", checked ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-accent")}>
                      {g.nameAr}
                    </button>
                  );
                })}
              </div>
            </Field>
          </FormSection>

          {/* description */}
          <FormSection title="الوصف" description="معلومات إضافية تظهر في صفحة المدرسة العامة" icon={FileText}>
            <Field label="الوصف" htmlFor="school-desc" error={fieldErrors.descriptionAr}>
              <Textarea id="school-desc" value={form.descriptionAr} onChange={(e) => { set("descriptionAr", e.target.value); clearError("descriptionAr"); }} rows={3} maxLength={1000} />
            </Field>
          </FormSection>

          {/* toggles */}
          <div className="grid grid-cols-2 gap-3">
            <ToggleRow label="مدرسة مميزة" checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} />
            <ToggleRow label="نشطة" checked={form.isActive} onChange={(v) => set("isActive", v)} />
          </div>

          <SheetFooter className="sticky bottom-0 -mx-6 mt-6 flex flex-row items-center justify-between gap-3 border-t border-border bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <p className="text-[11px] text-muted-foreground">
              {Object.keys(fieldErrors).length > 0 ? (
                <span className="font-bold text-rose-600">يوجد {Object.keys(fieldErrors).length} حقل يحتاج لتصحيح</span>
              ) : (
                <>الحقول المعلّمة بـ <span className="text-rose-600 font-bold">*</span> إلزامية</>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => { onOpenChange(false); setFieldErrors({}); onErrorsChange?.({}); }} disabled={saving}>إلغاء</Button>
              <Button type="submit" disabled={saving} className="min-w-32">
                {saving ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ الحفظ...</> : isEdit ? "حفظ التعديلات" : "إضافة المدرسة"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
