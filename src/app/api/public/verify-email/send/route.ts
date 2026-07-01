import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email("بريد إلكتروني غير صحيح"),
  purpose: z.string().default("student-admission"),
});

// POST /api/public/verify-email/send
// Generates a 6-digit OTP, stores it (10-min expiry), and returns it.
// In production this would dispatch an SMTP email; in this sandbox the
// code is returned so the UI can display it (dev/demo mode).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors.email?.[0] || "بيانات غير صالحة" }, { status: 422 });
  }
  const { email, purpose } = parsed.data;

  // rate-limit: max 3 codes per email per 10 minutes
  const recent = await db.verificationCode.count({
    where: { email: email.toLowerCase(), createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  if (recent >= 3) {
    return NextResponse.json({ error: "تم إرسال العديد من رموز التحقق. حاول بعد قليل." }, { status: 429 });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db.verificationCode.create({
    data: {
      email: email.toLowerCase(),
      code,
      purpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  // DEV/DEMO: return the code so the UI can surface it (no SMTP in sandbox).
  // In production, send via email service and do NOT return the code.
  return NextResponse.json({
    success: true,
    message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
    // devMode flag lets the UI show the code in a dismissible banner
    devCode: code,
  });
}
