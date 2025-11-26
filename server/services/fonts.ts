import opentype from 'opentype.js';

interface CachedFont {
  font: opentype.Font;
  loadedAt: number;
}

const fontCache = new Map<string, CachedFont>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const SYSTEM_FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New'];

export async function fetchGoogleFontUrl(fontFamily: string): Promise<string | null> {
  try {
    const encodedFamily = encodeURIComponent(fontFamily);
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@400&display=swap`;
    
    const response = await fetch(cssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch Google Fonts CSS for ${fontFamily}: ${response.status}`);
      return null;
    }
    
    const css = await response.text();
    
    const ttfMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/);
    if (ttfMatch) {
      return ttfMatch[1];
    }
    
    const woff2Match = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/);
    if (woff2Match) {
      return woff2Match[1];
    }
    
    console.error(`No TTF or WOFF2 URL found in CSS for ${fontFamily}`);
    return null;
  } catch (error) {
    console.error(`Error fetching Google Font URL for ${fontFamily}:`, error);
    return null;
  }
}

export async function loadFont(fontFamily: string): Promise<opentype.Font | null> {
  const cached = fontCache.get(fontFamily);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.font;
  }
  
  if (SYSTEM_FONTS.includes(fontFamily)) {
    console.log(`System font ${fontFamily} not loadable via opentype.js, will use fallback`);
    return null;
  }
  
  try {
    const fontUrl = await fetchGoogleFontUrl(fontFamily);
    if (!fontUrl) {
      return null;
    }
    
    const response = await fetch(fontUrl);
    if (!response.ok) {
      console.error(`Failed to download font file for ${fontFamily}: ${response.status}`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const font = opentype.parse(arrayBuffer);
    
    fontCache.set(fontFamily, {
      font,
      loadedAt: Date.now()
    });
    
    console.log(`Successfully loaded and cached font: ${fontFamily}`);
    return font;
  } catch (error) {
    console.error(`Error loading font ${fontFamily}:`, error);
    return null;
  }
}

export function getTextPath(
  font: opentype.Font,
  text: string,
  x: number,
  y: number,
  fontSize: number
): opentype.Path {
  return font.getPath(text, x, y, fontSize);
}

export interface PathCommand {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z';
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export function getPathCommands(path: opentype.Path): PathCommand[] {
  return path.commands as PathCommand[];
}

/**
 * Get SVG path data string from opentype.js path
 * This is the industry-standard intermediate format for vector graphics
 */
export function getTextSvgPathData(
  font: opentype.Font,
  text: string,
  x: number,
  y: number,
  fontSize: number
): string {
  const path = font.getPath(text, x, y, fontSize);
  // toPathData() returns just the 'd' attribute content (e.g., "M10 20 L30 40...")
  return path.toPathData(2); // 2 decimal places precision
}

/**
 * Parse SVG path 'd' attribute into path commands
 * Standard SVG path parsing for M, L, C, Q, Z commands
 */
export function parseSvgPathData(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  
  // Match commands: letter followed by optional numbers
  const regex = /([MLCQZ])\s*([-\d.,\s]*)/gi;
  let match;
  
  while ((match = regex.exec(d)) !== null) {
    const type = match[1].toUpperCase() as 'M' | 'L' | 'C' | 'Q' | 'Z';
    const nums = match[2].trim().split(/[\s,]+/).filter(n => n).map(Number);
    
    switch (type) {
      case 'M':
      case 'L':
        if (nums.length >= 2) {
          commands.push({ type, x: nums[0], y: nums[1] });
        }
        break;
      case 'Q':
        if (nums.length >= 4) {
          commands.push({ type, x1: nums[0], y1: nums[1], x: nums[2], y: nums[3] });
        }
        break;
      case 'C':
        if (nums.length >= 6) {
          commands.push({ type, x1: nums[0], y1: nums[1], x2: nums[2], y2: nums[3], x: nums[4], y: nums[5] });
        }
        break;
      case 'Z':
        commands.push({ type });
        break;
    }
  }
  
  return commands;
}

export function isSystemFont(fontFamily: string): boolean {
  return SYSTEM_FONTS.includes(fontFamily);
}

export function clearFontCache(): void {
  fontCache.clear();
}

export function getFontCacheSize(): number {
  return fontCache.size;
}
