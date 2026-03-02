export function parseCmykString(cmykStr: string): { c: number; m: number; y: number; k: number } {
  const match = cmykStr.match(/C:\s*(\d+)%\s*M:\s*(\d+)%\s*Y:\s*(\d+)%\s*K:\s*(\d+)%/i);
  if (match) {
    return {
      c: parseInt(match[1], 10),
      m: parseInt(match[2], 10),
      y: parseInt(match[3], 10),
      k: parseInt(match[4], 10)
    };
  }
  return { c: 0, m: 0, y: 0, k: 100 };
}

export function cmykToRgb(c: number, m: number, y: number, k: number): { r: number; g: number; b: number } {
  const cFrac = c / 100;
  const mFrac = m / 100;
  const yFrac = y / 100;
  const kFrac = k / 100;

  const r = Math.round(255 * (1 - cFrac) * (1 - kFrac));
  const g = Math.round(255 * (1 - mFrac) * (1 - kFrac));
  const b = Math.round(255 * (1 - yFrac) * (1 - kFrac));

  return { r, g, b };
}

export function ptToMm(pt: number): number {
  return pt * 0.352778;
}

export function mmToPt(mm: number): number {
  return mm / 0.352778;
}
