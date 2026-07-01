"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Search, Building2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SiteSettings } from "@/lib/constants";

const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/schools", label: "ابحث عن مدرسة" },
  { href: "/admission/students", label: "تقديم الطلاب" },
  { href: "/admission/teachers", label: "تقديم المعلمين" },
];

export function SiteHeader({
  settings,
  status,
}: {
  settings: SiteSettings;
  status: { label: string; color: string };
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/schools?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  }

  const colorMap: Record<string, string> = {
    green: "bg-emerald-600 text-white",
    gold: "bg-amber-500 text-white",
    red: "bg-rose-600 text-white",
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur-xl">
      {/* top utility bar */}
      <div className="hidden md:block border-b border-border/60 bg-secondary/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5" />
            <span className="nums" dir="ltr">{settings.contact.phone}</span>
            <span className="opacity-40">•</span>
            <span>{settings.contact.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/login" className="hover:text-foreground transition-colors">
              دخول الإدارة
            </Link>
            <span className="opacity-40">•</span>
            <span className="nums">{settings.admission.year}</span>
          </div>
        </div>
      </div>

      {/* main bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          {/* Dual logos: EJS + MOE side by side */}
          <div className="flex items-center gap-2">
            {settings.branding.logoUrl ? (
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft ring-1 ring-primary/10 overflow-hidden transition-transform group-hover:scale-105">
                { }
                <img
                  src={settings.branding.logoUrl}
                  alt={settings.branding.siteNameAr}
                  className="h-full w-full object-contain p-0.5"
                />
              </span>
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
                <Building2 className="h-6 w-6" />
              </span>
            )}
            {/* MOE logo */}
            { }
            <img
              src="/moe-logo.png"
              alt="وزارة التربية والتعليم"
              className="h-12 w-12 rounded-xl bg-white object-contain ring-1 ring-primary/10 p-0.5 shadow-soft transition-transform group-hover:scale-105"
            />
          </div>
          <span className="flex flex-col leading-tight">
            <span className="text-base font-extrabold text-foreground">
              {settings.branding.siteNameAr}
            </span>
            <span className="text-[11px] text-muted-foreground" dir="ltr">
              {settings.branding.siteNameEn}
            </span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "hidden sm:inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
              colorMap[status.color] || "bg-muted text-foreground"
            )}
          >
            <span className="ml-1.5 h-2 w-2 rounded-full bg-white/80 animate-pulse" />
            {status.label}
          </span>
          <form onSubmit={onSearch} className="hidden md:flex relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن مدرسة..."
              className="w-44 pr-9 lg:w-56"
            />
          </form>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="القائمة"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-4 space-y-3">
            <form onSubmit={onSearch} className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث عن مدرسة..."
                className="pr-9"
              />
            </form>
            <nav className="grid gap-1">
              {NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <Link
              href="/admin/login"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              دخول الإدارة
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
