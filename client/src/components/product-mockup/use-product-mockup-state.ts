import { useState } from "react";
import { DEFAULT_LIGHTING } from "@/components/product-mockup/product-mockup-constants";
import { areProductMockupFontsPreloaded } from "@/components/product-mockup/product-mockup-fonts";
import type {
  ColorSwatch,
  CylinderPos,
  LabelElement,
  LightingSettings,
  OriginalAsset,
  TextureMapping,
} from "@/components/product-mockup/product-mockup.types";
import { DEFAULT_CYLINDER_POS, DEFAULT_TEXTURE_MAPPING } from "@/components/product-mockup/product-mockup-constants";

export function useProductMockupState() {
  const [elements, setElements] = useState<LabelElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewRotation, setViewRotation] = useState(115);
  const [labelRotation, setLabelRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const [cylinderLoaded, setCylinderLoaded] = useState(false);

  const [cylinderPos, setCylinderPos] = useState<CylinderPos>(DEFAULT_CYLINDER_POS);
  const [positionLocked, setPositionLocked] = useState(true);
  const [textureMapping, setTextureMapping] = useState<TextureMapping>(DEFAULT_TEXTURE_MAPPING);
  const [textureMappingLocked, setTextureMappingLocked] = useState(true);
  const [showBleedOverlay, setShowBleedOverlay] = useState(true);
  const [bleedOverlayLoaded, setBleedOverlayLoaded] = useState(false);
  const [showKraftEffect, setShowKraftEffect] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(areProductMockupFontsPreloaded());

  const [projectName, setProjectName] = useState<string>(() => localStorage.getItem("labelDesigner_projectName") || "");
  const [projectEmail, setProjectEmail] = useState<string>(() => localStorage.getItem("labelDesigner_projectEmail") || "");
  const [showProjectOverlay, setShowProjectOverlay] = useState(() => {
    const name = localStorage.getItem("labelDesigner_projectName");
    const email = localStorage.getItem("labelDesigner_projectEmail");
    return !name || !email;
  });
  const [tempProjectName, setTempProjectName] = useState("");
  const [tempProjectEmail, setTempProjectEmail] = useState("");

  const [savedSwatches, setSavedSwatches] = useState<ColorSwatch[]>([]);
  const [originalAssets, setOriginalAssets] = useState<OriginalAsset[]>([]);
  const [lighting, setLighting] = useState<LightingSettings>({ ...DEFAULT_LIGHTING });
  const [isExporting, setIsExporting] = useState(false);

  return {
    elements,
    selectedId,
    viewRotation,
    labelRotation,
    isDragging,
    isResizing,
    resizeCorner,
    dragOffset,
    dragStartPos,
    isAltPressed,
    hoveredHandle,
    cylinderLoaded,
    cylinderPos,
    positionLocked,
    textureMapping,
    textureMappingLocked,
    showBleedOverlay,
    bleedOverlayLoaded,
    showKraftEffect,
    fontsLoaded,
    projectName,
    projectEmail,
    showProjectOverlay,
    tempProjectName,
    tempProjectEmail,
    savedSwatches,
    originalAssets,
    lighting,
    isExporting,
    setElements,
    setSelectedId,
    setViewRotation,
    setLabelRotation,
    setIsDragging,
    setIsResizing,
    setResizeCorner,
    setDragOffset,
    setDragStartPos,
    setIsAltPressed,
    setHoveredHandle,
    setCylinderLoaded,
    setCylinderPos,
    setPositionLocked,
    setTextureMapping,
    setTextureMappingLocked,
    setShowBleedOverlay,
    setBleedOverlayLoaded,
    setShowKraftEffect,
    setFontsLoaded,
    setProjectName,
    setProjectEmail,
    setShowProjectOverlay,
    setTempProjectName,
    setTempProjectEmail,
    setSavedSwatches,
    setOriginalAssets,
    setLighting,
    setIsExporting,
  };
}
