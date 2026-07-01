"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Building2, Map, MapPin, Newspaper, HelpCircle, FileText,
  Megaphone, Image, Settings, Users, ScrollText, LogOut, Menu, X, Building, BarChart3, GraduationCap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_GROUPS: { title: string; items: { href: string; label: string; icon: any; perm: string }[] }[] = [
  {
    title: "نظرة عامة",
    items: [
      { href: "/admin", label: "لوحة المعلومات", icon: LayoutDashboard, perm: "dashboard" },
    ],
  },
  {
    title: "المدارس",
    items: [
      { href: "/admin/schools", label: "المدارس", icon: Building2, perm: "schools" },
      { href: "/admin/governorates", label: "المحافظات", icon: Map, perm: "governorates" },
      { href: "/admin/cities", label: "المدن والإدارات", icon: MapPin, perm: "cities" },
    ],
  },
  {
    title: "المحتوى",
    items: [
      { href: "/admin/news", label: "الأخبار", icon: Newspaper, perm: "news" },
      { href: "/admin/announcements", label: "الإعلانات", icon: Megaphone, perm: "announcements" },
      { href: "/admin/faq", label: "الأسئلة الشائعة", icon: HelpCircle, perm: "faq" },
      { href: "/admin/documents", label: "المستندات", icon: FileText, perm: "documents" },
      { href: "/admin/media", label: "مكتبة الوسائط", icon: Image, perm: "media" },
    ],
  },
  {
    title: "النظام",
    items: [
      { href: "/admin/reports", label: "التقارير", icon: BarChart3, perm: "reports" },
      { href: "/admin/reports/students", label: "طلبات الطلاب", icon: GraduationCap, perm: "reports" },
      { href: "/admin/reports/teachers", label: "طلبات المعلمين", icon: Users, perm: "reports" },
      { href: "/admin/users", label: "المستخدمون", icon: Users, perm: "users" },
      { href: "/admin/audit", label: "سجل التغييرات", icon: ScrollText, perm: "audit" },
      { href: "/admin/settings", label: "الإعدادات", icon: Settings, perm: "settings" },
    ],
  },
];

export function AdminSidebar({
  user,
  permissions,
}: {
  user: { name: string; email: string; roleName: string };
  permissions: string[];
}) {
  const roleName = user.roleName;
  const isSuperOrAdmin = roleName === "super-admin" || roleName === "admin";
  const canViewStudentApps = isSuperOrAdmin || roleName === "student-admission-manager";
  const canViewTeacherApps = isSuperOrAdmin || roleName === "teacher-admission-manager";
  const canViewReports = isSuperOrAdmin || roleName === "student-admission-manager" || roleName === "teacher-admission-manager";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const perms = new Set(permissions);

  const has = (mod: string) => perms.has("*") || perms.has(`${mod}.*`) || perms.has(`${mod}.view`);

  return (
    <>
      {/* mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          { }
          <img src="/ejs-logo.png" alt="EJS" className="h-9 w-9 rounded-lg object-contain ring-1 ring-primary/10 bg-white p-0.5" />
          <span className="font-extrabold">لوحة الإدارة</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-72 transform border-l border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="hidden items-center gap-2.5 border-b border-sidebar-border p-5 lg:flex">
            { }
            <img src="/ejs-logo.png" alt="EJS" className="h-10 w-10 rounded-xl object-contain ring-1 ring-primary/10 bg-white p-0.5" />
            <div className="leading-tight">
              <div className="font-extrabold text-sidebar-foreground">لوحة الإدارة</div>
              <div className="text-[11px] text-muted-foreground">المدارس المصرية اليابانية</div>
            </div>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto p-4 scroll-area-custom">
            {NAV_GROUPS.map((group) => {
              let visible = group.items.filter((it) => has(it.perm));
              // Role-gate the reports sub-items
              visible = visible.filter((it) => {
                if (it.href === "/admin/reports/students") return canViewStudentApps;
                if (it.href === "/admin/reports/teachers") return canViewTeacherApps;
                if (it.href === "/admin/reports") return canViewReports;
                // admission managers only see reports-related + dashboard; hide other system modules
                if (!isSuperOrAdmin && (roleName === "student-admission-manager" || roleName === "teacher-admission-manager")) {
                  // hide users/audit/settings from admission managers (they manage applications only)
                  if (it.href === "/admin/users" || it.href === "/admin/settings") return false;
                }
                return true;
              });
              if (visible.length === 0) return null;
              return (
                <div key={group.title}>
                  <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {group.title}
                  </div>
                  <div className="space-y-0.5">
                    {visible.map((it) => {
                      const active = it.href === "/admin" ? pathname === "/admin" : pathname.startsWith(it.href);
                      return (
                        <Link
                          key={it.href}
                          href={it.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            active
                              ? "bg-primary text-primary-foreground shadow-soft"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                        >
                          <it.icon className="h-4.5 w-4.5 shrink-0" />
                          {it.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-4">
            <div className="mb-3 flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{user.name}</div>
                <div className="truncate text-[11px] text-muted-foreground" dir="ltr">{user.email}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link href="/">عرض الموقع</Link>
              </Button>
              <Button
                variant="outline" size="sm" className="flex-1 text-rose-600 hover:bg-rose-50"
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
              >
                <LogOut className="ml-1.5 h-4 w-4" /> خروج
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* overlay */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
