import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowLeft,
  Bot,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Folder,
  FolderPlus,
  Library,
  Loader2,
  Mail,
  MessageSquarePlus,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Store,
  Tag,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import type {
  Conversation,
  Project,
  Template,
  ChatMessage as ChatMessageType,
} from "@shared/schema";
import { ConversationContextMenu } from "./conversation-context-menu";
import { ProjectContextMenu } from "./project-context-menu";
import { EmailPreview } from "./email-preview";

interface InlineAIChatEnhancedProps {
  storeContext?: {
    sales_ready_summary?: string;
    notes?: string;
    point_of_contact?: string;
    poc_email?: string;
    poc_phone?: string;
    status?: string;
    follow_up_date?: string;
    next_action?: string;
    dba?: string;
    name: string;
    type?: string;
    link?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  contextUpdateTrigger?: number;
  loadDefaultScriptTrigger?: number;
}

// Helper function to detect and parse email content from AI messages
function parseEmailFromMessage(content: string): { to: string; subject: string; body: string } | null {
  // Look for email pattern: To:, Subject:, and Body: (or Message:)
  const toMatch = content.match(/To:\s*(.+?)(?:\n|$)/i);
  const subjectMatch = content.match(/Subject:\s*(.+?)(?:\n|$)/i);

  // Match body from "Body:" or "Message:" to the end of content (captures multi-paragraph emails)
  const bodyMatch = content.match(/(?:Body|Message):\s*\n([\s\S]+)$/i);

  if (toMatch && subjectMatch && bodyMatch) {
    return {
      to: toMatch[1].trim(),
      subject: subjectMatch[1].trim(),
      body: bodyMatch[1].trim(),
    };
  }
  return null;
}

// Helper function to replace simple template variables with actual values (used for email generation)
function replaceSimpleTemplateVariables(
  content: string,
  storeContext?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    website?: string;
    email?: string;
    point_of_contact?: string;
    poc_email?: string;
    poc_phone?: string;
  },
  user?: any
) {
  let result = content;

  // Get user data (agent info)
  const agentName = user?.username || "Your Name";
  const agentEmail = user?.email || "your@email.com";
  const agentPhone = (user as any)?.phone || "";
  const agentMeetingLink = (user as any)?.meetingLink || "";

  // Replace store-related variables
  if (storeContext) {
    // Smart email replacement: try POC Email first, fall back to Email
    // Handle both "POC EMAIL" and "poc_email" field names
    const pocEmail = storeContext['POC EMAIL'] || storeContext.poc_email || storeContext.pocEmail || "";
    const generalEmail = storeContext['Email'] || storeContext.email || "";
    const smartEmail = pocEmail || generalEmail || "";

    result = result.replace(/\{\{storeName\}\}/g, storeContext.name || storeContext.Name || "");
    result = result.replace(/\{\{storeAddress\}\}/g, storeContext.address || storeContext.Address || "");
    result = result.replace(/\{\{storeCity\}\}/g, storeContext.city || storeContext.City || "");
    result = result.replace(/\{\{storeState\}\}/g, storeContext.state || storeContext.State || "");
    result = result.replace(/\{\{storePhone\}\}/g, storeContext.phone || storeContext.Phone || "");
    result = result.replace(/\{\{storeWebsite\}\}/g, storeContext.website || storeContext.Website || "");
    result = result.replace(/\{\{pocName\}\}/g, storeContext['Point of Contact'] || storeContext.poc_name || storeContext.pocName || "");

    // Both {{email}} and {{pocEmail}} use smart fallback logic (POC EMAIL → Email)
    result = result.replace(/\{\{pocEmail\}\}/g, smartEmail);
    result = result.replace(/\{\{email\}\}/g, smartEmail);
    result = result.replace(/\{\{pocPhone\}\}/g, storeContext['POC Phone'] || storeContext.poc_phone || storeContext.pocPhone || "");
  }

  // Replace agent variables
  result = result.replace(/\{\{agentName\}\}/g, agentName);
  result = result.replace(/\{\{agentEmail\}\}/g, agentEmail);
  result = result.replace(/\{\{agentPhone\}\}/g, agentPhone);
  result = result.replace(/\{\{agentMeetingLink\}\}/g, agentMeetingLink);

  // Replace date/time variables
  const now = new Date();
  result = result.replace(/\{\{currentDate\}\}/g, now.toLocaleDateString());
  result = result.replace(/\{\{currentTime\}\}/g, now.toLocaleTimeString());

  return result;
}

