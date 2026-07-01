"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, MapPin, Filter, X, SlidersHorizontal, ChevronRight, ChevronLeft,
  Building2, Inbox, Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SchoolCard, type SchoolCardData } from "@/components/public/school-card";
import { SectionHeading } from "@/components/public/section-heading";
import { toArabicNumber } from "@/lib/arabic";
import { cn } from "@/lib/utils";

interface Gov {
  id: string; nameAr: string; nameEn: string;
  cities: { id: string; nameAr: string; nameEn: string }[];
  _count?: { schools: number };
}

export function SchoolFinder({ governorates }: { governorates: Gov[] }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") || "");
  const [governorateId, setGovernorateId] = useState(sp.get("governorateId") || "all");
  const [cityId, setCityId] = useState(sp.get("cityId") || "all");
  const [type, setType] = useState(sp.get("type") || "all");
  const [gender, setGender] = useState(sp.get("gender") || "all");
  const [sort, setSort] = useState(sp.get("sort") || "governorate");
  const [showFilters, setShowFilters] = useState(false);

  const [items, setItems] = useState<SchoolCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const selectedGov = governorates.find((g) => g.id === governorateId);
  const cities = selectedGov?.cities || [];

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (governorateId !== "all") params.set("governorateId", governorateId);
    if (cityId !== "all") params.set("cityId", cityId);
    if (type !== "all") params.set("type", type);
    if (gender !== "all") params.set("gender", gender);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("pageSize", "12");
    try {
      const res = await fetch(`/api/public/schools?${params}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, governorateId, cityId, type, gender, sort, page]);

  useEffect(() => {
    const t = setTimeout(fetchSchools, 250);
    return () => clearTimeout(t);
  }, [fetchSchools]);

  // sync URL (shallow)
  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (governorateId !== "all") params.set("governorateId", governorateId);
    if (cityId !== "all") params.set("cityId", cityId);
    if (type !== "all") params.set("type", type);
    if (gender !== "all") params.set("gender", gender);
    params.set("sort", sort);
    router.replace(`/schools?${params.toString()}`, { scroll: false });
  }, [q, governorateId, cityId, type, gender, sort, router]);

  // reset city + page when governorate changes
  function setGovernorateAndReset(v: string) {
    setGovernorateId(v);
    setCityId("all");
    setPage(1);
  }

  // reset to page 1 when filters change — handled inline in setters below
  function setQAndReset(v: string) { setQ(v); setPage(1); }
  function setTypeAndReset(v: string) { setType(v); setPage(1); }
  function setGenderAndReset(v: string) { setGender(v); setPage(1); }
  function setSortAndReset(v: string) { setSort(v); setPage(1); }

  const activeFilters = useMemo(() => {
    const arr: { key: string; label: string }[] = [];
    if (governorateId !== "all") {
      const g = governorates.find((x) => x.id === governorateId);
      if (g) arr.push({ key: "gov", label: g.nameAr });
    }
    if (cityId !== "all") {
      const c = cities.find((x) => x.id === cityId);
      if (c) arr.push({ key: "city", label: c.nameAr });
    }
    if (type !== "all") arr.push({ key: "type", label: type === "ARABIC" ? "عربي" : "لغات" });
    if (gender !== "all") {
      arr.push({ key: "gender", label: gender === "MIXED" ? "مختلط" : gender === "MALE" ? "بنين" : "بنات" });
    }
    return arr;
  }, [governorateId, cityId, type, gender, governorates, cities]);

  function clearFilter(key: string) {
    if (key === "gov") setGovernorateId("all");
    if (key === "city") setCityId("all");
    if (key === "type") setType("all");
    if (key === "gender") setGender("all");
  }
  function clearAll() {
    setQ(""); setGovernorateId("all"); setCityId("all"); setType("all"); setGender("all"); setSort("governorate"); setPage(1);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <SectionHeading
        title="ابحث عن مدرسة"
        subtitle="حدّد المحافظة والمدينة أو ابحث بالاسم — اعثر على أقرب مدرسة مصرية يابانية لطفلك"
      />

      {/* search + cascade */}
      <Card className="mb-6 p-4 sm:p-5 shadow-soft">
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQAndReset(e.target.value)}
              placeholder="ابحث باسم المدرسة، الكود، المحافظة، أو المدينة..."
              className="h-12 pr-11 text-base"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">المحافظة</Label>
              <Select value={governorateId} onValueChange={setGovernorateAndReset}>
                <SelectTrigger className="h-11"><SelectValue placeholder="كل المحافظات" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">كل المحافظات</SelectItem>
                  {governorates.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.nameAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">المدينة / الإدارة</Label>
              <Select value={cityId} onValueChange={(v)=>{setCityId(v);setPage(1);}} disabled={!selectedGov}>
                <SelectTrigger className="h-11"><SelectValue placeholder={selectedGov ? "كل المدن" : "اختر المحافظة أولاً"} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">كل المدن</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">النوع</Label>
              <Select value={type} onValueChange={setTypeAndReset}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="ARABIC">عربي</SelectItem>
                  <SelectItem value="LANGUAGES">لغات</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">الترتيب</Label>
              <Select value={sort} onValueChange={setSortAndReset}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="governorate">حسب المحافظة</SelectItem>
                  <SelectItem value="name">حسب الاسم</SelectItem>
                  <SelectItem value="code">حسب الكود</SelectItem>
                  <SelectItem value="featured">المميزة أولاً</SelectItem>
                  <SelectItem value="newest">الأحدث</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* gender quick filters + mobile toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="lg:hidden"
            >
              <SlidersHorizontal className="ml-1.5 h-4 w-4" /> فلاتر
            </Button>
            <div className="flex items-center gap-1.5">
              {[
                { v: "all", l: "الكل" },
                { v: "MIXED", l: "مختلط" },
                { v: "MALE", l: "بنين" },
                { v: "FEMALE", l: "بنات" },
              ].map((g) => (
                <button
                  key={g.v}
                  onClick={() => setGenderAndReset(g.v)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    gender === g.v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-accent"
                  )}
                >
                  {g.l}
                </button>
              ))}
            </div>
            {(activeFilters.length > 0 || q) && (
              <button onClick={clearAll} className="mr-auto flex items-center gap-1 text-xs font-medium text-crimson hover:underline">
                <X className="h-3 w-3" /> مسح الكل
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* results count + active chips */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ البحث...</>
          ) : (
            <>
              <Building2 className="h-4 w-4 text-primary" />
              <span className="nums">{toArabicNumber(total)}</span> مدرسة
            </>
          )}
        </div>
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeFilters.map((f) => (
              <Badge key={f.key} variant="secondary" className="gap-1 pr-1">
                {f.label}
                <button onClick={() => clearFilter(f.key)} className="rounded-full hover:bg-muted p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-64 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-bold">لا توجد مدارس مطابقة</h3>
          <p className="text-sm text-muted-foreground">جرّب تعديل عوامل التصفية أو البحث بكلمات أخرى</p>
          <Button onClick={clearAll} variant="outline" size="sm">مسح الفلاتر</Button>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <SchoolCard key={s.id} school={s} />
          ))}
        </div>
      )}

      {/* pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button
            variant="outline" size="sm" disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronRight className="h-4 w-4" /> السابق
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "h-9 w-9 rounded-lg text-sm font-medium transition-colors nums",
                    p === page ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
                  )}
                >
                  {toArabicNumber(p)}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline" size="sm" disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            التالي <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
