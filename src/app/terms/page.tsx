import { PublicShell } from "@/components/public/public-shell";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { db } from "@/lib/db";
import { getContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الشروط والأحكام | المدارس المصرية اليابانية",
  description: "الشروط والأحكام الخاصة بتقديم طلبات الالتحاق بالمدارس المصرية اليابانية",
};

export default async function TermsPage() {
  // Read from the CMS block (terms.full); admin can edit via
  // /admin/content (group: الشروط والخصوصية).
  const body = await getContent(
    "terms.full",
    "لم يتم تعريف الشروط بعد. يرجى مراجعة الإدارة."
  );

  // Also load the structured headings via DB regex (cheap; one row)
  const contentBlock = await db.contentBlock.findUnique({
    where: { key: "terms.full" },
    select: { updatedAt: true, label: true },
  });

  // Convert body to a structured view: split by "١."/"٢." etc. headings
  const sections = parseNumberedSections(body);

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <header>
          <div className="inline-flex items-center gap-2 rounded-full bg-crimson/10 px-3 py-1 text-xs font-bold text-crimson">
            <FileText className="h-3.5 w-3.5" /> وثيقة رسمية
          </div>
          <h1 className="mt-3 text-3xl font-extrabold">الشروط والأحكام</h1>
          <p className="mt-2 text-muted-foreground">
            باستخدامك لمنصة التقديم، فإنك توافق على الشروط التالية.
          </p>
        </header>

        {sections.length === 1 ? (
          <Card className="p-5">
            <pre className="whitespace-pre-wrap text-sm leading-loose text-foreground/90 font-sans">{body}</pre>
          </Card>
        ) : (
          sections.map((s, i) => (
            <Card key={i} className="p-5 space-y-3">
              {s.title && <h2 className="text-xl font-bold text-crimson">{s.title}</h2>}
              <p className="text-sm leading-loose text-foreground/90 whitespace-pre-line">{s.body}</p>
            </Card>
          ))
        )}

        {contentBlock?.updatedAt && (
          <p className="text-xs text-muted-foreground">
            آخر تحديث:{" "}
            {contentBlock.updatedAt.toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {" "}— هذه الوثيقة قابلة للتعديل من قبل إدارة المنصة (المحرر).
          </p>
        )}
      </div>
    </PublicShell>
  );
}

// Split a body that contains numbered Arabic headings ("١."/"٢."...) into
// structured sections. Lines starting with "•" or "-" stay attached to the
// current section body.
function parseNumberedSections(text: string): { title?: string; body: string }[] {
  // Match lines that START with arabic-indic digit "١." through "٩." or "٠"
  const re = /^([١٢٣٤٥٦٧٨٩٠])\.\s+(.+)$/gm;
  const sections: { title?: string; body: string }[] = [];
  const matches = [...text.matchAll(re)];
  if (matches.length === 0) return [{ body: text }];

  // Intro before first heading
  const firstIdx = matches[0].index!;
  if (firstIdx > 0) {
    const intro = text.substring(0, firstIdx).trim();
    if (intro) sections.push({ body: intro });
  }
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const titleStart = cur.index! + cur[0].length;
    const bodyStart = titleStart + cur[2].length;
    const bodyEnd = next ? next.index! : text.length;
    const body = text.substring(bodyStart, bodyEnd).trim();
    sections.push({ title: `${cur[1]}. ${cur[2].trim()}`, body });
  }
  return sections;
}