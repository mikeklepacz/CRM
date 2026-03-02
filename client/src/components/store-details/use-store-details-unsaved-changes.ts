import { useMemo } from "react";

export function useStoreDetailsUnsavedChanges(formData: any, initialData: any) {
  return useMemo(() => {
    return Object.keys(formData).some((key) => {
      const typedKey = key as keyof typeof formData;
      return formData[typedKey] !== initialData[typedKey];
    });
  }, [formData, initialData]);
}