export function InlineAIChatEnhanced({ storeContext, contextUpdateTrigger, loadDefaultScriptTrigger }: InlineAIChatEnhancedProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  
  // Timeline state - chronological order of scripts and messages
  type TimelineItem = 
    | { type: 'script'; id: string; title: string; content: string; timestamp: number }
    | { type: 'message'; id: string; role: 'user' | 'assistant'; content: string; timestamp: number; status?: 'pending' | 'sent' | 'error'; error?: string };
  
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [lastLoadTrigger, setLastLoadTrigger] = useState(0);

  // Template form state
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [newTemplateTags, setNewTemplateTags] = useState("");
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

  const copyMessageToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied", description: "Message copied to clipboard" });
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

  const makeTemplateFromMessage = (content: string) => {
    // Try to parse as email format first (with To:/Subject:/Body: headers)
    const parsed = parseEmailTemplate(content);

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
      const hasEmailStructure = emailPattern.test(content.trim()) || signaturePattern.test(content);

      if (hasEmailStructure) {
        // It looks like an email, even without explicit headers
        setBuilderType("Email");

        // Try to extract a subject from the first line if it's short
        const lines = content.trim().split('\n').filter(l => l.trim());
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
          setEmailBody(autoDetectPlaceholders(content));
        }
        setBuilderContent(""); // Clear script content
      } else {
        // It's a script/general content
        setBuilderType("Script");
        setBuilderContent(autoDetectPlaceholders(content));
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
      description: "Common placeholders detected and converted to variables" 
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
    const serverMessageItems: TimelineItem[] = messages.map(msg => ({
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
      
      // Now we know item must be a message type
      const msg = item; // TypeScript should infer this is a message now
      
      // Keep error messages
      if (msg.status === 'error') return true;
      
      // Check if this optimistic message has a server equivalent
      const hasServerVersion = serverMessageItems.some(serverMsg => 
        serverMsg.role === msg.role &&
        serverMsg.content === msg.content &&
        Math.abs(serverMsg.timestamp - msg.timestamp) < 5000 // Within 5 seconds
      );
      
      return !hasServerVersion; // Keep it if there's no server version yet
    });
    
    // Combine and sort by timestamp
    const combined = [...filteredTimeline, ...serverMessageItems];
    return combined.sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, timeline]);

  // Clear timeline when switching conversations
  useEffect(() => {
    setTimeline([]);
  }, [selectedConversationId]);

  // Auto-scroll to bottom when timeline changes
  useEffect(() => {
    if (scrollBottomRef.current) {
      // Use requestAnimationFrame for better timing with DOM updates
      requestAnimationFrame(() => {
        scrollBottomRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      });
    }
  }, [mergedTimeline, isSending]);

  // Handle context update from parent (when Save is clicked and contextUpdateTrigger changes)
  useEffect(() => {
    if (contextUpdateTrigger && contextUpdateTrigger > 0 && selectedConversationId && storeContext) {
      const updateContext = async () => {
        const contextData = {
          sales_ready_summary: storeContext.sales_ready_summary,
          notes: storeContext.notes,
          point_of_contact: storeContext.point_of_contact,
          poc_email: storeContext.poc_email,
          poc_phone: storeContext.poc_phone,
          status: storeContext.status,
          follow_up_date: storeContext.follow_up_date,
          next_action: storeContext.next_action,
          dba: storeContext.dba,
          storeName: storeContext.name,
          type: storeContext.type,
          link: storeContext.link,
          address: storeContext.address,
          city: storeContext.city,
          state: storeContext.state,
          phone: storeContext.phone,
          email: storeContext.email,
          website: storeContext.website,
        };
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
        
        // Switch to chat view
        setTemplatesOpen(false);
        
        // Update last trigger to prevent duplicate loads
        setLastLoadTrigger(loadDefaultScriptTrigger);
        
        toast({ 
          title: "Default Script Loaded", 
          description: `"${defaultScript.title}" ready for your call` 
        });
      } else if (!defaultScript) {
        toast({ 
          title: "No Default Script", 
          description: "Set a default script in the Template Builder",
          variant: "destructive"
        });
      }
    }
  }, [loadDefaultScriptTrigger, templates, storeContext, lastLoadTrigger]);

  // Mutations
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const contextData = storeContext ? {
        sales_ready_summary: storeContext.sales_ready_summary,
        notes: storeContext.notes,
        point_of_contact: storeContext.point_of_contact,
        poc_email: storeContext.poc_email,
        poc_phone: storeContext.poc_phone,
        status: storeContext.status,
        follow_up_date: storeContext.follow_up_date,
        next_action: storeContext.next_action,
        dba: storeContext.dba,
        storeName: storeContext.name,
        type: storeContext.type,
        link: storeContext.link,
        address: storeContext.address,
        city: storeContext.city,
        state: storeContext.state,
        phone: storeContext.phone,
        email: storeContext.email,
        website: storeContext.website,
      } : {};

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
      const contextData = storeContext ? {
        sales_ready_summary: storeContext.sales_ready_summary,
        notes: storeContext.notes,
        point_of_contact: storeContext.point_of_contact,
        poc_email: storeContext.poc_email,
        poc_phone: storeContext.poc_phone,
        status: storeContext.status,
        follow_up_date: storeContext.follow_up_date,
        next_action: storeContext.next_action,
        dba: storeContext.dba,
        storeName: storeContext.name,
        type: storeContext.type,
        link: storeContext.link,
        address: storeContext.address,
        city: storeContext.city,
        state: storeContext.state,
        phone: storeContext.phone,
        email: storeContext.email,
        website: storeContext.website,
      } : undefined;

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
      setNewTemplateTitle("");
      setNewTemplateContent("");
      setNewTemplateTags("");
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
    mutationFn: async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
      return await apiRequest("POST", "/api/gmail/create-draft", { to, subject, body });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Gmail draft created successfully!",
      });
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

  const handleSaveTemplate = () => {
    if (!newTemplateTitle.trim() || !newTemplateContent.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    const tags = newTemplateTags
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    createTemplateMutation.mutate({
      title: newTemplateTitle,
      content: newTemplateContent,
      type: "Script",
      tags,
    });
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

  const handleEmailTemplate = (template: Template) => {
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

    // Fill template variables
    const filledContent = replaceTemplateVariables(template.content, storeContext, user);

    // Try to parse email format
    const emailData = parseEmailFromMessage(filledContent);

    if (emailData) {
      // Validate that the parsed email is not empty
      if (!emailData.to || emailData.to.trim() === '') {
        toast({
          title: "Invalid Email",
          description: "The email address could not be determined. Please check the store details.",
          variant: "destructive",
        });
        return;
      }
      // Create Gmail draft
      createGmailDraftMutation.mutate(emailData);
    } else {
      // Fallback: try to use store email
      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(
        template.title
      )}&body=${encodeURIComponent(filledContent)}`;
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

  const [conversationsOpen, setConversationsOpen] = useState(true);

  // Mutually exclusive toggle
  const handleConversationsToggle = (isOpen: boolean) => {
    if (isOpen) {
      setTemplatesOpen(false);
    }
    setConversationsOpen(isOpen);
  };

  const handleTemplatesToggle = (isOpen: boolean) => {
    if (isOpen) {
      setConversationsOpen(false);
    }
    setTemplatesOpen(isOpen);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r flex flex-col min-h-0 h-full">
          <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
            <h3 className="font-semibold text-sm">Sales Assistant</h3>
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

          {/* Conversations Collapsible */}
          <Collapsible open={conversationsOpen} onOpenChange={handleConversationsToggle} className={conversationsOpen ? "flex-1 flex flex-col min-h-0" : "flex-shrink-0"}>
              <div className="border-b flex-shrink-0">
                <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover-elevate active-elevate-2" data-testid="button-toggle-conversations">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-semibold text-sm">Conversations</span>
                    <Badge variant="secondary">{conversations.length}</Badge>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${conversationsOpen ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="flex-1 overflow-y-auto min-h-0">
                  <div className="p-2 h-full">
                    <div className="flex gap-1 mb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => createConversationMutation.mutate()}
                        className="flex-1"
                        data-testid="button-new-chat"
                      >
                        <MessageSquarePlus className="h-4 w-4 mr-1" />
                        New Chat
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNewProjectDialogOpen(true)}
                        className="flex-1"
                        data-testid="button-new-project"
                      >
                        <FolderPlus className="h-4 w-4 mr-1" />
                        New Project
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {/* Uncategorized */}
                      {conversationsByProject.none && conversationsByProject.none.length > 0 && (
                        <div className="space-y-1">
                          {conversationsByProject.none.map((conv) => (
                            <ConversationContextMenu
                              key={conv.id}
                              conversationId={conv.id}
                              onRename={() => {
                                setRenamingConversationId(conv.id);
                                setNewConversationTitle(conv.title);
                                setRenameDialogOpen(true);
                              }}
                              onDelete={() => deleteConversationMutation.mutate(conv.id)}
                              onMove={(projectId) => moveConversationMutation.mutate({ conversationId: conv.id, projectId })}
                              projects={projects}
                              currentProjectId={conv.projectId}
                            >
                              <div
                                className={`p-2 rounded-md cursor-pointer hover-elevate ${
                                  selectedConversationId === conv.id ? "bg-accent" : ""
                                }`}
                                onClick={() => setSelectedConversationId(conv.id)}
                                data-testid={`conversation-item-${conv.id}`}
                              >
                                <p className="text-sm font-medium truncate">{conv.title}</p>
                              </div>
                            </ConversationContextMenu>
                          ))}
                        </div>
                      )}

                      {/* Projects */}
                      {projects.map((project) => (
                        <div key={project.id} className="space-y-1">
                          <ProjectContextMenu
                            projectId={project.id}
                            onDelete={() => deleteProjectMutation.mutate(project.id)}
                          >
                            <div className="flex items-center gap-2 px-2 py-1 rounded-md hover-elevate" data-testid={`project-item-${project.id}`}>
                              <Folder className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{project.name}</span>
                            </div>
                          </ProjectContextMenu>
                          {conversationsByProject[project.id]?.map((conv) => (
                            <ConversationContextMenu
                              key={conv.id}
                              conversationId={conv.id}
                              onRename={() => {
                                setRenamingConversationId(conv.id);
                                setNewConversationTitle(conv.title);
                                setRenameDialogOpen(true);
                              }}
                              onDelete={() => deleteConversationMutation.mutate(conv.id)}
                              onMove={(projectId) => moveConversationMutation.mutate({ conversationId: conv.id, projectId })}
                              projects={projects}
                              currentProjectId={conv.projectId}
                            >
                              <div
                                className={`p-2 rounded-md cursor-pointer ml-4 hover-elevate ${
                                  selectedConversationId === conv.id ? "bg-accent" : ""
                                }`}
                                onClick={() => setSelectedConversationId(conv.id)}
                                data-testid={`conversation-item-${conv.id}`}
                              >
                                <p className="text-sm font-medium truncate">{conv.title}</p>
                              </div>
                            </ConversationContextMenu>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

          {/* Template Library */}
          <Collapsible open={templatesOpen} onOpenChange={handleTemplatesToggle} className={templatesOpen ? "flex-1 flex flex-col min-h-0" : "flex-shrink-0"}>
            <div className="border-t flex-shrink-0">
              <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover-elevate active-elevate-2" data-testid="button-toggle-templates">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="font-semibold text-sm">Template Library</span>
                  <Badge variant="secondary">{templates.length}</Badge>
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${templatesOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="flex-1 overflow-y-auto min-h-0">
                <div className="p-2 space-y-3 h-full">
                  {/* Template Builder Button */}
                  <Button
                    onClick={() => {
                      // Reset all builder state for a new template
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
                    }}
                    className="w-full"
                    variant="default"
                    data-testid="button-template-builder"
                  >
                    Template Builder
                  </Button>

                  {/* Search Templates */}
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="pl-8"
                      data-testid="input-template-search"
                    />
                  </div>

                  {/* Template List */}
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-2 pr-3">
                    {filteredTemplates.map((template) => (
                      <div key={template.id} className="p-2 border rounded-md bg-card" data-testid={`template-${template.id}`}>
                        <div className="flex items-start justify-between mb-1">
                          <h5 className="text-xs font-semibold">{template.title}</h5>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => {
                                setBuilderTitle(template.title);
                                const templateType = (template as any).type || "Email";
                                setBuilderType(templateType);
                                setBuilderTags(template.tags?.join(", ") || "");
                                setEditingTemplateId(template.id);
                                
                                // Set isDefault based on whether this template is the default
                                setBuilderIsDefault((template as any).isDefault || false);

                                // Parse content based on type
                                if (templateType === "Email") {
                                  const parsed = parseEmailTemplate(template.content);
                                  if (parsed) {
                                    setEmailTo(parsed.to);
                                    setEmailSubject(parsed.subject);
                                    setEmailBody(parsed.body);
                                    setBuilderContent(""); // Clear script content
                                  } else {
                                    // Fallback if parsing fails
                                    setBuilderContent(template.content);
                                  }
                                } else {
                                  // Script type
                                  setBuilderContent(template.content);
                                  // Clear email fields
                                  setEmailTo("{{email}}");
                                  setEmailSubject("");
                                  setEmailBody("");
                                }

                                setTemplateBuilderOpen(true);
                              }}
                              data-testid={`button-edit-template-${template.id}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-destructive"
                              onClick={() => deleteTemplateMutation.mutate(template.id)}
                              disabled={deleteTemplateMutation.isPending}
                              data-testid={`button-delete-template-${template.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {template.content}
                        </p>
                        {template.tags && template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {template.tags.map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-1">
                          {template.type === "Script" ? (
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                const filledContent = replaceTemplateVariables(template.content, storeContext, user);
                                const scriptItem: TimelineItem = {
                                  type: 'script',
                                  id: `script-${Date.now()}`,
                                  title: template.title,
                                  content: filledContent,
                                  timestamp: Date.now()
                                };
                                setTimeline(prev => [...prev, scriptItem]);
                                toast({ 
                                  title: "Script Injected", 
                                  description: `"${template.title}" added to display` 
                                });
                              }}
                              data-testid={`button-inject-template-${template.id}`}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Inject
                            </Button>
                          ) : template.type === "Email" && (storeContext?.email || storeContext?.poc_email) ? (
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleEmailTemplate(template)}
                              data-testid={`button-email-template-${template.id}`}
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              Email
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleCopyTemplate(template)}
                            data-testid={`button-copy-template-${template.id}`}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    ))}
                    </div>
                  </ScrollArea>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="h-7 w-7"
                data-testid="button-open-sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            <Bot className="h-5 w-5" />
            <h2 className="font-semibold">Sales Assistant</h2>
          </div>
          {timeline.some(item => item.type === 'script') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTimeline(prev => prev.filter(item => item.type !== 'script'));
                toast({ title: "Scripts Cleared", description: "Script display reset" });
              }}
              data-testid="button-clear-scripts"
            >
              <X className="h-3 w-3 mr-1" />
              Clear Scripts
            </Button>
          )}
        </div>

        {/* Context Indicator - only show when there's actual store context */}
        {selectedConversation?.contextData?.storeName && (
          <div className="px-4 py-2 bg-muted/50 text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">
              Context:{" "}
              <span className="font-medium text-foreground">
                {selectedConversation.contextData.storeName}
              </span>
            </span>
          </div>
        )}

        {/* Messages - Unified Timeline */}
        <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollRef}>
          {!selectedConversationId ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Bot className="h-16 w-16 mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Welcome to Sales Assistant</h3>
              <p className="text-muted-foreground mb-4">
                Create a new chat to get started
              </p>
              <Button onClick={() => createConversationMutation.mutate()} data-testid="button-start-chat">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          ) : messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Render merged timeline chronologically */}
              {mergedTimeline.map((item) => {
                if (item.type === 'script') {
                  // Script display
                  return (
                    <div key={item.id} className="border-2 border-primary/30 rounded-lg bg-card p-4" data-testid={`script-${item.id}`}>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                        <FileText className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.content}</p>
                      </div>
                    </div>
                  );
                } else {
                  // Message display
                  const emailData = item.role === "assistant" ? parseEmailFromMessage(item.content) : null;
                  const processedEmailData = emailData ? {
                    to: replaceSimpleTemplateVariables(emailData.to, storeContext, user),
                    subject: replaceSimpleTemplateVariables(emailData.subject, storeContext, user),
                    body: replaceSimpleTemplateVariables(emailData.body, storeContext, user),
                  } : null;

                  return (
                    <div
                      key={item.id}
                      className={`flex gap-3 ${item.role === "user" ? "justify-end" : ""}`}
                      data-testid={`message-${item.id}`}
                    >
                      {item.role === "assistant" && (
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                      )}
                      <div className={`max-w-[80%] ${item.role === "user" ? "w-full" : ""}`}>
                        {item.role === "assistant" ? (
                          <ContextMenu>
                            <ContextMenuTrigger>
                              <div className="rounded-lg p-3 bg-muted">
                                <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                              <ContextMenuItem
                                onClick={() => copyMessageToClipboard(item.content)}
                                data-testid="context-menu-copy"
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() => makeTemplateFromMessage(item.content)}
                                data-testid="context-menu-make-template"
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Make Template
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        ) : (
                          <div className={`rounded-lg p-3 ${
                            item.status === 'error' 
                              ? 'bg-destructive/20 border border-destructive' 
                              : item.status === 'pending'
                              ? 'bg-primary/70 text-primary-foreground'
                              : 'bg-primary text-primary-foreground'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                            {item.status === 'error' && (
                              <div className="mt-2 flex items-center gap-2">
                                <p className="text-xs text-destructive">{item.error}</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRetryMessage(item.id, item.content)}
                                  data-testid={`button-retry-${item.id}`}
                                >
                                  Retry
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                        {processedEmailData && (
                          <EmailPreview
                            to={processedEmailData.to}
                            subject={processedEmailData.subject}
                            body={processedEmailData.body}
                          />
                        )}
                      </div>
                      {item.role === "user" && (
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                            <UserIcon className="h-4 w-4" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
              })}
              
              {/* Typing indicator when AI is responding */}
              {isSending && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="rounded-lg p-3 bg-muted">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Bottom anchor for auto-scroll */}
              <div ref={scrollBottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t flex-shrink-0">
          <div className="flex gap-2">
            <Textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about sales scripts, objections, or product info..."
              disabled={isSending}
              className="min-h-[60px] max-h-[200px]"
              data-testid="input-message"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isSending || !messageInput.trim()}
              size="icon"
              className="h-[60px] w-[60px]"
              data-testid="button-send-message"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

      </div>

      {/* New Project Dialog */}
      <Dialog open={newProjectDialogOpen} onOpenChange={setNewProjectDialogOpen}>
        <DialogContent data-testid="dialog-new-project">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Create a new folder to organize your conversations</DialogDescription>
          </DialogHeader>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name..."
            data-testid="input-project-name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createProjectMutation.mutate(newProjectName)}
              disabled={createProjectMutation.isPending || !newProjectName.trim()}
              data-testid="button-create-project"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Conversation Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent data-testid="dialog-rename-conversation">
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
            <DialogDescription>Enter a new name for this conversation</DialogDescription>
          </DialogHeader>
          <Input
            value={newConversationTitle}
            onChange={(e) => setNewConversationTitle(e.target.value)}
            placeholder="Conversation title..."
            data-testid="input-conversation-title"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newConversationTitle.trim() && renamingConversationId) {
                renameConversationMutation.mutate({
                  conversationId: renamingConversationId,
                  title: newConversationTitle.trim(),
                });
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRenameDialogOpen(false);
              setRenamingConversationId(null);
              setNewConversationTitle("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renamingConversationId) {
                  renameConversationMutation.mutate({
                    conversationId: renamingConversationId,
                    title: newConversationTitle.trim(),
                  });
                }
              }}
              disabled={renameConversationMutation.isPending || !newConversationTitle.trim()}
              data-testid="button-save-rename"
            >
              {renameConversationMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Builder Dialog */}
      <Dialog open={templateBuilderOpen} onOpenChange={setTemplateBuilderOpen}>
        <DialogContent className="max-w-full w-screen h-screen max-h-screen m-0 rounded-none p-0 flex flex-col" data-testid="dialog-template-builder">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center gap-4">
              {templateBuilderView === "library" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTemplateBuilderView("builder")}
                  data-testid="button-back-to-builder"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <DialogTitle>{templateBuilderView === "builder" ? "Template Builder" : "My Templates"}</DialogTitle>
            </div>
          </DialogHeader>

          {/* Builder View */}
          {templateBuilderView === "builder" && (
            <div className="flex-1 flex flex-col min-h-0 px-6 pt-6 pb-6">
              <div className="space-y-4 flex-1">
                {/* Type & Title - Side by Side */}
                <div className="flex gap-4">
                  <div className="w-[200px] space-y-2">
                    <label className="text-sm font-semibold">Type</label>
                    <Select
                      value={builderType}
                      onValueChange={(value: "Email" | "Script") => setBuilderType(value)}
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold">Tags</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid="button-insert-tag"
                        >
                          <Tag className="h-4 w-4 mr-1" />
                          My Tags
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="end">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Tag className="h-4 w-4" />
                              Your Personal Tags
                            </h4>
                            {userTags.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTagEditMode(!tagEditMode);
                                  if (tagEditMode) {
                                    setSelectedTagIds(new Set());
                                  }
                                }}
                                data-testid="button-edit-tags"
                              >
                                {tagEditMode ? "Done" : "Edit"}
                              </Button>
                            )}
                          </div>

                          {tagEditMode && selectedTagIds.size > 0 && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={handleDeleteSelectedTags}
                              disabled={deleteTagsMutation.isPending}
                              data-testid="button-delete-selected-tags"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete {selectedTagIds.size} tag{selectedTagIds.size > 1 ? 's' : ''}
                            </Button>
                          )}

                          {userTags.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">
                              No tags yet. Tags you use in templates will appear here.
                            </p>
                          ) : (
                            <div className="space-y-1 max-h-64 overflow-y-auto">
                              {userTags.map((userTag) => (
                                <button
                                  key={userTag.id}
                                  onClick={() => tagEditMode ? toggleTagSelection(userTag.id) : insertTag(userTag.tag)}
                                  className="w-full text-left p-2 rounded hover-elevate flex items-center justify-between group"
                                  data-testid={`${tagEditMode ? 'toggle' : 'insert'}-tag-${userTag.tag}`}
                                >
                                  <div className="flex items-center gap-2">
                                    {tagEditMode && (
                                      <input
                                        type="checkbox"
                                        checked={selectedTagIds.has(userTag.id)}
                                        onChange={() => toggleTagSelection(userTag.id)}
                                        className="h-4 w-4"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    )}
                                    <span className="text-sm">{userTag.tag}</span>
                                  </div>
                                  {!tagEditMode && (
                                    <Badge variant="outline" className="text-xs">Click to add</Badge>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Input
                    placeholder="email, follow-up, introduction..."
                    value={builderTags}
                    onChange={(e) => setBuilderTags(e.target.value)}
                    data-testid="input-builder-tags"
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated tags</p>
                </div>

                {/* Default Script Checkbox - Only for Script type */}
                {builderType === "Script" && (
                  <div className="space-y-2">
                    <div 
                      className={`flex items-center gap-2 p-3 rounded border ${
                        !templates.some(t => t.type === 'Script' && t.isDefault) 
                          ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-700' 
                          : 'border-border'
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
                      {!templates.some(t => t.type === 'Script' && t.isDefault) && (
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
                  // Email Builder - Compact Layout
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
                        <div className="flex gap-2">
                          {/* Store Info Variables */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid="button-insert-store-variable-body"
                              >
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
                                    .filter(v => ['storeName', 'storeAddress', 'storeCity', 'storeState', 'storeWebsite', 'storePhone'].includes(v.name))
                                    .map((variable) => (
                                      <button
                                        key={variable.name}
                                        onClick={() => insertVariable(variable.name, 'body')}
                                        className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                                        data-testid={`insert-variable-body-${variable.name}`}
                                      >
                                        <div className="font-mono text-sm text-primary">
                                          {`{{${variable.name}}}`}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {variable.description}
                                        </div>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>

                          {/* Contact Variables */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid="button-insert-contact-variable-body"
                              >
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
                                    .filter(v => ['email', 'pocName', 'pocEmail', 'pocPhone'].includes(v.name))
                                    .map((variable) => (
                                      <button
                                        key={variable.name}
                                        onClick={() => insertVariable(variable.name, 'body')}
                                        className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                                        data-testid={`insert-variable-body-${variable.name}`}
                                      >
                                        <div className="font-mono text-sm text-primary">
                                          {`{{${variable.name}}}`}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {variable.description}
                                        </div>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>

                          {/* Agent Variables */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid="button-insert-agent-variable-body"
                              >
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
                                    .filter(v => ['agentName', 'agentEmail', 'agentPhone', 'agentMeetingLink'].includes(v.name))
                                    .map((variable) => (
                                      <button
                                        key={variable.name}
                                        onClick={() => insertVariable(variable.name, 'body')}
                                        className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                                        data-testid={`insert-variable-body-${variable.name}`}
                                      >
                                        <div className="font-mono text-sm text-primary">
                                          {`{{${variable.name}}}`}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {variable.description}
                                        </div>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>

                          {/* Date/Time Variables */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid="button-insert-datetime-variable-body"
                              >
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
                                    .filter(v => ['currentDate', 'currentTime'].includes(v.name))
                                    .map((variable) => (
                                      <button
                                        key={variable.name}
                                        onClick={() => insertVariable(variable.name, 'body')}
                                        className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                                        data-testid={`insert-variable-body-${variable.name}`}
                                      >
                                        <div className="font-mono text-sm text-primary">
                                          {`{{${variable.name}}}`}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {variable.description}
                                        </div>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <Textarea
                        ref={emailBodyRef}
                        placeholder="Email body with {{variables}}..."
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="flex-1 min-h-[200px] font-mono"
                        data-testid="textarea-email-body"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use variables like: {`{{storeName}}, {{pocName}}, {{pocEmail}}`}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Script Builder - Compact Layout
                  <div className="space-y-3 flex-1 flex flex-col">
                    <div className="space-y-2 flex-1 flex flex-col">
                      <div className="flex items-center justify-between gap-4">
                        <label className="text-sm font-semibold">Content</label>
                        <div className="flex gap-2">
                          {/* Store Info Variables */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid="button-insert-store-variable"
                              >
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
                                    .filter(v => ['storeName', 'storeAddress', 'storeCity', 'storeState', 'storeWebsite', 'storePhone'].includes(v.name))
                                    .map((variable) => (
                                      <button
                                        key={variable.name}
                                        onClick={() => insertVariable(variable.name)}
                                        className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                                        data-testid={`insert-variable-${variable.name}`}
                                      >
                                        <div className="font-mono text-sm text-primary">
                                          {`{{${variable.name}}}`}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {variable.description}
                                        </div>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>

                          {/* Contact Variables */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid="button-insert-contact-variable"
                              >
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
                                    .filter(v => ['email', 'pocName', 'pocEmail', 'pocPhone'].includes(v.name))
                                    .map((variable) => (
                                      <button
                                        key={variable.name}
                                        onClick={() => insertVariable(variable.name)}
                                        className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                                        data-testid={`insert-variable-${variable.name}`}
                                      >
                                        <div className="font-mono text-sm text-primary">
                                          {`{{${variable.name}}}`}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {variable.description}
                                        </div>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>

                          {/* Agent Variables */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid="button-insert-agent-variable"
                              >
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
                                    .filter(v => ['agentName', 'agentEmail', 'agentPhone', 'agentMeetingLink'].includes(v.name))
                                    .map((variable) => (
                                      <button
                                        key={variable.name}
                                        onClick={() => insertVariable(variable.name)}
                                        className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                                        data-testid={`insert-variable-${variable.name}`}
                                      >
                                        <div className="font-mono text-sm text-primary">
                                          {`{{${variable.name}}}`}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {variable.description}
                                        </div>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>

                          {/* Date/Time Variables */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid="button-insert-datetime-variable"
                              >
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
                                    .filter(v => ['currentDate', 'currentTime'].includes(v.name))
                                    .map((variable) => (
                                      <button
                                        key={variable.name}
                                        onClick={() => insertVariable(variable.name)}
                                        className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                                        data-testid={`insert-variable-${variable.name}`}
                                      >
                                        <div className="font-mono text-sm text-primary">
                                          {`{{${variable.name}}}`}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {variable.description}
                                        </div>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <Textarea
                        ref={contentTextareaRef}
                        placeholder="Template content with {{variables}}..."
                        value={builderContent}
                        onChange={(e) => setBuilderContent(e.target.value)}
                        className="flex-1 min-h-[200px] font-mono"
                        data-testid="textarea-builder-content"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use variables like: {`{{storeName}}, {{pocName}}, {{pocEmail}}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => {
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
                  data-testid="button-cancel-builder"
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTemplateBuilderView("library")}
                  data-testid="button-goto-templates"
                >
                  <Library className="h-4 w-4 mr-2" />
                  View My Templates
                </Button>
                <Button
                  className="flex-1"
                  disabled={
                    !builderTitle.trim() || 
                    (builderType === "Email" 
                      ? (!emailTo.trim() || !emailSubject.trim() || !emailBody.trim())
                      : !builderContent.trim()) ||
                    createTemplateMutation.isPending || 
                    updateTemplateMutation.isPending
                  }
                  onClick={() => {
                    const tags = builderTags
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter((tag) => tag.length > 0);

                    const content = builderType === "Email" 
                      ? formatEmailTemplate(emailTo, emailSubject, emailBody)
                      : builderContent;

                    const templateData = {
                      title: builderTitle,
                      content,
                      type: builderType,
                      tags,
                      isDefault: builderIsDefault,
                    };

                    if (editingTemplateId) {
                      updateTemplateMutation.mutate({ id: editingTemplateId, template: templateData });
                    } else {
                      createTemplateMutation.mutate(templateData);
                    }
                  }}
                  data-testid="button-save-template-builder"
                >
                  {editingTemplateId ? "Update Template" : "Save Template"}
                </Button>
              </div>
            </div>
          )}

          {/* Library View */}
          {templateBuilderView === "library" && (
            <div className="flex-1 flex flex-col min-h-0 px-6 pt-6 pb-6">
              <div className="flex flex-col flex-1 gap-4 overflow-hidden">
                {/* Type and Tag Filters */}
                <div className="flex flex-wrap gap-2">
                  {/* Type Filters First */}
                  <Badge
                    variant={selectedTypeFilter === null ? "default" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedTypeFilter(null)}
                    data-testid="type-filter-all"
                  >
                    All
                  </Badge>
                  <Badge
                    variant={selectedTypeFilter === "Email" ? "default" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedTypeFilter("Email")}
                    data-testid="type-filter-email"
                  >
                    Email
                  </Badge>
                  <Badge
                    variant={selectedTypeFilter === "Script" ? "default" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedTypeFilter("Script")}
                    data-testid="type-filter-script"
                  >
                    Script
                  </Badge>

                  {/* Separator */}
                  {Array.from(new Set(templates.flatMap((t) => t.tags || []))).length > 0 && (
                    <div className="w-px h-6 bg-border mx-1" />
                  )}

                  {/* Tag Filters */}
                  {Array.from(new Set(templates.flatMap((t) => t.tags || []))).map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTagFilter === tag ? "default" : "outline"}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedTagFilter(tag)}
                      data-testid={`tag-filter-${tag}`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Scrollable Templates List */}
                <ScrollArea className="flex-1 min-h-0">
                  <div className="space-y-2 pr-4">
                    {templates
                      .filter(
                        (template) =>
                          (template.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
                          template.content.toLowerCase().includes(templateSearch.toLowerCase()) ||
                          template.tags?.some((tag) =>
                            tag.toLowerCase().includes(templateSearch.toLowerCase())
                          )) &&
                          (selectedTypeFilter === null || (template as any).type === selectedTypeFilter) &&
                          (selectedTagFilter === null || template.tags?.includes(selectedTagFilter))
                      )
                      .map((template) => (
                        <div
                          key={template.id}
                          className="p-4 border rounded-lg hover-elevate bg-card"
                          data-testid={`template-card-${template.id}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold">{template.title}</h4>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => useTemplate({ ...template, type: template.type || "Script" })}
                                data-testid={`button-use-template-${template.id}`}
                              >
                                Use
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setBuilderTitle(template.title);
                                  const templateType = (template as any).type || "Email";
                                  setBuilderType(templateType);
                                  setBuilderTags(template.tags?.join(", ") || "");
                                  setEditingTemplateId(template.id);
                                  
                                  // Set isDefault based on whether this template is the default
                                  setBuilderIsDefault((template as any).isDefault || false);

                                  // Parse content based on type
                                  if (templateType === "Email") {
                                    const parsed = parseEmailTemplate(template.content);
                                    if (parsed) {
                                      setEmailTo(parsed.to);
                                      setEmailSubject(parsed.subject);
                                      setEmailBody(parsed.body);
                                      setBuilderContent(""); // Clear script content
                                    } else {
                                      // Fallback if parsing fails
                                      setBuilderContent(template.content);
                                    }
                                  } else {
                                    // Script type
                                    setBuilderContent(template.content);
                                    // Clear email fields
                                    setEmailTo("{{email}}");
                                    setEmailSubject("");
                                    setEmailBody("");
                                  }

                                  setTemplateBuilderView("builder");
                                }}
                                data-testid={`button-edit-template-${template.id}`}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTemplateMutation.mutate(template.id);
                                }}
                                disabled={deleteTemplateMutation.isPending}
                                data-testid={`button-delete-template-builder-${template.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-2 font-mono">
                            {template.content}
                          </p>
                          <div className="flex flex-wrap gap-1 items-center">
                            {(template as any).type && (
                              <Badge variant="default" className="text-xs">
                                {(template as any).type}
                              </Badge>
                            )}
                            {template.tags && template.tags.map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    {templates.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No templates yet</p>
                        <p className="text-sm">Go back to builder to create your first template</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Search Bar */}
                <div className="flex gap-4 mt-4 pt-4 border-t flex-shrink-0">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="pl-8"
                      data-testid="input-search-templates-library"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={templatePreviewOpen} onOpenChange={setTemplatePreviewOpen}>
        <DialogContent className="max-w-3xl" data-testid="dialog-template-preview">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.title || "Template Preview"}</DialogTitle>
            <DialogDescription>
              Rendered template with your store context data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted">
              <p className="text-sm whitespace-pre-wrap">{previewTemplate?.content}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setTemplatePreviewOpen(false)}
              data-testid="button-close-preview"
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (previewTemplate) {
                  navigator.clipboard.writeText(previewTemplate.content);
                  toast({ title: "Copied", description: "Template content copied to clipboard" });
                }
              }}
              data-testid="button-copy-preview"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            {previewTemplate && parseEmailFromMessage(previewTemplate.content) && (() => {
              const emailData = parseEmailFromMessage(previewTemplate.content)!;
              return (
                <EmailPreview
                  to={replaceSimpleTemplateVariables(emailData.to, storeContext, user)}
                  subject={replaceSimpleTemplateVariables(emailData.subject, storeContext, user)}
                  body={replaceSimpleTemplateVariables(emailData.body, storeContext, user)}
                />
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}