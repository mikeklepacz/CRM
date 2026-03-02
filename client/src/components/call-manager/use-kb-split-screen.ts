import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useKbSplitScreen(onDisable: () => void) {
  const [splitScreenMode, setSplitScreenMode] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (!desktop && splitScreenMode) {
        setSplitScreenMode(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [splitScreenMode]);

  const { data: userPrefs } = useQuery<{ splitScreenProposals?: boolean }>({
    queryKey: ["/api/user/preferences"],
  });

  useEffect(() => {
    if (userPrefs?.splitScreenProposals && isDesktop) {
      setSplitScreenMode(true);
    }
  }, [userPrefs, isDesktop]);

  const saveSplitScreenMutation = useMutation({
    mutationFn: (enabled: boolean) => apiRequest("PUT", "/api/user/preferences", { splitScreenProposals: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
    },
  });

  const toggleSplitScreen = (checked: boolean) => {
    setSplitScreenMode(checked);
    saveSplitScreenMutation.mutate(checked);

    if (!checked) {
      onDisable();
    }
  };

  return {
    isDesktop,
    splitScreenMode,
    toggleSplitScreen,
  };
}
