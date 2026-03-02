import { Phone, Save, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface StoreDetailsFooterProps {
  isSaving: boolean;
  onCancel: () => void;
  onCall: () => void;
  onSave: () => void;
}

export function StoreDetailsFooter({ isSaving, onCancel, onCall, onSave }: StoreDetailsFooterProps) {
  return (
    <div className="border-t bg-background">
      <div className="container mx-auto p-4 max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="default" onClick={onCall} data-testid="button-call">
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
            <Button onClick={onSave} disabled={isSaving} data-testid="button-save">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
