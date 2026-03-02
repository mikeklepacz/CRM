import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Sun, Moon, Check } from "lucide-react";
import { SharedColorPicker } from "@/components/shared-color-picker";
import type { StatusFormData } from "./types";

interface StatusFormSectionProps {
  isEditing: boolean;
  formData: StatusFormData;
  previewMode: "light" | "dark";
  isSubmitting: boolean;
  onFormDataChange: (data: StatusFormData) => void;
  onSubmit: () => void;
  onCancelEdit: () => void;
}

export function StatusFormSection({
  isEditing,
  formData,
  previewMode,
  isSubmitting,
  onFormDataChange,
  onSubmit,
  onCancelEdit,
}: StatusFormSectionProps) {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{isEditing ? "Edit Status" : "Create New Status"}</h3>
        {isEditing && (
          <Button size="sm" variant="ghost" onClick={onCancelEdit} data-testid="button-cancel-edit">
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-2">
          <Label>Status Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
            placeholder="e.g., Contacted"
            data-testid="input-status-name"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label>Preview</Label>
          <div
            className="h-9 rounded-md flex items-center justify-center px-3 text-sm font-medium"
            style={{
              backgroundColor: previewMode === "light" ? formData.lightBgColor : formData.darkBgColor,
              color: previewMode === "light" ? formData.lightTextColor : formData.darkTextColor,
            }}
            data-testid="preview-status"
          >
            {formData.name || "Status Preview"}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Sun className="h-4 w-4" />
            Light Mode Colors *
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <SharedColorPicker label="Background" value={formData.lightBgColor} onChange={(color) => onFormDataChange({ ...formData, lightBgColor: color })} testId="color-light-bg" />
            <SharedColorPicker label="Text" value={formData.lightTextColor} onChange={(color) => onFormDataChange({ ...formData, lightTextColor: color })} testId="color-light-text" />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Dark Mode Colors *
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <SharedColorPicker label="Background" value={formData.darkBgColor} onChange={(color) => onFormDataChange({ ...formData, darkBgColor: color })} testId="color-dark-bg" />
            <SharedColorPicker label="Text" value={formData.darkTextColor} onChange={(color) => onFormDataChange({ ...formData, darkTextColor: color })} testId="color-dark-text" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onSubmit} disabled={isSubmitting} data-testid="button-save-status">
          {isEditing ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Update Status
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Create Status
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
