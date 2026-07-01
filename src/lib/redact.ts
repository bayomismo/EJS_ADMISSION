/**
 * PII redaction for admin list/detail views.
 *
 * Field-level access control: super-admin and admin get full values;
 * admission managers and other roles get redacted views.
 */

export function last4(s: string | null | undefined): string {
  if (!s) return "";
  if (s.length <= 4) return "•".repeat(s.length);
  return "•".repeat(s.length - 4) + s.slice(-4);
}

export function maskEmail(e: string | null | undefined): string {
  if (!e) return "";
  const [user, domain] = e.split("@");
  if (!user || !domain) return "•••";
  return `${user[0] || ""}${"•".repeat(Math.max(1, user.length - 1))}@${domain}`;
}

export function maskPhone(p: string | null | undefined): string {
  if (!p) return "";
  if (p.length <= 4) return "•".repeat(p.length);
  return `${p.slice(0, 3)}${"•".repeat(p.length - 6)}${p.slice(-3)}`;
}

/** Returns true when the caller's role is allowed to see full PII. */
export function canSeeFullPII(roleName: string | undefined): boolean {
  return roleName === "super-admin" || roleName === "admin";
}

/** Mask a student application row for list view when the caller is NOT
 *  allowed full PII. Keeps operational fields visible (name, status, school)
 *  and redacts nationalId/guardianPhone/guardianEmail/guardianNationalId. */
export function redactStudentApp<T extends Record<string, any>>(
  row: T,
  canSeeFull: boolean,
): T {
  if (canSeeFull) return row;
  if (!row) return row;
  return {
    ...row,
    nationalId: last4(row.nationalId),
    guardianNationalId: last4(row.guardianNationalId),
    guardianPhone: maskPhone(row.guardianPhone),
    guardianEmail: maskEmail(row.guardianEmail),
  };
}

export function redactTeacherApp<T extends Record<string, any>>(
  row: T,
  canSeeFull: boolean,
): T {
  if (canSeeFull) return row;
  if (!row) return row;
  return {
    ...row,
    nationalId: last4(row.nationalId),
    phone: maskPhone(row.phone),
    email: maskEmail(row.email),
  };
}
