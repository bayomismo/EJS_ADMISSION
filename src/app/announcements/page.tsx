import { Megaphone, Link as LinkIcon } from "lucide-react";
import { db } from "@/lib/db";
import { PublicShell } from "@/components/public/public-shell";
import { SectionHeading } from "@/components/public/section-heading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ANNOUNCEMENT_TYPES } from "@/lib/constants";
import { toArabicDigits } from "@/lib/arabic";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const toneMap: Record<string, { card: string; icon: string; badge: string }> = {
  teal: { card: "border-r-emerald-500", icon: "text-emerald-600 bg-emerald-50", badge: "bg-emerald-100 text-emerald-700" },
  green: { card: "border-r-emerald-600", icon: "text-emerald-600 bg-emerald-50", badge: "bg-emerald-100 text-emerald-700" },
  gold: { card: "border-r-amber-500", icon: "text-amber-600 bg-amber-50", badge: "bg-amber-100 text-amber-700" },
  red: { card: "border-r-rose-500", icon: "text-rose-600 bg-rose-50", badge: "bg-rose-100 text-rose-700" },
};

export default async function AnnouncementsPage() {
  const items = await db.announcement.findMany({
    where: {
      isActive: true,
      startDate: { lte: new Date() },
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <SectionHeading
          title="الإعلانات"
          subtitle="آخر الإعلانات والتنبيهات الرسمية الخاصة بالقبول"
        />
        <div className="space-y-4">
          {items.map((a) => {
            const t = ANNOUNCEMENT_TYPES.find((x) => x.value === a.type) || ANNOUNCEMENT_TYPES[0];
            const tone = toneMap[t.color] || toneMap.teal;
            return (
              <Card key={a.id} className={cn("flex items-start gap-4 border-r-4 p-5", tone.card)}>
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tone.icon)}>
                  <Megaphone className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <h2 className="text-lg font-bold">{a.titleAr}</h2>
                    <Badge variant="outline" className={cn("text-[10px]", tone.badge)}>{t.labelAr}</Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{a.bodyAr}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="nums">
                      {toArabicDigits(new Date(a.startDate).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }))}
                    </span>
                    {a.linkUrl && (
                      <a href={a.linkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium text-primary hover:underline">
                        <LinkIcon className="h-3 w-3" /> الرابط
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          {items.length === 0 && (
            <Card className="flex flex-col items-center gap-2 p-16 text-center">
              <Megaphone className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">لا توجد إعلانات حالياً</p>
            </Card>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
