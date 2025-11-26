import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Upload, RotateCcw, Image, Type, Move, Palette, Plus, Minus, Trash2, Eye, EyeOff, Layers, ChevronUp, ChevronDown, Lock, Unlock, AlignLeft, AlignRight, AlignCenterHorizontal, AlignStartVertical, AlignEndVertical, AlignCenterVertical } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { useToast } from '@/hooks/use-toast';
import hempClearUrl from '@assets/Hemp-Clear_1764119084551.png';
import bleedOverlayUrl from '@assets/Hemp Wick Roll Bleed _1764154739524.png';

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
  const threeContextRef = useRef<ThreeContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const kraftBaseRef = useRef<ImageData | null>(null);
  const textureUpdateTimerRef = useRef<number | null>(null);
  
  const [elements, setElements] = useState<LabelElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewRotation, setViewRotation] = useState(115); // Fixed at 115° for correct tilt alignment
  const [labelRotation, setLabelRotation] = useState(0); // New rotation control using Offset X
  const [uploadedLabel, setUploadedLabel] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<'build' | 'upload'>('build');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [cylinderLoaded, setCylinderLoaded] = useState(false);
  
  // Use hardcoded defaults directly - these are "in stone"
  const [cylinderPos, setCylinderPos] = useState<CylinderPos>(DEFAULT_CYLINDER_POS);
  const [positionLocked, setPositionLocked] = useState(true); // Locked by default
  const [textureMapping, setTextureMapping] = useState<TextureMapping>(DEFAULT_TEXTURE_MAPPING);
  const [textureMappingLocked, setTextureMappingLocked] = useState(true); // Locked by default
  const [showBleedOverlay, setShowBleedOverlay] = useState(true);
  const [bleedOverlayLoaded, setBleedOverlayLoaded] = useState(false);
  const bleedOverlayRef = useRef<HTMLImageElement | null>(null);
  
  // Lighting controls
  const [lighting, setLighting] = useState<LightingSettings>({
    ambient: 1.2,  // Increased from 0.8 for brighter colors
    front: 0.8,    // Increased from 0.6
    top: 0.4,      // Increased from 0.3
    warmth: 0.3,   // Slight warm tint to match kraft paper
    keyAngle: 45,  // 45 degrees from front-right
    keyHeight: 30, // 30 degrees above horizontal
    keyDistance: 2, // Distance from center
  });
  
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

    applyKraftBase(ctx, LABEL_WIDTH, LABEL_HEIGHT);

    ctx.globalCompositeOperation = 'multiply';

    if (mode === 'upload' && uploadedLabel) {
      const scale = Math.min(LABEL_WIDTH / uploadedLabel.width, LABEL_HEIGHT / uploadedLabel.height);
      const w = uploadedLabel.width * scale;
      const h = uploadedLabel.height * scale;
      ctx.drawImage(uploadedLabel, (LABEL_WIDTH - w) / 2, (LABEL_HEIGHT - h) / 2, w, h);
    } else {
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
          ctx.font = `bold ${el.fontSize || 32}px ${el.font || 'Arial Black'}`;
          ctx.fillStyle = el.color || '#1a1a1a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(el.content, 0, 0);
        }

        ctx.restore();
      });
    }

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
        ctx.scale(selected.scale, selected.scale);
        
        let w = 100, h = 50;
        if (selected.type === 'logo' && selected.image) {
          w = selected.image.width;
          h = selected.image.height;
        } else if (selected.type === 'text') {
          ctx.font = `bold ${selected.fontSize || 32}px ${selected.font || 'Arial Black'}`;
          const metrics = ctx.measureText(selected.content);
          w = metrics.width + 20;
          h = (selected.fontSize || 32) + 20;
        }
        
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / selected.scale;
        ctx.strokeRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10);
        
        ctx.restore();
      }
    }
  }, [elements, selectedId, mode, uploadedLabel, applyKraftBase, showBleedOverlay, bleedOverlayLoaded]);

  const createLabelTexture = useCallback((): THREE.CanvasTexture => {
    // First create the flat label canvas
    const flatCanvas = document.createElement('canvas');
    flatCanvas.width = LABEL_WIDTH;
    flatCanvas.height = LABEL_HEIGHT;
    const flatCtx = flatCanvas.getContext('2d')!;

    applyKraftBase(flatCtx, LABEL_WIDTH, LABEL_HEIGHT);
    flatCtx.globalCompositeOperation = 'multiply';

    if (mode === 'upload' && uploadedLabel) {
      const scale = Math.min(LABEL_WIDTH / uploadedLabel.width, LABEL_HEIGHT / uploadedLabel.height);
      const w = uploadedLabel.width * scale;
      const h = uploadedLabel.height * scale;
      flatCtx.drawImage(uploadedLabel, (LABEL_WIDTH - w) / 2, (LABEL_HEIGHT - h) / 2, w, h);
    } else {
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
          flatCtx.font = `bold ${el.fontSize || 32}px ${el.font || 'Arial Black'}`;
          flatCtx.fillStyle = el.color || '#1a1a1a';
          flatCtx.textAlign = 'center';
          flatCtx.textBaseline = 'middle';
          flatCtx.fillText(el.content, 0, 0);
        }

        flatCtx.restore();
      });
    }

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
  }, [elements, mode, uploadedLabel, applyKraftBase, textureMapping, labelRotation]);

  useEffect(() => {
    drawFlatLabel();
  }, [drawFlatLabel]);

  useEffect(() => {
    const container = threeContainerRef.current;
    if (!container) return;

    const width = 300;
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
      
      let w = 100, h = 50;
      if (el.type === 'logo' && el.image) {
        w = el.image.width * el.scale;
        h = el.image.height * el.scale;
      } else if (el.type === 'text') {
        w = 200 * el.scale;
        h = (el.fontSize || 32) * el.scale;
      }
      
      if (x >= el.x - w/2 && x <= el.x + w/2 && y >= el.y - h/2 && y <= el.y + h/2) {
        found = el.id;
        break;
      }
    }
    setSelectedId(found);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedId) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = LABEL_WIDTH / rect.width;
    const scaleY = LABEL_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const selected = elements.find(el => el.id === selectedId);
    if (selected) {
      setIsDragging(true);
      setDragOffset({ x: x - selected.x, y: y - selected.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = LABEL_WIDTH / rect.width;
    const scaleY = LABEL_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setElements(prev => prev.map(el => 
      el.id === selectedId 
        ? { ...el, x: x - dragOffset.x, y: y - dragOffset.y }
        : el
    ));
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const newElement: LabelElement = {
            id: `logo-${Date.now()}`,
            type: 'logo',
            x: LABEL_WIDTH / 2,
            y: LABEL_HEIGHT / 2,
            rotation: 0,
            scale: Math.min(200 / img.width, 200 / img.height),
            content: '',
            visible: true,
            image: img,
          };
          setElements(prev => [...prev, newElement]);
          setSelectedId(newElement.id);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLabelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          setUploadedLabel(img);
          setMode('upload');
        };
        img.src = event.target?.result as string;
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
      font: 'Arial Black',
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
    setUploadedLabel(null);
    setMode('build');
    setLabelRotation(0);
    // viewRotation stays locked at 115° for correct tilt alignment
  };

  const handleDownload = () => {
    const container = threeContainerRef.current;
    if (!container) return;
    
    const downloadCanvas = document.createElement('canvas');
    downloadCanvas.width = 300;
    downloadCanvas.height = 500;
    const downloadCtx = downloadCanvas.getContext('2d')!;
    
    downloadCtx.fillStyle = '#e8dcc8';
    downloadCtx.fillRect(0, 0, 300, 500);
    
    const threeCanvas = container.querySelector('canvas');
    if (threeCanvas) {
      downloadCtx.drawImage(threeCanvas, 0, 0);
    }
    
    const overlayImg = new window.Image();
    overlayImg.crossOrigin = 'anonymous';
    overlayImg.onload = () => {
      downloadCtx.drawImage(overlayImg, 0, 0, 300, 500);
      const link = document.createElement('a');
      link.download = 'hemp-wick-mockup.png';
      link.href = downloadCanvas.toDataURL('image/png');
      link.click();
    };
    overlayImg.src = hempClearUrl;
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Hemp Wick Label Designer</h1>
        <p className="text-muted-foreground">Design your label and preview how it wraps around the product</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg">Flat Label Design</CardTitle>
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
          <CardContent className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'build' | 'upload')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="build" data-testid="tab-build">
                  <Type className="h-4 w-4 mr-2" />
                  Build Label
                </TabsTrigger>
                <TabsTrigger value="upload" data-testid="tab-upload">
                  <Image className="h-4 w-4 mr-2" />
                  Upload Label
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="build" className="space-y-3">
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
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />

                {elements.length > 0 && (
                  <div className="border rounded-lg">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
                      <Layers className="h-4 w-4" />
                      <span className="text-sm font-medium">Layers ({elements.length})</span>
                    </div>
                    <ScrollArea className="max-h-40">
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
              </TabsContent>
              
              <TabsContent value="upload" className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => labelInputRef.current?.click()}
                  data-testid="button-upload-label"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadedLabel ? 'Change Label Image' : 'Upload Complete Label'}
                </Button>
                <input
                  ref={labelInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLabelUpload}
                />
                <p className="text-xs text-muted-foreground">
                  Upload a pre-designed label image (recommended: ~630×600px)
                </p>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Canvas (60mm × 80mm)</span>
              <Button
                size="sm"
                variant={showBleedOverlay ? "default" : "outline"}
                onClick={() => setShowBleedOverlay(!showBleedOverlay)}
                data-testid="button-toggle-bleed"
              >
                {showBleedOverlay ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                Bleed Guide
              </Button>
            </div>

            <div 
              className="relative border rounded-lg overflow-hidden bg-muted"
              style={{ aspectRatio: `${LABEL_WIDTH}/${LABEL_HEIGHT}` }}
            >
              <canvas
                ref={canvasRef}
                width={LABEL_WIDTH}
                height={LABEL_HEIGHT}
                className="w-full h-full cursor-move"
                onClick={handleCanvasClick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                data-testid="canvas-label"
              />
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Click to select, drag to move • Click "Add Text" for more text lines
            </p>

            {selectedElement && mode === 'build' && (
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
                      <AlignLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => updateElement(selectedId!, { x: LABEL_WIDTH / 2 })}
                      title="Center Horizontal"
                      data-testid="button-align-center-h"
                    >
                      <AlignCenterHorizontal className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => updateElement(selectedId!, { x: LABEL_WIDTH - 50 })}
                      title="Align Right"
                      data-testid="button-align-right"
                    >
                      <AlignRight className="w-4 h-4" />
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
                      <AlignStartVertical className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => updateElement(selectedId!, { y: LABEL_HEIGHT / 2 })}
                      title="Center Vertical"
                      data-testid="button-align-center-v"
                    >
                      <AlignCenterVertical className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => updateElement(selectedId!, { y: LABEL_HEIGHT - 50 })}
                      title="Align Bottom"
                      data-testid="button-align-bottom"
                    >
                      <AlignEndVertical className="w-4 h-4" />
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
                      <Label className="text-xs w-14">Color:</Label>
                      <Popover>
                        <PopoverTrigger asChild>
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
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3" align="start">
                          <HexColorPicker
                            color={selectedElement.color || '#1a1a1a'}
                            onChange={(color) => updateElement(selectedId!, { color })}
                          />
                          <Input
                            value={selectedElement.color || '#1a1a1a'}
                            onChange={(e) => updateElement(selectedId!, { color: e.target.value })}
                            className="mt-2 font-mono text-sm"
                            placeholder="#000000"
                            data-testid="input-color-hex"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-xs w-14">Size:</Label>
                      <Slider
                        value={[selectedElement.fontSize || 32]}
                        onValueChange={([v]) => updateElement(selectedId!, { fontSize: v })}
                        min={12}
                        max={80}
                        step={2}
                        className="flex-1"
                        data-testid="slider-text-size"
                      />
                      <span className="text-xs w-10 text-right">{selectedElement.fontSize}px</span>
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
            )}

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Kraft Paper Printing:</strong> Colors blend with the brown paper. 
                White areas become paper color (no white ink).
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg">Product Preview</CardTitle>
              <Button
                size="icon"
                variant="outline"
                onClick={handleDownload}
                data-testid="button-download"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="relative w-full flex items-center justify-center rounded-lg overflow-hidden"
              style={{ 
                background: '#e8dcc8',
                height: '500px',
              }}
              data-testid="container-preview"
            >
              <img 
                src={hempClearUrl}
                alt="Hemp wick overlay"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{ zIndex: 1 }}
              />
              <div 
                ref={threeContainerRef}
                className="absolute inset-0"
                style={{ zIndex: 2 }}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Rotate View: {labelRotation}°</Label>
              </div>
              <Slider
                value={[labelRotation]}
                onValueChange={([v]) => setLabelRotation(v)}
                min={0}
                max={720}
                step={5}
                data-testid="slider-view-rotation"
              />
              <p className="text-xs text-muted-foreground text-center">
                Slide to rotate and see your label from all angles
              </p>
            </div>

            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-medium">Lighting Controls</Label>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Ambient: {lighting.ambient.toFixed(1)}</Label>
                  </div>
                  <Slider
                    value={[lighting.ambient * 10]}
                    onValueChange={([v]) => setLighting(l => ({ ...l, ambient: v / 10 }))}
                    min={0}
                    max={30}
                    step={1}
                    data-testid="slider-ambient"
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Front Light: {lighting.front.toFixed(1)}</Label>
                  </div>
                  <Slider
                    value={[lighting.front * 10]}
                    onValueChange={([v]) => setLighting(l => ({ ...l, front: v / 10 }))}
                    min={0}
                    max={20}
                    step={1}
                    data-testid="slider-front-light"
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Top Light: {lighting.top.toFixed(1)}</Label>
                  </div>
                  <Slider
                    value={[lighting.top * 10]}
                    onValueChange={([v]) => setLighting(l => ({ ...l, top: v / 10 }))}
                    min={0}
                    max={20}
                    step={1}
                    data-testid="slider-top-light"
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Warmth: {lighting.warmth > 0 ? `+${lighting.warmth.toFixed(1)}` : lighting.warmth.toFixed(1)}</Label>
                  </div>
                  <Slider
                    value={[lighting.warmth * 10]}
                    onValueChange={([v]) => setLighting(l => ({ ...l, warmth: v / 10 }))}
                    min={-10}
                    max={10}
                    step={1}
                    data-testid="slider-warmth"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Cool (blue) ← → Warm (yellow)
                  </p>
                </div>
                
                <div className="border-t pt-3 mt-3">
                  <Label className="text-xs font-medium text-muted-foreground">Key Light Position</Label>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Angle: {lighting.keyAngle}°</Label>
                  </div>
                  <Slider
                    value={[lighting.keyAngle]}
                    onValueChange={([v]) => setLighting(l => ({ ...l, keyAngle: v }))}
                    min={0}
                    max={360}
                    step={5}
                    data-testid="slider-key-angle"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    0° = Front, 90° = Right, 180° = Back, 270° = Left
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Height: {lighting.keyHeight}°</Label>
                  </div>
                  <Slider
                    value={[lighting.keyHeight]}
                    onValueChange={([v]) => setLighting(l => ({ ...l, keyHeight: v }))}
                    min={-45}
                    max={90}
                    step={5}
                    data-testid="slider-key-height"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    -45° = Below, 0° = Eye level, 90° = Above
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Distance: {lighting.keyDistance.toFixed(1)}</Label>
                  </div>
                  <Slider
                    value={[lighting.keyDistance * 10]}
                    onValueChange={([v]) => setLighting(l => ({ ...l, keyDistance: v / 10 }))}
                    min={5}
                    max={50}
                    step={1}
                    data-testid="slider-key-distance"
                  />
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setLighting({ 
                    ambient: 1.2, 
                    front: 0.8, 
                    top: 0.4, 
                    warmth: 0.3,
                    keyAngle: 45,
                    keyHeight: 30,
                    keyDistance: 2,
                  })}
                  data-testid="button-reset-lighting"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset Lighting
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
