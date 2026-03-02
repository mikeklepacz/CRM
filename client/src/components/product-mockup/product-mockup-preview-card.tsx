import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, RotateCcw, Save, Sun } from 'lucide-react';
import hempClearUrl from '@assets/Hemp-Clear_1764119084551.png';
import { DEFAULT_LIGHTING } from '@/components/product-mockup/product-mockup-constants';
import type { LightingSettings } from '@/components/product-mockup/product-mockup.types';

type Props = {
  elementsCount: number;
  isExporting: boolean;
  labelRotation: number;
  lighting: LightingSettings;
  productPreviewRef: React.RefObject<HTMLDivElement>;
  threeContainerRef: React.RefObject<HTMLDivElement>;
  onExportProject: () => void;
  setLabelRotation: (value: number) => void;
  setLighting: React.Dispatch<React.SetStateAction<LightingSettings>>;
};

export function ProductMockupPreviewCard({
  elementsCount,
  isExporting,
  labelRotation,
  lighting,
  productPreviewRef,
  threeContainerRef,
  onExportProject,
  setLabelRotation,
  setLighting,
}: Props) {
  return (
    <Card className="self-start">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Product Preview</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="default" onClick={onExportProject} disabled={isExporting || elementsCount === 0} data-testid="button-save-project">
              {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              {isExporting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          ref={productPreviewRef}
          className="relative w-full flex items-center justify-center rounded-lg overflow-hidden"
          style={{ background: '#e8dcc8', aspectRatio: '1 / 1' }}
          data-testid="container-preview"
        >
          <img src={hempClearUrl} alt="Hemp wick overlay" className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 1 }} />
          <div ref={threeContainerRef} className="absolute inset-0" style={{ zIndex: 2 }} />
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Rotate View: {labelRotation}°</Label>
          <Slider value={[labelRotation]} onValueChange={([v]) => setLabelRotation(v)} min={0} max={720} step={5} data-testid="slider-view-rotation" />
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Lighting</Label>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setLighting({ ...DEFAULT_LIGHTING })} data-testid="button-reset-lighting">
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
          <div className="space-y-1.5">
            <div>
              <Label className="text-xs text-muted-foreground">Ambient: {lighting.ambient.toFixed(2)}</Label>
              <Slider value={[lighting.ambient]} onValueChange={([v]) => setLighting((prev) => ({ ...prev, ambient: v }))} min={0} max={2} step={0.05} data-testid="slider-lighting-ambient" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Key Light: {lighting.front.toFixed(2)}</Label>
              <Slider value={[lighting.front]} onValueChange={([v]) => setLighting((prev) => ({ ...prev, front: v }))} min={0} max={6} step={0.1} data-testid="slider-lighting-front" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fill Light: {lighting.top.toFixed(2)}</Label>
              <Slider value={[lighting.top]} onValueChange={([v]) => setLighting((prev) => ({ ...prev, top: v }))} min={0} max={3} step={0.05} data-testid="slider-lighting-fill" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Warmth: {lighting.warmth.toFixed(2)}</Label>
              <Slider value={[lighting.warmth]} onValueChange={([v]) => setLighting((prev) => ({ ...prev, warmth: v }))} min={-1} max={1} step={0.05} data-testid="slider-lighting-warmth" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Key Angle: {lighting.keyAngle}°</Label>
              <Slider value={[lighting.keyAngle]} onValueChange={([v]) => setLighting((prev) => ({ ...prev, keyAngle: v }))} min={0} max={360} step={5} data-testid="slider-lighting-key-angle" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Key Height: {lighting.keyHeight}°</Label>
              <Slider value={[lighting.keyHeight]} onValueChange={([v]) => setLighting((prev) => ({ ...prev, keyHeight: v }))} min={-90} max={90} step={5} data-testid="slider-lighting-key-height" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Key Distance: {lighting.keyDistance.toFixed(1)}</Label>
              <Slider value={[lighting.keyDistance]} onValueChange={([v]) => setLighting((prev) => ({ ...prev, keyDistance: v }))} min={0.5} max={5} step={0.1} data-testid="slider-lighting-key-distance" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
