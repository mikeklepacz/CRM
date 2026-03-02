import { Button } from "@/components/ui/button";
import { Download, Loader2, Mail, Phone } from "lucide-react";

type DashboardActionButtonsProps = {
  actionButtonColor?: string;
  isEmailCrawling: boolean;
  onCallHistory: () => void;
  onExportVCard: () => void;
  onFindEmails: () => void;
};

export function DashboardActionButtons({
  actionButtonColor,
  isEmailCrawling,
  onCallHistory,
  onExportVCard,
  onFindEmails,
}: DashboardActionButtonsProps) {
  const buttonStyle = actionButtonColor
    ? { backgroundColor: actionButtonColor, borderColor: actionButtonColor }
    : undefined;

  return (
    <>
      <Button
        variant="outline"
        onClick={onCallHistory}
        data-testid="button-call-history"
        style={buttonStyle}
      >
        <Phone className="mr-2 h-4 w-4" />
        Call History
      </Button>

      <Button
        variant="outline"
        onClick={onFindEmails}
        disabled={isEmailCrawling}
        data-testid="button-find-emails"
        style={buttonStyle}
      >
        {isEmailCrawling ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="mr-2 h-4 w-4" />
        )}
        {isEmailCrawling ? "Crawling..." : "Find Emails"}
      </Button>

      <Button
        variant="outline"
        onClick={onExportVCard}
        data-testid="button-export-vcard"
        style={buttonStyle}
      >
        <Download className="mr-2 h-4 w-4" />
        Export vCard
      </Button>
    </>
  );
}
