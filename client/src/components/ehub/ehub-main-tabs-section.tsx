import type { TestEmailSend } from "@/components/ehub/ehub.types";
import { EhubMainTabs } from "@/components/ehub/ehub-main-tabs";

export function EhubMainTabsSection(props: any) {
  return (
    <EhubMainTabs
      activeTab={props.state.activeTab}
      allContactsData={props.queries.allContactsData}
      bulkDeleteConfirmDialogOpen={props.state.bulkDeleteConfirmDialogOpen}
      bulkDeleteRecipientsMutation={props.operationsMutations.bulkDeleteRecipientsMutation}
      checkReplyMutation={props.operationsMutations.checkReplyMutation}
      contactStatusFilter={props.state.contactStatusFilter}
      contactedFilter={props.state.contactedFilter}
      createMutation={props.sequenceMutations.createMutation}
      currentSequence={props.queries.currentSequence}
      currentProjectId={props.currentProjectId}
      deleteEmailAccountMutation={props.configMutations.deleteEmailAccountMutation}
      emailAccounts={props.queries.emailAccounts}
      finalizedStrategyEdit={props.state.finalizedStrategyEdit}
      generateFinalizedStrategyMutation={props.strategyMutations.generateFinalizedStrategyMutation}
      getStatusColor={props.actions.getStatusColor}
      handleClearSelection={props.actions.handleClearSelection}
      handleConnectEmail={props.handleConnectEmail}
      handleCreateSequence={props.actions.handleCreateSequence}
      handleDiscardSettings={props.actions.handleDiscardSettings}
      handleSaveSettings={props.actions.handleSaveSettings}
      handleSelectAllMatching={props.actions.handleSelectAllMatching}
      handleSelectAllOnPage={props.actions.handleSelectAllOnPage}
      handleTabChange={props.actions.handleTabChange}
      handleToggleContact={props.actions.handleToggleContact}
      isCreateDialogOpen={props.state.isCreateDialogOpen}
      isLoadingContacts={props.queries.isLoadingContacts}
      isLoadingEmailAccounts={props.queries.isLoadingEmailAccounts}
      isLoadingRecipients={props.queries.isLoadingRecipients}
      isLoadingTestEmails={props.queries.isLoadingTestEmails}
      isSettingsDirty={props.state.isSettingsDirty}
      name={props.state.name}
      onEditStep={(step: { id: string; subjectTemplate: string | null; bodyTemplate: string | null; aiGuidance: string | null }) => {
        props.state.setEditingStepId(step.id);
        props.state.setEditStepSubject(step.subjectTemplate || "");
        props.state.setEditStepBody(step.bodyTemplate || "");
        props.state.setEditStepGuidance(step.aiGuidance || "");
        props.state.setEditStepDialogOpen(true);
      }}
      onFollowUpFromTestEmail={(test: Pick<TestEmailSend, "id" | "subject">) => {
        props.state.setSelectedTestEmailId(test.id);
        props.state.setFollowUpSubject(`Re: ${test.subject}`);
        props.state.setFollowUpBody("");
        props.state.setFollowUpDialogOpen(true);
      }}
      onInvalidActivate={(description: string) => {
        props.toast({
          title: "Cannot Activate",
          description,
          variant: "destructive",
        });
      }}
      onOpenNukeTestData={() => {
        props.state.setNukeDialogOpen(true);
        props.state.setNukeCounts(null);
        props.state.setNukeEmailPattern("");
        props.state.setNukeConfirmText("");
        props.state.setCountsError(null);
      }}
      onSenderEmailAccountChange={(newSenderEmailAccountId: string | null) => {
        if (props.state.selectedSequenceId) {
          props.sequenceMutations.updateSequenceSenderMutation.mutate({
            sequenceId: props.state.selectedSequenceId,
            senderEmailAccountId: newSenderEmailAccountId,
          });
        }
      }}
      page={props.state.page}
      recipientSelectAll={props.state.recipientSelectAll}
      recipients={props.queries.recipients}
      recipientsError={props.queries.recipientsError as Error | null}
      repeatLastStep={props.state.repeatLastStep}
      saveFinalizedStrategyMutation={props.strategyMutations.saveFinalizedStrategyMutation}
      saveKeywordsMutation={props.strategyMutations.saveKeywordsMutation}
      saveStepDelaysMutation={props.strategyMutations.saveStepDelaysMutation}
      scanRepliesMutation={props.operationsMutations.scanRepliesMutation}
      scrollRef={props.state.scrollRef}
      search={props.state.search}
      selectedContacts={props.state.selectedContacts}
      selectedRecipientIds={props.state.selectedRecipientIds}
      selectedSequenceId={props.state.selectedSequenceId}
      senderEmailAccountId={props.state.senderEmailAccountId}
      sendStrategyChatMutation={props.strategyMutations.sendStrategyChatMutation}
      sendTestEmailMutation={props.operationsMutations.sendTestEmailMutation}
      sequenceKeywords={props.state.sequenceKeywords}
      sequenceSteps={props.queries.sequenceSteps}
      sequences={props.queries.sequences}
      setActiveTab={props.state.setActiveTab}
      setBulkDeleteConfirmDialogOpen={props.state.setBulkDeleteConfirmDialogOpen}
      setContactStatusFilter={props.state.setContactStatusFilter}
      setContactedFilter={props.state.setContactedFilter}
      setFinalizedStrategyEdit={props.state.setFinalizedStrategyEdit}
      setIsAddToSequenceDialogOpen={props.state.setIsAddToSequenceDialogOpen}
      setIsCreateDialogOpen={props.state.setIsCreateDialogOpen}
      setIsImportDialogOpen={props.state.setIsImportDialogOpen}
      setIsTestDialogOpen={props.state.setIsTestDialogOpen}
      setName={props.state.setName}
      setPage={props.state.setPage}
      setRecipientSelectAll={props.state.setRecipientSelectAll}
      setReplyScannerDialogOpen={props.state.setReplyScannerDialogOpen}
      setSearch={props.state.setSearch}
      setSelectedContacts={props.state.setSelectedContacts}
      setSelectedRecipientIds={props.state.setSelectedRecipientIds}
      setSelectedSequenceId={props.state.setSelectedSequenceId}
      setSelectAllMode={props.state.setSelectAllMode}
      setSenderEmailAccountId={props.state.setSenderEmailAccountId}
      setSettingsForm={props.state.setSettingsForm}
      setStepDelays={props.state.setStepDelays}
      setStrategyMessage={props.state.setStrategyMessage}
      setTestBody={props.state.setTestBody}
      setTestRecipientEmail={props.state.setTestRecipientEmail}
      setTestSubject={props.state.setTestSubject}
      setDeleteSequenceId={props.state.setDeleteSequenceId}
      setRepeatLastStep={props.state.setRepeatLastStep}
      setSequenceKeywords={props.state.setSequenceKeywords}
      settingsForm={props.state.settingsForm}
      stepDelays={props.state.stepDelays}
      strategyMessage={props.state.strategyMessage}
      strategyTranscript={props.queries.strategyTranscript}
      syntheticPreview={props.state.syntheticPreview}
      syntheticStoreContext={props.state.syntheticStoreContext}
      syntheticTestMutation={props.operationsMutations.syntheticTestMutation}
      testBody={props.state.testBody}
      testEmailHistory={props.queries.testEmailHistory}
      testRecipientEmail={props.state.testRecipientEmail}
      testSubject={props.state.testSubject}
      toast={props.toast}
      upcomingBlockedDays={props.queries.upcomingBlockedDays}
      updateBlacklistPreferenceMutation={props.configMutations.updateBlacklistPreferenceMutation}
      updateSequenceStatusMutation={props.sequenceMutations.updateSequenceStatusMutation}
      updateSettingsMutation={props.configMutations.updateSettingsMutation}
      user={props.user}
      userPreferences={props.queries.userPreferences}
    />
  );
}
