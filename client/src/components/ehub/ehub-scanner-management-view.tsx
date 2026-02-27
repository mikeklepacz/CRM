import { EhubReplyScannerCard } from "@/components/ehub/ehub-reply-scanner-card";
import { EhubEmailBlacklistCard } from "@/components/ehub/ehub-email-blacklist-card";

export function ScannerManagementView() {
  return (
    <div className="space-y-6">
      <EhubReplyScannerCard />
      <EhubEmailBlacklistCard />
    </div>
  );
}
