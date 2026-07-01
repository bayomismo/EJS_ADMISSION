"use client";

import { useCountdown } from "@/hooks/use-countdown";
import { toArabicDigits } from "@/lib/arabic";
import { CalendarCheck, Timer } from "lucide-react";

export function HeroCountdown({
  openDate,
  closeDate,
  status,
}: {
  openDate: string | null;
  closeDate: string | null;
  status: string;
}) {
  // If upcoming -> countdown to open; if open -> countdown to close
  const target =
    status === "UPCOMING" ? openDate : status === "OPEN" ? closeDate : closeDate;
  const cd = useCountdown(target);

  const label =
    status === "UPCOMING" ? "يفتح التقديم خلال" : status === "OPEN" ? "يغلق التقديم خلال" : "انتهى التقديم";

  if (status === "CLOSED" || !cd || cd.done) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-muted p-4 text-sm font-medium text-muted-foreground">
        <CalendarCheck className="h-5 w-5" />
        {status === "CLOSED" ? "انتهت فترة التقديم لهذا العام" : "بدأ التقديم — قدّم الآن"}
      </div>
    );
  }

  const units = [
    { v: cd.days, l: "يوم" },
    { v: cd.hours, l: "ساعة" },
    { v: cd.minutes, l: "دقيقة" },
    { v: cd.seconds, l: "ثانية" },
  ];

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Timer className="h-4 w-4 text-crimson" />
        {label}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {units.map((u) => (
          <div key={u.l} className="rounded-xl border border-border bg-background p-2 text-center">
            <div className="text-2xl font-extrabold tabular-nums text-primary nums">
              {toArabicDigits(String(u.v).padStart(2, "0"))}
            </div>
            <div className="text-[10px] text-muted-foreground">{u.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
