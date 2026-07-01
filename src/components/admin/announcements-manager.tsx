"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, Megaphone } from "lucide-react";
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
import { ANNOUNCEMENT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AnnItem { id: string; titleAr: string; bodyAr: string; type: string; linkUrl: string | null; isActive: boolean; sortOrder: number; startDate: string; endDate: string | null; }

export function AnnouncementsManager() {
  const [items, setItems] = useState<AnnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnnItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ titleAr: "", bodyAr: "", type: "INFO", linkUrl: "", isActive: true, sortOrder: 0 });

  const load = useCallback(async () => { setLoading(true); const res = await fetch("/api/admin/announcements"); setItems(await res.json()); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm({ titleAr: "", bodyAr: "", type: "INFO", linkUrl: "", isActive: true, sortOrder: items.length }); setOpen(true); }
  function openEdit(a: AnnItem) { setEditing(a); setForm({ titleAr: a.titleAr, bodyAr: a.bodyAr, type: a.type, linkUrl: a.linkUrl || "", isActive: a.isActive, sortOrder: a.sortOrder }); setOpen(true); }
  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/announcements${editing ? `/${editing.id}` : ""}`, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, linkUrl: form.linkUrl || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? "تم التحديث" : "تمت الإضافة"); setOpen(false); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }
  async function del(id: string) { if (!confirm("حذف هذا الإعلان؟")) return; await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" }); toast.success("تم الحذف"); load(); }
  async function toggle(a: AnnItem) { await fetch(`/api/admin/announcements/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !a.isActive }) }); load(); }

  const tone: Record<string, string> = { teal: "border-r-emerald-500", green: "border-r-emerald-600", gold: "border-r-amber-500", red: "border-r-rose-500" };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-extrabold">الإعلانات</h1><p className="text-sm text-muted-foreground">{items.length} إعلان</p></div><Button onClick={openCreate}><Plus className="ml-2 h-4 w-4" /> إعلان جديد</Button></div>
      <div className="space-y-3">
        {loading ? Array.from({ length: 3 }).map((_, i) => <Card key={i} className="h-20 animate-pulse" />) :
          items.map((a) => {
            const t = ANNOUNCEMENT_TYPES.find((x) => x.value === a.type) || ANNOUNCEMENT_TYPES[0];
            return (
              <Card key={a.id} className={cn("p-4 border-r-4", tone[t.color])}>
                <div className="flex items-start gap-3">
                  <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1"><h3 className="font-bold">{a.titleAr}</h3><Badge variant="outline" className="text-[10px]">{t.labelAr}</Badge>{!a.isActive && <Badge variant="secondary" className="text-[10px]">معطّل</Badge>}</div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{a.bodyAr}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0"><Switch checked={a.isActive} onCheckedChange={() => toggle(a)} /><div className="flex gap-1"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => del(a.id)}><Trash2 className="h-4 w-4" /></Button></div></div>
                </div>
              </Card>
            );
          })}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "تعديل إعلان" : "إضافة إعلان"}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5"><Label>النوع</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ANNOUNCEMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.labelAr}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>العنوان *</Label><Input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>النص *</Label><Textarea value={form.bodyAr} onChange={(e) => setForm({ ...form, bodyAr: e.target.value })} rows={3} /></div>
            <div className="space-y-1.5"><Label>رابط (اختياري)</Label><Input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} dir="ltr" /></div>
            <div className="space-y-1.5"><Label>الترتيب</Label><Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} dir="ltr" /></div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3"><span className="text-sm font-medium">نشط</span><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /></div>
          </div>
          <SheetFooter className="gap-2"><Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}{editing ? "حفظ" : "إضافة"}</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
