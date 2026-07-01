import { getSiteSettings } from "@/lib/settings";
import { SettingsManager } from "@/components/admin/settings-manager";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();
  return <SettingsManager initial={settings} />;
}
