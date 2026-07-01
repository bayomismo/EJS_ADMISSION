"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, FileText, Download, FileSpreadsheet, FileImage, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { toArabicNumber } from "@/lib/arabic";

interface DocItem { id: string; titleAr: string; descriptionAr: string | null; fileType: string | null; fileSize: number | null; downloadCount: number; isActive: boolean; categoryId: string | null; category?: { nameAr: string } | null; }
interface Cat { id: string; nameAr: string; }

function fIcon(t?: string | null) { if (t === "docx") return FileText; if (t === "xlsx") return FileSpreadsheet; if (t === "image") return FileImage; return FileType; }

export function DocumentsManager({ categories }: { categories: Cat[] }) {
  const [items, setItems] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DocItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ titleAr: "", descriptionAr: "", fileType: "pdf", categoryId: "", isActive: true });

  const load = useCallback(async () => { setLoading(true); const res = await fetch("/api/admin/documents"); setItems(await res.json()); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm({ titleAr: "", descriptionAr: "", fileType: "pdf", categoryId: "", isActive: true }); setOpen(true); }
  function openEdit(d: DocItem) { setEditing(d); setForm({ titleAr: d.titleAr, descriptionAr: d.descriptionAr || "", fileType: d.fileType || "pdf", categoryId: d.categoryId || "", isActive: d.isActive }); setOpen(true); }
  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/documents${editing ? `/${editing.id}` : ""}`, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, categoryId: form.categoryId || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? "تم التحديث" : "تمت الإضافة"); setOpen(false); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }
  async function del(id: string) { if (!confirm("حذف هذا المستند؟")) return; await fetch(`/api/admin/documents/${id}`, { method: "DELETE" }); toast.success("تم الحذف"); load(); }
  async function toggle(d: DocItem) { await fetch(`/api/admin/documents/${d.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !d.isActive }) }); load(); }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-extrabold">المستندات</h1><p className="text-sm text-muted-foreground">{items.length} مستند</p></div><Button onClick={openCreate}><Plus className="ml-2 h-4 w-4" /> مستند جديد</Button></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? Array.from({ length: 6 }).map((_, i) => <Card key={i} className="h-40 animate-pulse" />) :
          items.map((d) => { const Icon = fIcon(d.fileType); return (
            <Card key={d.id} className="p-5 flex flex-col">
              <div className="mb-3 flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><Badge variant="outline" className="text-[10px] uppercase">{d.fileType}</Badge></div>
              <h3 className="mb-1 font-bold line-clamp-2">{d.titleAr}</h3>
              {d.descriptionAr && <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{d.descriptionAr}</p>}
              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Download className="h-3 w-3" /><span className="nums">{toArabicNumber(d.downloadCount)}</span></span>
                <div className="flex items-center gap-1.5"><Switch checked={d.isActive} onCheckedChange={() => toggle(d)} /><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600" onClick={() => del(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
              </div>
            </Card>
          ); })}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="sm:max-w-lg">
          <SheetHeader><SheetTitle>{editing ? "تعديل مستند" : "إضافة مستند"}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5"><Label>العنوان *</Label><Input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الوصف</Label><Textarea value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} rows={2} /></div>
            <div className="space-y-1.5"><Label>التصنيف</Label><Select value={form.categoryId || "none"} onValueChange={(v) => setForm({ ...form, categoryId: v === "none" ? null : v })}><SelectTrigger><SelectValue placeholder="بدون تصنيف" /></SelectTrigger><SelectContent><SelectItem value="none">بدون تصنيف</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>نوع الملف</Label><Select value={form.fileType} onValueChange={(v) => setForm({ ...form, fileType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pdf">PDF</SelectItem><SelectItem value="docx">Word</SelectItem><SelectItem value="xlsx">Excel</SelectItem><SelectItem value="image">صورة</SelectItem></SelectContent></Select></div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3"><span className="text-sm font-medium">نشط</span><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /></div>
          </div>
          <SheetFooter className="gap-2"><Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}{editing ? "حفظ" : "إضافة"}</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
