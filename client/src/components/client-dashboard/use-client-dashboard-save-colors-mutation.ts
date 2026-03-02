import { useMutation, type QueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type ToastFn = (args: { title: string; description: string; variant?: "default" | "destructive" }) => void;

export function useClientDashboardSaveColorsMutation({
  queryClient,
  setHasInitializedColors,
  toast,
}: {
  queryClient: QueryClient;
  setHasInitializedColors: (value: boolean) => void;
  toast: ToastFn;
}) {
  return useMutation({
    mutationFn: async ({ lightModeColors, darkModeColors }: any) => {
      return await apiRequest("PUT", "/api/user/preferences", {
        lightModeColors,
        darkModeColors,
      });
    },
    onSuccess: () => {
      // Reset initialization flag so saved colors get loaded back into local state
      setHasInitializedColors(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({
        title: "Colors Saved",
        description: "Your color preferences have been saved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
