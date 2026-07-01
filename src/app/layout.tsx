import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { SessionProviderWrapper } from "@/providers/session-provider";
import { QueryProvider } from "@/providers/query-provider";
import { getSiteSettings } from "@/lib/settings";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  // Fail-safe metadata. If the DB is unreachable (e.g. during cold-start
  // prerender of /_not-found, or while running migrations), fall back to
  // a sensible default so the build does not abort.
  const fallback: Metadata = {
    title: "المدارس المصرية اليابانية",
    description: "منصة التقديم للمدارس المصرية اليابانية",
    icons: { icon: "/logo.svg" },
  };
  try {
    const settings = await getSiteSettings();
    return {
      title: settings.seo.metaTitleAr || settings.branding.siteNameAr,
      description: settings.seo.metaDescriptionAr,
      keywords: settings.seo.keywordsAr?.split(",").map((k) => k.trim()),
      icons: { icon: settings.branding.faviconUrl || "/logo.svg" },
      openGraph: {
        title: settings.seo.metaTitleAr,
        description: settings.seo.metaDescriptionAr,
        type: "website",
        locale: "ar_EG",
      },
      authors: [{ name: "وزارة التربية والتعليم والتعليم الفني - مصر" }],
    };
  } catch {
    return fallback;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Default placeholder values; the JSON-LD below uses real settings when
  // the DB is reachable and silently skips them when it is not.
  let orgJsonLd: string | null = null;
  try {
    const settings = await getSiteSettings();
    orgJsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      name: settings.branding.siteNameAr,
      alternateName: settings.branding.siteNameEn,
      url: settings.social.website,
      email: settings.contact.email,
      telephone: settings.contact.phone,
    });
  } catch {
    // DB unreachable during this render — skip the JSON-LD rather than
    // crash the page (e.g. during a /_not-found build prerender).
  }
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} font-sans antialiased bg-background text-foreground`}
      >
        {/* a11y: skip-to-main for keyboard users. Visible on focus only. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[100] focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:shadow-card"
        >
          تخطي إلى المحتوى الرئيسي
        </a>
        <SessionProviderWrapper>
          <QueryProvider>
            <main id="main">{children}</main>
            <Toaster />
            <SonnerToaster position="top-center" richColors closeButton />
          </QueryProvider>
        </SessionProviderWrapper>
        {orgJsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: orgJsonLd }}
          />
        ) : null}
      </body>
    </html>
  );
}
