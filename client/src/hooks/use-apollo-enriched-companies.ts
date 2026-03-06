import { useQuery } from "@tanstack/react-query";

export interface ScopedApolloCompany {
  id: string;
  tenantId: string;
  projectId: string | null;
  googleSheetLink: string;
  apolloOrgId: string | null;
  domain: string | null;
  name: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  employeeCount: number | null;
  industry: string | null;
  keywords: string[] | null;
  shortDescription: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  logoUrl: string | null;
  enrichedAt: string | null;
  creditsUsed: number | null;
  enrichmentStatus: string | null;
  contactCount?: number | null;
}

export function useApolloEnrichedCompanies(projectId?: string) {
  return useQuery<ScopedApolloCompany[]>({
    queryKey: ["/api/apollo/companies", projectId || "all-projects"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) {
        params.set("projectId", projectId);
      }
      const query = params.toString();
      const response = await fetch(`/api/apollo/companies${query ? `?${query}` : ""}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch enriched companies");
      }
      return response.json();
    },
  });
}
