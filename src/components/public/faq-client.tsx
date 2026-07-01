"use client";

import { useState, useMemo } from "react";
import { Search, HelpCircle, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/public/section-heading";
import { normalizeArabic } from "@/lib/arabic";
import { cn } from "@/lib/utils";

interface FaqItem {
  id: string; questionAr: string; answerAr: string;
  category: { id: string; nameAr: string } | null;
}
interface Cat { id: string; nameAr: string; }

export function FaqClient({ items, categories }: { items: FaqItem[]; categories: Cat[] }) {
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(items[0]?.id || null);

  const filtered = useMemo(() => {
    const nq = normalizeArabic(q);
    return items.filter((it) => {
      if (catId !== "all" && it.category?.id !== catId) return false;
      if (nq) {
        const blob = normalizeArabic(`${it.questionAr} ${it.answerAr}`);
        if (!blob.includes(nq)) return false;
      }
      return true;
    });
  }, [items, q, catId]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: FaqItem[] }>();
    for (const it of filtered) {
      const key = it.category?.id || "uncat";
      const name = it.category?.nameAr || "أسئلة عامة";
      if (!map.has(key)) map.set(key, { name, items: [] });
      map.get(key)!.items.push(it);
    }
    return Array.from(map.values());
  }, [filtered]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SectionHeading
        title="الأسئلة الشائعة"
        subtitle="إجابات على أكثر الأسئلة شيوعاً حول القبول في المدارس المصرية اليابانية"
      />

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث في الأسئلة..."
          className="h-12 pr-11 text-base"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setCatId("all")}
          className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            catId === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-accent")}
        >
          الكل
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCatId(c.id)}
            className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              catId === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-accent")}
          >
            {c.nameAr}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <HelpCircle className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">لا توجد أسئلة مطابقة</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.name}>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <span className="h-5 w-1.5 rounded-full bg-crimson" />
                {group.name}
              </h2>
              <div className="space-y-2">
                {group.items.map((it) => {
                  const isOpen = open === it.id;
                  return (
                    <Card key={it.id} className="overflow-hidden p-0">
                      <button
                        onClick={() => setOpen(isOpen ? null : it.id)}
                        className="flex w-full items-center justify-between gap-3 p-4 text-right hover:bg-accent/40 transition-colors"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-crimson/10 text-crimson">
                            <HelpCircle className="h-4 w-4" />
                          </span>
                          <span className="font-bold text-sm sm:text-base">{it.questionAr}</span>
                        </span>
                        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                      </button>
                      {isOpen && (
                        <div className="border-t border-border bg-secondary/30 px-4 py-3 pr-14 text-sm leading-relaxed text-muted-foreground">
                          {it.answerAr}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
