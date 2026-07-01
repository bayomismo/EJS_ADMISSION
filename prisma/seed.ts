import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import {
  SYSTEM_PERMISSIONS,
  SYSTEM_ROLES,
  ROLE_PERMISSION_MATRIX,
  permissionKeysForRole,
} from "../src/lib/permissions";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "../src/lib/constants";

const db = new PrismaClient();

// 27 Egyptian governorates with English names
const GOVERNORATES: { nameAr: string; nameEn: string }[] = [
  { nameAr: "القاهرة", nameEn: "Cairo" },
  { nameAr: "الجيزة", nameEn: "Giza" },
  { nameAr: "الإسكندرية", nameEn: "Alexandria" },
  { nameAr: "الدقهلية", nameEn: "Dakahlia" },
  { nameAr: "الشرقية", nameEn: "Sharqia" },
  { nameAr: "القليوبية", nameEn: "Qalyubia" },
  { nameAr: "الغربية", nameEn: "Gharbia" },
  { nameAr: "المنوفية", nameEn: "Menoufia" },
  { nameAr: "البحيرة", nameEn: "Beheira" },
  { nameAr: "كفر الشيخ", nameEn: "Kafr El Sheikh" },
  { nameAr: "دمياط", nameEn: "Damietta" },
  { nameAr: "بورسعيد", nameEn: "Port Said" },
  { nameAr: "الإسماعيلية", nameEn: "Ismailia" },
  { nameAr: "السويس", nameEn: "Suez" },
  { nameAr: "أسيوط", nameEn: "Asyut" },
  { nameAr: "سوهاج", nameEn: "Sohag" },
  { nameAr: "قنا", nameEn: "Qena" },
  { nameAr: "الأقصر", nameEn: "Luxor" },
  { nameAr: "أسوان", nameEn: "Aswan" },
  { nameAr: "الفيوم", nameEn: "Faiyum" },
  { nameAr: "بني سويف", nameEn: "Beni Suef" },
  { nameAr: "المنيا", nameEn: "Minya" },
  { nameAr: "مطروح", nameEn: "Matrouh" },
  { nameAr: "البحر الأحمر", nameEn: "Red Sea" },
  { nameAr: "الوادي الجديد", nameEn: "New Valley" },
  { nameAr: "شمال سيناء", nameEn: "North Sinai" },
  { nameAr: "جنوب سيناء", nameEn: "South Sinai" },
];

// Cities/districts per governorate (representative)
const CITIES: Record<string, { nameAr: string; nameEn: string }[]> = {
  "القاهرة": [
    { nameAr: "حدائق الزيتون", nameEn: "Hadaeq El Zaytoun" },
    { nameAr: "الساحل", nameEn: "El Sahel" },
    { nameAr: "مدينة نصر", nameEn: "Nasr City" },
    { nameAr: "المعادي", nameEn: "Maadi" },
    { nameAr: "شبرا", nameEn: "Shubra" },
    { nameAr: "حلوان", nameEn: "Helwan" },
  ],
  "الجيزة": [
    { nameAr: "الهرم", nameEn: "Haram" },
    { nameAr: "6 أكتوبر", nameEn: "6th of October" },
    { nameAr: "الدقي", nameEn: "Dokki" },
    { nameAr: "الشيخ زايد", nameEn: "Sheikh Zayed" },
    { nameAr: "فيصل", nameEn: "Faisal" },
  ],
  "الإسكندرية": [
    { nameAr: "العجمي", nameEn: "Agami" },
    { nameAr: "برج العرب", nameEn: "Borg El Arab" },
    { nameAr: "سيدي بشر", nameEn: "Sidi Bishr" },
    { nameAr: "سموحة", nameEn: "Smouha" },
    { nameAr: "المعمورة", nameEn: "Montaza" },
  ],
  "الدقهلية": [
    { nameAr: "المنصورة", nameEn: "Mansoura" },
    { nameAr: "طلخا", nameEn: "Talkha" },
    { nameAr: "ميت غمر", nameEn: "Mit Ghamr" },
  ],
  "الشرقية": [
    { nameAr: "الزقازيق", nameEn: "Zagazig" },
    { nameAr: "العاشر من رمضان", nameEn: "10th of Ramadan" },
    { nameAr: "بلبيس", nameEn: "Belbeis" },
  ],
  "القليوبية": [
    { nameAr: "بنها", nameEn: "Banha" },
    { nameAr: "قليوب", nameEn: "Qalyub" },
    { nameAr: "شبين القناطر", nameEn: "Shubra El Kheima" },
  ],
  "الغربية": [
    { nameAr: "طنطا", nameEn: "Tanta" },
    { nameAr: "المحلة الكبرى", nameEn: "Mahalla" },
    { nameAr: "كفر الزيات", nameEn: "Kafr El Zayyat" },
  ],
  "المنوفية": [
    { nameAr: "شبين الكوم", nameEn: "Shibin El Kom" },
    { nameAr: "منوف", nameEn: "Menouf" },
    { nameAr: " Sadat", nameEn: "Sadat City" },
    { nameAr: "مدينة السادات", nameEn: "Sadat City" },
  ],
  "البحيرة": [
    { nameAr: "دمنهور", nameEn: "Damanhour" },
    { nameAr: "كفر الدوار", nameEn: "Kafr El Dawwar" },
    { nameAr: "رشيد", nameEn: "Rashid" },
  ],
  "أسيوط": [
    { nameAr: "أسيوط", nameEn: "Asyut" },
    { nameAr: "ديروط", nameEn: "Dairut" },
  ],
  "سوهاج": [
    { nameAr: "سوهاج", nameEn: "Sohag" },
    { nameAr: "جرجا", nameEn: "Girga" },
  ],
  "أسوان": [
    { nameAr: "أسوان", nameEn: "Aswan" },
    { nameAr: "كوم أمبو", nameEn: "Kom Ombo" },
  ],
  "الأقصر": [{ nameAr: "الأقصر", nameEn: "Luxor" }],
  "بورسعيد": [{ nameAr: "بورسعيد", nameEn: "Port Said" }],
  "الإسماعيلية": [{ nameAr: "الإسماعيلية", nameEn: "Ismailia" }],
  "دمياط": [{ nameAr: "دمياط", nameEn: "Damietta" }, { nameAr: "رأس البر", nameEn: "Ras El Bar" }],
  "السويس": [{ nameAr: "السويس", nameEn: "Suez" }],
  "كفر الشيخ": [{ nameAr: "كفر الشيخ", nameEn: "Kafr El Sheikh" }],
  "الفيوم": [{ nameAr: "الفيوم", nameEn: "Faiyum" }],
  "بني سويف": [{ nameAr: "بني سويف", nameEn: "Beni Suef" }],
  "المنيا": [{ nameAr: "المنيا", nameEn: "Minya" }],
  "قنا": [{ nameAr: "قنا", nameEn: "Qena" }],
  "مطروح": [{ nameAr: "مرسى مطروح", nameEn: "Marsa Matrouh" }],
  "البحر الأحمر": [{ nameAr: "الغردقة", nameEn: "Hurghada" }],
  "الوادي الجديد": [{ nameAr: "الخارجة", nameEn: "Kharga" }],
  "شمال سيناء": [{ nameAr: "العريش", nameEn: "Arish" }],
  "جنوب سيناء": [{ nameAr: "الطور", nameEn: "El Tor" }, { nameAr: "شرم الشيخ", nameEn: "Sharm El Sheikh" }],
};

