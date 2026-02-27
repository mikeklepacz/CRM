import type {
  CylinderPos,
  LightingSettings,
  TextureMapping,
} from "@/components/product-mockup/product-mockup.types";

export const LABEL_WIDTH = 450;
export const LABEL_HEIGHT = 600;
export const OVERLAP_HEIGHT = 60;

export const DEFAULT_LIGHTING: LightingSettings = {
  ambient: 0.4,
  front: 3.2,
  top: 0.8,
  warmth: 0.15,
  keyAngle: 325,
  keyHeight: 30,
  keyDistance: 2.5,
};

export const DEFAULT_CYLINDER_POS: CylinderPos = {
  x: 0.0013,
  y: -0.0083,
  z: 0,
  scale: 1.02,
  cameraZ: 0.134,
  rotX: 180,
  rotY: -3.1,
};

export const DEFAULT_TEXTURE_MAPPING: TextureMapping = {
  offsetX: 0.131,
  offsetY: -0.502,
  rotation: 90,
  scaleX: 1,
  scaleY: 2.01,
  centerX: 0.499,
  centerY: 0.5,
};
