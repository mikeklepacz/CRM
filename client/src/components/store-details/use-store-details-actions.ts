import { apiRequest } from "@/lib/queryClient";
import { getLinkValue } from "@/components/store-details/store-details-utils";

interface UseStoreDetailsActionsParams {
  formData: any;
  initialData: any;
  row: any;
  trackerSheetId?: string;
  toast: any;
  queryClient: any;
  refetch: () => Promise<any>;
  onOpenChange: (open: boolean) => void;
  saveMutation: any;
  voip: any;
}

export function useStoreDetailsActions({
  formData,
  initialData,
  row,
  trackerSheetId,
  toast,
  queryClient,
  refetch,
  onOpenChange,
  saveMutation,
  voip,
}: UseStoreDetailsActionsParams) {
  const handleHideListing = async () => {
    const link = formData.link || getLinkValue(row);
    if (!link) {
      toast({
        title: "Error",
        description: "Cannot hide: Store link is missing",
        variant: "destructive",
      });
      return;
    }

    if (!row?._trackerRowIndex || !trackerSheetId) {
      toast({
        title: "Hide Unavailable",
        description: "This listing is not currently claimed.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await apiRequest("POST", "/api/sheets/tracker/release", { link });

      toast({
        title: "Listing Hidden",
        description:
          result?.action === "deleted-row"
            ? "Listing was unclaimed by removing its tracker row."
            : "Listing was unclaimed by clearing Agent Name.",
      });

      await queryClient.invalidateQueries({ queryKey: ["merged-data"] });
      await refetch();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Hide Failed",
        description: error.message || "Failed to hide listing. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUnclaim = async () => {
    const link = formData.link || getLinkValue(row);

    if (!link) {
      toast({
        title: "Error",
        description: "Cannot unclaim: Store link is missing",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await apiRequest("POST", "/api/sheets/tracker/release", { link });

      toast({
        title: "Store Unclaimed",
        description:
          result?.action === "deleted-row"
            ? "Tracker row was removed and the listing is back in the pool."
            : "Agent Name was cleared and the listing is back in the pool.",
      });

      await queryClient.invalidateQueries({ queryKey: ["merged-data"] });
      await refetch();
      onOpenChange(false);
    } catch (error: any) {
      console.error("[Unclaim] Error:", error);
      toast({
        title: "Unclaim Failed",
        description: error.message || "Failed to unclaim store. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    console.log("🔘 Save button clicked");
    console.log("📊 Current state:", {
      formData,
      initialData,
      rowIndex: row._storeRowIndex,
      trackerRowIndex: row._trackerRowIndex,
      link: formData.link || getLinkValue(row),
    });
    saveMutation.mutate({ closeDialog: false });
  };

  const handleSaveAndExit = () => {
    console.log("🔘 Save & Exit button clicked");
    saveMutation.mutate({ closeDialog: true });
  };

  const handleCallFromDetails = async () => {
    if (voip.isCallActive) {
      voip.hangup();
      return;
    }

    const phoneNumber = formData.poc_phone || formData.phone;

    if (!phoneNumber) {
      toast({
        title: "No Phone Number",
        description: "This store doesn't have a phone number on file",
        variant: "destructive",
      });
      return;
    }

    const storeLink = formData.link;
    voip.makeCall(phoneNumber, { storeName: formData.name || "Unknown Store", storeLink: storeLink || undefined });
  };

  return {
    handleHideListing,
    handleUnclaim,
    handleSave,
    handleSaveAndExit,
    handleCallFromDetails,
  };
}
