"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, Trash2, Loader2, Copy, ImageIcon, FileText, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { toArabicDigits } from "@/lib/arabic";

interface MediaItem { id: string; filename: string; originalName: string; mimeType: string; size: number; url: string; type: string; altAr: string | null; createdAt: string; }

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function MediaManager() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [alt, setAlt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => { setLoading(true); const res = await fetch("/api/admin/media"); setItems(await res.json()); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("altAr", alt);
        const res = await fetch("/api/admin/media", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
      toast.success(`تم رفع ${files.length} ملف`);
      setAlt("");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  }

  async function del(id: string) { if (!confirm("حذف هذا الملف؟")) return; const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" }); if (!res.ok) return toast.error("فشل الحذف"); toast.success("تم الحذف"); load(); }

  function copyUrl(url: string) { navigator.clipboard.writeText(window.location.origin + url); toast.success("تم نسخ الرابط"); }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6"><h1 className="text-2xl font-extrabold">مكتبة الوسائط</h1><p className="text-sm text-muted-foreground">{items.length} ملف</p></div>

      {/* upload */}
      <Card className="mb-6 p-5">
        <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
          <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="mb-2 font-medium">اسحب الملفات هنا أو اضغط للاختيار</p>
          <p className="mb-3 text-xs text-muted-foreground">صور، PDF، Word، Excel، فيديو</p>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,video/*" />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="نص بديل (اختياري)" className="max-w-xs" />
            <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ الرفع...</> : <><Upload className="ml-2 h-4 w-4" /> اختيار ملفات</>}
            </Button>
          </div>
        </div>
      </Card>

      {/* grid */}
      {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Card key={i} className="h-40 animate-pulse" />)}</div> :
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((m) => (
            <Card key={m.id} className="overflow-hidden p-0 group">
              <div className="relative flex h-32 items-center justify-center bg-secondary/40">
                {m.type === "IMAGE" ? (
                  <img src={m.url} alt={m.altAr || m.originalName} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-muted-foreground">{m.type === "VIDEO" ? <Film className="h-8 w-8" /> : <FileText className="h-8 w-8" />}</span>
                )}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 group-hover:bg-black/40 transition-colors">
                  <Button size="icon" variant="secondary" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => copyUrl(m.url)}><Copy className="h-4 w-4" /></Button>
                  <Button size="icon" variant="destructive" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => del(m.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="p-3">
                <p className="truncate text-xs font-medium" title={m.originalName}>{m.originalName}</p>
                <div className="mt-1 flex items-center justify-between">
                  <Badge variant="outline" className="text-[9px] uppercase">{m.type}</Badge>
                  <span className="text-[10px] text-muted-foreground nums">{toArabicDigits(fmtSize(m.size))}</span>
                </div>
              </div>
            </Card>
          ))}
          {items.length === 0 && <Card className="col-span-full flex flex-col items-center gap-2 p-16 text-center"><ImageIcon className="h-10 w-10 text-muted-foreground/40" /><p className="text-muted-foreground">لا توجد ملفات بعد</p></Card>}
        </div>
      }
    </div>
  );
}
