import Link from "next/link";
import { FileText, Download, FileSpreadsheet, FileImage, FileType } from "lucide-react";
import { db } from "@/lib/db";
import { PublicShell } from "@/components/public/public-shell";
import { SectionHeading } from "@/components/public/section-heading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toArabicNumber, toArabicDigits } from "@/lib/arabic";

export const dynamic = "force-dynamic";

function fileIcon(type?: string | null) {
  if (type === "docx") return FileText;
  if (type === "xlsx") return FileSpreadsheet;
  if (type === "image") return FileImage;
  return FileType;
}

export default async function DocumentsPage() {
  const [items, categories] = await Promise.all([
    db.document.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    db.documentCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const grouped = categories
    .map((c) => ({ ...c, items: items.filter((i) => i.categoryId === c.id) }))
    .filter((g) => g.items.length > 0);
  const uncategorized = items.filter((i) => !i.categoryId);

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <SectionHeading
          title="مركز المستندات"
          subtitle="شروط القبول، نماذج التقديم، والأدلة الإرشادية — متاحة للتحميل"
        />

        {grouped.map((group) => (
          <div key={group.id} className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <span className="h-5 w-1.5 rounded-full bg-crimson" />
              {group.nameAr}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((d) => {
                const Icon = fileIcon(d.fileType);
                return (
                  <Card key={d.id} className="group flex flex-col p-5 transition-all hover:shadow-card hover:-translate-y-0.5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase">{d.fileType || "pdf"}</Badge>
                    </div>
                    <h3 className="mb-1 font-bold leading-snug line-clamp-2">{d.titleAr}</h3>
                    {d.descriptionAr && (
                      <p className="mb-3 text-sm text-muted-foreground line-clamp-2 flex-1">{d.descriptionAr}</p>
                    )}
                    <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        <span className="nums">{toArabicNumber(d.downloadCount)}</span>
                      </span>
                      <button className="flex items-center gap-1 font-medium text-primary hover:underline">
                        <FileText className="h-3.5 w-3.5" /> تحميل
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {uncategorized.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <span className="h-5 w-1.5 rounded-full bg-crimson" /> مستندات أخرى
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {uncategorized.map((d) => (
                <Card key={d.id} className="p-5">
                  <h3 className="font-bold">{d.titleAr}</h3>
                </Card>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <Card className="flex flex-col items-center gap-2 p-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">لا توجد مستندات متاحة حالياً</p>
          </Card>
        )}
      </div>
    </PublicShell>
  );
}
