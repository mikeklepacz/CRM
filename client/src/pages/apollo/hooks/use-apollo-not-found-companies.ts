import { useQuery } from "@tanstack/react-query";
import type { ApolloCompany } from "../types";

export function useApolloNotFoundCompanies(currentProjectId?: string) {
  return useQuery<ApolloCompany[]>({
    queryKey: ["/api/apollo/companies/not-found", currentProjectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentProjectId) {
        params.set("projectId", currentProjectId);
      }
      const response = await fetch(`/api/apollo/companies/not-found?${params.toString()}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch not found companies");
      }
      return response.json();
    },
  });
}
