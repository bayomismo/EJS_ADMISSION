"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Lock, CheckCircle2, AlertCircle, Loader2, ChevronLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TermsContent {
  title: string;
  body: string;
  source: "cms" | "fallback";
}

/**
 * TermsGate — enforces that the user reads + acknowledges the terms before
 * proceeding. The "accept" button stays disabled until:
 *  1. The terms text has been scrolled to the bottom (read proof), AND
 *  2. The confirmation checkbox is checked.
 * Server-side also enforces termsAccepted=true on submission (defense in depth).
 *
 * Content comes from a CMS content block (admin-editable at
 * /admin/content, group "الشروط والخصوصية"). Pass `contentKey` to choose
 * which block to load; if absent, the `terms.student` block is used.
 */
export function TermsGate({
  contentKey = "terms.student",
  fallbackTitle = "الشروط والأحكام",
  fallbackBody = "يجب قراءة الشروط والموافقة عليها قبل التقديم.",
  accent = "crimson",
  ctaLabel = "أوافق وأبدأ التقديم",
  fullTermsHref,
  onAccepted,
}: {
  contentKey?: string;
  fallbackTitle?: string;
  fallbackBody?: string;
  accent?: "crimson" | "gold";
  ctaLabel?: string;
  fullTermsHref?: string; // optional link to the full /terms page
  onAccepted: () => void;
}) {
  const [terms, setTerms] = useState<TermsContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [checked, setChecked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/content?key=${encodeURIComponent(contentKey)}`)
      .then((r) => {
        if (r.status === 404) return { notFound: true };
        if (!r.ok) throw new Error("فشل تحميل الشروط");
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        if (d?.notFound) {
          setTerms({ title: fallbackTitle, body: fallbackBody, source: "fallback" });
          setError(""); // not an error, just no CMS block defined yet
        } else {
          setTerms({
            title: d.label || fallbackTitle,
            body: d.valueAr || fallbackBody,
            source: "cms",
          });
        }
        setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setTerms({ title: fallbackTitle, body: fallbackBody, source: "fallback" });
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [contentKey, fallbackTitle, fallbackBody]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    // consider "read" when within 30px of the bottom
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 30) {
      setScrolled(true);
    }
  }

  const accentCls = accent === "crimson"
    ? { btn: "bg-crimson hover:bg-crimson/90 text-white", chip: "bg-crimson/10 text-crimson" }
    : { btn: "bg-amber-600 hover:bg-amber-600/90 text-white", chip: "bg-amber-500/15 text-amber-700" };

  const canProceed = scrolled && checked && !loading && !!terms;

  return (
    <Card className="overflow-hidden p-0">
      <div className={cn("flex items-center gap-3 p-5 border-b border-border", accentCls.chip)}>
        <FileText className="h-6 w-6" />
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">
            {loading ? "جارٍ تحميل الشروط..." : terms?.title || fallbackTitle}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            يجب قراءة الشروط بالكامل والموافقة عليها قبل التقديم
          </p>
        </div>
        {terms?.source === "cms" && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700" title="نص قابل للتعديل من الإدارة">
            قابل للتعديل
          </span>
        )}
        <Lock className="h-5 w-5 opacity-60" />
      </div>

      {error && (
        <div className="p-5 text-sm text-rose-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {terms && (
        <>
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="max-h-80 overflow-y-auto p-5 text-sm leading-loose text-foreground/90 whitespace-pre-line scroll-area-custom bg-secondary/20"
          >
            {terms.body}
          </div>

          {!scrolled && (
            <div className="px-5 py-2 text-center text-xs text-amber-700 bg-amber-50 border-y border-amber-100 flex items-center justify-center gap-1.5">
              <ChevronLeft className="h-3.5 w-3.5 animate-bounce" />
              مرّر للأسفل لقراءة الشروط كاملةً قبل التمكن من الموافقة
            </div>
          )}

          <div className="p-5 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-border p-4 transition-colors hover:bg-accent/30">
              <Checkbox
                id="terms-accept"
                checked={checked}
                onCheckedChange={(v) => setChecked(v === true)}
                disabled={!scrolled}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor="terms-accept" className="font-bold text-sm cursor-pointer">
                  أوافق على جميع الشروط والأحكام المذكورة أعلاه وأقر بصحة البيانات التي سأقدمها
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  بإقبولك لهذه الشروط، فإنك تتعهد بتقديم بيانات صحيحة ومستندات أصلية عند الطلب
                </p>
                {fullTermsHref && (
                  <a
                    href={fullTermsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> اقرأ الشروط كاملةً في صفحة منفصلة
                  </a>
                )}
              </div>
            </label>

            <Button
              onClick={onAccepted}
              disabled={!canProceed}
              size="lg"
              className={cn("w-full h-12", accentCls.btn, !canProceed && "opacity-50 cursor-not-allowed")}
            >
              {canProceed ? (
                <><CheckCircle2 className="ml-2 h-5 w-5" /> {ctaLabel}</>
              ) : (
                <><Lock className="ml-2 h-4 w-4" /> {!scrolled ? "اقرأ الشروط أولاً" : "فعّل خانة الموافقة"}</>
              )}
            </Button>

            {!canProceed && (
              <p className="text-center text-xs text-muted-foreground">
                زر الموافقة معطّل حتى تقرأ الشروط كاملةً وتوافق عليها
              </p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}