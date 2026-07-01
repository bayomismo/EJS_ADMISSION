import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/public/public-shell";
import { FileQuestion } from "lucide-react";

export const dynamic = "force-dynamic";


export default function NotFound() {
  return (
    <PublicShell>
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <FileQuestion className="h-16 w-16 text-muted-foreground/40" aria-hidden="true" />
        <h1 className="text-3xl font-extrabold">لم نجد الصفحة المطلوبة</h1>
        <p className="text-muted-foreground">
          ربما تم نقل الصفحة أو حذفها. يمكنك العودة إلى الصفحة الرئيسية أو البحث عن مدرسة.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button asChild>
            <Link href="/">الصفحة الرئيسية</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/schools">ابحث عن مدرسة</Link>
          </Button>
        </div>
      </div>
    </PublicShell>
  );
}
