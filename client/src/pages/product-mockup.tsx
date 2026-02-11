import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Download, Upload, RotateCcw, Move, Palette, Plus, Minus, Trash2, Eye, EyeOff, Layers, ChevronUp, ChevronDown, ArrowLeftToLine, ArrowRightToLine, ArrowUpToLine, ArrowDownToLine, Type, Check, ChevronsUpDown, Loader2, Save, X, Sun } from 'lucide-react';
import ColorPicker, { useColorPicker } from '@/vendor/react-best-gradient-color-picker';
import { useToast } from '@/hooks/use-toast';
import hempClearUrl from '@assets/Hemp-Clear_1764119084551.png';
import bleedOverlayUrl from '@assets/Red Bleed_1764176822191.png';

// Simple line icons for center alignment
const CenterVerticalLine = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="8" y1="2" x2="8" y2="14" />
  </svg>
);

const CenterHorizontalLine = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="2" y1="8" x2="14" y2="8" />
  </svg>
);

// Saved color swatch interface
interface ColorSwatch {
  id: string;
  color: string;
  cmyk: string;
}

// Original asset data for export
interface OriginalAsset {
  name: string;
  data: string; // base64
  mimeType: string;
}

interface CylinderPos {
  x: number;
  y: number;
  z: number;
  scale: number;
  cameraZ: number;
  rotX: number;
  rotY: number;
}

interface TextureMapping {
  offsetX: number;
  offsetY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  centerX: number;
  centerY: number;
}

const LABEL_WIDTH = 450;  // 3:4 ratio (60mm wide)
const LABEL_HEIGHT = 600; // 3:4 ratio (80mm tall)
const OVERLAP_HEIGHT = 60;

