export interface ThemeColors {
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

export interface UserPreferences {
  lightModeColors?: ThemeColors;
  darkModeColors?: ThemeColors;
  hasLightOverrides?: boolean;
  hasDarkOverrides?: boolean;
  colorRowByStatus?: boolean;
  colorPresets?: Array<{ name: string; color: string }>;
}

export const defaultLightColors: ThemeColors = {
  background: "#f7f8f9",
  text: "#2a3441",
  tableTextColor: "#2a3441",
  primary: "#3b7efa",
  secondary: "#e3e5e8",
  accent: "#e9ebec",
  border: "#e3e5e8",
  bodyBackground: "",
  headerBackground: "",
  statesButton: "",
  franchiseButton: "",
  statusButton: "",
  columnsButton: "",
  actionButtons: "",
  statusColors: {
    Contacted: { background: "#dbeafe", text: "#1e40af" },
    Interested: { background: "#fef3c7", text: "#92400e" },
    "Sample Sent": { background: "#e0e7ff", text: "#3730a3" },
    "Follow-Up": { background: "#fed7aa", text: "#9a3412" },
    "Closed Won": { background: "#d1fae5", text: "#065f46" },
    "Closed Lost": { background: "#fee2e2", text: "#991b1b" },
    Warm: { background: "#fef9c3", text: "#854d0e" },
    Claimed: { background: "#dbeafe", text: "#1e40af" },
  },
};

export const defaultDarkColors: ThemeColors = {
  background: "#242a33",
  text: "#f5f7f9",
  tableTextColor: "#f5f7f9",
  primary: "#3b7efa",
  secondary: "#2f3640",
  accent: "#2a2f38",
  border: "#3a4350",
  bodyBackground: "",
  headerBackground: "",
  statesButton: "",
  franchiseButton: "",
  statusButton: "",
  columnsButton: "",
  actionButtons: "",
  statusColors: {
    Contacted: { background: "#1e3a8a", text: "#bfdbfe" },
    Interested: { background: "#78350f", text: "#fef3c7" },
    "Sample Sent": { background: "#312e81", text: "#c7d2fe" },
    "Follow-Up": { background: "#7c2d12", text: "#fed7aa" },
    "Closed Won": { background: "#064e3b", text: "#a7f3d0" },
    "Closed Lost": { background: "#7f1d1d", text: "#fecaca" },
    Warm: { background: "#78350f", text: "#fef9c3" },
    Claimed: { background: "#1e3a8a", text: "#bfdbfe" },
  },
};

export const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

export const migrateStatusColors = (
  statusColors: { [key: string]: { background: string; text: string } } | undefined,
): { [key: string]: { background: string; text: string } } => {
  if (!statusColors) return {};

  const cleanColors: { [key: string]: { background: string; text: string } } = {};

  for (const [key, value] of Object.entries(statusColors)) {
    const match = key.match(/^\d+\s*–\s*(.+)$/);
    if (match) {
      const cleanName = match[1];
      cleanColors[cleanName] = value;
    } else {
      cleanColors[key] = value;
    }
  }

  return cleanColors;
};
