import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ConflictItem } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictItem[];
};

export function ConflictsDialog({ open, onOpenChange, conflicts }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agent Assignment Conflicts</DialogTitle>
          <DialogDescription>
            The following orders have conflicting agent assignments. Please resolve them manually in Google Sheets.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {conflicts.map((conflict, idx) => (
            <div key={idx} className="p-4 border rounded-md space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">Order #{conflict.orderNumber}</p>
                  <p className="text-sm text-muted-foreground mt-1">Link: {conflict.link}</p>
                </div>
                <Badge variant="destructive">Conflict</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">WooCommerce Agent:</p>
                  <Badge variant="outline">{conflict.newAgent}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Existing Agent in Tracker:</p>
                  <Badge variant="default">{conflict.existingAgent}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                This store already has orders assigned to {conflict.existingAgent}, but WooCommerce shows {conflict.newAgent} for this order.
              </p>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
