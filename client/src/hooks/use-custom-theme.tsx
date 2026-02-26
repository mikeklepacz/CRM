import { useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTheme } from "@/components/theme-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { debug } from "@/lib/debug";
import type { SelectStatus } from "@shared/schema";

interface ThemeColors {
  background: string;
  text: string;
  tableTextColor?: string;
  primary: string;
  secondary: string;
  accent: string;
  border: string;
  bodyBackground?: string;
  headerBackground?: string;
  statesButton?: string;
  franchiseButton?: string;
  statusButton?: string;
  columnsButton?: string;
  actionButtons?: string;
  statusColors?: { [status: string]: { background: string; text: string } };
}

interface UserPreferences {
  lightModeColors?: ThemeColors;
  darkModeColors?: ThemeColors;
  hasLightOverrides?: boolean;
  hasDarkOverrides?: boolean;
  colorRowByStatus?: boolean;
  colorPresets?: Array<{name: string, color: string}>;
}

// Default colors for light and dark modes (matching Replit's default theme)
export const defaultLightColors: ThemeColors = {
  background: '#f7f8f9',        // --card: 220 13% 97%
  text: '#2a3441',              // --card-foreground: 220 9% 16%
  tableTextColor: '#2a3441',    // --foreground: 220 9% 16%
  primary: '#3b7efa',           // --primary: 221 83% 53%
  secondary: '#e3e5e8',         // --secondary: 220 13% 89%
  accent: '#e9ebec',            // --accent: 220 13% 91%
  border: '#e3e5e8',            // --border: 220 13% 91%
  bodyBackground: '',
  headerBackground: '',
  statesButton: '',
  franchiseButton: '',
  statusButton: '',
  columnsButton: '',
  actionButtons: '',
  statusColors: {
    'Contacted': { background: '#dbeafe', text: '#1e40af' },
    'Interested': { background: '#fef3c7', text: '#92400e' },
    'Sample Sent': { background: '#e0e7ff', text: '#3730a3' },
    'Follow-Up': { background: '#fed7aa', text: '#9a3412' },
    'Closed Won': { background: '#d1fae5', text: '#065f46' },
    'Closed Lost': { background: '#fee2e2', text: '#991b1b' },
    'Warm': { background: '#fef9c3', text: '#854d0e' },
    'Claimed': { background: '#dbeafe', text: '#1e40af' },
  },
};

export const defaultDarkColors: ThemeColors = {
  background: '#242a33',        // --card: 217 33% 17%
  text: '#f5f7f9',              // --card-foreground: 210 20% 98%
  tableTextColor: '#f5f7f9',    // --foreground: 210 20% 98%
  primary: '#3b7efa',           // --primary: 221 83% 53%
  secondary: '#2f3640',         // --secondary: 217 33% 23%
  accent: '#2a2f38',            // --accent: 217 33% 20%
  border: '#3a4350',            // --border: 217 33% 24%
  bodyBackground: '',
  headerBackground: '',
  statesButton: '',
  franchiseButton: '',
  statusButton: '',
  columnsButton: '',
  actionButtons: '',
  statusColors: {
    'Contacted': { background: '#1e3a8a', text: '#bfdbfe' },
    'Interested': { background: '#78350f', text: '#fef3c7' },
    'Sample Sent': { background: '#312e81', text: '#c7d2fe' },
    'Follow-Up': { background: '#7c2d12', text: '#fed7aa' },
    'Closed Won': { background: '#064e3b', text: '#a7f3d0' },
    'Closed Lost': { background: '#7f1d1d', text: '#fecaca' },
    'Warm': { background: '#78350f', text: '#fef9c3' },
    'Claimed': { background: '#1e3a8a', text: '#bfdbfe' },
  },
};

// Convert hex to HSL
const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

/**
 * Migrate legacy numbered status color keys (e.g., "1 – Claimed") to clean names (e.g., "Claimed")
 * This ensures compatibility with the new clean status name system
 */
const migrateStatusColors = (statusColors: { [key: string]: { background: string; text: string } } | undefined): { [key: string]: { background: string; text: string } } => {
  if (!statusColors) return {};
  
  const cleanColors: { [key: string]: { background: string; text: string } } = {};
  
  for (const [key, value] of Object.entries(statusColors)) {
    // If the key matches the pattern "# – Name", extract just the name
    const match = key.match(/^\d+\s*–\s*(.+)$/);
    if (match) {
      const cleanName = match[1];
      cleanColors[cleanName] = value;
    } else {
      // Already a clean name
      cleanColors[key] = value;
    }
  }
  
  return cleanColors;
};

