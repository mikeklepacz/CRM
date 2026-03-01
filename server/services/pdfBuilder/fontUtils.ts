import PDFDocument from 'pdfkit';
import opentype from 'opentype.js';
import axios from 'axios';

const fontCache: Map<string, opentype.Font> = new Map();
const SYSTEM_FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New'];
const fontPromiseCache: Map<string, Promise<opentype.Font | null>> = new Map();

export async function loadGoogleFont(fontFamily: string): Promise<opentype.Font | null> {
  if (fontCache.has(fontFamily)) {
    return fontCache.get(fontFamily)!;
  }

  if (fontPromiseCache.has(fontFamily)) {
    return fontPromiseCache.get(fontFamily)!;
  }

  if (SYSTEM_FONTS.includes(fontFamily)) {
    return null;
  }

  const promise = loadGoogleFontInternal(fontFamily);
  fontPromiseCache.set(fontFamily, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    fontPromiseCache.delete(fontFamily);
  }
}

async function loadGoogleFontInternal(fontFamily: string): Promise<opentype.Font | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css?family=${encodeURIComponent(fontFamily.replace(/ /g, '+'))}:400,700`;

    const cssResponse = await axios.get(cssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; en-us) AppleWebKit/531.22.7 (KHTML, like Gecko) Version/4.0.5 Safari/531.22.7'
      }
    });

    const cssText = cssResponse.data as string;
    const urlMatch = cssText.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/);
    if (!urlMatch) {
      console.log(`Could not find TTF URL for ${fontFamily}, CSS response may be woff/woff2`);
      return null;
    }

    const fontUrl = urlMatch[1];
    console.log(`Loading TTF font for ${fontFamily}: ${fontUrl}`);

    const fontResponse = await axios.get(fontUrl, {
      responseType: 'arraybuffer'
    });

    const fontBuffer = Buffer.from(fontResponse.data);
    const font = opentype.parse(fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength));

    fontCache.set(fontFamily, font);

    return font;
  } catch (error) {
    console.error(`Failed to load font ${fontFamily}:`, error);
    return null;
  }
}

export function drawTextAsVectors(
  doc: InstanceType<typeof PDFDocument>,
  font: opentype.Font,
  text: string,
  x: number,
  y: number,
  fontSize: number
): { width: number; height: number } {
  const path = font.getPath(text, 0, 0, fontSize);
  const bbox = path.getBoundingBox();

  const scale = fontSize / font.unitsPerEm;
  const ascender = font.ascender * scale;

  doc.save();
  doc.translate(x, y + ascender);

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        doc.moveTo(cmd.x!, cmd.y!);
        break;
      case 'L':
        doc.lineTo(cmd.x!, cmd.y!);
        break;
      case 'C':
        doc.bezierCurveTo(cmd.x1!, cmd.y1!, cmd.x2!, cmd.y2!, cmd.x!, cmd.y!);
        break;
      case 'Q':
        doc.quadraticCurveTo(cmd.x1!, cmd.y1!, cmd.x!, cmd.y!);
        break;
      case 'Z':
        doc.closePath();
        break;
    }
  }

  doc.fill();
  doc.restore();

  return {
    width: bbox.x2 - bbox.x1,
    height: bbox.y2 - bbox.y1
  };
}
