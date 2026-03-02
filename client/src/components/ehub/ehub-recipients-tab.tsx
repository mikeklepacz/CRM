import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EhubBulkDeleteRecipientsDialog } from "@/components/ehub/ehub-bulk-delete-recipients-dialog";

type EhubRecipientsTabProps = {
  bulkDeleteConfirmDialogOpen: boolean;
  contactedFilter: string;
  isBulkDeletePending: boolean;
  isLoadingRecipients: boolean;
  recipientSelectAll: boolean;
  recipients: any[] | undefined;
  recipientsError: Error | null;
  selectedRecipientIds: Set<string>;
  selectedSequenceId: string | null;
  onBulkDeleteConfirm: () => void;
  onBulkDeleteDialogOpenChange: (open: boolean) => void;
  onContactedFilterChange: (value: string) => void;
  onClearSelection: () => void;
  onDeleteSelectedClick: () => void;
  onRecipientSelectionChange: (recipientId: string, checked: boolean) => void;
  onSelectAllChange: (checked: boolean) => void;
};

export function EhubRecipientsTab({
  bulkDeleteConfirmDialogOpen,
  contactedFilter,
  isBulkDeletePending,
  isLoadingRecipients,
  recipientSelectAll,
  recipients,
  recipientsError,
  selectedRecipientIds,
  selectedSequenceId,
  onBulkDeleteConfirm,
  onBulkDeleteDialogOpenChange,
  onContactedFilterChange,
  onClearSelection,
  onDeleteSelectedClick,
  onRecipientSelectionChange,
  onSelectAllChange,
}: EhubRecipientsTabProps) {
  return (
    <TabsContent value="recipients" className="space-y-4">
      {!selectedSequenceId ? (
        <Card>
          <CardHeader>
            <CardTitle>No Sequence Selected</CardTitle>
            <CardDescription>
              Select a sequence from the Sequences tab to view its recipients.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : recipientsError ? (
        <Alert variant="destructive" data-testid="alert-recipients-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Commission Tracker Error</AlertTitle>
          <AlertDescription>
            {recipientsError.message || "Failed to load recipients. Please check your Commission Tracker configuration."}
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recipients</CardTitle>
                <CardDescription>
                  Sequence recipients with Commission Tracker status
                </CardDescription>
              </div>
              <ToggleGroup
                type="single"
                value={contactedFilter}
                onValueChange={(value) => value && onContactedFilterChange(value)}
                data-testid="filter-contacted-status"
              >
                <ToggleGroupItem value="all" data-testid="filter-all">
                  All {recipients && `(${recipients.length})`}
                </ToggleGroupItem>
                <ToggleGroupItem value="contacted" data-testid="filter-contacted">
                  Contacted
                </ToggleGroupItem>
                <ToggleGroupItem value="not contacted" data-testid="filter-not-contacted">
                  Not Contacted
                </ToggleGroupItem>
                <ToggleGroupItem value="unknown" data-testid="filter-unknown">
                  Unknown
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedRecipientIds.size > 0 && (
              <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 border rounded-lg">
                <span className="text-sm font-medium">
                  {selectedRecipientIds.size} recipient{selectedRecipientIds.size !== 1 ? "s" : ""} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onClearSelection}
                    data-testid="button-clear-selection"
                  >
                    Clear
                  </Button>
                  <EhubBulkDeleteRecipientsDialog
                    open={bulkDeleteConfirmDialogOpen}
                    selectedCount={selectedRecipientIds.size}
                    isPending={isBulkDeletePending}
                    onOpenChange={onBulkDeleteDialogOpenChange}
                    onConfirm={onBulkDeleteConfirm}
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onDeleteSelectedClick}
                    disabled={isBulkDeletePending}
                    data-testid="button-delete-selected"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}
            {isLoadingRecipients ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : !recipients || recipients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recipients found{contactedFilter !== "all" ? ` with status "${contactedFilter}"` : ""}.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={recipientSelectAll}
                        onCheckedChange={(checked) => onSelectAllChange(checked === true)}
                        data-testid="checkbox-select-all-recipients"
                        aria-label="Select all recipients"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Tracker Status</TableHead>
                    <TableHead>Contacted</TableHead>
                    <TableHead>Sales Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((recipient) => (
                    <TableRow key={recipient.id} data-testid={`row-recipient-${recipient.id}`}>
                      <TableCell className="w-12">
                        <Checkbox
                          checked={selectedRecipientIds.has(recipient.id)}
                          onCheckedChange={(checked) => onRecipientSelectionChange(recipient.id, checked === true)}
                          data-testid={`checkbox-recipient-${recipient.id}`}
                          aria-label={`Select ${recipient.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{recipient.name}</TableCell>
                      <TableCell>{recipient.email}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        <a
                          href={recipient.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {recipient.link}
                        </a>
                      </TableCell>
                      <TableCell>
                        {recipient.trackerStatus ? (
                          <Badge variant="outline">{recipient.trackerStatus}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            recipient.contactedStatus === "contacted"
                              ? "default"
                              : recipient.contactedStatus === "unknown"
                                ? "secondary"
                                : "outline"
                          }
                          data-testid={`badge-contacted-${recipient.contactedStatus}`}
                        >
                          {recipient.contactedStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{recipient.salesSummary || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}
