import type { Dispatch, RefObject, SetStateAction } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Loader2, Send, Sparkles, User as UserIcon } from "lucide-react";
import { EhubStrategySequenceComposer } from "@/components/ehub/ehub-strategy-sequence-composer";
import { EhubStrategySequenceSelector } from "@/components/ehub/ehub-strategy-sequence-selector";
import { EhubStrategyStepDelaysCard } from "@/components/ehub/ehub-strategy-step-delays-card";
import { EhubStrategyAssetsCards } from "@/components/ehub/ehub-strategy-assets-cards";
import { EhubCampaignBriefCard } from "@/components/ehub/ehub-campaign-brief-card";
import { EhubCampaignStatusCard } from "@/components/ehub/ehub-campaign-status-card";

interface EhubStrategyTabContentProps {
  currentSequence: any;
  emailAccounts: any[] | undefined;
  finalizedStrategyEdit: string;
  generateFinalizedStrategyMutation: any;
  isCreatePending: boolean;
  isSaveFinalizedPending: boolean;
  isSaveKeywordsPending: boolean;
  isSaveStepDelaysPending: boolean;
  isSendStrategyChatPending: boolean;
  isUpdateSequenceStatusPending: boolean;
  name: string;
  onEditStep: (step: any) => void;
  onCreateSequence: () => void;
  onFinalizeStrategy: () => void;
  onFinalizedStrategyEditChange: (value: string) => void;
  onInvalidActivate: (description: string) => void;
  onNameChange: (value: string) => void;
  onSaveFinalizedStrategy: () => void;
  onSaveKeywords: () => void;
  onSelectSequence: (id: string | null) => void;
  onSendStrategyMessage: () => void;
  onSenderEmailAccountChange: (id: string | null) => void;
  onSenderEmailAccountIdChange: (value: string | null) => void;
  onSequenceKeywordsChange: (value: string) => void;
  onSetRepeatLastStep: Dispatch<SetStateAction<boolean>>;
  onSetStepDelays: Dispatch<SetStateAction<number[]>>;
  onStrategyMessageChange: (value: string) => void;
  onUpdateStatus: (status: string) => void;
  repeatLastStep: boolean;
  saveStepDelaysMutation: any;
  selectedSequenceId: string | null;
  senderEmailAccountId: string | null;
  sequenceKeywords: string;
  sequenceSteps: any[] | undefined;
  sequences: any[] | undefined;
  stepDelays: number[];
  strategyMessage: string;
  strategyTranscript: any;
  toast: any;
  scrollRef: RefObject<HTMLDivElement>;
}

