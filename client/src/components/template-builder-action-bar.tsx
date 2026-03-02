import { Library } from "lucide-react";
import { Button } from "@/components/ui/button";

type TemplateBuilderActionBarProps = {
  builderContent: string;
  builderIsDefault: boolean;
  builderTags: string;
  builderTitle: string;
  builderType: "Email" | "Script";
  createPending: boolean;
  editingTemplateId: string | null;
  emailBody: string;
  emailSubject: string;
  emailTo: string;
  formatEmailTemplate: (to: string, subject: string, body: string) => string;
  updatePending: boolean;
  onCancel: () => void;
  onSave: (template: {
    title: string;
    content: string;
    type: "Email" | "Script";
    tags: string[];
    isDefault: boolean;
  }) => void;
  onViewTemplates: () => void;
};

export function TemplateBuilderActionBar({
  builderContent,
  builderIsDefault,
  builderTags,
  builderTitle,
  builderType,
  createPending,
  editingTemplateId,
  emailBody,
  emailSubject,
  emailTo,
  formatEmailTemplate,
  updatePending,
  onCancel,
  onSave,
  onViewTemplates,
}: TemplateBuilderActionBarProps) {
  const isSaveDisabled =
    !builderTitle.trim() ||
    (builderType === "Email"
      ? (!emailTo.trim() || !emailSubject.trim() || !emailBody.trim())
      : !builderContent.trim()) ||
    createPending ||
    updatePending;

  return (
    <div className="flex gap-2 mt-4 pt-4 border-t flex-shrink-0">
      <Button
        variant="outline"
        onClick={onCancel}
        data-testid="button-cancel-builder"
      >
        Cancel
      </Button>
      <Button
        variant="outline"
        onClick={onViewTemplates}
        data-testid="button-goto-templates"
      >
        <Library className="h-4 w-4 mr-2" />
        View My Templates
      </Button>
      <Button
        className="flex-1"
        disabled={isSaveDisabled}
        onClick={() => {
          const tags = builderTags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);

          const content = builderType === "Email"
            ? formatEmailTemplate(emailTo, emailSubject, emailBody)
            : builderContent;

          onSave({
            title: builderTitle,
            content,
            type: builderType,
            tags,
            isDefault: builderIsDefault,
          });
        }}
        data-testid="button-save-template-builder"
      >
        {editingTemplateId ? "Update Template" : "Save Template"}
      </Button>
    </div>
  );
}
