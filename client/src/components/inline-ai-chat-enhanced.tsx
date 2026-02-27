import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Send,
  Sparkles,
  User as UserIcon,
  X,
} from "lucide-react";
import type {
  Conversation,
  Project,
  Template,
  ChatMessage as ChatMessageType,
} from "@shared/schema";
import { EmailPreview } from "./email-preview";
import { formatAIContent, parseEmailFromMessage, renderFormattedText, replaceSimpleTemplateVariables } from "@/components/inline-ai-chat-utils";
import { TemplatePreviewDialog } from "@/components/template-preview-dialog";
import { InlineAiTemplateBuilderDialog } from "@/components/inline-ai-template-builder-dialog";
import { buildInlineAiContextData } from "@/components/inline-ai-context-data";
import { handleConversationsPanelToggle, handleTemplatesPanelToggle } from "@/components/inline-ai-sidebar-toggle";
import type { InlineAIChatEnhancedProps, TimelineItem } from "@/components/inline-ai-chat-enhanced.types";
import { InlineAiChatMainLayout } from "@/components/inline-ai-chat-main-layout";
import { InlineAiPrimaryDialogs } from "@/components/inline-ai-primary-dialogs";

export function InlineAIChatEnhanced({ storeContext, contextUpdateTrigger, loadDefaultScriptTrigger, trackerSheetId, onStatusChange }: InlineAIChatEnhancedProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [templatesOpen, setTemplatesOpen] = useState(() => {
    try {
      return localStorage.getItem('wickCoach_templatesOpen') === 'true';
    } catch { return false; }
  });
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [lastLoadTrigger, setLastLoadTrigger] = useState(0);

  const [templateSearch, setTemplateSearch] = useState("");

  // Dialog states
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [templateBuilderOpen, setTemplateBuilderOpen] = useState(false);
  const [templateBuilderView, setTemplateBuilderView] = useState<"builder" | "library">("builder");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingConversationId, setRenamingConversationId] = useState<string | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState("");

  // Template builder state
  const [builderTitle, setBuilderTitle] = useState("");
  const [builderContent, setBuilderContent] = useState("");
  const [builderType, setBuilderType] = useState<"Email" | "Script">("Email");
  const [builderTags, setBuilderTags] = useState("");
  const [builderIsDefault, setBuilderIsDefault] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Email-specific builder state
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

  // Image library state
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageLabel, setNewImageLabel] = useState("");
  const [imagePreviewError, setImagePreviewError] = useState(false);

  const extractGoogleDriveFileId = (url: string): string | null => {
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return fileMatch[1];
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return idMatch[1];
    return null;
  };

  const convertToDirectImageUrl = (url: string): string => {
    const fileId = extractGoogleDriveFileId(url);
    if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`;
    return url;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, originalUrl: string) => {
    const img = e.target as HTMLImageElement;
    const fileId = extractGoogleDriveFileId(originalUrl);
    if (!fileId) { img.style.display = 'none'; return; }
    const currentSrc = img.src;
    if (currentSrc.includes('googleusercontent.com')) {
      img.src = `https://drive.google.com/uc?export=view&id=${fileId}`;
    } else if (currentSrc.includes('uc?export=view')) {
      img.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    } else {
      img.style.display = 'none';
    }
  };

  // Tag management state
  const [tagEditMode, setTagEditMode] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  // Available variables for templates
  const availableVariables = [
    { name: "storeName", description: "Store/business name" },
    { name: "storeAddress", description: "Store address" },
    { name: "storeCity", description: "City" },
    { name: "storeState", description: "State" },
    { name: "storePhone", description: "Store phone number" },
    { name: "storeWebsite", description: "Store website" },
    { name: "email", description: "Email (smart: POC email or store email)" },
    { name: "pocName", description: "Point of contact name" },
    { name: "pocEmail", description: "POC email (smart: POC email or store email)" },
    { name: "pocPhone", description: "POC phone number" },
    { name: "agentName", description: "Your name" },
    { name: "agentEmail", description: "Your email" },
    { name: "agentPhone", description: "Your phone number" },
    { name: "agentMeetingLink", description: "Your meeting/calendar link" },
    { name: "currentDate", description: "Current date" },
    { name: "currentTime", description: "Current time" },
  ];

  const insertVariable = (variableName: string, targetField?: 'to' | 'subject' | 'body') => {
    const variable = `{{${variableName}}}`;

    // For Email type, insert into the specified field or the currently focused field
    if (builderType === "Email") {
      let ref = targetField === 'to' ? emailToRef 
               : targetField === 'subject' ? emailSubjectRef 
               : targetField === 'body' ? emailBodyRef 
               : null;

      // If no target specified, try to find the focused field
      if (!ref) {
        if (document.activeElement === emailToRef.current) ref = emailToRef;
        else if (document.activeElement === emailSubjectRef.current) ref = emailSubjectRef;
        else if (document.activeElement === emailBodyRef.current) ref = emailBodyRef;
        else ref = emailBodyRef; // Default to body
      }

      if (!ref.current) return;

      if (ref === emailToRef) {
        const input = ref.current;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const text = emailTo;
        const before = text.substring(0, start);
        const after = text.substring(end);
        setEmailTo(before + variable + after);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      } else if (ref === emailSubjectRef) {
        const input = ref.current;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const text = emailSubject;
        const before = text.substring(0, start);
        const after = text.substring(end);
        setEmailSubject(before + variable + after);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      } else if (ref === emailBodyRef) {
        const textarea = ref.current;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const text = emailBody;
        const before = text.substring(0, start);
        const after = text.substring(end);
        setEmailBody(before + variable + after);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      }
    } else {
      // For Script type, use the original logic
      if (!contentTextareaRef.current) return;

      const textarea = contentTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = builderContent;
      const before = text.substring(0, start);
      const after = text.substring(end);

      setBuilderContent(before + variable + after);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const insertImageAtCursor = (imageUrl: string, targetField?: 'body') => {
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

  // Format email fields into proper email template format
  const formatEmailTemplate = (to: string, subject: string, body: string): string => {
    return `To: ${to}\nSubject: ${subject}\n\nBody:\n${body}`;
  };

  // Parse email template back into fields
  const parseEmailTemplate = (content: string): { to: string; subject: string; body: string } | null => {
    const toMatch = content.match(/^To:\s*(.+?)$/m);
    const subjectMatch = content.match(/^Subject:\s*(.+?)$/m);
    const bodyMatch = content.match(/^Body:\s*\n([\s\S]+)$/m);

    if (toMatch && subjectMatch && bodyMatch) {
      return {
        to: toMatch[1].trim(),
        subject: subjectMatch[1].trim(),
        body: bodyMatch[1].trim(),
      };
    }
    return null;
  };

  const handleDeleteSelectedTags = () => {
    if (selectedTagIds.size === 0) return;

    const tagCount = selectedTagIds.size;
    if (window.confirm(`Delete ${tagCount} selected tag${tagCount > 1 ? 's' : ''}?`)) {
      deleteTagsMutation.mutate(Array.from(selectedTagIds));
    }
  };

  const copyMessageToClipboard = async (content: string) => {
    // Check if user has selected text
    const selectedText = window.getSelection()?.toString().trim();
    const textToCopy = selectedText || content;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({ 
        title: "Copied", 
        description: selectedText ? "Selected text copied to clipboard" : "Message copied to clipboard" 
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const autoDetectPlaceholders = (content: string): string => {
    let result = content;

    // Helper function to escape regex special characters
    const escapeRegex = (str: string): string => {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // Helper function to replace all occurrences of a value with a variable
    const replaceValue = (value: string | null | undefined, variable: string) => {
      if (!value || value.trim().length < 2) return; // Skip empty or very short values
      const trimmedValue = value.trim();

      // Define boundaries: start/end of string, whitespace, or common punctuation/delimiters
      // This allows values with embedded punctuation while preventing substring matches
      const escaped = escapeRegex(trimmedValue);

      // Boundary characters: whitespace, newline, or punctuation/delimiters that typically separate values
      // Includes: brackets <>[]{}, parentheses (), quotes "'`, punctuation .,!?;:, slashes /\
      // Note: Hyphens removed from boundaries to allow detection of names like "Chronic Therapy - Cortez"
      const boundary = `(?:^|[\\s\\n,.!?;:'"<>\\[\\]{}()\\/\\\\]|$)`;

      // Create regex that matches the value when surrounded by boundaries
      // Using non-capturing groups and allowing the boundary chars to remain
      const regex = new RegExp(`(${boundary})${escaped}(${boundary})`, 'g');

      // Replace but keep the boundary characters
      result = result.replace(regex, `$1{{${variable}}}$2`);
    };

    // Get agent data
    const agentName = user?.username || "";
    const agentEmail = user?.email || "";
    const agentPhone = (user as any)?.phone || "";
    const agentMeetingLink = (user as any)?.meetingLink || "";

    // Build a list of replacements ordered by specificity (longer/more specific first)
    // This prevents partial replacements
    const replacements: Array<{ value: string; variable: string }> = [];

    // Store data (if available)
    if (storeContext) {
      // Add all store fields that might appear in the content
      if (storeContext.name) replacements.push({ value: storeContext.name, variable: 'storeName' });
      if (storeContext.address) replacements.push({ value: storeContext.address, variable: 'storeAddress' });
      if (storeContext.city) replacements.push({ value: storeContext.city, variable: 'storeCity' });
      if (storeContext.state) replacements.push({ value: storeContext.state, variable: 'storeState' });
      if (storeContext.phone) replacements.push({ value: storeContext.phone, variable: 'storePhone' });
      if (storeContext.website) replacements.push({ value: storeContext.website, variable: 'storeWebsite' });
      if (storeContext.point_of_contact) replacements.push({ value: storeContext.point_of_contact, variable: 'pocName' });
      if (storeContext.poc_email) replacements.push({ value: storeContext.poc_email, variable: 'pocEmail' });
      if (storeContext.poc_phone) replacements.push({ value: storeContext.poc_phone, variable: 'pocPhone' });
    }

    // Agent data
    if (agentName) replacements.push({ value: agentName, variable: 'agentName' });
    if (agentEmail) replacements.push({ value: agentEmail, variable: 'agentEmail' });
    if (agentPhone) replacements.push({ value: agentPhone, variable: 'agentPhone' });
    if (agentMeetingLink) replacements.push({ value: agentMeetingLink, variable: 'agentMeetingLink' });

    // Sort by length (descending) to replace longer strings first
    // This prevents "John Smith" from being partially replaced as just "John"
    replacements.sort((a, b) => (b.value?.length || 0) - (a.value?.length || 0));

    // Apply all replacements
    replacements.forEach(({ value, variable }) => {
      replaceValue(value, variable);
    });

    // Special handling for date/time patterns (if the AI generated today's date)
    const today = new Date();
    const todayString = today.toLocaleDateString();
    const todayTimeString = today.toLocaleTimeString();

    // Try various date formats
    const dateFormats = [
      today.toLocaleDateString(),
      today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      today.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
    ];

    dateFormats.forEach(dateFormat => {
      if (result.includes(dateFormat)) {
        const escaped = escapeRegex(dateFormat);
        result = result.replace(new RegExp(escaped, 'g'), '{{currentDate}}');
      }
    });

    // Handle time if present
    if (result.includes(todayTimeString)) {
      const escaped = escapeRegex(todayTimeString);
      result = result.replace(new RegExp(escaped, 'g'), '{{currentTime}}');
    }

    return result;
  };

  const handleTemplateTypeChange = (newType: "Email" | "Script") => {
    if (newType === builderType) return; // No change
    
    if (newType === "Email") {
      // Switching from Script to Email - try to parse email format first
      if (builderContent.trim()) {
        const parsed = parseEmailTemplate(builderContent);
        if (parsed) {
          // Successfully parsed structured email format
          setEmailTo(parsed.to);
          setEmailSubject(parsed.subject);
          setEmailBody(parsed.body);
        } else {
          // No structured format, just use as body
          setEmailTo("{{email}}");
          setEmailSubject("");
          setEmailBody(builderContent);
        }
        setBuilderContent(""); // Clear script content
      }
    } else {
      // Switching from Email to Script - combine email fields into script content
      if (emailTo || emailSubject || emailBody) {
        // Format as email template if there's subject/to, otherwise just use body
        if (emailSubject || emailTo !== "{{email}}") {
          const scriptContent = formatEmailTemplate(emailTo, emailSubject, emailBody);
          setBuilderContent(scriptContent);
        } else {
          setBuilderContent(emailBody);
        }
        // Clear email fields
        setEmailTo("{{email}}");
        setEmailSubject("");
        setEmailBody("");
      }
    }
    
    setBuilderType(newType);
  };

  const makeTemplateFromMessage = (content: string) => {
    // Check if user has selected text - if so, use that instead of full content
    const selectedText = window.getSelection()?.toString().trim();
    const contentToUse = selectedText || content;
    
    // Try to parse as email format first (with To:/Subject:/Body: headers)
    const parsed = parseEmailTemplate(contentToUse);

    if (parsed) {
      // It's an email format - apply placeholder detection to each field separately
      setBuilderType("Email");
      setEmailTo(autoDetectPlaceholders(parsed.to));
      setEmailSubject(autoDetectPlaceholders(parsed.subject));
      setEmailBody(autoDetectPlaceholders(parsed.body));
      setBuilderContent(""); // Clear script content
    } else {
      // Intelligent email detection: Look for email-like patterns
      const emailPattern = /^(hi|hey|hello|dear|greetings)/i;
      const signaturePattern = /(best|regards|thanks|sincerely|cheers)/i;
      const hasEmailStructure = emailPattern.test(contentToUse.trim()) || signaturePattern.test(contentToUse);

      if (hasEmailStructure) {
        // It looks like an email, even without explicit headers
        setBuilderType("Email");

        // Try to extract a subject from the first line if it's short
        const lines = contentToUse.trim().split('\n').filter(l => l.trim());
        const firstLine = lines[0] || "";
        const isSubjectLine = firstLine.length < 80 && !emailPattern.test(firstLine);

        if (isSubjectLine && lines.length > 1) {
          // First line is probably the subject
          setEmailTo(autoDetectPlaceholders("{{email}}"));
          setEmailSubject(autoDetectPlaceholders(firstLine));
          setEmailBody(autoDetectPlaceholders(lines.slice(1).join('\n')));
        } else {
          // No clear subject, put everything in body
          setEmailTo(autoDetectPlaceholders("{{email}}"));
          setEmailSubject("");
          setEmailBody(autoDetectPlaceholders(contentToUse));
        }
        setBuilderContent(""); // Clear script content
      } else {
        // It's a script/general content
        setBuilderType("Script");
        setBuilderContent(autoDetectPlaceholders(contentToUse));
        // Clear email fields
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
      description: selectedText ? "Selected text converted to template" : "Common placeholders detected and converted to variables" 
    });
  };

  // Function to replace template variables with actual values - kept for consistency, though the one above is used in `useTemplate`
  const replaceTemplateVariables = (content: string, storeData: any, currentUser: any) => {
    let result = content;

    // Replace store variables
    const storeReplacements: Record<string, string> = {
      "{{store.name}}": storeData?.name || storeData?.Name || "",
      "{{store.city}}": storeData?.city || storeData?.City || "",
      "{{store.state}}": storeData?.state || storeData?.State || "",
      "{{store.address}}": storeData?.address || storeData?.Address || "",
      "{{store.phone}}": storeData?.phone || storeData?.Phone || "",
      "{{store.email}}": storeData?.email || storeData?.Email || "",
      "{{store.website}}": storeData?.website || storeData?.Website || "",
      "{{store.poc}}": storeData?.['Point of Contact'] || storeData?.pointOfContact || "",
      "{{store.poc_email}}": storeData?.['POC Email'] || storeData?.pocEmail || "",
      "{{store.poc_phone}}": storeData?.['POC Phone'] || storeData?.pocPhone || "",
    };

    Object.entries(storeReplacements).forEach(([key, value]) => {
      result = result.replace(new RegExp(key, 'g'), value);
    });

    // Replace user variables
    const userReplacements: Record<string, string> = {
      "{{user.name}}": currentUser?.firstName && currentUser?.lastName 
        ? `${currentUser.firstName} ${currentUser.lastName}` 
        : currentUser?.email || "",
      "{{user.firstName}}": currentUser?.firstName || "",
      "{{user.lastName}}": currentUser?.lastName || "",
      "{{user.email}}": currentUser?.email || "",
      "{{user.phone}}": currentUser?.phone || "",
      "{{user.agentName}}": currentUser?.agentName || "",
      "{{user.meetingLink}}": currentUser?.meetingLink || "",
    };

    Object.entries(userReplacements).forEach(([key, value]) => {
      result = result.replace(new RegExp(key, 'g'), value);
    });

    // Append signature ONLY if user has one configured
    const signature = currentUser?.signature || "";
    if (signature && !result.includes(signature)) {
      result += `\n\n${signature}`;
    }

    return result;
  };


  const useTemplate = (template: { title: string; content: string; type?: string }) => {
    const filledContent = replaceTemplateVariables(template.content, storeContext, user);
    
    // For Script templates, add to timeline (chronological display)
    if ((template as any).type === 'Script') {
      // Set flag to prevent auto-scroll on script injection
      isInjectingScriptRef.current = true;
      
      const scriptItem: TimelineItem = {
        type: 'script',
        id: `script-${Date.now()}`,
        title: template.title,
        content: filledContent,
        timestamp: Date.now()
      };
      setTimeline(prev => [...prev, scriptItem]);
      setTemplateBuilderOpen(false); // Close template builder
      setTemplatesOpen(false); // Switch to chat view
      toast({ 
        title: "Script Loaded", 
        description: `"${template.title}" added to display` 
      });
    } else {
      // For Email templates, show preview dialog
      setPreviewTemplate({ title: template.title, content: filledContent });
      setTemplatePreviewOpen(true);
    }
  };

  // Queries
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const { data: allTags = [] } = useQuery<string[]>({
    queryKey: ["/api/templates/tags"],
  });

  const { data: userTags = [] } = useQuery<Array<{ id: string; userId: string; tag: string; createdAt: Date }>>({
    queryKey: ["/api/user-tags"],
  });

  const { data: savedEmailImages = [] } = useQuery<any[]>({
    queryKey: ['/api/email-images'],
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      return await apiRequest('DELETE', `/api/email-images/${imageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-images'] });
    },
  });

  const saveImageMutation = useMutation({
    mutationFn: async (data: { url: string; label: string }) => {
      return await apiRequest('POST', '/api/email-images', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-images'] });
      toast({ title: "Image saved", description: "Image added to your library" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save image", description: error.message || "Something went wrong", variant: "destructive" });
    },
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessageType[]>({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    enabled: !!selectedConversationId,
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
  });

  // Merge server messages with timeline items and sort chronologically
  const mergedTimeline = useMemo(() => {
    const serverMessageItems: Array<Extract<TimelineItem, { type: 'message' }>> = messages.map(msg => ({
      type: 'message' as const,
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: new Date(msg.createdAt || Date.now()).getTime(),
      status: 'sent' as const,
    }));
    
    // Filter out optimistic messages that have been replaced by server messages
    // (same content from the same role around the same time)
    const filteredTimeline = timeline.filter(item => {
      // Keep all scripts
      if (item.type === 'script') return true;
      
      // Type assertion: at this point, item must be a message since we filtered out scripts
      const messageItem = item as { type: 'message'; id: string; role: 'user' | 'assistant'; content: string; timestamp: number; status?: 'pending' | 'sent' | 'error'; error?: string };
      
      // Keep error messages
      if (messageItem.status === 'error') return true;
      
      // Check if this optimistic message has a server equivalent
      const hasServerVersion = serverMessageItems.some(serverMsg => 
        serverMsg.role === messageItem.role &&
        serverMsg.content === messageItem.content &&
        Math.abs(serverMsg.timestamp - messageItem.timestamp) < 5000 // Within 5 seconds
      );
      
      return !hasServerVersion; // Keep it if there's no server version yet
    });
    
    // Combine and sort by timestamp
    const combined = [...filteredTimeline, ...serverMessageItems];
    return combined.sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, timeline]);

  // Clear only messages when switching conversations (keep scripts as reference material)
  useEffect(() => {
    setTimeline(prev => prev.filter(item => item.type === 'script'));
  }, [selectedConversationId]);

  // Track when scripts are being injected to prevent auto-scroll
  const isInjectingScriptRef = useRef(false);
  const previousTimelineLengthRef = useRef(0);

  // Auto-scroll to bottom when timeline changes (but not for script injections)
  useEffect(() => {
    // Check if a new item was added
    const newItemAdded = mergedTimeline.length > previousTimelineLengthRef.current;
    
    if (scrollBottomRef.current && !isInjectingScriptRef.current && newItemAdded) {
      // Check if the most recent item is a script - if so, don't auto-scroll
      const lastItem = mergedTimeline[mergedTimeline.length - 1];
      const isScriptAdded = lastItem && lastItem.type === 'script';
      
      if (!isScriptAdded) {
        // Only scroll for messages, not scripts
        requestAnimationFrame(() => {
          scrollBottomRef.current?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'end'
          });
        });
      }
    }
    
    // Update previous length
    previousTimelineLengthRef.current = mergedTimeline.length;
    
    // Reset flag after potential scroll
    isInjectingScriptRef.current = false;
  }, [mergedTimeline, isSending]);

  // Handle context update from parent (when Save is clicked and contextUpdateTrigger changes)
  useEffect(() => {
    if (contextUpdateTrigger && contextUpdateTrigger > 0 && selectedConversationId && storeContext) {
      const updateContext = async () => {
        const contextData = buildInlineAiContextData(storeContext);
        await updateConversationContextMutation.mutateAsync({ 
          id: selectedConversationId, 
          contextData 
        });
      };
      updateContext();
    }
  }, [contextUpdateTrigger, selectedConversationId]);

  // Handle loading default script when phone number is clicked
  useEffect(() => {
    if (loadDefaultScriptTrigger && loadDefaultScriptTrigger > 0 && loadDefaultScriptTrigger !== lastLoadTrigger && templates.length > 0) {
      const defaultScript = templates.find(t => t.type === 'Script' && t.isDefault);
      if (defaultScript && storeContext) {
        // Set flag to prevent auto-scroll on script injection
        isInjectingScriptRef.current = true;
        
        const filledContent = replaceTemplateVariables(defaultScript.content, storeContext, user);
        
        // Add script to timeline (chronological display in chat area)
        const scriptItem: TimelineItem = {
          type: 'script',
          id: `script-${Date.now()}`,
          title: defaultScript.title,
          content: filledContent,
          timestamp: Date.now()
        };
        setTimeline(prev => [...prev, scriptItem]);
        
        // Update last trigger to prevent duplicate loads
        setLastLoadTrigger(loadDefaultScriptTrigger);
        
      }
      // Always update trigger to prevent repeated checks if no default script exists
      setLastLoadTrigger(loadDefaultScriptTrigger);
    }
  }, [loadDefaultScriptTrigger, templates, storeContext, lastLoadTrigger]);

  // Mutations
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const contextData = buildInlineAiContextData(storeContext) || {};

      return await apiRequest("POST", "/api/conversations", {
        title: storeContext?.name ? `Chat about ${storeContext.name}` : "New Chat",
        contextData,
        projectId: null,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(data.id);
    },
  });

  const updateConversationContextMutation = useMutation({
    mutationFn: async ({ id, contextData }: { id: string; contextData: any }) => {
      return await apiRequest("PATCH", `/api/conversations/${id}`, { contextData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Context updated", description: "Store information refreshed in conversation" });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/projects", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setNewProjectDialogOpen(false);
      setNewProjectName("");
      toast({ title: "Success", description: "Project created" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Success", description: "Project folder deleted" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string | null; content: string }) => {
      const contextData = buildInlineAiContextData(storeContext);

      return await apiRequest("POST", "/api/openai/chat", {
        message: content,
        conversationId,
        contextData,
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: { title: string; content: string; type: string; tags: string[]; isDefault?: boolean }) => {
      const result = await apiRequest("POST", "/api/templates", template);

      // Auto-add new tags to user's personal collection
      for (const tag of template.tags) {
        const existingTag = userTags.find(ut => ut.tag.toLowerCase() === tag.toLowerCase());
        if (!existingTag) {
          await apiRequest("POST", "/api/user-tags", { tag });
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-tags"] });
      setBuilderTitle("");
      setBuilderContent("");
      setBuilderType("Email");
      setBuilderTags("");
      setBuilderIsDefault(false);
      setEditingTemplateId(null);
      toast({ title: "Success", description: "Template saved" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, template }: { id: string; template: { title: string; content: string; type: string; tags: string[]; isDefault?: boolean } }) => {
      const result = await apiRequest("PATCH", `/api/templates/${id}`, template);

      // Auto-add new tags to user's personal collection
      for (const tag of template.tags) {
        const existingTag = userTags.find(ut => ut.tag.toLowerCase() === tag.toLowerCase());
        if (!existingTag) {
          await apiRequest("POST", "/api/user-tags", { tag });
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-tags"] });
      setBuilderTitle("");
      setBuilderContent("");
      setBuilderType("Email");
      setBuilderTags("");
      setEditingTemplateId(null);
      toast({ title: "Success", description: "Template updated" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return await apiRequest("DELETE", `/api/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates/tags"] });
      toast({ title: "Success", description: "Template deleted" });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest("DELETE", `/api/conversations/${conversationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(null);
      toast({ title: "Success", description: "Conversation deleted" });
    },
  });

  const moveConversationMutation = useMutation({
    mutationFn: async ({ conversationId, projectId }: { conversationId: string; projectId: string | null }) => {
      return await apiRequest("POST", `/api/conversations/${conversationId}/move`, { projectId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Success", description: "Conversation moved" });
    },
  });

  const renameConversationMutation = useMutation({
    mutationFn: async ({ conversationId, title }: { conversationId: string; title: string }) => {
      return await apiRequest("PATCH", `/api/conversations/${conversationId}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Success",
        description: "Conversation renamed successfully",
      });
      setRenameDialogOpen(false);
      setRenamingConversationId(null);
      setNewConversationTitle("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to rename conversation",
        variant: "destructive",
      });
    },
  });

  const deleteTagsMutation = useMutation({
    mutationFn: async (tagIds: string[]) => {
      // Delete tags one by one
      for (const id of tagIds) {
        await apiRequest("DELETE", `/api/user-tags/by-id/${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-tags"] });
      setSelectedTagIds(new Set());
      setTagEditMode(false);
      toast({ title: "Success", description: "Tags deleted" });
    },
  });

  const createGmailDraftMutation = useMutation({
    mutationFn: async ({ to, subject, body, clientLink }: { to: string; subject: string; body: string; clientLink?: string | null }) => {
      const draftResult = await apiRequest("POST", "/api/gmail/create-draft", { to, subject, body, clientLink: clientLink || null });
      
      // Auto-enroll in Manual Follow-Ups if clientLink present
      try {
        await apiRequest("POST", "/api/email-drafts", {
          recipientEmail: to,
          subject,
          body,
          clientLink: clientLink || null,
        });
      } catch (error) {
        console.error('Failed to enroll in Manual Follow-Ups:', error);
      }
      
      return draftResult;
    },
    onSuccess: async (data) => {
      toast({
        title: "Success",
        description: data.message || "Gmail draft created successfully!",
      });
      if (storeContext?.link && trackerSheetId) {
        try {
          await apiRequest('POST', '/api/sheets/tracker/upsert', {
            link: storeContext.link,
            updates: { 'Status': 'Emailed' },
          });
          onStatusChange?.('Emailed');
        } catch (err) {
          console.error('[EmailDraft] Failed to update status to Emailed:', err);
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Gmail draft. Make sure Gmail is connected in Settings.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;

    const content = messageInput.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic update: add user message to timeline immediately
    const optimisticMessage: TimelineItem = {
      type: 'message',
      id: tempId,
      role: 'user',
      content,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    setTimeline(prev => [...prev, optimisticMessage]);
    setMessageInput("");
    setIsSending(true);

    try {
      const data = await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        content,
      });

      if (data.conversationId && data.conversationId !== selectedConversationId) {
        setSelectedConversationId(data.conversationId);
      }

      // Mark the optimistic message as "sent" but keep it visible
      // It will be replaced by the server version when the query refetches
      setTimeline(prev => prev.map(item => 
        item.id === tempId && item.type === 'message'
          ? { ...item, status: 'sent' as const }
          : item
      ));
      
      // Invalidate to fetch the real server messages
      // The optimistic message will be naturally replaced by deduplication logic
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId || data.conversationId, "messages"] });
    } catch (error: any) {
      // Update the optimistic message to show error state
      setTimeline(prev => prev.map(item => 
        item.id === tempId && item.type === 'message'
          ? { ...item, status: 'error' as const, error: error.message || "Failed to send" }
          : item
      ));
      
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };
  
  // Retry a failed message
  const handleRetryMessage = async (messageId: string, content: string) => {
    // Remove the failed message
    setTimeline(prev => prev.filter(item => item.id !== messageId));
    
    // Send it again
    setMessageInput(content);
    setTimeout(() => handleSendMessage(), 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
    setTimeline(prev => [...prev, scriptItem]);
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
    // Fill template variables before copying
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
    // Check if email context exists
    const email = storeContext?.poc_email || storeContext?.email;
    if (!email) {
      toast({
        title: "No Email Found",
        description: "Please add an email address or POC email to the store details first.",
        variant: "destructive",
      });
      return;
    }

    // Fill template variables using the simple replacement function
    const filledContent = replaceSimpleTemplateVariables(template.content, storeContext, user);

    // Try to parse email format
    const emailData = parseEmailFromMessage(filledContent);

    if (emailData) {
      // Apply variable replacement to each field
      const processedEmailData = {
        to: replaceSimpleTemplateVariables(emailData.to, storeContext, user),
        subject: replaceSimpleTemplateVariables(emailData.subject, storeContext, user),
        body: replaceSimpleTemplateVariables(emailData.body, storeContext, user),
      };

      // Check for ANY bracket-style placeholders (broadened to catch all variants)
      const anyBracketPattern = /\[[^\]]+\]/;
      
      // Validate that the processed email doesn't contain unreplaced variables
      if (!processedEmailData.to || 
          processedEmailData.to.trim() === '' || 
          processedEmailData.to.includes('{{') || 
          processedEmailData.to.includes('}}')) {
        toast({
          title: "Invalid Email Address",
          description: "Email contains {{placeholder}} that wasn't replaced. Please check the store has an email address.",
          variant: "destructive",
        });
        return;
      }
      
      // Check for ANY bracket-style placeholders
      if (anyBracketPattern.test(processedEmailData.to)) {
        toast({
          title: "Invalid Placeholder Format",
          description: "Email contains bracket-style placeholders like [recipient email]. The AI should use {{email}} format instead. Please try regenerating the email.",
          variant: "destructive",
        });
        return;
      }
      
      // Create Gmail draft
      createGmailDraftMutation.mutate({
        ...processedEmailData,
        clientLink: storeContext?.link || null,
      });
    } else {
      // Fallback: try to use store email
      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(
        template.title
      )}&body=${encodeURIComponent(filledContent)}`;
      
      // Auto-enroll in Manual Follow-Ups if clientLink present
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
            description: error instanceof Error ? error.message : "Failed to enroll in follow-up sequence",
            variant: "destructive",
          });
        }
        if (trackerSheetId) {
          try {
            await apiRequest('POST', '/api/sheets/tracker/upsert', {
              link: storeContext.link,
              updates: { 'Status': 'Emailed' },
            });
            onStatusChange?.('Emailed');
          } catch (err) {
            console.error('[EmailDraft] Failed to update status to Emailed:', err);
          }
        }
      }
      
      // Open mailto after enrollment completes
      window.location.href = mailtoLink;
    }
  };

  // Group conversations by project
  const conversationsByProject = conversations.reduce((acc, conv) => {
    const projectId = conv.projectId || "none";
    if (!acc[projectId]) acc[projectId] = [];
    acc[projectId].push(conv);
    return acc;
  }, {} as Record<string, Conversation[]>);

  const filteredTemplates = templates.filter(t => {
    if (!templateSearch) return true;
    const search = templateSearch.toLowerCase();
    return (
      t.title.toLowerCase().includes(search) ||
      t.content.toLowerCase().includes(search) ||
      t.tags?.some(tag => tag.toLowerCase().includes(search))
    );
  });

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  const [conversationsOpen, setConversationsOpen] = useState(() => {
    try {
      const stored = localStorage.getItem('wickCoach_conversationsOpen');
      return stored !== null ? stored === 'true' : true;
    } catch { return true; }
  });

  const handleConversationsToggle = (isOpen: boolean) =>
    handleConversationsPanelToggle({ isOpen, setConversationsOpen, setTemplatesOpen });

  const handleTemplatesToggle = (isOpen: boolean) =>
    handleTemplatesPanelToggle({ isOpen, setConversationsOpen, setTemplatesOpen });

  return (
    <div className="flex h-full overflow-hidden">
      <InlineAiChatMainLayout
        conversations={conversations}
        conversationsByProject={conversationsByProject as Record<string, Conversation[]>}
        conversationsOpen={conversationsOpen}
        createConversationMutation={createConversationMutation}
        deleteConversationMutation={deleteConversationMutation}
        deleteProjectMutation={deleteProjectMutation}
        deleteTemplateMutation={deleteTemplateMutation}
        filteredTemplates={filteredTemplates}
        handleConversationsToggle={handleConversationsToggle}
        handleCopyTemplate={handleCopyTemplate}
        handleEditTemplateFromLibrary={handleEditTemplateFromLibrary}
        handleEmailTemplate={handleEmailTemplate}
        handleInjectTemplate={handleInjectTemplate}
        handleKeyPress={handleKeyPress}
        handleOpenTemplateBuilderFromSidebar={handleOpenTemplateBuilderFromSidebar}
        handleRetryMessage={handleRetryMessage}
        handleSendMessage={handleSendMessage}
        handleTemplatesToggle={handleTemplatesToggle}
        isSending={isSending}
        mergedTimeline={mergedTimeline}
        messageInput={messageInput}
        messagesLoading={messagesLoading}
        moveConversationMutation={moveConversationMutation}
        projects={projects}
        scrollBottomRef={scrollBottomRef}
        scrollRef={scrollRef}
        selectedConversation={selectedConversation}
        selectedConversationId={selectedConversationId}
        setMessageInput={setMessageInput}
        setNewConversationTitle={setNewConversationTitle}
        setNewProjectDialogOpen={setNewProjectDialogOpen}
        setRenameDialogOpen={setRenameDialogOpen}
        setRenamingConversationId={setRenamingConversationId}
        setSelectedConversationId={setSelectedConversationId}
        setSidebarOpen={setSidebarOpen}
        setTemplateBuilderOpen={setTemplateBuilderOpen}
        setTemplateSearch={setTemplateSearch}
        setTimeline={setTimeline}
        sidebarOpen={sidebarOpen}
        storeContext={storeContext}
        templateSearch={templateSearch}
        templates={templates}
        templatesOpen={templatesOpen}
        timeline={timeline}
        toast={toast}
        user={user}
        copyMessageToClipboard={copyMessageToClipboard}
        makeTemplateFromMessage={makeTemplateFromMessage}
        onConversationsToggle={handleConversationsToggle}
        onNewProject={() => setNewProjectDialogOpen(true)}
        onRenameConversation={(conversation: Conversation) => {
          setRenamingConversationId(conversation.id);
          setNewConversationTitle(conversation.title);
          setRenameDialogOpen(true);
        }}
        onSelectConversation={setSelectedConversationId}
        onTemplatesToggle={handleTemplatesToggle}
      />

      <InlineAiPrimaryDialogs
        createProjectMutation={createProjectMutation}
        newConversationTitle={newConversationTitle}
        newProjectDialogOpen={newProjectDialogOpen}
        newProjectName={newProjectName}
        previewTemplate={previewTemplate}
        renameConversationMutation={renameConversationMutation}
        renameDialogOpen={renameDialogOpen}
        renamingConversationId={renamingConversationId}
        setNewConversationTitle={setNewConversationTitle}
        setNewProjectDialogOpen={setNewProjectDialogOpen}
        setNewProjectName={setNewProjectName}
        setRenameDialogOpen={setRenameDialogOpen}
        setRenamingConversationId={setRenamingConversationId}
        setTemplatePreviewOpen={setTemplatePreviewOpen}
        storeContext={storeContext}
        templatePreviewOpen={templatePreviewOpen}
        toast={toast}
        user={user}
      />

      <InlineAiTemplateBuilderDialog
        availableVariables={availableVariables}
        builderContent={builderContent}
        builderIsDefault={builderIsDefault}
        builderTags={builderTags}
        builderTitle={builderTitle}
        builderType={builderType}
        contentTextareaRef={contentTextareaRef}
        convertToDirectImageUrl={convertToDirectImageUrl}
        createTemplateMutation={createTemplateMutation}
        deleteImageMutation={deleteImageMutation}
        deleteTagsMutation={deleteTagsMutation}
        deleteTemplateMutation={deleteTemplateMutation}
        editingTemplateId={editingTemplateId}
        emailBody={emailBody}
        emailBodyRef={emailBodyRef}
        emailSubject={emailSubject}
        emailSubjectRef={emailSubjectRef}
        emailTo={emailTo}
        emailToRef={emailToRef}
        extractGoogleDriveFileId={extractGoogleDriveFileId}
        formatEmailTemplate={formatEmailTemplate}
        handleDeleteSelectedTags={handleDeleteSelectedTags}
        handleEditTemplateFromLibrary={handleEditTemplateFromLibrary}
        handleImageError={handleImageError}
        handleTemplateTypeChange={handleTemplateTypeChange}
        imagePreviewError={imagePreviewError}
        insertImageAtCursor={insertImageAtCursor}
        insertTag={insertTag}
        insertVariable={insertVariable}
        newImageLabel={newImageLabel}
        newImageUrl={newImageUrl}
        saveImageMutation={saveImageMutation}
        savedEmailImages={savedEmailImages}
        selectedTagFilter={selectedTagFilter}
        selectedTagIds={selectedTagIds}
        selectedTypeFilter={selectedTypeFilter}
        setBuilderContent={setBuilderContent}
        setBuilderIsDefault={setBuilderIsDefault}
        setBuilderTags={setBuilderTags}
        setBuilderTitle={setBuilderTitle}
        setBuilderType={setBuilderType}
        setEditingTemplateId={setEditingTemplateId}
        setEmailBody={setEmailBody}
        setEmailSubject={setEmailSubject}
        setEmailTo={setEmailTo}
        setImagePreviewError={setImagePreviewError}
        setNewImageLabel={setNewImageLabel}
        setNewImageUrl={setNewImageUrl}
        setSelectedTagFilter={setSelectedTagFilter}
        setSelectedTagIds={setSelectedTagIds}
        setSelectedTypeFilter={setSelectedTypeFilter}
        setTagEditMode={setTagEditMode}
        setTemplateBuilderOpen={setTemplateBuilderOpen}
        setTemplateBuilderView={setTemplateBuilderView}
        setTemplateSearch={setTemplateSearch}
        tagEditMode={tagEditMode}
        templateBuilderOpen={templateBuilderOpen}
        templateBuilderView={templateBuilderView}
        templateSearch={templateSearch}
        templates={templates}
        toggleTagSelection={toggleTagSelection}
        updateTemplateMutation={updateTemplateMutation}
        useTemplate={useTemplate}
        userTags={userTags}
      />

    </div>
  );
}
