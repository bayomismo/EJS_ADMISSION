import Link from "next/link";
import { Clock, Newspaper, ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { PublicShell } from "@/components/public/public-shell";
import { SectionHeading } from "@/components/public/section-heading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toArabicDigits } from "@/lib/arabic";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الأخبار | المدارس المصرية اليابانية",
  description: "آخر الأخبار والإعلانات الرسمية من المدارس المصرية اليابانية ووزارة التربية والتعليم",
  openGraph: { title: "الأخبار", locale: "ar_EG", type: "website" },
};

export default async function NewsPage() {
  const [items, categories] = await Promise.all([
    db.news.findMany({
      where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      include: { category: true },
    }),
    db.newsCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const featured = items.filter((n) => n.isFeatured).slice(0, 1)[0];
  const rest = featured ? items.filter((n) => n.id !== featured.id) : items;

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <SectionHeading
          title="الأخبار"
          subtitle="آخر أخبار وإعلانات المدارس المصرية اليابانية"
        />

        {/* categories filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Link href="/news">
            <Badge className="cursor-pointer bg-primary text-primary-foreground">الكل</Badge>
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/news?category=${c.slug}`}>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">{c.nameAr}</Badge>
            </Link>
          ))}
        </div>

        {/* featured */}
        {featured && (
          <Link href={`/news/${featured.slug}`} className="mb-8 block">
            <Card className="overflow-hidden p-0 transition-all hover:shadow-card">
              <div className="grid md:grid-cols-2">
                <div className="relative min-h-[200px] bg-gradient-to-l from-primary/20 via-primary/8 to-crimson/12 flex items-center justify-center">
                  <div className="absolute inset-0 bg-grid opacity-40" />
                  <Newspaper className="h-16 w-16 text-primary/40" />
                  <span className="absolute top-4 right-4 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white">
                    خبر مميز
                  </span>
                </div>
                <div className="p-6">
                  {featured.category && (
                    <Badge variant="secondary" className="mb-2">{featured.category.nameAr}</Badge>
                  )}
                  <h2 className="mb-2 text-xl font-extrabold leading-snug sm:text-2xl">
                    {featured.titleAr}
                  </h2>
                  {featured.excerptAr && (
                    <p className="mb-3 text-sm text-muted-foreground leading-relaxed">{featured.excerptAr}</p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="nums">
                      {toArabicDigits(new Date(featured.publishedAt || featured.createdAt).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }))}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        )}

        {/* grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((n) => (
            <Link key={n.id} href={`/news/${n.slug}`}>
              <Card className="group flex h-full flex-col p-5 transition-all hover:shadow-card hover:-translate-y-0.5">
                <div className="mb-3 flex h-32 items-center justify-center rounded-xl bg-gradient-to-l from-primary/12 to-crimson/8">
                  <Newspaper className="h-10 w-10 text-primary/40" />
                </div>
                {n.category && (
                  <Badge variant="secondary" className="mb-2 w-fit text-[10px]">{n.category.nameAr}</Badge>
                )}
                <h3 className="mb-2 font-bold leading-snug line-clamp-2 group-hover:text-primary">
                  {n.titleAr}
                </h3>
                {n.excerptAr && (
                  <p className="mb-3 text-sm text-muted-foreground line-clamp-2 flex-1">{n.excerptAr}</p>
                )}
                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className="nums">{toArabicDigits(new Date(n.publishedAt || n.createdAt).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }))}</span>
                  </span>
                  <span className="flex items-center gap-1 font-medium text-primary">
                    اقرأ المزيد <ArrowLeft className="h-3 w-3" />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {items.length === 0 && (
          <Card className="flex flex-col items-center justify-center gap-2 p-16 text-center">
            <Newspaper className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">لا توجد أخبار منشورة حالياً</p>
          </Card>
        )}
      </div>
    </PublicShell>
  );
}
