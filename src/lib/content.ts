// ContentBlock helper: read a CMS block with hardcoded fallback.
//
// Every page reads marketing/intro text through this function. If the
// block is missing, empty, or inactive, the hardcoded fallback is
// returned — the public site never breaks because of a missing block.
//
// Usage:
//   import { getContent } from "@/lib/content";
//   const heroTitle = await getContent("home.hero.title", "المدارس المصرية اليابانية");
//
// Performance note: pages should call getContent() per key they need
// rather than fetching everything, since we want to lazy-load.

import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export interface ContentBlockResult {
  valueAr: string;
  valueEn: string | null;
}

/**
 * Read a single block. Returns the fallback if the block is missing or
 * the value is empty. Wrapped in `cache()` so multiple calls on the
 * same render only hit the DB once.
 */
export const getContent = cache(async function getContent(
  key: string,
  fallbackAr: string,
  fallbackEn?: string,
  substitutions?: Record<string, string | number>,
): Promise<string> {
  try {
    const row = await db.contentBlock.findUnique({
      where: { key },
      select: { valueAr: true, valueEn: true, isActive: true },
    });
    let value: string;
    if (!row || !row.isActive || !row.valueAr.trim()) {
      value = fallbackAr;
    } else {
      value = row.valueAr;
    }
    return applySubstitutions(value, substitutions);
  } catch (err) {
    // On any DB failure, fall back silently so the page renders.
    console.error(`[content] getContent(${key}) failed:`, err);
    return applySubstitutions(fallbackAr, substitutions);
  }
});

/** Replace {key} placeholders with the provided values. Missing keys are left as-is. */
function applySubstitutions(text: string, subs?: Record<string, string | number>): string {
  if (!subs) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in subs ? String(subs[k]) : m));
}

/**
 * Bilingual variant: returns { ar, en } with per-locale fallbacks.
 * English falls back to Arabic if not provided separately.
 */
export const getContentBilingual = cache(async function getContentBilingual(
  key: string,
  fallbackAr: string,
  fallbackEn?: string,
): Promise<{ ar: string; en: string }> {
  try {
    const row = await db.contentBlock.findUnique({
      where: { key },
      select: { valueAr: true, valueEn: true, isActive: true },
    });
    if (!row || !row.isActive) {
      return { ar: fallbackAr, en: fallbackEn || fallbackAr };
    }
    return {
      ar: row.valueAr.trim() || fallbackAr,
      en: (row.valueEn && row.valueEn.trim()) || fallbackEn || row.valueAr.trim() || fallbackAr,
    };
  } catch {
    return { ar: fallbackAr, en: fallbackEn || fallbackAr };
  }
});

/**
 * Fetch every block in a group. Useful for admin preview or for pages
 * that render many blocks at once.
 */
export const getContentGroup = cache(async function getContentGroup(
  group: string,
): Promise<Record<string, { valueAr: string; valueEn: string | null }>> {
  const rows = await db.contentBlock.findMany({
    where: { group, isActive: true },
    select: { key: true, valueAr: true, valueEn: true },
  });
  const out: Record<string, { valueAr: string; valueEn: string | null }> = {};
  for (const r of rows) out[r.key] = { valueAr: r.valueAr, valueEn: r.valueEn };
  return out;
});

/** Standard groups for the admin UI. */
export const CONTENT_GROUPS = {
  homepage: { label: "الصفحة الرئيسية", icon: "🏠" },
  "admission.students": { label: "تقديم الطلاب", icon: "🎓" },
  "admission.teachers": { label: "تقديم المعلمين", icon: "👨‍🏫" },
  footer: { label: "الفوتر", icon: "📋" },
  general: { label: "عام", icon: "📝" },
} as const;

export type ContentGroup = keyof typeof CONTENT_GROUPS;