export function EhubStrategyTabContent({
  currentSequence,
  emailAccounts,
  finalizedStrategyEdit,
  generateFinalizedStrategyMutation,
  isCreatePending,
  isSaveFinalizedPending,
  isSaveKeywordsPending,
  isSendStrategyChatPending,
  isUpdateSequenceStatusPending,
  name,
  onEditStep,
  onCreateSequence,
  onFinalizeStrategy,
  onFinalizedStrategyEditChange,
  onInvalidActivate,
  onNameChange,
  onSaveFinalizedStrategy,
  onSaveKeywords,
  onSelectSequence,
  onSendStrategyMessage,
  onSenderEmailAccountChange,
  onSenderEmailAccountIdChange,
  onSequenceKeywordsChange,
  onSetRepeatLastStep,
  onSetStepDelays,
  onStrategyMessageChange,
  onUpdateStatus,
  repeatLastStep,
  saveStepDelaysMutation,
  selectedSequenceId,
  senderEmailAccountId,
  sequenceKeywords,
  sequenceSteps,
  sequences,
  stepDelays,
  strategyMessage,
  strategyTranscript,
  toast,
  scrollRef,
}: EhubStrategyTabContentProps) {
  return (
    <TabsContent value="strategy">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Sequence Selector + AI Chat */}
        <div className="space-y-4">
          {/* Sequence Selector Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Campaign Strategy</CardTitle>
              <CardDescription>Create sequences, chat with AI to plan campaigns, and configure timing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EhubStrategySequenceComposer
                name={name}
                senderEmailAccountId={senderEmailAccountId}
                emailAccounts={emailAccounts}
                isPending={isCreatePending}
                onNameChange={onNameChange}
                onSenderEmailAccountChange={onSenderEmailAccountIdChange}
                onSubmit={onCreateSequence}
              />

              <EhubStrategySequenceSelector
                selectedSequenceId={selectedSequenceId}
                sequences={sequences}
                currentSenderEmailAccountId={(currentSequence as any)?.senderEmailAccountId || null}
                emailAccounts={emailAccounts}
                onSelectSequence={onSelectSequence}
                onSenderEmailAccountChange={onSenderEmailAccountChange}
              />
            </CardContent>
          </Card>

          {/* AI Strategy Chat Card */}
          {selectedSequenceId && currentSequence ? (
            <Card className="flex flex-col">
              <CardHeader className="shrink-0 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle>AI Strategy Chat</CardTitle>
                    <CardDescription>Discuss your campaign goals, target audience, and messaging with the AI</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={onFinalizeStrategy}
                    disabled={!strategyTranscript?.messages?.length || generateFinalizedStrategyMutation.isPending}
                    data-testid="button-finalize-strategy"
                  >
                    {generateFinalizedStrategyMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Finalize Strategy
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                <ScrollArea className="h-[600px] border rounded-md p-4 bg-muted/10" ref={scrollRef as any}>
                  {strategyTranscript && strategyTranscript.messages && strategyTranscript.messages.length > 0 ? (
                    <div className="space-y-4">
                      {strategyTranscript.messages.map((msg: any) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          data-testid={`message-${msg.role}`}
                        >
                          <div className={`flex gap-2 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                            <div className="shrink-0">
                              {msg.role === "user" ? (
                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                  <UserIcon className="w-4 h-4 text-primary-foreground" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                                  <Bot className="w-4 h-4 text-secondary-foreground" />
                                </div>
                              )}
                            </div>
                            <div className={`rounded-lg p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <p className="text-xs opacity-70 mt-1">{new Date(msg.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {isSendStrategyChatPending && (
                        <div className="flex justify-start">
                          <div className="flex gap-2 max-w-[80%]">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                              <Bot className="w-4 h-4 text-secondary-foreground" />
                            </div>
                            <div className="rounded-lg p-3 bg-card border">
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-muted-foreground text-center">
                        Start a conversation with the AI to plan your campaign strategy
                      </p>
                    </div>
                  )}
                </ScrollArea>

                <div className="flex gap-2">
                  <Textarea
                    value={strategyMessage}
                    onChange={(e) => onStrategyMessageChange(e.target.value)}
                    placeholder="Ask the AI about your campaign strategy..."
                    className="flex-1 min-h-[60px] max-h-[200px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (strategyMessage.trim() && !isSendStrategyChatPending) {
                          onSendStrategyMessage();
                        }
                      }
                    }}
                    disabled={isSendStrategyChatPending}
                    data-testid="input-strategy-message"
                  />
                  <Button
                    onClick={onSendStrategyMessage}
                    disabled={!strategyMessage.trim() || isSendStrategyChatPending}
                    size="icon"
                    data-testid="button-send-strategy-message"
                  >
                    {isSendStrategyChatPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">Select a sequence above to begin planning your campaign strategy</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Configuration - only show when sequence selected */}
        <div className="space-y-4 lg:self-start">
          {selectedSequenceId && currentSequence ? (
            <>
              <EhubStrategyStepDelaysCard
                repeatLastStep={repeatLastStep}
                saveStepDelaysMutation={saveStepDelaysMutation}
                setRepeatLastStep={onSetRepeatLastStep}
                setStepDelays={onSetStepDelays}
                stepDelays={stepDelays}
                toast={toast}
              />

              <EhubStrategyAssetsCards
                currentSequence={currentSequence}
                isSavingKeywords={isSaveKeywordsPending}
                onEditStep={onEditStep}
                onSaveKeywords={onSaveKeywords}
                onSequenceKeywordsChange={onSequenceKeywordsChange}
                sequenceKeywords={sequenceKeywords}
                sequenceSteps={sequenceSteps}
              />

              <EhubCampaignBriefCard
                currentSequence={currentSequence}
                finalizedStrategyEdit={finalizedStrategyEdit}
                isPending={isSaveFinalizedPending}
                onChange={onFinalizedStrategyEditChange}
                onSave={onSaveFinalizedStrategy}
              />

              <EhubCampaignStatusCard
                selectedSequenceId={selectedSequenceId}
                sequences={sequences}
                stepDelays={stepDelays}
                strategyTranscript={strategyTranscript}
                updatePending={isUpdateSequenceStatusPending}
                onInvalidActivate={onInvalidActivate}
                onUpdateStatus={onUpdateStatus}
              />
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  Configuration options will appear here when you select a sequence
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </TabsContent>
  );
}
