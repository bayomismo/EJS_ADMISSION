"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, Loader2, Star, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { toArabicNumber, toArabicDigits } from "@/lib/arabic";

interface NewsItem { id: string; titleAr: string; slug: string; excerptAr: string | null; bodyAr: string; status: string; isFeatured: boolean; publishedAt: string | null; createdAt: string; viewCount: number; categoryId: string | null; category?: { nameAr: string } | null; }
interface Cat { id: string; nameAr: string; }

export function NewsManager({ categories }: { categories: Cat[] }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ titleAr: "", slug: "", excerptAr: "", bodyAr: "", categoryId: "", status: "DRAFT", isFeatured: false });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/news");
    setItems(await res.json());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((n) => n.titleAr.includes(q));

  function openCreate() { setEditing(null); setForm({ titleAr: "", slug: "", excerptAr: "", bodyAr: "", categoryId: "", status: "DRAFT", isFeatured: false }); setOpen(true); }
  function openEdit(n: NewsItem) { setEditing(n); setForm({ titleAr: n.titleAr, slug: n.slug, excerptAr: n.excerptAr || "", bodyAr: n.bodyAr, categoryId: n.categoryId || "", status: n.status, isFeatured: n.isFeatured }); setOpen(true); }

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form, slug: form.slug || form.titleAr.trim().replace(/\s+/g, "-") };
      const res = await fetch(`/api/admin/news${editing ? `/${editing.id}` : ""}`, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? "تم التحديث" : "تمت الإضافة");
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }
  async function del(id: string) { if (!confirm("حذف هذا الخبر؟")) return; const res = await fetch(`/api/admin/news/${id}`, { method: "DELETE" }); if (!res.ok) return toast.error("فشل الحذف"); toast.success("تم الحذف"); load(); }

  const statusBadge: Record<string, any> = { PUBLISHED: { label: "منشور", cls: "bg-emerald-600" }, DRAFT: { label: "مسودة", cls: "bg-secondary" }, SCHEDULED: { label: "مجدول", cls: "bg-amber-500" }, ARCHIVED: { label: "مؤرشف", cls: "bg-muted" } };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-extrabold">الأخبار</h1><p className="text-sm text-muted-foreground">{toArabicNumber(items.length)} خبر</p></div>
        <Button onClick={openCreate}><Plus className="ml-2 h-4 w-4" /> خبر جديد</Button>
      </div>
      <Card className="mb-4 p-3"><div className="relative"><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." className="pr-9" /></div></Card>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="border-b bg-secondary/40"><tr><th className="p-3 text-right font-medium text-muted-foreground">العنوان</th><th className="p-3 text-right font-medium text-muted-foreground hidden md:table-cell">التصنيف</th><th className="p-3 text-right font-medium text-muted-foreground">الحالة</th><th className="p-3 text-right font-medium text-muted-foreground hidden lg:table-cell">المشاهدات</th><th className="p-3 text-left font-medium text-muted-foreground">إجراءات</th></tr></thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={5} className="p-4"><div className="h-10 animate-pulse rounded bg-muted" /></td></tr>) :
              filtered.map((n) => (
                <tr key={n.id} className="border-b hover:bg-accent/30">
                  <td className="p-3"><div className="flex items-center gap-2"><span className="font-medium line-clamp-1 max-w-xs">{n.titleAr}</span>{n.isFeatured && <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500 shrink-0" />}</div></td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{n.category?.nameAr || "—"}</td>
                  <td className="p-3"><Badge className={`text-[10px] ${statusBadge[n.status].cls}`}>{statusBadge[n.status].label}</Badge></td>
                  <td className="p-3 hidden lg:table-cell nums"><span className="flex items-center gap-1 text-muted-foreground"><Eye className="h-3.5 w-3.5" />{toArabicNumber(n.viewCount)}</span></td>
                  <td className="p-3 text-left"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(n)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => del(n.id)}><Trash2 className="h-4 w-4" /></Button></div></td>
                </tr>
              ))}
          </tbody>
        </table></div>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "تعديل خبر" : "إضافة خبر"}</SheetTitle><SheetDescription>أدخل تفاصيل الخبر</SheetDescription></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5"><Label>العنوان *</Label><Input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>المعرف (slug)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" placeholder="يُولّد تلقائياً إذا تُرك فارغاً" /></div>
            <div className="space-y-1.5"><Label>التصنيف</Label><Select value={form.categoryId || "none"} onValueChange={(v) => setForm({ ...form, categoryId: v === "none" ? null : v })}><SelectTrigger><SelectValue placeholder="بدون تصنيف" /></SelectTrigger><SelectContent><SelectItem value="none">بدون تصنيف</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>الحالة</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DRAFT">مسودة</SelectItem><SelectItem value="PUBLISHED">منشور</SelectItem><SelectItem value="SCHEDULED">مجدول</SelectItem><SelectItem value="ARCHIVED">مؤرشف</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>المقتطف</Label><Textarea value={form.excerptAr} onChange={(e) => setForm({ ...form, excerptAr: e.target.value })} rows={2} /></div>
            <div className="space-y-1.5"><Label>المحتوى *</Label><Textarea value={form.bodyAr} onChange={(e) => setForm({ ...form, bodyAr: e.target.value })} rows={6} /></div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3"><span className="text-sm font-medium flex items-center gap-1.5"><Star className="h-4 w-4 text-amber-500" /> خبر مميز</span><Switch checked={form.isFeatured} onCheckedChange={(v) => setForm({ ...form, isFeatured: v })} /></div>
          </div>
          <SheetFooter className="gap-2"><Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}{editing ? "حفظ" : "إضافة"}</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
