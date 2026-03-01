import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { calculateCommission } from "./commission";
import { ConflictsDialog } from "./conflicts-dialog";
import { MultiLocationDialog } from "./multi-location-dialog";
import { OrdersTable } from "./orders-table";
import { StoreDetailsDialogLauncher } from "./store-details-dialog-launcher";
import { SyncControls } from "./sync-controls";
import { useStoreDetailsLauncher } from "./use-store-details-launcher";
import { useLiveCounts, usePreselectedStores, useSortedOrders, useWooCommerceData } from "./use-woocommerce-data";
import type { ConflictItem, StoreSelection, SyncResult, WooOrder } from "./types";

export function WooCommerceSync() {
  const { toast } = useToast();
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [matchingOrderId, setMatchingOrderId] = useState<string | null>(null);
  const [selectedStores, setSelectedStores] = useState<StoreSelection[]>([]);
  const [dbaName, setDbaName] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [showAllClients, setShowAllClients] = useState(false);
  const [commissionTypes, setCommissionTypes] = useState<Record<string, string>>({});
  const [commissionAmounts, setCommissionAmounts] = useState<Record<string, string>>({});
  const [modifiedOrders, setModifiedOrders] = useState<Set<string>>(new Set());
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showMultiLocationDialog, setShowMultiLocationDialog] = useState(false);
  const [multiLocationSearch, setMultiLocationSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [bulkSelectedStores, setBulkSelectedStores] = useState<Set<string>>(new Set());
  const [bulkAgentName, setBulkAgentName] = useState("");
  const { orders, refetchOrders, clients, wooSettings, matchSuggestions } = useWooCommerceData({
    matchingOrderId,
    clientSearch,
    setCommissionTypes,
    setCommissionAmounts,
    resetModifiedOrders: () => setModifiedOrders(new Set()),
  });
  const syncMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/woocommerce/sync", {}),
    onSuccess: (data: SyncResult) => {
      setSyncResult(data);
      refetchOrders();
      queryClient.invalidateQueries({ queryKey: ["/api/woocommerce/settings"] });
      toast({
        title: "Sync completed",
        description: `Synced ${data.synced} orders, matched ${data.matched} clients. ${data.commissionsCalculated ? `Calculated ${data.commissionsCalculated} commissions.` : ""}`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });
  const matchOrderMutation = useMutation({
    mutationFn: async ({ orderId, storeLinks, dba }: { orderId: string; storeLinks: StoreSelection[]; dba?: string }) =>
      apiRequest("POST", `/api/orders/${orderId}/match`, { storeLinks, dba }),
    onSuccess: () => {
      refetchOrders();
      resetMatchState();
      toast({ title: "Success", description: `Order matched to ${selectedStores.length} store(s) successfully` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
  const saveCommissionsMutation = useMutation({
    mutationFn: async () => {
      const orderUpdates = orders
        .filter((order) => order.clientId || order.hasTrackerRows)
        .map((order) => ({
          orderId: order.id,
          commissionType: commissionTypes[order.id] || "auto",
          commissionAmount: commissionAmounts[order.id] || null,
        }));
      return apiRequest("POST", "/api/orders/save-commissions", { orders: orderUpdates });
    },
    onSuccess: (data: any) => {
      setModifiedOrders(new Set());
      if (data.conflicts?.length > 0) {
        setConflicts(data.conflicts);
        setShowConflicts(true);
        toast({
          title: "Partial Success",
          description: `${data.dbUpdated} saved to database, ${data.sheetsWritten} written to Google Sheets. ${data.conflicts.length} conflicts need resolution.`,
        });
        return;
      }
      toast({ title: "Success", description: data.message });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
  const searchStoresMutation = useMutation({
    mutationFn: async (searchTerm: string) => apiRequest("POST", "/api/stores/search", { searchTerm }),
    onSuccess: (data: any) => {
      setSearchResults(data.stores || []);
      if ((data.stores || []).length === 0) {
        toast({ title: "No Results", description: "No stores found matching your search" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ storeLinks, agentName }: { storeLinks: string[]; agentName: string }) =>
      apiRequest("POST", "/api/stores/bulk-assign", { storeLinks, agentName }),
    onSuccess: (data: any) => {
      toast({ title: "Success", description: data.message });
      resetMultiLocationState();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
  usePreselectedStores({ matchingOrderId, orders, clients, matchSuggestions, setSelectedStores });
  const { storeDetailsDialog, setStoreDetailsDialog, openStoreDetails } = useStoreDetailsLauncher(clients, toast);
  const sortedOrders = useSortedOrders(orders, sortDirection);
  const { liveMatchedCount, liveTotalCount } = useLiveCounts(orders);
  function resetMatchState() {
    setMatchingOrderId(null);
    setSelectedStores([]);
    setDbaName("");
    setShowAllClients(false);
    setClientSearch("");
  }

  function resetMultiLocationState() {
    setShowMultiLocationDialog(false);
    setSearchResults([]);
    setBulkSelectedStores(new Set());
    setBulkAgentName("");
    setMultiLocationSearch("");
  }

  function markCommissionModified(orderId: string) {
    setModifiedOrders((prev) => new Set(prev).add(orderId));
  }

  function handleOpenMatchDialog(order: WooOrder) {
    setMatchingOrderId(order.id);
    setSelectedStores([]);
    setDbaName("");
    setShowAllClients(false);
    setClientSearch("");
    if (!order.commissionType && !commissionTypes[order.id]) {
      setCommissionTypes((prev) => ({ ...prev, [order.id]: "flat" }));
      setCommissionAmounts((prev) => ({ ...prev, [order.id]: "500.00" }));
      markCommissionModified(order.id);
    }
  }

  async function handleConfirmMatch() {
    if (!matchingOrderId || selectedStores.length === 0) return;
    if (modifiedOrders.has(matchingOrderId)) {
      try {
        await apiRequest("PATCH", `/api/orders/${matchingOrderId}`, {
          commissionType: commissionTypes[matchingOrderId] || "flat",
          commissionAmount: commissionAmounts[matchingOrderId] || "500.00",
        });
        setModifiedOrders((prev) => {
          const next = new Set(prev);
          next.delete(matchingOrderId);
          return next;
        });
      } catch {
        toast({
          title: "Save failed",
          description: "Failed to save commission settings. The match will still proceed.",
          variant: "destructive",
        });
      }
    }
    matchOrderMutation.mutate({ orderId: matchingOrderId, storeLinks: selectedStores, dba: dbaName || undefined });
  }

  function handleMultiLocationSearch() {
    if (multiLocationSearch.trim()) searchStoresMutation.mutate(multiLocationSearch.trim());
  }

  function handleBulkAssign() {
    if (bulkSelectedStores.size === 0) {
      toast({ title: "No Stores Selected", description: "Please select at least one store to assign", variant: "destructive" });
      return;
    }
    if (!bulkAgentName.trim()) {
      toast({ title: "Agent Name Required", description: "Please enter an agent name", variant: "destructive" });
      return;
    }
    bulkAssignMutation.mutate({ storeLinks: Array.from(bulkSelectedStores), agentName: bulkAgentName.trim() });
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          WooCommerce Sync
        </CardTitle>
        <CardDescription>Sync orders from WooCommerce and update client sales and commission data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SyncControls
          syncMutationPending={syncMutation.isPending}
          saveCommissionsPending={saveCommissionsMutation.isPending}
          orders={orders}
          liveTotalCount={liveTotalCount}
          liveMatchedCount={liveMatchedCount}
          syncResult={syncResult}
          wooSettings={wooSettings}
          onSync={() => syncMutation.mutate()}
          onSaveCommissions={() => saveCommissionsMutation.mutate()}
          onOpenMultiLocation={() => setShowMultiLocationDialog(true)}
        />

        <OrdersTable
          orders={sortedOrders}
          sortDirection={sortDirection}
          matchingOrderId={matchingOrderId}
          selectedStores={selectedStores}
          dbaName={dbaName}
          showAllClients={showAllClients}
          clientSearch={clientSearch}
          commissionTypes={commissionTypes}
          commissionAmounts={commissionAmounts}
          matchSuggestions={matchSuggestions || null}
          matchOrderPending={matchOrderMutation.isPending}
          onToggleSort={() => setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))}
          onCommissionTypeChange={(orderId, value) => {
            setCommissionTypes((prev) => ({ ...prev, [orderId]: value }));
            markCommissionModified(orderId);
          }}
          onCommissionAmountChange={(orderId, value) => {
            setCommissionAmounts((prev) => ({ ...prev, [orderId]: value }));
            markCommissionModified(orderId);
          }}
          calculateCommission={(orderId, total) => calculateCommission(orderId, total, commissionTypes, commissionAmounts)}
          onOpenMatchDialog={handleOpenMatchDialog}
          onCloseMatchDialog={resetMatchState}
          onConfirmMatch={handleConfirmMatch}
          onToggleStoreSelection={(link, name) => {
            setSelectedStores((prev) => (prev.some((s) => s.link === link) ? prev.filter((s) => s.link !== link) : [...prev, { link, name }]));
          }}
          onClearStoreSelections={() => setSelectedStores([])}
          onDbaNameChange={setDbaName}
          onShowAllClientsChange={setShowAllClients}
          onClientSearchChange={setClientSearch}
          onOpenStoreDetails={openStoreDetails}
        />

        <ConflictsDialog open={showConflicts} onOpenChange={setShowConflicts} conflicts={conflicts} />

        <MultiLocationDialog
          open={showMultiLocationDialog}
          searchTerm={multiLocationSearch}
          searchResults={searchResults}
          selectedStoreLinks={bulkSelectedStores}
          agentName={bulkAgentName}
          searchPending={searchStoresMutation.isPending}
          assignPending={bulkAssignMutation.isPending}
          onOpenChange={setShowMultiLocationDialog}
          onSearchTermChange={setMultiLocationSearch}
          onSearch={handleMultiLocationSearch}
          onToggleStore={(link) => {
            setBulkSelectedStores((prev) => {
              const next = new Set(prev);
              next.has(link) ? next.delete(link) : next.add(link);
              return next;
            });
          }}
          onSelectAll={() => setBulkSelectedStores(new Set(searchResults.map((s) => s.link)))}
          onDeselectAll={() => setBulkSelectedStores(new Set())}
          onAgentNameChange={setBulkAgentName}
          onAssign={handleBulkAssign}
          onReset={resetMultiLocationState}
        />
        <StoreDetailsDialogLauncher
          dialog={storeDetailsDialog}
          setDialog={setStoreDetailsDialog}
          refetch={refetchOrders}
        />
      </CardContent>
    </Card>
  );
}
