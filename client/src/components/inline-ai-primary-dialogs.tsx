import { NewProjectDialog } from "@/components/new-project-dialog";
import { RenameConversationDialog } from "@/components/rename-conversation-dialog";
import { InlineAiTemplatePreview } from "@/components/inline-ai-template-preview";

export function InlineAiPrimaryDialogs(props: any) {
  const {
    newProjectDialogOpen,
    newProjectName,
    createProjectMutation,
    setNewProjectDialogOpen,
    setNewProjectName,
    renameDialogOpen,
    newConversationTitle,
    renamingConversationId,
    renameConversationMutation,
    setRenameDialogOpen,
    setNewConversationTitle,
    setRenamingConversationId,
    templatePreviewOpen,
    previewTemplate,
    storeContext,
    user,
    setTemplatePreviewOpen,
    toast,
  } = props;

  return (
    <>
      <NewProjectDialog
        open={newProjectDialogOpen}
        projectName={newProjectName}
        isPending={createProjectMutation.isPending}
        onOpenChange={setNewProjectDialogOpen}
        onProjectNameChange={setNewProjectName}
        onCancel={() => setNewProjectDialogOpen(false)}
        onCreate={() => createProjectMutation.mutate(newProjectName)}
      />

      <RenameConversationDialog
        open={renameDialogOpen}
        conversationTitle={newConversationTitle}
        renamingConversationId={renamingConversationId}
        isPending={renameConversationMutation.isPending}
        onOpenChange={setRenameDialogOpen}
        onConversationTitleChange={setNewConversationTitle}
        onCancel={() => {
          setRenameDialogOpen(false);
          setRenamingConversationId(null);
          setNewConversationTitle("");
        }}
        onSave={() => {
          if (renamingConversationId) {
            renameConversationMutation.mutate({
              conversationId: renamingConversationId,
              title: newConversationTitle.trim(),
            });
          }
        }}
      />

      <InlineAiTemplatePreview
        open={templatePreviewOpen}
        previewTemplate={previewTemplate}
        storeContext={storeContext}
        user={user}
        onOpenChange={setTemplatePreviewOpen}
        onClose={() => setTemplatePreviewOpen(false)}
        onCopy={() => {
          if (previewTemplate) {
            navigator.clipboard.writeText(previewTemplate.content);
            toast({ title: "Copied", description: "Template content copied to clipboard" });
          }
        }}
      />
    </>
  );
}
