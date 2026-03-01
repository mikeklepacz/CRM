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
