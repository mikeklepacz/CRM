export function hexToHsl(hex: string): { h: number; s: number; l: number } {
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

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export const COLOR_FIELDS = [
  "background",
  "tableTextColor",
  "text",
  "primary",
  "secondary",
  "accent",
  "border",
  "bodyBackground",
  "headerBackground",
  "statesButton",
  "franchiseButton",
  "statusButton",
  "columnsButton",
  "actionButtons",
] as const;

export const FIELD_LABELS: Record<(typeof COLOR_FIELDS)[number], string> = {
  background: "Table Background",
  tableTextColor: "Table Text Color",
  text: "Interface Text",
  primary: "Table Links (Phone, Email, Website)",
  secondary: "Card & Panel Background",
  accent: "Accent Highlights",
  border: "Borders & Dividers",
  bodyBackground: "Page Background",
  headerBackground: "Header Background",
  statesButton: "States Filter Button",
  franchiseButton: "Find Franchise Button",
  statusButton: "Status Filter Button",
  columnsButton: "Columns Button",
  actionButtons: "Action Buttons (Save, Export, etc)",
};

export const FIELD_DESCRIPTIONS: Record<(typeof COLOR_FIELDS)[number], string> = {
  background: "Background color of the main data table",
  tableTextColor: "Text color inside table cells and data rows",
  text: "Color of headings, labels, and interface text",
  primary: "Color for clickable phone numbers, emails, and website links in table",
  secondary: "Secondary buttons and card backgrounds",
  accent: "Accent elements and secondary highlights",
  border: "Border lines between rows and card edges",
  bodyBackground: "Main page body background (leave empty for theme default)",
  headerBackground: "Top header background (leave empty for theme default)",
  statesButton: "Color for the States filter button",
  franchiseButton: "Color for the Find Franchise button",
  statusButton: "Color for the Status filter button",
  columnsButton: "Color for the Columns visibility button",
  actionButtons: "Color for Save, Export, and other action buttons",
};
