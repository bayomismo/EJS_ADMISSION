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
  const settings = await getSiteSettings();
  return {
    title: settings.seo.metaTitleAr || settings.branding.siteNameAr,
    description: settings.seo.metaDescriptionAr,
    keywords: settings.seo.keywordsAr?.split(",").map((k) => k.trim()),
    icons: {
      icon: settings.branding.faviconUrl || "/logo.svg",
    },
    openGraph: {
      title: settings.seo.metaTitleAr,
      description: settings.seo.metaDescriptionAr,
      type: "website",
      locale: "ar_EG",
    },
    authors: [{ name: "وزارة التربية والتعليم والتعليم الفني - مصر" }],
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSiteSettings();
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} font-sans antialiased bg-background text-foreground`}
      >
        <SessionProviderWrapper>
          <QueryProvider>
            {children}
            <Toaster />
            <SonnerToaster position="top-center" richColors closeButton />
          </QueryProvider>
        </SessionProviderWrapper>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              name: settings.branding.siteNameAr,
              alternateName: settings.branding.siteNameEn,
              url: settings.social.website,
              email: settings.contact.email,
              telephone: settings.contact.phone,
            }),
          }}
        />
      </body>
    </html>
  );
}
