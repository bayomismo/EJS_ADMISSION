import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin, Phone, Mail, Users, GraduationCap, Building2, Star,
  ArrowRight, ExternalLink, Navigation, CheckCircle2, Library,
} from "lucide-react";
import { db } from "@/lib/db";
import { getSiteSettings, computeLiveStatus } from "@/lib/settings";
import { PublicShell } from "@/components/public/public-shell";
import { ShareButton } from "@/components/public/share-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SCHOOL_TYPES, SCHOOL_GENDERS } from "@/lib/constants";
import { toArabicNumber } from "@/lib/arabic";

export const dynamic = "force-dynamic";

export default async function SchoolProfilePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  // Next.js 16 does not auto-decode dynamic-segment params; codes with
  // spaces (e.g. "IHAB 01") arrive URL-encoded as "IHAB%2001".
  const code = decodeURIComponent((await params).code);
  const school = await db.school.findFirst({
    where: { code, isActive: true, isArchived: false },
    include: {
      governorate: true,
      city: true,
      images: { orderBy: { sortOrder: "asc" } },
      facilities: { include: { facility: true } },
      grades: { include: { grade: true }, orderBy: { grade: { sortOrder: "asc" } } },
    },
  });

  if (!school) notFound();

  const settings = await getSiteSettings();
  const live = computeLiveStatus(settings.admission);
  const type = SCHOOL_TYPES.find((t) => t.value === school.type);
  const gender = SCHOOL_GENDERS.find((g) => g.value === school.gender);
  const applyUrl = school.applicationUrl || settings.general.applicationPortalUrl;

  return (
    <PublicShell>
      {/* breadcrumb */}
      <div className="border-b border-border bg-secondary/30">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-4 py-3 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary">الرئيسية</Link>
          <span className="opacity-50">/</span>
          <Link href="/schools" className="hover:text-primary">المدارس</Link>
          <span className="opacity-50">/</span>
          <span className="font-medium text-foreground truncate">{school.nameAr}</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* main */}
          <div className="lg:col-span-2 space-y-6">
            {/* header card */}
            <Card className="overflow-hidden p-0">
              <div className="relative h-44 bg-gradient-to-l from-primary/20 via-primary/8 to-crimson/12">
                <div className="absolute inset-0 bg-grid opacity-40" />
                {school.isFeatured && (
                  <span className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-soft">
                    <Star className="h-3.5 w-3.5 fill-current" /> مدرسة مميزة
                  </span>
                )}
                <span className="absolute top-4 left-4 rounded-md bg-background/90 px-3 py-1 text-xs font-bold text-primary nums">
                  {school.code}
                </span>
              </div>
              <div className="p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-medium">{type?.labelAr || school.type}</Badge>
                  <Badge variant="outline" className="font-medium">{gender?.labelAr || school.gender}</Badge>
                  <Badge variant="outline" className="font-medium">{school.governorate.nameAr}</Badge>
                </div>
                <h1 className="text-2xl font-extrabold leading-tight text-foreground sm:text-3xl">
                  {school.nameAr}
                </h1>
                {school.nameEn && (
                  <p className="mt-1 text-base text-muted-foreground" dir="ltr">{school.nameEn}</p>
                )}
                {school.addressAr && (
                  <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{school.addressAr} — {school.city.nameAr}، {school.governorate.nameAr}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* description */}
            {school.descriptionAr && (
              <Card className="p-6">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                  <Building2 className="h-5 w-5 text-primary" /> نبذة عن المدرسة
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {school.descriptionAr}
                </p>
              </Card>
            )}

            {/* facilities */}
            {school.facilities.length > 0 && (
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Library className="h-5 w-5 text-primary" /> المرافق والمنشآت
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {school.facilities.map((f) => (
                    <div key={f.facilityId} className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 p-3">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span className="text-sm font-medium">{f.facility.nameAr}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* grades */}
            {school.grades.length > 0 && (
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <GraduationCap className="h-5 w-5 text-primary" /> المراحل الدراسية
                </h2>
                <div className="flex flex-wrap gap-2">
                  {school.grades.map((g) => (
                    <Badge key={g.gradeId} variant="secondary" className="px-3 py-1.5 text-sm">
                      {g.grade.nameAr}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* map */}
            {school.lat && school.lng && (
              <Card className="overflow-hidden p-0">
                <div className="border-b border-border p-4">
                  <h2 className="flex items-center gap-2 text-lg font-bold">
                    <MapPin className="h-5 w-5 text-primary" /> الموقع على الخريطة
                  </h2>
                </div>
                <iframe
                  title="موقع المدرسة"
                  className="h-72 w-full"
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${school.lng - 0.01}%2C${school.lat - 0.008}%2C${school.lng + 0.01}%2C${school.lat + 0.008}&layer=mapnik&marker=${school.lat}%2C${school.lng}`}
                />
              </Card>
            )}
          </div>

          {/* sidebar */}
          <div className="space-y-4">
            {/* apply card */}
            <Card className="overflow-hidden p-0 shadow-card sticky top-24">
              <div className="bg-gradient-to-l from-crimson to-rose-600 p-5 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-90">حالة القبول</span>
                  <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold">
                    {live.label}
                  </span>
                </div>
                <div className="mt-1 text-sm opacity-90 nums">العام {settings.admission.year}</div>
              </div>
              <div className="p-5 space-y-3">
                <Button
                  asChild
                  className="w-full h-12 bg-crimson hover:bg-crimson/90 text-white text-base"
                  disabled={live.status === "CLOSED"}
                >
                  <a href={applyUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="ml-2 h-5 w-5" /> قدّم الآن
                  </a>
                </Button>
                {live.status === "CLOSED" && (
                  <p className="text-center text-xs text-muted-foreground">
                    التقديم مغلق حالياً لهذا العام
                  </p>
                )}
                {school.lat && school.lng && (
                  <Button asChild variant="outline" className="w-full h-11">
                    <a
                      href={`https://www.google.com/maps?q=${school.lat},${school.lng}`}
                      target="_blank" rel="noreferrer"
                    >
                      <Navigation className="ml-2 h-4 w-4" /> الاتجاهات
                    </a>
                  </Button>
                )}
                <ShareButton title={school.nameAr} />
              </div>
            </Card>

            {/* info card */}
            <Card className="p-5 space-y-3">
              <h3 className="font-bold">معلومات المدرسة</h3>
              <div className="space-y-2.5 text-sm">
                <InfoRow icon={Building2} label="الكود" value={school.code} mono />
                <InfoRow icon={MapPin} label="المحافظة" value={school.governorate.nameAr} />
                <InfoRow icon={MapPin} label="المدينة" value={school.city.nameAr} />
                <InfoRow icon={GraduationCap} label="النوع" value={type?.labelAr || school.type} />
                <InfoRow icon={Users} label="النوع" value={gender?.labelAr || school.gender} />
                {school.capacity != null && (
                  <InfoRow icon={Users} label="السعة" value={`${toArabicNumber(school.capacity)} طالب`} />
                )}
                {school.phone && (
                  <InfoRow icon={Phone} label="الهاتف" value={school.phone} mono />
                )}
                {school.email && (
                  <InfoRow icon={Mail} label="البريد" value={school.email} mono />
                )}
              </div>
            </Card>

            <Card className="p-5">
              <Link href="/schools" className="flex items-center justify-between text-sm font-medium text-primary hover:underline">
                <span className="flex items-center gap-1.5">
                  <ArrowRight className="h-4 w-4" /> العودة لقائمة المدارس
                </span>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

function InfoRow({
  icon: Icon, label, value, mono,
}: {
  icon: any; label: string; value: string; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-primary/70" /> {label}
      </span>
      <span className={`font-medium ${mono ? "nums" : ""}`} dir={mono ? "ltr" : "rtl"}>{value}</span>
    </div>
  );
}
