import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, Upload, RotateCcw, Image, Type, Move, Palette } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';

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
  image?: HTMLImageElement;
}

interface ThreeContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cylinder: THREE.Mesh;
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
  const [cylinderRotation, setCylinderRotation] = useState(0);
  const [uploadedLabel, setUploadedLabel] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<'build' | 'upload'>('build');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
      elements.forEach(el => {
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
      if (selected) {
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

  const createCylinderTexture = useCallback((): THREE.CanvasTexture => {
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
      elements.forEach(el => {
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

    const rect = container.getBoundingClientRect();
    const width = rect.width || 400;
    const height = rect.height || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f5f0e8');

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-5, 3, -5);
    scene.add(backLight);

    const radius = 0.5;
    const heightVal = 3.0;

    const labelTexture = createCylinderTexture();
    const bodyGeometry = new THREE.CylinderGeometry(radius, radius, heightVal, 64, 1, true);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      map: labelTexture,
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const cylinder = new THREE.Mesh(bodyGeometry, bodyMaterial);
    scene.add(cylinder);

    const hempCanvas = document.createElement('canvas');
    hempCanvas.width = 256;
    hempCanvas.height = 256;
    const hempCtx = hempCanvas.getContext('2d')!;
    hempCtx.fillStyle = '#8b7355';
    hempCtx.fillRect(0, 0, 256, 256);
    
    for (let i = 0; i < 40; i++) {
      hempCtx.strokeStyle = i % 2 === 0 ? '#9a8265' : '#7a6345';
      hempCtx.lineWidth = 4;
      hempCtx.beginPath();
      const y = (i / 40) * 256;
      hempCtx.moveTo(0, y);
      for (let x = 0; x < 256; x += 8) {
        hempCtx.lineTo(x, y + Math.sin(x * 0.05 + i) * 2);
      }
      hempCtx.stroke();
    }
    const hempTexture = new THREE.CanvasTexture(hempCanvas);

    const capMaterial = new THREE.MeshStandardMaterial({
      map: hempTexture,
      roughness: 0.95,
      metalness: 0,
    });

    const topCapGeometry = new THREE.CircleGeometry(radius, 64);
    const topCap = new THREE.Mesh(topCapGeometry, capMaterial);
    topCap.rotation.x = -Math.PI / 2;
    topCap.position.y = heightVal / 2;
    scene.add(topCap);

    const bottomCapGeometry = new THREE.CircleGeometry(radius, 64);
    const bottomCap = new THREE.Mesh(bottomCapGeometry, capMaterial);
    bottomCap.rotation.x = Math.PI / 2;
    bottomCap.position.y = -heightVal / 2;
    scene.add(bottomCap);

    const wickGeometry = new THREE.CylinderGeometry(0.02, 0.015, 0.5, 12);
    const wickMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b5344,
      roughness: 1,
    });
    const wick = new THREE.Mesh(wickGeometry, wickMaterial);
    wick.position.y = heightVal / 2 + 0.2;
    wick.position.x = 0.12;
    wick.rotation.z = Math.PI / 7;
    scene.add(wick);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const newRect = container.getBoundingClientRect();
      const newWidth = newRect.width || 400;
      const newHeight = newRect.height || 400;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    threeContextRef.current = {
      scene,
      camera,
      renderer,
      cylinder,
      animationId,
    };

    return () => {
      window.removeEventListener('resize', handleResize);
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
    if (!ctx) return;

    const newTexture = createCylinderTexture();
    const material = ctx.cylinder.material as THREE.MeshStandardMaterial;
    if (material.map) {
      material.map.dispose();
    }
    material.map = newTexture;
    material.needsUpdate = true;
  }, [createCylinderTexture]);

  useEffect(() => {
    const ctx = threeContextRef.current;
    if (!ctx) return;
    ctx.cylinder.rotation.y = (cylinderRotation * Math.PI) / 180;
  }, [cylinderRotation]);

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
    const newElement: LabelElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: LABEL_WIDTH / 2,
      y: LABEL_HEIGHT / 2,
      rotation: 0,
      scale: 1,
      content: 'Your Text',
      font: 'Arial Black',
      fontSize: 36,
      color: '#1a1a1a',
    };
    setElements(prev => [...prev, newElement]);
    setSelectedId(newElement.id);
  };

  const updateSelectedElement = (updates: Partial<LabelElement>) => {
    if (!selectedId) return;
    setElements(prev => prev.map(el => 
      el.id === selectedId ? { ...el, ...updates } : el
    ));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setElements(prev => prev.filter(el => el.id !== selectedId));
    setSelectedId(null);
  };

  const handleReset = () => {
    setElements([]);
    setSelectedId(null);
    setUploadedLabel(null);
    setMode('build');
    setCylinderRotation(0);
  };

  const handleDownload = () => {
    const ctx = threeContextRef.current;
    if (!ctx) return;
    
    const link = document.createElement('a');
    link.download = 'hemp-wick-mockup.png';
    link.href = ctx.renderer.domElement.toDataURL('image/png');
    link.click();
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
              <div className="flex gap-2">
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
                    variant="outline"
                    onClick={addTextElement}
                    data-testid="button-add-text"
                  >
                    <Type className="h-4 w-4 mr-1" />
                    Add Text
                  </Button>
                  {selectedId && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={deleteSelected}
                      data-testid="button-delete"
                    >
                      Delete
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
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
              Label size: ~63mm × 60mm (circumference × height) • Click to select, drag to move
            </p>

            {selectedElement && mode === 'build' && (
              <div className="p-3 bg-muted rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Move className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Selected: {selectedElement.type}</span>
                </div>
                
                {selectedElement.type === 'text' && (
                  <div className="space-y-3">
                    <Input
                      value={selectedElement.content}
                      onChange={(e) => updateSelectedElement({ content: e.target.value })}
                      placeholder="Enter text"
                      data-testid="input-text-content"
                    />
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-xs w-16">Color:</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2"
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
                            onChange={(color) => updateSelectedElement({ color })}
                          />
                          <Input
                            value={selectedElement.color || '#1a1a1a'}
                            onChange={(e) => updateSelectedElement({ color: e.target.value })}
                            className="mt-2 font-mono text-sm"
                            placeholder="#000000"
                            data-testid="input-color-hex"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-xs w-16">Size:</Label>
                      <Slider
                        value={[selectedElement.fontSize || 32]}
                        onValueChange={([v]) => updateSelectedElement({ fontSize: v })}
                        min={12}
                        max={80}
                        step={2}
                        className="flex-1"
                        data-testid="slider-text-size"
                      />
                      <span className="text-xs w-8">{selectedElement.fontSize}px</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-16">Scale:</Label>
                  <Slider
                    value={[selectedElement.scale * 100]}
                    onValueChange={([v]) => updateSelectedElement({ scale: v / 100 })}
                    min={10}
                    max={300}
                    step={5}
                    className="flex-1"
                    data-testid="slider-scale"
                  />
                  <span className="text-xs w-8">{Math.round(selectedElement.scale * 100)}%</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-16">Rotate:</Label>
                  <Slider
                    value={[selectedElement.rotation]}
                    onValueChange={([v]) => updateSelectedElement({ rotation: v })}
                    min={0}
                    max={360}
                    step={5}
                    className="flex-1"
                    data-testid="slider-rotation"
                  />
                  <span className="text-xs w-8">{selectedElement.rotation}°</span>
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
              <CardTitle className="text-lg">3D Wrapped Preview</CardTitle>
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
              ref={threeContainerRef} 
              className="w-full h-[350px] rounded-lg overflow-hidden"
              style={{ background: '#f5f0e8' }}
              data-testid="container-3d-viewer"
            />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Rotate View: {cylinderRotation}°</Label>
              </div>
              <Slider
                value={[cylinderRotation]}
                onValueChange={([v]) => setCylinderRotation(v)}
                min={0}
                max={360}
                step={5}
                data-testid="slider-cylinder-rotation"
              />
              <p className="text-xs text-muted-foreground text-center">
                Slide to rotate the product and see your label from all angles
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[0, 90, 180, 270].map(angle => (
                <Button
                  key={angle}
                  size="sm"
                  variant={cylinderRotation === angle ? 'default' : 'outline'}
                  onClick={() => setCylinderRotation(angle)}
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