/**
 * Hook to apply custom theme colors globally via CSS variables
 * Colors are loaded from user preferences and applied to the root element
 * Light and dark mode colors are independent
 * 
 * This hook is the SINGLE SOURCE OF TRUTH for color management
 */
export function useCustomTheme() {
  const { actualTheme } = useTheme();
  const { toast } = useToast();

  // Fetch statuses from API
  const { data: statusesData } = useQuery<{ statuses: SelectStatus[] }>({
    queryKey: ['/api/statuses'],
    retry: false,
  });

  // Build status colors and options from API data
  const apiStatusColors = useMemo(() => {
    const lightColors: { [key: string]: { background: string; text: string } } = {};
    const darkColors: { [key: string]: { background: string; text: string } } = {};
    
    const statuses = statusesData?.statuses || [];
    statuses
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(status => {
        // Use clean status name as the key
        const key = status.name;
        lightColors[key] = {
          background: status.lightBgColor,
          text: status.lightTextColor
        };
        darkColors[key] = {
          background: status.darkBgColor,
          text: status.darkTextColor
        };
      });
    
    return { light: lightColors, dark: darkColors };
  }, [statusesData]);

  // Build ordered status options (just names, sorted by displayOrder)
  const statusOptions = useMemo(() => {
    const statuses = statusesData?.statuses || [];
    return statuses
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(status => status.name);
  }, [statusesData]);

  // Fetch user preferences (only when authenticated to avoid 401 errors)
  const { data: userPreferences, isLoading } = useQuery<UserPreferences | null>({
    queryKey: ['/api/user/preferences'],
    retry: false, // Don't retry on auth failures
  });

  useEffect(() => {
    const root = document.documentElement;

    // Determine which color set to use based on theme
    const colors = actualTheme === 'dark'
      ? { ...defaultDarkColors, ...userPreferences?.darkModeColors }
      : { ...defaultLightColors, ...userPreferences?.lightModeColors };

    // Only apply custom colors if user has explicitly saved overrides
    // Use the flags from database to reliably detect customization
    const hasCustomColors = (actualTheme === 'dark' && userPreferences?.hasDarkOverrides) ||
                           (actualTheme === 'light' && userPreferences?.hasLightOverrides);

    if (!hasCustomColors) {
      // Clear ALL overridden CSS variables to prevent color bleed across themes
      // This ensures that when switching from a customized theme to a non-customized one,
      // the framework defaults are restored
      root.style.removeProperty('--card');
      root.style.removeProperty('--card-foreground');
      root.style.removeProperty('--card-border');
      root.style.removeProperty('--popover');
      root.style.removeProperty('--popover-foreground');
      root.style.removeProperty('--popover-border');
      root.style.removeProperty('--primary');
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--border');
      root.style.removeProperty('--custom-card');
      root.style.removeProperty('--custom-card-foreground');
      return;
    }

    // Apply custom colors by overriding Shadcn theme variables
    // This makes the colors apply globally to all components
    if (colors.background) {
      const bgHsl = hexToHsl(colors.background);
      root.style.setProperty('--card', `${bgHsl.h} ${bgHsl.s}% ${bgHsl.l}%`);
      root.style.setProperty('--popover', `${bgHsl.h} ${bgHsl.s}% ${bgHsl.l}%`);
      root.style.setProperty('--custom-card', colors.background);
    }

    if (colors.text) {
      const textHsl = hexToHsl(colors.text);
      root.style.setProperty('--card-foreground', `${textHsl.h} ${textHsl.s}% ${textHsl.l}%`);
      root.style.setProperty('--popover-foreground', `${textHsl.h} ${textHsl.s}% ${textHsl.l}%`);
      root.style.setProperty('--custom-card-foreground', colors.text);
    }

    if (colors.primary) {
      const primaryHsl = hexToHsl(colors.primary);
      root.style.setProperty('--primary', `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
    }

    if (colors.secondary) {
      const secondaryHsl = hexToHsl(colors.secondary);
      root.style.setProperty('--secondary', `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l}%`);
    }

    if (colors.accent) {
      const accentHsl = hexToHsl(colors.accent);
      root.style.setProperty('--accent', `${accentHsl.h} ${accentHsl.s}% ${accentHsl.l}%`);
    }

    if (colors.border) {
      const borderHsl = hexToHsl(colors.border);
      // Override ALL border CSS variables to ensure consistent border colors
      root.style.setProperty('--border', `${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%`);
      root.style.setProperty('--card-border', `${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%`);
      root.style.setProperty('--popover-border', `${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%`);
      root.style.setProperty('--sidebar-border', `${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%`);
      // Also override computed borders that are derived from other colors
      root.style.setProperty('--primary-border', `hsl(${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%)`);
      root.style.setProperty('--secondary-border', `hsl(${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%)`);
      root.style.setProperty('--accent-border', `hsl(${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%)`);
      root.style.setProperty('--muted-border', `hsl(${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%)`);
      root.style.setProperty('--destructive-border', `hsl(${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%)`);
      root.style.setProperty('--sidebar-primary-border', `hsl(${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%)`);
      root.style.setProperty('--sidebar-accent-border', `hsl(${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%)`);
    }
  }, [actualTheme, userPreferences]);

  // Memoize the merged color objects to prevent infinite re-renders
  // First, create stable stringified versions of the color data
  const lightColorsStr = useMemo(
    () => JSON.stringify(userPreferences?.lightModeColors),
    [userPreferences?.lightModeColors]
  );

  const darkColorsStr = useMemo(
    () => JSON.stringify(userPreferences?.darkModeColors),
    [userPreferences?.darkModeColors]
  );

  // Then use those stable strings as dependencies for the merged objects
  const lightColors = useMemo(
    () => {
      const userLightColors: Partial<ThemeColors> = userPreferences?.lightModeColors || {};
      const migratedUserStatusColors = migrateStatusColors(userLightColors.statusColors);
      
      return {
        ...defaultLightColors,
        ...userLightColors,
        // Merge clean API status colors with migrated user overrides
        statusColors: {
          ...apiStatusColors.light,
          ...migratedUserStatusColors
        }
      };
    },
    [lightColorsStr, apiStatusColors]
  );

  const darkColors = useMemo(
    () => {
      const userDarkColors: Partial<ThemeColors> = userPreferences?.darkModeColors || {};
      const migratedUserStatusColors = migrateStatusColors(userDarkColors.statusColors);
      
      return {
        ...defaultDarkColors,
        ...userDarkColors,
        // Merge clean API status colors with migrated user overrides
        statusColors: {
          ...apiStatusColors.dark,
          ...migratedUserStatusColors
        }
      };
    },
    [darkColorsStr, apiStatusColors]
  );

  // Finally, currentColors only depends on theme and the stable color objects
  const currentColors = useMemo(
    () => {
      const colors = actualTheme === 'dark' ? darkColors : lightColors;
      debug.statusLoad(`Current theme colors loaded`, {
        theme: actualTheme,
        statusColors: colors.statusColors
      });
      return colors;
    },
    [actualTheme, darkColors, lightColors]
  );

  // Mutation to save colors - centralized here to prevent state sync issues
  const saveColorsMutation = useMutation({
    mutationFn: async (colors: ThemeColors) => {
      const preferences: any = userPreferences ? { ...userPreferences } : {};

      if (actualTheme === 'dark') {
        preferences.darkModeColors = colors;
        preferences.hasDarkOverrides = true;
      } else {
        preferences.lightModeColors = colors;
        preferences.hasLightOverrides = true;
      }

      return await apiRequest('PUT', '/api/user/preferences', preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      toast({
        title: "Colors saved",
        description: `${actualTheme === 'dark' ? 'Dark' : 'Light'} mode colors updated successfully.`,
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

  // Callback to save colors
  const saveColors = useCallback((colors: ThemeColors) => {
    // Validate colors before saving
    if (!colors || Object.keys(colors).length === 0) {
      toast({
        title: "Error",
        description: "Cannot save empty color settings",
        variant: "destructive",
      });
      return;
    }
    
    saveColorsMutation.mutate(colors);
  }, [saveColorsMutation, toast]);

  // Callback to reset colors to defaults
  const resetColors = useCallback(() => {
    const defaultColors = actualTheme === 'dark' ? defaultDarkColors : defaultLightColors;
    saveColorsMutation.mutate(defaultColors);
  }, [actualTheme, saveColorsMutation]);

  // Get colorRowByStatus from user preferences
  const colorRowByStatus = userPreferences?.colorRowByStatus ?? false;

  // Mutation to update colorRowByStatus preference
  const setColorRowByStatusMutation = useMutation({
    mutationFn: async (value: boolean) => {
      // Send only the field we're updating - backend will merge with existing preferences
      return await apiRequest('PUT', '/api/user/preferences', {
        colorRowByStatus: value
      });
    },
    onMutate: async (value: boolean) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/user/preferences'] });
      
      // Snapshot the previous value
      const previousPreferences = queryClient.getQueryData(['/api/user/preferences']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['/api/user/preferences'], (old: any) => {
        return old ? { ...old, colorRowByStatus: value } : old;
      });
      
      // Return context with the snapshot
      return { previousPreferences };
    },
    onError: (err, value, context: any) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['/api/user/preferences'], context.previousPreferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
  });

  const setColorRowByStatus = useCallback((value: boolean) => {
    setColorRowByStatusMutation.mutate(value);
  }, [setColorRowByStatusMutation]);

  // Mutation to update a single status entry (using clean status names)
  const updateStatusEntryMutation = useMutation({
    mutationFn: async ({ index, name, bgColor, textColor }: { index: number; name: string; bgColor: string; textColor: string }) => {
      const cleanStatusColors = migrateStatusColors(currentColors.statusColors);
      cleanStatusColors[name] = { background: bgColor, text: textColor };
      
      const updatedColors = { ...currentColors, statusColors: cleanStatusColors };
      
      debug.statusSave('Updating status entry', { index, name, bgColor, textColor });
      
      const preferences: any = userPreferences ? { ...userPreferences } : {};
      if (actualTheme === 'dark') {
        preferences.darkModeColors = updatedColors;
        preferences.hasDarkOverrides = true;
      } else {
        preferences.lightModeColors = updatedColors;
        preferences.hasLightOverrides = true;
      }
      
      return await apiRequest('PUT', '/api/user/preferences', preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      debug.statusSave('Status entry saved successfully');
    },
  });

  const updateStatusEntry = useCallback((index: number, name: string, bgColor: string, textColor: string) => {
    updateStatusEntryMutation.mutate({ index, name, bgColor, textColor });
  }, [updateStatusEntryMutation]);

  // Batch mutation to save ALL status colors in a single API call (prevents race condition)
  const saveAllStatusColorsMutation = useMutation({
    mutationFn: async (allStatusColors: { [status: string]: { background: string; text: string } }) => {
      const cleanStatusColors = migrateStatusColors(allStatusColors);
      const updatedColors = { ...currentColors, statusColors: cleanStatusColors };

      debug.statusSave('Batch saving all status colors', { count: Object.keys(cleanStatusColors).length });

      const preferences: any = userPreferences ? { ...userPreferences } : {};
      if (actualTheme === 'dark') {
        preferences.darkModeColors = updatedColors;
        preferences.hasDarkOverrides = true;
      } else {
        preferences.lightModeColors = updatedColors;
        preferences.hasLightOverrides = true;
      }

      return await apiRequest('PUT', '/api/user/preferences', preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      debug.statusSave('All status colors saved successfully in single batch');
    },
  });

  const saveAllStatusColors = useCallback((allStatusColors: { [status: string]: { background: string; text: string } }) => {
    return saveAllStatusColorsMutation.mutateAsync(allStatusColors);
  }, [saveAllStatusColorsMutation]);

  // Get colorPresets from user preferences
  const colorPresets = userPreferences?.colorPresets ?? [];

  // Mutation to update colorPresets
  const setColorPresetsMutation = useMutation({
    mutationFn: async (presets: Array<{name: string, color: string}>) => {
      const preferences = userPreferences ? { ...userPreferences } : {};
      preferences.colorPresets = presets;
      return await apiRequest('PUT', '/api/user/preferences', preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
  });

  const setColorPresets = useCallback((presets: Array<{name: string, color: string}>) => {
    setColorPresetsMutation.mutate(presets);
  }, [setColorPresetsMutation]);

  const deleteColorPreset = useCallback((index: number) => {
    const newPresets = colorPresets.filter((_, i) => i !== index);
    setColorPresetsMutation.mutate(newPresets);
  }, [colorPresets, setColorPresetsMutation]);

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
      isSaving: saveColorsMutation.isPending,
      colorRowByStatus,
      setColorRowByStatus,
      updateStatusEntry,
      isUpdatingStatus: updateStatusEntryMutation.isPending,
      saveAllStatusColors,
      isSavingAllStatusColors: saveAllStatusColorsMutation.isPending,
      colorPresets,
      setColorPresets,
      deleteColorPreset,
    }),
    [lightColors, darkColors, currentColors, statusOptions, saveColors, resetColors, isLoading, saveColorsMutation.isPending, colorRowByStatus, setColorRowByStatus, updateStatusEntry, updateStatusEntryMutation.isPending, saveAllStatusColors, saveAllStatusColorsMutation.isPending, colorPresets, setColorPresets, deleteColorPreset]
  );
}
