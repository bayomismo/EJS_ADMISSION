import { PublicShell } from "@/components/public/public-shell";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "الشروط والأحكام | المدارس المصرية اليابانية",
  description: "الشروط والأحكام الخاصة بتقديم طلبات الالتحاق بالمدارس المصرية اليابانية",
};

export default function TermsPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <header>
          <h1 className="text-3xl font-extrabold">الشروط والأحكام</h1>
          <p className="mt-2 text-muted-foreground">
            باستخدامك لمنصة التقديم، فإنك توافق على الشروط التالية.
          </p>
        </header>

        <Card className="p-5 space-y-3">
          <h2 className="text-xl font-bold">١. الأهلية</h2>
          <p className="text-sm">يجب أن يكون الطالب حاصلاً على الرقم القومي المصري، وأن يكون عمره مطابقاً للمرحلة المختارة حسبما يُستنتج من الرقم القومي تلقائياً.</p>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="text-xl font-bold">٢. طلب واحد فقط</h2>
          <p className="text-sm">يُسمح بطلب واحد فقط لكل طالب في الدورة الحالية. تكرار الطلبات قد يؤدي لإلغائها جميعها.</p>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="text-xl font-bold">٣. دقة البيانات</h2>
          <p className="text-sm">يلتزم ولي الأمر بصحة البيانات المُدخلة. تقديم بيانات مغلوطة قد يؤدي لإلغاء القبول حتى بعد إعلان النتيجة.</p>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="text-xl font-bold">٤. وسائل التواصل</h2>
          <p className="text-sm">سيتم التواصل مع ولي الأمر على البريد الإلكتروني ورقم الهاتف المُدخلين. يُرجى التأكد من صلاحيتهما طوال فترة التقديم.</p>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="text-xl font-bold">٥. حق الرفض</h2>
          <p className="text-sm">تحتفظ إدارة المدرسة بحق رفض أي طلب لا يستوفي الشروط، أو إيقاف قبول طالب ثبت عدم استحقاقه.</p>
        </Card>

        <p className="text-xs text-muted-foreground">آخر تحديث: ٢٠٢٥/٠١</p>
      </div>
    </PublicShell>
  );
}