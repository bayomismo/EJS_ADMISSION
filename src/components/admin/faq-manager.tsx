"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface FaqItem { id: string; questionAr: string; answerAr: string; categoryId: string | null; isActive: boolean; sortOrder: number; category?: { nameAr: string } | null; }
interface Cat { id: string; nameAr: string; }

export function FaqManager({ categories }: { categories: Cat[] }) {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ questionAr: "", answerAr: "", categoryId: "", isActive: true, sortOrder: 0 });

  const load = useCallback(async () => { setLoading(true); const res = await fetch("/api/admin/faq"); setItems(await res.json()); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm({ questionAr: "", answerAr: "", categoryId: "", isActive: true, sortOrder: items.length }); setOpen(true); }
  function openEdit(f: FaqItem) { setEditing(f); setForm({ questionAr: f.questionAr, answerAr: f.answerAr, categoryId: f.categoryId || "", isActive: f.isActive, sortOrder: f.sortOrder }); setOpen(true); }
  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/faq${editing ? `/${editing.id}` : ""}`, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, categoryId: form.categoryId || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? "تم التحديث" : "تمت الإضافة"); setOpen(false); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }
  async function del(id: string) { if (!confirm("حذف هذا السؤال؟")) return; await fetch(`/api/admin/faq/${id}`, { method: "DELETE" }); toast.success("تم الحذف"); load(); }
  async function toggle(f: FaqItem) { await fetch(`/api/admin/faq/${f.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !f.isActive }) }); load(); }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-extrabold">الأسئلة الشائعة</h1><p className="text-sm text-muted-foreground">{items.length} سؤال</p></div><Button onClick={openCreate}><Plus className="ml-2 h-4 w-4" /> سؤال جديد</Button></div>
      <div className="space-y-3">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Card key={i} className="h-20 animate-pulse" />) :
          items.map((f) => (
            <Card key={f.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">{f.category && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">{f.category.nameAr}</span>}</div>
                  <h3 className="font-bold mb-1">{f.questionAr}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{f.answerAr}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Switch checked={f.isActive} onCheckedChange={() => toggle(f)} />
                  <div className="flex gap-1"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => del(f.id)}><Trash2 className="h-4 w-4" /></Button></div>
                </div>
              </div>
            </Card>
          ))}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "تعديل سؤال" : "إضافة سؤال"}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5"><Label>التصنيف</Label><Select value={form.categoryId || "none"} onValueChange={(v) => setForm({ ...form, categoryId: v === "none" ? null : v })}><SelectTrigger><SelectValue placeholder="بدون تصنيف" /></SelectTrigger><SelectContent><SelectItem value="none">بدون تصنيف</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>السؤال *</Label><Input value={form.questionAr} onChange={(e) => setForm({ ...form, questionAr: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الإجابة *</Label><Textarea value={form.answerAr} onChange={(e) => setForm({ ...form, answerAr: e.target.value })} rows={4} /></div>
            <div className="space-y-1.5"><Label>الترتيب</Label><Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} dir="ltr" /></div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3"><span className="text-sm font-medium">نشط</span><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /></div>
          </div>
          <SheetFooter className="gap-2"><Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}{editing ? "حفظ" : "إضافة"}</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
