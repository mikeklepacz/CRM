import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TemplateBuilderDialogHeader } from "@/components/template-builder-dialog-header";
import { TemplateBuilderLibraryView } from "@/components/template-builder-library-view";
import { TemplateBuilderActionBar } from "@/components/template-builder-action-bar";
import { InlineAiScriptBuilder } from "@/components/inline-ai-script-builder";
import { InlineAiTemplateBuilderTagsInput } from "@/components/inline-ai-template-builder-tags-input";
import { InlineAiTemplateBuilderEmailEditor } from "@/components/inline-ai-template-builder-email-editor";

export function InlineAiTemplateBuilderDialog(props: any) {
  const {
    availableVariables,
    builderContent,
    builderIsDefault,
    builderTags,
    builderTitle,
    builderType,
    contentTextareaRef,
    createTemplateMutation,
    deleteImageMutation,
    deleteTagsMutation,
    deleteTemplateMutation,
    editingTemplateId,
    emailBody,
    emailBodyRef,
    emailSubject,
    emailSubjectRef,
    emailTo,
    emailToRef,
    extractGoogleDriveFileId,
    formatEmailTemplate,
    handleDeleteSelectedTags,
    handleEditTemplateFromLibrary,
    handleImageError,
    handleTemplateTypeChange,
    imagePreviewError,
    insertImageAtCursor,
    insertTag,
    insertVariable,
    newImageLabel,
    newImageUrl,
    saveImageMutation,
    savedEmailImages,
    selectedTagFilter,
    selectedTagIds,
    selectedTypeFilter,
    setBuilderContent,
    setBuilderIsDefault,
    setBuilderTags,
    setBuilderTitle,
    setBuilderType,
    setEditingTemplateId,
    setEmailBody,
    setEmailSubject,
    setEmailTo,
    setImagePreviewError,
    setNewImageLabel,
    setNewImageUrl,
    setSelectedTagFilter,
    setSelectedTagIds,
    setSelectedTypeFilter,
    setTagEditMode,
    setTemplateBuilderOpen,
    setTemplateBuilderView,
    setTemplateSearch,
    tagEditMode,
    templateBuilderOpen,
    templateBuilderView,
    templateSearch,
    templates,
    toggleTagSelection,
    updateTemplateMutation,
    userTags,
    convertToDirectImageUrl,
    useTemplate,
  } = props;
  const createTemplatePending = !!createTemplateMutation?.isPending;
  const updateTemplatePending = !!updateTemplateMutation?.isPending;
  const deleteTemplatePending = !!deleteTemplateMutation?.isPending;

  return (
    <Dialog open={templateBuilderOpen} onOpenChange={setTemplateBuilderOpen}>
      <DialogContent className="max-w-full w-screen h-screen max-h-screen m-0 rounded-none p-0 flex flex-col" data-testid="dialog-template-builder">
        <TemplateBuilderDialogHeader
          templateBuilderView={templateBuilderView}
          onBackToBuilder={() => setTemplateBuilderView("builder")}
        />

        {/* Builder View */}
        {templateBuilderView === "builder" && (
          <div className="flex-1 flex flex-col min-h-0 px-6 pt-6 pb-6">
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              {/* Type & Title - Side by Side */}
              <div className="flex gap-4">
                <div className="w-[200px] space-y-2">
                  <label className="text-sm font-semibold">Type</label>
                  <Select
                    value={builderType}
                    onValueChange={(value: "Email" | "Script") => handleTemplateTypeChange(value)}
                  >
                    <SelectTrigger data-testid="select-builder-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="Script">Script</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-semibold">Title</label>
                  <Input
                    placeholder="Template name..."
                    value={builderTitle}
                    onChange={(e) => setBuilderTitle(e.target.value)}
                    data-testid="input-builder-title"
                  />
                </div>
              </div>

              <InlineAiTemplateBuilderTagsInput
                builderTags={builderTags}
                deleteTagsMutation={deleteTagsMutation}
                handleDeleteSelectedTags={handleDeleteSelectedTags}
                insertTag={insertTag}
                selectedTagIds={selectedTagIds}
                setBuilderTags={setBuilderTags}
                setSelectedTagIds={setSelectedTagIds}
                setTagEditMode={setTagEditMode}
                tagEditMode={tagEditMode}
                toggleTagSelection={toggleTagSelection}
                userTags={userTags}
              />

              {/* Default Script Checkbox - Only for Script type */}
              {builderType === "Script" && (
                <div className="space-y-2">
                  <div
                    className={`flex items-center gap-2 p-3 rounded border ${
                      !templates.some((t: any) => t.type === "Script" && t.isDefault)
                        ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-700"
                        : "border-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      id="builder-is-default"
                      checked={builderIsDefault}
                      onChange={(e) => setBuilderIsDefault(e.target.checked)}
                      className="h-4 w-4"
                      data-testid="checkbox-is-default"
                    />
                    <label htmlFor="builder-is-default" className="text-sm font-medium cursor-pointer flex-1">
                      Set as Default Script
                    </label>
                    {!templates.some((t: any) => t.type === "Script" && t.isDefault) && (
                      <span className="text-xs text-yellow-700 dark:text-yellow-500">No default set</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Default script automatically loads when you click a phone number
                  </p>
                </div>
              )}

              {/* Conditional Content Based on Type */}
              {builderType === "Email" ? (
                <InlineAiTemplateBuilderEmailEditor
                  availableVariables={availableVariables}
                  convertToDirectImageUrl={convertToDirectImageUrl}
                  deleteImageMutation={deleteImageMutation}
                  emailBody={emailBody}
                  emailBodyRef={emailBodyRef}
                  emailSubject={emailSubject}
                  emailSubjectRef={emailSubjectRef}
                  emailTo={emailTo}
                  emailToRef={emailToRef}
                  extractGoogleDriveFileId={extractGoogleDriveFileId}
                  handleImageError={handleImageError}
                  imagePreviewError={imagePreviewError}
                  insertImageAtCursor={insertImageAtCursor}
                  insertVariable={insertVariable}
                  newImageLabel={newImageLabel}
                  newImageUrl={newImageUrl}
                  saveImageMutation={saveImageMutation}
                  savedEmailImages={savedEmailImages}
                  setEmailBody={setEmailBody}
                  setEmailSubject={setEmailSubject}
                  setEmailTo={setEmailTo}
                  setImagePreviewError={setImagePreviewError}
                  setNewImageLabel={setNewImageLabel}
                  setNewImageUrl={setNewImageUrl}
                />
              ) : (
                <InlineAiScriptBuilder
                  availableVariables={availableVariables}
                  builderContent={builderContent}
                  contentTextareaRef={contentTextareaRef}
                  onBuilderContentChange={setBuilderContent}
                  onInsertVariable={insertVariable}
                />
              )}
            </div>

            <TemplateBuilderActionBar
              builderContent={builderContent}
              builderIsDefault={builderIsDefault}
              builderTags={builderTags}
              builderTitle={builderTitle}
              builderType={builderType}
              createPending={createTemplatePending}
              editingTemplateId={editingTemplateId}
              emailBody={emailBody}
              emailSubject={emailSubject}
              emailTo={emailTo}
              formatEmailTemplate={formatEmailTemplate}
              updatePending={updateTemplatePending}
              onCancel={() => {
                setBuilderTitle("");
                setBuilderContent("");
                setBuilderType("Email");
                setBuilderTags("");
                setEmailTo("{{email}}");
                setEmailSubject("");
                setEmailBody("");
                setEditingTemplateId(null);
                setTemplateBuilderOpen(false);
              }}
              onSave={(templateData) => {
                if (editingTemplateId) {
                  updateTemplateMutation?.mutate?.({ id: editingTemplateId, template: templateData });
                } else {
                  createTemplateMutation?.mutate?.(templateData);
                }
              }}
              onViewTemplates={() => setTemplateBuilderView("library")}
            />
          </div>
        )}

        {/* Library View */}
        {templateBuilderView === "library" && (
          <TemplateBuilderLibraryView
            deletePending={deleteTemplatePending}
            onDeleteTemplate={(id) => deleteTemplateMutation?.mutate?.(id)}
            onEditTemplate={handleEditTemplateFromLibrary}
            onTagFilterChange={setSelectedTagFilter}
            onTemplateSearchChange={setTemplateSearch}
            onTypeFilterChange={setSelectedTypeFilter}
            onUseTemplate={(template) => useTemplate({ ...template, type: template.type || "Script" })}
            selectedTagFilter={selectedTagFilter}
            selectedTypeFilter={selectedTypeFilter}
            templateSearch={templateSearch}
            templates={templates}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
