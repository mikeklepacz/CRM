import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, ChevronDown, Mail, Store, User as UserIcon } from "lucide-react";
import { InlineAiEmailImageLibraryPopover } from "@/components/inline-ai-email-image-library-popover";
import { InlineAiEmailBodyEditor } from "@/components/inline-ai-email-body-editor";

export function InlineAiTemplateBuilderEmailEditor(props: any) {
  const {
    availableVariables,
    convertToDirectImageUrl,
    deleteImageMutation,
    emailBody,
    emailBodyRef,
    emailSubject,
    emailSubjectRef,
    emailTo,
    emailToRef,
    extractGoogleDriveFileId,
    handleImageError,
    imagePreviewError,
    insertImageAtCursor,
    insertVariable,
    newImageLabel,
    newImageUrl,
    saveImageMutation,
    savedEmailImages,
    setEmailBody,
    setEmailSubject,
    setEmailTo,
    setImagePreviewError,
    setNewImageLabel,
    setNewImageUrl,
  } = props;

  return (
    <div className="space-y-3 flex-1 flex flex-col min-h-0">
      {/* To Field - Simple */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">To</label>
        <Input
          ref={emailToRef}
          placeholder="{{email}}"
          value={emailTo}
          onChange={(e) => setEmailTo(e.target.value)}
          className="font-mono"
          data-testid="input-email-to"
        />
      </div>

      {/* Subject Field - Simple */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Subject</label>
        <Input
          ref={emailSubjectRef}
          placeholder="Email subject..."
          value={emailSubject}
          onChange={(e) => setEmailSubject(e.target.value)}
          className="font-mono"
          data-testid="input-email-subject"
        />
      </div>

      {/* Body Field - Label and buttons on same row, justified */}
      <div className="space-y-2 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold">Body</label>
          <div className="flex flex-wrap gap-2">
            {/* Store Info Variables */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-insert-store-variable-body">
                  <Store className="h-4 w-4 mr-1" />
                  Store
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Store Information
                  </h4>
                  <div className="space-y-1">
                    {availableVariables
                      .filter((v: any) =>
                        ["storeName", "storeAddress", "storeCity", "storeState", "storeWebsite", "storePhone"].includes(v.name),
                      )
                      .map((variable: any) => (
                        <button
                          key={variable.name}
                          onClick={() => insertVariable(variable.name, "body")}
                          className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                          data-testid={`insert-variable-body-${variable.name}`}
                        >
                          <div className="font-mono text-sm text-primary">{`{{${variable.name}}}`}</div>
                          <div className="text-xs text-muted-foreground">{variable.description}</div>
                        </button>
                      ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Contact Variables */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-insert-contact-variable-body">
                  <Mail className="h-4 w-4 mr-1" />
                  Contact
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Information
                  </h4>
                  <div className="space-y-1">
                    {availableVariables
                      .filter((v: any) => ["email", "pocName", "pocEmail", "pocPhone"].includes(v.name))
                      .map((variable: any) => (
                        <button
                          key={variable.name}
                          onClick={() => insertVariable(variable.name, "body")}
                          className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                          data-testid={`insert-variable-body-${variable.name}`}
                        >
                          <div className="font-mono text-sm text-primary">{`{{${variable.name}}}`}</div>
                          <div className="text-xs text-muted-foreground">{variable.description}</div>
                        </button>
                      ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Agent Variables */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-insert-agent-variable-body">
                  <UserIcon className="h-4 w-4 mr-1" />
                  Agent
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Agent Information
                  </h4>
                  <div className="space-y-1">
                    {availableVariables
                      .filter((v: any) => ["agentName", "agentEmail", "agentPhone", "agentMeetingLink"].includes(v.name))
                      .map((variable: any) => (
                        <button
                          key={variable.name}
                          onClick={() => insertVariable(variable.name, "body")}
                          className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                          data-testid={`insert-variable-body-${variable.name}`}
                        >
                          <div className="font-mono text-sm text-primary">{`{{${variable.name}}}`}</div>
                          <div className="text-xs text-muted-foreground">{variable.description}</div>
                        </button>
                      ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Date/Time Variables */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-insert-datetime-variable-body">
                  <Calendar className="h-4 w-4 mr-1" />
                  Date/Time
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date & Time
                  </h4>
                  <div className="space-y-1">
                    {availableVariables
                      .filter((v: any) => ["currentDate", "currentTime"].includes(v.name))
                      .map((variable: any) => (
                        <button
                          key={variable.name}
                          onClick={() => insertVariable(variable.name, "body")}
                          className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                          data-testid={`insert-variable-body-${variable.name}`}
                        >
                          <div className="font-mono text-sm text-primary">{`{{${variable.name}}}`}</div>
                          <div className="text-xs text-muted-foreground">{variable.description}</div>
                        </button>
                      ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <InlineAiEmailImageLibraryPopover
              deleteImageMutation={deleteImageMutation}
              imagePreviewError={imagePreviewError}
              newImageLabel={newImageLabel}
              newImageUrl={newImageUrl}
              saveImageMutation={saveImageMutation}
              savedEmailImages={savedEmailImages}
              onConvertToDirectImageUrl={convertToDirectImageUrl}
              onExtractGoogleDriveFileId={extractGoogleDriveFileId}
              onHandleImageError={handleImageError}
              onInsertImageAtCursor={insertImageAtCursor}
              onSetImagePreviewError={setImagePreviewError}
              onSetNewImageLabel={setNewImageLabel}
              onSetNewImageUrl={setNewImageUrl}
            />
          </div>
        </div>
        <InlineAiEmailBodyEditor
          emailBody={emailBody}
          emailBodyRef={emailBodyRef}
          onConvertToDirectImageUrl={convertToDirectImageUrl}
          onEmailBodyChange={setEmailBody}
          onHandleImageError={handleImageError}
        />
      </div>
    </div>
  );
}
