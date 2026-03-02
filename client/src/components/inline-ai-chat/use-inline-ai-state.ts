import { useRef, useState } from "react";
import type { TimelineItem } from "@/components/inline-ai-chat-enhanced.types";

export function useInlineAiState() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [templatesOpen, setTemplatesOpen] = useState(() => {
    try {
      return localStorage.getItem("wickCoach_templatesOpen") === "true";
    } catch {
      return false;
    }
  });
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [lastLoadTrigger, setLastLoadTrigger] = useState(0);

  const [templateSearch, setTemplateSearch] = useState("");

  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [templateBuilderOpen, setTemplateBuilderOpen] = useState(false);
  const [templateBuilderView, setTemplateBuilderView] = useState<"builder" | "library">("builder");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingConversationId, setRenamingConversationId] = useState<string | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState("");

  const [builderTitle, setBuilderTitle] = useState("");
  const [builderContent, setBuilderContent] = useState("");
  const [builderType, setBuilderType] = useState<"Email" | "Script">("Email");
  const [builderTags, setBuilderTags] = useState("");
  const [builderIsDefault, setBuilderIsDefault] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const [emailTo, setEmailTo] = useState("{{email}}");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<"Email" | "Script" | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const emailToRef = useRef<HTMLInputElement>(null);
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  const emailBodyRef = useRef<HTMLTextAreaElement>(null);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<{ title: string; content: string } | null>(null);

  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageLabel, setNewImageLabel] = useState("");
  const [imagePreviewError, setImagePreviewError] = useState(false);

  const [tagEditMode, setTagEditMode] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  const isInjectingScriptRef = useRef(false);
  const previousTimelineLengthRef = useRef(0);

  return {
    sidebarOpen,
    setSidebarOpen,
    templatesOpen,
    setTemplatesOpen,
    selectedConversationId,
    setSelectedConversationId,
    messageInput,
    setMessageInput,
    isSending,
    setIsSending,
    scrollRef,
    scrollBottomRef,
    timeline,
    setTimeline,
    lastLoadTrigger,
    setLastLoadTrigger,
    templateSearch,
    setTemplateSearch,
    newProjectDialogOpen,
    setNewProjectDialogOpen,
    newProjectName,
    setNewProjectName,
    templateBuilderOpen,
    setTemplateBuilderOpen,
    templateBuilderView,
    setTemplateBuilderView,
    renameDialogOpen,
    setRenameDialogOpen,
    renamingConversationId,
    setRenamingConversationId,
    newConversationTitle,
    setNewConversationTitle,
    builderTitle,
    setBuilderTitle,
    builderContent,
    setBuilderContent,
    builderType,
    setBuilderType,
    builderTags,
    setBuilderTags,
    builderIsDefault,
    setBuilderIsDefault,
    editingTemplateId,
    setEditingTemplateId,
    emailTo,
    setEmailTo,
    emailSubject,
    setEmailSubject,
    emailBody,
    setEmailBody,
    selectedTypeFilter,
    setSelectedTypeFilter,
    selectedTagFilter,
    setSelectedTagFilter,
    contentTextareaRef,
    emailToRef,
    emailSubjectRef,
    emailBodyRef,
    templatePreviewOpen,
    setTemplatePreviewOpen,
    previewTemplate,
    setPreviewTemplate,
    newImageUrl,
    setNewImageUrl,
    newImageLabel,
    setNewImageLabel,
    imagePreviewError,
    setImagePreviewError,
    tagEditMode,
    setTagEditMode,
    selectedTagIds,
    setSelectedTagIds,
    isInjectingScriptRef,
    previousTimelineLengthRef,
  };
}
