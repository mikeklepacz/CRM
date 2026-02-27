import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueueView } from "@/components/ehub/ehub-queue-view";
import { SentHistoryView } from "@/components/ehub/ehub-sent-history-view";
import { ScannerManagementView } from "@/components/ehub/ehub-scanner-management-view";
import { EhubSettingsSendingConfigSection } from "@/components/ehub/ehub-settings-sending-config-section";
import { EhubSettingsClientTimeHolidaySection } from "@/components/ehub/ehub-settings-client-time-holiday-section";
import { EhubSettingsPersonalizationActions } from "@/components/ehub/ehub-settings-personalization-actions";
import { EhubEmailAccountsCard } from "@/components/ehub/ehub-email-accounts-card";
import { EhubBlacklistCheckingCard } from "@/components/ehub/ehub-blacklist-checking-card";
import { EhubTestDataDangerCard } from "@/components/ehub/ehub-test-data-danger-card";
import { EhubSyntheticTestCard } from "@/components/ehub/ehub-synthetic-test-card";
import { EhubTestEmailComposerCard } from "@/components/ehub/ehub-test-email-composer-card";
import { EhubTestEmailHistoryCard } from "@/components/ehub/ehub-test-email-history-card";

interface EhubOperationsTabsProps {
  canAccessAdmin: boolean;
  checkReplyMutation: any;
  deleteEmailAccountMutation: any;
  emailAccounts: any[] | undefined;
  handleConnectEmail: () => void;
  handleDiscardSettings: () => void;
  handleSaveSettings: () => void;
  isLoadingEmailAccounts: boolean;
  isLoadingTestEmails: boolean;
  isSettingsDirty: boolean;
  onFollowUpFromTestEmail: (test: any) => void;
  onOpenNukeTestData: () => void;
  selectedSequenceId: string | null;
  sendTestEmailMutation: any;
  sequences: any[] | undefined;
  setSettingsForm: (value: any) => void;
  setTestBody: (value: string) => void;
  setTestRecipientEmail: (value: string) => void;
  setTestSubject: (value: string) => void;
  settingsForm: any;
  syntheticPreview: any;
  syntheticStoreContext: any;
  syntheticTestMutation: any;
  testBody: string;
  testEmailHistory: any;
  testRecipientEmail: string;
  testSubject: string;
  upcomingBlockedDays: any;
  updateBlacklistPreferenceMutation: any;
  updateSettingsMutation: any;
  userPreferences: { blacklistCheckEnabled?: boolean } | undefined;
}

export function EhubOperationsTabs({
  canAccessAdmin,
  checkReplyMutation,
  deleteEmailAccountMutation,
  emailAccounts,
  handleConnectEmail,
  handleDiscardSettings,
  handleSaveSettings,
  isLoadingEmailAccounts,
  isLoadingTestEmails,
  isSettingsDirty,
  onFollowUpFromTestEmail,
  onOpenNukeTestData,
  selectedSequenceId,
  sendTestEmailMutation,
  sequences,
  setSettingsForm,
  setTestBody,
  setTestRecipientEmail,
  setTestSubject,
  settingsForm,
  syntheticPreview,
  syntheticStoreContext,
  syntheticTestMutation,
  testBody,
  testEmailHistory,
  testRecipientEmail,
  testSubject,
  upcomingBlockedDays,
  updateBlacklistPreferenceMutation,
  updateSettingsMutation,
  userPreferences,
}: EhubOperationsTabsProps) {
  return (
    <>
      {/* Queue Tab with sub-tabs */}
      <TabsContent value="queue" className="space-y-4">
        <Tabs defaultValue="active-queue" className="w-full">
          <TabsList data-testid="tabs-queue-view">
            <TabsTrigger value="active-queue" data-testid="tab-active-queue">
              Queue
            </TabsTrigger>
            <TabsTrigger value="sent-history" data-testid="tab-sent-history">
              Sent History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active-queue" className="mt-4">
            <QueueView />
          </TabsContent>

          <TabsContent value="sent-history" className="mt-4">
            <SentHistoryView />
          </TabsContent>
        </Tabs>
      </TabsContent>

      {/* Scanner Management Tab (Admin Only) */}
      {canAccessAdmin && (
        <TabsContent value="scanner" className="space-y-4">
          <ScannerManagementView />
        </TabsContent>
      )}

      {/* Settings Tab */}
      <TabsContent value="settings" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Global E-Hub Settings</CardTitle>
            <CardDescription>
              Configure system-wide settings for email sending, AI personalization, and automation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EhubSettingsSendingConfigSection settingsForm={settingsForm} setSettingsForm={setSettingsForm} />

            <EhubSettingsClientTimeHolidaySection
              settingsForm={settingsForm}
              setSettingsForm={setSettingsForm}
              upcomingBlockedDays={upcomingBlockedDays}
            />

            <EhubSettingsPersonalizationActions
              isPending={updateSettingsMutation.isPending}
              isSettingsDirty={!!isSettingsDirty}
              settingsForm={settingsForm}
              onDiscardSettings={handleDiscardSettings}
              onSaveSettings={handleSaveSettings}
              onSettingsFormChange={setSettingsForm}
            />
          </CardContent>
        </Card>

        <EhubEmailAccountsCard
          emailAccounts={emailAccounts}
          isLoadingEmailAccounts={isLoadingEmailAccounts}
          isPendingDelete={deleteEmailAccountMutation.isPending}
          onConnectEmail={handleConnectEmail}
          onDeleteEmailAccount={(id) => deleteEmailAccountMutation.mutate(id)}
        />
      </TabsContent>

      {/* Test Emails Tab */}
      {canAccessAdmin && (
        <TabsContent value="test-emails" className="space-y-4">
          <EhubBlacklistCheckingCard
            enabled={userPreferences?.blacklistCheckEnabled ?? true}
            isPending={updateBlacklistPreferenceMutation.isPending}
            onCheckedChange={(checked) => updateBlacklistPreferenceMutation.mutate(checked)}
          />

          <EhubTestDataDangerCard onOpen={onOpenNukeTestData} />

          <EhubSyntheticTestCard
            hasCampaignBrief={!!(sequences?.find((s) => s.id === selectedSequenceId) as any)?.finalizedStrategy?.trim()}
            isPending={syntheticTestMutation.isPending}
            onRun={() => syntheticTestMutation.mutate()}
            selectedSequenceId={selectedSequenceId}
            syntheticPreview={syntheticPreview}
            syntheticStoreContext={syntheticStoreContext}
          />

          <EhubTestEmailComposerCard
            recipientEmail={testRecipientEmail}
            subject={testSubject}
            body={testBody}
            isPending={sendTestEmailMutation.isPending}
            onRecipientChange={setTestRecipientEmail}
            onSubjectChange={setTestSubject}
            onBodyChange={setTestBody}
            onSend={() =>
              sendTestEmailMutation.mutate({
                recipientEmail: testRecipientEmail,
                subject: testSubject,
                body: testBody,
              })
            }
          />

          <EhubTestEmailHistoryCard
            checkReplyPending={checkReplyMutation.isPending}
            isLoading={isLoadingTestEmails}
            testEmailHistory={testEmailHistory}
            onCheckReply={(id) => checkReplyMutation.mutate(id)}
            onFollowUp={onFollowUpFromTestEmail}
          />
        </TabsContent>
      )}
    </>
  );
}