const FACILITIES = [
  { nameAr: "مختبر علوم", nameEn: "Science Lab", icon: "flask-conical" },
  { nameAr: "مختبر حاسب آلي", nameEn: "Computer Lab", icon: "monitor" },
  { nameAr: "مكتبة", nameEn: "Library", icon: "library" },
  { nameAr: "ملعب رياضي", nameEn: "Sports Field", icon: "trophy" },
  { nameAr: "مسرح", nameEn: "Theater", icon: "drama" },
  { nameAr: "حديقة", nameEn: "Garden", icon: "trees" },
  { nameAr: "وجبة مدرسية", nameEn: "School Meal", icon: "utensils" },
  { nameAr: "تكييف", nameEn: "Air Conditioning", icon: "wind" },
  { nameAr: "مواصلات", nameEn: "Transportation", icon: "bus" },
  { nameAr: "غرفة فنون", nameEn: "Art Room", icon: "palette" },
];

const GRADES = [
  { nameAr: "رياض أطفال 1", nameEn: "KG1", sortOrder: 1 },
  { nameAr: "رياض أطفال 2", nameEn: "KG2", sortOrder: 2 },
  { nameAr: "الصف الأول الابتدائي", nameEn: "Grade 1", sortOrder: 3 },
  { nameAr: "الصف الثاني الابتدائي", nameEn: "Grade 2", sortOrder: 4 },
  { nameAr: "الصف الثالث الابتدائي", nameEn: "Grade 3", sortOrder: 5 },
  { nameAr: "الصف الرابع الابتدائي", nameEn: "Grade 4", sortOrder: 6 },
  { nameAr: "الصف الخامس الابتدائي", nameEn: "Grade 5", sortOrder: 7 },
  { nameAr: "الصف السادس الابتدائي", nameEn: "Grade 6", sortOrder: 8 },
];

