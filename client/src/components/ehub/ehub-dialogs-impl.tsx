import { EhubFollowUpDialog } from "@/components/ehub/ehub-follow-up-dialog";
import { EhubNukeTestDataDialog } from "@/components/ehub/ehub-nuke-test-data-dialog";
import { EhubImportDialog } from "@/components/ehub/ehub-import-dialog";
import { EhubTestSendDialog } from "@/components/ehub/ehub-test-send-dialog";
import { EhubAddToSequenceDialog } from "@/components/ehub/ehub-add-to-sequence-dialog";
import { EhubDeleteSequenceDialog } from "@/components/ehub/ehub-delete-sequence-dialog";
import { EhubReplyScannerDialog } from "@/components/ehub/ehub-reply-scanner-dialog";
import { EhubNavigationWarningDialog } from "@/components/ehub/ehub-navigation-warning-dialog";
import { EhubEditStepDialog } from "@/components/ehub/ehub-edit-step-dialog";

interface EhubDialogsProps {
  addToSequenceDialogOpen: boolean;
  allContactsTotal: number;
  countsError: string | null;
  deleteSequenceOpen: boolean;
  editStepBody: string;
  editStepDialogOpen: boolean;
  editStepGuidance: string;
  editStepSubject: string;
  editingStepId: string | null;
  followUpBody: string;
  followUpDialogOpen: boolean;
  followUpSubject: string;
  importDialogOpen: boolean;
  isAddContactsPending: boolean;
  isDeletePending: boolean;
  isImportPending: boolean;
  isNukePending: boolean;
  isReplyScanPending: boolean;
  isSendFollowUpPending: boolean;
  isTestSendPending: boolean;
  isUpdateSettingsPending: boolean;
  isUpdateStepPending: boolean;
  navigationWarningOpen: boolean;
  nukeCounts: any;
  nukeDialogOpen: boolean;
  nukeEmailPattern: string;
  onAddToSequenceDialogOpenChange: (open: boolean) => void;
  onAddToSequenceCancel: () => void;
  onAddToSequenceSubmit: () => void;
  onDeleteSequenceConfirm: () => void;
  onDeleteSequenceOpenChange: (open: boolean) => void;
  onEditBodyChange: (value: string) => void;
  onEditDialogOpenChange: (open: boolean) => void;
  onEditGuidanceChange: (value: string) => void;
  onEditStepCancel: () => void;
  onEditStepSubmit: () => void;
  onEditSubjectChange: (value: string) => void;
  onFollowUpBodyChange: (value: string) => void;
  onFollowUpCancel: () => void;
  onFollowUpDialogOpenChange: (open: boolean) => void;
  onFollowUpSubjectChange: (value: string) => void;
  onFollowUpSubmit: () => void;
  onImportCancel: () => void;
  onImportDialogOpenChange: (open: boolean) => void;
  onImportSubmit: () => void;
  onNavigationCancel: () => void;
  onNavigationConfirm: () => void;
  onNavigationSave: () => void;
  onNavigationWarningOpenChange: (open: boolean) => void;
  onNukeConfirm: () => void;
  onNukeDialogOpenChange: (open: boolean) => void;
  onNukePatternChange: (value: string) => void;
  onReplyScannerCancel: () => void;
  onReplyScannerConfirm: () => void;
  onReplyScannerOpenChange: (open: boolean) => void;
  onSheetIdChange: (value: string) => void;
  onTargetSequenceChange: (value: string) => void;
  onTestDialogOpenChange: (open: boolean) => void;
  onTestEmailChange: (value: string) => void;
  onTestSendCancel: () => void;
  onTestSendSubmit: () => void;
  onToggleScanEmail: (email: string, checked: boolean) => void;
  onToggleScanEmailsAll: (checked: boolean) => void;
  scanPreviewResults: any;
  replyScannerOpen: boolean;
  selectedContactsCount: number;
  selectedScanEmails: Set<string>;
  selectedTestEmailId: string | null;
  selectAllMode: "none" | "page" | "all";
  sequences: any[] | undefined;
  sheetId: string;
  targetSequenceId: string;
  testDialogOpen: boolean;
  testEmail: string;
}

