import { useMutation } from "@tanstack/react-query";
import { normalizeLink } from "@shared/linkUtils";
import { apiRequest } from "@/lib/queryClient";
import { getLinkValue } from "@/components/store-details/store-details-utils";

export function useStoreDetailsUpsertTrackerFieldsMutation(queryClient: any) {
  return useMutation({
    mutationFn: async ({
      link,
      updates,
    }: {
      link: string;
      updates: Record<string, string>;
    }) => {
      return await apiRequest("POST", "/api/sheets/tracker/upsert", {
        link,
        updates,
      });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["merged-data"] });
      const previousData = queryClient.getQueryData(["merged-data"]);

      queryClient.setQueryData(["merged-data"], (old: any) => {
        if (!old || !old.rows) return old;
        return {
          ...old,
          rows: old.rows.map((r: any) => {
            const rowLink = getLinkValue(r);
            if (rowLink && normalizeLink(rowLink) === normalizeLink(variables.link)) {
              return { ...r, ...variables.updates };
            }
            return r;
          }),
        };
      });

      return { previousData };
    },
    onError: (_error: Error, _variables, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(["merged-data"], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["merged-data"] });
    },
  });
}
