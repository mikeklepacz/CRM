import { jsPDF } from 'jspdf';
import { loadFont, getTextSvgPathData, parseSvgPathData, isSystemFont, type PathCommand } from './fonts';

export interface TextElement {
  id: string;
  type: 'text';
  content: string;
  font?: string;
  fontSize?: number;
  visualSize?: number; // Calculated as fontSize × scale
  color?: string;
  cmyk?: string; // CMYK color string for print
  x: number;
  y: number;
  rotation: number;
  scale: number;
  visible?: boolean;
}

export interface ColorSwatch {
  id: string;
  color: string;
  cmyk: string;
}

export interface ProjectExportData {
  projectName: string;
  projectEmail: string;
  designPng: string;
  mockupPng: string;
  elements: TextElement[];
  savedSwatches: ColorSwatch[];
}

function parseCmykString(cmykStr: string): { c: number; m: number; y: number; k: number } {
  const match = cmykStr.match(/C:\s*(\d+)%\s*M:\s*(\d+)%\s*Y:\s*(\d+)%\s*K:\s*(\d+)%/i);
  if (match) {
    return {
      c: parseInt(match[1], 10),
      m: parseInt(match[2], 10),
      y: parseInt(match[3], 10),
      k: parseInt(match[4], 10)
    };
  }
  return { c: 0, m: 0, y: 0, k: 0 };
}

function cmykToRgb(c: number, m: number, y: number, k: number): { r: number; g: number; b: number } {
  const cFrac = c / 100;
  const mFrac = m / 100;
  const yFrac = y / 100;
  const kFrac = k / 100;
  
  const r = Math.round(255 * (1 - cFrac) * (1 - kFrac));
  const g = Math.round(255 * (1 - mFrac) * (1 - kFrac));
  const b = Math.round(255 * (1 - yFrac) * (1 - kFrac));
  
  return { r, g, b };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function parseColorToRgb(colorStr: string): { r: number; g: number; b: number } {
  if (!colorStr) return { r: 0, g: 0, b: 0 };
  
  colorStr = colorStr.trim();
  
  if (colorStr.startsWith('#')) {
    return hexToRgb(colorStr);
  }
  
  const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10),
      g: parseInt(rgbaMatch[2], 10),
      b: parseInt(rgbaMatch[3], 10)
    };
  }
  
  return { r: 0, g: 0, b: 0 };
}

function drawPathOnPdf(
  doc: jsPDF,
  commands: PathCommand[],
  offsetX: number,
  offsetY: number,
  scale: number,
  color: { r: number; g: number; b: number }
): void {
  doc.setFillColor(color.r, color.g, color.b);
  doc.setDrawColor(color.r, color.g, color.b);
  
  let pathData = '';
  
  // Pre-scan to find initial position from first M command (paths should always start with M)
  // This ensures we have valid coordinates even for defensive edge case handling
  let initialX = 0;
  let initialY = 0;
  for (const cmd of commands) {
    if (cmd.type === 'M' && cmd.x !== undefined && cmd.y !== undefined) {
      initialX = cmd.x;
      initialY = cmd.y;
      break;
    }
  }
  
  // Track current position for proper quadratic-to-cubic Bézier conversion
  let currentX = initialX;
  let currentY = initialY;
  let startX = initialX;
  let startY = initialY;
  
  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        if (cmd.x !== undefined && cmd.y !== undefined) {
          currentX = cmd.x;
          currentY = cmd.y;
          startX = cmd.x;
          startY = cmd.y;
          pathData += `${(cmd.x * scale + offsetX).toFixed(2)} ${(cmd.y * scale + offsetY).toFixed(2)} m `;
        }
        break;
      case 'L':
        if (cmd.x !== undefined && cmd.y !== undefined) {
          currentX = cmd.x;
          currentY = cmd.y;
          pathData += `${(cmd.x * scale + offsetX).toFixed(2)} ${(cmd.y * scale + offsetY).toFixed(2)} l `;
        }
        break;
      case 'C':
        if (cmd.x1 !== undefined && cmd.y1 !== undefined && 
            cmd.x2 !== undefined && cmd.y2 !== undefined &&
            cmd.x !== undefined && cmd.y !== undefined) {
          currentX = cmd.x;
          currentY = cmd.y;
          pathData += `${(cmd.x1 * scale + offsetX).toFixed(2)} ${(cmd.y1 * scale + offsetY).toFixed(2)} ` +
                      `${(cmd.x2 * scale + offsetX).toFixed(2)} ${(cmd.y2 * scale + offsetY).toFixed(2)} ` +
                      `${(cmd.x * scale + offsetX).toFixed(2)} ${(cmd.y * scale + offsetY).toFixed(2)} c `;
        }
        break;
      case 'Q':
        // Convert quadratic Bézier to cubic Bézier using current position
        // Quadratic: P0, P1 (control), P2 (end)
        // Cubic: P0, CP1 = P0 + 2/3*(P1-P0), CP2 = P2 + 2/3*(P1-P2), P2
        if (cmd.x1 !== undefined && cmd.y1 !== undefined &&
            cmd.x !== undefined && cmd.y !== undefined) {
          // Current position is P0 (start point)
          const x0 = currentX;
          const y0 = currentY;
          // Control point P1
          const qx = cmd.x1;
          const qy = cmd.y1;
          // End point P2
          const x2 = cmd.x;
          const y2 = cmd.y;
          
          // Calculate cubic control points
          const cx1 = x0 + (2/3) * (qx - x0);
          const cy1 = y0 + (2/3) * (qy - y0);
          const cx2 = x2 + (2/3) * (qx - x2);
          const cy2 = y2 + (2/3) * (qy - y2);
          
          currentX = x2;
          currentY = y2;
          
          pathData += `${(cx1 * scale + offsetX).toFixed(2)} ${(cy1 * scale + offsetY).toFixed(2)} ` +
                      `${(cx2 * scale + offsetX).toFixed(2)} ${(cy2 * scale + offsetY).toFixed(2)} ` +
                      `${(x2 * scale + offsetX).toFixed(2)} ${(y2 * scale + offsetY).toFixed(2)} c `;
        }
        break;
      case 'Z':
        currentX = startX;
        currentY = startY;
        pathData += 'h ';
        break;
    }
  }
  
  if (pathData) {
    try {
      (doc as any).internal.write(pathData + 'f');
    } catch (e) {
      console.warn('Failed to write path data directly, falling back to simple text');
    }
  }
}

