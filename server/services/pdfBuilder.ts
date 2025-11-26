import { jsPDF } from 'jspdf';
import { loadFont, getTextPath, getPathCommands, isSystemFont, type PathCommand } from './fonts';

export interface TextElement {
  id: string;
  type: 'text';
  content: string;
  font?: string;
  fontSize?: number;
  color?: string;
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
  const pageHeight = 297;
  const margin = 15;
  let yPos = margin;
  
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Label Project Specifications', margin, yPos);
  yPos += 12;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${data.projectName}`, margin, yPos);
  yPos += 6;
  doc.text(`Email: ${data.projectEmail}`, margin, yPos);
  yPos += 6;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPos);
  yPos += 12;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Design Preview', margin, yPos);
  yPos += 8;
  
  if (data.designPng) {
    try {
      const imgData = data.designPng.startsWith('data:') 
        ? data.designPng 
        : `data:image/png;base64,${data.designPng}`;
      
      const maxWidth = 80;
      const maxHeight = 100;
      
      doc.addImage(imgData, 'PNG', margin, yPos, maxWidth, maxHeight);
      yPos += maxHeight + 10;
    } catch (error) {
      console.error('Failed to add design image to PDF:', error);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('[Design image could not be embedded]', margin, yPos);
      yPos += 8;
    }
  }
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('3D Mockup Preview', margin, yPos);
  yPos += 8;
  
  if (data.mockupPng) {
    try {
      const imgData = data.mockupPng.startsWith('data:') 
        ? data.mockupPng 
        : `data:image/png;base64,${data.mockupPng}`;
      
      const maxWidth = 80;
      const maxHeight = 80;
      
      doc.addImage(imgData, 'PNG', margin, yPos, maxWidth, maxHeight);
      yPos += maxHeight + 10;
    } catch (error) {
      console.error('Failed to add mockup image to PDF:', error);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('[Mockup image could not be embedded]', margin, yPos);
      yPos += 8;
    }
  }
  
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = margin;
  }
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Text Elements', margin, yPos);
  yPos += 8;
  
  const textElements = data.elements.filter(el => el.type === 'text' && el.visible !== false);
  
  if (textElements.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No text elements in design', margin, yPos);
    yPos += 8;
  } else {
    for (const element of textElements) {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;
      }
      
      const fontFamily = element.font || 'Arial';
      const fontSize = element.fontSize || 24;
      const color = parseColorToRgb(element.color || '#000000');
      
      let usedVectorPath = false;
      
      if (!isSystemFont(fontFamily)) {
        try {
          const font = await loadFont(fontFamily);
          if (font) {
            const pdfFontSize = fontSize * 0.3;
            const path = getTextPath(font, element.content, 0, 0, pdfFontSize);
            const commands = getPathCommands(path);
            
            if (commands.length > 0) {
              drawPathOnPdf(doc, commands, margin, yPos + pdfFontSize, 1, color);
              usedVectorPath = true;
              
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(128, 128, 128);
              doc.text(`Font: ${fontFamily}, Size: ${fontSize}pt`, margin + 100, yPos + pdfFontSize/2);
              doc.setTextColor(0, 0, 0);
              
              yPos += pdfFontSize + 8;
            }
          }
        } catch (error) {
          console.warn(`Could not render vector path for ${fontFamily}:`, error);
        }
      }
      
      if (!usedVectorPath) {
        doc.setFontSize(Math.min(fontSize * 0.5, 14));
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(color.r, color.g, color.b);
        doc.text(element.content, margin, yPos);
        doc.setTextColor(0, 0, 0);
        
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`  (${fontFamily}, ${fontSize}pt)`, margin + doc.getTextWidth(element.content) + 2, yPos);
        doc.setTextColor(0, 0, 0);
        
        yPos += 8;
      }
    }
  }
  
  yPos += 10;
  
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CMYK Color Swatches', margin, yPos);
  yPos += 8;
  
  if (data.savedSwatches.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No saved color swatches', margin, yPos);
    yPos += 8;
  } else {
    const swatchSize = 15;
    const swatchesPerRow = 4;
    const swatchSpacing = 45;
    
    for (let i = 0; i < data.savedSwatches.length; i++) {
      const swatch = data.savedSwatches[i];
      const row = Math.floor(i / swatchesPerRow);
      const col = i % swatchesPerRow;
      
      const xPos = margin + col * swatchSpacing;
      const swatchY = yPos + row * (swatchSize + 15);
      
      if (swatchY > pageHeight - 30) {
        doc.addPage();
        yPos = margin;
        continue;
      }
      
      const cmyk = parseCmykString(swatch.cmyk);
      const rgb = cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k);
      
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.setDrawColor(0, 0, 0);
      doc.rect(xPos, swatchY, swatchSize, swatchSize, 'FD');
      
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      const cmykLabel = `C${cmyk.c} M${cmyk.m} Y${cmyk.y} K${cmyk.k}`;
      doc.text(cmykLabel, xPos, swatchY + swatchSize + 4);
    }
    
    const totalRows = Math.ceil(data.savedSwatches.length / swatchesPerRow);
    yPos += totalRows * (swatchSize + 15) + 10;
  }
  
  yPos += 10;
  
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = margin;
  }
  
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
