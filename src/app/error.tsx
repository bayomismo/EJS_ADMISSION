"use client";

/**
 * Global error boundary. MUST be a Client Component and MUST NOT import
 * any server-only modules (e.g. PublicShell, db, auth, settings).
 *
 * Reason: when this boundary fires, Next.js renders it as part of the
 * client component SSR tree, which would pull in @/lib/db transitively
 * and cause "PrismaClient is unable to run in this browser environment".
 *
 * If you need a styled error page, inline a minimal layout here.
 */

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the server console so the ops team can grep for it.
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        kind: "ui_error_boundary",
        digest: error.digest,
        message: error.message,
      }),
    );
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="bg-background text-foreground antialiased">
        <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
          <AlertOctagon className="h-16 w-16 text-destructive/60" aria-hidden="true" />
          <h1 className="text-3xl font-extrabold">حدث خطأ غير متوقع</h1>
          <p className="text-muted-foreground">
            تم تسجيل المشكلة. حاول مرة أخرى، وإن استمرت الخطأ تواصل مع الإدارة.
          </p>
          {error.digest ? (
            <p className="text-xs text-muted-foreground/60">
              رمز الخطأ: <code className="font-mono">{error.digest}</code>
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={reset}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              إعادة المحاولة
            </button>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              الصفحة الرئيسية
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}