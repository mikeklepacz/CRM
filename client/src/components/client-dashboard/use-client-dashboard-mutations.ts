import { useMutation, type QueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { normalizeLink } from "@shared/linkUtils";
import { useClientDashboardSaveColorsMutation } from "@/components/client-dashboard/use-client-dashboard-save-colors-mutation";

type ToastFn = (args: { title: string; description: string; variant?: "default" | "destructive" }) => void;

export function useClientDashboardMutations({
  getCurrentUserName,
  getLinkValue,
  joinColumn,
  queryClient,
  setHasInitializedColors,
  toast,
  trackerSheetId,
}: {
  getCurrentUserName: () => string;
  getLinkValue: (row: any) => string | undefined;
  joinColumn: string;
  queryClient: QueryClient;
  setHasInitializedColors: (value: boolean) => void;
  toast: ToastFn;
  trackerSheetId: string;
}) {
  // Mutation to update a cell in Google Sheets
  const updateCellMutation = useMutation({
    mutationFn: async ({
      sheetId,
      rowIndex,
      column,
      value,
      shouldAutoClaimRow,
      linkValue,
    }: {
      sheetId: string;
      rowIndex: number;
      column: string;
      value: any;
      shouldAutoClaimRow?: boolean;
      linkValue?: string;
    }) => {
      return await apiRequest("PUT", `/api/sheets/${sheetId}/update`, {
        rowIndex,
        column,
        value,
      });
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["merged-data"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["merged-data"]);

      // Optimistically update the cache
      queryClient.setQueryData(["merged-data"], (old: any) => {
        if (!old || !old.rows) return old;

        return {
          ...old,
          rows: old.rows.map((row: any) => {
            // Match the row being updated (by store row index or tracker row index)
            const isMatchingRow =
              (row._storeRowIndex === variables.rowIndex && row._storeSheetId === variables.sheetId) ||
              (row._trackerRowIndex === variables.rowIndex && row._trackerSheetId === variables.sheetId);

            if (isMatchingRow) {
              return { ...row, [variables.column]: variables.value };
            }
            return row;
          }),
        };
      });

      // Return context with the snapshot so we can rollback on error
      return { previousData };
    },
    onSuccess: async (data, variables) => {
      // Auto-claim unclaimed stores after successfully editing a store column
      if (variables.shouldAutoClaimRow && variables.linkValue && trackerSheetId) {
        try {
          // Optimistically mark as claimed in the cache
          queryClient.setQueryData(["merged-data"], (old: any) => {
            if (!old || !old.rows) return old;

            return {
              ...old,
              rows: old.rows.map((row: any) => {
                const rowLink = getLinkValue(row);
                if (rowLink && normalizeLink(rowLink) === normalizeLink(variables.linkValue!)) {
                  return {
                    ...row,
                    Agent: getCurrentUserName(), // Mark as claimed by current user
                    _hasTrackerData: true, // Mark as having tracker data
                  };
                }
                return row;
              }),
            };
          });

          await apiRequest("POST", `/api/sheets/${trackerSheetId}/claim-store`, {
            linkValue: variables.linkValue,
            column: "Agent", // Claim with Agent column
            value: "", // Empty value, just claiming
            joinColumn,
          });

          // Background refetch to get correct tracker metadata - fire and forget
          queryClient.refetchQueries({ queryKey: ["merged-data"] });
        } catch (error) {
          // Soft error - don't block the user
          console.error("Auto-claim failed:", error);
        }
      }
    },
    onError: (error: Error, variables, context: any) => {
      // Rollback to the previous value on error
      if (context?.previousData) {
        queryClient.setQueryData(["merged-data"], context.previousData);
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to upsert tracker row (create if doesn't exist, update if it does)
  const upsertTrackerMutation = useMutation({
    mutationFn: async ({
      trackerSheetId,
      link,
      updates,
      shouldAutoClaim,
      joinColumn,
    }: {
      trackerSheetId: string;
      link: string;
      updates: Record<string, any>;
      shouldAutoClaim?: boolean;
      joinColumn: string;
    }) => {
      return await apiRequest("POST", "/api/sheets/tracker/upsert", {
        link,
        updates,
      });
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["merged-data"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["merged-data"]);

      // Optimistically update the cache
      queryClient.setQueryData(["merged-data"], (old: any) => {
        if (!old || !old.rows) return old;

        return {
          ...old,
          rows: old.rows.map((row: any) => {
            // Match the row by link value
            const rowLink = getLinkValue(row);
            if (rowLink && normalizeLink(rowLink) === normalizeLink(variables.link)) {
              return { ...row, ...variables.updates };
            }
            return row;
          }),
        };
      });

      // Return context with the snapshot so we can rollback on error
      return { previousData };
    },
    onSuccess: async (data, variables) => {
      // Auto-claim unclaimed stores after successfully creating tracker row
      if (variables.shouldAutoClaim && variables.link && variables.trackerSheetId) {
        try {
          // Optimistically mark as claimed in the cache
          queryClient.setQueryData(["merged-data"], (old: any) => {
            if (!old || !old.rows) return old;

            return {
              ...old,
              rows: old.rows.map((row: any) => {
                const rowLink = getLinkValue(row);
                if (rowLink && normalizeLink(rowLink) === normalizeLink(variables.link)) {
                  return {
                    ...row,
                    Agent: getCurrentUserName(), // Mark as claimed by current user
                    _hasTrackerData: true, // Mark as having tracker data
                  };
                }
                return row;
              }),
            };
          });

          await apiRequest("POST", `/api/sheets/${variables.trackerSheetId}/claim-store`, {
            linkValue: variables.link,
            column: "Agent", // Claim with Agent column
            value: "", // Empty value, just claiming
            joinColumn: variables.joinColumn,
          });

          // Background refetch to get correct tracker metadata - fire and forget
          queryClient.refetchQueries({ queryKey: ["merged-data"] });
        } catch (error) {
          // Soft error - don't block the user
          console.error("Auto-claim failed:", error);
        }
      }
    },
    onError: (error: Error, variables, context: any) => {
      // Rollback to the previous value on error
      if (context?.previousData) {
        queryClient.setQueryData(["merged-data"], context.previousData);
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveColorsMutation = useClientDashboardSaveColorsMutation({
    queryClient,
    setHasInitializedColors,
    toast,
  });

  return {
    updateCellMutation,
    upsertTrackerMutation,
    saveColorsMutation,
  };
}
