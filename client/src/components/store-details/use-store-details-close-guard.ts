import { useState } from "react";

export function useStoreDetailsCloseGuard(hasUnsavedChanges: boolean, onOpenChange: (open: boolean) => void) {
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false);
    onOpenChange(false);
  };

  return {
    showUnsavedWarning,
    setShowUnsavedWarning,
    handleClose,
    handleConfirmClose,
  };
}
