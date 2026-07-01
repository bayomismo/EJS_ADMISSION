/**
 * Shared Zod schemas. Imported by both API routes and form components
 * so server and client validate against the same rules.
 *
 * Pattern: define a schema, derive the form's TS type via z.infer<>.
 *
 * NOTE: this is the initial set. As Sprint 2 progresses, more entity schemas
 * will move here. Each route is expected to import its schema and call
 * schema.safeParse() once.
 */
import { z } from "zod";

// ── Field-level constraints used across forms ──

/** Strict 14-digit numeric. */
export const nationalIdSchema = z
  .string()
  .length(14, "الرقم القومي يجب أن يكون ١٤ رقم")
  .regex(/^\d{14}$/, "الرقم القومي يجب أن يكون أرقاماً فقط")
  .refine((v) => v[0] === "2" || v[0] === "3", "الرقم الأول للرقم القومي يجب أن يكون 2 أو 3");

/** Egyptian mobile: 01[0-9]{9} */
export const egyptPhoneSchema = z
  .string()
  .regex(/^01[0-9]{9}$/, "رقم الهاتف يجب أن يبدأ بـ 01 ويتكون من ١١ رقماً");

export const emailSchema = z.string().email("بريد إلكتروني غير صحيح");

/** A pair of email + retype. */
export const emailWithRetypeSchema = z
  .object({
    email: emailSchema,
    emailRetype: emailSchema,
  })
  .refine((d) => d.email.toLowerCase() === d.emailRetype.toLowerCase(), {
    message: "البريد الإلكتروني وتأكيده غير متطابقين",
    path: ["emailRetype"],
  });

// ── Public application schemas ──

export const studentApplicationSchema = z.object({
  studentNameAr: z.string().min(3, "اسم الطالب بالعربية (٣ أحرف على الأقل)").max(120),
  studentNameEn: z.string().max(120).optional().nullable(),
  birthDate: z.string().min(6, "تاريخ الميلاد مطلوب"),
  gender: z.enum(["MALE", "FEMALE", "MIXED"]),
  nationalId: nationalIdSchema,
  nationality: z.string().default("مصري"),
  guardianName: z.string().min(3, "اسم ولي الأمر (٣ أحرف على الأقل)").max(120),
  guardianRelation: z.string().min(2).max(40),
  guardianPhone: egyptPhoneSchema,
  guardianEmail: emailSchema,
  guardianEmailConfirm: emailSchema,
  guardianNationalId: nationalIdSchema,
  guardianOccupation: z.string().max(120).optional().nullable(),
  governorateId: z.string().min(1),
  cityId: z.string().min(1),
  schoolId: z.string().min(1),
  gradeId: z.string().min(1),
  previousSchool: z.string().max(200).optional().nullable(),
  addressAr: z.string().min(3, "العنوان (٣ أحرف على الأقل)").max(400),
  skillsAnswers: z.string().max(20000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "يجب الموافقة على الشروط" }) }),
  termsVersion: z.string().min(1),
}).refine(
  (d) => d.guardianEmail.toLowerCase() === d.guardianEmailConfirm.toLowerCase(),
  { message: "البريد الإلكتروني وتأكيده غير متطابقين", path: ["guardianEmailConfirm"] },
);

export const teacherApplicationSchema = z.object({
  fullNameAr: z.string().min(3).max(120),
  fullNameEn: z.string().max(120).optional().nullable(),
  birthDate: z.string().min(6),
  gender: z.enum(["MALE", "FEMALE", "MIXED"]),
  nationalId: nationalIdSchema,
  nationality: z.string().default("مصري"),
  phone: egyptPhoneSchema,
  email: emailSchema.optional().nullable(),
  addressAr: z.string().min(3).max(400),
  qualification: z.string().min(2).max(60),
  university: z.string().min(2).max(200),
  graduationYear: z.number().int().min(1970).max(new Date().getFullYear()),
  specialization: z.string().max(200).optional().nullable(),
  subjects: z.string().max(2000).optional().nullable(),
  yearsOfExperience: z.number().int().min(0).default(0),
  currentEmployer: z.string().max(200).optional().nullable(),
  currentPosition: z.string().max(200).optional().nullable(),
  hasTeachingCert: z.boolean().default(false),
  preferredGovernorateId: z.string().optional().nullable(),
  cvUrl: z.string().url().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "يجب الموافقة على الشروط" }) }),
  termsVersion: z.string().min(1),
});

export type StudentApplicationInput = z.infer<typeof studentApplicationSchema>;
export type TeacherApplicationInput = z.infer<typeof teacherApplicationSchema>;
