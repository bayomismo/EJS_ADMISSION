"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Save, Trash2, Loader2, History, RotateCcw, X,
  Eye, EyeOff, ChevronDown, ChevronUp, FileText, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toArabicDigits } from "@/lib/arabic";

interface Block {
  key: string;
  valueAr: string;
  valueEn: string | null;
  group: string;
  label: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: { id: string; name: string; email: string } | null;
  _count: { revisions: number };
}

interface Revision {
  id: string;
  blockKey: string;
  valueAr: string;
  valueEn: string | null;
  editedAt: string;
  editedBy: { id: string; name: string; email: string } | null;
}

const GROUPS = [
  { key: "homepage", label: "الصفحة الرئيسية", icon: "🏠" },
  { key: "admission.students", label: "تقديم الطلاب", icon: "🎓" },
  { key: "admission.teachers", label: "تقديم المعلمين", icon: "👨‍🏫" },
  { key: "terms", label: "الشروط والخصوصية", icon: "📜" },
  { key: "footer", label: "الفوتر", icon: "📋" },
  { key: "general", label: "عام", icon: "📝" },
];

export function ContentManager() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content");
      const data = await res.json();
      if (data.items) setBlocks(data.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = blocks.filter((b) => {
    if (activeGroup !== "all" && b.group !== activeGroup) return false;
    if (search) {
      const q = search.toLowerCase();
      return b.key.toLowerCase().includes(q) ||
        (b.label || "").toLowerCase().includes(q) ||
        b.valueAr.toLowerCase().includes(q);
    }
    return true;
  });

  const grouped = filtered.reduce<Record<string, Block[]>>((acc, b) => {
    (acc[b.group] ||= []).push(b);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="p-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالمفتاح أو النص..." className="pr-9" />
        </div>
        <Button onClick={() => setShowNew(true)} size="sm">
          <Plus className="ml-1.5 h-4 w-4" /> بلوك جديد
        </Button>
      </div>

      {/* Group tabs */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActiveGroup("all")}
          className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            activeGroup === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-accent")}>
          الكل ({blocks.length})
        </button>
        {GROUPS.map((g) => {
          const count = blocks.filter((b) => b.group === g.key).length;
          return (
            <button key={g.key} onClick={() => setActiveGroup(g.key)}
              className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeGroup === g.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-accent")}>
              {g.icon} {g.label} ({count})
            </button>
          );
        })}
      </div>

      {/* New block modal */}
      {showNew && <NewBlockModal groups={GROUPS} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />}

      {/* History modal */}
      {showHistory && (
        <HistoryModal
          blockKey={showHistory}
          onClose={() => setShowHistory(null)}
          onRestored={() => { setShowHistory(null); load(); }}
        />
      )}

      {/* Block list */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([group, items]) => {
          const g = GROUPS.find((x) => x.key === group);
          return (
            <section key={group}>
              <h2 className="mb-3 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {g ? `${g.icon} ${g.label}` : group}
              </h2>
              <div className="space-y-3">
                {items.map((b) => (
                  <BlockRow
                    key={b.key}
                    block={b}
                    isEditing={editing === b.key}
                    onEdit={() => setEditing(editing === b.key ? null : b.key)}
                    onShowHistory={() => setShowHistory(b.key)}
                    onChanged={load}
                  />
                ))}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p>لا توجد بلوكات محتوى في هذا القسم</p>
            <Button onClick={() => setShowNew(true)} variant="outline" size="sm" className="mt-3">
              <Plus className="ml-1.5 h-4 w-4" /> إضافة أول بلوك
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

function BlockRow({ block, isEditing, onEdit, onShowHistory, onChanged }: {
  block: Block;
  isEditing: boolean;
  onEdit: () => void;
  onShowHistory: () => void;
  onChanged: () => void;
}) {
  const [valueAr, setValueAr] = useState(block.valueAr);
  const [valueEn, setValueEn] = useState(block.valueEn || "");
  const [label, setLabel] = useState(block.label || "");
  const [description, setDescription] = useState(block.description || "");
  const [isActive, setIsActive] = useState(block.isActive);
  const [saving, setSaving] = useState(false);

  // Reset when block changes
  useEffect(() => {
    setValueAr(block.valueAr);
    setValueEn(block.valueEn || "");
    setLabel(block.label || "");
    setDescription(block.description || "");
    setIsActive(block.isActive);
  }, [block.key, block.valueAr, block.valueEn, block.label, block.description, block.isActive]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/content/${encodeURIComponent(block.key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valueAr: valueAr.trim(),
          valueEn: valueEn.trim() || null,
          label: label.trim() || null,
          description: description.trim() || null,
          isActive,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "فشل الحفظ");
        return;
      }
      toast.success("تم الحفظ بنجاح");
      onChanged();
      onEdit();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    const res = await fetch(`/api/admin/content/${encodeURIComponent(block.key)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      setIsActive(!isActive);
      toast.success(isActive ? "تم الإخفاء" : "تم الإظهار");
      onChanged();
    }
  }

  async function remove() {
    if (!confirm(`حذف البلوك "${block.key}" نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    const res = await fetch(`/api/admin/content/${encodeURIComponent(block.key)}?hard=true`, { method: "DELETE" });
    if (res.ok) {
      toast.success("تم الحذف");
      onChanged();
    }
  }

  return (
    <Card className={cn("p-4 transition-all", !isActive && "opacity-60 bg-secondary/20")}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <code className="rounded bg-secondary px-2 py-0.5 text-[11px] font-mono text-foreground">{block.key}</code>
            {block.label && <span className="text-xs text-muted-foreground">· {block.label}</span>}
            {block._count.revisions > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                <History className="ml-1 h-3 w-3" /> {block._count.revisions}
              </Badge>
            )}
            {!isActive && <Badge variant="secondary" className="text-[10px]">مخفي</Badge>}
          </div>
          {block.description && <p className="text-xs text-muted-foreground">{block.description}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={toggleActive} title={isActive ? "إخفاء" : "إظهار"}>
            {isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={onShowHistory} title="السجل">
            <History className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit} title="تعديل">
            {isEditing ? <ChevronUp className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={remove} title="حذف" className="text-rose-600 hover:text-rose-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3 border-t pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium block mb-1">التسمية (داخلية)</label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="مثال: عنوان الهيرو" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">الوصف</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ملاحظة للمسؤول" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">النص العربي <span className="text-rose-600">*</span></label>
            <Textarea value={valueAr} onChange={(e) => setValueAr(e.target.value)} rows={3} dir="rtl" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">English (اختياري)</label>
            <Textarea value={valueEn} onChange={(e) => setValueEn(e.target.value)} rows={2} dir="ltr" />
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
              مفعّل (يظهر في الموقع)
            </label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEdit} disabled={saving}>إلغاء</Button>
              <Button size="sm" onClick={save} disabled={saving || !valueAr.trim()}>
                {saving ? <Loader2 className="ml-1.5 h-4 w-4 animate-spin" /> : <Save className="ml-1.5 h-4 w-4" />}
                حفظ
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t pt-3">
          <p className="text-sm whitespace-pre-wrap" dir="rtl">{block.valueAr}</p>
          {block.valueEn && (
            <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap" dir="ltr">{block.valueEn}</p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground nums">
            آخر تحديث: {toArabicDigits(new Date(block.updatedAt).toLocaleString("ar-EG"))}
            {block.updatedBy && ` · بواسطة ${block.updatedBy.name}`}
          </p>
        </div>
      )}
    </Card>
  );
}

function NewBlockModal({ groups, onClose, onCreated }: {
  groups: { key: string; label: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [key, setKey] = useState("");
  const [valueAr, setValueAr] = useState("");
  const [valueEn, setValueEn] = useState("");
  const [group, setGroup] = useState("general");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!key.match(/^[a-z0-9._-]+$/)) {
      toast.error("المفتاح يجب أن يكون أحرف لاتينية صغيرة وأرقام ونقاط وشرطات فقط");
      return;
    }
    if (!valueAr.trim()) {
      toast.error("النص العربي مطلوب");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.trim(),
          valueAr: valueAr.trim(),
          valueEn: valueEn.trim() || null,
          group,
          label: label.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "فشل الإنشاء");
        return;
      }
      toast.success("تم إنشاء البلوك");
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">بلوك محتوى جديد</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium block mb-1">المفتاح <span className="text-rose-600">*</span></label>
              <Input value={key} onChange={(e) => setKey(e.target.value.toLowerCase())} placeholder="home.hero.title" dir="ltr" className="font-mono" />
              <p className="text-[11px] text-muted-foreground mt-1">أحرف لاتينية صغيرة وأرقام ونقاط وشرطات فقط</p>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">المجموعة <span className="text-rose-600">*</span></label>
              <select value={group} onChange={(e) => setGroup(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {groups.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">التسمية (داخلية)</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="مثال: عنوان الهيرو" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">النص العربي <span className="text-rose-600">*</span></label>
            <Textarea value={valueAr} onChange={(e) => setValueAr(e.target.value)} rows={4} dir="rtl" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">English (اختياري)</label>
            <Textarea value={valueEn} onChange={(e) => setValueEn(e.target.value)} rows={2} dir="ltr" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>إلغاء</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="ml-1.5 h-4 w-4 animate-spin" /> : <Save className="ml-1.5 h-4 w-4" />}
              إنشاء
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function HistoryModal({ blockKey, onClose, onRestored }: { blockKey: string; onClose: () => void; onRestored: () => void }) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/content/${encodeURIComponent(blockKey)}/revisions`)
      .then((r) => r.json())
      .then((d) => { setRevisions(d.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [blockKey]);

  async function restore(id: string) {
    if (!confirm("استعادة هذه النسخة؟ سيتم حفظ القيمة الحالية كنسخة جديدة قابلة للتراجع.")) return;
    setRestoring(id);
    try {
      const res = await fetch(`/api/admin/content/${encodeURIComponent(blockKey)}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId: id }),
      });
      if (res.ok) {
        toast.success("تم الاستعادة");
        onRestored();
      } else {
        toast.error("فشل الاستعادة");
      }
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <History className="h-5 w-5" /> سجل التعديلات
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          المفتاح: <code className="bg-secondary px-1 rounded">{blockKey}</code>
        </p>
        {loading ? (
          <div className="py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : revisions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            لا توجد تعديلات سابقة على هذا البلوك
          </div>
        ) : (
          <div className="space-y-3">
            {revisions.map((r, i) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs text-muted-foreground nums">
                    {toArabicDigits(new Date(r.editedAt).toLocaleString("ar-EG"))}
                    {r.editedBy && ` · ${r.editedBy.name}`}
                    {i === 0 && <Badge variant="secondary" className="mr-2 text-[10px]">الأحدث</Badge>}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => restore(r.id)} disabled={restoring === r.id}>
                    {restoring === r.id ? <Loader2 className="ml-1 h-3 w-3 animate-spin" /> : <RotateCcw className="ml-1 h-3 w-3" />}
                    استعادة
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap" dir="rtl">{r.valueAr}</p>
                {r.valueEn && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap" dir="ltr">{r.valueEn}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}