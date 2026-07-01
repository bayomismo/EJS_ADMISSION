/**
 * Caching layer using Next 16 `unstable_cache` + `revalidateTag`.
 *
 * Each cached function declares the tags it depends on; mutating routes
 * call `revalidateTag(tag)` after a write to invalidate the relevant caches
 * across all server instances.
 *
 * Replaces the previous process-local Map (`src/lib/cache.ts`) which
 * desynced under multi-pod deploys.
 */
import { unstable_cache } from "next/cache";

export const TAGS = {
  SETTINGS: "settings",
  SCHOOLS: "schools",
  GOVERNORATES: "governorates",
  CITIES: "cities",
  NEWS: "news",
  FAQ: "faq",
  DOCUMENTS: "documents",
  ANNOUNCEMENTS: "announcements",
  PAGES: "pages",
  BANNERS: "banners",
  MENUS: "menus",
  HOME: "home", // aggregate for the homepage
} as const;

/**
 * Wrap an async fetcher with a tag-based cache. Use this for read-only
 * multi-row reads that change infrequently.
 *
 *   const getSchools = tagged(TAGS.SCHOOLS, 300, () => db.school.findMany(...));
 *   const schools = await getSchools();
 */
export function tagged<TArgs extends unknown[], TResult>(
  tag: string,
  ttlSec: number,
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return unstable_cache(fn, [tag], { tags: [tag], revalidate: ttlSec }) as (
    ...args: TArgs
  ) => Promise<TResult>;
}

/** Re-export for call sites that want to invalidate. */
export { revalidateTag } from "next/cache";