export function EhubDialogs({
  addToSequenceDialogOpen,
  allContactsTotal,
  countsError,
  deleteSequenceOpen,
  editStepBody,
  editStepDialogOpen,
  editStepGuidance,
  editStepSubject,
  editingStepId,
  followUpBody,
  followUpDialogOpen,
  followUpSubject,
  importDialogOpen,
  isAddContactsPending,
  isDeletePending,
  isImportPending,
  isNukePending,
  isReplyScanPending,
  isSendFollowUpPending,
  isTestSendPending,
  isUpdateSettingsPending,
  isUpdateStepPending,
  navigationWarningOpen,
  nukeCounts,
  nukeDialogOpen,
  nukeEmailPattern,
  onAddToSequenceDialogOpenChange,
  onAddToSequenceCancel,
  onAddToSequenceSubmit,
  onDeleteSequenceConfirm,
  onDeleteSequenceOpenChange,
  onEditBodyChange,
  onEditDialogOpenChange,
  onEditGuidanceChange,
  onEditStepCancel,
  onEditStepSubmit,
  onEditSubjectChange,
  onFollowUpBodyChange,
  onFollowUpCancel,
  onFollowUpDialogOpenChange,
  onFollowUpSubjectChange,
  onFollowUpSubmit,
  onImportCancel,
  onImportDialogOpenChange,
  onImportSubmit,
  onNavigationCancel,
  onNavigationConfirm,
  onNavigationSave,
  onNavigationWarningOpenChange,
  onNukeConfirm,
  onNukeDialogOpenChange,
  onNukePatternChange,
  onReplyScannerCancel,
  onReplyScannerConfirm,
  onReplyScannerOpenChange,
  onSheetIdChange,
  onTargetSequenceChange,
  onTestDialogOpenChange,
  onTestEmailChange,
  onTestSendCancel,
  onTestSendSubmit,
  onToggleScanEmail,
  onToggleScanEmailsAll,
  scanPreviewResults,
  replyScannerOpen,
  selectedContactsCount,
  selectedScanEmails,
  selectedTestEmailId,
  selectAllMode,
  sequences,
  sheetId,
  targetSequenceId,
  testDialogOpen,
  testEmail,
}: EhubDialogsProps) {
  return (
    <>
      <EhubFollowUpDialog
        open={followUpDialogOpen}
        subject={followUpSubject}
        body={followUpBody}
        selectedTestEmailId={selectedTestEmailId}
        isPending={isSendFollowUpPending}
        onOpenChange={onFollowUpDialogOpenChange}
        onSubjectChange={onFollowUpSubjectChange}
        onBodyChange={onFollowUpBodyChange}
        onCancel={onFollowUpCancel}
        onSubmit={onFollowUpSubmit}
      />

      <EhubNukeTestDataDialog
        open={nukeDialogOpen}
        nukeCounts={nukeCounts}
        countsError={countsError}
        nukeEmailPattern={nukeEmailPattern}
        isPending={isNukePending}
        onOpenChange={onNukeDialogOpenChange}
        onPatternChange={onNukePatternChange}
        onConfirm={onNukeConfirm}
      />

      <EhubImportDialog
        open={importDialogOpen}
        sheetId={sheetId}
        isPending={isImportPending}
        onOpenChange={onImportDialogOpenChange}
        onSheetIdChange={onSheetIdChange}
        onCancel={onImportCancel}
        onSubmit={onImportSubmit}
      />

      <EhubTestSendDialog
        open={testDialogOpen}
        testEmail={testEmail}
        isPending={isTestSendPending}
        onOpenChange={onTestDialogOpenChange}
        onTestEmailChange={onTestEmailChange}
        onCancel={onTestSendCancel}
        onSubmit={onTestSendSubmit}
      />

      <EhubAddToSequenceDialog
        open={addToSequenceDialogOpen}
        selectAllMode={selectAllMode}
        allContactsTotal={allContactsTotal}
        selectedContactsCount={selectedContactsCount}
        targetSequenceId={targetSequenceId}
        sequences={sequences}
        isPending={isAddContactsPending}
        onOpenChange={onAddToSequenceDialogOpenChange}
        onTargetSequenceChange={onTargetSequenceChange}
        onCancel={onAddToSequenceCancel}
        onSubmit={onAddToSequenceSubmit}
      />

      <EhubDeleteSequenceDialog
        open={deleteSequenceOpen}
        isPending={isDeletePending}
        onOpenChange={onDeleteSequenceOpenChange}
        onConfirm={onDeleteSequenceConfirm}
      />

      <EhubReplyScannerDialog
        open={replyScannerOpen}
        scanPreviewResults={scanPreviewResults}
        selectedScanEmails={selectedScanEmails}
        isPending={isReplyScanPending}
        onOpenChange={onReplyScannerOpenChange}
        onCancel={onReplyScannerCancel}
        onToggleAll={onToggleScanEmailsAll}
        onToggleEmail={onToggleScanEmail}
        onConfirm={onReplyScannerConfirm}
      />

      <EhubNavigationWarningDialog
        open={navigationWarningOpen}
        isPending={isUpdateSettingsPending}
        onOpenChange={onNavigationWarningOpenChange}
        onSave={onNavigationSave}
        onCancel={onNavigationCancel}
        onConfirm={onNavigationConfirm}
      />

      <EhubEditStepDialog
        open={editStepDialogOpen}
        subject={editStepSubject}
        body={editStepBody}
        guidance={editStepGuidance}
        editingStepId={editingStepId}
        isPending={isUpdateStepPending}
        onOpenChange={onEditDialogOpenChange}
        onSubjectChange={onEditSubjectChange}
        onBodyChange={onEditBodyChange}
        onGuidanceChange={onEditGuidanceChange}
        onCancel={onEditStepCancel}
        onSubmit={onEditStepSubmit}
      />
    </>
  );
}
