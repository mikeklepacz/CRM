import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { STORE_DETAILS_GLOBAL_AI_ASSISTANT_KEY } from "@/components/store-details/store-details-dialog-constants";

export function useStoreDetailsAssistantPreferences(open: boolean, userPreferences: any) {
  const queryClient = useQueryClient();

  const [showAssistant, setShowAssistant] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORE_DETAILS_GLOBAL_AI_ASSISTANT_KEY);
      return saved === "true";
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && open) {
      const saved = localStorage.getItem(STORE_DETAILS_GLOBAL_AI_ASSISTANT_KEY);
      setShowAssistant(saved === "true");
    }
  }, [open]);

  const handleShowAssistantChange = (checked: boolean) => {
    setShowAssistant(checked);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORE_DETAILS_GLOBAL_AI_ASSISTANT_KEY, String(checked));
    }
  };

  const [autoLoadScript, setAutoLoadScript] = useState<boolean>(true);

  useEffect(() => {
    if (userPreferences) {
      setAutoLoadScript(userPreferences.autoLoadScript ?? true);
    }
  }, [userPreferences]);

  const updateAutoLoadScriptMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoLoadScript: enabled }),
      });
      if (!response.ok) throw new Error("Failed to update preference");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
    },
  });

  const handleAutoLoadScriptChange = (checked: boolean) => {
    setAutoLoadScript(checked);
    updateAutoLoadScriptMutation.mutate(checked);
  };

  return {
    showAssistant,
    autoLoadScript,
    handleShowAssistantChange,
    handleAutoLoadScriptChange,
  };
}
