import { Database, Mail, MessageSquare, Search, Settings, TestTube2, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { EhubAllContactsTab } from "@/components/ehub/ehub-all-contacts-tab";
import { EhubSequencesTabContent } from "@/components/ehub/ehub-sequences-tab-content";
import { EhubRecipientsTab } from "@/components/ehub/ehub-recipients-tab";
import { EhubStrategyTabContent } from "@/components/ehub/ehub-strategy-tab-content";
import { EhubOperationsTabs } from "@/components/ehub/ehub-operations-tabs";

export function EhubMainTabs(props: any) {
  const p = props;

  return (
    <Tabs value={p.activeTab} onValueChange={p.handleTabChange} className="w-full">
      <TabsList>
        <TabsTrigger value="all-contacts" data-testid="tab-all-contacts">
          <Database className="w-4 h-4 mr-2" />
          All Contacts
        </TabsTrigger>
        <TabsTrigger value="sequences" data-testid="tab-sequences">
          <Mail className="w-4 h-4 mr-2" />
          Sequences
        </TabsTrigger>
        <TabsTrigger value="recipients" data-testid="tab-recipients">
          <Users className="w-4 h-4 mr-2" />
          Recipients
        </TabsTrigger>
        <TabsTrigger value="strategy" data-testid="tab-strategy">
          <MessageSquare className="w-4 h-4 mr-2" />
          Campaign Strategy
        </TabsTrigger>
        <TabsTrigger value="queue" data-testid="tab-queue">
          <Mail className="w-4 h-4 mr-2" />
          Queue
        </TabsTrigger>
        {canAccessAdminFeatures(p.user) && (
          <TabsTrigger value="scanner" data-testid="tab-scanner">
            <Search className="w-4 h-4 mr-2" />
            Scanner
          </TabsTrigger>
        )}
        <TabsTrigger value="settings" data-testid="tab-settings">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </TabsTrigger>
        {canAccessAdminFeatures(p.user) && (
          <TabsTrigger value="test-emails" data-testid="tab-test-emails">
            <TestTube2 className="w-4 h-4 mr-2" />
            Test Emails
          </TabsTrigger>
        )}
      </TabsList>

      <EhubAllContactsTab
        allContactsData={p.allContactsData}
        contactStatusFilter={p.contactStatusFilter}
        handleClearSelection={p.handleClearSelection}
        handleSelectAllMatching={p.handleSelectAllMatching}
        handleSelectAllOnPage={p.handleSelectAllOnPage}
        handleToggleContact={p.handleToggleContact}
        isLoadingContacts={p.isLoadingContacts}
        onNextPage={() => p.setPage((prev: number) => prev + 1)}
        onPreviousPage={() => p.setPage((prev: number) => Math.max(1, prev - 1))}
        page={p.page}
        search={p.search}
        selectAllMode={p.selectAllMode}
        selectedContacts={p.selectedContacts}
        setContactStatusFilter={p.setContactStatusFilter}
        setIsAddToSequenceDialogOpen={p.setIsAddToSequenceDialogOpen}
        setSearch={p.setSearch}
      />

      <EhubSequencesTabContent
        createMutation={p.createMutation}
        emailAccounts={p.emailAccounts}
        getStatusColor={p.getStatusColor}
        handleCreateSequence={p.handleCreateSequence}
        isCreateDialogOpen={p.isCreateDialogOpen}
        name={p.name}
        onCreateDialogOpenChange={p.setIsCreateDialogOpen}
        onDeleteSequence={p.setDeleteSequenceId}
        onImportSequence={(sequenceId) => {
          p.setSelectedSequenceId(sequenceId);
          p.setIsImportDialogOpen(true);
        }}
        onNameChange={p.setName}
        onScanReplies={() => {
          p.setReplyScannerDialogOpen(true);
          p.scanRepliesMutation.mutate({ dryRun: true });
        }}
        onSelectSequence={(sequenceId) => {
          p.setSelectedSequenceId(sequenceId);
          p.setActiveTab("recipients");
        }}
        onSenderEmailAccountChange={p.setSenderEmailAccountId}
        onTestSequence={(sequenceId) => {
          p.setSelectedSequenceId(sequenceId);
          p.setIsTestDialogOpen(true);
        }}
        onTogglePauseResume={async (sequenceId, status) => {
          const newStatus = status === "paused" ? "active" : "paused";
          await p.updateSequenceStatusMutation.mutateAsync({ sequenceId, status: newStatus });
        }}
        scanRepliesMutation={p.scanRepliesMutation}
        senderEmailAccountId={p.senderEmailAccountId}
        sequences={p.sequences}
        updateSequenceStatusMutation={p.updateSequenceStatusMutation}
      />

      <EhubRecipientsTab
        bulkDeleteConfirmDialogOpen={p.bulkDeleteConfirmDialogOpen}
        contactedFilter={p.contactedFilter}
        isBulkDeletePending={p.bulkDeleteRecipientsMutation.isPending}
        isLoadingRecipients={p.isLoadingRecipients}
        recipientSelectAll={p.recipientSelectAll}
        recipients={p.recipients}
        recipientsError={p.recipientsError}
        selectedRecipientIds={p.selectedRecipientIds}
        selectedSequenceId={p.selectedSequenceId}
        onBulkDeleteConfirm={() => {
          p.bulkDeleteRecipientsMutation.mutate(Array.from(p.selectedRecipientIds));
        }}
        onBulkDeleteDialogOpenChange={p.setBulkDeleteConfirmDialogOpen}
        onContactedFilterChange={p.setContactedFilter}
        onClearSelection={() => {
          p.setSelectedRecipientIds(new Set());
          p.setRecipientSelectAll(false);
        }}
        onDeleteSelectedClick={() => p.setBulkDeleteConfirmDialogOpen(true)}
        onRecipientSelectionChange={(recipientId, checked) => {
          const newSelected = new Set(p.selectedRecipientIds);
          if (checked) {
            newSelected.add(recipientId);
          } else {
            newSelected.delete(recipientId);
          }
          p.setSelectedRecipientIds(newSelected);
          p.setRecipientSelectAll(newSelected.size === (p.recipients?.length || 0));
        }}
        onSelectAllChange={(checked) => {
          p.setRecipientSelectAll(checked);
          if (checked && p.recipients) {
            p.setSelectedRecipientIds(new Set(p.recipients.map((r: any) => r.id)));
          } else {
            p.setSelectedRecipientIds(new Set());
          }
        }}
      />

      <EhubStrategyTabContent
        currentSequence={p.currentSequence}
        emailAccounts={p.emailAccounts}
        finalizedStrategyEdit={p.finalizedStrategyEdit}
        generateFinalizedStrategyMutation={p.generateFinalizedStrategyMutation}
        isCreatePending={p.createMutation.isPending}
        isSaveFinalizedPending={p.saveFinalizedStrategyMutation.isPending}
        isSaveKeywordsPending={p.saveKeywordsMutation.isPending}
        isSaveStepDelaysPending={p.saveStepDelaysMutation.isPending}
        isSendStrategyChatPending={p.sendStrategyChatMutation.isPending}
        isUpdateSequenceStatusPending={p.updateSequenceStatusMutation.isPending}
        name={p.name}
        onCreateSequence={p.handleCreateSequence}
        onEditStep={p.onEditStep}
        onFinalizeStrategy={() => p.generateFinalizedStrategyMutation.mutate()}
        onFinalizedStrategyEditChange={p.setFinalizedStrategyEdit}
        onInvalidActivate={p.onInvalidActivate}
        onNameChange={p.setName}
        onSaveFinalizedStrategy={() => p.saveFinalizedStrategyMutation.mutate(p.finalizedStrategyEdit)}
        onSaveKeywords={() => p.saveKeywordsMutation.mutate(p.sequenceKeywords)}
        onSelectSequence={p.setSelectedSequenceId}
        onSendStrategyMessage={() => p.sendStrategyChatMutation.mutate(p.strategyMessage)}
        onSenderEmailAccountChange={p.onSenderEmailAccountChange}
        onSenderEmailAccountIdChange={p.setSenderEmailAccountId}
        onSequenceKeywordsChange={p.setSequenceKeywords}
        onSetRepeatLastStep={p.setRepeatLastStep}
        onSetStepDelays={p.setStepDelays}
        onStrategyMessageChange={p.setStrategyMessage}
        onUpdateStatus={(status) => p.updateSequenceStatusMutation.mutate({ sequenceId: p.selectedSequenceId!, status })}
        repeatLastStep={p.repeatLastStep}
        saveStepDelaysMutation={p.saveStepDelaysMutation}
        selectedSequenceId={p.selectedSequenceId}
        senderEmailAccountId={p.senderEmailAccountId}
        sequenceKeywords={p.sequenceKeywords}
        sequenceSteps={p.sequenceSteps}
        sequences={p.sequences}
        stepDelays={p.stepDelays}
        strategyMessage={p.strategyMessage}
        strategyTranscript={p.strategyTranscript}
        toast={p.toast}
        scrollRef={p.scrollRef}
      />

      <EhubOperationsTabs
        canAccessAdmin={canAccessAdminFeatures(p.user)}
        checkReplyMutation={p.checkReplyMutation}
        deleteEmailAccountMutation={p.deleteEmailAccountMutation}
        emailAccounts={p.emailAccounts}
        handleConnectEmail={p.handleConnectEmail}
        handleDiscardSettings={p.handleDiscardSettings}
        handleSaveSettings={p.handleSaveSettings}
        isLoadingEmailAccounts={p.isLoadingEmailAccounts}
        isLoadingTestEmails={p.isLoadingTestEmails}
        isSettingsDirty={!!p.isSettingsDirty}
        onFollowUpFromTestEmail={p.onFollowUpFromTestEmail}
        onOpenNukeTestData={p.onOpenNukeTestData}
        selectedSequenceId={p.selectedSequenceId}
        sendTestEmailMutation={p.sendTestEmailMutation}
        sequences={p.sequences}
        setSettingsForm={p.setSettingsForm}
        setTestBody={p.setTestBody}
        setTestRecipientEmail={p.setTestRecipientEmail}
        setTestSubject={p.setTestSubject}
        settingsForm={p.settingsForm}
        syntheticPreview={p.syntheticPreview}
        syntheticStoreContext={p.syntheticStoreContext}
        syntheticTestMutation={p.syntheticTestMutation}
        testBody={p.testBody}
        testEmailHistory={p.testEmailHistory}
        testRecipientEmail={p.testRecipientEmail}
        testSubject={p.testSubject}
        upcomingBlockedDays={p.upcomingBlockedDays}
        updateBlacklistPreferenceMutation={p.updateBlacklistPreferenceMutation}
        updateSettingsMutation={p.updateSettingsMutation}
        userPreferences={p.userPreferences}
      />
    </Tabs>
  );
}
