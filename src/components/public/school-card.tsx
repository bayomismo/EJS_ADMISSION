import Link from "next/link";
import { MapPin, Users, GraduationCap, Star, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SCHOOL_TYPES, SCHOOL_GENDERS } from "@/lib/constants";
import { toArabicNumber } from "@/lib/arabic";

export interface SchoolCardData {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  type: string;
  gender: string;
  capacity: number | null;
  isFeatured: boolean;
  governorate: { nameAr: string };
  city: { nameAr: string };
  addressAr: string | null;
}

export function SchoolCard({ school }: { school: SchoolCardData }) {
  const type = SCHOOL_TYPES.find((t) => t.value === school.type);
  const gender = SCHOOL_GENDERS.find((g) => g.value === school.gender);

  return (
    <Card className="group relative flex flex-col overflow-hidden p-0 transition-all hover:shadow-card hover:-translate-y-0.5">
      {/* cover strip */}
      <div className="relative h-28 bg-gradient-to-l from-primary/15 via-primary/5 to-crimson/10">
        <div className="absolute inset-0 bg-grid opacity-40" />
        {school.isFeatured && (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-soft">
            <Star className="h-3 w-3 fill-current" /> مدرسة مميزة
          </span>
        )}
        <span className="absolute top-3 left-3 rounded-md bg-background/90 px-2 py-1 text-[11px] font-bold text-primary nums">
          {school.code}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="font-medium">
            {type?.labelAr || school.type}
          </Badge>
          <Badge variant="outline" className="font-medium">
            {gender?.labelAr || school.gender}
          </Badge>
        </div>

        <h3 className="mb-1.5 line-clamp-2 text-base font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
          {school.nameAr}
        </h3>

        <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary/70" />
          <span>
            {school.governorate.nameAr} — {school.city.nameAr}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-border/60">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {school.capacity != null && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span className="nums">{toArabicNumber(school.capacity)}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5" />
              KG1–G3
            </span>
          </div>
          <Link
            href={`/schools/${school.code}`}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            التفاصيل
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
