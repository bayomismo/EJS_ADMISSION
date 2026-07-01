import { db } from "@/lib/db";
import {
  DEFAULT_SETTINGS,
  SETTING_KEYS,
  type SiteSettings,
  type AdmissionSettings,
} from "@/lib/constants";
import { cacheDelete, cacheMemo } from "@/lib/cache";

// Read a single settings group as typed object
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting<T>(key: string, group: string, value: T): Promise<void> {
  const json = JSON.stringify(value);
  await db.setting.upsert({
    where: { key },
    create: { key, value: json, group },
    update: { value: json, group },
  });
  cacheDelete("settings:");
}

// Full settings object (cached)
export async function getSiteSettings(): Promise<SiteSettings> {
  return cacheMemo("settings:all", 60_000, async () => {
    const [admission, branding, contact, social, seo, general] = await Promise.all([
      getSetting(SETTING_KEYS.admission, DEFAULT_SETTINGS.admission),
      getSetting(SETTING_KEYS.branding, DEFAULT_SETTINGS.branding),
      getSetting(SETTING_KEYS.contact, DEFAULT_SETTINGS.contact),
      getSetting(SETTING_KEYS.social, DEFAULT_SETTINGS.social),
      getSetting(SETTING_KEYS.seo, DEFAULT_SETTINGS.seo),
      getSetting(SETTING_KEYS.general, DEFAULT_SETTINGS.general),
    ]);
    return { admission, branding, contact, social, seo, general } as SiteSettings;
  });
}

export async function getAdmissionSettings(): Promise<AdmissionSettings> {
  const all = await getSiteSettings();
  return all.admission;
}

// Compute live status. Admin's explicit status is respected, with dates
// refining the countdown and auto-transitions:
//  - CLOSED  -> always closed (manual override)
//  - UPCOMING -> countdown to open; if open date passed, becomes open
//  - OPEN    -> countdown to close; if close date passed, becomes closed
export function computeLiveStatus(
  s: AdmissionSettings
): { status: AdmissionSettings["status"]; label: string; daysLeft: number | null } {
  const now = Date.now();
  const open = s.openDate ? new Date(s.openDate).getTime() : null;
  const close = s.closeDate ? new Date(s.closeDate).getTime() : null;

  // explicit manual close always wins
  if (s.status === "CLOSED") {
    return { status: "CLOSED", label: "مغلق", daysLeft: null };
  }

  // upcoming: if open date passed, switch to open
  if (s.status === "UPCOMING") {
    if (open && now < open) {
      return { status: "UPCOMING", label: "قريباً", daysLeft: Math.ceil((open - now) / 86400000) };
    }
    // open date passed -> open
    if (close && now < close) {
      return { status: "OPEN", label: "مفتوح", daysLeft: Math.max(0, Math.ceil((close - now) / 86400000)) };
    }
    return { status: "CLOSED", label: "مغلق", daysLeft: null };
  }

  // OPEN: respect until close date
  if (s.status === "OPEN") {
    if (open && now < open) {
      return { status: "UPCOMING", label: "قريباً", daysLeft: Math.ceil((open - now) / 86400000) };
    }
    if (close && now > close) {
      return { status: "CLOSED", label: "مغلق", daysLeft: null };
    }
    if (close) {
      return { status: "OPEN", label: "مفتوح", daysLeft: Math.max(0, Math.ceil((close - now) / 86400000)) };
    }
    return { status: "OPEN", label: "مفتوح", daysLeft: null };
  }

  return { status: s.status, label: s.status === "OPEN" ? "مفتوح" : s.status === "UPCOMING" ? "قريباً" : "مغلق", daysLeft: null };
}
