"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

function AdminLoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const callback = sp.get("callbackUrl") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.");
    } else {
      router.push(callback);
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-crimson/10 p-4">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <Card className="relative w-full max-w-md p-8 shadow-card">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center gap-2">
            { }
            <img src="/ejs-logo.png" alt="EJS" className="h-16 w-16 rounded-2xl object-contain ring-1 ring-primary/10 bg-white p-1 shadow-soft" />
            { }
            <img src="/moe-logo.png" alt="MOE" className="h-14 w-14 rounded-xl object-contain ring-1 ring-primary/10 bg-white p-1 shadow-soft" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">لوحة تحكم الإدارة</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            المدارس المصرية اليابانية — بوابة القبول الإلكتروني
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>البريد الإلكتروني</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="pr-10" dir="ltr" required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>كلمة المرور</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="pr-10" dir="ltr" required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="h-11 w-full">
            {loading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ الدخول...</> : "تسجيل الدخول"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <a href="/" className="hover:text-primary">← العودة للموقع</a>
        </p>
      </Card>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-crimson/10 p-4">
      <Card className="relative w-full max-w-md p-8 shadow-card">
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>جارٍ التحميل...</span>
        </div>
      </Card>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <AdminLoginInner />
    </Suspense>
  );
}
