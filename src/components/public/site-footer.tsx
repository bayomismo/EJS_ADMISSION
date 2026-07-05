import Link from "next/link";
import { Building2, Mail, Phone, MapPin, Facebook, Instagram, Youtube } from "lucide-react";
import type { SiteSettings } from "@/lib/constants";
import { getContent } from "@/lib/content";

export async function SiteFooter({ settings }: { settings: SiteSettings }) {
  const [footerDescription, footerQuickLinksTitle, footerContactTitle, footerSocialTitle] = await Promise.all([
    getContent("footer.description", `${settings.branding.taglineAr} — البوابة الرسمية للقبول الإلكتروني للمدارس المصرية اليابانية.`),
    getContent("footer.quickLinksTitle", "روابط سريعة"),
    getContent("footer.contactTitle", "تواصل معنا"),
    getContent("footer.socialTitle", "تابعنا"),
  ]);

  return (
    <footer className="mt-auto border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              { }
              <img src={settings.branding.logoUrl || "/ejs-logo.png"} alt={settings.branding.siteNameAr} className="h-11 w-11 rounded-xl object-contain ring-1 ring-primary/10 bg-white p-0.5" />
              { }
              <img src="/moe-logo.png" alt="وزارة التربية والتعليم" className="h-10 w-10 rounded-lg object-contain ring-1 ring-primary/10 bg-white p-0.5" />
              <div className="leading-tight">
                <div className="font-extrabold">{settings.branding.siteNameAr}</div>
                <div className="text-[11px] text-muted-foreground" dir="ltr">
                  {settings.branding.siteNameEn}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {footerDescription}
            </p>
          </div>

          {/* quick links */}
          <div>
            <h3 className="mb-3 text-sm font-bold text-foreground">{footerQuickLinksTitle}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/schools" className="hover:text-primary">ابحث عن مدرسة</Link></li>
              <li><Link href="/faq" className="hover:text-primary">الأسئلة الشائعة</Link></li>
              <li><Link href="/documents" className="hover:text-primary">مركز المستندات</Link></li>
              <li><Link href="/news" className="hover:text-primary">الأخبار</Link></li>
              <li><Link href="/about" className="hover:text-primary">عن المدارس</Link></li>
            </ul>
          </div>

          {/* contact */}
          <div>
            <h3 className="mb-3 text-sm font-bold text-foreground">{footerContactTitle}</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span className="nums" dir="ltr">{settings.contact.phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span dir="ltr">{settings.contact.email}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{settings.contact.addressAr}</span>
              </li>
            </ul>
          </div>

          {/* social */}
          <div>
            <h3 className="mb-3 text-sm font-bold text-foreground">{footerSocialTitle}</h3>
            <div className="flex flex-wrap gap-2">
              {settings.social.facebook && (
                <a href={settings.social.facebook} target="_blank" rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-background border border-border hover:border-primary hover:text-primary transition-colors"
                  aria-label="فيسبوك">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {settings.social.instagram && (
                <a href={settings.social.instagram} target="_blank" rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-background border border-border hover:border-primary hover:text-primary transition-colors"
                  aria-label="انستجرام">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {settings.social.youtube && (
                <a href={settings.social.youtube} target="_blank" rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-background border border-border hover:border-primary hover:text-primary transition-colors"
                  aria-label="يوتيوب">
                  <Youtube className="h-5 w-5" />
                </a>
              )}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {settings.contact.workingHoursAr}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {settings.branding.siteNameAr} — جميع الحقوق محفوظة
          </p>
          <p className="nums">العام الدراسي {settings.admission.year}</p>
        </div>
      </div>
    </footer>
  );
}