export async function generateProjectSpecsPdf(data: ProjectExportData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = 210;
  const margin = 15;
  let yPos = margin;
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Label Project Specifications', margin, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${data.projectName}  |  Email: ${data.projectEmail}  |  Date: ${new Date().toLocaleDateString()}`, margin, yPos);
  yPos += 8;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;
  
  // Side-by-side images
  const contentWidth = pageWidth - margin * 2;
  const halfWidth = (contentWidth - 10) / 2; // 10mm gap between images
  const leftX = margin;
  const rightX = margin + halfWidth + 10;
  
  // Design Preview (left side) - 3:4 ratio
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Design Preview', leftX, yPos);
  doc.text('3D Mockup Preview', rightX, yPos);
  yPos += 5;
  
  const designWidth = halfWidth;
  const designHeight = designWidth * (4/3); // 3:4 aspect ratio
  
  if (data.designPng) {
    try {
      const imgData = data.designPng.startsWith('data:') 
        ? data.designPng 
        : `data:image/png;base64,${data.designPng}`;
      doc.addImage(imgData, 'PNG', leftX, yPos, designWidth, designHeight);
    } catch (error) {
      console.error('Failed to add design image to PDF:', error);
    }
  }
  
  // 3D Mockup Preview (right side) - preserve aspect ratio
  if (data.mockupPng) {
    try {
      const imgData = data.mockupPng.startsWith('data:') 
        ? data.mockupPng 
        : `data:image/png;base64,${data.mockupPng}`;
      
      // Parse PNG dimensions to preserve aspect ratio
      const base64Data = data.mockupPng.replace(/^data:image\/\w+;base64,/, '');
      const pngBuffer = Buffer.from(base64Data, 'base64');
      
      let imgWidth = 400;
      let imgHeight = 500;
      if (pngBuffer.length > 24 && pngBuffer[0] === 0x89 && pngBuffer[1] === 0x50) {
        imgWidth = pngBuffer.readUInt32BE(16);
        imgHeight = pngBuffer.readUInt32BE(20);
      }
      
      const aspectRatio = imgWidth / imgHeight;
      let mockupWidth = halfWidth;
      let mockupHeight = mockupWidth / aspectRatio;
      
      // If mockup would be taller than design, constrain by height
      if (mockupHeight > designHeight) {
        mockupHeight = designHeight;
        mockupWidth = mockupHeight * aspectRatio;
      }
      
      doc.addImage(imgData, 'PNG', rightX, yPos, mockupWidth, mockupHeight);
    } catch (error) {
      console.error('Failed to add mockup image to PDF:', error);
    }
  }
  
  yPos += designHeight + 8;
  
  // Text Elements section with vector text rendering
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Text Elements', margin, yPos);
  yPos += 6;
  
  const textElements = data.elements.filter(el => el.type === 'text' && el.visible !== false);
  
  if (textElements.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('No text elements in design', margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 6;
  } else {
    for (const element of textElements) {
      const fontFamily = element.font || 'Arial';
      const visualSize = element.visualSize || (element.fontSize || 24) * element.scale;
      const color = parseColorToRgb(element.color || '#000000');
      const cmykStr = element.cmyk || 'C: 0% M: 0% Y: 0% K: 100%';
      
      // Render the actual text at visual size (scaled to fit PDF)
      // Convert pixel size to mm (roughly 1pt = 0.35mm, but adjust for screen)
      const pdfFontSize = Math.min(visualSize * 0.5, 36); // Cap at 36pt for PDF
      
      doc.setFontSize(pdfFontSize);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(color.r, color.g, color.b);
      doc.text(element.content, margin, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += pdfFontSize * 0.4 + 2;
      
      // Font specs on same line
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      
      // Color swatch
      const swatchSize = 3;
      doc.setFillColor(color.r, color.g, color.b);
      doc.setDrawColor(150, 150, 150);
      doc.rect(margin, yPos - 2.5, swatchSize, swatchSize, 'FD');
      
      doc.text(`${fontFamily}  |  ${Math.round(visualSize)}pt  |  ${cmykStr}`, margin + swatchSize + 2, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 8;
    }
  }
  
  yPos += 4;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Generated by Label Designer', margin, yPos);
  yPos += 5;
  doc.text('For print production, refer to the design.png file for accurate colors and layout.', margin, yPos);
  doc.setTextColor(0, 0, 0);
  
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

export function generateSimpleTextPdf(
  projectName: string,
  projectEmail: string,
  textContent: string
): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Label Project', 15, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${projectName}`, 15, 35);
  doc.text(`Email: ${projectEmail}`, 15, 42);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 49);
  
  doc.text(textContent, 15, 65);
  
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}
