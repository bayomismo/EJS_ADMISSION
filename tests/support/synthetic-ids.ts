/**
 * Synthetic Egyptian national IDs for tests (T1.2). NEVER use real IDs.
 *
 * Layout used by src/lib/egyptian-id.ts (14 digits):
 *   [0]      century: 2 = 1900s, 3 = 2000s
 *   [1..2]   YY   [3..4] MM   [5..6] DD
 *   [7..8]   governorate code
 *   [9..11]  sequence
 *   [12]     gender digit: odd = MALE, even = FEMALE
 *   [13]     check digit
 *
 * Safety: the governorate code is always "00", which is not an assigned
 * Egyptian governorate code, so a generated value cannot be a real person's
 * national ID even though it is format-valid for the parser under test.
 */

export const SYNTHETIC_GOVERNORATE_CODE = "00";

export interface SyntheticIdOptions {
  year: number; // full year, 1900-2099
  month: number; // 1-12 (not validated here on purpose: tests need invalid dates)
  day: number; // 1-31 (not validated here on purpose)
  gender: "MALE" | "FEMALE";
  /** 0-999, distinguishes otherwise-identical IDs. */
  serial?: number;
}

const pad = (n: number, width: number) => String(n).padStart(width, "0");

export function syntheticNationalId({ year, month, day, gender, serial = 1 }: SyntheticIdOptions): string {
  if (year < 1900 || year > 2099) throw new RangeError("year must be 1900-2099");
  if (serial < 0 || serial > 999) throw new RangeError("serial must be 0-999");
  const century = year >= 2000 ? "3" : "2";
  const genderDigit = gender === "MALE" ? "1" : "2";
  const id =
    century +
    pad(year % 100, 2) +
    pad(month, 2) +
    pad(day, 2) +
    SYNTHETIC_GOVERNORATE_CODE +
    pad(serial, 3) +
    genderDigit +
    "0"; // check digit: not verified by the parser under test
  if (!/^\d{14}$/.test(id)) throw new Error("generated ID is not 14 digits");
  return id;
}
