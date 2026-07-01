import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, ArrowRight, Newspaper, Eye } from "lucide-react";
import { db } from "@/lib/db";
import { PublicShell } from "@/components/public/public-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toArabicDigits, toArabicNumber } from "@/lib/arabic";

export const dynamic = "force-dynamic";

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const news = await db.news.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!news || news.status !== "PUBLISHED") notFound();

  // increment views
  await db.news.update({ where: { id: news.id }, data: { viewCount: { increment: 1 } } });

  const related = await db.news.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      id: { not: news.id },
      ...(news.categoryId ? { categoryId: news.categoryId } : {}),
    },
    take: 3,
    orderBy: { publishedAt: "desc" },
  });

  return (
    <PublicShell>
      <div className="border-b border-border bg-secondary/30">
        <div className="mx-auto flex max-w-4xl items-center gap-1.5 px-4 py-3 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary">الرئيسية</Link>
          <span className="opacity-50">/</span>
          <Link href="/news" className="hover:text-primary">الأخبار</Link>
        </div>
      </div>

      <article className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          {news.category && (
            <Badge variant="secondary" className="mb-3">{news.category.nameAr}</Badge>
          )}
          <h1 className="text-3xl font-extrabold leading-tight text-foreground sm:text-4xl text-balance">
            {news.titleAr}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span className="nums">
                {toArabicDigits(new Date(news.publishedAt || news.createdAt).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }))}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              <span className="nums">{toArabicNumber(news.viewCount + 1)}</span> مشاهدة
            </span>
          </div>
        </div>

        <div className="mb-8 flex h-56 items-center justify-center rounded-2xl bg-gradient-to-l from-primary/15 via-primary/5 to-crimson/10">
          <div className="absolute inset-0 bg-grid opacity-30 rounded-2xl" />
          <Newspaper className="h-20 w-20 text-primary/30" />
        </div>

        {news.excerptAr && (
          <p className="mb-6 border-r-4 border-primary pr-4 text-lg font-medium leading-relaxed text-foreground">
            {news.excerptAr}
          </p>
        )}

        <div className="prose prose-lg max-w-none">
          {news.bodyAr.split("\n").map((para, i) => (
            <p key={i} className="mb-4 text-base leading-loose text-foreground/90">{para}</p>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <Button asChild variant="outline">
            <Link href="/news"><ArrowRight className="ml-2 h-4 w-4" /> العودة للأخبار</Link>
          </Button>
        </div>

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 text-xl font-bold">أخبار ذات صلة</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link key={r.id} href={`/news/${r.slug}`}>
                  <Card className="group h-full p-4 transition-all hover:shadow-card">
                    <h3 className="mb-2 font-bold text-sm leading-snug line-clamp-2 group-hover:text-primary">{r.titleAr}</h3>
                    <span className="text-xs text-muted-foreground nums">
                      {toArabicDigits(new Date(r.publishedAt || r.createdAt).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }))}
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </PublicShell>
  );
}
