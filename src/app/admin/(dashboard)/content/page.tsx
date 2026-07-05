import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentManager } from "@/components/admin/content-manager";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "إدارة المحتوى | المدارس المصرية اليابانية",
};

export default async function AdminContentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/admin/login?callbackUrl=/admin/content");

  // Permission check happens inside the API routes; here we just gate on session.
  // If the user has no content.view permission they'll get 403 from the API.

  return (
    <div>
      <div className="border-b border-border bg-secondary/30 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-extrabold">إدارة المحتوى</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          تحرير النصوص التي يراها المستخدم على الموقع (الصفحة الرئيسية، صفحات التقديم، الفوتر). كل بلوك له نسخة احتياطية يمكن استرجاعها.
        </p>
      </div>
      <ContentManager />
    </div>
  );
}