import { TemplatePreviewDialog } from "@/components/template-preview-dialog";

type InlineAiTemplatePreviewProps = {
  open: boolean;
  previewTemplate: { title: string; content: string } | null;
  storeContext?: any;
  user: any;
  onClose: () => void;
  onCopy: () => void;
  onOpenChange: (open: boolean) => void;
};

export function InlineAiTemplatePreview({
  open,
  previewTemplate,
  storeContext,
  user,
  onClose,
  onCopy,
  onOpenChange,
}: InlineAiTemplatePreviewProps) {
  return (
    <TemplatePreviewDialog
      open={open}
      previewTemplate={previewTemplate}
      storeContext={storeContext}
      user={user}
      onOpenChange={onOpenChange}
      onClose={onClose}
      onCopy={onCopy}
    />
  );
}
