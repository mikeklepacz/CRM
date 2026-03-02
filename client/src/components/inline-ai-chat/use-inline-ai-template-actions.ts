import { apiRequest } from "@/lib/queryClient";
import { parseEmailFromMessage, replaceSimpleTemplateVariables } from "@/components/inline-ai-chat-utils";
import type { Template } from "@shared/schema";
import type { TimelineItem } from "@/components/inline-ai-chat-enhanced.types";

export function useInlineAiTemplateActions({
  isInjectingScriptRef,
  replaceTemplateVariables,
  storeContext,
  user,
  setTimeline,
  setTemplateBuilderOpen,
  setTemplatesOpen,
  setPreviewTemplate,
  setTemplatePreviewOpen,
  toast,
  setBuilderTitle,
  setBuilderType,
  setBuilderTags,
  setEditingTemplateId,
  setBuilderIsDefault,
  parseEmailTemplate,
  setEmailTo,
  setEmailSubject,
  setEmailBody,
  setBuilderContent,
  setTemplateBuilderView,
  createGmailDraftMutation,
  trackerSheetId,
  onStatusChange,
}: {
  isInjectingScriptRef: React.MutableRefObject<boolean>;
  replaceTemplateVariables: (content: string, storeData: any, currentUser: any) => string;
  storeContext: any;
  user: any;
  setTimeline: React.Dispatch<React.SetStateAction<TimelineItem[]>>;
  setTemplateBuilderOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setTemplatesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPreviewTemplate: React.Dispatch<React.SetStateAction<{ title: string; content: string } | null>>;
  setTemplatePreviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toast: any;
  setBuilderTitle: React.Dispatch<React.SetStateAction<string>>;
  setBuilderType: React.Dispatch<React.SetStateAction<"Email" | "Script">>;
  setBuilderTags: React.Dispatch<React.SetStateAction<string>>;
  setEditingTemplateId: React.Dispatch<React.SetStateAction<string | null>>;
  setBuilderIsDefault: React.Dispatch<React.SetStateAction<boolean>>;
  parseEmailTemplate: (content: string) => { to: string; subject: string; body: string } | null;
  setEmailTo: React.Dispatch<React.SetStateAction<string>>;
  setEmailSubject: React.Dispatch<React.SetStateAction<string>>;
  setEmailBody: React.Dispatch<React.SetStateAction<string>>;
  setBuilderContent: React.Dispatch<React.SetStateAction<string>>;
  setTemplateBuilderView: React.Dispatch<React.SetStateAction<"builder" | "library">>;
  createGmailDraftMutation: any;
  trackerSheetId?: string;
  onStatusChange?: (status: string) => void;
}) {
  const useTemplate = (template: { title: string; content: string; type?: string }) => {
    const filledContent = replaceTemplateVariables(template.content, storeContext, user);

    if ((template as any).type === "Script") {
      isInjectingScriptRef.current = true;

      const scriptItem: TimelineItem = {
        type: "script",
        id: `script-${Date.now()}`,
        title: template.title,
        content: filledContent,
        timestamp: Date.now(),
      };
      setTimeline((prev) => [...prev, scriptItem]);
      setTemplateBuilderOpen(false);
      setTemplatesOpen(false);
      toast({
        title: "Script Loaded",
        description: `"${template.title}" added to display`,
      });
    } else {
      setPreviewTemplate({ title: template.title, content: filledContent });
      setTemplatePreviewOpen(true);
    }
  };

  const handleOpenTemplateBuilderFromSidebar = () => {
    setBuilderTitle("");
    setBuilderContent("");
    setBuilderType("Email");
    setBuilderTags("");
    setBuilderIsDefault(false);
    setEditingTemplateId(null);
    setEmailTo("{{email}}");
    setEmailSubject("");
    setEmailBody("");
    setTemplateBuilderOpen(true);
  };

  const handleInjectTemplate = (template: Template) => {
    isInjectingScriptRef.current = true;

    const filledContent = replaceTemplateVariables(template.content, storeContext, user);
    const scriptItem: TimelineItem = {
      type: "script",
      id: `script-${Date.now()}`,
      title: template.title,
      content: filledContent,
      timestamp: Date.now(),
    };
    setTimeline((prev) => [...prev, scriptItem]);
    toast({
      title: "Script Injected",
      description: `"${template.title}" added to display`,
    });
  };

  const handleEditTemplateFromLibrary = (template: Template) => {
    setBuilderTitle(template.title);
    const templateType = (template as any).type || "Email";
    setBuilderType(templateType);
    setBuilderTags(template.tags?.join(", ") || "");
    setEditingTemplateId(template.id);
    setBuilderIsDefault((template as any).isDefault || false);

    if (templateType === "Email") {
      const parsed = parseEmailTemplate(template.content);
      if (parsed) {
        setEmailTo(parsed.to);
        setEmailSubject(parsed.subject);
        setEmailBody(parsed.body);
        setBuilderContent("");
      } else {
        setBuilderContent(template.content);
      }
    } else {
      setBuilderContent(template.content);
      setEmailTo("{{email}}");
      setEmailSubject("");
      setEmailBody("");
    }

    setTemplateBuilderView("builder");
  };

  const handleCopyTemplate = async (template: Template) => {
    const filledContent = replaceTemplateVariables(template.content, storeContext, user);
    try {
      await navigator.clipboard.writeText(filledContent);
      toast({ title: "Success", description: "Template copied to clipboard" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleEmailTemplate = async (template: Template) => {
    const email = storeContext?.poc_email || storeContext?.email;
    if (!email) {
      toast({
        title: "No Email Found",
        description: "Please add an email address or POC email to the store details first.",
        variant: "destructive",
      });
      return;
    }

    const filledContent = replaceSimpleTemplateVariables(template.content, storeContext, user);
    const emailData = parseEmailFromMessage(filledContent);

    if (emailData) {
      const processedEmailData = {
        to: replaceSimpleTemplateVariables(emailData.to, storeContext, user),
        subject: replaceSimpleTemplateVariables(emailData.subject, storeContext, user),
        body: replaceSimpleTemplateVariables(emailData.body, storeContext, user),
      };

      const anyBracketPattern = /\[[^\]]+\]/;

      if (
        !processedEmailData.to ||
        processedEmailData.to.trim() === "" ||
        processedEmailData.to.includes("{{") ||
        processedEmailData.to.includes("}}")
      ) {
        toast({
          title: "Invalid Email Address",
          description:
            "Email contains {{placeholder}} that wasn't replaced. Please check the store has an email address.",
          variant: "destructive",
        });
        return;
      }

      if (anyBracketPattern.test(processedEmailData.to)) {
        toast({
          title: "Invalid Placeholder Format",
          description:
            "Email contains bracket-style placeholders like [recipient email]. The AI should use {{email}} format instead. Please try regenerating the email.",
          variant: "destructive",
        });
        return;
      }

      createGmailDraftMutation.mutate({
        ...processedEmailData,
        clientLink: storeContext?.link || null,
      });
    } else {
      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(template.title)}&body=${encodeURIComponent(filledContent)}`;

      if (storeContext?.link) {
        try {
          await apiRequest("POST", "/api/email-drafts", {
            recipientEmail: email,
            subject: template.title,
            body: filledContent,
            clientLink: storeContext.link,
          });

          toast({
            title: "Enrolled in Follow-Ups",
            description: "Contact added to automated follow-up sequence",
          });
        } catch (error) {
          toast({
            title: "Enrollment Failed",
            description:
              error instanceof Error ? error.message : "Failed to enroll in follow-up sequence",
            variant: "destructive",
          });
        }
        if (trackerSheetId) {
          try {
            await apiRequest("POST", "/api/sheets/tracker/upsert", {
              link: storeContext.link,
              updates: { Status: "Emailed" },
            });
            onStatusChange?.("Emailed");
          } catch (err) {
            console.error("[EmailDraft] Failed to update status to Emailed:", err);
          }
        }
      }

      window.location.href = mailtoLink;
    }
  };

  return {
    useTemplate,
    handleOpenTemplateBuilderFromSidebar,
    handleInjectTemplate,
    handleEditTemplateFromLibrary,
    handleCopyTemplate,
    handleEmailTemplate,
  };
}
