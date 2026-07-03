import { PublicShell } from "@/components/public/public-shell";
import { StatusCheckForm } from "@/components/public/status-check-form";
import { FileSearch } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "متابعة حالة الطلب | المدارس المصرية اليابانية",
  description: "تحقق من حالة طلب التقديم برقمك المرجعي والرقم القومي",
};

export default function AdmissionStatusPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-2xl px-4 py-12">
        <div className="text-center mb-8">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <FileSearch className="h-7 w-7" />
          </span>
          <h1 className="text-3xl font-extrabold mb-2">متابعة حالة الطلب</h1>
          <p className="text-sm text-muted-foreground">
            أدخل الرقم المرجعي والرقم القومي للاطلاع على حالة طلبك
          </p>
        </div>
        <StatusCheckForm />
      </section>
    </PublicShell>
  );
}