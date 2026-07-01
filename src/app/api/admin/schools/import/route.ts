import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import * as XLSX from "xlsx";
import { normalizeArabic } from "@/lib/arabic";

export const dynamic = "force-dynamic";

// POST /api/admin/schools/import  (multipart: file)
// Returns a validation preview: { rows, errors, valid, total, governorates, cities }
export async function POST(req: NextRequest) {
  const guard = await requirePermission("schools", "create");
  if (!guard.ok) return guard.response!;

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) return fail("لم يتم رفع ملف", 400);

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

  // load governorates & cities for resolution
  const [governorates, cities, existingCodes] = await Promise.all([
    db.governorate.findMany({ select: { id: true, nameAr: true, nameEn: true } }),
    db.city.findMany({ select: { id: true, nameAr: true, nameEn: true, governorateId: true } }),
    db.school.findMany({ select: { code: true } }),
  ]);
  const codeSet = new Set(existingCodes.map((s) => s.code));
  const govByAr = new Map(governorates.map((g) => [normalizeArabic(g.nameAr), g]));
  const cityByArGov = new Map<string, typeof cities>();
  for (const c of cities) {
    const key = `${normalizeArabic(c.governorateId)}|${normalizeArabic(c.nameAr)}`;
    cityByArGov.set(key, c as any);
  }

  type Row = {
    rowIndex: number;
    code: string;
    nameAr: string;
    nameEn: string;
    governorate: string;
    city: string;
    type: string;
    gender: string;
    address: string;
    capacity: number | null;
    errors: string[];
    resolved?: { governorateId: string; cityId: string };
  };

  const rows: Row[] = [];
  const seenCodes = new Set<string>();

  json.forEach((raw, i) => {
    const code = String(raw["الكود"] || raw["code"] || "").trim();
    const nameAr = String(raw["الاسم بالعربية"] || raw["nameAr"] || "").trim();
    const nameEn = String(raw["الاسم بالإنجليزية"] || raw["nameEn"] || "").trim();
    const governorate = String(raw["المحافظة"] || raw["governorate"] || "").trim();
    const city = String(raw["المدينة"] || raw["city"] || "").trim();
    const typeRaw = String(raw["النوع"] || raw["type"] || "عربي").trim();
    const genderRaw = String(raw["النوع (بنين/بنات)"] || raw["gender"] || "مختلط").trim();
    const address = String(raw["العنوان"] || raw["address"] || "").trim();
    const capacityRaw = String(raw["السعة"] || raw["capacity"] || "").trim();

    const errors: string[] = [];
    if (!code) errors.push("الكود مطلوب");
    if (!nameAr) errors.push("الاسم بالعربية مطلوب");
    if (!governorate) errors.push("المحافظة مطلوبة");
    if (!city) errors.push("المدينة مطلوبة");

    if (code && seenCodes.has(code)) errors.push("الكود مكرر في الملف");
    if (code) seenCodes.add(code);
    if (code && codeSet.has(code)) errors.push("الكود موجود مسبقاً في قاعدة البيانات");

    const gov = govByAr.get(normalizeArabic(governorate));
    if (!governorate || !gov) {
      if (governorate) errors.push("المحافظة غير موجودة");
    }

    let resolved: { governorateId: string; cityId: string } | undefined;
    if (gov) {
      const cityKey = `${normalizeArabic(gov.id)}|${normalizeArabic(city)}`;
      const foundCity = cityByArGov.get(cityKey);
      if (!foundCity) {
        if (city) errors.push("المدينة غير موجودة في هذه المحافظة");
      } else {
        resolved = { governorateId: gov.id, cityId: (foundCity as any).id };
      }
    }

    let capacity: number | null = null;
    if (capacityRaw) {
      const n = Number(capacityRaw);
      if (isNaN(n)) errors.push("السعة يجب أن تكون رقماً");
      else capacity = n;
    }

    const type = typeRaw === "لغات" || typeRaw === "LANGUAGES" ? "LANGUAGES" : "ARABIC";
    const gender =
      genderRaw === "بنين" || genderRaw === "MALE" ? "MALE"
      : genderRaw === "بنات" || genderRaw === "FEMALE" ? "FEMALE"
      : "MIXED";

    rows.push({ rowIndex: i + 2, code, nameAr, nameEn, governorate, city, type, gender, address, capacity, errors, resolved });
  });

  const errors = rows.filter((r) => r.errors.length > 0);
  const valid = rows.filter((r) => r.errors.length === 0);

  return ok({
    rows,
    errors,
    valid: valid.length,
    total: rows.length,
    errorCount: errors.length,
    canImport: errors.length === 0 && valid.length > 0,
  });
}
