import { ExternalLink, Mail, Maximize2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoipCallButton } from "@/components/voip-call-button";
import { extractDomain } from "@/components/client-dashboard/client-dashboard-utils";

type ClientDashboardCellDisplayProps = {
  cellValue: string;
  displayValue: string;
  header: string;
  isEmailColumn: boolean;
  isLinkColumn: boolean;
  isLongText: boolean;
  isPhoneColumn: boolean;
  isSalesSummaryColumn: boolean;
  isWebsiteColumn: boolean;
  primaryColor: string | undefined;
  row: any;
  rowKey: string | number;
  textAlign: "left" | "center" | "right" | "justify";
  onOpenExpandedView: (row: any, header: string, cellValue: string) => void;
  onOpenStoreDetails: (row: any) => void;
  onOpenStoreDetailsWithAutoScript: (row: any) => void;
};

export function ClientDashboardCellDisplay({
  cellValue,
  displayValue,
  header,
  isEmailColumn,
  isLinkColumn,
  isLongText,
  isPhoneColumn,
  isSalesSummaryColumn,
  isWebsiteColumn,
  primaryColor,
  row,
  rowKey,
  textAlign,
  onOpenExpandedView,
  onOpenStoreDetails,
  onOpenStoreDetailsWithAutoScript,
}: ClientDashboardCellDisplayProps) {
  const isLeaflyLink = cellValue.toLowerCase().includes("leafly");
  const isNameOrCompanyColumn = header.toLowerCase() === "name" || header.toLowerCase() === "company";

  return (
    <div className="flex items-center gap-2" style={{ justifyContent: textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start" }}>
      {isPhoneColumn && cellValue ? (
        <VoipCallButton
          phoneNumber={cellValue}
          storeName={row.name || row.Name || row.Company || "Unknown Store"}
          storeLink={row.link || row.Link || row.id}
          onClick={() => onOpenStoreDetailsWithAutoScript(row)}
          className="flex items-center gap-1 hover:underline flex-shrink-0 cursor-pointer"
          style={{ color: primaryColor }}
          data-testid={`link-phone-${rowKey}-${header}`}
        >
          <Phone className="h-4 w-4 flex-shrink-0" />
          <span>{displayValue}</span>
        </VoipCallButton>
      ) : isEmailColumn && cellValue ? (
        <button
          onClick={() => onOpenStoreDetails(row)}
          className="flex items-center gap-1 hover:underline flex-shrink-0"
          style={{ color: primaryColor }}
          data-testid={`link-email-${rowKey}-${header}`}
        >
          <Mail className="h-4 w-4 flex-shrink-0" />
          <span>{displayValue}</span>
        </button>
      ) : isEmailColumn && !cellValue && row.emailSearched ? (
        <span
          className="flex items-center gap-1 text-muted-foreground italic text-sm"
          title="Email searched but not found on website"
          data-testid={`text-no-email-${rowKey}-${header}`}
        >
          <Mail className="h-3 w-3 opacity-50 line-through" />
          <span className="line-through opacity-60">searched</span>
        </span>
      ) : isSalesSummaryColumn && cellValue ? (
        <button
          onClick={() => onOpenExpandedView(row, header, cellValue)}
          className="hover:underline text-left"
          style={{ color: primaryColor }}
          data-testid={`link-sales-summary-${rowKey}-${header}`}
        >
          {cellValue.length > 50 ? `${cellValue.substring(0, 50)}...` : cellValue || "View Summary"}
        </button>
      ) : isNameOrCompanyColumn && cellValue ? (
        <button
          onClick={() => onOpenStoreDetails(row)}
          className="hover:underline font-medium text-left"
          style={{ color: primaryColor }}
          data-testid={`link-store-${rowKey}-${header}`}
        >
          {displayValue}
        </button>
      ) : isWebsiteColumn && cellValue ? (
        <a
          href={cellValue.startsWith("http") ? cellValue : `https://${cellValue}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:underline flex-shrink-0"
          style={{ color: primaryColor }}
          data-testid={`link-website-${rowKey}-${header}`}
        >
          <ExternalLink className="h-4 w-4 flex-shrink-0" />
          <span>{extractDomain(cellValue)}</span>
        </a>
      ) : isLinkColumn && cellValue ? (
        <a
          href={cellValue}
          target="_blank"
          rel="noopener noreferrer"
          className="text-2xl hover:scale-110 transition-transform"
          data-testid={`link-leafly-${rowKey}-${header}`}
          title={cellValue}
        >
          {isLeaflyLink ? "🍁" : "🔗"}
        </a>
      ) : (
        <span
          data-testid={`text-cell-${rowKey}-${header}`}
          className={isLongText ? "cursor-pointer hover:text-primary" : ""}
          onClick={() => isLongText && onOpenExpandedView(row, header, cellValue)}
        >
          {displayValue}
        </span>
      )}
      {isLongText && !isPhoneColumn && !isWebsiteColumn && !isLinkColumn && !isSalesSummaryColumn && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={() => onOpenExpandedView(row, header, cellValue)}
          data-testid={`button-expand-${rowKey}-${header}`}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
