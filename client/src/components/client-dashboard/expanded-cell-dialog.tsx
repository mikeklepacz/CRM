import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

interface ExpandedCell {
  row: any;
  column: string;
  value: string;
  isEditable: boolean;
}

interface ExpandedCellDialogProps {
  open: boolean;
  expandedCell: ExpandedCell | null;
  actionButtonColor?: string;
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function ExpandedCellDialog({
  open,
  expandedCell,
  actionButtonColor,
  onOpenChange,
  onValueChange,
  onSave,
  onClose,
}: ExpandedCellDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{expandedCell?.column}</DialogTitle>
          <DialogDescription>
            {expandedCell?.isEditable ? "View and edit the full content" : "View the full content"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] mt-4">
          {expandedCell?.isEditable ? (
            expandedCell.value.length > 100 ? (
              <Textarea
                value={expandedCell.value}
                onChange={(event) => onValueChange(event.target.value)}
                className="min-h-[300px] font-mono text-sm"
                data-testid="textarea-expanded"
              />
            ) : (
              <Input
                value={expandedCell.value}
                onChange={(event) => onValueChange(event.target.value)}
                className="text-base"
                data-testid="input-expanded"
              />
            )
          ) : (
            <div className="p-4 bg-muted/50 rounded-md whitespace-pre-wrap font-mono text-sm" data-testid="text-expanded">
              {expandedCell?.value}
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          {expandedCell?.isEditable && (
            <Button
              onClick={onSave}
              data-testid="button-save-expanded"
              style={actionButtonColor ? { backgroundColor: actionButtonColor, borderColor: actionButtonColor } : undefined}
            >
              Save Changes
            </Button>
          )}
          <Button variant="outline" onClick={onClose} data-testid="button-close-expanded">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
