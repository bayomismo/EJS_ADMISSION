import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXTAUTH_URL || "https://ejs.moe.gov.eg";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/apply/check"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}