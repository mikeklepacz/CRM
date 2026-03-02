import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { InlineAIChatEnhancedProps } from "@/components/inline-ai-chat-enhanced.types";
import { InlineAiChatRender } from "@/components/inline-ai-chat/inline-ai-chat-render";
import {
  convertToDirectImageUrl,
  extractGoogleDriveFileId,
  handleImageError,
} from "@/components/inline-ai-chat/google-drive-image-utils";
import { formatEmailTemplate, parseEmailTemplate } from "@/components/inline-ai-chat/template-format-utils";
import {
  autoDetectPlaceholders as autoDetectPlaceholdersUtil,
  availableVariables,
  replaceTemplateVariables as replaceTemplateVariablesUtil,
} from "@/components/inline-ai-chat/template-variable-utils";
import { useInlineAiQueries } from "@/components/inline-ai-chat/use-inline-ai-queries";
import { useInlineAiTemplateMutations } from "@/components/inline-ai-chat/use-inline-ai-template-mutations";
import { useInlineAiChatMutations } from "@/components/inline-ai-chat/use-inline-ai-chat-mutations";
import { useInlineAiEffects } from "@/components/inline-ai-chat/use-inline-ai-effects";
import { useInlineAiMessageActions } from "@/components/inline-ai-chat/use-inline-ai-message-actions";
import { useInlineAiDerived } from "@/components/inline-ai-chat/use-inline-ai-derived";
import { useInlineAiBuilderActions } from "@/components/inline-ai-chat/use-inline-ai-builder-actions";
import { useInlineAiTemplateActions } from "@/components/inline-ai-chat/use-inline-ai-template-actions";
import { useInlineAiState } from "@/components/inline-ai-chat/use-inline-ai-state";
import { useInlineAiRenderProps } from "@/components/inline-ai-chat/use-inline-ai-render-props";

