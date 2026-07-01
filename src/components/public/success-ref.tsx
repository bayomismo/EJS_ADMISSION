"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function SuccessRef({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(reference);
    setCopied(true);
    toast.success("تم نسخ رقم الطلب");
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="text-2xl font-extrabold tracking-wider text-primary nums" dir="ltr">{reference || "—"}</span>
      {reference && (
        <button onClick={copy} className="rounded-lg p-2 hover:bg-primary/10 transition-colors" aria-label="نسخ">
          {copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5 text-primary" />}
        </button>
      )}
    </div>
  );
}