// CMYK Color Picker Component
function CMYKColorPicker({ 
  color, 
  onChange,
  savedSwatches = [],
  onSaveSwatch,
  onUseSwatch,
  onRemoveSwatch
}: { 
  color: string; 
  onChange: (color: string) => void;
  savedSwatches?: ColorSwatch[];
  onSaveSwatch?: (color: string, cmyk: string) => void;
  onUseSwatch?: (color: string) => void;
  onRemoveSwatch?: (id: string) => void;
}) {
  const [localColor, setLocalColor] = useState(color);
  const { valueToCmyk } = useColorPicker(localColor, setLocalColor);
  
  useEffect(() => {
    setLocalColor(color);
  }, [color]);
  
  const handleChange = (newColor: string) => {
    setLocalColor(newColor);
    onChange(newColor);
  };
  
  // Parse CMYK values and convert to clean percentages
  const cmykRaw = valueToCmyk();
  const cmykMatch = cmykRaw.match(/cmyk\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  const formatCmyk = () => {
    if (!cmykMatch) return 'C: 0%  M: 0%  Y: 0%  K: 0%';
    const c = Math.round(parseFloat(cmykMatch[1]) * 100);
    const m = Math.round(parseFloat(cmykMatch[2]) * 100);
    const y = Math.round(parseFloat(cmykMatch[3]) * 100);
    const k = Math.round(parseFloat(cmykMatch[4]) * 100);
    return `C: ${c}%  M: ${m}%  Y: ${y}%  K: ${k}%`;
  };
  
  const cmykString = formatCmyk();
  
  return (
    <div className="space-y-3">
      <ColorPicker
        value={localColor}
        onChange={handleChange}
        hideColorTypeBtns
        hideAdvancedSliders
        hidePresets
        hideOpacity
        width={220}
        height={150}
      />
      <div className="p-2 bg-muted rounded text-xs font-mono">
        <div className="text-muted-foreground mb-1">CMYK for Print:</div>
        <div className="text-foreground font-medium">{cmykString}</div>
      </div>
      
      {onSaveSwatch && (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => onSaveSwatch(localColor, cmykString)}
          data-testid="button-save-swatch"
        >
          <Plus className="w-3 h-3 mr-1" />
          Save to Swatches
        </Button>
      )}
      
      {savedSwatches.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Saved Swatches:</div>
          <div className="flex flex-wrap gap-1">
            {savedSwatches.map((swatch) => (
              <div key={swatch.id} className="relative group">
                <button
                  className="w-6 h-6 rounded border border-border cursor-pointer hover:ring-2 hover:ring-primary"
                  style={{ backgroundColor: swatch.color }}
                  onClick={() => onUseSwatch?.(swatch.color)}
                  title={swatch.cmyk}
                  data-testid={`swatch-${swatch.id}`}
                />
                {onRemoveSwatch && (
                  <button
                    className="absolute -top-1 -right-1 w-3 h-3 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSwatch(swatch.id);
                    }}
                  >
                    <X className="w-2 h-2" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Popular Google Fonts for print and web - comprehensive list
const GOOGLE_FONTS = [
  // Sans-Serif
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Inter', 'Nunito', 'Raleway',
  'Ubuntu', 'Rubik', 'Work Sans', 'Noto Sans', 'Quicksand', 'Karla', 'Mulish', 'Josefin Sans',
  'Source Sans Pro', 'Barlow', 'DM Sans', 'Manrope', 'Outfit', 'Plus Jakarta Sans',
  'Public Sans', 'Be Vietnam Pro', 'Figtree', 'Lexend', 'Sora', 'Space Grotesk',
  'Albert Sans', 'Urbanist', 'Geologica', 'Instrument Sans',
  // Serif
  'Playfair Display', 'Merriweather', 'Lora', 'PT Serif', 'Libre Baskerville',
  'Crimson Text', 'Cormorant Garamond', 'EB Garamond', 'Spectral', 'Source Serif Pro',
  'Noto Serif', 'Bitter', 'Vollkorn', 'Cardo', 'Libre Caslon Text', 'DM Serif Display',
  'Fraunces', 'Bodoni Moda', 'Newsreader', 'Literata',
  // Display
  'Oswald', 'Bebas Neue', 'Anton', 'Archivo Black', 'Russo One', 'Righteous',
  'Alfa Slab One', 'Abril Fatface', 'Lobster', 'Pacifico', 'Permanent Marker',
  'Bangers', 'Fredoka One', 'Passion One', 'Bungee', 'Titan One', 'Black Ops One',
  'Monoton', 'Audiowide', 'Orbitron', 'Staatliches', 'Teko', 'Chakra Petch',
  // Handwritten
  'Dancing Script', 'Great Vibes', 'Parisienne', 'Sacramento', 'Satisfy', 'Allura',
  'Cookie', 'Kaushan Script', 'Alex Brush', 'Tangerine', 'Mr Dafoe', 'Pinyon Script',
  'Yellowtail', 'Courgette', 'Caveat', 'Indie Flower', 'Shadows Into Light',
  // Monospace
  'Roboto Mono', 'Source Code Pro', 'Fira Code', 'JetBrains Mono', 'IBM Plex Mono',
  'Space Mono', 'Inconsolata', 'Ubuntu Mono', 'Overpass Mono',
  // System Fallbacks
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New',
].sort();

// System fonts that don't need loading
const SYSTEM_FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New'];

// Track loaded fonts globally
const loadedFonts = new Set<string>(SYSTEM_FONTS);
let fontsPreloaded = false;

// Preload all Google Fonts at once using a single request
function preloadAllFonts(): Promise<void> {
  if (fontsPreloaded) return Promise.resolve();
  
  const googleFonts = GOOGLE_FONTS.filter(f => !SYSTEM_FONTS.includes(f));
  const fontFamilies = googleFonts.map(f => `family=${encodeURIComponent(f.replace(/ /g, '+'))}:wght@400;700`).join('&');
  
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;
    link.rel = 'stylesheet';
    link.onload = () => {
      googleFonts.forEach(f => loadedFonts.add(f));
      fontsPreloaded = true;
      resolve();
    };
    link.onerror = () => {
      // Even if there's an error, mark as loaded to prevent blocking
      fontsPreloaded = true;
      resolve();
    };
    document.head.appendChild(link);
  });
}

interface LabelElement {
  id: string;
  type: 'logo' | 'text';
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
  originalAsset?: OriginalAsset; // Store original upload for export
}

interface ThreeContext {
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

interface LightingSettings {
  ambient: number;
  front: number;
  top: number;
  warmth: number; // -1 = cool (blue tint), 0 = neutral, 1 = warm (yellow tint)
  keyAngle: number; // Horizontal angle of key light (0-360 degrees)
  keyHeight: number; // Vertical angle/height of key light (-90 to 90 degrees)
  keyDistance: number; // Distance of key light from center
}

const DEFAULT_LIGHTING: LightingSettings = {
  ambient: 0.4,
  front: 3.2,
  top: 0.8,
  warmth: 0.15,
  keyAngle: 325,
  keyHeight: 30,
  keyDistance: 2.5,
};

// PERMANENT DEFAULTS - These are the "in stone" settings for the 3D product mockup
const DEFAULT_CYLINDER_POS: CylinderPos = { 
  x: 0.0013, 
  y: -0.0083, 
  z: 0, 
  scale: 1.02, 
  cameraZ: 0.134, 
  rotX: 180, 
  rotY: -3.1 
};
const DEFAULT_TEXTURE_MAPPING: TextureMapping = { 
  offsetX: 0.131, 
  offsetY: -0.502, 
  rotation: 90, 
  scaleX: 1, 
  scaleY: 2.01, 
  centerX: 0.499, 
  centerY: 0.5 
};

export default function ProductMockup() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const productPreviewRef = useRef<HTMLDivElement>(null);
  const threeContextRef = useRef<ThreeContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kraftBaseRef = useRef<ImageData | null>(null);
  const textureUpdateTimerRef = useRef<number | null>(null);
  
  const [elements, setElements] = useState<LabelElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewRotation, setViewRotation] = useState(115); // Fixed at 115° for correct tilt alignment
  const [labelRotation, setLabelRotation] = useState(0); // New rotation control using Offset X
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 }); // For shift-constrained movement
  const [isAltPressed, setIsAltPressed] = useState(false); // Track Alt/Option key for duplicate cursor
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null); // Track which resize handle is hovered
  // Resize state - all values captured at resize start and held constant during drag
  const resizeStateRef = useRef<{
    anchorWorld: { x: number; y: number };
    rotation0: number; // radians
    baseHx: number; // unscaled half-width
    baseHy: number; // unscaled half-height  
    cornerSignX: number; // +1 or -1 based on corner
    cornerSignY: number;
    halfDiag0: number; // sqrt(hx^2 + hy^2)
    centerToAnchor: { x: number; y: number }; // vector from center to anchor
  } | null>(null);
  const [cylinderLoaded, setCylinderLoaded] = useState(false);
  
  // Use hardcoded defaults directly - these are "in stone"
  const [cylinderPos, setCylinderPos] = useState<CylinderPos>(DEFAULT_CYLINDER_POS);
  const [positionLocked, setPositionLocked] = useState(true); // Locked by default
  const [textureMapping, setTextureMapping] = useState<TextureMapping>(DEFAULT_TEXTURE_MAPPING);
  const [textureMappingLocked, setTextureMappingLocked] = useState(true); // Locked by default
  const [showBleedOverlay, setShowBleedOverlay] = useState(true);
  const [bleedOverlayLoaded, setBleedOverlayLoaded] = useState(false);
  const bleedOverlayRef = useRef<HTMLImageElement | null>(null);
  const [showKraftEffect, setShowKraftEffect] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(fontsPreloaded);
  
  // Project info state (required before using designer)
  const [projectName, setProjectName] = useState<string>(() => {
    return localStorage.getItem('labelDesigner_projectName') || '';
  });
  const [projectEmail, setProjectEmail] = useState<string>(() => {
    return localStorage.getItem('labelDesigner_projectEmail') || '';
  });
  const [showProjectOverlay, setShowProjectOverlay] = useState(() => {
    const name = localStorage.getItem('labelDesigner_projectName');
    const email = localStorage.getItem('labelDesigner_projectEmail');
    return !name || !email;
  });
  const [tempProjectName, setTempProjectName] = useState('');
  const [tempProjectEmail, setTempProjectEmail] = useState('');
  
  // Color swatches for the session
  const [savedSwatches, setSavedSwatches] = useState<ColorSwatch[]>([]);
  
  // Track original assets for export
  const [originalAssets, setOriginalAssets] = useState<OriginalAsset[]>([]);
  
  // Preload all fonts on mount
  useEffect(() => {
    if (!fontsLoaded) {
      preloadAllFonts().then(() => setFontsLoaded(true));
    }
  }, [fontsLoaded]);
  
  // Keyboard shortcuts: Delete/Backspace to delete, Alt/Option for copy cursor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track Alt/Option key for duplicate cursor
      if (e.altKey) {
        setIsAltPressed(true);
      }
      
      // Delete selected element with Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        // Don't delete if user is typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        setElements(prev => prev.filter(el => el.id !== selectedId));
        setSelectedId(null);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) {
        setIsAltPressed(false);
      }
    };
    
    // Reset Alt state if window loses focus (prevents stuck cursor after Alt+Tab)
    const handleBlur = () => {
      setIsAltPressed(false);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [selectedId]);
  
  // Save project info to localStorage
  const handleProjectSubmit = () => {
    if (tempProjectName.trim() && tempProjectEmail.trim()) {
      localStorage.setItem('labelDesigner_projectName', tempProjectName.trim());
      localStorage.setItem('labelDesigner_projectEmail', tempProjectEmail.trim());
      setProjectName(tempProjectName.trim());
      setProjectEmail(tempProjectEmail.trim());
      setShowProjectOverlay(false);
    }
  };
  
  // Add a color to saved swatches
  const addColorToSwatches = (color: string, cmyk: string) => {
    const newSwatch: ColorSwatch = {
      id: Date.now().toString(),
      color,
      cmyk
    };
    setSavedSwatches(prev => [...prev, newSwatch]);
  };
  
  // Remove a swatch
  const removeSwatch = (id: string) => {
    setSavedSwatches(prev => prev.filter(s => s.id !== id));
  };
  
  const [lighting, setLighting] = useState<LightingSettings>({ ...DEFAULT_LIGHTING });
  
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      bleedOverlayRef.current = img;
      setBleedOverlayLoaded(true); // Trigger re-render when image loads
    };
    img.src = bleedOverlayUrl;
  }, []);

  const generateKraftBase = useCallback((width: number, height: number): ImageData => {
    if (kraftBaseRef.current && kraftBaseRef.current.width === width && kraftBaseRef.current.height === height) {
      return kraftBaseRef.current;
    }
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d')!;
    
    ctx.fillStyle = '#BEAD81';
    ctx.fillRect(0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 30;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    ctx.strokeStyle = 'rgba(139, 119, 101, 0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 100; i++) {
      ctx.beginPath();
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
      ctx.stroke();
    }
    
    kraftBaseRef.current = ctx.getImageData(0, 0, width, height);
    return kraftBaseRef.current;
  }, []);

  const applyKraftBase = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const baseData = generateKraftBase(width, height);
    ctx.putImageData(baseData, 0, 0);
  }, [generateKraftBase]);

  const drawFlatLabel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (showKraftEffect) {
      applyKraftBase(ctx, LABEL_WIDTH, LABEL_HEIGHT);
      ctx.globalCompositeOperation = 'multiply';
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);
    }

    elements.filter(el => el.visible !== false).forEach(el => {
      ctx.save();
      ctx.translate(el.x, el.y);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.scale(el.scale, el.scale);

      if (el.type === 'logo' && el.image) {
        const w = el.image.width;
        const h = el.image.height;
        ctx.drawImage(el.image, -w / 2, -h / 2, w, h);
      } else if (el.type === 'text') {
        ctx.font = `bold ${el.fontSize || 32}px ${el.font || 'Arial'}`;
        ctx.fillStyle = el.color || '#1a1a1a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.content, 0, 0);
      }

      ctx.restore();
    });

    ctx.globalCompositeOperation = 'source-over';

    if (showBleedOverlay && bleedOverlayRef.current) {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(bleedOverlayRef.current, 0, 0, LABEL_WIDTH, LABEL_HEIGHT);
      ctx.globalAlpha = 1.0;
    }

    if (selectedId) {
      const selected = elements.find(el => el.id === selectedId);
      if (selected && selected.visible !== false) {
        ctx.save();
        ctx.translate(selected.x, selected.y);
        ctx.rotate((selected.rotation * Math.PI) / 180);
        
        let w = 100, h = 50;
        if (selected.type === 'logo' && selected.image) {
          w = selected.image.width * selected.scale;
          h = selected.image.height * selected.scale;
        } else if (selected.type === 'text') {
          ctx.font = `bold ${selected.fontSize || 32}px ${selected.font || 'Arial Black'}`;
          const metrics = ctx.measureText(selected.content);
          w = (metrics.width + 20) * selected.scale;
          h = ((selected.fontSize || 32) + 20) * selected.scale;
        }
        
        // Draw selection border
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10);
        
        // Draw corner handles
        const handleSize = 10;
        const corners = [
          { x: -w / 2 - 5, y: -h / 2 - 5 }, // top-left
          { x: w / 2 + 5 - handleSize, y: -h / 2 - 5 }, // top-right
          { x: -w / 2 - 5, y: h / 2 + 5 - handleSize }, // bottom-left
          { x: w / 2 + 5 - handleSize, y: h / 2 + 5 - handleSize }, // bottom-right
        ];
        
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        corners.forEach(corner => {
          ctx.fillRect(corner.x, corner.y, handleSize, handleSize);
          ctx.strokeRect(corner.x, corner.y, handleSize, handleSize);
        });
        
        ctx.restore();
      }
    }
  }, [elements, selectedId, applyKraftBase, showBleedOverlay, bleedOverlayLoaded, showKraftEffect]);

  const createLabelTexture = useCallback((): THREE.CanvasTexture => {
    // First create the flat label canvas
    const flatCanvas = document.createElement('canvas');
    flatCanvas.width = LABEL_WIDTH;
    flatCanvas.height = LABEL_HEIGHT;
    const flatCtx = flatCanvas.getContext('2d')!;

    if (showKraftEffect) {
      applyKraftBase(flatCtx, LABEL_WIDTH, LABEL_HEIGHT);
      flatCtx.globalCompositeOperation = 'multiply';
    } else {
      flatCtx.fillStyle = '#ffffff';
      flatCtx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);
    }

    elements.filter(el => el.visible !== false).forEach(el => {
      flatCtx.save();
      flatCtx.translate(el.x, el.y);
      flatCtx.rotate((el.rotation * Math.PI) / 180);
      flatCtx.scale(el.scale, el.scale);

      if (el.type === 'logo' && el.image) {
        const w = el.image.width;
        const h = el.image.height;
        flatCtx.drawImage(el.image, -w / 2, -h / 2, w, h);
      } else if (el.type === 'text') {
        flatCtx.font = `bold ${el.fontSize || 32}px ${el.font || 'Arial'}`;
        flatCtx.fillStyle = el.color || '#1a1a1a';
        flatCtx.textAlign = 'center';
        flatCtx.textBaseline = 'middle';
        flatCtx.fillText(el.content, 0, 0);
      }

      flatCtx.restore();
    });

    flatCtx.globalCompositeOperation = 'source-over';

    // Now create a rotated canvas for the 3D texture (rotate 90° CCW)
    // This maps: flat canvas LEFT → cylinder TOP, flat canvas BOTTOM → cylinder wrap start
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = LABEL_HEIGHT;  // Swapped
    textureCanvas.height = LABEL_WIDTH;  // Swapped
    const texCtx = textureCanvas.getContext('2d')!;
    
    texCtx.translate(0, textureCanvas.height);
    texCtx.rotate(-Math.PI / 2);
    texCtx.drawImage(flatCanvas, 0, 0);

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    // Apply texture mapping - use 'repeat' for scaling (not 'scale' which doesn't exist)
    // labelRotation converts degrees to offset (360° = 1.0 offset for full wrap)
    const rotationOffset = labelRotation / 360;
    texture.offset.set(textureMapping.offsetX + rotationOffset, textureMapping.offsetY);
    texture.center.set(textureMapping.centerX, textureMapping.centerY);
    texture.repeat.set(textureMapping.scaleX, textureMapping.scaleY);
    texture.rotation = (textureMapping.rotation * Math.PI) / 180;
    
    texture.needsUpdate = true;
    return texture;
  }, [elements, applyKraftBase, textureMapping, labelRotation, showKraftEffect]);

  useEffect(() => {
    drawFlatLabel();
  }, [drawFlatLabel]);

  useEffect(() => {
    const container = threeContainerRef.current;
    if (!container) return;

    const width = 500;
    const height = 500;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.01, 100);
    camera.position.set(0, 0, DEFAULT_CYLINDER_POS.cameraZ);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '50%';
    renderer.domElement.style.left = '50%';
    renderer.domElement.style.transform = 'translate(-50%, -50%)';
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, lighting.ambient);
    scene.add(ambientLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, lighting.front);
    frontLight.position.set(0, 0, 1);
    scene.add(frontLight);

    const topLight = new THREE.DirectionalLight(0xffffff, lighting.top);
    topLight.position.set(0, 1, 0.5);
    scene.add(topLight);

    let cylinder: THREE.Mesh | null = null;
    let loadedGeometry: THREE.BufferGeometry | null = null;
    let loadedMaterial: THREE.MeshStandardMaterial | null = null;
    
    const loader = new OBJLoader();
    loader.load(
      '/attached_assets/HempWick%20Roll%20Object_1764118046566.obj',
      (obj) => {
        console.log('OBJ loaded successfully:', obj);
        console.log('Children:', obj.children);
        
        if (obj.children.length === 0 || !(obj.children[0] as THREE.Mesh).geometry) {
          console.error('No valid geometry in OBJ');
          return;
        }
        
        loadedGeometry = (obj.children[0] as THREE.Mesh).geometry;
        loadedGeometry.computeBoundingBox();
        console.log('Geometry bounding box:', loadedGeometry.boundingBox);
        
        const labelTexture = createLabelTexture();
        loadedMaterial = new THREE.MeshStandardMaterial({
          map: labelTexture,
          roughness: 0.7,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
        
        cylinder = new THREE.Mesh(loadedGeometry, loadedMaterial);
        cylinder.rotation.x = (DEFAULT_CYLINDER_POS.rotX * Math.PI) / 180;
        cylinder.rotation.y = (120 * Math.PI) / 180;
        cylinder.rotation.z = (DEFAULT_CYLINDER_POS.rotY * Math.PI) / 180;
        cylinder.position.set(DEFAULT_CYLINDER_POS.x, DEFAULT_CYLINDER_POS.y, DEFAULT_CYLINDER_POS.z);
        cylinder.scale.setScalar(DEFAULT_CYLINDER_POS.scale);
        scene.add(cylinder);
        
        console.log('Cylinder added:', { pos: cylinder.position, scale: DEFAULT_CYLINDER_POS.scale, rotX: DEFAULT_CYLINDER_POS.rotX });
        
        threeContextRef.current = {
          scene,
          camera,
          renderer,
          cylinder,
          geometry: loadedGeometry,
          material: loadedMaterial,
          animationId: 0,
          ambientLight,
          frontLight,
          topLight,
        };
        
        setCylinderLoaded(true);
      },
      undefined,
      (error) => {
        console.error('Error loading OBJ:', error);
        loadedGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.052, 64, 1, true);
        const labelTexture = createLabelTexture();
        loadedMaterial = new THREE.MeshStandardMaterial({
          map: labelTexture,
          roughness: 0.7,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
        
        cylinder = new THREE.Mesh(loadedGeometry, loadedMaterial);
        cylinder.position.set(DEFAULT_CYLINDER_POS.x, DEFAULT_CYLINDER_POS.y, DEFAULT_CYLINDER_POS.z);
        cylinder.scale.setScalar(DEFAULT_CYLINDER_POS.scale);
        scene.add(cylinder);
        
        threeContextRef.current = {
          scene,
          camera,
          renderer,
          cylinder,
          geometry: loadedGeometry,
          material: loadedMaterial,
          animationId: 0,
          ambientLight,
          frontLight,
          topLight,
        };
        
        setCylinderLoaded(true);
      }
    );

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    threeContextRef.current = {
      scene,
      camera,
      renderer,
      cylinder: null,
      geometry: null,
      material: null,
      animationId,
      ambientLight,
      frontLight,
      topLight,
    };

    return () => {
      cancelAnimationFrame(animationId);
      
      const ctx = threeContextRef.current;
      if (ctx) {
        if (ctx.material) {
          if (ctx.material.map) ctx.material.map.dispose();
          ctx.material.dispose();
        }
        if (ctx.geometry) {
          ctx.geometry.dispose();
        }
      }
      
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      threeContextRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ctx = threeContextRef.current;
    if (!ctx || !ctx.cylinder) return;

    if (textureUpdateTimerRef.current) {
      cancelAnimationFrame(textureUpdateTimerRef.current);
    }
    
    textureUpdateTimerRef.current = requestAnimationFrame(() => {
      const currentCtx = threeContextRef.current;
      if (!currentCtx || !currentCtx.cylinder) return;
      
      const newTexture = createLabelTexture();
      const material = currentCtx.cylinder.material as THREE.MeshStandardMaterial;
      if (material.map) {
        material.map.dispose();
      }
      material.map = newTexture;
      material.needsUpdate = true;
    });
  }, [createLabelTexture, cylinderLoaded]);

  useEffect(() => {
    const ctx = threeContextRef.current;
    if (!ctx || !ctx.cylinder) return;
    
    const material = ctx.cylinder.material as THREE.MeshStandardMaterial;
    if (material.map) {
      // Include labelRotation in offset calculation (360° = 1.0 offset)
      const rotationOffset = labelRotation / 360;
      material.map.offset.set(textureMapping.offsetX + rotationOffset, textureMapping.offsetY);
      material.map.center.set(textureMapping.centerX, textureMapping.centerY);
      material.map.repeat.set(textureMapping.scaleX, textureMapping.scaleY);
      material.map.rotation = (textureMapping.rotation * Math.PI) / 180;
      material.map.needsUpdate = true;
      material.needsUpdate = true;
    }
  }, [textureMapping, cylinderLoaded, labelRotation]);

  useEffect(() => {
    const ctx = threeContextRef.current;
    if (!ctx || !ctx.cylinder) return;
    ctx.cylinder.rotation.y = (viewRotation * Math.PI) / 180;
  }, [viewRotation, cylinderLoaded]);

  useEffect(() => {
    const ctx = threeContextRef.current;
    if (!ctx || !ctx.cylinder) return;
    
    ctx.cylinder.position.set(cylinderPos.x, cylinderPos.y, cylinderPos.z);
    ctx.cylinder.scale.setScalar(cylinderPos.scale);
    ctx.cylinder.rotation.x = (cylinderPos.rotX * Math.PI) / 180;
    ctx.cylinder.rotation.z = (cylinderPos.rotY * Math.PI) / 180;
    ctx.camera.position.z = cylinderPos.cameraZ;
  }, [cylinderPos, cylinderLoaded]);

  // Update lighting when settings change
  useEffect(() => {
    const ctx = threeContextRef.current;
    if (!ctx) return;
    
    // Calculate warm/cool tint color
    const warmth = lighting.warmth;
    let lightColor: THREE.Color;
    if (warmth >= 0) {
      // Warm tint: blend white towards warm yellow/orange
      lightColor = new THREE.Color(1, 1 - warmth * 0.1, 1 - warmth * 0.2);
    } else {
      // Cool tint: blend white towards cool blue
      lightColor = new THREE.Color(1 + warmth * 0.1, 1 + warmth * 0.05, 1);
    }
    
    if (ctx.ambientLight) {
      ctx.ambientLight.intensity = lighting.ambient;
      ctx.ambientLight.color = lightColor;
    }
    if (ctx.frontLight) {
      ctx.frontLight.intensity = lighting.front;
      ctx.frontLight.color = lightColor;
      
      // Position key light based on angle, height, and distance
      const angleRad = (lighting.keyAngle * Math.PI) / 180;
      const heightRad = (lighting.keyHeight * Math.PI) / 180;
      const dist = lighting.keyDistance;
      
      // Spherical to cartesian: x = cos(height)*sin(angle), y = sin(height), z = cos(height)*cos(angle)
      const x = Math.cos(heightRad) * Math.sin(angleRad) * dist;
      const y = Math.sin(heightRad) * dist;
      const z = Math.cos(heightRad) * Math.cos(angleRad) * dist;
      
      ctx.frontLight.position.set(x, y, z);
    }
    if (ctx.topLight) {
      ctx.topLight.intensity = lighting.top;
      ctx.topLight.color = lightColor;
    }
  }, [lighting, cylinderLoaded]);

  const savePosition = () => {
    // Settings are hardcoded - show confirmation
    toast({
      title: "Settings Locked",
      description: "3D position settings are permanently configured.",
    });
  };

  const saveTextureMapping = () => {
    // Settings are hardcoded - show confirmation
    toast({
      title: "Settings Locked", 
      description: "Texture mapping settings are permanently configured.",
    });
  };

  // Helper to get element bounds
  const getElementBounds = useCallback((el: LabelElement) => {
    let w = 100, h = 50;
    if (el.type === 'logo' && el.image) {
      w = el.image.width * el.scale;
      h = el.image.height * el.scale;
    } else if (el.type === 'text') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = `bold ${el.fontSize || 32}px ${el.font || 'Arial Black'}`;
          const metrics = ctx.measureText(el.content);
          w = (metrics.width + 20) * el.scale;
          h = ((el.fontSize || 32) + 20) * el.scale;
        }
      }
    }
    return { w, h };
  }, []);

  // Check if point is on a resize handle
  const getHandleAtPoint = useCallback((el: LabelElement, x: number, y: number): string | null => {
    const { w, h } = getElementBounds(el);
    const handleSize = 15; // Slightly larger hit area
    
    // Transform point to element's local space
    const cos = Math.cos((-el.rotation * Math.PI) / 180);
    const sin = Math.sin((-el.rotation * Math.PI) / 180);
    const dx = x - el.x;
    const dy = y - el.y;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    
    const corners = [
      { name: 'tl', x: -w / 2 - 5, y: -h / 2 - 5 },
      { name: 'tr', x: w / 2 + 5 - handleSize, y: -h / 2 - 5 },
      { name: 'bl', x: -w / 2 - 5, y: h / 2 + 5 - handleSize },
      { name: 'br', x: w / 2 + 5 - handleSize, y: h / 2 + 5 - handleSize },
    ];
    
    for (const corner of corners) {
      if (localX >= corner.x && localX <= corner.x + handleSize &&
          localY >= corner.y && localY <= corner.y + handleSize) {
        return corner.name;
      }
    }
    return null;
  }, [getElementBounds]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = LABEL_WIDTH / rect.width;
    const scaleY = LABEL_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let found: string | null = null;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.visible === false) continue;
      
      const { w, h } = getElementBounds(el);
      
      if (x >= el.x - w/2 && x <= el.x + w/2 && y >= el.y - h/2 && y <= el.y + h/2) {
        found = el.id;
        break;
      }
    }
    setSelectedId(found);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = LABEL_WIDTH / rect.width;
    const scaleY = LABEL_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check if clicking on a resize handle first
    if (selectedId) {
      const selected = elements.find(el => el.id === selectedId);
      if (selected) {
        const handle = getHandleAtPoint(selected, x, y);
        if (handle) {
          setIsResizing(true);
          setResizeCorner(handle);
          
          // Calculate all initial state for anchor-based resize
          const { w, h } = getElementBounds(selected);
          const rotation0 = (selected.rotation * Math.PI) / 180;
          const cos = Math.cos(rotation0);
          const sin = Math.sin(rotation0);
          
          // Unscaled half dimensions (the base size before any scaling)
          const baseHalfW = (w / selected.scale) / 2;
          const baseHalfH = (h / selected.scale) / 2;
          
          // Anchor sign: which corner is fixed (opposite of dragged corner)
          // tl=-1,-1  tr=+1,-1  bl=-1,+1  br=+1,+1
          let anchorSignX = 1, anchorSignY = 1;
          if (handle === 'tl') { anchorSignX = 1; anchorSignY = 1; }      // anchor=br
          else if (handle === 'tr') { anchorSignX = -1; anchorSignY = 1; } // anchor=bl
          else if (handle === 'bl') { anchorSignX = 1; anchorSignY = -1; } // anchor=tr
          else { anchorSignX = -1; anchorSignY = -1; }                     // anchor=tl
          
          // Anchor position in local space (at current scale)
          const anchorLocalX = anchorSignX * (w / 2);
          const anchorLocalY = anchorSignY * (h / 2);
          
          // Transform anchor to world space
          const anchorWorldX = selected.x + anchorLocalX * cos - anchorLocalY * sin;
          const anchorWorldY = selected.y + anchorLocalX * sin + anchorLocalY * cos;
          
          // Store state
          resizeStateRef.current = {
            anchorWorld: { x: anchorWorldX, y: anchorWorldY },
            rotation0,
            baseHalfW,
            baseHalfH,
            anchorSignX,
            anchorSignY,
            initialScale: selected.scale,
            elementType: selected.type,
            baseFontSize: (selected.fontSize || 36) * selected.scale // Visual font size at start
          };
          
          return;
        }
      }
    }

    // Check for Alt/Option + click to duplicate
    if (selectedId && (e.altKey || e.metaKey)) {
      const selected = elements.find(el => el.id === selectedId);
      if (selected) {
        const newElement: LabelElement = {
          ...selected,
          id: `${selected.type}-${Date.now()}`,
          x: selected.x + 20,
          y: selected.y + 20,
        };
        setElements(prev => [...prev, newElement]);
        setSelectedId(newElement.id);
        setIsDragging(true);
        setDragOffset({ x: x - newElement.x, y: y - newElement.y });
        setDragStartPos({ x: newElement.x, y: newElement.y });
        return;
      }
    }

    // Regular drag
    if (!selectedId) return;
    
    const selected = elements.find(el => el.id === selectedId);
    if (selected) {
      setIsDragging(true);
      setDragOffset({ x: x - selected.x, y: y - selected.y });
      setDragStartPos({ x: selected.x, y: selected.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = LABEL_WIDTH / rect.width;
    const scaleY = LABEL_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check for hovered handle (for cursor changes) when not actively dragging/resizing
    if (!isDragging && !isResizing && selectedId) {
      const selected = elements.find(el => el.id === selectedId);
      if (selected) {
        const handle = getHandleAtPoint(selected, x, y);
        setHoveredHandle(handle);
      }
    }

    // Handle resizing with anchor-based logic (opposite corner stays fixed)
    if (isResizing && selectedId && resizeCorner && resizeStateRef.current) {
      const rs = resizeStateRef.current;
      const cos = Math.cos(rs.rotation0);
      const sin = Math.sin(rs.rotation0);
      
      // Vector from anchor to mouse in world space
      const dx = x - rs.anchorWorld.x;
      const dy = y - rs.anchorWorld.y;
      
      // Transform to local space (inverse rotation)
      const localX = dx * cos + dy * sin;
      const localY = -dx * sin + dy * cos;
      
      // The dragged corner is opposite the anchor
      // Anchor at (anchorSign * half), so dragged corner at (-anchorSign * half)
      // Direction from anchor to dragged corner in local space (at scale=1)
      const dirX = -rs.anchorSignX * rs.baseHalfW * 2; // full width in this direction
      const dirY = -rs.anchorSignY * rs.baseHalfH * 2; // full height in this direction
      const diagLen = Math.sqrt(dirX * dirX + dirY * dirY);
      const diagDirX = dirX / diagLen;
      const diagDirY = dirY / diagLen;
      
      // Project mouse onto diagonal
      const projDist = localX * diagDirX + localY * diagDirY;
      
      // New scale ratio: projDist / diagLen (diagLen is full diagonal at scale=1)
      const scaleRatio = Math.max(0.1, Math.min(5, projDist / diagLen));
      
      // Dragged corner in local space (relative to anchor)
      const cornerLocalX = projDist * diagDirX;
      const cornerLocalY = projDist * diagDirY;
      
      // Transform corner to world space
      const cornerWorldX = rs.anchorWorld.x + cornerLocalX * cos - cornerLocalY * sin;
      const cornerWorldY = rs.anchorWorld.y + cornerLocalX * sin + cornerLocalY * cos;
      
      // Center is midpoint of anchor and corner
      const newCenterX = (rs.anchorWorld.x + cornerWorldX) / 2;
      const newCenterY = (rs.anchorWorld.y + cornerWorldY) / 2;
      
      // For text: update fontSize directly, keep scale at 1
      // For logos: update scale as before
      if (rs.elementType === 'text') {
        const newFontSize = Math.round(rs.baseFontSize * scaleRatio);
        setElements(prev => prev.map(el => 
          el.id === selectedId ? { ...el, fontSize: Math.max(8, Math.min(200, newFontSize)), scale: 1, x: newCenterX, y: newCenterY } : el
        ));
      } else {
        setElements(prev => prev.map(el => 
          el.id === selectedId ? { ...el, scale: scaleRatio, x: newCenterX, y: newCenterY } : el
        ));
      }
      return;
    }

    // Handle dragging
    if (!isDragging || !selectedId) return;

    let newX = x - dragOffset.x;
    let newY = y - dragOffset.y;

    // Shift key constrains to horizontal or vertical movement
    if (e.shiftKey) {
      const deltaX = Math.abs(newX - dragStartPos.x);
      const deltaY = Math.abs(newY - dragStartPos.y);
      
      if (deltaX > deltaY) {
        // Horizontal movement
        newY = dragStartPos.y;
      } else {
        // Vertical movement
        newX = dragStartPos.x;
      }
    }

    setElements(prev => prev.map(el => 
      el.id === selectedId 
        ? { ...el, x: newX, y: newY }
        : el
    ));
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeCorner(null);
    resizeStateRef.current = null;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const base64Data = dataUrl.split(',')[1]; // Remove data:image/xxx;base64, prefix
        
        const img = new window.Image();
        img.onload = () => {
          // Store original asset for export
          const originalAsset: OriginalAsset = {
            name: file.name,
            data: base64Data,
            mimeType: file.type
          };
          
          const newElement: LabelElement = {
            id: `logo-${Date.now()}`,
            type: 'logo',
            x: LABEL_WIDTH / 2,
            y: LABEL_HEIGHT / 2,
            rotation: 0,
            scale: Math.min(200 / img.width, 200 / img.height),
            content: file.name, // Store filename
            visible: true,
            image: img,
            originalAsset, // Store for export
          };
          setElements(prev => [...prev, newElement]);
          setOriginalAssets(prev => [...prev, originalAsset]);
          setSelectedId(newElement.id);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const addTextElement = () => {
    const textCount = elements.filter(el => el.type === 'text').length;
    const newElement: LabelElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: LABEL_WIDTH / 2,
      y: 150 + (textCount * 60) % (LABEL_HEIGHT - 200),
      rotation: 0,
      scale: 1,
      content: 'New Text',
      font: 'Arial',
      fontSize: 36,
      color: '#1a1a1a',
      visible: true,
    };
    setElements(prev => [...prev, newElement]);
    setSelectedId(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<LabelElement>) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  const deleteElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const toggleVisibility = (id: string) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, visible: el.visible === false ? true : false } : el
    ));
  };

  const moveElement = (id: string, direction: 'up' | 'down') => {
    setElements(prev => {
      const index = prev.findIndex(el => el.id === id);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index + 1 : index - 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newElements = [...prev];
      [newElements[index], newElements[newIndex]] = [newElements[newIndex], newElements[index]];
      return newElements;
    });
  };

  const handleReset = () => {
    setElements([]);
    setSelectedId(null);
    setLabelRotation(0);
    setLighting({ ...DEFAULT_LIGHTING });
    // viewRotation stays locked at 115° for correct tilt alignment
  };

  const handleDownload = () => {
    const container = threeContainerRef.current;
    if (!container) return;
    
    const downloadCanvas = document.createElement('canvas');
    downloadCanvas.width = 500;
    downloadCanvas.height = 500;
    const downloadCtx = downloadCanvas.getContext('2d')!;
    
    downloadCtx.fillStyle = '#e8dcc8';
    downloadCtx.fillRect(0, 0, 500, 500);
    
    const threeCanvas = container.querySelector('canvas');
    if (threeCanvas) {
      downloadCtx.drawImage(threeCanvas, 0, 0);
    }
    
    const overlayImg = new window.Image();
    overlayImg.crossOrigin = 'anonymous';
    overlayImg.onload = () => {
      downloadCtx.drawImage(overlayImg, 0, 0, 500, 500);
      const link = document.createElement('a');
      link.download = 'hemp-wick-mockup.png';
      link.href = downloadCanvas.toDataURL('image/png');
      link.click();
    };
    overlayImg.src = hempClearUrl;
  };

  // Helper function to convert hex/rgba to CMYK
  const colorToCmyk = (colorStr: string): string => {
    let r = 0, g = 0, b = 0;
    
    if (colorStr.startsWith('#')) {
      const hex = colorStr.replace('#', '');
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        r = parseInt(match[1]);
        g = parseInt(match[2]);
        b = parseInt(match[3]);
      }
    }
    
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const k = 1 - Math.max(rNorm, gNorm, bNorm);
    if (k === 1) return 'C: 0% M: 0% Y: 0% K: 100%';
    
    const c = Math.round(((1 - rNorm - k) / (1 - k)) * 100);
    const m = Math.round(((1 - gNorm - k) / (1 - k)) * 100);
    const y = Math.round(((1 - bNorm - k) / (1 - k)) * 100);
    const kPct = Math.round(k * 100);
    
    return `C: ${c}% M: ${m}% Y: ${y}% K: ${kPct}%`;
  };

  // Export project: generates ZIP download and uploads to Google Drive
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExportProject = async () => {
    if (!projectName || !projectEmail) {
      toast({
        title: "Project info required",
        description: "Please set project name and email first.",
        variant: "destructive"
      });
      return;
    }
    
    if (elements.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Add some text or logos to your design first.",
        variant: "destructive"
      });
      return;
    }
    
    setIsExporting(true);
    
    try {
      // Create clean design canvas WITHOUT bleed overlay and selection handles
      const cleanCanvas = document.createElement('canvas');
      cleanCanvas.width = LABEL_WIDTH;
      cleanCanvas.height = LABEL_HEIGHT;
      const cleanCtx = cleanCanvas.getContext('2d')!;
      
      // Draw kraft paper base (conditional)
      if (showKraftEffect) {
        applyKraftBase(cleanCtx, LABEL_WIDTH, LABEL_HEIGHT);
        cleanCtx.globalCompositeOperation = 'multiply';
      } else {
        cleanCtx.fillStyle = '#ffffff';
        cleanCtx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);
      }
      
      // Draw all visible elements (no bleed, no selection)
      elements.filter(el => el.visible !== false).forEach(el => {
        cleanCtx.save();
        cleanCtx.translate(el.x, el.y);
        cleanCtx.rotate((el.rotation * Math.PI) / 180);
        cleanCtx.scale(el.scale, el.scale);

        if (el.type === 'logo' && el.image) {
          const w = el.image.width;
          const h = el.image.height;
          cleanCtx.drawImage(el.image, -w / 2, -h / 2, w, h);
        } else if (el.type === 'text') {
          cleanCtx.font = `bold ${el.fontSize || 32}px ${el.font || 'Arial'}`;
          cleanCtx.fillStyle = el.color || '#1a1a1a';
          cleanCtx.textAlign = 'center';
          cleanCtx.textBaseline = 'middle';
          cleanCtx.fillText(el.content, 0, 0);
        }

        cleanCtx.restore();
      });
      cleanCtx.globalCompositeOperation = 'source-over';
      
      const designPng = cleanCanvas.toDataURL('image/png').split(',')[1];
      
      // Get 3D mockup as screenshot of the Product Preview container
      let mockupPng = '';
      if (productPreviewRef.current) {
        try {
          const canvas = await html2canvas(productPreviewRef.current, {
            backgroundColor: '#e8dcc8',
            useCORS: true,
            allowTaint: true,
            scale: 2, // Higher quality
          });
          mockupPng = canvas.toDataURL('image/png').split(',')[1];
        } catch (err) {
          console.error('html2canvas failed:', err);
        }
      }
      
      // Prepare elements data for export with visual size and CMYK
      const exportElements = elements.map(el => ({
        type: el.type,
        content: el.content,
        font: el.font || 'Arial',
        fontSize: el.fontSize || 36,
        visualSize: Math.round((el.fontSize || 36) * el.scale * 10) / 10, // Visual size with 1 decimal
        color: el.color || '#1a1a1a',
        cmyk: colorToCmyk(el.color || '#1a1a1a'),
        x: el.x,
        y: el.y,
        scale: el.scale,
        rotation: el.rotation,
      }));
      
      // Prepare assets
      const exportAssets = elements
        .filter(el => el.type === 'logo' && el.originalAsset)
        .map(el => el.originalAsset!);
      
      // Call export API
      const response = await fetch('/api/label-projects/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          projectEmail,
          designPng,
          mockupPng,
          elements: exportElements,
          savedSwatches,
          assets: exportAssets,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Download ZIP
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName.replace(/[^a-z0-9]/gi, '_')}_project.zip`;
      link.click();
      URL.revokeObjectURL(url);
      
      // Check for Drive folder URL
      const driveFolderUrl = response.headers.get('X-Drive-Folder-Url');
      
      toast({
        title: "Project exported!",
        description: driveFolderUrl 
          ? "ZIP downloaded and backed up to Google Drive." 
          : "ZIP downloaded successfully.",
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  return (
    <>
      {/* Project Name/Email Overlay - blocks designer until completed */}
      <Dialog open={showProjectOverlay} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Start Your Label Project</DialogTitle>
            <DialogDescription>
              Enter your project name and email to begin designing. This info will be saved with your project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="e.g., Hemp Wick 200ft Roll"
                value={tempProjectName}
                onChange={(e) => setTempProjectName(e.target.value)}
                data-testid="input-project-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-email">Email</Label>
              <Input
                id="project-email"
                type="email"
                placeholder="your@email.com"
                value={tempProjectEmail}
                onChange={(e) => setTempProjectEmail(e.target.value)}
                data-testid="input-project-email"
              />
            </div>
          </div>
          <Button 
            className="w-full" 
            onClick={handleProjectSubmit}
            disabled={!tempProjectName.trim() || !tempProjectEmail.trim()}
            data-testid="button-start-project"
          >
            Start Designing
          </Button>
        </DialogContent>
      </Dialog>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Hemp Wick Label Designer</h1>
            <p className="text-muted-foreground text-sm">Design your label and preview how it wraps around the product</p>
          </div>
          {projectName && (
            <div className="text-right text-sm">
              <div className="font-medium" data-testid="text-project-name">{projectName}</div>
              <div className="text-muted-foreground text-xs" data-testid="text-project-email">{projectEmail}</div>
            </div>
          )}
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">Label Design</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                data-testid="button-reset"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-add-logo"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Add Logo
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={addTextElement}
                    data-testid="button-add-text"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Text
                  </Button>
                  <Button
                    size="sm"
                    variant={showBleedOverlay ? "default" : "outline"}
                    onClick={() => setShowBleedOverlay(!showBleedOverlay)}
                    data-testid="button-toggle-bleed"
                  >
                    {showBleedOverlay ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                    Bleed
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />

                <div 
                  className="relative border rounded-lg overflow-hidden bg-muted"
                  style={{ aspectRatio: `${LABEL_WIDTH}/${LABEL_HEIGHT}` }}
                >
                  <canvas
                    ref={canvasRef}
                    width={LABEL_WIDTH}
                    height={LABEL_HEIGHT}
                    className={`w-full h-full ${
                      hoveredHandle === 'tl' || hoveredHandle === 'br' ? 'cursor-nwse-resize' :
                      hoveredHandle === 'tr' || hoveredHandle === 'bl' ? 'cursor-nesw-resize' :
                      isAltPressed && selectedId ? 'cursor-copy' : 'cursor-move'
                    }`}
                    onClick={handleCanvasClick}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={() => { handleCanvasMouseUp(); setHoveredHandle(null); }}
                    data-testid="canvas-label"
                  />
                </div>

                {elements.length > 0 && (
                  <div className="border rounded-lg">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
                      <Layers className="h-4 w-4" />
                      <span className="text-sm font-medium">Layers ({elements.length})</span>
                    </div>
                    <ScrollArea className="max-h-32">
                      <div className="divide-y">
                        {[...elements].reverse().map((el, idx) => (
                          <div
                            key={el.id}
                            className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted/50 ${
                              selectedId === el.id ? 'bg-primary/10' : ''
                            }`}
                            onClick={() => setSelectedId(el.id)}
                            data-testid={`layer-item-${idx}`}
                          >
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id); }}
                            >
                              {el.visible !== false ? (
                                <Eye className="h-3 w-3" />
                              ) : (
                                <EyeOff className="h-3 w-3 text-muted-foreground" />
                              )}
                            </Button>
                            <div 
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: el.type === 'text' ? (el.color || '#1a1a1a') : '#888' }}
                            />
                            <span className={`flex-1 text-xs truncate ${el.visible === false ? 'text-muted-foreground' : ''}`}>
                              {el.type === 'text' ? el.content : 'Logo'}
                            </span>
                            <div className="flex gap-0.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5"
                                onClick={(e) => { e.stopPropagation(); moveElement(el.id, 'up'); }}
                                disabled={idx === 0}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5"
                                onClick={(e) => { e.stopPropagation(); moveElement(el.id, 'down'); }}
                                disabled={idx === elements.length - 1}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 text-destructive hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Click to select, drag to move
                </p>
              </div>

              <div className="w-56 space-y-3">
                {selectedElement ? (
                  <div className="p-3 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Move className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {selectedElement.type === 'text' ? 'Edit Text' : 'Edit Logo'}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteElement(selectedId!)}
                        data-testid="button-delete"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs">Align on Canvas:</Label>
                      <div className="flex gap-1 flex-wrap">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateElement(selectedId!, { x: 50 })}
                          title="Align Left"
                          data-testid="button-align-left"
                        >
                          <ArrowLeftToLine className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateElement(selectedId!, { x: LABEL_WIDTH / 2 })}
                          title="Center Horizontal"
                          data-testid="button-align-center-h"
                        >
                          <CenterVerticalLine />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateElement(selectedId!, { x: LABEL_WIDTH - 50 })}
                          title="Align Right"
                          data-testid="button-align-right"
                        >
                          <ArrowRightToLine className="w-4 h-4" />
                        </Button>
                        <div className="w-px bg-border mx-1" />
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateElement(selectedId!, { y: 50 })}
                          title="Align Top"
                          data-testid="button-align-top"
                        >
                          <ArrowUpToLine className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateElement(selectedId!, { y: LABEL_HEIGHT / 2 })}
                          title="Center Vertical"
                          data-testid="button-align-center-v"
                        >
                          <CenterHorizontalLine />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateElement(selectedId!, { y: LABEL_HEIGHT - 50 })}
                          title="Align Bottom"
                          data-testid="button-align-bottom"
                        >
                          <ArrowDownToLine className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {selectedElement.type === 'text' && (
                      <div className="space-y-3">
                        <Input
                          value={selectedElement.content}
                          onChange={(e) => updateElement(selectedId!, { content: e.target.value })}
                          placeholder="Enter text"
                          data-testid="input-text-content"
                        />
                        
                        <div className="flex items-center gap-2">
                          <Label className="text-xs w-12">Font:</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                role="combobox"
                                className="flex-1 justify-between"
                                disabled={!fontsLoaded}
                                data-testid="button-font-picker"
                              >
                                {!fontsLoaded ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span className="text-xs">Loading fonts...</span>
                                  </>
                                ) : (
                                  <>
                                    <span 
                                      className="truncate text-xs"
                                      style={{ fontFamily: selectedElement.font || 'Arial' }}
                                    >
                                      {selectedElement.font || 'Arial'}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[220px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search fonts..." className="h-9" />
                                <CommandList>
                                  <CommandEmpty>No font found.</CommandEmpty>
                                  <CommandGroup>
                                    {GOOGLE_FONTS.map((font) => (
                                      <CommandItem
                                        key={font}
                                        value={font}
                                        onSelect={() => updateElement(selectedId!, { font })}
                                        className="text-xs"
                                        style={{ fontFamily: font }}
                                        data-testid={`font-option-${font.toLowerCase().replace(/\s+/g, '-')}`}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            (selectedElement.font || 'Arial') === font ? 'opacity-100' : 'opacity-0'
                                          }`}
                                        />
                                        {font}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Label className="text-xs w-12">Color:</Label>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 justify-start gap-2"
                                data-testid="button-color-picker"
                              >
                                <div 
                                  className="w-5 h-5 rounded border border-border"
                                  style={{ backgroundColor: selectedElement.color || '#1a1a1a' }}
                                />
                                <span className="text-xs font-mono">{selectedElement.color || '#1a1a1a'}</span>
                                <Palette className="h-4 w-4 ml-auto" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="w-auto max-w-[280px] p-4">
                              <DialogHeader>
                                <DialogTitle className="text-sm">Pick Color</DialogTitle>
                              </DialogHeader>
                              <CMYKColorPicker
                                color={selectedElement.color || '#1a1a1a'}
                                onChange={(color) => updateElement(selectedId!, { color })}
                                savedSwatches={savedSwatches}
                                onSaveSwatch={addColorToSwatches}
                                onUseSwatch={(color) => updateElement(selectedId!, { color })}
                                onRemoveSwatch={removeSwatch}
                              />
                            </DialogContent>
                          </Dialog>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Label className="text-xs w-12">Size:</Label>
                          <Slider
                            value={[selectedElement.fontSize || 32]}
                            onValueChange={([v]) => updateElement(selectedId!, { fontSize: v })}
                            min={12}
                            max={80}
                            step={2}
                            className="flex-1"
                            data-testid="slider-text-size"
                          />
                          <span className="text-xs w-8 text-right">{selectedElement.fontSize}px</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Scale: {(selectedElement.scale * 100).toFixed(1)}%</Label>
                        <div className="flex gap-1">
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateElement(selectedId!, { scale: selectedElement.scale - 0.001 })} data-testid="btn-scale-minus">
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateElement(selectedId!, { scale: selectedElement.scale + 0.001 })} data-testid="btn-scale-plus">
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <Slider
                        value={[selectedElement.scale * 1000]}
                        onValueChange={([v]) => updateElement(selectedId!, { scale: v / 1000 })}
                        min={100}
                        max={3000}
                        step={1}
                        data-testid="slider-scale"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Rotate: {selectedElement.rotation.toFixed(1)}°</Label>
                        <div className="flex gap-1">
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateElement(selectedId!, { rotation: selectedElement.rotation - 0.1 })} data-testid="btn-rotate-minus">
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateElement(selectedId!, { rotation: selectedElement.rotation + 0.1 })} data-testid="btn-rotate-plus">
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <Slider
                        value={[selectedElement.rotation * 10]}
                        onValueChange={([v]) => updateElement(selectedId!, { rotation: v / 10 })}
                        min={0}
                        max={3600}
                        step={1}
                        data-testid="slider-rotation"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground text-center">
                      Add a logo or text, then select it to edit
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setShowKraftEffect(!showKraftEffect)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    showKraftEffect 
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' 
                      : 'bg-muted/50 border-muted-foreground/20'
                  }`}
                  data-testid="button-toggle-kraft"
                >
                  <p className={`text-xs ${showKraftEffect ? 'text-amber-800 dark:text-amber-200' : 'text-muted-foreground'}`}>
                    <strong>Kraft Paper:</strong> {showKraftEffect ? 'ON' : 'OFF'} - Colors blend with brown paper. White becomes paper color.
                  </p>
                </button>
                
                <p className="text-[10px] text-muted-foreground/70 text-center leading-relaxed">
                  <span className="font-medium">Shortcuts:</span> Delete/Backspace removes selection • Alt/Option+drag duplicates • Shift+drag constrains to axis
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">Product Preview</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleExportProject}
                  disabled={isExporting || elements.length === 0}
                  data-testid="button-save-project"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  {isExporting ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="w-full flex justify-center">
              <div 
                ref={productPreviewRef}
                className="relative flex items-center justify-center rounded-lg overflow-hidden"
                style={{ 
                  background: '#e8dcc8',
                  width: '500px',
                  height: '500px',
                }}
                data-testid="container-preview"
              >
                <img 
                  src={hempClearUrl}
                  alt="Hemp wick overlay"
                  className="absolute pointer-events-none"
                  style={{ width: '500px', height: '500px', objectFit: 'contain', zIndex: 1 }}
                />
                <div 
                  ref={threeContainerRef}
                  className="absolute"
                  style={{ width: '500px', height: '500px', zIndex: 2 }}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm">Rotate View: {labelRotation}°</Label>
              <Slider
                value={[labelRotation]}
                onValueChange={([v]) => setLabelRotation(v)}
                min={0}
                max={720}
                step={5}
                data-testid="slider-view-rotation"
              />
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Lighting</Label>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLighting({ ...DEFAULT_LIGHTING })}
                  data-testid="button-reset-lighting"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
              <div className="space-y-1.5">
                <div>
                  <Label className="text-xs text-muted-foreground">Ambient: {lighting.ambient.toFixed(2)}</Label>
                  <Slider
                    value={[lighting.ambient]}
                    onValueChange={([v]) => setLighting(prev => ({ ...prev, ambient: v }))}
                    min={0}
                    max={2}
                    step={0.05}
                    data-testid="slider-lighting-ambient"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Key Light: {lighting.front.toFixed(2)}</Label>
                  <Slider
                    value={[lighting.front]}
                    onValueChange={([v]) => setLighting(prev => ({ ...prev, front: v }))}
                    min={0}
                    max={6}
                    step={0.1}
                    data-testid="slider-lighting-front"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fill Light: {lighting.top.toFixed(2)}</Label>
                  <Slider
                    value={[lighting.top]}
                    onValueChange={([v]) => setLighting(prev => ({ ...prev, top: v }))}
                    min={0}
                    max={3}
                    step={0.05}
                    data-testid="slider-lighting-fill"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Warmth: {lighting.warmth.toFixed(2)}</Label>
                  <Slider
                    value={[lighting.warmth]}
                    onValueChange={([v]) => setLighting(prev => ({ ...prev, warmth: v }))}
                    min={-1}
                    max={1}
                    step={0.05}
                    data-testid="slider-lighting-warmth"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Key Angle: {lighting.keyAngle}°</Label>
                  <Slider
                    value={[lighting.keyAngle]}
                    onValueChange={([v]) => setLighting(prev => ({ ...prev, keyAngle: v }))}
                    min={0}
                    max={360}
                    step={5}
                    data-testid="slider-lighting-key-angle"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Key Height: {lighting.keyHeight}°</Label>
                  <Slider
                    value={[lighting.keyHeight]}
                    onValueChange={([v]) => setLighting(prev => ({ ...prev, keyHeight: v }))}
                    min={-90}
                    max={90}
                    step={5}
                    data-testid="slider-lighting-key-height"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Key Distance: {lighting.keyDistance.toFixed(1)}</Label>
                  <Slider
                    value={[lighting.keyDistance]}
                    onValueChange={([v]) => setLighting(prev => ({ ...prev, keyDistance: v }))}
                    min={0.5}
                    max={5}
                    step={0.1}
                    data-testid="slider-lighting-key-distance"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
}
