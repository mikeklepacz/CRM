import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

type ToastFn = (args: { title: string; description: string; variant?: "default" | "destructive" }) => void;

type DialogState = {
  open: boolean;
  row: any;
};

export function useStoreDetailsLauncher(clients: any[], toast: ToastFn) {
  const [storeDetailsDialog, setStoreDetailsDialog] = useState<DialogState | null>(null);

  const openFromLink = async (link: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/stores/by-link?link=${encodeURIComponent(link)}`);
      if (!response.ok) return false;
      const { storeRow, meta } = await response.json();
      setStoreDetailsDialog({
        open: true,
        row: { ...storeRow, meta: { rowIndex: meta.rowIndex, storeSheetId: meta.storeSheetId } },
      });
      return true;
    } catch {
      return false;
    }
  };

  const openStoreDetails = async (orderId: string, clientId?: string | null) => {
    try {
      const context = await apiRequest("GET", `/api/orders/${orderId}/store-details-context`);
      if (context?.storeRow) {
        const rowWithMeta = {
          ...context.storeRow,
          meta: {
            rowIndex: context.meta?.rowIndex,
            storeSheetId: context.meta?.storeSheetId,
          },
          _trackerRowIndex: context.meta?.trackerRowIndex ?? context.storeRow?._trackerRowIndex,
        };
        setStoreDetailsDialog({ open: true, row: rowWithMeta });
        return;
      }
    } catch {
      // Fall through to other resolution paths
    }

    // 1) Source of truth: tracker link(s) attached to this order
    try {
      const suggestions = await apiRequest("GET", `/api/orders/${orderId}/match-suggestions`);
      const matchedLinks = Array.isArray(suggestions?.matchedStoreLinks) ? suggestions.matchedStoreLinks : [];
      for (const link of matchedLinks) {
        if (await openFromLink(link)) return;
      }
    } catch {
      // Fall through to client-based lookup
    }

    if (!clientId) {
      toast({
        title: "Store link not found",
        description: "This order has tracker rows but no resolvable store link yet. Re-run Match on this order.",
        variant: "destructive",
      });
      return;
    }

    const cachedClient = clients.find((c: any) => c.id === clientId);
    const cachedLink = cachedClient?.data?.Link || cachedClient?.data?.link || cachedClient?.uniqueIdentifier;
    if (cachedLink && await openFromLink(cachedLink)) {
      return;
    }
    if (cachedClient?.data) {
      setStoreDetailsDialog({ open: true, row: cachedClient.data });
      return;
    }

    try {
      const freshClients = await apiRequest("GET", "/api/clients");
      const matchedClient = Array.isArray(freshClients)
        ? freshClients.find((c: any) => c.id === clientId)
        : null;
      const freshLink = matchedClient?.data?.Link || matchedClient?.data?.link || matchedClient?.uniqueIdentifier;
      if (freshLink && await openFromLink(freshLink)) {
        return;
      }
      if (matchedClient?.data) {
        setStoreDetailsDialog({ open: true, row: matchedClient.data });
        return;
      }
    } catch {
      // Fall through to toast
    }

    toast({
      title: "Store data not found",
      description: "This matched client could not be loaded for Store Details.",
      variant: "destructive",
    });
  };

  return {
    storeDetailsDialog,
    setStoreDetailsDialog,
    openStoreDetails,
  };
}
