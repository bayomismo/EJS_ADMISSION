"use client";

import { useState } from "react";
import { Megaphone, X } from "lucide-react";
import type { SiteSettings } from "@/lib/constants";

export function AnnouncementBar({ settings }: { settings: SiteSettings }) {
  const text = settings.general.announcementBarText;
  const [show, setShow] = useState(() => {
    if (!settings.general.announcementBarEnabled || !text) return false;
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem("ejs-ann-dismissed") !== "1";
  });

  if (!show || !text) return null;

  return (
    <div className="relative bg-gradient-to-l from-primary via-primary to-blue-900 text-primary-foreground">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
        <Megaphone className="h-4 w-4 shrink-0" />
        <p className="flex-1 text-center text-sm font-medium leading-snug">{text}</p>
        <button
          onClick={() => {
            sessionStorage.setItem("ejs-ann-dismissed", "1");
            setShow(false);
          }}
          className="rounded-md p-1 hover:bg-white/15"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
