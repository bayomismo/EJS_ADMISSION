import { db } from "@/lib/db";
import { PublicShell } from "@/components/public/public-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/public/section-heading";
import { GraduationCap, Users, MapPin, Award, BookOpen, Heart } from "lucide-react";

export const revalidate = 3600;

export default async function AboutPage() {
  const page = await db.page.findUnique({ where: { slug: "about" } });
  const counts = {
    schools: await db.school.count({ where: { isActive: true, isArchived: false } }),
    governorates: await db.governorate.count({ where: { isActive: true } }),
  };

  const values = [
    { icon: Heart, title: "تنمية متكاملة", desc: "نظام توكاتسو يُنمّي شخصية الطفل أكاديمياً واجتماعياً ونفسياً" },
    { icon: BookOpen, title: "منهج معتمد", desc: "المنهج المصري الرسمي مع منهجية يابانية في الأنشطة التربوية" },
    { icon: Users, title: "تعلم تعاوني", desc: "أنشطة جماعية تُعزز روح الفريق والقيادة والمسؤولية" },
    { icon: Award, title: "جودة تعليمية", desc: "شراكة مصرية يابانية بدعم فني من JICA" },
  ];

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <SectionHeading title="عن المدارس المصرية اليابانية" centered />

        <Card className="mb-8 overflow-hidden p-0">
          <div className="relative h-40 bg-gradient-to-l from-primary/20 via-primary/8 to-crimson/12 flex items-center justify-center">
            <div className="absolute inset-0 bg-grid opacity-40" />
            <GraduationCap className="h-16 w-16 text-primary/40" />
          </div>
          <div className="p-6 sm:p-8">
            <div className="prose prose-lg max-w-none">
              {(page?.bodyAr || "").split("\n").map((para, i) => (
                <p key={i} className="mb-4 text-base leading-loose text-foreground/90">{para}</p>
              ))}
            </div>
          </div>
        </Card>

        {/* stats */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <Card className="p-6 text-center">
            <MapPin className="mx-auto mb-2 h-8 w-8 text-primary" />
            <div className="text-3xl font-extrabold nums">{counts.governorates}</div>
            <div className="text-sm text-muted-foreground">محافظة</div>
          </Card>
          <Card className="p-6 text-center">
            <GraduationCap className="mx-auto mb-2 h-8 w-8 text-primary" />
            <div className="text-3xl font-extrabold nums">{counts.schools}</div>
            <div className="text-sm text-muted-foreground">مدرسة</div>
          </Card>
        </div>

        {/* values */}
        <h2 className="mb-4 text-2xl font-bold">لماذا المدارس المصرية اليابانية؟</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {values.map((v) => (
            <Card key={v.title} className="p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <v.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold mb-1">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
