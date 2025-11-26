import { useEffect, useRef, useState, useCallback } from 'react';
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
import { Download, Upload, RotateCcw, Image, Type, Move, Palette, Plus, Trash2, Eye, EyeOff, Layers, ChevronUp, ChevronDown } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import hempClearUrl from '@assets/Hemp-Clear_1764119084551.png';

const LABEL_WIDTH = 628;
const LABEL_HEIGHT = 600;
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
  animationId: number;
}

export default function ProductMockup() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const threeContextRef = useRef<ThreeContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  
  const [elements, setElements] = useState<LabelElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewRotation, setViewRotation] = useState(120);
  const [uploadedLabel, setUploadedLabel] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<'build' | 'upload'>('build');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [cylinderLoaded, setCylinderLoaded] = useState(false);

  const generateKraftTexture = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#c4a574';
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
  }, []);

  const drawFlatLabel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    generateKraftTexture(ctx, LABEL_WIDTH, LABEL_HEIGHT);

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

    ctx.fillStyle = 'rgba(255, 100, 100, 0.15)';
    ctx.fillRect(0, 0, LABEL_WIDTH, OVERLAP_HEIGHT);
    
    ctx.setLineDash([8, 4]);
    ctx.strokeStyle = 'rgba(200, 50, 50, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, OVERLAP_HEIGHT);
    ctx.lineTo(LABEL_WIDTH, OVERLAP_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(200, 50, 50, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('OVERLAP ZONE - Gets covered when wrapped', LABEL_WIDTH / 2, OVERLAP_HEIGHT / 2);

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
  }, [elements, selectedId, mode, uploadedLabel, generateKraftTexture]);

  const createLabelTexture = useCallback((): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = LABEL_HEIGHT;
    canvas.height = LABEL_WIDTH;
    const ctx = canvas.getContext('2d')!;

    ctx.save();
    ctx.translate(LABEL_HEIGHT / 2, LABEL_WIDTH / 2);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-LABEL_WIDTH / 2, -LABEL_HEIGHT / 2);

    generateKraftTexture(ctx, LABEL_WIDTH, LABEL_HEIGHT);
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
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }, [elements, mode, uploadedLabel, generateKraftTexture]);

  useEffect(() => {
    drawFlatLabel();
  }, [drawFlatLabel]);

  useEffect(() => {
    const container = threeContainerRef.current;
    if (!container) return;

    const width = 300;
    const height = 500;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0.12);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 0.6);
    frontLight.position.set(0, 0, 1);
    scene.add(frontLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.3);
    topLight.position.set(0, 1, 0.5);
    scene.add(topLight);

    let cylinder: THREE.Mesh | null = null;
    
    const loader = new OBJLoader();
    loader.load(
      '/attached_assets/HempWick Roll Object_1764118046566.obj',
      (obj) => {
        const geometry = (obj.children[0] as THREE.Mesh).geometry;
        
        const labelTexture = createLabelTexture();
        const material = new THREE.MeshStandardMaterial({
          map: labelTexture,
          roughness: 0.7,
          metalness: 0.05,
        });
        
        cylinder = new THREE.Mesh(geometry, material);
        cylinder.rotation.x = Math.PI / 2;
        cylinder.rotation.y = (120 * Math.PI) / 180;
        cylinder.position.y = 0;
        scene.add(cylinder);
        
        threeContextRef.current = {
          scene,
          camera,
          renderer,
          cylinder,
          animationId: 0,
        };
        
        setCylinderLoaded(true);
      },
      undefined,
      (error) => {
        console.error('Error loading OBJ:', error);
        const geometry = new THREE.CylinderGeometry(0.01, 0.01, 0.052, 64, 1, true);
        const labelTexture = createLabelTexture();
        const material = new THREE.MeshStandardMaterial({
          map: labelTexture,
          roughness: 0.7,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
        
        cylinder = new THREE.Mesh(geometry, material);
        scene.add(cylinder);
        
        threeContextRef.current = {
          scene,
          camera,
          renderer,
          cylinder,
          animationId: 0,
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
      animationId,
    };

    return () => {
      cancelAnimationFrame(animationId);
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

    const newTexture = createLabelTexture();
    const material = ctx.cylinder.material as THREE.MeshStandardMaterial;
    if (material.map) {
      material.map.dispose();
    }
    material.map = newTexture;
    material.needsUpdate = true;
  }, [createLabelTexture, cylinderLoaded]);

  useEffect(() => {
    const ctx = threeContextRef.current;
    if (!ctx || !ctx.cylinder) return;
    ctx.cylinder.rotation.y = (viewRotation * Math.PI) / 180;
  }, [viewRotation, cylinderLoaded]);

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
    setViewRotation(120);
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
                
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-14">Scale:</Label>
                  <Slider
                    value={[selectedElement.scale * 100]}
                    onValueChange={([v]) => updateElement(selectedId!, { scale: v / 100 })}
                    min={10}
                    max={300}
                    step={5}
                    className="flex-1"
                    data-testid="slider-scale"
                  />
                  <span className="text-xs w-10 text-right">{Math.round(selectedElement.scale * 100)}%</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-14">Rotate:</Label>
                  <Slider
                    value={[selectedElement.rotation]}
                    onValueChange={([v]) => updateElement(selectedId!, { rotation: v })}
                    min={0}
                    max={360}
                    step={5}
                    className="flex-1"
                    data-testid="slider-rotation"
                  />
                  <span className="text-xs w-10 text-right">{selectedElement.rotation}°</span>
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
              <div 
                ref={threeContainerRef}
                className="absolute inset-0 flex items-center justify-center"
                style={{ zIndex: 1 }}
              />
              <img 
                src={hempClearUrl}
                alt="Hemp wick overlay"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{ zIndex: 2 }}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Rotate View: {viewRotation}°</Label>
              </div>
              <Slider
                value={[viewRotation]}
                onValueChange={([v]) => setViewRotation(v)}
                min={0}
                max={360}
                step={5}
                data-testid="slider-view-rotation"
              />
              <p className="text-xs text-muted-foreground text-center">
                Slide to rotate and see your label from all angles
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[0, 90, 180, 270].map(angle => (
                <Button
                  key={angle}
                  size="sm"
                  variant={viewRotation === angle ? 'default' : 'outline'}
                  onClick={() => setViewRotation(angle)}
                  data-testid={`button-angle-${angle}`}
                >
                  {angle}°
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
