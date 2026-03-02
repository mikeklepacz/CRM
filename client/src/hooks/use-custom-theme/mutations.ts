import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";

import { apiRequest, queryClient } from "@/lib/queryClient";
import { debug } from "@/lib/debug";
import { defaultDarkColors, defaultLightColors, migrateStatusColors, type ThemeColors, type UserPreferences } from "./shared";

interface ToastApi {
  (input: { title: string; description: string; variant?: "destructive" }): void;
}

interface UseCustomThemeMutationsParams {
  actualTheme: string;
  userPreferences: UserPreferences | null | undefined;
  currentColors: ThemeColors;
  toast: ToastApi;
  colorPresets: Array<{ name: string; color: string }>;
}

export function useCustomThemeMutations({
  actualTheme,
  userPreferences,
  currentColors,
  toast,
  colorPresets,
}: UseCustomThemeMutationsParams) {
  const saveColorsMutation = useMutation({
    mutationFn: async (colors: ThemeColors) => {
      const preferences: any = userPreferences ? { ...userPreferences } : {};

      if (actualTheme === "dark") {
        preferences.darkModeColors = colors;
        preferences.hasDarkOverrides = true;
      } else {
        preferences.lightModeColors = colors;
        preferences.hasLightOverrides = true;
      }

      return await apiRequest("PUT", "/api/user/preferences", preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({
        title: "Colors saved",
        description: `${actualTheme === "dark" ? "Dark" : "Light"} mode colors updated successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save color preferences",
        variant: "destructive",
      });
    },
  });

  const setColorRowByStatusMutation = useMutation({
    mutationFn: async (value: boolean) => {
      return await apiRequest("PUT", "/api/user/preferences", { colorRowByStatus: value });
    },
    onMutate: async (value: boolean) => {
      await queryClient.cancelQueries({ queryKey: ["/api/user/preferences"] });
      const previousPreferences = queryClient.getQueryData(["/api/user/preferences"]);
      queryClient.setQueryData(["/api/user/preferences"], (old: any) => {
        return old ? { ...old, colorRowByStatus: value } : old;
      });
      return { previousPreferences };
    },
    onError: (err, value, context: any) => {
      queryClient.setQueryData(["/api/user/preferences"], context.previousPreferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
    },
  });

  const updateStatusEntryMutation = useMutation({
    mutationFn: async ({ index, name, bgColor, textColor }: { index: number; name: string; bgColor: string; textColor: string }) => {
      const cleanStatusColors = migrateStatusColors(currentColors.statusColors);
      cleanStatusColors[name] = { background: bgColor, text: textColor };
      const updatedColors = { ...currentColors, statusColors: cleanStatusColors };

      debug.statusSave("Updating status entry", { index, name, bgColor, textColor });

      const preferences: any = userPreferences ? { ...userPreferences } : {};
      if (actualTheme === "dark") {
        preferences.darkModeColors = updatedColors;
        preferences.hasDarkOverrides = true;
      } else {
        preferences.lightModeColors = updatedColors;
        preferences.hasLightOverrides = true;
      }

      return await apiRequest("PUT", "/api/user/preferences", preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      debug.statusSave("Status entry saved successfully");
    },
  });

  const saveAllStatusColorsMutation = useMutation({
    mutationFn: async (allStatusColors: { [status: string]: { background: string; text: string } }) => {
      const cleanStatusColors = migrateStatusColors(allStatusColors);
      const updatedColors = { ...currentColors, statusColors: cleanStatusColors };

      debug.statusSave("Batch saving all status colors", { count: Object.keys(cleanStatusColors).length });

      const preferences: any = userPreferences ? { ...userPreferences } : {};
      if (actualTheme === "dark") {
        preferences.darkModeColors = updatedColors;
        preferences.hasDarkOverrides = true;
      } else {
        preferences.lightModeColors = updatedColors;
        preferences.hasLightOverrides = true;
      }

      return await apiRequest("PUT", "/api/user/preferences", preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      debug.statusSave("All status colors saved successfully in single batch");
    },
  });

  const setColorPresetsMutation = useMutation({
    mutationFn: async (presets: Array<{ name: string; color: string }>) => {
      const preferences = userPreferences ? { ...userPreferences } : {};
      preferences.colorPresets = presets;
      return await apiRequest("PUT", "/api/user/preferences", preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
    },
  });

  const saveColors = useCallback(
    (colors: ThemeColors) => {
      if (!colors || Object.keys(colors).length === 0) {
        toast({
          title: "Error",
          description: "Cannot save empty color settings",
          variant: "destructive",
        });
        return;
      }

      saveColorsMutation.mutate(colors);
    },
    [saveColorsMutation, toast],
  );

  const resetColors = useCallback(() => {
    const defaultColors = actualTheme === "dark" ? defaultDarkColors : defaultLightColors;
    saveColorsMutation.mutate(defaultColors);
  }, [actualTheme, saveColorsMutation]);

  const setColorRowByStatus = useCallback(
    (value: boolean) => {
      setColorRowByStatusMutation.mutate(value);
    },
    [setColorRowByStatusMutation],
  );

  const updateStatusEntry = useCallback(
    (index: number, name: string, bgColor: string, textColor: string) => {
      updateStatusEntryMutation.mutate({ index, name, bgColor, textColor });
    },
    [updateStatusEntryMutation],
  );

  const saveAllStatusColors = useCallback(
    (allStatusColors: { [status: string]: { background: string; text: string } }) => {
      return saveAllStatusColorsMutation.mutateAsync(allStatusColors);
    },
    [saveAllStatusColorsMutation],
  );

  const setColorPresets = useCallback(
    (presets: Array<{ name: string; color: string }>) => {
      setColorPresetsMutation.mutate(presets);
    },
    [setColorPresetsMutation],
  );

  const deleteColorPreset = useCallback(
    (index: number) => {
      const newPresets = colorPresets.filter((_, i) => i !== index);
      setColorPresetsMutation.mutate(newPresets);
    },
    [colorPresets, setColorPresetsMutation],
  );

  return {
    saveColors,
    resetColors,
    isSaving: saveColorsMutation.isPending,
    setColorRowByStatus,
    updateStatusEntry,
    isUpdatingStatus: updateStatusEntryMutation.isPending,
    saveAllStatusColors,
    isSavingAllStatusColors: saveAllStatusColorsMutation.isPending,
    setColorPresets,
    deleteColorPreset,
  };
}
