import { useCallback } from 'react';
import type { LabelElement } from '@/components/product-mockup/product-mockup.types';

export function useProductMockupElementGeometry(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const getElementBounds = useCallback((el: LabelElement) => {
    let w = 100;
    let h = 50;
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
  }, [canvasRef]);

  const getHandleAtPoint = useCallback((el: LabelElement, x: number, y: number): string | null => {
    const { w, h } = getElementBounds(el);
    const handleSize = 15;

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
      if (localX >= corner.x && localX <= corner.x + handleSize && localY >= corner.y && localY <= corner.y + handleSize) {
        return corner.name;
      }
    }
    return null;
  }, [getElementBounds]);

  return { getElementBounds, getHandleAtPoint };
}
