import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { getSiteSettings } from "@/lib/settings";
import { PublicShell } from "@/components/public/public-shell";
import { SectionHeading } from "@/components/public/section-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await getSiteSettings();

  const info = [
    { icon: Phone, label: "الهاتف", value: settings.contact.phone, dir: "ltr" },
    { icon: Mail, label: "البريد الإلكتروني", value: settings.contact.email, dir: "ltr" },
    { icon: MapPin, label: "العنوان", value: settings.contact.addressAr, dir: "rtl" },
    { icon: Clock, label: "ساعات العمل", value: settings.contact.workingHoursAr, dir: "rtl" },
  ];

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <SectionHeading
          title="تواصل معنا"
          subtitle="نحن هنا للإجابة على استفساراتك حول المدارس المصرية اليابانية"
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* info */}
          <div className="space-y-4">
            {info.map((i) => (
              <Card key={i.label} className="flex items-center gap-4 p-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <i.icon className="h-6 w-6" />
                </span>
                <div>
                  <div className="text-sm text-muted-foreground">{i.label}</div>
                  <div className="font-bold nums" dir={i.dir}>{i.value}</div>
                </div>
              </Card>
            ))}
          </div>

          {/* form */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-bold">أرسل رسالة</h2>
            <form className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>الاسم</Label>
                  <Input placeholder="اسمك الكامل" />
                </div>
                <div className="space-y-1.5">
                  <Label>الهاتف</Label>
                  <Input placeholder="رقم الهاتف" dir="ltr" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>البريد الإلكتروني</Label>
                <Input type="email" placeholder="email@example.com" dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>الرسالة</Label>
                <Textarea rows={5} placeholder="اكتب استفسارك هنا..." />
              </div>
              <Button type="submit" className="w-full h-11 bg-crimson hover:bg-crimson/90 text-white">
                <Send className="ml-2 h-4 w-4" /> إرسال الرسالة
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                لل inquiries العاجلة اتصل بالخط الساخن {settings.contact.phone}
              </p>
            </form>
          </Card>
        </div>
      </div>
    </PublicShell>
  );
}
