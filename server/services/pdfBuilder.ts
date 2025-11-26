import PDFDocument from 'pdfkit';
import opentype from 'opentype.js';
import axios from 'axios';

// Font cache to avoid re-downloading
const fontCache: Map<string, opentype.Font> = new Map();

// System fonts mapping - these won't work with Google Fonts API
const SYSTEM_FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New'];

// In-flight promise cache to prevent duplicate requests
const fontPromiseCache: Map<string, Promise<opentype.Font | null>> = new Map();

async function loadGoogleFont(fontFamily: string): Promise<opentype.Font | null> {
  // Check cache first
  if (fontCache.has(fontFamily)) {
    return fontCache.get(fontFamily)!;
  }
  
  // Check if there's already an in-flight request for this font
  if (fontPromiseCache.has(fontFamily)) {
    return fontPromiseCache.get(fontFamily)!;
  }
  
  // System fonts can't be fetched - return null
  if (SYSTEM_FONTS.includes(fontFamily)) {
    return null;
  }
  
  // Create and cache the promise
  const promise = loadGoogleFontInternal(fontFamily);
  fontPromiseCache.set(fontFamily, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    // Clean up in-flight cache after resolution
    fontPromiseCache.delete(fontFamily);
  }
}

async function loadGoogleFontInternal(fontFamily: string): Promise<opentype.Font | null> {
  try {
    // Use an old user agent that makes Google serve TTF format
    // Modern browsers get WOFF2, but older Safari/IE get TTF
    const cssUrl = `https://fonts.googleapis.com/css?family=${encodeURIComponent(fontFamily.replace(/ /g, '+'))}:400,700`;
    
    const cssResponse = await axios.get(cssUrl, {
      headers: {
        // Old Safari user agent - Google serves TTF for this
        'User-Agent': 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; en-us) AppleWebKit/531.22.7 (KHTML, like Gecko) Version/4.0.5 Safari/531.22.7'
      }
    });
    
    const cssText = cssResponse.data as string;
    
    // Extract TTF URL - with old UA, Google returns TrueType format
    const urlMatch = cssText.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/);
    if (!urlMatch) {
      console.log(`Could not find TTF URL for ${fontFamily}, CSS response may be woff/woff2`);
      return null;
    }
    
    const fontUrl = urlMatch[1];
    console.log(`Loading TTF font for ${fontFamily}: ${fontUrl}`);
    
    // Download the TTF file
    const fontResponse = await axios.get(fontUrl, {
      responseType: 'arraybuffer'
    });
    
    // Parse with opentype.js (works with TTF and OTF)
    const fontBuffer = Buffer.from(fontResponse.data);
    const font = opentype.parse(fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength));
    
    // Cache for future use
    fontCache.set(fontFamily, font);
    
    return font;
  } catch (error) {
    console.error(`Failed to load font ${fontFamily}:`, error);
    return null;
  }
}

