// Shared constants & typed accessors for site-wide settings.

export const SCHOOL_TYPES = [
  { value: "ARABIC", labelAr: "عربي", labelEn: "Arabic" },
  { value: "LANGUAGES", labelAr: "لغات", labelEn: "Languages" },
] as const;

export const SCHOOL_GENDERS = [
  { value: "MIXED", labelAr: "مختلط", labelEn: "Mixed" },
  { value: "MALE", labelAr: "بنين", labelEn: "Male" },
  { value: "FEMALE", labelAr: "بنات", labelEn: "Female" },
] as const;

export const ADMISSION_STATUS = [
  { value: "UPCOMING", labelAr: "قريباً", labelEn: "Upcoming", color: "gold" },
  { value: "OPEN", labelAr: "مفتوح", labelEn: "Open", color: "green" },
  { value: "CLOSED", labelAr: "مغلق", labelEn: "Closed", color: "red" },
] as const;

export const NEWS_STATUS = [
  { value: "DRAFT", labelAr: "مسودة", labelEn: "Draft" },
  { value: "SCHEDULED", labelAr: "مجدول", labelEn: "Scheduled" },
  { value: "PUBLISHED", labelAr: "منشور", labelEn: "Published" },
  { value: "ARCHIVED", labelAr: "مؤرشف", labelEn: "Archived" },
] as const;

export const ANNOUNCEMENT_TYPES = [
  { value: "INFO", labelAr: "معلومة", color: "teal" },
  { value: "SUCCESS", labelAr: "نجاح", color: "green" },
  { value: "WARNING", labelAr: "تنبيه", color: "gold" },
  { value: "URGENT", labelAr: "عاجل", color: "red" },
] as const;

export type AdmissionStatus = (typeof ADMISSION_STATUS)[number]["value"];
export type SchoolType = (typeof SCHOOL_TYPES)[number]["value"];
export type SchoolGender = (typeof SCHOOL_GENDERS)[number]["value"];

// ───────── Settings schema (JSON stored in Setting rows) ─────────

export interface AdmissionSettings {
  year: string;          // e.g. "2026/2027"
  status: AdmissionStatus;
  openDate: string | null;  // ISO
  closeDate: string | null; // ISO
  phasesLabel: string;
  notes: string;
}

export interface BrandingSettings {
  siteNameAr: string;
  siteNameEn: string;
  taglineAr: string;
  taglineEn: string;
  logoUrl: string;
  faviconUrl: string;
}

export interface ContactSettings {
  phone: string;
  email: string;
  addressAr: string;
  addressEn: string;
  mapUrl: string;
  workingHoursAr: string;
}

export interface SocialSettings {
  facebook: string;
  instagram: string;
  x: string;
  youtube: string;
  tiktok: string;
  website: string;
}

export interface SeoSettings {
  metaTitleAr: string;
  metaDescriptionAr: string;
  keywordsAr: string;
  ogImageUrl: string;
}

export interface GeneralSettings {
  numeralStyle: "arabic" | "western"; // ٠١٢٣ vs 0123
  applicationPortalUrl: string; // external apply gateway (global fallback)
  announcementBarEnabled: boolean;
  announcementBarText: string;
}

export interface SiteSettings {
  admission: AdmissionSettings;
  branding: BrandingSettings;
  contact: ContactSettings;
  social: SocialSettings;
  seo: SeoSettings;
  general: GeneralSettings;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  admission: {
    year: "2026/2027",
    status: "OPEN",
    openDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    closeDate: new Date(Date.now() + 27 * 86400000).toISOString(),
    phasesLabel: "المرحلة الأولى: رياض أطفال KG1 حتى الصف الثالث الابتدائي",
    notes: "يتم التقديم إلكترونياً عبر البوابة الرسمية. الوقت معيار تقييمي.",
  },
  branding: {
    siteNameAr: "المدارس المصرية اليابانية",
    siteNameEn: "Egyptian Japanese Schools",
    taglineAr: "تجربة تعليمية تستحق",
    taglineEn: "An experience worth living",
    logoUrl: "",
    faviconUrl: "",
  },
  contact: {
    phone: "16000",
    email: "ejs@moe.gov.eg",
    addressAr: "وزارة التربية والتعليم والتعليم الفني، الجمهورية المصرية",
    addressEn: "Ministry of Education and Technical Education, Egypt",
    mapUrl: "https://www.google.com/maps?q=Cairo,Egypt",
    workingHoursAr: "الأحد - الخميس، ٩ صباحاً - ٤ مساءً",
  },
  social: {
    facebook: "https://www.facebook.com/EJS.PMU",
    instagram: "https://www.instagram.com/ejs.pmu",
    x: "",
    youtube: "",
    tiktok: "",
    website: "https://ejs4students.moe.gov.eg",
  },
  seo: {
    metaTitleAr: "المدارس المصرية اليابانية — بوابة القبول الإلكتروني",
    metaDescriptionAr:
      "البوابة الرسمية للمدارس المصرية اليابانية. ابحث عن مدرستك، تابع شروط القبول، وقدّم طلبك إلكترونياً.",
    keywordsAr: "المدارس المصرية اليابانية, القبول, التقديم, EJS, التعليم",
    ogImageUrl: "",
  },
  general: {
    numeralStyle: "arabic",
    applicationPortalUrl: "https://ejs-admission.vercel.app/admission/students",
    announcementBarEnabled: true,
    announcementBarText:
      "فتح باب التقديم للمدارس المصرية اليابانية للعام الدراسي ٢٠٢٦/٢٠٢٧",
  },
};

export const SETTING_KEYS = {
  admission: "admission",
  branding: "branding",
  contact: "contact",
  social: "social",
  seo: "seo",
  general: "general",
} as const;
