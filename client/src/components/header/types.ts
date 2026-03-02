export type VisibleModules = {
  admin?: boolean;
  dashboard?: boolean;
  clients?: boolean;
  followUp?: boolean;
  mapSearch?: boolean;
  sales?: boolean;
  assistant?: boolean;
  docs?: boolean;
  labelDesigner?: boolean;
  callManager?: boolean;
  ehub?: boolean;
  apollo?: boolean;
  qualification?: boolean;
};

export interface HeaderProps {
  colorPresets?: Array<{ name: string; color: string }>;
  setColorPresets?: (presets: Array<{ name: string; color: string }>) => void;
  deleteColorPreset?: (index: number) => void;
}
