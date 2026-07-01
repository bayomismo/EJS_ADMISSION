import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("media", "view");
  if (!guard.ok) return guard.response!;
  const items = await db.media.findMany({ orderBy: { createdAt: "desc" } });
  return ok(items);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("media", "create");
  if (!guard.ok) return guard.response!;

  const form = await req.formData();
  const file = form.get("file");
  const altAr = form.get("altAr") as string || "";
  if (!file || !(file instanceof File)) return fail("لم يتم رفع ملف", 400);

  const allowed = ["image/", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument", "video/"];
  if (!allowed.some((a) => file.type.startsWith(a))) return fail("نوع الملف غير مدعوم", 400);

  const ext = file.name.split(".").pop() || "bin";
  const filename = `${randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buf);

  const type = file.type.startsWith("image/") ? "IMAGE" : file.type.startsWith("video/") ? "VIDEO" : "DOC";
  const url = `/uploads/${filename}`;

  const item = await db.media.create({
    data: {
      filename, originalName: file.name, mimeType: file.type, size: file.size,
      url, altAr, type,
    },
  });
  const session = await getServerSession(authOptions);
  await logAudit({ userId: session?.user?.id, action: "CREATE", entity: "media", entityId: item.id, newValue: item, summary: `رفع ملف: ${item.originalName}`, req });
  return ok(item, 201);
}
