import { useEffect, useRef } from 'react';
import bleedOverlayUrl from '@assets/Red Bleed_1764176822191.png';
import { useToast } from '@/hooks/use-toast';
import { useProductMockupState } from '@/components/product-mockup/use-product-mockup-state';
import { useProductMockupExport } from '@/components/product-mockup/use-product-mockup-export';
import { useProductMockupCanvasHandlers } from '@/components/product-mockup/use-product-mockup-canvas-handlers';
import { useProductMockupElementGeometry } from '@/components/product-mockup/use-product-mockup-element-geometry';
import { useProductMockupProjectActions } from '@/components/product-mockup/use-product-mockup-project-actions';
import { useProductMockupRendering } from '@/components/product-mockup/use-product-mockup-rendering';
import { ProductMockupProjectDialog } from '@/components/product-mockup/product-mockup-project-dialog';
import { ProductMockupDesignerCard } from '@/components/product-mockup/product-mockup-designer-card';
import { ProductMockupPreviewCard } from '@/components/product-mockup/product-mockup-preview-card';
import { DEFAULT_LIGHTING } from '@/components/product-mockup/product-mockup-constants';
import { preloadAllFonts } from '@/components/product-mockup/product-mockup-fonts';
import type { ThreeContext } from '@/components/product-mockup/product-mockup.types';

export default function ProductMockup() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const productPreviewRef = useRef<HTMLDivElement>(null);
  const threeContextRef = useRef<ThreeContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textureUpdateTimerRef = useRef<number | null>(null);
  const resizeStateRef = useRef<any>(null);
  const bleedOverlayRef = useRef<HTMLImageElement | null>(null);

  const {
    elements,
    setElements,
    selectedId,
    setSelectedId,
    viewRotation,
    labelRotation,
    setLabelRotation,
    isDragging,
    setIsDragging,
    isResizing,
    setIsResizing,
    resizeCorner,
    setResizeCorner,
    dragOffset,
    setDragOffset,
    dragStartPos,
    setDragStartPos,
    isAltPressed,
    setIsAltPressed,
    hoveredHandle,
    setHoveredHandle,
    cylinderLoaded,
    setCylinderLoaded,
    cylinderPos,
    textureMapping,
    showBleedOverlay,
    setShowBleedOverlay,
    bleedOverlayLoaded,
    setBleedOverlayLoaded,
    showKraftEffect,
    setShowKraftEffect,
    fontsLoaded,
    setFontsLoaded,
    projectName,
    setProjectName,
    projectEmail,
    setProjectEmail,
    showProjectOverlay,
    setShowProjectOverlay,
    tempProjectName,
    setTempProjectName,
    tempProjectEmail,
    setTempProjectEmail,
    savedSwatches,
    setSavedSwatches,
    setOriginalAssets,
    lighting,
    setLighting,
    isExporting,
    setIsExporting,
  } = useProductMockupState();

  useEffect(() => {
    if (!fontsLoaded) {
      preloadAllFonts().then(() => setFontsLoaded(true));
    }
  }, [fontsLoaded, setFontsLoaded]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        setIsAltPressed(true);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        setElements((prev) => prev.filter((el) => el.id !== selectedId));
        setSelectedId(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) {
        setIsAltPressed(false);
      }
    };

    const handleBlur = () => setIsAltPressed(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [selectedId, setElements, setIsAltPressed, setSelectedId]);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      bleedOverlayRef.current = img;
      setBleedOverlayLoaded(true);
    };
    img.src = bleedOverlayUrl;
  }, [setBleedOverlayLoaded]);

  const { addColorToSwatches, handleProjectSubmit, removeSwatch } = useProductMockupProjectActions({
    setProjectEmail,
    setProjectName,
    setSavedSwatches,
    setShowProjectOverlay,
    tempProjectEmail,
    tempProjectName,
  });

  const { getElementBounds, getHandleAtPoint } = useProductMockupElementGeometry(canvasRef);

  const { applyKraftBase } = useProductMockupRendering({
    bleedOverlayLoaded,
    bleedOverlayRef,
    canvasRef,
    cylinderLoaded,
    cylinderPos,
    elements,
    labelRotation,
    lighting,
    selectedId,
    setCylinderLoaded,
    showBleedOverlay,
    showKraftEffect,
    textureMapping,
    textureUpdateTimerRef,
    threeContainerRef,
    threeContextRef,
    viewRotation,
  });

  const {
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
  } = useProductMockupCanvasHandlers({
    canvasRef,
    defaultLighting: DEFAULT_LIGHTING,
    dragOffset,
    dragStartPos,
    elements,
    getElementBounds,
    getHandleAtPoint,
    isDragging,
    isResizing,
    resizeCorner,
    resizeStateRef,
    selectedId,
    setDragOffset,
    setDragStartPos,
    setElements,
    setHoveredHandle,
    setIsDragging,
    setIsResizing,
    setLabelRotation,
    setLighting,
    setOriginalAssets,
    setResizeCorner,
    setSelectedId,
  });

  const { handleExportProject } = useProductMockupExport({
    applyKraftBase,
    elements,
    productPreviewRef,
    projectEmail,
    projectName,
    savedSwatches,
    setIsExporting,
    showKraftEffect,
    toast,
  });

  const selectedElement = elements.find((el) => el.id === selectedId);

  return (
    <>
      <ProductMockupProjectDialog
        showProjectOverlay={showProjectOverlay}
        tempProjectName={tempProjectName}
        tempProjectEmail={tempProjectEmail}
        setTempProjectName={setTempProjectName}
        setTempProjectEmail={setTempProjectEmail}
        onProjectSubmit={handleProjectSubmit}
      />

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
          <ProductMockupDesignerCard
            addColorToSwatches={addColorToSwatches}
            addTextElement={addTextElement}
            canvasRef={canvasRef}
            deleteElement={deleteElement}
            elements={elements}
            fileInputRef={fileInputRef}
            fontsLoaded={fontsLoaded}
            handleCanvasClick={handleCanvasClick}
            handleCanvasMouseDown={handleCanvasMouseDown}
            handleCanvasMouseMove={handleCanvasMouseMove}
            handleCanvasMouseUp={handleCanvasMouseUp}
            handleLogoUpload={handleLogoUpload}
            handleReset={handleReset}
            hoveredHandle={hoveredHandle}
            isAltPressed={isAltPressed}
            moveElement={moveElement}
            removeSwatch={removeSwatch}
            savedSwatches={savedSwatches}
            selectedElement={selectedElement}
            selectedId={selectedId}
            setHoveredHandle={setHoveredHandle}
            setSelectedId={setSelectedId}
            setShowBleedOverlay={setShowBleedOverlay}
            setShowKraftEffect={setShowKraftEffect}
            showBleedOverlay={showBleedOverlay}
            showKraftEffect={showKraftEffect}
            toggleVisibility={toggleVisibility}
            updateElement={updateElement}
          />

          <ProductMockupPreviewCard
            elementsCount={elements.length}
            isExporting={isExporting}
            labelRotation={labelRotation}
            lighting={lighting}
            onExportProject={handleExportProject}
            productPreviewRef={productPreviewRef}
            setLabelRotation={setLabelRotation}
            setLighting={setLighting}
            threeContainerRef={threeContainerRef}
          />
        </div>
      </div>
    </>
  );
}
