"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Calendar, Globe, Phone, Share2, Search, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { SiteSettings } from "@/lib/constants";

export function SettingsManager({ initial }: { initial: SiteSettings }) {
  const [s, setS] = useState<SiteSettings>(initial);
  const [saving, setSaving] = useState(false);

  function set(group: keyof SiteSettings, key: string, value: any) {
    setS((p) => ({ ...p, [group]: { ...(p as any)[group], [key]: value } }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("تم حفظ الإعدادات بنجاح");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">إعدادات الموقع</h1>
          <p className="text-sm text-muted-foreground">تحكم كامل في المحتوى والإعدادات دون الحاجة لتعديل الكود</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
          حفظ التغييرات
        </Button>
      </div>

      <Tabs defaultValue="admission" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="admission"><Calendar className="ml-1.5 h-4 w-4" /> القبول</TabsTrigger>
          <TabsTrigger value="branding"><Palette className="ml-1.5 h-4 w-4" /> الهوية</TabsTrigger>
          <TabsTrigger value="contact"><Phone className="ml-1.5 h-4 w-4" /> التواصل</TabsTrigger>
          <TabsTrigger value="social"><Share2 className="ml-1.5 h-4 w-4" /> التواصل الاجتماعي</TabsTrigger>
          <TabsTrigger value="seo"><Search className="ml-1.5 h-4 w-4" /> SEO</TabsTrigger>
          <TabsTrigger value="general"><Globe className="ml-1.5 h-4 w-4" /> عام</TabsTrigger>
        </TabsList>

        {/* Admission */}
        <TabsContent value="admission">
          <Card className="p-6 space-y-4">
            <h2 className="font-bold">إعدادات القبول</h2>
            <p className="text-sm text-muted-foreground -mt-2">تتحكم هذه الإعدادات في حالة القبول الظاهرة في الموقع والعداد التنازلي</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="العام الدراسي">
                <Input value={s.admission.year} onChange={(e) => set("admission", "year", e.target.value)} placeholder="2026/2027" />
              </Field>
              <Field label="حالة القبول">
                <Select value={s.admission.status} onValueChange={(v) => set("admission", "status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPCOMING">قريباً</SelectItem>
                    <SelectItem value="OPEN">مفتوح</SelectItem>
                    <SelectItem value="CLOSED">مغلق</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="تاريخ فتح التقديم">
                <Input type="datetime-local" value={s.admission.openDate ? toLocalInput(s.admission.openDate) : ""} onChange={(e) => set("admission", "openDate", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </Field>
              <Field label="تاريخ إغلاق التقديم">
                <Input type="datetime-local" value={s.admission.closeDate ? toLocalInput(s.admission.closeDate) : ""} onChange={(e) => set("admission", "closeDate", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </Field>
            </div>
            <Field label="المرحلة / الوصف">
              <Input value={s.admission.phasesLabel} onChange={(e) => set("admission", "phasesLabel", e.target.value)} />
            </Field>
            <Field label="ملاحظات">
              <Textarea value={s.admission.notes} onChange={(e) => set("admission", "notes", e.target.value)} rows={2} />
            </Field>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding">
          <Card className="p-6 space-y-4">
            <h2 className="font-bold">هوية الموقع</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="اسم الموقع (عربي)"><Input value={s.branding.siteNameAr} onChange={(e) => set("branding", "siteNameAr", e.target.value)} /></Field>
              <Field label="اسم الموقع (إنجليزي)"><Input value={s.branding.siteNameEn} onChange={(e) => set("branding", "siteNameEn", e.target.value)} dir="ltr" /></Field>
              <Field label="الشعار (عربي)"><Input value={s.branding.taglineAr} onChange={(e) => set("branding", "taglineAr", e.target.value)} /></Field>
              <Field label="الشعار (إنجليزي)"><Input value={s.branding.taglineEn} onChange={(e) => set("branding", "taglineEn", e.target.value)} dir="ltr" /></Field>
              <Field label="رابط الشعار (Logo URL)"><Input value={s.branding.logoUrl} onChange={(e) => set("branding", "logoUrl", e.target.value)} dir="ltr" placeholder="/logo.svg" /></Field>
              <Field label="رابط الأيقونة (Favicon)"><Input value={s.branding.faviconUrl} onChange={(e) => set("branding", "faviconUrl", e.target.value)} dir="ltr" /></Field>
            </div>
          </Card>
        </TabsContent>

        {/* Contact */}
        <TabsContent value="contact">
          <Card className="p-6 space-y-4">
            <h2 className="font-bold">معلومات التواصل</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الهاتف"><Input value={s.contact.phone} onChange={(e) => set("contact", "phone", e.target.value)} dir="ltr" /></Field>
              <Field label="البريد الإلكتروني"><Input value={s.contact.email} onChange={(e) => set("contact", "email", e.target.value)} dir="ltr" /></Field>
            </div>
            <Field label="العنوان (عربي)"><Input value={s.contact.addressAr} onChange={(e) => set("contact", "addressAr", e.target.value)} /></Field>
            <Field label="العنوان (إنجليزي)"><Input value={s.contact.addressEn} onChange={(e) => set("contact", "addressEn", e.target.value)} dir="ltr" /></Field>
            <Field label="رابط الخريطة"><Input value={s.contact.mapUrl} onChange={(e) => set("contact", "mapUrl", e.target.value)} dir="ltr" /></Field>
            <Field label="ساعات العمل"><Input value={s.contact.workingHoursAr} onChange={(e) => set("contact", "workingHoursAr", e.target.value)} /></Field>
          </Card>
        </TabsContent>

        {/* Social */}
        <TabsContent value="social">
          <Card className="p-6 space-y-4">
            <h2 className="font-bold">روابط التواصل الاجتماعي</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="فيسبوك"><Input value={s.social.facebook} onChange={(e) => set("social", "facebook", e.target.value)} dir="ltr" /></Field>
              <Field label="انستجرام"><Input value={s.social.instagram} onChange={(e) => set("social", "instagram", e.target.value)} dir="ltr" /></Field>
              <Field label="X (تويتر)"><Input value={s.social.x} onChange={(e) => set("social", "x", e.target.value)} dir="ltr" /></Field>
              <Field label="يوتيوب"><Input value={s.social.youtube} onChange={(e) => set("social", "youtube", e.target.value)} dir="ltr" /></Field>
              <Field label="تيك توك"><Input value={s.social.tiktok} onChange={(e) => set("social", "tiktok", e.target.value)} dir="ltr" /></Field>
              <Field label="الموقع الرسمي"><Input value={s.social.website} onChange={(e) => set("social", "website", e.target.value)} dir="ltr" /></Field>
            </div>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo">
          <Card className="p-6 space-y-4">
            <h2 className="font-bold">إعدادات تحسين محركات البحث (SEO)</h2>
            <Field label="عناف الصفحة (Meta Title)"><Input value={s.seo.metaTitleAr} onChange={(e) => set("seo", "metaTitleAr", e.target.value)} /></Field>
            <Field label="الوصف (Meta Description)"><Textarea value={s.seo.metaDescriptionAr} onChange={(e) => set("seo", "metaDescriptionAr", e.target.value)} rows={2} /></Field>
            <Field label="الكلمات المفتاحية (مفصولة بفواصل)"><Input value={s.seo.keywordsAr} onChange={(e) => set("seo", "keywordsAr", e.target.value)} /></Field>
            <Field label="رابط صورة المشاركة (OG Image)"><Input value={s.seo.ogImageUrl} onChange={(e) => set("seo", "ogImageUrl", e.target.value)} dir="ltr" /></Field>
          </Card>
        </TabsContent>

        {/* General */}
        <TabsContent value="general">
          <Card className="p-6 space-y-4">
            <h2 className="font-bold">إعدادات عامة</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="نمط الأرقام">
                <Select value={s.general.numeralStyle} onValueChange={(v) => set("general", "numeralStyle", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arabic">عربية (٠١٢٣)</SelectItem>
                    <SelectItem value="western">غربية (0123)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="رابط بوابة التقديم الخارجية"><Input value={s.general.applicationPortalUrl} onChange={(e) => set("general", "applicationPortalUrl", e.target.value)} dir="ltr" /></Field>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium">شريط الإعلان العلوي</div>
                <div className="text-xs text-muted-foreground">يظهر أعلى الموقع</div>
              </div>
              <Switch checked={s.general.announcementBarEnabled} onCheckedChange={(v) => set("general", "announcementBarEnabled", v)} />
            </div>
            <Field label="نص شريط الإعلان">
              <Input value={s.general.announcementBarText} onChange={(e) => set("general", "announcementBarText", e.target.value)} />
            </Field>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
          حفظ جميع التغييرات
        </Button>
      </div>
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
