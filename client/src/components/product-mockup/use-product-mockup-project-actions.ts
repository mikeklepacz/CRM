import { useCallback } from 'react';
import type { ColorSwatch } from '@/components/product-mockup/product-mockup.types';

type Props = {
  setProjectEmail: (value: string) => void;
  setProjectName: (value: string) => void;
  setSavedSwatches: React.Dispatch<React.SetStateAction<ColorSwatch[]>>;
  setShowProjectOverlay: (value: boolean) => void;
  tempProjectEmail: string;
  tempProjectName: string;
};

export function useProductMockupProjectActions(props: Props) {
  const handleProjectSubmit = useCallback(() => {
    if (props.tempProjectName.trim() && props.tempProjectEmail.trim()) {
      localStorage.setItem('labelDesigner_projectName', props.tempProjectName.trim());
      localStorage.setItem('labelDesigner_projectEmail', props.tempProjectEmail.trim());
      props.setProjectName(props.tempProjectName.trim());
      props.setProjectEmail(props.tempProjectEmail.trim());
      props.setShowProjectOverlay(false);
    }
  }, [props]);

  const addColorToSwatches = useCallback((color: string, cmyk: string) => {
    const newSwatch: ColorSwatch = {
      id: Date.now().toString(),
      color,
      cmyk,
    };
    props.setSavedSwatches((prev) => [...prev, newSwatch]);
  }, [props]);

  const removeSwatch = useCallback((id: string) => {
    props.setSavedSwatches((prev) => prev.filter((s) => s.id !== id));
  }, [props]);

  return { addColorToSwatches, handleProjectSubmit, removeSwatch };
}
