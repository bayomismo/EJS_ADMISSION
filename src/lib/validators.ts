// Shared client-side validation helpers for the public apply forms.
// These mirror the server-side Zod rules so users see inline errors
// immediately instead of waiting for a server round-trip.

/** Egyptian mobile: exactly 11 digits, starts with 01. */
export const EGYPT_PHONE_REGEX = /^01[0-9]{9}$/;
export const EGYPT_PHONE_HELPER = "11 رقماً يبدأ بـ 01";

/** Arabic chars + whitespace + tatweel + diacritics allowed. */
export const ARABIC_TEXT_REGEX = /^[\u0600-\u06FF\s\u0640\u064B-\u0652\u0670]+$/;
export const ARABIC_TEXT_HELPER = "حروف عربية فقط (بدون أرقام أو حروف إنجليزية)";

/** English letters + spaces + common punctuation. */
export const ENGLISH_TEXT_REGEX = /^[A-Za-z\s.'\-,]+$/;
export const ENGLISH_TEXT_HELPER = "حروف إنجليزية فقط";

/** Egyptian national ID: 14 digits, must start with 2 or 3. */
export const EGYPT_NID_REGEX = /^[23][0-9]{13}$/;
export const EGYPT_NID_HELPER = "14 رقماً، يبدأ بـ 2 أو 3";

/** Strip all non-digit chars. */
export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** Strip all non-Arabic chars (keeps Arabic letters, whitespace, tatweel, diacritics). */
export function arabicOnly(s: string): string {
  return s.replace(/[^\u0600-\u06FF\s\u0640\u064B-\u0652\u0670]/g, "");
}

/** Strip all non-English chars (keeps A-Z, a-z, whitespace, common punctuation). */
export function englishOnly(s: string): string {
  return s.replace(/[^A-Za-z\s.'\-,]/g, "");
}

/** Validate phone, returning the error message or null. */
export function validatePhone(v: string): string | null {
  const d = digitsOnly(v);
  if (!d) return "رقم الهاتف مطلوب";
  if (d.length !== 11) return `رقم الهاتف يجب أن يكون ${EGYPT_PHONE_HELPER} (حالياً ${d.length} رقم)`;
  if (!/^01/.test(d)) return "رقم الهاتف يجب أن يبدأ بـ 01";
  return null;
}

/** Validate national ID, returning error or null. */
export function validateNationalId(v: string): string | null {
  const d = digitsOnly(v);
  if (!d) return "الرقم القومي مطلوب";
  if (d.length !== 14) return `الرقم القومي يجب أن يكون ${EGYPT_NID_HELPER} (حالياً ${d.length} رقم)`;
  if (!/^[23]/.test(d)) return "الرقم القومي يجب أن يبدأ بـ 2 أو 3";
  return null;
}

/**
 * Format an age as سنوات/شهور/أيام. Computes the exact gap from birthDate to today.
 * Returns a localized Arabic string.
 */
export function formatAgeArabic(birthDate: Date | string | null | undefined): string {
  if (!birthDate) return "";
  const b = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (isNaN(b.getTime())) return "";

  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  let months = now.getMonth() - b.getMonth();
  let days = now.getDate() - b.getDate();

  if (days < 0) {
    months -= 1;
    // Days in the previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${toEasternArabic(years)} سنوات`);
  if (months > 0) parts.push(`${toEasternArabic(months)} أشهر`);
  if (days > 0 || parts.length === 0) parts.push(`${toEasternArabic(days)} أيام`);
  return parts.join(" و ");
}

/** Convert latin digits to eastern-arabic (٠-٩). */
export function toEasternArabic(n: number): string {
  const map = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(n).replace(/[0-9]/g, (d) => map[Number(d)]);
}

/**
 * Convert a national ID (YYYYMMDD + governorate + sequence) into a Date.
 * The 1st digit = century (2 = 1900s, 3 = 2000s).
 */
export function parseNationalIdBirthDate(nationalId: string): Date | null {
  if (!EGYPT_NID_REGEX.test(nationalId)) return null;
  const century = nationalId[0] === "2" ? 1900 : 2000;
  const yyyy = century + Number(nationalId.slice(1, 3));
  const mm = Number(nationalId.slice(3, 5));
  const dd = Number(nationalId.slice(5, 7));
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return d;
}