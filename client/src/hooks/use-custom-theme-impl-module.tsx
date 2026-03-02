import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { debug } from "@/lib/debug";
import type { SelectStatus } from "@shared/schema";
import { useCustomThemeMutations } from "./use-custom-theme/mutations";
import {
  defaultDarkColors,
  defaultLightColors,
  hexToHsl,
  migrateStatusColors,
  type ThemeColors,
  type UserPreferences,
} from "./use-custom-theme/shared";

export { defaultDarkColors, defaultLightColors };
export type { ThemeColors, UserPreferences };

export function useCustomTheme() {
  const { actualTheme } = useTheme();
  const { toast } = useToast();

  const { data: statusesData } = useQuery<{ statuses: SelectStatus[] }>({
    queryKey: ["/api/statuses"],
    retry: false,
  });

  const apiStatusColors = useMemo(() => {
    const lightColors: { [key: string]: { background: string; text: string } } = {};
    const darkColors: { [key: string]: { background: string; text: string } } = {};

    const statuses = statusesData?.statuses || [];
    statuses
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach((status) => {
        const key = status.name;
        lightColors[key] = { background: status.lightBgColor, text: status.lightTextColor };
        darkColors[key] = { background: status.darkBgColor, text: status.darkTextColor };
      });

    return { light: lightColors, dark: darkColors };
  }, [statusesData]);

  const statusOptions = useMemo(() => {
    const statuses = statusesData?.statuses || [];
    return statuses.sort((a, b) => a.displayOrder - b.displayOrder).map((status) => status.name);
  }, [statusesData]);

  const { data: userPreferences, isLoading } = useQuery<UserPreferences | null>({
    queryKey: ["/api/user/preferences"],
    retry: false,
  });

  useEffect(() => {
    const root = document.documentElement;

    const colors = actualTheme === "dark" ? { ...defaultDarkColors, ...userPreferences?.darkModeColors } : { ...defaultLightColors, ...userPreferences?.lightModeColors };
    const hasCustomColors = (actualTheme === "dark" && userPreferences?.hasDarkOverrides) || (actualTheme === "light" && userPreferences?.hasLightOverrides);

    if (!hasCustomColors) {
      root.style.removeProperty("--card");
      root.style.removeProperty("--card-foreground");
      root.style.removeProperty("--card-border");
      root.style.removeProperty("--popover");
      root.style.removeProperty("--popover-foreground");
      root.style.removeProperty("--popover-border");
      root.style.removeProperty("--primary");
      root.style.removeProperty("--secondary");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--border");
      root.style.removeProperty("--custom-card");
      root.style.removeProperty("--custom-card-foreground");
      return;
    }

    if (colors.background) {
      const bgHsl = hexToHsl(colors.background);
      root.style.setProperty("--card", `${bgHsl.h} ${bgHsl.s}% ${bgHsl.l}%`);
      root.style.setProperty("--popover", `${bgHsl.h} ${bgHsl.s}% ${bgHsl.l}%`);
      root.style.setProperty("--custom-card", colors.background);
    }

    if (colors.text) {
      const textHsl = hexToHsl(colors.text);
      root.style.setProperty("--card-foreground", `${textHsl.h} ${textHsl.s}% ${textHsl.l}%`);
      root.style.setProperty("--popover-foreground", `${textHsl.h} ${textHsl.s}% ${textHsl.l}%`);
      root.style.setProperty("--custom-card-foreground", colors.text);
    }

    if (colors.primary) {
      const primaryHsl = hexToHsl(colors.primary);
      root.style.setProperty("--primary", `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
    }

    if (colors.secondary) {
      const secondaryHsl = hexToHsl(colors.secondary);
      root.style.setProperty("--secondary", `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l}%`);
    }

    if (colors.accent) {
      const accentHsl = hexToHsl(colors.accent);
      root.style.setProperty("--accent", `${accentHsl.h} ${accentHsl.s}% ${accentHsl.l}%`);
    }

    if (colors.border) {
      const borderHsl = hexToHsl(colors.border);
      root.style.setProperty("--border", `${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%`);
      root.style.setProperty("--card-border", `${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%`);
      root.style.setProperty("--popover-border", `${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%`);
      root.style.setProperty("--sidebar-border", `${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%`);
      root.style.setProperty("--primary-border", `hsl(${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%)`);
      root.style.setProperty("--secondary-border", `hsl(${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%)`);
      root.style.setProperty("--accent-border", `hsl(${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%)`);
      root.style.setProperty("--muted-border", `hsl(${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%)`);
      root.style.setProperty("--destructive-border", `hsl(${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%)`);
      root.style.setProperty("--sidebar-primary-border", `hsl(${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%)`);
      root.style.setProperty("--sidebar-accent-border", `hsl(${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%)`);
    }
  }, [actualTheme, userPreferences]);

  const lightColorsStr = useMemo(() => JSON.stringify(userPreferences?.lightModeColors), [userPreferences?.lightModeColors]);
  const darkColorsStr = useMemo(() => JSON.stringify(userPreferences?.darkModeColors), [userPreferences?.darkModeColors]);

  const lightColors = useMemo(() => {
    const userLightColors: Partial<ThemeColors> = userPreferences?.lightModeColors || {};
    const migratedUserStatusColors = migrateStatusColors(userLightColors.statusColors);

    return {
      ...defaultLightColors,
      ...userLightColors,
      statusColors: {
        ...apiStatusColors.light,
        ...migratedUserStatusColors,
      },
    };
  }, [lightColorsStr, apiStatusColors]);

  const darkColors = useMemo(() => {
    const userDarkColors: Partial<ThemeColors> = userPreferences?.darkModeColors || {};
    const migratedUserStatusColors = migrateStatusColors(userDarkColors.statusColors);

    return {
      ...defaultDarkColors,
      ...userDarkColors,
      statusColors: {
        ...apiStatusColors.dark,
        ...migratedUserStatusColors,
      },
    };
  }, [darkColorsStr, apiStatusColors]);

  const currentColors = useMemo(() => {
    const colors = actualTheme === "dark" ? darkColors : lightColors;
    debug.statusLoad("Current theme colors loaded", {
      theme: actualTheme,
      statusColors: colors.statusColors,
    });
    return colors;
  }, [actualTheme, darkColors, lightColors]);

  const colorRowByStatus = userPreferences?.colorRowByStatus ?? false;
  const colorPresets = userPreferences?.colorPresets ?? [];

  const {
    saveColors,
    resetColors,
    isSaving,
    setColorRowByStatus,
    updateStatusEntry,
    isUpdatingStatus,
    saveAllStatusColors,
    isSavingAllStatusColors,
    setColorPresets,
    deleteColorPreset,
  } = useCustomThemeMutations({
    actualTheme,
    userPreferences,
    currentColors,
    toast,
    colorPresets,
  });

  return useMemo(
    () => ({
      lightColors,
      darkColors,
      currentColors,
      statusColors: currentColors.statusColors || {},
      statusOptions,
      saveColors,
      resetColors,
      isLoading,
      isSaving,
      colorRowByStatus,
      setColorRowByStatus,
      updateStatusEntry,
      isUpdatingStatus,
      saveAllStatusColors,
      isSavingAllStatusColors,
      colorPresets,
      setColorPresets,
      deleteColorPreset,
    }),
    [
      lightColors,
      darkColors,
      currentColors,
      statusOptions,
      saveColors,
      resetColors,
      isLoading,
      isSaving,
      colorRowByStatus,
      setColorRowByStatus,
      updateStatusEntry,
      isUpdatingStatus,
      saveAllStatusColors,
      isSavingAllStatusColors,
      colorPresets,
      setColorPresets,
      deleteColorPreset,
    ],
  );
}
