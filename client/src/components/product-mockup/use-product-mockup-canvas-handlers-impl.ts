import { useCallback } from "react";
import { LABEL_HEIGHT, LABEL_WIDTH } from "@/components/product-mockup/product-mockup-constants";

export function useProductMockupCanvasHandlers(props: any) {
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = props.canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = LABEL_WIDTH / rect.width;
    const scaleY = LABEL_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let found: string | null = null;
    for (let i = props.elements.length - 1; i >= 0; i -= 1) {
      const el = props.elements[i];
      if (el.visible === false) continue;
      const { w, h } = props.getElementBounds(el);
      if (x >= el.x - w / 2 && x <= el.x + w / 2 && y >= el.y - h / 2 && y <= el.y + h / 2) {
        found = el.id;
        break;
      }
    }
    props.setSelectedId(found);
  }, [props.canvasRef, props.elements, props.getElementBounds, props.setSelectedId]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = props.canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = LABEL_WIDTH / rect.width;
    const scaleY = LABEL_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (props.selectedId) {
      const selected = props.elements.find((el: any) => el.id === props.selectedId);
      if (selected) {
        const handle = props.getHandleAtPoint(selected, x, y);
        if (handle) {
          props.setIsResizing(true);
          props.setResizeCorner(handle);

          const { w, h } = props.getElementBounds(selected);
          const rotation0 = (selected.rotation * Math.PI) / 180;
          const cos = Math.cos(rotation0);
          const sin = Math.sin(rotation0);
          const baseHalfW = w / selected.scale / 2;
          const baseHalfH = h / selected.scale / 2;

          let anchorSignX = 1;
          let anchorSignY = 1;
          if (handle === "tl") {
            anchorSignX = 1;
            anchorSignY = 1;
          } else if (handle === "tr") {
            anchorSignX = -1;
            anchorSignY = 1;
          } else if (handle === "bl") {
            anchorSignX = 1;
            anchorSignY = -1;
          } else {
            anchorSignX = -1;
            anchorSignY = -1;
          }

          const anchorLocalX = anchorSignX * (w / 2);
          const anchorLocalY = anchorSignY * (h / 2);
          const anchorWorldX = selected.x + anchorLocalX * cos - anchorLocalY * sin;
          const anchorWorldY = selected.y + anchorLocalX * sin + anchorLocalY * cos;

          props.resizeStateRef.current = {
            anchorWorld: { x: anchorWorldX, y: anchorWorldY },
            rotation0,
            baseHalfW,
            baseHalfH,
            anchorSignX,
            anchorSignY,
            initialScale: selected.scale,
            elementType: selected.type,
            baseFontSize: (selected.fontSize || 36) * selected.scale,
          };
          return;
        }
      }
    }

    if (props.selectedId && (e.altKey || e.metaKey)) {
      const selected = props.elements.find((el: any) => el.id === props.selectedId);
      if (selected) {
        const newElement = { ...selected, id: `${selected.type}-${Date.now()}`, x: selected.x + 20, y: selected.y + 20 };
        props.setElements((prev: any[]) => [...prev, newElement]);
        props.setSelectedId(newElement.id);
        props.setIsDragging(true);
        props.setDragOffset({ x: x - newElement.x, y: y - newElement.y });
        props.setDragStartPos({ x: newElement.x, y: newElement.y });
        return;
      }
    }

    if (!props.selectedId) return;
    const selected = props.elements.find((el: any) => el.id === props.selectedId);
    if (selected) {
      props.setIsDragging(true);
      props.setDragOffset({ x: x - selected.x, y: y - selected.y });
      props.setDragStartPos({ x: selected.x, y: selected.y });
    }
  }, [props]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = props.canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = LABEL_WIDTH / rect.width;
    const scaleY = LABEL_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (!props.isDragging && !props.isResizing && props.selectedId) {
      const selected = props.elements.find((el: any) => el.id === props.selectedId);
      if (selected) {
        const handle = props.getHandleAtPoint(selected, x, y);
        props.setHoveredHandle(handle);
      }
    }

    if (props.isResizing && props.selectedId && props.resizeCorner && props.resizeStateRef.current) {
      const rs = props.resizeStateRef.current;
      const cos = Math.cos(rs.rotation0);
      const sin = Math.sin(rs.rotation0);
      const dx = x - rs.anchorWorld.x;
      const dy = y - rs.anchorWorld.y;
      const localX = dx * cos + dy * sin;
      const localY = -dx * sin + dy * cos;
      const dirX = -rs.anchorSignX * rs.baseHalfW * 2;
      const dirY = -rs.anchorSignY * rs.baseHalfH * 2;
      const diagLen = Math.sqrt(dirX * dirX + dirY * dirY);
      const diagDirX = dirX / diagLen;
      const diagDirY = dirY / diagLen;
      const projDist = localX * diagDirX + localY * diagDirY;
      const scaleRatio = Math.max(0.1, Math.min(5, projDist / diagLen));
      const cornerLocalX = projDist * diagDirX;
      const cornerLocalY = projDist * diagDirY;
      const cornerWorldX = rs.anchorWorld.x + cornerLocalX * cos - cornerLocalY * sin;
      const cornerWorldY = rs.anchorWorld.y + cornerLocalX * sin + cornerLocalY * cos;
      const newCenterX = (rs.anchorWorld.x + cornerWorldX) / 2;
      const newCenterY = (rs.anchorWorld.y + cornerWorldY) / 2;

      if (rs.elementType === "text") {
        const newFontSize = Math.round(rs.baseFontSize * scaleRatio);
        props.setElements((prev: any[]) =>
          prev.map((el: any) => (el.id === props.selectedId ? { ...el, fontSize: Math.max(8, Math.min(200, newFontSize)), scale: 1, x: newCenterX, y: newCenterY } : el)),
        );
      } else {
        props.setElements((prev: any[]) =>
          prev.map((el: any) => (el.id === props.selectedId ? { ...el, scale: scaleRatio, x: newCenterX, y: newCenterY } : el)),
        );
      }
      return;
    }

    if (!props.isDragging || !props.selectedId) return;

    let newX = x - props.dragOffset.x;
    let newY = y - props.dragOffset.y;

    if (e.shiftKey) {
      const deltaX = Math.abs(newX - props.dragStartPos.x);
      const deltaY = Math.abs(newY - props.dragStartPos.y);
      if (deltaX > deltaY) newY = props.dragStartPos.y;
      else newX = props.dragStartPos.x;
    }

    props.setElements((prev: any[]) => prev.map((el: any) => (el.id === props.selectedId ? { ...el, x: newX, y: newY } : el)));
  }, [props]);

  const handleCanvasMouseUp = useCallback(() => {
    props.setIsDragging(false);
    props.setIsResizing(false);
    props.setResizeCorner(null);
    props.resizeStateRef.current = null;
  }, [props]);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const base64Data = dataUrl.split(",")[1];
        const img = new window.Image();
        img.onload = () => {
          const originalAsset = { name: file.name, data: base64Data, mimeType: file.type };
          const newElement = {
            id: `logo-${Date.now()}`,
            type: "logo",
            x: LABEL_WIDTH / 2,
            y: LABEL_HEIGHT / 2,
            rotation: 0,
            scale: Math.min(200 / img.width, 200 / img.height),
            content: file.name,
            visible: true,
            image: img,
            originalAsset,
          } as any;
          props.setElements((prev: any[]) => [...prev, newElement]);
          props.setOriginalAssets((prev: any[]) => [...prev, originalAsset]);
          props.setSelectedId(newElement.id);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  }, [props]);

  const addTextElement = useCallback(() => {
    const textCount = props.elements.filter((el: any) => el.type === "text").length;
    const newElement = {
      id: `text-${Date.now()}`,
      type: "text",
      x: LABEL_WIDTH / 2,
      y: 150 + (textCount * 60) % (LABEL_HEIGHT - 200),
      rotation: 0,
      scale: 1,
      content: "New Text",
      font: "Arial",
      fontSize: 36,
      color: "#1a1a1a",
      visible: true,
    } as any;
    props.setElements((prev: any[]) => [...prev, newElement]);
    props.setSelectedId(newElement.id);
  }, [props]);

  const updateElement = useCallback((id: string, updates: any) => {
    props.setElements((prev: any[]) => prev.map((el: any) => (el.id === id ? { ...el, ...updates } : el)));
  }, [props]);

  const deleteElement = useCallback((id: string) => {
    props.setElements((prev: any[]) => prev.filter((el: any) => el.id !== id));
    if (props.selectedId === id) props.setSelectedId(null);
  }, [props]);

  const toggleVisibility = useCallback((id: string) => {
    props.setElements((prev: any[]) => prev.map((el: any) => (el.id === id ? { ...el, visible: el.visible === false ? true : false } : el)));
  }, [props]);

  const moveElement = useCallback((id: string, direction: "up" | "down") => {
    props.setElements((prev: any[]) => {
      const index = prev.findIndex((el: any) => el.id === id);
      if (index === -1) return prev;
      const newIndex = direction === "up" ? index + 1 : index - 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const newElements = [...prev];
      [newElements[index], newElements[newIndex]] = [newElements[newIndex], newElements[index]];
      return newElements;
    });
  }, [props]);

  const handleReset = useCallback(() => {
    props.setElements([]);
    props.setSelectedId(null);
    props.setLabelRotation(0);
    props.setLighting(props.defaultLighting);
  }, [props]);

  return {
    addTextElement,
    deleteElement,
    handleCanvasClick,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleLogoUpload,
    handleReset,
    moveElement,
    toggleVisibility,
    updateElement,
  };
}
