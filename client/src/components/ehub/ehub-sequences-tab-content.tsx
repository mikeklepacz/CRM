import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { EhubCreateSequenceDialog } from "@/components/ehub/ehub-create-sequence-dialog";
import { EhubSequencesCard } from "@/components/ehub/ehub-sequences-card";

interface EhubSequencesTabContentProps {
  createMutation: any;
  emailAccounts: any[] | undefined;
  getStatusColor: (status: string) => "default" | "secondary" | "destructive" | "outline";
  handleCreateSequence: () => void;
  isCreateDialogOpen: boolean;
  name: string;
  onCreateDialogOpenChange: (open: boolean) => void;
  onDeleteSequence: (sequenceId: string) => void;
  onImportSequence: (sequenceId: string) => void;
  onNameChange: (value: string) => void;
  onScanReplies: () => void;
  onSelectSequence: (sequenceId: string) => void;
  onSenderEmailAccountChange: (value: string | null) => void;
  onTestSequence: (sequenceId: string) => void;
  onTogglePauseResume: (sequenceId: string, status: string) => Promise<void>;
  scanRepliesMutation: any;
  senderEmailAccountId: string | null;
  sequences: any[] | undefined;
  updateSequenceStatusMutation: any;
}

export function EhubSequencesTabContent({
  createMutation,
  emailAccounts,
  getStatusColor,
  handleCreateSequence,
  isCreateDialogOpen,
  name,
  onCreateDialogOpenChange,
  onDeleteSequence,
  onImportSequence,
  onNameChange,
  onScanReplies,
  onSelectSequence,
  onSenderEmailAccountChange,
  onTestSequence,
  onTogglePauseResume,
  scanRepliesMutation,
  senderEmailAccountId,
  sequences,
  updateSequenceStatusMutation,
}: EhubSequencesTabContentProps) {
  return (
    <TabsContent value="sequences" className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={onScanReplies}
          disabled={scanRepliesMutation.isPending}
          data-testid="button-scan-replies"
        >
          {scanRepliesMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
          Scan for Replies
        </Button>
        <EhubCreateSequenceDialog
          open={isCreateDialogOpen}
          name={name}
          senderEmailAccountId={senderEmailAccountId}
          emailAccounts={emailAccounts}
          isPending={createMutation.isPending}
          onOpenChange={onCreateDialogOpenChange}
          onNameChange={onNameChange}
          onSenderEmailAccountChange={onSenderEmailAccountChange}
          onCancel={() => onCreateDialogOpenChange(false)}
          onSubmit={handleCreateSequence}
        />
      </div>

      <EhubSequencesCard
        sequences={sequences}
        isUpdatingStatus={updateSequenceStatusMutation.isPending}
        getStatusColor={getStatusColor}
        onSelectSequence={onSelectSequence}
        onImport={onImportSequence}
        onTest={onTestSequence}
        onTogglePauseResume={onTogglePauseResume}
        onDelete={onDeleteSequence}
      />
    </TabsContent>
  );
}
