import Link from "next/link";
import { CheckCircle2, Home, FileText } from "lucide-react";
import { PublicShell } from "@/components/public/public-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SuccessRef } from "@/components/public/success-ref";

export const dynamic = "force-dynamic";

export default async function TeacherSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card className="overflow-hidden p-0 text-center">
          <div className="bg-gradient-to-l from-amber-600 to-orange-600 p-8 text-white">
            <CheckCircle2 className="mx-auto mb-3 h-16 w-16" />
            <h1 className="text-2xl font-extrabold">تم استلام طلبك بنجاح!</h1>
            <p className="mt-1 text-white/85">طلب التقديم للعمل بالمدارس المصرية اليابانية</p>
          </div>
          <div className="p-8 space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              تم استلام طلبك. سيتم التواصل معك عبر الهاتف أو البريد الإلكتروني لإبلاغك بموعد المقابلة واختبارات التخصص.
            </p>
            <div className="rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-50/50 p-5">
              <div className="text-xs text-amber-800 mb-1">رقم الطلب المرجعي</div>
              <SuccessRef reference={ref || ""} />
            </div>
            <div className="rounded-xl bg-amber-50 p-4 text-right text-sm text-amber-800">
              <strong>ملاحظة:</strong> احتفظ برقم الطلب للمتابعة. سيتم التواصل مع المرشحين المؤهلين فقط.
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button asChild variant="outline"><Link href="/"><Home className="ml-2 h-4 w-4" /> الرئيسية</Link></Button>
              <Button asChild variant="outline"><Link href="/admission/teachers"><FileText className="ml-2 h-4 w-4" /> صفحة التقديم</Link></Button>
            </div>
          </div>
        </Card>
      </div>
    </PublicShell>
  );
}
