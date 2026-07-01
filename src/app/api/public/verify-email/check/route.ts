import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  purpose: z.string().default("student-admission"),
});

// POST /api/public/verify-email/check
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "رمز التحقق غير صحيح" }, { status: 422 });
  }
  const { email, code, purpose } = parsed.data;

  const record = await db.verificationCode.findFirst({
    where: {
      email: email.toLowerCase(),
      purpose,
      consumed: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return NextResponse.json({ error: "انتهت صلاحية الرمز أو لم يتم إرساله. أرسل رمزاً جديداً." }, { status: 400 });
  }

  if (record.attempts >= 5) {
    return NextResponse.json({ error: "تجاوزت عدد المحاولات. أرسل رمزاً جديداً." }, { status: 429 });
  }

  if (record.code !== code) {
    await db.verificationCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: "رمز التحقق غير صحيح" }, { status: 400 });
  }

  // mark consumed
  await db.verificationCode.update({ where: { id: record.id }, data: { consumed: true } });

  return NextResponse.json({ success: true, verified: true });
}
