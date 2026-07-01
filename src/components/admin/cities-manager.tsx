"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { toArabicNumber } from "@/lib/arabic";

interface City { id: string; nameAr: string; nameEn: string; governorateId: string; sortOrder: number; isActive: boolean; governorate?: { nameAr: string }; _count?: { schools: number }; }
interface Gov { id: string; nameAr: string; }

export function CitiesManager({ governorates }: { governorates: Gov[] }) {
  const [items, setItems] = useState<City[]>([]);
  const [q, setQ] = useState("");
  const [govFilter, setGovFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<City | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nameAr: "", nameEn: "", governorateId: "", sortOrder: 0, isActive: true });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (govFilter !== "all") params.set("governorateId", govFilter);
    const res = await fetch(`/api/admin/cities?${params}`);
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }, [govFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((c) => c.nameAr.includes(q) || c.nameEn.toLowerCase().includes(q.toLowerCase()));

  function openCreate() { setEditing(null); setForm({ nameAr: "", nameEn: "", governorateId: govFilter !== "all" ? govFilter : "", sortOrder: 0, isActive: true }); setOpen(true); }
  function openEdit(c: City) { setEditing(c); setForm({ nameAr: c.nameAr, nameEn: c.nameEn, governorateId: c.governorateId, sortOrder: c.sortOrder, isActive: c.isActive }); setOpen(true); }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cities${editing ? `/${editing.id}` : ""}`, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? "تم التحديث" : "تمت الإضافة");
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }
  async function del(id: string) {
    if (!confirm("حذف هذه المدينة؟")) return;
    const res = await fetch(`/api/admin/cities/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    toast.success("تم الحذف"); load();
  }
  async function toggle(c: City) {
    await fetch(`/api/admin/cities/${c.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !c.isActive }) });
    load();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-extrabold">المدن والإدارات</h1><p className="text-sm text-muted-foreground">{toArabicNumber(items.length)} مدينة</p></div>
        <Button onClick={openCreate}><Plus className="ml-2 h-4 w-4" /> مدينة جديدة</Button>
      </div>
      <Card className="mb-4 p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." className="pr-9" />
        </div>
        <Select value={govFilter} onValueChange={setGovFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72"><SelectItem value="all">كل المحافظات</SelectItem>{governorates.map((g) => <SelectItem key={g.id} value={g.id}>{g.nameAr}</SelectItem>)}</SelectContent>
        </Select>
      </Card>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/40">
              <tr>
                <th className="p-3 text-right font-medium text-muted-foreground">المدينة</th>
                <th className="p-3 text-right font-medium text-muted-foreground hidden md:table-cell">المحافظة</th>
                <th className="p-3 text-right font-medium text-muted-foreground hidden sm:table-cell">المدارس</th>
                <th className="p-3 text-right font-medium text-muted-foreground">نشطة</th>
                <th className="p-3 text-left font-medium text-muted-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={5} className="p-4"><div className="h-10 animate-pulse rounded bg-muted" /></td></tr>) :
                filtered.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-accent/30">
                    <td className="p-3 font-medium">{c.nameAr}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{c.governorate?.nameAr}</td>
                    <td className="p-3 hidden sm:table-cell nums">{toArabicNumber(c._count?.schools || 0)}</td>
                    <td className="p-3"><Switch checked={c.isActive} onCheckedChange={() => toggle(c)} /></td>
                    <td className="p-3 text-left"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button></div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="sm:max-w-md">
          <SheetHeader><SheetTitle>{editing ? "تعديل مدينة" : "إضافة مدينة"}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5"><Label>المحافظة *</Label><Select value={form.governorateId} onValueChange={(v) => setForm({ ...form, governorateId: v })}><SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger><SelectContent className="max-h-72">{governorates.map((g) => <SelectItem key={g.id} value={g.id}>{g.nameAr}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>الاسم بالعربية *</Label><Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الاسم بالإنجليزية *</Label><Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} dir="ltr" /></div>
            <div className="space-y-1.5"><Label>الترتيب</Label><Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} dir="ltr" /></div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3"><span className="text-sm font-medium">نشطة</span><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /></div>
          </div>
          <SheetFooter className="gap-2"><Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}{editing ? "حفظ" : "إضافة"}</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
