import { useQuery } from "@tanstack/react-query";
import type { ApolloLeadDiscoveryStats, StoreContact } from "../types";

export function useApolloLeadDiscovery(currentProjectId?: string) {
  return useQuery<{
    contacts: StoreContact[];
    stats?: ApolloLeadDiscoveryStats;
  }>({
    queryKey: ["/api/apollo/leads-without-emails", currentProjectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentProjectId) {
        params.set("projectId", currentProjectId);
      }
      const response = await fetch(`/api/apollo/leads-without-emails?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch leads");
      }
      return response.json();
    },
    enabled: !!currentProjectId,
  });
}
