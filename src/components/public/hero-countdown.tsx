"use client";

import { useState, useEffect } from "react";
import { toArabicDigits } from "@/lib/arabic";
import { CalendarCheck, Timer } from "lucide-react";

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

/**
 * Compute the countdown once, imperatively. Kept outside React state on the
 * server so the server and client render identical markup (a stable skeleton)
 * and the live ticking only begins after hydration on the client.
 */
function computeCountdown(targetIso: string | null, now: number): Countdown | null {
  if (!targetIso) return null;
  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    done: false,
  };
}

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

  const label =
    status === "UPCOMING" ? "يفتح التقديم خلال" : status === "OPEN" ? "يغلق التقديم خلال" : "انتهى التقديم";

  // `mounted` ensures the live (time-dependent) markup is only rendered on the
  // client after hydration. Before mount we render a stable skeleton so the
  // server and client HTML match exactly — preventing hydration mismatches
  // caused by Date.now() differing between server render and client hydration.
  const [mounted, setMounted] = useState(false);
  const [cd, setCd] = useState<Countdown | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard mounted guard to avoid SSR/client hydration mismatch
    setMounted(true);
    const update = () => setCd(computeCountdown(target, Date.now()));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [target]);

  // CLOSED / done state — stable across server & client (no time dependency)
  if (status === "CLOSED" || (mounted && cd?.done)) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-muted p-4 text-sm font-medium text-muted-foreground">
        <CalendarCheck className="h-5 w-5" />
        {status === "CLOSED" ? "انتهت فترة التقديم لهذا العام" : "بدأ التقديم — قدّم الآن"}
      </div>
    );
  }

  const units = cd
    ? [
        { v: cd.days, l: "يوم" },
        { v: cd.hours, l: "ساعة" },
        { v: cd.minutes, l: "دقيقة" },
        { v: cd.seconds, l: "ثانية" },
      ]
    : [
        { v: "--", l: "يوم" },
        { v: "--", l: "ساعة" },
        { v: "--", l: "دقيقة" },
        { v: "--", l: "ثانية" },
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
              {typeof u.v === "number"
                ? toArabicDigits(String(u.v).padStart(2, "0"))
                : toArabicDigits(u.v)}
            </div>
            <div className="text-[10px] text-muted-foreground">{u.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
