import { db } from "@/lib/db";
import { getSiteSettings, computeLiveStatus } from "@/lib/settings";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { AnnouncementBar } from "@/components/public/announcement-bar";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const live = computeLiveStatus(settings.admission);
  const statusColor =
    live.status === "OPEN" ? "green" : live.status === "UPCOMING" ? "gold" : "red";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader settings={settings} status={{ label: live.label, color: statusColor }} />
      <AnnouncementBar settings={settings} />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
    </div>
  );
}
