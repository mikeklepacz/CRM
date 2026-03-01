import { apiRequest } from "@/lib/queryClient";
import { getLinkValue } from "@/components/store-details/store-details-utils";

interface UseStoreDetailsActionsParams {
  formData: any;
  initialData: any;
  row: any;
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
  toast,
  queryClient,
  refetch,
  onOpenChange,
  saveMutation,
  voip,
}: UseStoreDetailsActionsParams) {
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
      console.log("[Unclaim] Checking commission count for:", link);
      const encodedLink = encodeURIComponent(link);
      const countResponse = await apiRequest("GET", `/api/stores/${encodedLink}/commissions/count`);

      if (countResponse.count > 0) {
        toast({
          title: "Cannot Unclaim",
          description: `This store has ${countResponse.count} commission record${countResponse.count === 1 ? "" : "s"}. Cannot unclaim stores with existing commissions.`,
          variant: "destructive",
        });
        return;
      }

      console.log("[Unclaim] No commissions found, deleting tracker row");
      await apiRequest("DELETE", "/api/sheets/tracker/row", { link });

      toast({
        title: "Store Unclaimed",
        description: "This store has been released back to the pool and is now available for others to claim.",
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
    handleUnclaim,
    handleSave,
    handleSaveAndExit,
    handleCallFromDetails,
  };
}
