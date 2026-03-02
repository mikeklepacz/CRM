import { Copy } from "lucide-react";
import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmailPreview } from "@/components/email-preview";
import { parseEmailFromMessage, replaceSimpleTemplateVariables } from "@/components/inline-ai-chat-utils";
import type { InlineAIChatStoreContext } from "@/components/inline-ai-chat-enhanced.types";

interface TemplatePreviewDialogProps {
  open: boolean;
  previewTemplate: { title: string; content: string } | null;
  storeContext?: InlineAIChatStoreContext;
  user: User | null | undefined;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onCopy: () => void;
}

export function TemplatePreviewDialog({
  open,
  previewTemplate,
  storeContext,
  user,
  onOpenChange,
  onClose,
  onCopy,
}: TemplatePreviewDialogProps) {
  const emailData = previewTemplate ? parseEmailFromMessage(previewTemplate.content) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" data-testid="dialog-template-preview">
        <DialogHeader>
          <DialogTitle>{previewTemplate?.title || "Template Preview"}</DialogTitle>
          <DialogDescription>
            Rendered template with your store context data
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted">
            <p className="text-sm whitespace-pre-wrap">{previewTemplate?.content}</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-close-preview"
          >
            Close
          </Button>
          <Button
            variant="outline"
            onClick={onCopy}
            data-testid="button-copy-preview"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          {previewTemplate && emailData ? (
            <EmailPreview
              to={replaceSimpleTemplateVariables(emailData.to, storeContext, user)}
              subject={replaceSimpleTemplateVariables(emailData.subject, storeContext, user)}
              body={replaceSimpleTemplateVariables(emailData.body, storeContext, user)}
            />
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
