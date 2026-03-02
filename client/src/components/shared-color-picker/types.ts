export interface SharedColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  onReset?: () => void;
  colorPresets?: Array<{ name: string; color: string }>;
  onSavePreset?: (color: string, name: string) => void;
  onDeletePreset?: (index: number) => void;
  testId?: string;
}
