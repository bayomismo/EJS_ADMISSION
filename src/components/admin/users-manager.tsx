"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { toArabicDigits } from "@/lib/arabic";

interface UserItem { id: string; name: string; email: string; roleId: string; isActive: boolean; lastLoginAt: string | null; createdAt: string; role: { id: string; name: string; description: string | null }; }
interface Role { id: string; name: string; description: string | null; _count?: { users: number }; }

const roleLabels: Record<string, string> = { "super-admin": "مدير عام", admin: "مدير", "content-editor": "محرر محتوى", viewer: "مشاهد" };

export function UsersManager({ roles }: { roles: Role[] }) {
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ name: "", email: "", password: "", roleId: "", isActive: true });

  const load = useCallback(async () => { setLoading(true); const res = await fetch("/api/admin/users"); const data = await res.json(); setItems(data.items); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm({ name: "", email: "", password: "", roleId: roles.find((r) => r.name === "content-editor")?.id || roles[0]?.id || "", isActive: true }); setOpen(true); }
  function openEdit(u: UserItem) { setEditing(u); setForm({ name: u.name, email: u.email, password: "", roleId: u.roleId, isActive: u.isActive }); setOpen(true); }
  async function save() {
    setSaving(true);
    try {
      const payload: any = { name: form.name, email: form.email, roleId: form.roleId, isActive: form.isActive };
      if (form.password) payload.password = form.password;
      if (editing && !form.password) delete payload.password;
      const res = await fetch(`/api/admin/users${editing ? `/${editing.id}` : ""}`, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? "تم التحديث" : "تمت الإضافة"); setOpen(false); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }
  async function del(id: string) { if (!confirm("حذف هذا المستخدم؟")) return; const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" }); const data = await res.json(); if (!res.ok) return toast.error(data.error); toast.success("تم الحذف"); load(); }
  async function toggle(u: UserItem) { await fetch(`/api/admin/users/${u.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !u.isActive }) }); load(); }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-extrabold">المستخدمون</h1><p className="text-sm text-muted-foreground">{items.length} مستخدم</p></div><Button onClick={openCreate}><Plus className="ml-2 h-4 w-4" /> مستخدم جديد</Button></div>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="border-b bg-secondary/40"><tr><th className="p-3 text-right font-medium text-muted-foreground">الاسم</th><th className="p-3 text-right font-medium text-muted-foreground">البريد</th><th className="p-3 text-right font-medium text-muted-foreground hidden md:table-cell">الدور</th><th className="p-3 text-right font-medium text-muted-foreground hidden lg:table-cell">آخر دخول</th><th className="p-3 text-right font-medium text-muted-foreground">نشط</th><th className="p-3 text-left font-medium text-muted-foreground">إجراءات</th></tr></thead>
          <tbody>
            {loading ? Array.from({ length: 3 }).map((_, i) => <tr key={i}><td colSpan={6} className="p-4"><div className="h-10 animate-pulse rounded bg-muted" /></td></tr>) :
              items.map((u) => (
                <tr key={u.id} className="border-b hover:bg-accent/30">
                  <td className="p-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary font-bold">{u.name.charAt(0)}</span><span className="font-medium">{u.name}</span></div></td>
                  <td className="p-3 text-muted-foreground" dir="ltr">{u.email}</td>
                  <td className="p-3 hidden md:table-cell"><Badge variant={u.role.name === "super-admin" ? "default" : "secondary"} className="text-[10px]">{roleLabels[u.role.name] || u.role.description || u.role.name}</Badge></td>
                  <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground nums">{u.lastLoginAt ? toArabicDigits(new Date(u.lastLoginAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })) : "—"}</td>
                  <td className="p-3"><Switch checked={u.isActive} onCheckedChange={() => toggle(u)} /></td>
                  <td className="p-3 text-left"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => del(u.id)}><Trash2 className="h-4 w-4" /></Button></div></td>
                </tr>
              ))}
          </tbody>
        </table></div>
      </Card>

      {/* roles overview */}
      <Card className="mt-6 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-primary" /> الأدوار والصلاحيات</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((r) => (
            <div key={r.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between mb-1"><span className="font-bold text-sm">{roleLabels[r.name] || r.description || r.name}</span><Badge variant="outline" className="text-[10px] nums">{r._count?.users || 0}</Badge></div>
              <p className="text-xs text-muted-foreground">{r.description || r.name}</p>
            </div>
          ))}
        </div>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="sm:max-w-md">
          <SheetHeader><SheetTitle>{editing ? "تعديل مستخدم" : "إضافة مستخدم"}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5"><Label>الاسم *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>البريد الإلكتروني *</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" /></div>
            <div className="space-y-1.5"><Label>كلمة المرور {editing ? "(اتركها فارغة للإبقاء عليها)" : "*"}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" /></div>
            <div className="space-y-1.5"><Label>الدور</Label><Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roles.map((r) => <SelectItem key={r.id} value={r.id}>{roleLabels[r.name] || r.description || r.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3"><span className="text-sm font-medium">نشط</span><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /></div>
          </div>
          <SheetFooter className="gap-2"><Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}{editing ? "حفظ" : "إضافة"}</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
