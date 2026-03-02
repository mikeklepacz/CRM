import type React from "react";
import { copyMessageToClipboardUtil } from "@/components/inline-ai-chat/copy-message-to-clipboard";

export function useInlineAiBuilderActions({
  builderType,
  emailTo,
  emailSubject,
  emailBody,
  builderContent,
  emailToRef,
  emailSubjectRef,
  emailBodyRef,
  contentTextareaRef,
  setEmailTo,
  setEmailSubject,
  setEmailBody,
  setBuilderContent,
  builderTags,
  setBuilderTags,
  selectedTagIds,
  setSelectedTagIds,
  deleteTagsMutation,
  toast,
  parseEmailTemplate,
  autoDetectPlaceholders,
  setBuilderType,
  setBuilderTitle,
  setEditingTemplateId,
  setTemplateBuilderOpen,
  setTemplateBuilderView,
}: {
  builderType: "Email" | "Script";
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  builderContent: string;
  emailToRef: React.RefObject<HTMLInputElement>;
  emailSubjectRef: React.RefObject<HTMLInputElement>;
  emailBodyRef: React.RefObject<HTMLTextAreaElement>;
  contentTextareaRef: React.RefObject<HTMLTextAreaElement>;
  setEmailTo: React.Dispatch<React.SetStateAction<string>>;
  setEmailSubject: React.Dispatch<React.SetStateAction<string>>;
  setEmailBody: React.Dispatch<React.SetStateAction<string>>;
  setBuilderContent: React.Dispatch<React.SetStateAction<string>>;
  builderTags: string;
  setBuilderTags: React.Dispatch<React.SetStateAction<string>>;
  selectedTagIds: Set<string>;
  setSelectedTagIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  deleteTagsMutation: any;
  toast: any;
  parseEmailTemplate: (content: string) => { to: string; subject: string; body: string } | null;
  autoDetectPlaceholders: (content: string) => string;
  setBuilderType: React.Dispatch<React.SetStateAction<"Email" | "Script">>;
  setBuilderTitle: React.Dispatch<React.SetStateAction<string>>;
  setEditingTemplateId: React.Dispatch<React.SetStateAction<string | null>>;
  setTemplateBuilderOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setTemplateBuilderView: React.Dispatch<React.SetStateAction<"builder" | "library">>;
}) {
  const insertVariable = (variableName: string, targetField?: "to" | "subject" | "body") => {
    const variable = `{{${variableName}}}`;

    if (builderType === "Email") {
      let ref =
        targetField === "to"
          ? emailToRef
          : targetField === "subject"
            ? emailSubjectRef
            : targetField === "body"
              ? emailBodyRef
              : null;

      if (!ref) {
        if (document.activeElement === emailToRef.current) ref = emailToRef;
        else if (document.activeElement === emailSubjectRef.current) ref = emailSubjectRef;
        else if (document.activeElement === emailBodyRef.current) ref = emailBodyRef;
        else ref = emailBodyRef;
      }

      if (!ref.current) return;

      if (ref === emailToRef) {
        const input = ref.current;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const before = emailTo.substring(0, start);
        const after = emailTo.substring(end);
        setEmailTo(before + variable + after);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      } else if (ref === emailSubjectRef) {
        const input = ref.current;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const before = emailSubject.substring(0, start);
        const after = emailSubject.substring(end);
        setEmailSubject(before + variable + after);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      } else if (ref === emailBodyRef) {
        const textarea = ref.current;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const before = emailBody.substring(0, start);
        const after = emailBody.substring(end);
        setEmailBody(before + variable + after);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      }
    } else {
      if (!contentTextareaRef.current) return;

      const textarea = contentTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = builderContent.substring(0, start);
      const after = builderContent.substring(end);

      setBuilderContent(before + variable + after);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const insertImageAtCursor = (imageUrl: string, targetField?: "body") => {
    const placeholder = `{{image:${imageUrl}}}`;
    const ref = emailBodyRef;
    const el = ref?.current;
    if (el) {
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const currentValue = builderType === "Email" ? emailBody : "";
      const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
      if (builderType === "Email") {
        setEmailBody(newValue);
      }
      setTimeout(() => {
        const newPos = start + placeholder.length;
        el.selectionStart = newPos;
        el.selectionEnd = newPos;
        el.focus();
      }, 0);
    } else {
      if (builderType === "Email") {
        setEmailBody((prev) => prev + placeholder);
      }
    }
  };

  const insertTag = (tag: string) => {
    const currentTags = builderTags.trim();
    if (currentTags) {
      setBuilderTags(`${currentTags}, ${tag}`);
    } else {
      setBuilderTags(tag);
    }
  };

  const toggleTagSelection = (tagId: string) => {
    const newSelected = new Set(selectedTagIds);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedTagIds(newSelected);
  };

  const handleDeleteSelectedTags = () => {
    if (selectedTagIds.size === 0) return;

    const tagCount = selectedTagIds.size;
    if (window.confirm(`Delete ${tagCount} selected tag${tagCount > 1 ? "s" : ""}?`)) {
      deleteTagsMutation.mutate(Array.from(selectedTagIds));
    }
  };

  const copyMessageToClipboard = async (content: string) => {
    await copyMessageToClipboardUtil(content, toast);
  };

  const handleTemplateTypeChange = (newType: "Email" | "Script") => {
    if (newType === builderType) return;

    if (newType === "Email") {
      if (builderContent.trim()) {
        const parsed = parseEmailTemplate(builderContent);
        if (parsed) {
          setEmailTo(parsed.to);
          setEmailSubject(parsed.subject);
          setEmailBody(parsed.body);
        } else {
          setEmailTo("{{email}}");
          setEmailSubject("");
          setEmailBody(builderContent);
        }
        setBuilderContent("");
      }
    } else {
      if (emailTo || emailSubject || emailBody) {
        if (emailSubject || emailTo !== "{{email}}") {
          const scriptContent = `To: ${emailTo}\nSubject: ${emailSubject}\n\nBody:\n${emailBody}`;
          setBuilderContent(scriptContent);
        } else {
          setBuilderContent(emailBody);
        }
        setEmailTo("{{email}}");
        setEmailSubject("");
        setEmailBody("");
      }
    }

    setBuilderType(newType);
  };

  const makeTemplateFromMessage = (content: string) => {
    const selectedText = window.getSelection()?.toString().trim();
    const contentToUse = selectedText || content;

    const parsed = parseEmailTemplate(contentToUse);

    if (parsed) {
      setBuilderType("Email");
      setEmailTo(autoDetectPlaceholders(parsed.to));
      setEmailSubject(autoDetectPlaceholders(parsed.subject));
      setEmailBody(autoDetectPlaceholders(parsed.body));
      setBuilderContent("");
    } else {
      const emailPattern = /^(hi|hey|hello|dear|greetings)/i;
      const signaturePattern = /(best|regards|thanks|sincerely|cheers)/i;
      const hasEmailStructure = emailPattern.test(contentToUse.trim()) || signaturePattern.test(contentToUse);

      if (hasEmailStructure) {
        setBuilderType("Email");

        const lines = contentToUse.trim().split("\n").filter((l) => l.trim());
        const firstLine = lines[0] || "";
        const isSubjectLine = firstLine.length < 80 && !emailPattern.test(firstLine);

        if (isSubjectLine && lines.length > 1) {
          setEmailTo(autoDetectPlaceholders("{{email}}"));
          setEmailSubject(autoDetectPlaceholders(firstLine));
          setEmailBody(autoDetectPlaceholders(lines.slice(1).join("\n")));
        } else {
          setEmailTo(autoDetectPlaceholders("{{email}}"));
          setEmailSubject("");
          setEmailBody(autoDetectPlaceholders(contentToUse));
        }
        setBuilderContent("");
      } else {
        setBuilderType("Script");
        setBuilderContent(autoDetectPlaceholders(contentToUse));
        setEmailTo("{{email}}");
        setEmailSubject("");
        setEmailBody("");
      }
    }

    setBuilderTitle("");
    setBuilderTags("");
    setEditingTemplateId(null);
    setTemplateBuilderOpen(true);
    setTemplateBuilderView("builder");

    toast({
      title: "Template created",
      description: selectedText
        ? "Selected text converted to template"
        : "Common placeholders detected and converted to variables",
    });
  };

  return {
    insertVariable,
    insertImageAtCursor,
    insertTag,
    toggleTagSelection,
    handleDeleteSelectedTags,
    copyMessageToClipboard,
    handleTemplateTypeChange,
    makeTemplateFromMessage,
  };
}
