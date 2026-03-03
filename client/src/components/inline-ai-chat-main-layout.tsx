import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { ConversationsCollapsibleSidebar } from "@/components/conversations-collapsible-sidebar";
import { TemplateLibraryCollapsible } from "@/components/template-library-collapsible";
import { InlineAiChatHeader } from "@/components/inline-ai-chat-header";
import { InlineAiChatTimeline } from "@/components/inline-ai-chat-timeline";
import { InlineAiChatMessageInput } from "@/components/inline-ai-chat-message-input";

export function InlineAiChatMainLayout(props: any) {
  const {
    sidebarOpen,
    setSidebarOpen,
    conversations,
    conversationsByProject,
    conversationsOpen,
    projects,
    selectedConversationId,
    createConversationMutation,
    deleteConversationMutation,
    deleteProjectMutation,
    moveConversationMutation,
    onNewProject,
    onRenameConversation,
    onSelectConversation,
    onConversationsToggle,
    deleteTemplateMutation,
    filteredTemplates,
    storeContext,
    handleCopyTemplate,
    handleEditTemplateFromLibrary,
    setTemplateBuilderOpen,
    handleEmailTemplate,
    handleInjectTemplate,
    handleOpenTemplateBuilderFromSidebar,
    setTemplateSearch,
    templatesOpen,
    onTemplatesToggle,
    templateSearch,
    templates,
    selectedConversation,
    timeline,
    toast,
    isSending,
    mergedTimeline,
    messagesLoading,
    scrollBottomRef,
    scrollRef,
    user,
    copyMessageToClipboard,
    makeTemplateFromMessage,
    handleRetryMessage,
    messageInput,
    handleKeyPress,
    setMessageInput,
    handleSendMessage,
  } = props;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r flex flex-col min-h-0 h-full">
          <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
            <h3 className="font-semibold text-sm">Wick Coach</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="h-7 w-7"
              data-testid="button-close-sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <ConversationsCollapsibleSidebar
            conversations={conversations}
            conversationsByProject={conversationsByProject}
            conversationsOpen={conversationsOpen}
            projects={projects}
            selectedConversationId={selectedConversationId}
            onCreateConversation={() => createConversationMutation.mutate()}
            onDeleteConversation={(conversationId) => deleteConversationMutation.mutate(conversationId)}
            onDeleteProject={(projectId) => deleteProjectMutation.mutate(projectId)}
            onMoveConversation={(conversationId, projectId) => moveConversationMutation.mutate({ conversationId, projectId })}
            onNewProject={onNewProject}
            onRenameConversation={onRenameConversation}
            onSelectConversation={onSelectConversation}
            onToggle={onConversationsToggle}
          />

          <TemplateLibraryCollapsible
            deletePending={deleteTemplateMutation.isPending}
            filteredTemplates={filteredTemplates}
            hasEmailContext={!!(storeContext?.email || storeContext?.poc_email)}
            onCopyTemplate={handleCopyTemplate}
            onDeleteTemplate={(id) => deleteTemplateMutation.mutate(id)}
            onEditTemplate={(template) => {
              handleEditTemplateFromLibrary(template);
              setTemplateBuilderOpen(true);
            }}
            onEmailTemplate={handleEmailTemplate}
            onInjectTemplate={handleInjectTemplate}
            onOpenTemplateBuilder={handleOpenTemplateBuilderFromSidebar}
            onSearchChange={setTemplateSearch}
            onToggle={onTemplatesToggle}
            templateSearch={templateSearch}
            templates={templates}
            templatesOpen={templatesOpen}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
        <InlineAiChatHeader
          contextStoreName={selectedConversation?.contextData?.storeName}
          hasInjectedScripts={timeline.some((item: any) => item.type === "script")}
          sidebarOpen={sidebarOpen}
          onClearScripts={() => {
            props.setTimeline((prev: any[]) => prev.filter((item: any) => item.type !== "script"));
            toast({ title: "Scripts Cleared", description: "Script display reset" });
          }}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <InlineAiChatTimeline
          isSending={isSending}
          mergedTimeline={mergedTimeline}
          messagesLoading={messagesLoading}
          scrollBottomRef={scrollBottomRef}
          scrollRef={scrollRef}
          selectedConversationId={selectedConversationId}
          storeContext={storeContext}
          user={user}
          onCopyMessageToClipboard={copyMessageToClipboard}
          onMakeTemplateFromMessage={makeTemplateFromMessage}
          onRetryMessage={handleRetryMessage}
          onStartChat={() => createConversationMutation.mutate()}
        />

        <InlineAiChatMessageInput
          isSending={isSending}
          messageInput={messageInput}
          onKeyPress={handleKeyPress}
          onMessageInputChange={setMessageInput}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
