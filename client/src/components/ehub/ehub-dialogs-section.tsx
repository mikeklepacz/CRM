import { EhubDialogs } from "@/components/ehub/ehub-dialogs";

export function EhubDialogsSection(props: any) {
  const p = props;

  return (
    <EhubDialogs
      addToSequenceDialogOpen={p.isAddToSequenceDialogOpen}
      allContactsTotal={p.allContactsData?.total || 0}
      countsError={p.countsError}
      deleteSequenceOpen={!!p.deleteSequenceId}
      editStepBody={p.editStepBody}
      editStepDialogOpen={p.editStepDialogOpen}
      editStepGuidance={p.editStepGuidance}
      editStepSubject={p.editStepSubject}
      editingStepId={p.editingStepId}
      followUpBody={p.followUpBody}
      followUpDialogOpen={p.followUpDialogOpen}
      followUpSubject={p.followUpSubject}
      importDialogOpen={p.isImportDialogOpen}
      isAddContactsPending={p.addContactsMutation.isPending}
      isDeletePending={p.deleteMutation.isPending}
      isImportPending={p.importMutation.isPending}
      isNukePending={p.nukeTestDataMutation.isPending}
      isReplyScanPending={p.scanRepliesMutation.isPending}
      isSendFollowUpPending={p.sendFollowUpMutation.isPending}
      isTestSendPending={p.testSendMutation.isPending}
      isUpdateSettingsPending={p.updateSettingsMutation.isPending}
      isUpdateStepPending={p.updateStepTemplateMutation.isPending}
      navigationWarningOpen={p.showNavigationWarning}
      nukeCounts={p.nukeCounts}
      nukeDialogOpen={p.nukeDialogOpen}
      nukeEmailPattern={p.nukeEmailPattern}
      onAddToSequenceCancel={() => {
        p.setIsAddToSequenceDialogOpen(false);
        p.setTargetSequenceId("");
      }}
      onAddToSequenceDialogOpenChange={p.setIsAddToSequenceDialogOpen}
      onAddToSequenceSubmit={p.handleAddToSequence}
      onDeleteSequenceConfirm={() => {
        if (p.deleteSequenceId) {
          p.deleteMutation.mutate(p.deleteSequenceId);
        }
      }}
      onDeleteSequenceOpenChange={(open) => {
        if (!open) {
          p.setDeleteSequenceId(null);
        }
      }}
      onEditBodyChange={p.setEditStepBody}
      onEditDialogOpenChange={p.setEditStepDialogOpen}
      onEditGuidanceChange={p.setEditStepGuidance}
      onEditStepCancel={() => p.setEditStepDialogOpen(false)}
      onEditStepSubmit={() => {
        if (p.editingStepId) {
          p.updateStepTemplateMutation.mutate({
            stepId: p.editingStepId,
            subjectTemplate: p.editStepSubject || null,
            bodyTemplate: p.editStepBody || null,
            aiGuidance: p.editStepGuidance || null,
          });
        }
      }}
      onEditSubjectChange={p.setEditStepSubject}
      onFollowUpBodyChange={p.setFollowUpBody}
      onFollowUpCancel={() => {
        p.setFollowUpDialogOpen(false);
        p.setSelectedTestEmailId(null);
        p.setFollowUpSubject("");
        p.setFollowUpBody("");
      }}
      onFollowUpDialogOpenChange={p.setFollowUpDialogOpen}
      onFollowUpSubjectChange={p.setFollowUpSubject}
      onFollowUpSubmit={() => {
        if (p.selectedTestEmailId) {
          p.sendFollowUpMutation.mutate({
            id: p.selectedTestEmailId,
            subject: p.followUpSubject,
            body: p.followUpBody,
          });
        }
      }}
      onImportCancel={() => p.setIsImportDialogOpen(false)}
      onImportDialogOpenChange={p.setIsImportDialogOpen}
      onImportSubmit={p.handleImport}
      onNavigationCancel={p.handleCancelNavigation}
      onNavigationConfirm={p.handleConfirmNavigation}
      onNavigationSave={() => {
        p.handleSaveSettings();
        p.setShowNavigationWarning(false);
        if (p.pendingTab) {
          p.setActiveTab(p.pendingTab);
          p.setPendingTab(null);
        }
      }}
      onNavigationWarningOpenChange={p.setShowNavigationWarning}
      onNukeConfirm={() => p.nukeTestDataMutation.mutate()}
      onNukeDialogOpenChange={p.setNukeDialogOpen}
      onNukePatternChange={p.setNukeEmailPattern}
      onReplyScannerCancel={() => {
        p.setReplyScannerDialogOpen(false);
        p.setScanPreviewResults(null);
      }}
      onReplyScannerConfirm={() =>
        p.scanRepliesMutation.mutate({ dryRun: false, selectedEmails: Array.from(p.selectedScanEmails) })
      }
      onReplyScannerOpenChange={p.setReplyScannerDialogOpen}
      onSheetIdChange={p.setSheetId}
      onTargetSequenceChange={p.setTargetSequenceId}
      onTestDialogOpenChange={p.setIsTestDialogOpen}
      onTestEmailChange={p.setTestEmail}
      onTestSendCancel={() => p.setIsTestDialogOpen(false)}
      onTestSendSubmit={p.handleTestSend}
      onToggleScanEmail={(email, checked) => {
        const newSet = new Set(p.selectedScanEmails);
        if (checked) {
          newSet.add(email);
        } else {
          newSet.delete(email);
        }
        p.setSelectedScanEmails(newSet);
      }}
      onToggleScanEmailsAll={(checked) => {
        if (checked && p.scanPreviewResults) {
          const enrollable = p.scanPreviewResults.details
            .filter((detail: any) => detail.status === "newly_enrolled" || detail.status === "promoted")
            .map((detail: any) => detail.email);
          p.setSelectedScanEmails(new Set(enrollable));
        } else {
          p.setSelectedScanEmails(new Set());
        }
      }}
      replyScannerOpen={p.replyScannnerDialogOpen}
      scanPreviewResults={p.scanPreviewResults}
      selectedContactsCount={p.selectedContacts.length}
      selectedScanEmails={p.selectedScanEmails}
      selectedTestEmailId={p.selectedTestEmailId}
      selectAllMode={p.selectAllMode}
      sequences={p.sequences}
      sheetId={p.sheetId}
      targetSequenceId={p.targetSequenceId}
      testDialogOpen={p.isTestDialogOpen}
      testEmail={p.testEmail}
    />
  );
}
