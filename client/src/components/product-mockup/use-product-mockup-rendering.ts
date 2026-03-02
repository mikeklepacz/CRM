import { useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { configureLabelCanvasTexture } from '@/lib/label-designer-render-color';
import { LABEL_HEIGHT, LABEL_WIDTH } from '@/components/product-mockup/product-mockup-constants';
import { useProductMockupThreeScene } from '@/components/product-mockup/use-product-mockup-three-scene';
import type { LabelElement, LightingSettings, TextureMapping, ThreeContext, CylinderPos } from '@/components/product-mockup/product-mockup.types';

type Props = {
  bleedOverlayLoaded: boolean;
  bleedOverlayRef: React.MutableRefObject<HTMLImageElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  cylinderLoaded: boolean;
  cylinderPos: CylinderPos;
  elements: LabelElement[];
  labelRotation: number;
  lighting: LightingSettings;
  selectedId: string | null;
  setCylinderLoaded: (loaded: boolean) => void;
  showBleedOverlay: boolean;
  showKraftEffect: boolean;
  textureMapping: TextureMapping;
  textureUpdateTimerRef: React.MutableRefObject<number | null>;
  threeContainerRef: React.RefObject<HTMLDivElement>;
  threeContextRef: React.MutableRefObject<ThreeContext | null>;
  viewRotation: number;
};

export function useProductMockupRendering(props: Props) {
  const generateKraftBase = useCallback((width: number, height: number): ImageData => {
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
    for (let i = 0; i < 100; i += 1) {
      ctx.beginPath();
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
      ctx.stroke();
    }

    return ctx.getImageData(0, 0, width, height);
  }, []);

  const applyKraftBase = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const baseData = generateKraftBase(width, height);
    ctx.putImageData(baseData, 0, 0);
  }, [generateKraftBase]);

  const drawFlatLabel = useCallback(() => {
    const canvas = props.canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (props.showKraftEffect) {
      applyKraftBase(ctx, LABEL_WIDTH, LABEL_HEIGHT);
      ctx.globalCompositeOperation = 'multiply';
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);
    }

    props.elements.filter((el) => el.visible !== false).forEach((el) => {
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

    if (props.showBleedOverlay && props.bleedOverlayRef.current) {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(props.bleedOverlayRef.current, 0, 0, LABEL_WIDTH, LABEL_HEIGHT);
      ctx.globalAlpha = 1.0;
    }

    if (props.selectedId) {
      const selected = props.elements.find((el) => el.id === props.selectedId);
      if (selected && selected.visible !== false) {
        ctx.save();
        ctx.translate(selected.x, selected.y);
        ctx.rotate((selected.rotation * Math.PI) / 180);

        let w = 100;
        let h = 50;
        if (selected.type === 'logo' && selected.image) {
          w = selected.image.width * selected.scale;
          h = selected.image.height * selected.scale;
        } else if (selected.type === 'text') {
          ctx.font = `bold ${selected.fontSize || 32}px ${selected.font || 'Arial Black'}`;
          const metrics = ctx.measureText(selected.content);
          w = (metrics.width + 20) * selected.scale;
          h = ((selected.fontSize || 32) + 20) * selected.scale;
        }

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10);

        const handleSize = 10;
        const corners = [
          { x: -w / 2 - 5, y: -h / 2 - 5 },
          { x: w / 2 + 5 - handleSize, y: -h / 2 - 5 },
          { x: -w / 2 - 5, y: h / 2 + 5 - handleSize },
          { x: w / 2 + 5 - handleSize, y: h / 2 + 5 - handleSize },
        ];

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        corners.forEach((corner) => {
          ctx.fillRect(corner.x, corner.y, handleSize, handleSize);
          ctx.strokeRect(corner.x, corner.y, handleSize, handleSize);
        });

        ctx.restore();
      }
    }
  }, [props, applyKraftBase]);

  const createLabelTexture = useCallback((): THREE.CanvasTexture => {
    const flatCanvas = document.createElement('canvas');
    flatCanvas.width = LABEL_WIDTH;
    flatCanvas.height = LABEL_HEIGHT;
    const flatCtx = flatCanvas.getContext('2d')!;

    if (props.showKraftEffect) {
      applyKraftBase(flatCtx, LABEL_WIDTH, LABEL_HEIGHT);
      flatCtx.globalCompositeOperation = 'multiply';
    } else {
      flatCtx.fillStyle = '#ffffff';
      flatCtx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);
    }

    props.elements.filter((el) => el.visible !== false).forEach((el) => {
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

    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = LABEL_HEIGHT;
    textureCanvas.height = LABEL_WIDTH;
    const texCtx = textureCanvas.getContext('2d')!;

    texCtx.translate(0, textureCanvas.height);
    texCtx.rotate(-Math.PI / 2);
    texCtx.drawImage(flatCanvas, 0, 0);

    const texture = configureLabelCanvasTexture(new THREE.CanvasTexture(textureCanvas));
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const rotationOffset = props.labelRotation / 360;
    texture.offset.set(props.textureMapping.offsetX + rotationOffset, props.textureMapping.offsetY);
    texture.center.set(props.textureMapping.centerX, props.textureMapping.centerY);
    texture.repeat.set(props.textureMapping.scaleX, props.textureMapping.scaleY);
    texture.rotation = (props.textureMapping.rotation * Math.PI) / 180;

    texture.needsUpdate = true;
    return texture;
  }, [props, applyKraftBase]);

  useEffect(() => {
    drawFlatLabel();
  }, [drawFlatLabel]);

  useProductMockupThreeScene({
    createLabelTexture,
    cylinderLoaded: props.cylinderLoaded,
    cylinderPos: props.cylinderPos,
    labelRotation: props.labelRotation,
    lighting: props.lighting,
    textureMapping: props.textureMapping,
    threeContainerRef: props.threeContainerRef,
    threeContextRef: props.threeContextRef,
    setCylinderLoaded: props.setCylinderLoaded,
    viewRotation: props.viewRotation,
  });

  useEffect(() => {
    const ctx = props.threeContextRef.current;
    if (!ctx || !ctx.cylinder) return;

    if (props.textureUpdateTimerRef.current) {
      cancelAnimationFrame(props.textureUpdateTimerRef.current);
    }

    props.textureUpdateTimerRef.current = requestAnimationFrame(() => {
      const currentCtx = props.threeContextRef.current;
      if (!currentCtx || !currentCtx.cylinder) return;

      const newTexture = createLabelTexture();
      const material = currentCtx.cylinder.material as THREE.MeshStandardMaterial;
      if (material.map) {
        material.map.dispose();
      }
      material.map = newTexture;
      material.needsUpdate = true;
    });
  }, [props, createLabelTexture]);

  return { applyKraftBase };
}
