import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { normalizeLink } from "@shared/linkUtils";
import { apiRequest } from "@/lib/queryClient";
import type { MatchSuggestionsResponse, StoreSelection, WooOrder, WooSettings } from "./types";

type Params = {
  matchingOrderId: string | null;
  clientSearch: string;
  setCommissionTypes: (value: Record<string, string>) => void;
  setCommissionAmounts: (value: Record<string, string>) => void;
  resetModifiedOrders: () => void;
};

export function useWooCommerceData({
  matchingOrderId,
  clientSearch,
  setCommissionTypes,
  setCommissionAmounts,
  resetModifiedOrders,
}: Params) {
  const { data: orders = [], refetch: refetchOrders } = useQuery<WooOrder[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const fetchedOrders = await apiRequest("GET", "/api/orders");
      const types: Record<string, string> = {};
      const amounts: Record<string, string> = {};

      (fetchedOrders || []).forEach((order: WooOrder) => {
        if (order.commissionType) types[order.id] = order.commissionType;
        if (order.commissionAmount) amounts[order.id] = order.commissionAmount;
      });

      setCommissionTypes(types);
      setCommissionAmounts(amounts);
      resetModifiedOrders();
      return fetchedOrders;
    },
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => apiRequest("GET", "/api/clients"),
  });

  const { data: wooSettings } = useQuery<WooSettings>({
    queryKey: ["/api/woocommerce/settings"],
    queryFn: async () => apiRequest("GET", "/api/woocommerce/settings"),
  });

  const { data: matchSuggestions } = useQuery<MatchSuggestionsResponse | null>({
    queryKey: ["/api/orders", matchingOrderId, "match-suggestions", clientSearch],
    queryFn: async () => {
      if (!matchingOrderId) return null;
      const searchParam = clientSearch.trim() ? `?search=${encodeURIComponent(clientSearch)}` : "";
      return apiRequest("GET", `/api/orders/${matchingOrderId}/match-suggestions${searchParam}`);
    },
    enabled: !!matchingOrderId,
  });

  return {
    orders,
    refetchOrders,
    clients,
    wooSettings,
    matchSuggestions,
  };
}

export function useSortedOrders(orders: WooOrder[], sortDirection: "asc" | "desc") {
  return [...orders].sort((a, b) => {
    const dateA = new Date(a.orderDate).getTime();
    const dateB = new Date(b.orderDate).getTime();
    return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
  });
}

export function useLiveCounts(orders: WooOrder[]) {
  const liveMatchedCount = orders.filter((o) => o.clientId || o.hasTrackerRows).length;
  const liveTotalCount = orders.length;
  return { liveMatchedCount, liveTotalCount };
}

type PreselectParams = {
  matchingOrderId: string | null;
  orders: WooOrder[];
  clients: any[];
  matchSuggestions: MatchSuggestionsResponse | null | undefined;
  setSelectedStores: (stores: StoreSelection[]) => void;
};

export function usePreselectedStores({
  matchingOrderId,
  orders,
  clients,
  matchSuggestions,
  setSelectedStores,
}: PreselectParams) {
  useEffect(() => {
    if (!matchingOrderId || !matchSuggestions) return;
    const currentOrder = orders.find((o) => o.id === matchingOrderId);
    const matchedLinks = new Set<string>();
    matchSuggestions.matchedStoreLinks?.forEach((link) => matchedLinks.add(normalizeLink(link)));
    if (currentOrder?.clientId) {
      const matchedClient = clients.find((c: any) => c.id === currentOrder.clientId);
      if (matchedClient?.data?.link) matchedLinks.add(normalizeLink(matchedClient.data.link));
    }
    const matchedStores = (matchSuggestions.suggestions || [])
      .filter((s) => matchedLinks.has(normalizeLink(s.link)))
      .map((s) => ({ link: s.link, name: s.displayName }));
    if (matchedStores.length > 0) setSelectedStores(matchedStores);
  }, [matchingOrderId, matchSuggestions, orders, clients, setSelectedStores]);
}
