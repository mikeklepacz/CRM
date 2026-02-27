import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TemplateBuilderView = "builder" | "library";

type TemplateBuilderDialogHeaderProps = {
  templateBuilderView: TemplateBuilderView;
  onBackToBuilder: () => void;
};

export function TemplateBuilderDialogHeader({
  templateBuilderView,
  onBackToBuilder,
}: TemplateBuilderDialogHeaderProps) {
  return (
    <DialogHeader className="px-6 py-4 border-b">
      <div className="flex items-center gap-4">
        {templateBuilderView === "library" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToBuilder}
            data-testid="button-back-to-builder"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <DialogTitle>{templateBuilderView === "builder" ? "Template Builder" : "My Templates"}</DialogTitle>
      </div>
    </DialogHeader>
  );
}
