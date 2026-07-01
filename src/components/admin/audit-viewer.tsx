"use client";

import { useState, useEffect, useCallback } from "react";
import { ScrollText, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toArabicNumber, toArabicDigits } from "@/lib/arabic";

const actionLabels: Record<string, { label: string; cls: string }> = {
  CREATE: { label: "إضافة", cls: "bg-emerald-100 text-emerald-700" },
  UPDATE: { label: "تعديل", cls: "bg-amber-100 text-amber-700" },
  DELETE: { label: "حذف", cls: "bg-rose-100 text-rose-700" },
  LOGIN: { label: "دخول", cls: "bg-teal-100 text-teal-700" },
  LOGOUT: { label: "خروج", cls: "bg-muted text-muted-foreground" },
  BULK: { label: "جماعي", cls: "bg-indigo-100 text-indigo-700" },
};

const entityLabels: Record<string, string> = { school: "مدرسة", governorate: "محافظة", city: "مدينة", news: "خبر", faq: "سؤال", document: "مستند", announcement: "إعلان", user: "مستخدم", media: "وسائط", settings: "إعدادات" };

export function AuditViewer() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (entity !== "all") params.set("entity", entity);
    if (action !== "all") params.set("action", action);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/audit?${params}`);
    const data = await res.json();
    setItems(data.items); setTotal(data.total); setTotalPages(data.totalPages);
    setLoading(false);
  }, [entity, action, page]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate data fetch on mount/filter change
  useEffect(() => { load(); }, [load]);

  function changeEntity(v: string) { setEntity(v); setPage(1); }
  function changeAction(v: string) { setAction(v); setPage(1); }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6"><h1 className="text-2xl font-extrabold">سجل التغييرات</h1><p className="text-sm text-muted-foreground">{toArabicNumber(total)} سجل — تتبّع لكل تعديل في النظام</p></div>
      <Card className="mb-4 p-3 flex flex-wrap gap-2">
        <Filter className="mt-2 h-4 w-4 text-muted-foreground" />
        <Select value={entity} onValueChange={changeEntity}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الكيانات</SelectItem>{Object.entries(entityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
        <Select value={action} onValueChange={changeAction}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الإجراءات</SelectItem>{Object.entries(actionLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select>
      </Card>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="border-b bg-secondary/40"><tr><th className="p-3 text-right font-medium text-muted-foreground">الإجراء</th><th className="p-3 text-right font-medium text-muted-foreground">المستخدم</th><th className="p-3 text-right font-medium text-muted-foreground">الكيان</th><th className="p-3 text-right font-medium text-muted-foreground">الوصف</th><th className="p-3 text-right font-medium text-muted-foreground hidden lg:table-cell">التاريخ</th></tr></thead>
          <tbody>
            {loading ? Array.from({ length: 8 }).map((_, i) => <tr key={i}><td colSpan={5} className="p-4"><div className="h-10 animate-pulse rounded bg-muted" /></td></tr>) :
              items.map((a) => {
                const al = actionLabels[a.action] || { label: a.action, cls: "bg-muted" };
                return (
                  <tr key={a.id} className="border-b hover:bg-accent/30">
                    <td className="p-3"><Badge className={`text-[10px] ${al.cls}`}>{al.label}</Badge></td>
                    <td className="p-3"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">{(a.user?.name || "ن").charAt(0)}</span><span className="text-xs">{a.user?.name || "النظام"}</span></div></td>
                    <td className="p-3 text-muted-foreground">{entityLabels[a.entity] || a.entity}</td>
                    <td className="p-3 text-xs">{a.summary || "—"}</td>
                    <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground nums">{toArabicDigits(new Date(a.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" }))}</td>
                  </tr>
                );
              })}
          </tbody>
        </table></div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-3">
            <span className="text-xs text-muted-foreground nums">صفحة {toArabicNumber(page)} من {toArabicNumber(totalPages)}</span>
            <div className="flex gap-1"><button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-border p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button><button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border border-border p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button></div>
          </div>
        )}
      </Card>
    </div>
  );
}