async function main() {
  console.log("🌱 Seeding EJS platform...");

  // ── Permissions ──
  for (const p of SYSTEM_PERMISSIONS) {
    await db.permission.upsert({
      where: { key: p.key },
      create: p,
      update: { module: p.module, description: p.description },
    });
  }
  const allPerms = await db.permission.findMany();

  // ── Roles ──
  for (const [roleKey, roleLabel] of [
    [SYSTEM_ROLES.SUPER_ADMIN, "مدير عام"],
    [SYSTEM_ROLES.ADMIN, "مدير"],
    [SYSTEM_ROLES.EDITOR, "محرر محتوى"],
    [SYSTEM_ROLES.VIEWER, "مشاهد"],
    [SYSTEM_ROLES.STUDENT_ADMISSION_MANAGER, "مدير قبول الطلاب"],
    [SYSTEM_ROLES.TEACHER_ADMISSION_MANAGER, "مدير قبول المعلمين"],
  ] as const) {
    const role = await db.role.upsert({
      where: { name: roleKey },
      create: { name: roleKey, description: roleLabel, isSystem: true },
      update: { description: roleLabel, isSystem: true },
    });
    const matrix = ROLE_PERMISSION_MATRIX[roleKey];
    if (matrix) {
      const keys = permissionKeysForRole(matrix);
      const perms = allPerms.filter((p) =>
        keys.includes("*") ? true : keys.includes(p.key)
      );
      await db.rolePermission.deleteMany({ where: { roleId: role.id } });
      for (const p of perms) {
        await db.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
          create: { roleId: role.id, permissionId: p.id },
          update: {},
        });
      }
    }
  }

  // ── Super Admin User ──
  const superRole = await db.role.findUnique({ where: { name: SYSTEM_ROLES.SUPER_ADMIN } });
  if (superRole) {
    await db.user.upsert({
      where: { email: "admin@ejs.gov.eg" },
      create: {
        name: "المدير العام",
        email: "admin@ejs.gov.eg",
        passwordHash: hashPassword("Admin@123"),
        roleId: superRole.id,
        isActive: true,
      },
      update: { roleId: superRole.id, isActive: true },
    });
    const editorRole = await db.role.findUnique({ where: { name: SYSTEM_ROLES.EDITOR } });
    if (editorRole) {
      await db.user.upsert({
        where: { email: "editor@ejs.gov.eg" },
        create: {
          name: "محرر المحتوى",
          email: "editor@ejs.gov.eg",
          passwordHash: hashPassword("Editor@123"),
          roleId: editorRole.id,
          isActive: true,
        },
        update: {},
      });
    }
    // Student Admission Manager user
    const studentMgrRole = await db.role.findUnique({ where: { name: SYSTEM_ROLES.STUDENT_ADMISSION_MANAGER } });
    if (studentMgrRole) {
      await db.user.upsert({
        where: { email: "student.mgr@ejs.gov.eg" },
        create: {
          name: "مدير قبول الطلاب",
          email: "student.mgr@ejs.gov.eg",
          passwordHash: hashPassword("Student@123"),
          roleId: studentMgrRole.id,
          isActive: true,
        },
        update: { roleId: studentMgrRole.id, isActive: true },
      });
    }
    // Teacher Admission Manager user
    const teacherMgrRole = await db.role.findUnique({ where: { name: SYSTEM_ROLES.TEACHER_ADMISSION_MANAGER } });
    if (teacherMgrRole) {
      await db.user.upsert({
        where: { email: "teacher.mgr@ejs.gov.eg" },
        create: {
          name: "مدير قبول المعلمين",
          email: "teacher.mgr@ejs.gov.eg",
          passwordHash: hashPassword("Teacher@123"),
          roleId: teacherMgrRole.id,
          isActive: true,
        },
        update: { roleId: teacherMgrRole.id, isActive: true },
      });
    }
  }

  // ── Governorates & Cities ──
  const govMap = new Map<string, string>();
  for (let i = 0; i < GOVERNORATES.length; i++) {
    const g = GOVERNORATES[i];
    const gov = await db.governorate.upsert({
      where: { nameAr: g.nameAr },
      create: { nameAr: g.nameAr, nameEn: g.nameEn, sortOrder: i, isActive: true },
      update: { nameEn: g.nameEn, sortOrder: i },
    });
    govMap.set(g.nameAr, gov.id);
    const cities = CITIES[g.nameAr] || [{ nameAr: g.nameAr, nameEn: g.nameEn }];
    for (let j = 0; j < cities.length; j++) {
      const c = cities[j];
      await db.city.upsert({
        where: { governorateId_nameAr: { governorateId: gov.id, nameAr: c.nameAr } },
        create: { governorateId: gov.id, nameAr: c.nameAr, nameEn: c.nameEn, sortOrder: j, isActive: true },
        update: { nameEn: c.nameEn, sortOrder: j },
      });
    }
  }

  // ── Facilities & Grades ──
  for (const f of FACILITIES) {
    await db.facility.upsert({
      where: { nameAr: f.nameAr },
      create: f,
      update: { nameEn: f.nameEn, icon: f.icon },
    });
  }
  for (const gr of GRADES) {
    await db.grade.upsert({
      where: { nameAr: gr.nameAr },
      create: gr,
      update: { nameEn: gr.nameEn, sortOrder: gr.sortOrder },
    });
  }

  // ── Sample Schools (~40 across governorates) ──
  const schoolsData: {
    code: string; nameAr: string; nameEn: string; gov: string; city: string;
    type: string; gender: string; addressAr: string; capacity: number;
    featured: boolean; lat?: number; lng?: number;
  }[] = [
    { code: "EJS-CAI-001", nameAr: "المدرسة المصرية اليابانية بحدائق الزيتون", nameEn: "EJS Hadaeq El Zaytoun", gov: "القاهرة", city: "حدائق الزيتون", type: "ARABIC", gender: "MIXED", addressAr: "روكسي - شارع ترعة الجبل - مقابل قصر القبة", capacity: 420, featured: true, lat: 30.0915, lng: 31.3421 },
    { code: "EJS-CAI-002", nameAr: "المدرسة المصرية اليابانية الساحل", nameEn: "EJS El Sahel", gov: "القاهرة", city: "الساحل", type: "ARABIC", gender: "MIXED", addressAr: "إدارة الساحل - شبرا - شارع مجمع المدارس", capacity: 380, featured: false, lat: 30.1125, lng: 31.2412 },
    { code: "EJS-CAI-003", nameAr: "المدرسة المصرية اليابانية بمدينة نصر", nameEn: "EJS Nasr City", gov: "القاهرة", city: "مدينة نصر", type: "LANGUAGES", gender: "MIXED", addressAr: "مدينة نصر - الحي السابع", capacity: 450, featured: true, lat: 30.0566, lng: 31.3656 },
    { code: "EJS-CAI-004", nameAr: "المدرسة المصرية اليابانية بالمعادي", nameEn: "EJS Maadi", gov: "القاهرة", city: "المعادي", type: "LANGUAGES", gender: "FEMALE", addressAr: "المعادي - شارع 9", capacity: 360, featured: false, lat: 29.9602, lng: 31.2569 },
    { code: "EJS-GIZ-001", nameAr: "المدرسة المصرية اليابانية بالهرم", nameEn: "EJS Haram", gov: "الجيزة", city: "الهرم", type: "ARABIC", gender: "MIXED", addressAr: "الهرم - شارع اللبيني", capacity: 400, featured: true, lat: 29.9765, lng: 31.1375 },
    { code: "EJS-GIZ-002", nameAr: "المدرسة المصرية اليابانية بحي الخامس - أكتوبر", nameEn: "EJS 6th October", gov: "الجيزة", city: "6 أكتوبر", type: "ARABIC", gender: "MIXED", addressAr: "مدينة 6 أكتوبر - الحي الخامس", capacity: 480, featured: true, lat: 29.9602, lng: 30.9726 },
    { code: "EJS-GIZ-003", nameAr: "المدرسة المصرية اليابانية بالشيخ زايد", nameEn: "EJS Sheikh Zayed", gov: "الجيزة", city: "الشيخ زايد", type: "LANGUAGES", gender: "MIXED", addressAr: "مدينة الشيخ زايد - الحي الثالث", capacity: 440, featured: false, lat: 30.0305, lng: 30.9745 },
    { code: "EJS-ALEX-001", nameAr: "المدرسة المصرية اليابانية بالعجمي", nameEn: "EJS Agami", gov: "الإسكندرية", city: "العجمي", type: "LANGUAGES", gender: "MIXED", addressAr: "العجمي - الكيلو 21", capacity: 390, featured: false, lat: 31.1056, lng: 29.7744 },
    { code: "EJS-ALEX-002", nameAr: "المدرسة المصرية اليابانية ببرج العرب", nameEn: "EJS Borg El Arab", gov: "الإسكندرية", city: "برج العرب", type: "ARABIC", gender: "MIXED", addressAr: "برج العرب الجديدة - الحي الثاني", capacity: 410, featured: false, lat: 30.9189, lng: 29.5783 },
    { code: "EJS-ALEX-003", nameAr: "المدرسة المصرية اليابانية بسيدي بشر", nameEn: "EJS Sidi Bishr", gov: "الإسكندرية", city: "سيدي بشر", type: "ARABIC", gender: "MIXED", addressAr: "سيدي بشر شرق - الإسكندرية", capacity: 370, featured: false, lat: 31.2304, lng: 29.9826 },
    { code: "EJS-DAK-001", nameAr: "المدرسة المصرية اليابانية بالمنصورة", nameEn: "EJS Mansoura", gov: "الدقهلية", city: "المنصورة", type: "LANGUAGES", gender: "MIXED", addressAr: "المنصورة - شارع الجمهورية", capacity: 430, featured: true, lat: 31.0409, lng: 31.3785 },
    { code: "EJS-SHR-001", nameAr: "المدرسة المصرية اليابانية بالزقازيق", nameEn: "EJS Zagazig", gov: "الشرقية", city: "الزقازيق", type: "ARABIC", gender: "MIXED", addressAr: "الزقازيق - شارع الجلاء", capacity: 380, featured: false, lat: 30.5877, lng: 31.5022 },
    { code: "EJS-SHR-002", nameAr: "المدرسة المصرية اليابانية بالعاشر من رمضان", nameEn: "EJS 10th of Ramadan", gov: "الشرقية", city: "العاشر من رمضان", type: "LANGUAGES", gender: "MIXED", addressAr: "العاشر من رمضان - الحي السادس", capacity: 460, featured: true, lat: 30.2942, lng: 31.7453 },
    { code: "EJS-QAL-001", nameAr: "المدرسة المصرية اليابانية ببنها", nameEn: "EJS Banha", gov: "القليوبية", city: "بنها", type: "ARABIC", gender: "MIXED", addressAr: "بنها - شارع فلسطين", capacity: 360, featured: false, lat: 30.4596, lng: 31.1822 },
    { code: "EJS-GHR-001", nameAr: "المدرسة المصرية اليابانية بطنطا", nameEn: "EJS Tanta", gov: "الغربية", city: "طنطا", type: "ARABIC", gender: "MIXED", addressAr: "طنطا - شارع البحر", capacity: 410, featured: false, lat: 30.7865, lng: 31.0004 },
    { code: "EJS-GHR-002", nameAr: "المدرسة المصرية اليابانية بالمحلة الكبرى", nameEn: "EJS Mahalla", gov: "الغربية", city: "المحلة الكبرى", type: "LANGUAGES", gender: "MIXED", addressAr: "المحلة الكبرى - شارع الجلاء", capacity: 395, featured: false, lat: 30.9705, lng: 31.1643 },
    { code: "EJS-MNF-001", nameAr: "المدرسة المصرية اليابانية بشبين الكوم", nameEn: "EJS Shibin El Kom", gov: "المنوفية", city: "شبين الكوم", type: "ARABIC", gender: "MIXED", addressAr: "شبين الكوم - شارع حرورة", capacity: 350, featured: false, lat: 30.6039, lng: 30.9876 },
    { code: "EJS-BHR-001", nameAr: "المدرسة المصرية اليابانية بدمنهور", nameEn: "EJS Damanhour", gov: "البحيرة", city: "دمنهور", type: "ARABIC", gender: "MIXED", addressAr: "دمنهور - شارع المحطة", capacity: 375, featured: false, lat: 31.0335, lng: 30.4682 },
    { code: "EJS-ASY-001", nameAr: "المدرسة المصرية اليابانية بأسيوط", nameEn: "EJS Asyut", gov: "أسيوط", city: "أسيوط", type: "ARABIC", gender: "MIXED", addressAr: "أسيوط - شارع ثابت", capacity: 385, featured: false, lat: 27.1809, lng: 31.1837 },
    { code: "EJS-SHG-001", nameAr: "المدرسة المصرية اليابانية بسوهاج", nameEn: "EJS Sohag", gov: "سوهاج", city: "سوهاج", type: "ARABIC", gender: "MIXED", addressAr: "سوهاج - شارع الجمهورية", capacity: 370, featured: false, lat: 26.5569, lng: 31.6948 },
    { code: "EJS-ASW-001", nameAr: "المدرسة المصرية اليابانية بأسوان", nameEn: "EJS Aswan", gov: "أسوان", city: "أسوان", type: "LANGUAGES", gender: "MIXED", addressAr: "أسوان - كورنيش النيل", capacity: 340, featured: true, lat: 24.0889, lng: 32.8998 },
    { code: "EJS-LXR-001", nameAr: "المدرسة المصرية اليابانية بالأقصر", nameEn: "EJS Luxor", gov: "الأقصر", city: "الأقصر", type: "ARABIC", gender: "MIXED", addressAr: "الأقصر - شارع المطار", capacity: 330, featured: false, lat: 25.6872, lng: 32.6396 },
    { code: "EJS-PSD-001", nameAr: "المدرسة المصرية اليابانية ببورسعيد", nameEn: "EJS Port Said", gov: "بورسعيد", city: "بورسعيد", type: "LANGUAGES", gender: "MIXED", addressAr: "بورسعيد - شارع 23 يوليو", capacity: 360, featured: false, lat: 31.2653, lng: 32.3019 },
    { code: "EJS-ISM-001", nameAr: "المدرسة المصرية اليابانية بالإسماعيلية", nameEn: "EJS Ismailia", gov: "الإسماعيلية", city: "الإسماعيلية", type: "ARABIC", gender: "MIXED", addressAr: "الإسماعيلية - شارع طلعت حرب", capacity: 355, featured: false, lat: 30.5965, lng: 32.2715 },
    { code: "EJS-DMT-001", nameAr: "المدرسة المصرية اليابانية بدمياط", nameEn: "EJS Damietta", gov: "دمياط", city: "دمياط", type: "ARABIC", gender: "MIXED", addressAr: "دمياط - شارع البحر", capacity: 320, featured: false, lat: 31.4165, lng: 31.8133 },
    { code: "EJS-FYM-001", nameAr: "المدرسة المصرية اليابانية بالفيوم", nameEn: "EJS Faiyum", gov: "الفيوم", city: "الفيوم", type: "ARABIC", gender: "MIXED", addressAr: "الفيوم - شارع الجيش", capacity: 340, featured: false, lat: 29.3084, lng: 30.8428 },
    { code: "EJS-BNS-001", nameAr: "المدرسة المصرية اليابانية ببني سويف", nameEn: "EJS Beni Suef", gov: "بني سويف", city: "بني سويف", type: "ARABIC", gender: "MIXED", addressAr: "بني سويف - شارع سعد زغلول", capacity: 350, featured: false, lat: 29.0744, lng: 31.0978 },
    { code: "EJS-MNY-001", nameAr: "المدرسة المصرية اليابانية بالمنيا", nameEn: "EJS Minya", gov: "المنيا", city: "المنيا", type: "LANGUAGES", gender: "MIXED", addressAr: "المنيا - شارع الحرية", capacity: 365, featured: false, lat: 28.0871, lng: 30.7618 },
    { code: "EJS-QNA-001", nameAr: "المدرسة المصرية اليابانية بقنا", nameEn: "EJS Qena", gov: "قنا", city: "قنا", type: "ARABIC", gender: "MIXED", addressAr: "قنا - شارع المحطة", capacity: 330, featured: false, lat: 26.1551, lng: 32.7160 },
    { code: "EJS-KFS-001", nameAr: "المدرسة المصرية اليابانية بكفر الشيخ", nameEn: "EJS Kafr El Sheikh", gov: "كفر الشيخ", city: "كفر الشيخ", type: "ARABIC", gender: "MIXED", addressAr: "كفر الشيخ - شارع الجيش", capacity: 315, featured: false, lat: 31.1107, lng: 30.9388 },
    { code: "EJS-MTR-001", nameAr: "المدرسة المصرية اليابانية بمرسى مطروح", nameEn: "EJS Marsa Matrouh", gov: "مطروح", city: "مرسى مطروح", type: "ARABIC", gender: "MIXED", addressAr: "مرسى مطروح - الكورنيش", capacity: 280, featured: false, lat: 31.3543, lng: 27.2373 },
    { code: "EJS-HRG-001", nameAr: "المدرسة المصرية اليابانية بالغردقة", nameEn: "EJS Hurghada", gov: "البحر الأحمر", city: "الغردقة", type: "LANGUAGES", gender: "MIXED", addressAr: "الغردقة - حي الدهار", capacity: 300, featured: true, lat: 27.2579, lng: 33.8116 },
    { code: "EJS-SUZ-001", nameAr: "المدرسة المصرية اليابانية بالسويس", nameEn: "EJS Suez", gov: "السويس", city: "السويس", type: "ARABIC", gender: "MIXED", addressAr: "السويس - شارع الجيش", capacity: 310, featured: false, lat: 29.9668, lng: 32.5498 },
    { code: "EJS-CAI-005", nameAr: "المدرسة المصرية اليابانية بحلوان", nameEn: "EJS Helwan", gov: "القاهرة", city: "حلوان", type: "ARABIC", gender: "MALE", addressAr: "حلوان - شارع النيل", capacity: 340, featured: false, lat: 29.8404, lng: 31.2989 },
    { code: "EJS-CAI-006", nameAr: "المدرسة المصرية اليابانية بشبرا", nameEn: "EJS Shubra", gov: "القاهرة", city: "شبرا", type: "ARABIC", gender: "MIXED", addressAr: "شبرا - شارع ترعة الجبل", capacity: 360, featured: false, lat: 30.1287, lng: 31.2422 },
    { code: "EJS-GIZ-004", nameAr: "المدرسة المصرية اليابانية بالدقي", nameEn: "EJS Dokki", gov: "الجيزة", city: "الدقي", type: "LANGUAGES", gender: "FEMALE", addressAr: "الدقي - شارع التحرير", capacity: 350, featured: false, lat: 30.0388, lng: 31.2117 },
    { code: "EJS-ALEX-004", nameAr: "المدرسة المصرية اليابانية بسموحة", nameEn: "EJS Smouha", gov: "الإسكندرية", city: "سموحة", type: "LANGUAGES", gender: "MIXED", addressAr: "سموحة - شارع فؤاد", capacity: 380, featured: false, lat: 31.2150, lng: 29.9476 },
    { code: "EJS-SHR-003", nameAr: "المدرسة المصرية اليابانية ببلبيس", nameEn: "EJS Belbeis", gov: "الشرقية", city: "بلبيس", type: "ARABIC", gender: "MIXED", addressAr: "بلبيس - شارع المحطة", capacity: 300, featured: false, lat: 30.4215, lng: 31.5610 },
    { code: "EJS-DAK-002", nameAr: "المدرسة المصرية اليابانية بميت غمر", nameEn: "EJS Mit Ghamr", gov: "الدقهلية", city: "ميت غمر", type: "ARABIC", gender: "MIXED", addressAr: "ميت غمر - شارع الجمهورية", capacity: 295, featured: false, lat: 30.8716, lng: 31.4925 },
  ];

  const allFacilities = await db.facility.findMany();
  const allGrades = await db.grade.findMany();

  for (let i = 0; i < schoolsData.length; i++) {
    const s = schoolsData[i];
    const govId = govMap.get(s.gov);
    if (!govId) continue;
    const city = await db.city.findFirst({ where: { governorateId: govId, nameAr: s.city } });
    if (!city) continue;
    const existing = await db.school.findUnique({ where: { code: s.code } });
    const data = {
      nameAr: s.nameAr,
      nameEn: s.nameEn,
      governorateId: govId,
      cityId: city.id,
      type: s.type,
      gender: s.gender,
      addressAr: s.addressAr,
      lat: s.lat,
      lng: s.lng,
      capacity: s.capacity,
      applicationUrl: "https://ejsadmpa.moe.gov.eg",
      descriptionAr: `تتبنى ${s.nameAr} نظام التعليم الياباني «توكاتسو» الذي يركز على تنمية شخصية الطفل بشكل متكامل من خلال الأنشطة الطلابية والتعلم التعاوني، مع الحفاظ على المنهج المصري المعتمد.`,
      sortOrder: i,
      isFeatured: s.featured,
      isActive: true,
      isArchived: false,
    };
    let school;
    if (existing) {
      school = await db.school.update({ where: { id: existing.id }, data });
    } else {
      school = await db.school.create({ data: { code: s.code, ...data } });
    }
    // facilities (random subset)
    const facCount = 4 + (i % 5);
    const selectedFacs = allFacilities.slice(0, facCount);
    await db.schoolFacility.deleteMany({ where: { schoolId: school.id } });
    for (const f of selectedFacs) {
      await db.schoolFacility.upsert({
        where: { schoolId_facilityId: { schoolId: school.id, facilityId: f.id } },
        create: { schoolId: school.id, facilityId: f.id },
        update: {},
      });
    }
    // grades (KG1 to grade 3 for most)
    await db.schoolGrade.deleteMany({ where: { schoolId: school.id } });
    const gradeSubset = allGrades.slice(0, 5);
    for (const g of gradeSubset) {
      await db.schoolGrade.upsert({
        where: { schoolId_gradeId: { schoolId: school.id, gradeId: g.id } },
        create: { schoolId: school.id, gradeId: g.id },
        update: {},
      });
    }
  }

  // ── News categories & sample news ──
  const newsCats = [
    { nameAr: "إعلانات القبول", nameEn: "Admissions", slug: "admissions" },
    { nameAr: "أخبار المدارس", nameEn: "School News", slug: "school-news" },
    { nameAr: "فعاليات", nameEn: "Events", slug: "events" },
  ];
  for (let i = 0; i < newsCats.length; i++) {
    await db.newsCategory.upsert({
      where: { slug: newsCats[i].slug },
      create: { ...newsCats[i], sortOrder: i },
      update: { nameAr: newsCats[i].nameAr, nameEn: newsCats[i].nameEn, sortOrder: i },
    });
  }
  const admCat = await db.newsCategory.findUnique({ where: { slug: "admissions" } });
  const schCat = await db.newsCategory.findUnique({ where: { slug: "school-news" } });

  const newsItems = [
    {
      titleAr: "فتح باب التقديم للمدارس المصرية اليابانية للعام الدراسي ٢٠٢٦/٢٠٢٧",
      slug: "admissions-2026-2027-open",
      excerptAr: "أعلنت وزارة التربية والتعليم فتح باب التقديم إلكترونياً للمدارس المصرية اليابانية عبر البوابة الرسمية.",
      bodyAr: "أعلنت وزارة التربية والتعليم والتعليم الفني عن فتح باب التقديم للمدارس المصرية اليابانية للعام الدراسي ٢٠٢٦/٢٠٢٧، وذلك عبر البوابة الإلكترونية الرسمية. يشمل التقديم الصفوف من رياض الأطفال مستوى أول (KG1) وحتى الصف الثالث الابتدائي، مع الالتزام بالشروط والقواعد المعلنة. التقديم إلكتروني بالكامل، والوقت معيار تقييمي.",
      categoryId: admCat?.id, status: "PUBLISHED", isFeatured: true,
      publishedAt: new Date(Date.now() - 2 * 86400000),
    },
    {
      titleAr: "افتتاح ١٠ مدارس مصرية يابانية جديدة ليرتفع الإجمالي إلى ٧٩ مدرسة",
      slug: "10-new-schools-79-total",
      excerptAr: "تستعد الوزارة لافتتاح ١٠ مدارس مصرية يابانية جديدة بداية العام الدراسي المقبل.",
      bodyAr: "أعلنت وزارة التربية والتعليم دخول ١٠ مدارس مصرية يابانية جديدة الخدمة العام الدراسي المقبل، ليرتفع إجمالي عدد المدارس إلى ٧٩ مدرسة موزعة على ٢٦ محافظة. وتأتي هذه الخطوة في إطار التوسع المستمر للمشروع وتطبيق نظام «توكاتسو» الياباني.",
      categoryId: schCat?.id, status: "PUBLISHED", isFeatured: true,
      publishedAt: new Date(Date.now() - 5 * 86400000),
    },
    {
      titleAr: "نظام «توكاتسو».. تجربة تعليمية تستحق",
      slug: "tokkatsu-experience",
      excerptAr: "تعرف على نظام التعليم الياباني «توكاتسو» وأثره في تنمية شخصية الطفل.",
      bodyAr: "يعتمد نظام «توكاتسو» على تنمية شخصية الطفل بشكل متكامل من خلال الأنشطة الطلابية المتنوعة، والتعلم التعاوني، والأنشطة الصفية واللاصفية. ويهدف إلى إعداد طفل متوازن أكاديمياً واجتماعياً ونفسياً.",
      categoryId: schCat?.id, status: "PUBLISHED", isFeatured: false,
      publishedAt: new Date(Date.now() - 10 * 86400000),
    },
  ];
  for (const n of newsItems) {
    await db.news.upsert({
      where: { slug: n.slug },
      create: n,
      update: { ...n },
    });
  }

  // ── FAQ ──
  const faqCat = await db.faqCategory.upsert({
    where: { nameAr: "القبول والتقديم" },
    create: { nameAr: "القبول والتقديم", nameEn: "Admissions", sortOrder: 0 },
    update: {},
  });
  const faqCat2 = await db.faqCategory.upsert({
    where: { nameAr: "المدارس والمناهج" },
    create: { nameAr: "المدارس والمناهج", nameEn: "Schools & Curriculum", sortOrder: 1 },
    update: {},
  });
  const faqs = [
    { cat: faqCat.id, q: "ما هي شروط القبول في المدارس المصرية اليابانية؟", a: "يشترط أن يكون الطفل مصري الجنسية من أبوين مصريين، وأن يكون ضمن الشريحة العمرية المحددة للمرحلة المتقدم لها، مع الالتزام بباقي الشروط المعلنة على البوابة." },
    { cat: faqCat.id, q: "كيف يتم التقديم؟", a: "يتم التقديم إلكترونياً عبر البوابة الرسمية فقط، حيث يعبئ ولي الأمر الاستمارة بالبيانات الشخصية والمؤهلات، ويجيب على أسئلة تقيس مهارات الطفل." },
    { cat: faqCat.id, q: "هل الوقت معيار في التقييم؟", a: "نعم، عامل الوقت معيار هام في تقييم طلب التقدم، لذا يُنصح بالتقديم مبكراً خلال الفترة المحددة." },
    { cat: faqCat.id, q: "ما المراحل المتاحة للتقديم؟", a: "يشمل التقديم الصفوف من رياض أطفال مستوى أول (KG1) وحتى الصف الثالث الابتدائي، وللمراحل الأعلى يشترط التحويل من مدرسة لغات." },
    { cat: faqCat2.id, q: "ما هو نظام توكاتسو؟", a: "نظام توكاتسو هو نظام التعليم الياباني الذي يركز على تنمية شخصية الطفل بشكل متكامل من خلال الأنشطة الطلابية والتعلم التعاوني." },
    { cat: faqCat2.id, q: "هل المنهج مصري أم ياباني؟", a: "المنهج مصري معتمد من وزارة التربية والتعليم، مع تطبيق منهجية وفلسفة «توكاتسو» اليابانية في الأنشطة التربوية." },
    { cat: faqCat2.id, q: "ما نوع المدارس (عربي/لغات)؟", a: "تتنوع المدارس بين عربي ولغات (لغة إنجليزية كمستوى رفيع)، ويمكن التحقق من نوع كل مدرسة من صفحة البحث." },
  ];
  for (let i = 0; i < faqs.length; i++) {
    await db.faq.upsert({
      where: { id: `seed-faq-${i}` },
      create: {
        id: `seed-faq-${i}`,
        categoryId: faqs[i].cat,
        questionAr: faqs[i].q,
        answerAr: faqs[i].a,
        sortOrder: i,
        isActive: true,
      },
      update: { categoryId: faqs[i].cat, questionAr: faqs[i].q, answerAr: faqs[i].a },
    });
  }

  // ── Announcements ──
  const announcements = [
    { titleAr: "فتح باب التقديم ٢٠٢٦/٢٠٢٧", bodyAr: "تم فتح باب التقديم للمدارس المصرية اليابانية إلكترونياً.", type: "SUCCESS", sortOrder: 0 },
    { titleAr: "الوقت معيار تقييمي", bodyAr: "يُرجى التقديم مبكراً حيث أن عامل الوقت من معايير التقييم.", type: "WARNING", sortOrder: 1 },
    { titleAr: "التقديم إلكتروني بالكامل", bodyAr: "لا توجد مكاتب تقديم حضورية، جميع الطلبات عبر البوابة الإلكترونية فقط.", type: "INFO", sortOrder: 2 },
  ];
  for (const a of announcements) {
    const existing = await db.announcement.findFirst({ where: { titleAr: a.titleAr } });
    if (!existing) {
      await db.announcement.create({ data: { ...a, isActive: true, startDate: new Date() } });
    }
  }

  // ── Document categories & sample documents ──
  const docCats = [
    { nameAr: "شروط القبول", nameEn: "Admission Conditions", slug: "conditions" },
    { nameAr: "نماذج التقديم", nameEn: "Application Forms", slug: "forms" },
    { nameAr: "أدلة إرشادية", nameEn: "Guides", slug: "guides" },
  ];
  for (let i = 0; i < docCats.length; i++) {
    await db.documentCategory.upsert({
      where: { slug: docCats[i].slug },
      create: { ...docCats[i], sortOrder: i },
      update: { nameAr: docCats[i].nameAr, nameEn: docCats[i].nameEn },
    });
  }
  const condCat = await db.documentCategory.findUnique({ where: { slug: "conditions" } });
  const docs = [
    { titleAr: "شروط وقواعد القبول ٢٠٢٦/٢٠٢٧ (PDF)", descriptionAr: "ملخّص شروط وقواعد القبول للمدارس المصرية اليابانية.", fileType: "pdf", categoryId: condCat?.id, fileSize: 245000 },
    { titleAr: "دليل ولي الأمر للتقديم الإلكتروني (PDF)", descriptionAr: "شرح خطوة بخطوة لعملية التقديم عبر البوابة.", fileType: "pdf", categoryId: condCat?.id, fileSize: 180000 },
    { titleAr: "نموذج استمارة التقديم (Word)", descriptionAr: "نموذج مرجعي لاستمارة التقديم.", fileType: "docx", categoryId: condCat?.id, fileSize: 95000 },
  ];
  for (const d of docs) {
    const existing = await db.document.findFirst({ where: { titleAr: d.titleAr } });
    if (!existing) {
      await db.document.create({ data: { ...d, isActive: true, downloadCount: Math.floor(Math.random() * 1500) } });
    }
  }

  // ── Banners ──
  const banners = [
    { titleAr: "المدارس المصرية اليابانية", subtitleAr: "تجربة تعليمية تستحق — فتح باب التقديم ٢٠٢٦/٢٠٢٧", buttonTextAr: "ابحث عن مدرسة", linkUrl: "/schools", sortOrder: 0 },
    { titleAr: "نظام توكاتسو الياباني", subtitleAr: "تعليم متكامل يُنمّي شخصية طفلك", buttonTextAr: "تعرّف على المنهج", linkUrl: "/about", sortOrder: 1 },
  ];
  for (const b of banners) {
    const existing = await db.banner.findFirst({ where: { titleAr: b.titleAr } });
    if (!existing) {
      await db.banner.create({ data: { ...b, isActive: true } });
    }
  }

  // ── Static pages ──
  const pages = [
    {
      slug: "about",
      titleAr: "عن المدارس المصرية اليابانية",
      bodyAr: "المدارس المصرية اليابانية (EJS) مشروع تعليمي مشترك بين مصر واليابان، يطبق نظام «توكاتسو» الياباني القائم على تنمية شخصية الطفل بشكل متكامل. انطلق المشروع عام ٢٠١٨ بعدد محدود من المدارس، ويتوسع سنوياً ليصل إلى ٧٩ مدرسة في ٢٦ محافظة، مع استهداف الوصول إلى ٥٠٠ مدرسة مستقبلاً.",
    },
    {
      slug: "contact",
      titleAr: "تواصل معنا",
      bodyAr: "للاستفسارات الخاصة بالمدارس المصرية اليابانية، يمكنكم التواصل عبر الخط الساخن ١٦٠٠٠ أو البريد الإلكتروني ejs@moe.gov.eg، أو زيارة مقر وزارة التربية والتعليم والتعليم الفني.",
    },
    {
      slug: "terms",
      titleAr: "الشروط والأحكام",
      bodyAr: "يتم التقديم للمدارس المصرية اليابانية إلكترونياً عبر البوابة الرسمية فقط. يُشترط أن يكون سن الطفل وفق الشريحة العمرية المحددة للمرحلة، وأن يكون مصري الجنسية من أبوين مصريين. عامل الوقت معيار هام في التقييم. ولوزارة التربية والتعليم الحق في عدم قبول طلب الالتحاق دون إبداء أسباب.",
    },
  ];
  for (const p of pages) {
    await db.page.upsert({
      where: { slug: p.slug },
      create: { ...p, isActive: true },
      update: { titleAr: p.titleAr, bodyAr: p.bodyAr },
    });
  }

  // ── Settings ──
  for (const [key, val] of Object.entries({
    [SETTING_KEYS.admission]: DEFAULT_SETTINGS.admission,
    [SETTING_KEYS.branding]: DEFAULT_SETTINGS.branding,
    [SETTING_KEYS.contact]: DEFAULT_SETTINGS.contact,
    [SETTING_KEYS.social]: DEFAULT_SETTINGS.social,
    [SETTING_KEYS.seo]: DEFAULT_SETTINGS.seo,
    [SETTING_KEYS.general]: DEFAULT_SETTINGS.general,
  })) {
    await db.setting.upsert({
      where: { key },
      create: { key, value: JSON.stringify(val), group: key },
      update: { value: JSON.stringify(val), group: key },
    });
  }

  // ── Menu items ──
  const menuItems = [
    { labelAr: "الرئيسية", url: "/", sortOrder: 0 },
    { labelAr: "ابحث عن مدرسة", url: "/schools", sortOrder: 1 },
    { labelAr: "الأخبار", url: "/news", sortOrder: 2 },
    { labelAr: "الأسئلة الشائعة", url: "/faq", sortOrder: 3 },
    { labelAr: "مركز المستندات", url: "/documents", sortOrder: 4 },
    { labelAr: "الإعلانات", url: "/announcements", sortOrder: 5 },
    { labelAr: "عن المدارس", url: "/about", sortOrder: 6 },
    { labelAr: "تواصل معنا", url: "/contact", sortOrder: 7 },
  ];
  for (const m of menuItems) {
    const existing = await db.menuItem.findFirst({ where: { url: m.url } });
    if (!existing) {
      await db.menuItem.create({ data: { ...m, labelEn: m.labelAr, isActive: true } });
    }
  }

  console.log("✅ Seed complete");
  console.log("   Admin login: admin@ejs.gov.eg / Admin@123");
  console.log("   Editor login: editor@ejs.gov.eg / Editor@123");
  console.log(`   ${schoolsData.length} schools, ${GOVERNORATES.length} governorates seeded`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
