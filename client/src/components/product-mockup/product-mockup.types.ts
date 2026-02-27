import * as THREE from "three";

export interface ColorSwatch {
  id: string;
  color: string;
  cmyk: string;
}

export interface OriginalAsset {
  name: string;
  data: string;
  mimeType: string;
}

export interface CylinderPos {
  x: number;
  y: number;
  z: number;
  scale: number;
  cameraZ: number;
  rotX: number;
  rotY: number;
}

export interface TextureMapping {
  offsetX: number;
  offsetY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  centerX: number;
  centerY: number;
}

export interface LabelElement {
  id: string;
  type: "logo" | "text";
  x: number;
  y: number;
  rotation: number;
  scale: number;
  content: string;
  font?: string;
  fontSize?: number;
  color?: string;
  visible?: boolean;
  image?: HTMLImageElement;
  originalAsset?: OriginalAsset;
}

export interface ThreeContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cylinder: THREE.Mesh | null;
  geometry: THREE.BufferGeometry | null;
  material: THREE.MeshStandardMaterial | null;
  animationId: number;
  ambientLight: THREE.AmbientLight | null;
  frontLight: THREE.DirectionalLight | null;
  topLight: THREE.DirectionalLight | null;
}

export interface LightingSettings {
  ambient: number;
  front: number;
  top: number;
  warmth: number;
  keyAngle: number;
  keyHeight: number;
  keyDistance: number;
}