// Convert opentype path to PDFKit path commands
function drawTextAsVectors(
  doc: InstanceType<typeof PDFDocument>,
  font: opentype.Font,
  text: string,
  x: number,
  y: number,
  fontSize: number
): { width: number; height: number } {
  const path = font.getPath(text, 0, 0, fontSize);
  const bbox = path.getBoundingBox();
  
  // Calculate proper baseline using font metrics
  // ascender is typically positive (above baseline), descender negative (below)
  const scale = fontSize / font.unitsPerEm;
  const ascender = font.ascender * scale;
  
  // Move to starting position - ascender positions text correctly from top
  doc.save();
  doc.translate(x, y + ascender);
  
  // Convert path commands to PDFKit
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

export interface TextElement {
  id: string;
  type: 'text';
  content: string;
  font?: string;
  fontSize?: number;
  visualSize?: number;
  color?: string;
  cmyk?: string;
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
  return { c: 0, m: 0, y: 0, k: 100 };
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

function ptToMm(pt: number): number {
  return pt * 0.352778;
}

function mmToPt(mm: number): number {
  return mm / 0.352778;
}

export async function generateProjectSpecsPdf(data: ProjectExportData): Promise<Buffer> {
  // Pre-load all fonts before starting PDF generation
  const textElements = data.elements.filter(el => el.type === 'text' && el.visible !== false);
  const fontPromises = textElements.map(el => loadGoogleFont(el.font || 'Arial'));
  const preloadedFonts = await Promise.all(fontPromises);
  const fontMap = new Map<string, opentype.Font | null>();
  textElements.forEach((el, i) => {
    fontMap.set(el.id, preloadedFonts[i]);
  });
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `${data.projectName} - Label Specifications`,
        Author: data.projectEmail,
        Subject: 'Label Design Specifications with CMYK Colors',
        Creator: 'Label Designer'
      }
    });
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    const pageWidth = 595.28; // A4 width in points
    const pageHeight = 841.89; // A4 height in points
    const margin = mmToPt(15); // 15mm margin
    let yPos = margin;
    
    // Header
    doc.fontSize(20).font('Helvetica-Bold');
    doc.text('Label Project Specifications', margin, yPos);
    yPos += 28;
    
    doc.fontSize(10).font('Helvetica');
    doc.text(`Project: ${data.projectName}  |  Email: ${data.projectEmail}  |  Date: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 20;
    
    // Divider line
    doc.strokeColor('#cccccc').lineWidth(0.5);
    doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke();
    yPos += 15;
    
    // Side-by-side layout
    const contentWidth = pageWidth - margin * 2;
    const gapBetween = mmToPt(10);
    const halfWidth = (contentWidth - gapBetween) / 2;
    const leftX = margin;
    const rightX = margin + halfWidth + gapBetween;
    
    // Section headers
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Design Preview', leftX, yPos);
    doc.text('3D Mockup Preview', rightX, yPos);
    yPos += 15;
    
    const imageStartY = yPos;
    
    // Design Preview - exact 58×79mm (physical label size)
    const designWidthPt = mmToPt(58);
    const designHeightPt = mmToPt(79);
    
    if (data.designPng) {
      try {
        const imgData = data.designPng.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(imgData, 'base64');
        doc.image(imgBuffer, leftX, yPos, { 
          width: designWidthPt,
          height: designHeightPt
        });
      } catch (error) {
        console.error('Failed to add design image:', error);
      }
    }
    
    // 3D Mockup Preview - fit to available space
    if (data.mockupPng) {
      try {
        const imgData = data.mockupPng.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(imgData, 'base64');
        
        // Parse PNG dimensions
        let imgWidth = 400;
        let imgHeight = 500;
        if (imgBuffer.length > 24 && imgBuffer[0] === 0x89 && imgBuffer[1] === 0x50) {
          imgWidth = imgBuffer.readUInt32BE(16);
          imgHeight = imgBuffer.readUInt32BE(20);
        }
        
        const aspectRatio = imgWidth / imgHeight;
        let mockupWidth = halfWidth;
        let mockupHeight = mockupWidth / aspectRatio;
        
        if (mockupHeight > designHeightPt) {
          mockupHeight = designHeightPt;
          mockupWidth = mockupHeight * aspectRatio;
        }
        
        doc.image(imgBuffer, rightX, yPos, { 
          width: mockupWidth,
          height: mockupHeight
        });
      } catch (error) {
        console.error('Failed to add mockup image:', error);
      }
    }
    
    yPos = imageStartY + designHeightPt + 20;
    
    // Divider
    doc.strokeColor('#cccccc').lineWidth(0.5);
    doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke();
    yPos += 15;
    
    // Text Elements section header
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Text Elements (CMYK)', margin, yPos);
    yPos += 20;
    
    // Use the pre-filtered textElements from above
    if (textElements.length === 0) {
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#666666');
      doc.text('No text elements in design', margin, yPos);
      yPos += 15;
    } else {
      for (let i = 0; i < textElements.length; i++) {
        const element = textElements[i];
        const fontFamily = element.font || 'Arial';
        const visualSize = element.visualSize || (element.fontSize || 24) * element.scale;
        const cmykStr = element.cmyk || 'C: 0% M: 0% Y: 0% K: 100%';
        const cmyk = parseCmykString(cmykStr);
        const font = fontMap.get(element.id);
        
        // CMYK values normalized to 0-1 range for PDF operators
        const c = cmyk.c / 100;
        const m = cmyk.m / 100;
        const y = cmyk.y / 100;
        const k = cmyk.k / 100;
        
        // Use raw PDF operators for DeviceCMYK
        const cmykFillCmd = `${c.toFixed(3)} ${m.toFixed(3)} ${y.toFixed(3)} ${k.toFixed(3)} k`;
        
        const sampleFontSize = 14;
        
        if (font) {
          // Render as vector outlines using opentype.js
          (doc as any).addContent(cmykFillCmd);
          drawTextAsVectors(doc, font, element.content, margin, yPos, sampleFontSize);
          yPos += sampleFontSize + 8;
        } else {
          // Fallback to system font if Google Font not available
          doc.fontSize(sampleFontSize).font('Helvetica-Bold');
          (doc as any).addContent(cmykFillCmd);
          doc.text(element.content, margin, yPos);
          yPos += sampleFontSize + 8;
        }
        
        // Color swatch (CMYK)
        const swatchSize = 10;
        (doc as any).addContent(cmykFillCmd);
        doc.rect(margin, yPos, swatchSize, swatchSize).fill();
        
        // Specs line - note: Font rendered as vector outlines
        doc.fillColor('#666666');
        doc.fontSize(9).font('Helvetica');
        const vectorNote = font ? ' (vector)' : '';
        doc.text(
          `Font: ${fontFamily}${vectorNote}  |  Size: ${Math.round(visualSize)}px  |  ${cmykStr}`,
          margin + swatchSize + 8, 
          yPos + 2
        );
        yPos += swatchSize + 15;
      }
    }
    
    yPos += 10;
    
    // Footer divider
    doc.strokeColor('#cccccc').lineWidth(0.5);
    doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke();
    yPos += 15;
    
    // Footer
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#999999');
    doc.text('Generated by Label Designer', margin, yPos);
    yPos += 12;
    doc.text('Text elements use DeviceCMYK colorspace for accurate print reproduction.', margin, yPos);
    
    doc.end();
  });
}

export function generateSimpleTextPdf(
  projectName: string,
  projectEmail: string,
  textContent: string
): Buffer {
  const chunks: Buffer[] = [];
  
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50
  });
  
  doc.on('data', (chunk) => chunks.push(chunk));
  
  doc.fontSize(18).font('Helvetica-Bold');
  doc.text('Label Project', 50, 50);
  
  doc.fontSize(12).font('Helvetica');
  doc.text(`Project: ${projectName}`, 50, 85);
  doc.text(`Email: ${projectEmail}`, 50, 100);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 115);
  
  doc.text(textContent, 50, 145);
  
  doc.end();
  
  return Buffer.concat(chunks);
}
