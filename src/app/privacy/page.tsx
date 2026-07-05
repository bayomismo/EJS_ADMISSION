import { PublicShell } from "@/components/public/public-shell";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "سياسة الخصوصية | المدارس المصرية اليابانية",
  description: "كيف نتعامل مع بياناتك الشخصية على منصة التقديم للمدارس المصرية اليابانية",
};

export default function PrivacyPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <header>
          <h1 className="text-3xl font-extrabold">سياسة الخصوصية</h1>
          <p className="mt-2 text-muted-foreground">
            توضح هذه الصفحة كيف تجمع المدارس المصرية اليابانية بياناتك وتستخدمها وتحميها.
          </p>
        </header>

        <Card className="p-5 space-y-4">
          <h2 className="text-xl font-bold">البيانات التي نجمعها</h2>
          <p>عند تقديم طلب التحاق، نجمع:</p>
          <ul className="list-disc pr-5 space-y-1 text-sm">
            <li>بيانات الطالب: الاسم، الرقم القومي، تاريخ الميلاد، النوع، الجنسية</li>
            <li>بيانات ولي الأمر: الاسم، الرقم القومي، الهاتف، البريد الإلكتروني، صلة القرابة، المهنة</li>
            <li>بيانات العنوان: المحافظة، المدينة، المدرسة المختارة، المرحلة، العنوان</li>
            <li>بيانات اختيارية: المدرسة السابقة، إجابات التقييم، ملاحظات</li>
          </ul>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-xl font-bold">كيف نستخدم بياناتك</h2>
          <p>نستخدم بياناتك فقط لـ:</p>
          <ul className="list-disc pr-5 space-y-1 text-sm">
            <li>معالجة طلب الالتحاق وتأكيد الأهلية</li>
            <li>التواصل مع ولي الأمر بخصوص نتيجة القبول</li>
            <li>إعداد التقارير الإحصائية المجهولة الهوية (لا تحتوي على بيانات شخصية)</li>
          </ul>
          <p className="text-sm">لا نبيع بياناتك ولا نشاركها مع طرف ثالث إلا بأمر قضائي أو بموافقتك المكتوبة.</p>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-xl font-bold">حقوقك</h2>
          <ul className="list-disc pr-5 space-y-1 text-sm">
            <li>طلب تصحيح أي بيانات خاطئة</li>
            <li>طلب حذف بياناتك بعد انتهاء سنة دراسية كاملة من تقديم الطلب</li>
            <li>طلب نسخة من بياناتك بصيغة مقروءة</li>
          </ul>
          <p className="text-sm">
            لممارسة أي من هذه الحقوق، تواصل مع الإدارة عبر صفحة{" "}
            <a href="/contact" className="underline">اتصل بنا</a>.
          </p>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-xl font-bold">الاحتفاظ بالبيانات</h2>
          <p className="text-sm">
            نحتفظ ببيانات الطلب لمدة سنة دراسية واحدة بعد تقديمها لأغراض التدقيق، ثم يتم حذفها تلقائياً.
            بيانات الحساب الإداري تُحذف خلال 30 يوماً من إيقاف الحساب.
          </p>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-xl font-bold">الأمان</h2>
          <p className="text-sm">
            نستخدم تشفير TLS/HSTS، ونُخزّن كلمات المرور مشفّرة (Argon2/scrypt)، ونقيد الوصول الإداري
            بالصلاحيات، ونسجل كل تعديل في سجل مراجعة قابل للمراجعة.
          </p>
        </Card>

        <p className="text-xs text-muted-foreground">آخر تحديث: ٢٠٢٥/٠١</p>
      </div>
    </PublicShell>
  );
}