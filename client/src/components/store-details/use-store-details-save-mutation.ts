import { useMutation } from "@tanstack/react-query";
import { type Dispatch, type SetStateAction } from "react";
import { normalizeLink } from "@shared/linkUtils";
import { apiRequest } from "@/lib/queryClient";
import { getLinkValue } from "@/components/store-details/store-details-utils";
import { STORE_DETAILS_FIELD_TO_SHEET_MAPPING } from "@/components/store-details/store-details-dialog-constants";

interface UseStoreDetailsSaveMutationParams {
  formData: any;
  initialData: any;
  storeSheetId: string | undefined;
  row: any;
  multiLocationMode: boolean;
  dbaName: string;
  currentUser: any;
  toast: any;
  queryClient: any;
  trackerSheetId: string | undefined;
  showAssistant: boolean;
  setContextUpdateTrigger: (value: number | ((prev: number) => number)) => void;
  onOpenChange: (open: boolean) => void;
  setInitialData: Dispatch<SetStateAction<any>>;
}

export function useStoreDetailsSaveMutation({
  formData,
  initialData,
  storeSheetId,
  row,
  multiLocationMode,
  dbaName,
  currentUser,
  toast,
  queryClient,
  trackerSheetId,
  showAssistant,
  setContextUpdateTrigger,
  onOpenChange,
  setInitialData,
}: UseStoreDetailsSaveMutationParams) {
  return useMutation({
    mutationFn: async ({ closeDialog }: { closeDialog: boolean }) => {
      const storeChanges: Array<{ sheetId: string; rowIndex: number; column: string; value: string }> = [];
      const trackerChanges: Record<string, string> = {};

      Object.keys(formData).forEach((key) => {
        const typedKey = key as keyof typeof formData;
        if (formData[typedKey] !== initialData[typedKey]) {
          const mapping = STORE_DETAILS_FIELD_TO_SHEET_MAPPING[key];
          if (mapping) {
            if (mapping.sheet === "store") {
              const sheetId = storeSheetId;
              const rowIndex = row._storeRowIndex;

              if (sheetId && rowIndex !== undefined) {
                storeChanges.push({
                  sheetId,
                  rowIndex,
                  column: mapping.column,
                  value: formData[typedKey],
                });
              }
            } else {
              trackerChanges[mapping.column] = formData[typedKey];
            }
          }
        }
      });

      if (multiLocationMode && dbaName && dbaName.trim()) {
        if (!currentUser?.agentName) {
          toast({
            title: "Agent Name Required",
            description: "Please set your Agent Name in Settings before claiming stores.",
            variant: "destructive",
          });
          return;
        }

        const sheetId = storeSheetId;
        const rowIndex = row._storeRowIndex;

        if (sheetId && rowIndex !== undefined) {
          storeChanges.push({
            sheetId,
            rowIndex,
            column: "DBA",
            value: dbaName.trim(),
          });

          storeChanges.push({
            sheetId,
            rowIndex,
            column: "Agent Name",
            value: currentUser.agentName,
          });

          const wasEmpty = !initialData.dba || initialData.dba.trim() === "";
          const nowHasValue = dbaName.trim() !== "";

          if (wasEmpty && nowHasValue) {
            console.log("🎯 [AUTO-CLAIM] DBA created for first time, setting Status=Claimed");
            trackerChanges.Status = "Claimed";
          } else {
            console.log("ℹ️ [AUTO-CLAIM] DBA already exists, NOT overriding status", {
              wasEmpty,
              nowHasValue,
              initialDba: initialData.dba,
              newDba: dbaName,
            });
          }
        }
      }

      if (storeChanges.length === 0 && Object.keys(trackerChanges).length === 0) {
        throw new Error("No changes detected to save. If you made changes but see this error, please contact support with the store details.");
      }

      const promises = [];

      if (storeChanges.length > 0) {
        promises.push(
          ...storeChanges.map(({ sheetId, rowIndex, column, value }) =>
            apiRequest("PUT", `/api/sheets/${sheetId}/update`, { rowIndex, column, value }),
          ),
        );
      }

      if (Object.keys(trackerChanges).length > 0) {
        const link = formData.link || getLinkValue(row);
        console.log("🔍 [TRACKER SAVE] Link extraction:", {
          formDataLink: formData.link,
          getLinkValueResult: getLinkValue(row),
          finalLink: link,
          trackerChanges,
        });

        if (!link) {
          throw new Error("Cannot save tracker fields: Store link is missing");
        }

        promises.push(apiRequest("POST", "/api/sheets/tracker/upsert", { link, updates: trackerChanges }));
      }

      console.log("💾 Starting save mutation", { storeChanges, trackerChanges });

      try {
        await Promise.all(promises);
        console.log("✅ All promises resolved successfully");
        return { closeDialog, storeChanges, trackerChanges };
      } catch (error) {
        console.error("❌ Promise.all failed:", error);
        throw error;
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["merged-data"] });
      const previousData = queryClient.getQueryData(["merged-data"]);

      queryClient.setQueryData(["merged-data"], (old: any) => {
        if (!old || !old.rows) return old;

        return {
          ...old,
          rows: old.rows.map((r: any) => {
            const rowLink = getLinkValue(r);
            const currentRowLink = getLinkValue(row);
            if (rowLink && currentRowLink && normalizeLink(rowLink) === normalizeLink(currentRowLink)) {
              return { ...r, ...formData };
            }
            return r;
          }),
        };
      });

      return { previousData };
    },
    onSuccess: async (data) => {
      console.log("✅ onSuccess fired!", data);

      try {
        setInitialData(formData);

        const isUnclaimed = !row._trackerRowIndex;
        const linkValue = formData.link || getLinkValue(row);
        const joinColumn = "link";

        if (isUnclaimed && linkValue && trackerSheetId) {
          try {
            console.log("🔄 Auto-claiming store...");
            await apiRequest("POST", `/api/sheets/${trackerSheetId}/claim-store`, {
              linkValue,
              column: "Agent",
              value: "",
              joinColumn,
            });
            console.log("✅ Auto-claim successful");
          } catch (error) {
            console.error("Auto-claim failed:", error);
          }
        }

        toast({
          title: "✅ Saved",
          description: "Changes saved successfully",
          duration: 3000,
        });

        if (showAssistant) {
          setContextUpdateTrigger((prev) => prev + 1);
        }

        if (data?.closeDialog) {
          onOpenChange(false);
        }
      } catch (error) {
        console.error("❌ Error in onSuccess handler:", error);
        toast({
          title: "⚠️ Partial Save",
          description: "Changes were saved but there was an issue with follow-up actions",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error, _variables, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(["merged-data"], context.previousData);
      }

      console.error("❌ SAVE FAILED:", error);
      console.error("Store data:", {
        storeRowIndex: row._storeRowIndex,
        trackerRowIndex: row._trackerRowIndex,
        link: row.link || row.Link,
      });

      toast({
        title: "❌ Save Failed",
        description: error.message,
        variant: "destructive",
        duration: 10000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["merged-data"] });
    },
  });
}
