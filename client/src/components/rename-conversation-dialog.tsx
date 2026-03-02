import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface RenameConversationDialogProps {
  open: boolean;
  conversationTitle: string;
  renamingConversationId: string | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationTitleChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function RenameConversationDialog({
  open,
  conversationTitle,
  renamingConversationId,
  isPending,
  onOpenChange,
  onConversationTitleChange,
  onCancel,
  onSave,
}: RenameConversationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-rename-conversation">
        <DialogHeader>
          <DialogTitle>Rename Conversation</DialogTitle>
          <DialogDescription>Enter a new name for this conversation</DialogDescription>
        </DialogHeader>
        <Input
          value={conversationTitle}
          onChange={(event) => onConversationTitleChange(event.target.value)}
          placeholder="Conversation title..."
          data-testid="input-conversation-title"
          onKeyDown={(event) => {
            if (event.key === "Enter" && conversationTitle.trim() && renamingConversationId) {
              onSave();
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isPending || !conversationTitle.trim()}
            data-testid="button-save-rename"
            data-primary="true"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
