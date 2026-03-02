export interface ColorCustomizerProps {
  colorPresets: Array<{ name: string; color: string }>;
  setColorPresets: (presets: Array<{ name: string; color: string }>) => void;
  deleteColorPreset: (index: number) => void;
}
