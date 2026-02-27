import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ScanPreviewDetail {
  recipientId: string;
  email: string;
  status: "promoted" | "has_reply" | "too_recent" | "error" | "newly_enrolled" | "blacklisted";
  message?: string;
  isNew?: boolean;
}

interface ScanPreviewResults {
  scanned: number;
  promoted: number;
  errors: number;
  dryRun?: boolean;
  details: ScanPreviewDetail[];
}

interface EhubReplyScannerDialogProps {
  open: boolean;
  scanPreviewResults: ScanPreviewResults | null;
  selectedScanEmails: Set<string>;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onToggleAll: (checked: boolean) => void;
  onToggleEmail: (email: string, checked: boolean) => void;
  onConfirm: () => void;
}

export function EhubReplyScannerDialog({
  open,
  scanPreviewResults,
  selectedScanEmails,
  isPending,
  onOpenChange,
  onCancel,
  onToggleAll,
  onToggleEmail,
  onConfirm,
}: EhubReplyScannerDialogProps) {
  const enrollableDetails = scanPreviewResults?.details.filter(
    (detail) => detail.status === "newly_enrolled" || detail.status === "promoted",
  ) || [];

  const allSelected =
    selectedScanEmails.size > 0 &&
    enrollableDetails.length > 0 &&
    enrollableDetails.every((detail) => selectedScanEmails.has(detail.email));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Scan for Replies - Preview</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Scanning Gmail Sent folder for emails to Commission Tracker POC Emails
          </p>
        </DialogHeader>

        {isPending ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Scanning Gmail...</span>
          </div>
        ) : scanPreviewResults ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div>
                <span className="text-muted-foreground">Sent Emails Scanned:</span> <strong>{scanPreviewResults.scanned}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Newly Discovered:</span>{" "}
                <strong className="text-purple-600">{scanPreviewResults.details.filter((detail) => detail.isNew).length}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Ready to Promote:</span>{" "}
                <strong className="text-green-600">{scanPreviewResults.details.filter((detail) => detail.status === "promoted").length}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Has Replies:</span>{" "}
                <strong className="text-blue-600">{scanPreviewResults.details.filter((detail) => detail.status === "has_reply").length}</strong>
              </div>
            </div>

            <div className="border rounded-md max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => onToggleAll(checked === true)}
                        data-testid="checkbox-select-all-scan"
                      />
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scanPreviewResults.details.map((detail, idx) => {
                    const isEnrollable = detail.status === "newly_enrolled" || detail.status === "promoted";
                    const isSelected = selectedScanEmails.has(detail.email);

                    return (
                      <TableRow key={idx} className={isSelected ? "bg-accent/50" : ""}>
                        <TableCell>
                          {isEnrollable && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => onToggleEmail(detail.email, checked === true)}
                              data-testid={`checkbox-scan-${idx}`}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {detail.email}
                          {detail.isNew && <span className="ml-2 text-purple-600">✨ New</span>}
                        </TableCell>
                        <TableCell>
                          {detail.status === "promoted" && (
                            <Badge variant="default" className="bg-green-600">Ready to Promote</Badge>
                          )}
                          {detail.status === "has_reply" && (
                            <Badge variant="default" className="bg-blue-600">Has Reply</Badge>
                          )}
                          {detail.status === "newly_enrolled" && (
                            <Badge variant="default" className="bg-purple-600">Newly Enrolled</Badge>
                          )}
                          {detail.status === "too_recent" && (
                            <Badge variant="secondary">Too Recent</Badge>
                          )}
                          {detail.status === "blacklisted" && (
                            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">Blacklisted</Badge>
                          )}
                          {detail.status === "error" && (
                            <Badge variant="destructive">Error</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{detail.message}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-scan">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!scanPreviewResults || selectedScanEmails.size === 0 || isPending}
            data-testid="button-confirm-enroll"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enroll {selectedScanEmails.size} Selected Contact{selectedScanEmails.size !== 1 ? "s" : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
