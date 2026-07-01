// Arabic text normalization for search/matching.
// Handles common equivalences so search is forgiving for Arabic users.

export function normalizeArabic(input: string): string {
  if (!input) return "";
  return input
    .trim()
    .toLowerCase()
    // unify alef forms
    .replace(/[إأآا]/g, "ا")
    // unify ya
    .replace(/ى/g, "ي")
    // unify ta marbuta
    .replace(/ة/g, "ه")
    // remove diacritics (tashkeel)
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    // remove tatweel
    .replace(/\u0640/g, "")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

export function arabicContains(haystack: string, needle: string): boolean {
  if (!needle) return true;
  return normalizeArabic(haystack).includes(normalizeArabic(needle));
}

// Convert latin digits to eastern-arabic (٠-٩)
export function toArabicDigits(value: string | number): string {
  const map = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(value).replace(/[0-9]/g, (d) => map[Number(d)]);
}

export function toArabicNumber(value: number): string {
  return toArabicDigits(value.toLocaleString("en-US"));
}

// Format a number with arabic thousands separators using arabic digits
export function formatArabicNumber(value: number): string {
  return toArabicDigits(value.toLocaleString("en-US"));
}
