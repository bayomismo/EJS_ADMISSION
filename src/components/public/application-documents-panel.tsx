"use client";

import { useEffect, useRef, useState } from "react";import {
  UploadCloud, Loader2, FileText, Image as ImageIcon,
  Trash2, CheckCircle2, XCircle, Clock, Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MAX_APPLICATION_DOC_BYTES } from "@/lib/constants";
import { toArabicDigits } from "@/lib/arabic";
import { cn } from "@/lib/utils";

interface DocTypeMeta {
  value: string;
  labelAr: string;
  required: boolean;
}

interface DocItem {
  id: string;
  docType: string;
  originalName: string;
  mimeType: string;
  size: number;
  reviewStatus: string;
  reviewNote: string | null;
  createdAt: string;
}

const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

const badgeCls: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  VERIFIED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
};

const badgeLabel: Record<string, string> = {
  PENDING: "بانتظار المراجعة",
  VERIFIED: "تم الاعتماد",
  REJECTED: "مرفوض",
};

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
  return `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;
}

interface PanelData {
  docTypes: DocTypeMeta[];
  documents: DocItem[];
  error?: string;
}

/** Pure fetcher for the caller's own documents (credential-scoped). */
async function fetchPanelData(
  kind: "students" | "teachers",
  referenceNo: string,
  nationalId: string,
): Promise<PanelData> {
  try {
    const params = new URLSearchParams({ type: kind, referenceNo, nationalId });
    const res = await fetch(`/api/public/applications/documents?${params}`);
    const data = await res.json();
    if (!res.ok) return { docTypes: [], documents: [], error: data.error || "تعذر تحميل المستندات" };
    return { docTypes: data.docTypes || [], documents: data.documents || [] };
  } catch {
    return { docTypes: [], documents: [], error: "تعذر تحميل المستندات" };
  }
}

export function ApplicationDocumentsPanel({
  kind,
  referenceNo,
  nationalId,
}: {
  kind: "students" | "teachers";
  referenceNo: string;
  nationalId: string;
}) {
  const [docTypes, setDocTypes] = useState<DocTypeMeta[]>([]);
  const [docs, setDocs] = useState<DocItem[] | null>(null);
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPanelData(kind, referenceNo, nationalId).then((d) => {
      if (cancelled) return;
      setDocTypes(d.docTypes);
      setDocs(d.documents);
      if (d.error) toast.error(d.error);
    });
    return () => { cancelled = true; };
  }, [kind, referenceNo, nationalId]);

  async function reload() {
    const d = await fetchPanelData(kind, referenceNo, nationalId);
    setDocTypes(d.docTypes);
    setDocs(d.documents);
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!docType) return toast.error("الرجاء اختيار نوع المستند");
    if (!file) return toast.error("الرجاء اختيار ملف");
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return toast.error("الصيغ المدعومة: PDF, JPG, PNG, WebP");
    }
    if (file.size > MAX_APPLICATION_DOC_BYTES) {
      return toast.error("حجم الملف يجب أن يكون أقل من ١٠ ميجابايت");
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("type", kind);
      fd.set("referenceNo", referenceNo);
      fd.set("nationalId", nationalId);
      fd.set("docType", docType);
      fd.set("file", file);
      const res = await fetch("/api/public/applications/documents", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل رفع الملف");
      toast.success("تم رفع المستند بنجاح وسيقوم فريق القبول بمراجعته إلكترونياً");
      setFile(null);
      setDocType("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await reload();
    } catch (err: any) {
      toast.error(err.message || "فشل رفع الملف");
    } finally {
      setUploading(false);
    }
  }

  async function del(doc: DocItem) {
    if (!window.confirm(`حذف "${doc.originalName}"؟`)) return;
    setDeletingId(doc.id);
    try {
      const params = new URLSearchParams({ type: kind, referenceNo, nationalId });
      const res = await fetch(`/api/public/applications/documents/${doc.id}?${params}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل الحذف");
      toast.success("تم حذف المستند");
      await reload();
    } catch (e: any) {
      toast.error(e.message || "فشل الحذف");
    } finally {
      setDeletingId(null);
    }
  }

  const uploadedTypes = new Set((docs || []).map((d) => d.docType));
  const missingRequired = docTypes.filter((t) => t.required && !uploadedTypes.has(t.value));

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3 mb-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
          <Paperclip className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-bold">مستندات الطلب</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            ارفع صورة من المستندات المطلوبة هنا ليتم مراجعتها إلكترونياً — لا حاجة للحضور الشخصي لتسليم الأوراق.
            الصيغ المقبولة: PDF أو صور JPG/PNG/WebP بحد أقصى ١٠ ميجابايت للمستند.
          </p>
        </div>
      </div>

      {missingRequired.length > 0 && (
        <div className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          <strong>مستندات مطلوبة لم يتم رفعها بعد:</strong>{" "}
          {missingRequired.map((t) => t.labelAr).join("، ")}
        </div>
      )}

      <form onSubmit={upload} className="flex flex-col sm:flex-row gap-2 mb-4">
        <Select value={docType || undefined} onValueChange={(v) => setDocType(v)}>
          <SelectTrigger className="sm:w-[240px]"><SelectValue placeholder="نوع المستند" /></SelectTrigger>
          <SelectContent>
            {docTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.labelAr}{uploadedTypes.has(t.value) ? " ✓" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="flex-1 file:ml-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:text-xs"
          dir="ltr"
        />
        <Button type="submit" disabled={uploading} className="gap-1.5 shrink-0">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          رفع المستند
        </Button>
      </form>

      {docs === null ? (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <p className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground text-center">
          لم ترفع أي مستندات حتى الآن.
        </p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-2.5 rounded-lg border bg-card p-2.5">
              <span className="shrink-0 rounded-md bg-secondary/60 p-1.5">
                {d.mimeType.startsWith("image/")
                  ? <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  : <FileText className="h-4 w-4 text-muted-foreground" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-xs truncate max-w-[200px]" title={d.originalName}>{d.originalName}</span>
                  <Badge variant="outline" className={cn("text-[10px]", badgeCls[d.reviewStatus])}>
                    {badgeLabel[d.reviewStatus] || d.reviewStatus}
                  </Badge>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {docTypes.find((t) => t.value === d.docType)?.labelAr || d.docType}
                  {" · "}
                  <span className="nums">{fmtSize(d.size)}</span>
                </div>
                {d.reviewStatus === "REJECTED" && d.reviewNote && (
                  <p className="mt-1 rounded bg-rose-50 px-1.5 py-0.5 text-[11px] text-rose-700">
                    سبب الرفض: {d.reviewNote}
                  </p>
                )}
              </div>
              <span className="shrink-0">
                {d.reviewStatus === "VERIFIED" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : d.reviewStatus === "REJECTED" ? (
                  <XCircle className="h-4 w-4 text-rose-600" />
                ) : deletingId === d.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <button
                    onClick={() => del(d)}
                    disabled={deletingId === d.id}
                    className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50 transition-colors"
                    title="حذف المستند"
                    aria-label="حذف المستند"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