export function InlineAIChatControllerCore({
  storeContext,
  contextUpdateTrigger,
  loadDefaultScriptTrigger,
  trackerSheetId,
  onStatusChange,
}: InlineAIChatEnhancedProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const state = useInlineAiState();

  const replaceTemplateVariables = (content: string, storeData: any, currentUser: any) =>
    replaceTemplateVariablesUtil(content, storeData, currentUser);

  const queries = useInlineAiQueries({
    selectedConversationId: state.selectedConversationId,
    timeline: state.timeline,
  });

  const templateMutations = useInlineAiTemplateMutations({
    toast,
    userTags: queries.userTags,
    setBuilderTitle: state.setBuilderTitle,
    setBuilderContent: state.setBuilderContent,
    setBuilderType: state.setBuilderType,
    setBuilderTags: state.setBuilderTags,
    setBuilderIsDefault: state.setBuilderIsDefault,
    setEditingTemplateId: state.setEditingTemplateId,
    setSelectedTagIds: state.setSelectedTagIds,
    setTagEditMode: state.setTagEditMode,
  });

  const chatMutations = useInlineAiChatMutations({
    storeContext,
    toast,
    trackerSheetId,
    onStatusChange,
    setSelectedConversationId: state.setSelectedConversationId,
    setNewProjectDialogOpen: state.setNewProjectDialogOpen,
    setNewProjectName: state.setNewProjectName,
    setRenameDialogOpen: state.setRenameDialogOpen,
    setRenamingConversationId: state.setRenamingConversationId,
    setNewConversationTitle: state.setNewConversationTitle,
  });

  useInlineAiEffects({
    selectedConversationId: state.selectedConversationId,
    setTimeline: state.setTimeline,
    mergedTimeline: queries.mergedTimeline,
    isSending: state.isSending,
    scrollBottomRef: state.scrollBottomRef,
    isInjectingScriptRef: state.isInjectingScriptRef,
    previousTimelineLengthRef: state.previousTimelineLengthRef,
    contextUpdateTrigger,
    storeContext,
    updateConversationContextMutation: chatMutations.updateConversationContextMutation,
    loadDefaultScriptTrigger,
    lastLoadTrigger: state.lastLoadTrigger,
    setLastLoadTrigger: state.setLastLoadTrigger,
    templates: queries.templates,
    replaceTemplateVariables,
    user,
  });

  const messageActions = useInlineAiMessageActions({
    messageInput: state.messageInput,
    isSending: state.isSending,
    setTimeline: state.setTimeline,
    setMessageInput: state.setMessageInput,
    setIsSending: state.setIsSending,
    sendMessageMutation: chatMutations.sendMessageMutation,
    selectedConversationId: state.selectedConversationId,
    setSelectedConversationId: state.setSelectedConversationId,
    toast,
  });

  const autoDetectPlaceholders = (content: string): string =>
    autoDetectPlaceholdersUtil(content, storeContext, user);

  const builderActions = useInlineAiBuilderActions({
    builderType: state.builderType,
    emailTo: state.emailTo,
    emailSubject: state.emailSubject,
    emailBody: state.emailBody,
    builderContent: state.builderContent,
    emailToRef: state.emailToRef,
    emailSubjectRef: state.emailSubjectRef,
    emailBodyRef: state.emailBodyRef,
    contentTextareaRef: state.contentTextareaRef,
    setEmailTo: state.setEmailTo,
    setEmailSubject: state.setEmailSubject,
    setEmailBody: state.setEmailBody,
    setBuilderContent: state.setBuilderContent,
    builderTags: state.builderTags,
    setBuilderTags: state.setBuilderTags,
    selectedTagIds: state.selectedTagIds,
    setSelectedTagIds: state.setSelectedTagIds,
    deleteTagsMutation: templateMutations.deleteTagsMutation,
    toast,
    parseEmailTemplate,
    autoDetectPlaceholders,
    setBuilderType: state.setBuilderType,
    setBuilderTitle: state.setBuilderTitle,
    setEditingTemplateId: state.setEditingTemplateId,
    setTemplateBuilderOpen: state.setTemplateBuilderOpen,
    setTemplateBuilderView: state.setTemplateBuilderView,
  });

  const templateActions = useInlineAiTemplateActions({
    isInjectingScriptRef: state.isInjectingScriptRef,
    replaceTemplateVariables,
    storeContext,
    user,
    setTimeline: state.setTimeline,
    setTemplateBuilderOpen: state.setTemplateBuilderOpen,
    setTemplatesOpen: state.setTemplatesOpen,
    setPreviewTemplate: state.setPreviewTemplate,
    setTemplatePreviewOpen: state.setTemplatePreviewOpen,
    toast,
    setBuilderTitle: state.setBuilderTitle,
    setBuilderType: state.setBuilderType,
    setBuilderTags: state.setBuilderTags,
    setEditingTemplateId: state.setEditingTemplateId,
    setBuilderIsDefault: state.setBuilderIsDefault,
    parseEmailTemplate,
    setEmailTo: state.setEmailTo,
    setEmailSubject: state.setEmailSubject,
    setEmailBody: state.setEmailBody,
    setBuilderContent: state.setBuilderContent,
    setTemplateBuilderView: state.setTemplateBuilderView,
    createGmailDraftMutation: chatMutations.createGmailDraftMutation,
    trackerSheetId,
    onStatusChange,
  });

  const derived = useInlineAiDerived({
    conversations: queries.conversations,
    templates: queries.templates,
    selectedConversationId: state.selectedConversationId,
    templateSearch: state.templateSearch,
    setTemplatesOpen: state.setTemplatesOpen,
  });

  const renderProps = useInlineAiRenderProps({
    ...state,
    ...queries,
    ...templateMutations,
    ...chatMutations,
    ...messageActions,
    ...builderActions,
    ...templateActions,
    ...derived,
    storeContext,
    toast,
    user,
    availableVariables,
    convertToDirectImageUrl,
    extractGoogleDriveFileId,
    handleImageError,
    formatEmailTemplate,
  });

  return <InlineAiChatRender {...renderProps} />;
}
