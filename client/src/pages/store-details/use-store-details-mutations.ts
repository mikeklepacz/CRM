import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";
import type { StoreFormData } from "./types";

interface ToastApi {
  (input: { title: string; description: string; variant?: "destructive" }): void;
}

interface UseStoreDetailsMutationsParams {
  storeId: string | undefined;
  formData: StoreFormData;
  newNote: string;
  isFollowUp: boolean;
  storeData: any;
  toast: ToastApi;
  setNewNote: (value: string) => void;
  setIsFollowUp: (value: boolean) => void;
}

export function useStoreDetailsMutations({
  storeId,
  formData,
  newNote,
  isFollowUp,
  storeData,
  toast,
  setNewNote,
  setIsFollowUp,
}: UseStoreDetailsMutationsParams) {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => await apiRequest("PUT", `/api/store/${storeId}`, formData),
    onSuccess: () => {
      toast({ title: "Success", description: "Store information updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["store-details", storeId] });
      queryClient.invalidateQueries({ queryKey: ["merged-data"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => await apiRequest("POST", `/api/clients/${storeId}/notes`, { content: newNote, isFollowUp }),
    onSuccess: () => {
      toast({ title: "Note Added", description: "Your note has been saved successfully" });
      setNewNote("");
      setIsFollowUp(false);
      queryClient.invalidateQueries({ queryKey: ["/api/clients", storeId, "notes"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createReminderMutation = useMutation({
    mutationFn: async (reminderData: any) => {
      const { note, date, time, ...rest } = reminderData;

      let reminderDate: string;
      if (date instanceof Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        reminderDate = `${year}-${month}-${day}`;
      } else if (typeof date === "string") {
        reminderDate = date;
      } else {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        reminderDate = `${year}-${month}-${day}`;
      }

      return await apiRequest("POST", "/api/reminders", {
        title: note,
        reminderDate,
        reminderTime: time,
        ...rest,
        clientId: storeId,
        storeName: formData.name,
        storeMetadata: {
          link: formData.link,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pointOfContact: storeData?.["Point of Contact"] || storeData?.["POC"],
          pocEmail: storeData?.["POC Email"] || storeData?.["poc email"],
          pocPhone: storeData?.["POC Phone"] || storeData?.["poc phone"],
        },
      });
    },
    onSuccess: () => {
      toast({ title: "Reminder Created", description: "Your reminder has been saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    saveMutation,
    addNoteMutation,
    createReminderMutation,
  };
}
