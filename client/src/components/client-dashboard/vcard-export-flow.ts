import { apiRequest } from "@/lib/queryClient";
import { generateAndDownloadVCard } from "@/lib/vcard-utils";

type ToastFn = (value: {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}) => void;

type VCardExportFields = {
  phone: boolean;
  email: boolean;
  website: boolean;
  address: boolean;
  salesSummary: boolean;
  storeHours: boolean;
};

type HandleVCardExportFlowParams = {
  filteredData: any[];
  queryClient: {
    invalidateQueries: (value: { queryKey: string[] }) => void;
  };
  setExportVCardDialogOpen: (open: boolean) => void;
  toast: ToastFn;
  vCardExportFields: VCardExportFields;
  vCardListName: string;
  vCardPlatform: "ios" | "android";
};

export async function handleVCardExportFlow({
  filteredData,
  queryClient,
  setExportVCardDialogOpen,
  toast,
  vCardExportFields,
  vCardListName,
  vCardPlatform,
}: HandleVCardExportFlowParams) {
  try {
    generateAndDownloadVCard(
      filteredData,
      vCardExportFields,
      vCardListName || "Hemp Wick Contacts",
      vCardPlatform
    );
    setExportVCardDialogOpen(false);
    toast({
      title: "Export Complete",
      description: `Exported ${filteredData.length} contacts to vCard`,
    });

    const storeLinks = [...new Set(filteredData
      .map((store: any) => store["Link"] || store["link"])
      .filter(Boolean))];

    if (storeLinks.length > 0) {
      try {
        const response = await apiRequest("POST", "/api/stores/claim-vcard-export", { storeLinks });

        if (response.updated || response.created) {
          toast({
            title: "Stores Claimed",
            description: `Updated ${response.updated} stores, created ${response.created} new entries`,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
        }
      } catch (claimError) {
        console.error("Failed to claim stores after vCard export:", claimError);
        toast({
          title: "Claim Failed",
          description: "vCard exported but status update failed. You may need to manually claim stores.",
          variant: "destructive",
        });
      }
    }
  } catch (error) {
    console.error("vCard Export Error:", error);
    toast({
      title: "Export Failed",
      description: error instanceof Error ? error.message : "Failed to export contacts",
      variant: "destructive",
    });
  }
}
