import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/components/theme-provider";

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
  statusColors?: { [status: string]: { background: string; text: string } };
}

interface UserPreferences {
  lightModeColors?: ThemeColors;
  darkModeColors?: ThemeColors;
  hasLightOverrides?: boolean;
  hasDarkOverrides?: boolean;
}

// Default colors for light and dark modes
export const defaultLightColors: ThemeColors = {
  background: '#ffffff',
  text: '#000000',
  tableTextColor: '#000000',
  primary: '#3b82f6',
  secondary: '#f3f4f6',
  accent: '#8b5cf6',
  border: '#e5e7eb',
  bodyBackground: '',
  headerBackground: '',
  statusColors: {
    '1 – Contacted': { background: '#dbeafe', text: '#1e40af' },
    '2 – Interested': { background: '#fef3c7', text: '#92400e' },
    '3 – Sample Sent': { background: '#e0e7ff', text: '#3730a3' },
    '4 – Follow-Up': { background: '#fed7aa', text: '#9a3412' },
    '5 – Closed Won': { background: '#d1fae5', text: '#065f46' },
    '6 – Closed Lost': { background: '#fee2e2', text: '#991b1b' },
  },
};

export const defaultDarkColors: ThemeColors = {
  background: '#1a1a1a',
  text: '#ffffff',
  tableTextColor: '#ffffff',
  primary: '#60a5fa',
  secondary: '#2a2a2a',
  accent: '#a78bfa',
  border: '#404040',
  bodyBackground: '',
  headerBackground: '',
  statusColors: {
    '1 – Contacted': { background: '#1e3a8a', text: '#bfdbfe' },
    '2 – Interested': { background: '#78350f', text: '#fef3c7' },
    '3 – Sample Sent': { background: '#312e81', text: '#c7d2fe' },
    '4 – Follow-Up': { background: '#7c2d12', text: '#fed7aa' },
    '5 – Closed Won': { background: '#064e3b', text: '#a7f3d0' },
    '6 – Closed Lost': { background: '#7f1d1d', text: '#fecaca' },
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
 * Hook to apply custom theme colors globally via CSS variables
 * Colors are loaded from user preferences and applied to the root element
 * Light and dark mode colors are independent
 */
export function useCustomTheme() {
  const { actualTheme } = useTheme();

  // Fetch user preferences (only when authenticated to avoid 401 errors)
  const { data: userPreferences } = useQuery<UserPreferences | null>({
    queryKey: ['/api/user/preferences'],
    staleTime: Infinity,
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
      root.style.setProperty('--border', `${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%`);
      root.style.setProperty('--card-border', `${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%`);
      root.style.setProperty('--popover-border', `${borderHsl.h} ${borderHsl.s}% ${borderHsl.l}%`);
    }
  }, [actualTheme, userPreferences]);

  return {
    lightColors: { ...defaultLightColors, ...userPreferences?.lightModeColors },
    darkColors: { ...defaultDarkColors, ...userPreferences?.darkModeColors },
    currentColors: actualTheme === 'dark'
      ? { ...defaultDarkColors, ...userPreferences?.darkModeColors }
      : { ...defaultLightColors, ...userPreferences?.lightModeColors },
  };
}
