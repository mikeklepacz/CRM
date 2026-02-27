import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VCardExportFields {
  phone: boolean;
  email: boolean;
  website: boolean;
  address: boolean;
  salesSummary: boolean;
  storeHours: boolean;
}

interface VCardExportDialogProps {
  open: boolean;
  filteredCount: number;
  fields: VCardExportFields;
  listName: string;
  platform: "ios" | "android";
  onOpenChange: (open: boolean) => void;
  onFieldsChange: (fields: VCardExportFields) => void;
  onListNameChange: (value: string) => void;
  onPlatformChange: (value: "ios" | "android") => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function VCardExportDialog({
  open,
  filteredCount,
  fields,
  listName,
  platform,
  onOpenChange,
  onFieldsChange,
  onListNameChange,
  onPlatformChange,
  onCancel,
  onConfirm,
}: VCardExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Contacts to Phone</DialogTitle>
          <DialogDescription>
            Select which fields to include and choose your platform
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
            Exporting <span className="font-semibold">{filteredCount}</span> stores
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Include Fields</Label>
            <div className="space-y-2">
              {Object.entries({
                phone: "Phone",
                email: "Email",
                website: "Website",
                address: "Address",
                salesSummary: "Sales Summary",
                storeHours: "Store Hours",
              }).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`vcard-${key}`}
                    checked={fields[key as keyof VCardExportFields]}
                    onCheckedChange={(checked) =>
                      onFieldsChange({ ...fields, [key]: checked === true })
                    }
                    data-testid={`checkbox-vcard-${key}`}
                  />
                  <Label htmlFor={`vcard-${key}`} className="text-sm cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vcard-list-name" className="text-sm font-medium">
              List/Group Name
            </Label>
            <Input
              id="vcard-list-name"
              placeholder="e.g., Hemp Wick - Sample Sent"
              value={listName}
              onChange={(event) => onListNameChange(event.target.value)}
              data-testid="input-vcard-list-name"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Platform</Label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="platform-ios"
                  checked={platform === "ios"}
                  onChange={() => onPlatformChange("ios")}
                  className="cursor-pointer"
                  data-testid="radio-platform-ios"
                />
                <Label htmlFor="platform-ios" className="text-sm cursor-pointer">
                  iOS
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="platform-android"
                  checked={platform === "android"}
                  onChange={() => onPlatformChange("android")}
                  className="cursor-pointer"
                  data-testid="radio-platform-android"
                />
                <Label htmlFor="platform-android" className="text-sm cursor-pointer">
                  Android
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-vcard-export">
            Cancel
          </Button>
          <Button onClick={onConfirm} data-testid="button-export-vcard-confirm" data-primary="true">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
