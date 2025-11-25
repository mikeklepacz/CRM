import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Download, Upload, RotateCcw, Play, Pause } from 'lucide-react';

const FONTS = [
  { value: 'Arial Black, sans-serif', label: 'Arial Black' },
  { value: 'Impact, sans-serif', label: 'Impact' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
];

const DEFAULT_LINES = [
  { text: 'YOUR BRAND', fontSize: 48, font: 'Arial Black, sans-serif' },
  { text: 'Hemp Wick', fontSize: 32, font: 'Georgia, serif' },
  { text: '20 Feet', fontSize: 24, font: 'Arial Black, sans-serif' },
  { text: 'Natural Hemp & Beeswax', fontSize: 16, font: 'Verdana, sans-serif' },
];

interface TextLine {
  text: string;
  fontSize: number;
  font: string;
}

export default function ProductMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cylinderRef = useRef<THREE.Mesh | null>(null);
  const labelTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const animationRef = useRef<number | null>(null);

  const [textLines, setTextLines] = useState<TextLine[]>(DEFAULT_LINES);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [logoScale, setLogoScale] = useState(100);
  const [logoY, setLogoY] = useState(50);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Create kraft paper texture with grain
  const createKraftTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base kraft color
    ctx.fillStyle = '#c4a574';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add paper grain/noise
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 30;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    // Add some subtle fiber lines
    ctx.strokeStyle = 'rgba(139, 119, 101, 0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 100; i++) {
      ctx.beginPath();
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20);
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }, []);

  // Create hemp wick texture for the ends
  const createHempTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Base hemp color
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add rope-like texture
    ctx.strokeStyle = '#a08060';
    ctx.lineWidth = 2;
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      const y = (i / 50) * canvas.height;
      ctx.moveTo(0, y);
      for (let x = 0; x < canvas.width; x += 10) {
        ctx.lineTo(x, y + Math.sin(x * 0.1) * 3);
      }
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }, []);

  // Create label texture with multiply blend effect
  const createLabelTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Start with kraft paper base
    ctx.fillStyle = '#c4a574';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add paper grain
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    // Apply multiply blend mode for all content
    ctx.globalCompositeOperation = 'multiply';

    // Draw logo if exists
    if (logoImage) {
      const scale = logoScale / 100;
      const logoWidth = Math.min(logoImage.width * scale, canvas.width * 0.8);
      const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
      const logoX = (canvas.width - logoWidth) / 2;
      const logoYPos = (logoY / 100) * (canvas.height - logoHeight);
      
      ctx.drawImage(logoImage, logoX, logoYPos, logoWidth, logoHeight);
    }

    // Draw text lines
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1a1a1a';

    let currentY = logoImage ? (logoY / 100) * canvas.height + 120 : 80;
    
    textLines.forEach((line) => {
      if (line.text.trim()) {
        ctx.font = `bold ${line.fontSize}px ${line.font}`;
        ctx.fillText(line.text, canvas.width / 2, currentY);
        currentY += line.fontSize * 1.4;
      }
    });

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, [textLines, logoImage, logoScale, logoY]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || isInitialized) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 500;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f5f0e8');
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-5, 3, -5);
    scene.add(backLight);

    // Create cylinder (20mm x 60mm ratio = 3:1 height:diameter)
    const radius = 0.5;
    const height_val = 3.0; // diameter = 1, height = 3, ratio = 3:1

    // Main body with label
    const bodyGeometry = new THREE.CylinderGeometry(radius, radius, height_val, 64, 1, true);
    const labelTexture = createLabelTexture();
    labelTextureRef.current = labelTexture;
    
    const bodyMaterial = new THREE.MeshStandardMaterial({
      map: labelTexture,
      roughness: 0.7,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    cylinderRef.current = body;
    scene.add(body);

    // Top cap with hemp texture
    const hempTexture = createHempTexture();
    const capMaterial = new THREE.MeshStandardMaterial({
      map: hempTexture,
      roughness: 0.9,
      metalness: 0,
    });

    const topCapGeometry = new THREE.CircleGeometry(radius, 64);
    const topCap = new THREE.Mesh(topCapGeometry, capMaterial);
    topCap.rotation.x = -Math.PI / 2;
    topCap.position.y = height_val / 2;
    scene.add(topCap);

    const bottomCapGeometry = new THREE.CircleGeometry(radius, 64);
    const bottomCap = new THREE.Mesh(bottomCapGeometry, capMaterial);
    bottomCap.rotation.x = Math.PI / 2;
    bottomCap.position.y = -height_val / 2;
    scene.add(bottomCap);

    // Add wick coming out of top
    const wickGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 16);
    const wickMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 1,
    });
    const wick = new THREE.Mesh(wickGeometry, wickMaterial);
    wick.position.y = height_val / 2 + 0.15;
    wick.position.x = 0.1;
    wick.rotation.z = Math.PI / 8;
    scene.add(wick);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight || 500;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    setIsInitialized(true);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [createKraftTexture, createHempTexture, createLabelTexture, isInitialized]);

  // Update label texture when content changes
  useEffect(() => {
    if (!cylinderRef.current || !isInitialized) return;

    const newTexture = createLabelTexture();
    (cylinderRef.current.material as THREE.MeshStandardMaterial).map = newTexture;
    (cylinderRef.current.material as THREE.MeshStandardMaterial).needsUpdate = true;
    
    if (labelTextureRef.current) {
      labelTextureRef.current.dispose();
    }
    labelTextureRef.current = newTexture;
  }, [textLines, logoImage, logoScale, logoY, createLabelTexture, isInitialized]);

  // Toggle auto-rotation
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotating;
    }
  }, [isAutoRotating]);

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setLogoImage(img);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Update text line
  const updateTextLine = (index: number, field: keyof TextLine, value: string | number) => {
    setTextLines(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Reset to defaults
  const handleReset = () => {
    setTextLines(DEFAULT_LINES);
    setLogoImage(null);
    setLogoScale(100);
    setLogoY(50);
  };

  // Download mockup
  const handleDownload = () => {
    if (!rendererRef.current) return;
    
    const link = document.createElement('a');
    link.download = 'hemp-wick-mockup.png';
    link.href = rendererRef.current.domElement.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Product Mockup Generator</h1>
        <p className="text-muted-foreground">Customize your hemp wick label and preview it in 3D</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3D Viewer */}
        <Card className="order-1 lg:order-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">3D Preview</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setIsAutoRotating(!isAutoRotating)}
                  data-testid="button-toggle-rotation"
                >
                  {isAutoRotating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleDownload}
                  data-testid="button-download"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              ref={containerRef} 
              className="w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden bg-[#f5f0e8]"
              data-testid="container-3d-viewer"
            />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Drag to rotate • Scroll to zoom • Colors simulate printing on kraft paper
            </p>
          </CardContent>
        </Card>

        {/* Customization Panel */}
        <Card className="order-2 lg:order-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">Customize Label</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                data-testid="button-reset"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Logo (PNG with transparency recommended)</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  data-testid="button-upload-logo"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {logoImage ? 'Change Logo' : 'Upload Logo'}
                </Button>
                {logoImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogoImage(null)}
                    data-testid="button-remove-logo"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <input
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
                data-testid="input-logo-upload"
              />
              
              {logoImage && (
                <div className="space-y-3 pl-2 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label className="text-xs">Logo Size: {logoScale}%</Label>
                    <Slider
                      value={[logoScale]}
                      onValueChange={([val]) => setLogoScale(val)}
                      min={20}
                      max={200}
                      step={5}
                      data-testid="slider-logo-scale"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Vertical Position: {logoY}%</Label>
                    <Slider
                      value={[logoY]}
                      onValueChange={([val]) => setLogoY(val)}
                      min={0}
                      max={100}
                      step={5}
                      data-testid="slider-logo-position"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Text Lines */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Text Lines</Label>
              {textLines.map((line, index) => (
                <div key={index} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex gap-2">
                    <Input
                      value={line.text}
                      onChange={(e) => updateTextLine(index, 'text', e.target.value)}
                      placeholder={`Line ${index + 1}`}
                      className="flex-1"
                      data-testid={`input-text-line-${index}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={line.font}
                      onValueChange={(val) => updateTextLine(index, 'font', val)}
                    >
                      <SelectTrigger className="flex-1" data-testid={`select-font-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONTS.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Label className="text-xs whitespace-nowrap">Size:</Label>
                      <Slider
                        value={[line.fontSize]}
                        onValueChange={([val]) => updateTextLine(index, 'fontSize', val)}
                        min={12}
                        max={72}
                        step={2}
                        className="flex-1"
                        data-testid={`slider-font-size-${index}`}
                      />
                      <span className="text-xs w-6">{line.fontSize}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Info */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Colors are blended with the kraft paper to simulate actual printing. 
                White areas become the paper color since we print without white ink.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
