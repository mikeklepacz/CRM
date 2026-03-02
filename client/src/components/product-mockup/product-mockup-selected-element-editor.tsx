import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine, ArrowUpToLine, Check, ChevronsUpDown, Loader2, Minus, Move, Palette, Plus, Trash2 } from 'lucide-react';
import { CMYKColorPicker } from '@/components/product-mockup/cmyk-color-picker';
import { CenterHorizontalLine, CenterVerticalLine } from '@/components/product-mockup/alignment-icons';
import { GOOGLE_FONTS } from '@/components/product-mockup/product-mockup-fonts';
import { LABEL_HEIGHT, LABEL_WIDTH } from '@/components/product-mockup/product-mockup-constants';
import type { ColorSwatch, LabelElement } from '@/components/product-mockup/product-mockup.types';

type Props = {
  selectedElement: LabelElement | undefined;
  selectedId: string | null;
  fontsLoaded: boolean;
  savedSwatches: ColorSwatch[];
  addColorToSwatches: (color: string, cmyk: string) => void;
  removeSwatch: (id: string) => void;
  updateElement: (id: string, updates: Partial<LabelElement>) => void;
  deleteElement: (id: string) => void;
};

export function ProductMockupSelectedElementEditor({
  selectedElement,
  selectedId,
  fontsLoaded,
  savedSwatches,
  addColorToSwatches,
  removeSwatch,
  updateElement,
  deleteElement,
}: Props) {
  if (!selectedElement || !selectedId) {
    return (
      <div className="p-3 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground text-center">Add a logo or text, then select it to edit</p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-muted rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Move className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{selectedElement.type === 'text' ? 'Edit Text' : 'Edit Logo'}</span>
        </div>
        <Button size="sm" variant="destructive" onClick={() => deleteElement(selectedId)} data-testid="button-delete">
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Align on Canvas:</Label>
        <div className="flex gap-1 flex-wrap">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateElement(selectedId, { x: 50 })} title="Align Left" data-testid="button-align-left"><ArrowLeftToLine className="w-4 h-4" /></Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateElement(selectedId, { x: LABEL_WIDTH / 2 })} title="Center Horizontal" data-testid="button-align-center-h"><CenterVerticalLine /></Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateElement(selectedId, { x: LABEL_WIDTH - 50 })} title="Align Right" data-testid="button-align-right"><ArrowRightToLine className="w-4 h-4" /></Button>
          <div className="w-px bg-border mx-1" />
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateElement(selectedId, { y: 50 })} title="Align Top" data-testid="button-align-top"><ArrowUpToLine className="w-4 h-4" /></Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateElement(selectedId, { y: LABEL_HEIGHT / 2 })} title="Center Vertical" data-testid="button-align-center-v"><CenterHorizontalLine /></Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateElement(selectedId, { y: LABEL_HEIGHT - 50 })} title="Align Bottom" data-testid="button-align-bottom"><ArrowDownToLine className="w-4 h-4" /></Button>
        </div>
      </div>

      {selectedElement.type === 'text' && (
        <div className="space-y-3">
          <Input value={selectedElement.content} onChange={(e) => updateElement(selectedId, { content: e.target.value })} placeholder="Enter text" data-testid="input-text-content" />
          <div className="flex items-center gap-2">
            <Label className="text-xs w-12">Font:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" role="combobox" className="flex-1 justify-between" disabled={!fontsLoaded} data-testid="button-font-picker">
                  {!fontsLoaded ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /><span className="text-xs">Loading fonts...</span></>
                  ) : (
                    <><span className="truncate text-xs" style={{ fontFamily: selectedElement.font || 'Arial' }}>{selectedElement.font || 'Arial'}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></>
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
                        <CommandItem key={font} value={font} onSelect={() => updateElement(selectedId, { font })} className="text-xs" style={{ fontFamily: font }} data-testid={`font-option-${font.toLowerCase().replace(/\s+/g, '-')}`}>
                          <Check className={`mr-2 h-4 w-4 ${(selectedElement.font || 'Arial') === font ? 'opacity-100' : 'opacity-0'}`} />
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
                <Button variant="outline" size="sm" className="flex-1 justify-start gap-2" data-testid="button-color-picker">
                  <div className="w-5 h-5 rounded border border-border" style={{ backgroundColor: selectedElement.color || '#1a1a1a' }} />
                  <span className="text-xs font-mono">{selectedElement.color || '#1a1a1a'}</span>
                  <Palette className="h-4 w-4 ml-auto" />
                </Button>
              </DialogTrigger>
              <DialogContent className="w-auto max-w-[280px] p-4">
                <DialogHeader><DialogTitle className="text-sm">Pick Color</DialogTitle></DialogHeader>
                <CMYKColorPicker
                  color={selectedElement.color || '#1a1a1a'}
                  onChange={(color) => updateElement(selectedId, { color })}
                  savedSwatches={savedSwatches}
                  onSaveSwatch={addColorToSwatches}
                  onUseSwatch={(color) => updateElement(selectedId, { color })}
                  onRemoveSwatch={removeSwatch}
                />
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-12">Size:</Label>
            <Slider value={[selectedElement.fontSize || 32]} onValueChange={([v]) => updateElement(selectedId, { fontSize: v })} min={12} max={80} step={2} className="flex-1" data-testid="slider-text-size" />
            <span className="text-xs w-8 text-right">{selectedElement.fontSize}px</span>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Scale: {(selectedElement.scale * 100).toFixed(1)}%</Label>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateElement(selectedId, { scale: selectedElement.scale - 0.001 })} data-testid="btn-scale-minus"><Minus className="w-3 h-3" /></Button>
            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateElement(selectedId, { scale: selectedElement.scale + 0.001 })} data-testid="btn-scale-plus"><Plus className="w-3 h-3" /></Button>
          </div>
        </div>
        <Slider value={[selectedElement.scale * 1000]} onValueChange={([v]) => updateElement(selectedId, { scale: v / 1000 })} min={100} max={3000} step={1} data-testid="slider-scale" />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Rotate: {selectedElement.rotation.toFixed(1)}°</Label>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateElement(selectedId, { rotation: selectedElement.rotation - 0.1 })} data-testid="btn-rotate-minus"><Minus className="w-3 h-3" /></Button>
            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateElement(selectedId, { rotation: selectedElement.rotation + 0.1 })} data-testid="btn-rotate-plus"><Plus className="w-3 h-3" /></Button>
          </div>
        </div>
        <Slider value={[selectedElement.rotation * 10]} onValueChange={([v]) => updateElement(selectedId, { rotation: v / 10 })} min={0} max={3600} step={1} data-testid="slider-rotation" />
      </div>
    </div>
  );
}
