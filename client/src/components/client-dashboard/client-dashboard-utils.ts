export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

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
}

export function hslToHex(h: number, s: number, l: number): string {
  s = s / 100;
  l = l / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function parseHsl(hslString: string): { h: number; s: number; l: number } {
  const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (match) {
    return { h: parseInt(match[1]), s: parseInt(match[2]), l: parseInt(match[3]) };
  }

  return hexToHsl(hslString);
}

export function hslToString(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export function lightenColor(color: string, percent: number): string {
  const hsl = parseHsl(color);
  const newL = Math.min(100, hsl.l + (100 - hsl.l) * (percent / 100));
  return hslToString(hsl.h, hsl.s, newL);
}

export function extractDomain(url: string): string {
  if (!url) return "";

  try {
    const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
    const urlObj = new URL(urlWithProtocol);
    return urlObj.hostname.replace("www.", "");
  } catch {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\?]+)/i);
    return match ? match[1] : url;
  }
}

export function formatHours(value: string): string {
  if (!value) return "";

  try {
    const hours = JSON.parse(value);
    if (typeof hours !== "object") return value;

    const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const dayAbbrev: Record<string, string> = {
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
      sunday: "Sun",
    };

    const groups: { days: string[]; hours: string }[] = [];
    let currentGroup: { days: string[]; hours: string } | null = null;

    dayOrder.forEach((day) => {
      const dayHours = hours[day] || hours[day.toLowerCase()];
      if (!dayHours) return;

      if (!currentGroup || currentGroup.hours !== dayHours) {
        currentGroup = { days: [day], hours: dayHours };
        groups.push(currentGroup);
      } else {
        currentGroup.days.push(day);
      }
    });

    return groups.map((group) => {
      if (group.days.length === 1) {
        return `${dayAbbrev[group.days[0]]}: ${group.hours}`;
      }

      const first = dayAbbrev[group.days[0]];
      const last = dayAbbrev[group.days[group.days.length - 1]];
      return `${first}-${last}: ${group.hours}`;
    }).join(" • ");
  } catch {
    return value;
  }
}
