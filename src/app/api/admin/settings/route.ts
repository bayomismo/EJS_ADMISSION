import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSiteSettings, setSetting } from "@/lib/settings";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  DEFAULT_SETTINGS, type SiteSettings,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("settings", "view");
  if (!guard.ok) return guard.response!;
  const settings = await getSiteSettings();
  return ok(settings);
}

const settingsSchema = z.object({
  admission: z.object({
    year: z.string(),
    status: z.enum(["UPCOMING", "OPEN", "CLOSED"]),
    openDate: z.string().nullable(),
    closeDate: z.string().nullable(),
    phasesLabel: z.string(),
    notes: z.string(),
  }),
  branding: z.object({
    siteNameAr: z.string(),
    siteNameEn: z.string(),
    taglineAr: z.string(),
    taglineEn: z.string(),
    logoUrl: z.string(),
    faviconUrl: z.string(),
  }),
  contact: z.object({
    phone: z.string(),
    email: z.string(),
    addressAr: z.string(),
    addressEn: z.string(),
    mapUrl: z.string(),
    workingHoursAr: z.string(),
  }),
  social: z.object({
    facebook: z.string(),
    instagram: z.string(),
    x: z.string(),
    youtube: z.string(),
    tiktok: z.string(),
    website: z.string(),
  }),
  seo: z.object({
    metaTitleAr: z.string(),
    metaDescriptionAr: z.string(),
    keywordsAr: z.string(),
    ogImageUrl: z.string(),
  }),
  general: z.object({
    numeralStyle: z.enum(["arabic", "western"]),
    applicationPortalUrl: z.string(),
    announcementBarEnabled: z.boolean(),
    announcementBarText: z.string(),
  }),
});

export async function PUT(req: NextRequest) {
  const guard = await requirePermission("settings", "update");
  if (!guard.ok) return guard.response!;
  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);

  const old = await getSiteSettings();
  const s = parsed.data as SiteSettings;

  await Promise.all([
    setSetting("admission", "admission", s.admission),
    setSetting("branding", "branding", s.branding),
    setSetting("contact", "contact", s.contact),
    setSetting("social", "social", s.social),
    setSetting("seo", "seo", s.seo),
    setSetting("general", "general", s.general),
  ]);

  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "UPDATE",
    entity: "settings",
    oldValue: old,
    newValue: s,
    summary: "تحديث إعدادات الموقع",
    req,
  });

  // Invalidate ISR pages that depend on settings.
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/contact");

  return ok(s);
}

export { DEFAULT_SETTINGS };
