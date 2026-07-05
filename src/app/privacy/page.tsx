import { PublicShell } from "@/components/public/public-shell";
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { db } from "@/lib/db";
import { getContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "سياسة الخصوصية | المدارس المصرية اليابانية",
  description: "كيف نتعامل مع بياناتك الشخصية على منصة التقديم للمدارس المصرية اليابانية",
};

export default async function PrivacyPage() {
  const body = await getContent(
    "terms.privacy",
    "لم يتم تعريف سياسة الخصوصية بعد. يرجى مراجعة الإدارة."
  );
  const contentBlock = await db.contentBlock.findUnique({
    where: { key: "terms.privacy" },
    select: { updatedAt: true },
  });
  const sections = parseBulletSections(body);

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <header>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Shield className="h-3.5 w-3.5" /> وثيقة رسمية
          </div>
          <h1 className="mt-3 text-3xl font-extrabold">سياسة الخصوصية</h1>
          <p className="mt-2 text-muted-foreground">
            توضح هذه الصفحة كيف تجمع المدارس المصرية اليابانية بياناتك وتستخدمها وتحميها.
          </p>
        </header>

        {sections.length === 1 ? (
          <Card className="p-5">
            <pre className="whitespace-pre-wrap text-sm leading-loose text-foreground/90 font-sans">{body}</pre>
          </Card>
        ) : (
          sections.map((s, i) => (
            <Card key={i} className="p-5 space-y-3">
              {s.title && <h2 className="text-xl font-bold text-primary">{s.title}</h2>}
              {s.intro && <p className="text-sm leading-loose text-foreground/90">{s.intro}</p>}
              {s.bullets.length > 0 && (
                <ul className="list-disc pr-5 space-y-1 text-sm text-foreground/90">
                  {s.bullets.map((b, j) => (<li key={j}>{b}</li>))}
                </ul>
              )}
              {s.tail && <p className="text-sm leading-loose text-foreground/90">{s.tail}</p>}
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
          </p>
        )}
      </div>
    </PublicShell>
  );
}

interface PrivacySection { title?: string; intro?: string; bullets: string[]; tail?: string; }

function parseBulletSections(text: string): PrivacySection[] {
  // Headings in the privacy block end with ":". We split on lines that
  // are *just* a heading (no colon + bullets after). For each section we
  // capture: title (everything before first ":"), intro line, bullet
  // list, and any trailing paragraphs.
  const lines = text.split(/\r?\n/);
  const sections: PrivacySection[] = [];
  let cur: PrivacySection = { bullets: [] };

  function push() {
    if (cur.title || cur.intro || cur.bullets.length || cur.tail) sections.push(cur);
    cur = { bullets: [] };
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.endsWith(":")) {
      push();
      cur.title = line.replace(/:$/, "").trim();
      continue;
    }
    if (/^[•\-\*]\s+/.test(line)) {
      cur.bullets.push(line.replace(/^[•\-\*]\s+/, "").trim());
      continue;
    }
    if (cur.title && !cur.intro) {
      cur.intro = line;
    } else if (cur.title) {
      cur.tail = (cur.tail ? cur.tail + " " : "") + line;
    }
  }
  push();
  if (sections.length === 0) return [{ bullets: [], body: text } as any];
  return sections;
}