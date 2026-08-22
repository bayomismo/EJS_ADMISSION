"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Paperclip, FileText, Image as ImageIcon, Loader2, Eye,
  CheckCircle2, XCircle, Trash2, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { APPLICATION_DOC_TYPES, DOC_REVIEW_STATUSES } from "@/lib/constants";
import { toArabicDigits } from "@/lib/arabic";
import { cn } from "@/lib/utils";

interface DocItem {
  id: string;
  docType: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  reviewStatus: string;
  reviewNote: string | null;
  createdAt: string;
}

const reviewBadgeCls: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  VERIFIED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
};

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
  return `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;
}

/** Pure fetcher — returns [] on any failure so the UI degrades gracefully. */
async function fetchDocuments(kind: "students" | "teachers", appId: string): Promise<DocItem[]> {
  try {
    const res = await fetch(`/api/admin/applications/${kind}/${appId}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return [];
    return Array.isArray(data.documents) ? data.documents : [];
  } catch {
    return [];
  }
}

export function ApplicationDocumentsReview({
  kind,
  appId,
}: {
  kind: "students" | "teachers";
  appId: string;
}) {
  const [docs, setDocs] = useState<DocItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const typeLabels = new Map(APPLICATION_DOC_TYPES[kind].map((t) => [t.value, t.labelAr]));

  useEffect(() => {
    let cancelled = false;
    fetchDocuments(kind, appId).then((list) => {
      if (!cancelled) setDocs(list);
    });
    return () => { cancelled = true; };
  }, [kind, appId]);

  const refresh = useCallback(async () => {
    setDocs(await fetchDocuments(kind, appId));
  }, [kind, appId]);

  async function act(id: string, run: () => Promise<Response>, okMsg: string) {
    setBusyId(id);
    try {
      const res = await run();
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "فشل الإجراء");
      }
      toast.success(okMsg);
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ");
    } finally {
      setBusyId(null);
    }
  }

  const put = (id: string, body: object) =>
    fetch(`/api/admin/applications/documents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  function verify(id: string) {
    act(id, () => put(id, { reviewStatus: "VERIFIED" }), "تم اعتماد المستند");
  }

  function reject(id: string) {
    const note = window.prompt("سبب الرفض (يظهر لمقدم الطلب، اختياري):");
    if (note === null) return;
    act(
      id,
      () => put(id, { reviewStatus: "REJECTED", reviewNote: note.trim() || null }),
      "تم رفض المستند"
    );
  }

  function resetToPending(id: string) {
    act(id, () => put(id, { reviewStatus: "PENDING", reviewNote: null }), "أُعيد المستند لقائمة المراجعة");
  }

  function del(doc: DocItem) {
    if (!window.confirm(`حذف المستند "${doc.originalName}"؟ لا يمكن التراجع.`)) return;
    act(
      doc.id,
      () => fetch(`/api/admin/applications/documents/${doc.id}`, { method: "DELETE" }),
      "تم حذف المستند"
    );
  }

  if (docs === null) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-bold flex items-center gap-1.5 mb-2">
        <Paperclip className="h-4 w-4" />
        مستندات مقدم الطلب
        <span className="text-xs font-normal text-muted-foreground nums">({toArabicDigits(docs.length)})</span>
      </h3>

      {docs.length === 0 ? (
        <p className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
          لم يرفع مقدم الطلب أي مستندات بعد.
        </p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="rounded-lg border bg-card p-2.5">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 rounded-md bg-secondary/60 p-1.5">
                  {d.mimeType.startsWith("image/")
                    ? <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    : <FileText className="h-4 w-4 text-muted-foreground" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-xs truncate max-w-[180px]" title={d.originalName}>
                      {d.originalName}
                    </span>
                    <Badge variant="outline" className={cn("text-[10px]", reviewBadgeCls[d.reviewStatus])}>
                      {DOC_REVIEW_STATUSES.find((s) => s.value === d.reviewStatus)?.labelAr || d.reviewStatus}
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {typeLabels.get(d.docType) || d.docType}
                    {" · "}
                    <span className="nums">{fmtSize(d.size)}</span>
                    {d.uploadedBy === "ADMIN" && " · مرفوع من الإدارة"}
                  </div>
                  {d.reviewNote && (
                    <p className={cn(
                      "mt-1 rounded px-1.5 py-0.5 text-[11px]",
                      d.reviewStatus === "REJECTED" ? "bg-rose-50 text-rose-700" : "bg-secondary/50"
                    )}>
                      {d.reviewNote}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-end gap-1 border-t pt-2">
                {busyId === d.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <a
                      href={`/api/admin/applications/documents/file/${d.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
                      title="عرض / تنزيل"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                    {d.reviewStatus !== "VERIFIED" && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => verify(d.id)} title="اعتماد">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    {d.reviewStatus !== "REJECTED" && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => reject(d.id)} title="رفض">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {d.reviewStatus !== "PENDING" && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => resetToPending(d.id)} title="إعادة للمراجعة">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600/80" onClick={() => del(d)} title="حذف">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
