// Egyptian national ID (الرقم القومي) parsing + age calculation + grade mapping.
//
// Egyptian National ID format (14 digits):
//   [0]      century: '2' = born 1900-1999, '3' = born 2000-2099
//   [1..2]   year within century (YY)
//   [3..4]   month (MM)
//   [5..6]   day (DD) — the 7th digit parity also encodes gender, but for
//            age we use digits 5-6 as the day directly (standard practice)
//   [7..12]  governorate/sequence/check
//   [13]     gender marker parity (odd=male, even=female) — commonly digit 12

export interface ParsedId {
  valid: boolean;
  birthDate: Date | null;
  gender: "MALE" | "FEMALE" | null;
  year: number | null;
  month: number | null;
  day: number | null;
  error?: string;
}

export function parseEgyptianId(id: string): ParsedId {
  const clean = (id || "").replace(/\D/g, "");
  if (clean.length !== 14) {
    return { valid: false, birthDate: null, gender: null, year: null, month: null, day: null, error: "الرقم القومي يجب أن يكون ١٤ رقماً" };
  }
  const centuryDigit = clean[0];
  if (centuryDigit !== "2" && centuryDigit !== "3") {
    return { valid: false, birthDate: null, gender: null, year: null, month: null, day: null, error: "الرقم الأول للرقم القومي غير صحيح" };
  }
  const century = centuryDigit === "3" ? 2000 : 1900;
  const year = century + parseInt(clean.slice(1, 3), 10);
  const month = parseInt(clean.slice(3, 5), 10);
  const day = parseInt(clean.slice(5, 7), 10);
  if (month < 1 || month > 12) {
    return { valid: false, birthDate: null, gender: null, year, month: null, day: null, error: "شهر الميلاد في الرقم القومي غير صحيح" };
  }
  if (day < 1 || day > 31) {
    return { valid: false, birthDate: null, gender: null, year, month, day: null, error: "يوم الميلاد في الرقم القومي غير صحيح" };
  }
  const birthDate = new Date(year, month - 1, day);
  // gender: digit at index 12 (13th digit) — odd=male, even=female
  const genderDigit = parseInt(clean[12], 10);
  const gender: "MALE" | "FEMALE" = genderDigit % 2 === 1 ? "MALE" : "FEMALE";
  return { valid: true, birthDate, gender, year, month, day };
}

/**
 * Calculate the student's age as of October 1st of the given admission year.
 * This is the official EJS cutoff date.
 */
export function ageOnOctoberFirst(birthDate: Date, admissionYear: number): number {
  const cutoff = new Date(admissionYear, 9, 1); // October = month index 9
  let age = cutoff.getFullYear() - birthDate.getFullYear();
  // adjust if birthday hasn't occurred by Oct 1
  const oct1ThisYear = new Date(cutoff.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (oct1ThisYear > cutoff) {
    age -= 1;
  }
  return age;
}

/**
 * Map an age (as of Oct 1) to the appropriate grade for EJS.
 * EJS serves KG1 through later grades; standard Egyptian age bands:
 *   4 years → KG1
 *   5 years → KG2
 *   6 years → Grade 1
 *   7 years → Grade 2
 *   8 years → Grade 3
 *   9 years → Grade 4
 *  10 years → Grade 5
 *  11 years → Grade 6
 */
export interface GradeInfo {
  gradeId: string;
  gradeName: string;
  minAge: number;
}

export const AGE_GRADE_MAP: { gradeId: string; gradeName: string; minAge: number; maxAge: number }[] = [
  // gradeName values match the seeded DB Grade.nameAr exactly so auto-populate
  // can resolve the gradeId by name lookup.
  { gradeId: "kg1", gradeName: "رياض أطفال 1", minAge: 4, maxAge: 4 },
  { gradeId: "kg2", gradeName: "رياض أطفال 2", minAge: 5, maxAge: 5 },
  { gradeId: "g1", gradeName: "الصف الأول الابتدائي", minAge: 6, maxAge: 6 },
  { gradeId: "g2", gradeName: "الصف الثاني الابتدائي", minAge: 7, maxAge: 7 },
  { gradeId: "g3", gradeName: "الصف الثالث الابتدائي", minAge: 8, maxAge: 8 },
  { gradeId: "g4", gradeName: "الصف الرابع الابتدائي", minAge: 9, maxAge: 9 },
  { gradeId: "g5", gradeName: "الصف الخامس الابتدائي", minAge: 10, maxAge: 10 },
  { gradeId: "g6", gradeName: "الصف السادس الابتدائي", minAge: 11, maxAge: 11 },
];

export function gradeForAge(age: number): { gradeId: string; gradeName: string } | null {
  const match = AGE_GRADE_MAP.find((g) => age >= g.minAge && age <= g.maxAge);
  if (match) return { gradeId: match.gradeId, gradeName: match.gradeName };
  if (age < 4) return { gradeId: "too-young", gradeName: "عمر الطفل أقل من المطلوب للقبول (٤ سنوات كحد أدنى)" };
  return { gradeId: "too-old", gradeName: "عمر الطفل يتجاوز المراحل المتاحة بالمدارس المصرية اليابانية" };
}

/**
 * Full computation: given an Egyptian national ID and an admission year,
 * return parsed info + age + recommended grade.
 */
export function computeStudentPlacement(id: string, admissionYear: number) {
  const parsed = parseEgyptianId(id);
  if (!parsed.valid || !parsed.birthDate) {
    return { parsed, age: null, grade: null };
  }
  const age = ageOnOctoberFirst(parsed.birthDate, admissionYear);
  const grade = gradeForAge(age);
  return { parsed, age, grade };
}
