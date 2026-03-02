import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, Upload, Plus, Eye, EyeOff } from 'lucide-react';
import { LABEL_HEIGHT, LABEL_WIDTH } from '@/components/product-mockup/product-mockup-constants';
import { ProductMockupLayersList } from '@/components/product-mockup/product-mockup-layers-list';
import { ProductMockupSelectedElementEditor } from '@/components/product-mockup/product-mockup-selected-element-editor';
import type { ColorSwatch, LabelElement } from '@/components/product-mockup/product-mockup.types';

type Props = {
  addColorToSwatches: (color: string, cmyk: string) => void;
  addTextElement: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  deleteElement: (id: string) => void;
  elements: LabelElement[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  fontsLoaded: boolean;
  handleCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleCanvasMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleCanvasMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleCanvasMouseUp: () => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleReset: () => void;
  hoveredHandle: string | null;
  isAltPressed: boolean;
  moveElement: (id: string, direction: 'up' | 'down') => void;
  removeSwatch: (id: string) => void;
  savedSwatches: ColorSwatch[];
  selectedElement: LabelElement | undefined;
  selectedId: string | null;
  setHoveredHandle: (value: string | null) => void;
  setSelectedId: (id: string | null) => void;
  setShowKraftEffect: (value: boolean) => void;
  setShowBleedOverlay: (value: boolean) => void;
  showBleedOverlay: boolean;
  showKraftEffect: boolean;
  toggleVisibility: (id: string) => void;
  updateElement: (id: string, updates: Partial<LabelElement>) => void;
};

export function ProductMockupDesignerCard(props: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Label Design</CardTitle>
          <Button size="sm" variant="outline" onClick={props.handleReset} data-testid="button-reset">
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => props.fileInputRef.current?.click()} data-testid="button-add-logo"><Upload className="h-4 w-4 mr-1" />Add Logo</Button>
              <Button size="sm" variant="default" onClick={props.addTextElement} data-testid="button-add-text"><Plus className="h-4 w-4 mr-1" />Add Text</Button>
              <Button size="sm" variant={props.showBleedOverlay ? 'default' : 'outline'} onClick={() => props.setShowBleedOverlay(!props.showBleedOverlay)} data-testid="button-toggle-bleed">
                {props.showBleedOverlay ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}Bleed
              </Button>
            </div>
            <input ref={props.fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={props.handleLogoUpload} />

            <div className="relative border rounded-lg overflow-hidden bg-muted" style={{ aspectRatio: `${LABEL_WIDTH}/${LABEL_HEIGHT}` }}>
              <canvas
                ref={props.canvasRef}
                width={LABEL_WIDTH}
                height={LABEL_HEIGHT}
                className={`w-full h-full ${
                  props.hoveredHandle === 'tl' || props.hoveredHandle === 'br' ? 'cursor-nwse-resize' :
                  props.hoveredHandle === 'tr' || props.hoveredHandle === 'bl' ? 'cursor-nesw-resize' :
                  props.isAltPressed && props.selectedId ? 'cursor-copy' : 'cursor-move'
                }`}
                onClick={props.handleCanvasClick}
                onMouseDown={props.handleCanvasMouseDown}
                onMouseMove={props.handleCanvasMouseMove}
                onMouseUp={props.handleCanvasMouseUp}
                onMouseLeave={() => {
                  props.handleCanvasMouseUp();
                  props.setHoveredHandle(null);
                }}
                data-testid="canvas-label"
              />
            </div>

            <ProductMockupLayersList
              elements={props.elements}
              selectedId={props.selectedId}
              deleteElement={props.deleteElement}
              moveElement={props.moveElement}
              setSelectedId={props.setSelectedId}
              toggleVisibility={props.toggleVisibility}
            />

            <p className="text-xs text-muted-foreground text-center">Click to select, drag to move</p>
          </div>

          <div className="w-56 space-y-3">
            <ProductMockupSelectedElementEditor
              selectedElement={props.selectedElement}
              selectedId={props.selectedId}
              fontsLoaded={props.fontsLoaded}
              savedSwatches={props.savedSwatches}
              addColorToSwatches={props.addColorToSwatches}
              removeSwatch={props.removeSwatch}
              updateElement={props.updateElement}
              deleteElement={props.deleteElement}
            />

            <button
              onClick={() => props.setShowKraftEffect(!props.showKraftEffect)}
              className={`w-full p-3 rounded-lg border text-left transition-colors ${
                props.showKraftEffect
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                  : 'bg-muted/50 border-muted-foreground/20'
              }`}
              data-testid="button-toggle-kraft"
            >
              <p className={`text-xs ${props.showKraftEffect ? 'text-amber-800 dark:text-amber-200' : 'text-muted-foreground'}`}>
                <strong>Kraft Paper:</strong> {props.showKraftEffect ? 'ON' : 'OFF'} - Colors blend with brown paper. White becomes paper color.
              </p>
            </button>

            <p className="text-[10px] text-muted-foreground/70 text-center leading-relaxed">
              <span className="font-medium">Shortcuts:</span> Delete/Backspace removes selection • Alt/Option+drag duplicates • Shift+drag constrains to axis
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
