import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StoreFormData } from "./types";

interface StoreDetailsHeaderProps {
  formData: StoreFormData;
  onBack: () => void;
}

export function StoreDetailsHeader({ formData, onBack }: StoreDetailsHeaderProps) {
  return (
    <div className="border-b bg-background">
      <div className="container mx-auto p-4 max-w-5xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{formData.name || "Store Details"}</h1>
            <p className="text-sm text-muted-foreground">{formData.type}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
