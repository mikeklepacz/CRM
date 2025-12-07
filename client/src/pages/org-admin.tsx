import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useOptionalProject } from "@/contexts/project-context";
import { AVAILABLE_MODULES } from "@/lib/modules";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Settings as SettingsIcon, BarChart3, Plus, Trash2, Loader2, UserPlus, Mail, X, Workflow, ArrowLeft, GripVertical, Pencil, FolderKanban, Archive, ArchiveRestore, Star } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TenantUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  roleInTenant: string;
  joinedAt: string | null;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  settings: {
    companyName?: string;
    timezone?: string;
    enabledModules?: string[];
    allowedModules?: string[];
    primaryColor?: string;
    logoUrl?: string;
  };
  createdAt: string;
}

interface TenantStats {
  userCount: number;
  clientCount: number;
  callCount: number;
}

interface TenantInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface Pipeline {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  pipelineType: string;
  description: string | null;
  aiPromptTemplate: string | null;
  aiAssistantId: string | null;
  voiceAgentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ElevenLabsAgent {
  id: string;
  name: string;
  agentId: string;
  isDefault: boolean;
}

interface PipelineStage {
  id: string;
  tenantId: string;
  pipelineId: string;
  name: string;
  stageOrder: number;
  stageType: string;
  config: Record<string, any> | null;
  isTerminal: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PipelineWithStages extends Pipeline {
  stages: PipelineStage[];
}

interface TenantProject {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  projectType: string;
  description: string | null;
  accentColor: string | null;
  status: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const PIPELINE_TYPES = [
  { value: "sales", label: "Sales" },
  { value: "qualification", label: "Qualification" },
  { value: "support", label: "Support" },
  { value: "custom", label: "Custom" },
];

const STAGE_TYPES = [
  { value: "action", label: "Action" },
  { value: "decision", label: "Decision" },
  { value: "wait", label: "Wait" },
  { value: "complete", label: "Complete" },
];

const PROJECT_TYPES = [
  { value: "campaign", label: "Campaign" },
  { value: "case", label: "Case" },
  { value: "initiative", label: "Initiative" },
  { value: "custom", label: "Custom" },
];

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const pipelineFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be URL-friendly (lowercase, numbers, hyphens only)"),
  pipelineType: z.enum(["sales", "qualification", "support", "custom"]),
  description: z.string().optional(),
  aiPromptTemplate: z.string().optional(),
  voiceAgentId: z.string().optional(),
  isActive: z.boolean(),
});

type PipelineFormData = z.infer<typeof pipelineFormSchema>;

const stageFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  stageType: z.enum(["action", "decision", "wait", "complete"]),
  isTerminal: z.boolean(),
});

type StageFormData = z.infer<typeof stageFormSchema>;

const PROJECT_COLORS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#64748b", label: "Slate" },
  { value: "#78716c", label: "Stone" },
];

const projectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be URL-friendly (lowercase, numbers, hyphens only)"),
  projectType: z.enum(["campaign", "case", "initiative", "custom"]),
  description: z.string().optional(),
  accentColor: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

function SortableStageItem({ stage, onEdit, onDelete, isDeleting }: { 
  stage: PipelineStage; 
  onEdit: () => void; 
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStageTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "action": return "default";
      case "decision": return "secondary";
      case "wait": return "outline";
      case "complete": return "default";
      default: return "outline";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-md bg-background"
      data-testid={`stage-item-${stage.id}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        data-testid={`drag-handle-${stage.id}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 flex items-center gap-3">
        <span className="font-medium" data-testid={`stage-name-${stage.id}`}>{stage.name}</span>
        <Badge variant={getStageTypeBadgeVariant(stage.stageType)} className="no-default-hover-elevate no-default-active-elevate">
          {stage.stageType}
        </Badge>
        {stage.isTerminal && (
          <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-xs">Terminal</Badge>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={onEdit}
          data-testid={`button-edit-stage-${stage.id}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          disabled={isDeleting}
          data-testid={`button-delete-stage-${stage.id}`}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
        </Button>
      </div>
    </div>
  );
}

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["org_admin", "agent"]),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

const createUserFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["org_admin", "agent"]),
});

type CreateUserFormData = z.infer<typeof createUserFormSchema>;

const settingsFormSchema = z.object({
  companyName: z.string().optional(),
  timezone: z.string().optional(),
  enabledModules: z.array(z.string()).optional(),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;


const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "UTC", label: "UTC" },
];

export default function OrgAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const projectContext = useOptionalProject();
  const currentProject = projectContext?.currentProject;
  const [activeTab, setActiveTab] = useState("team");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<TenantUser | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<{ user: TenantUser; newRole: string } | null>(null);
  
  const [isPipelineDialogOpen, setIsPipelineDialogOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [pipelineToDelete, setPipelineToDelete] = useState<Pipeline | null>(null);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [stageToDelete, setStageToDelete] = useState<PipelineStage | null>(null);
  const [deletingStageId, setDeletingStageId] = useState<string | null>(null);

  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<TenantProject | null>(null);
  const [projectToArchive, setProjectToArchive] = useState<TenantProject | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<TenantProject | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!authLoading && user && !canAccessAdminFeatures(user)) {
      setLocation('/');
    }
  }, [user, authLoading, setLocation]);

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: TenantUser[] }>({
    queryKey: ['/api/org-admin/users'],
    enabled: canAccessAdminFeatures(user),
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<{ tenant: Tenant }>({
    queryKey: ['/api/org-admin/settings'],
    enabled: canAccessAdminFeatures(user),
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<TenantStats>({
    queryKey: ['/api/org-admin/stats'],
    enabled: canAccessAdminFeatures(user),
  });

  const { data: invitesData, isLoading: invitesLoading } = useQuery<{ invites: TenantInvite[] }>({
    queryKey: ['/api/org-admin/invites'],
    enabled: canAccessAdminFeatures(user),
  });

  const { data: pipelinesData, isLoading: pipelinesLoading } = useQuery<{ pipelines: Pipeline[] }>({
    queryKey: ['/api/org-admin/pipelines', currentProject?.id],
    queryFn: async () => {
      const url = new URL('/api/org-admin/pipelines', window.location.origin);
      if (currentProject?.id) {
        url.searchParams.set('projectId', currentProject.id);
      }
      const response = await fetch(url.toString(), { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch pipelines');
      return response.json();
    },
    enabled: canAccessAdminFeatures(user),
  });

  const { data: selectedPipelineData, isLoading: selectedPipelineLoading } = useQuery<{ pipeline: PipelineWithStages }>({
    queryKey: ['/api/org-admin/pipelines', selectedPipelineId],
    enabled: canAccessAdminFeatures(user) && !!selectedPipelineId,
  });

  const { data: voiceAgentsData } = useQuery<{ agents: ElevenLabsAgent[] }>({
    queryKey: ['/api/elevenlabs/agents', currentProject?.id],
    queryFn: async () => {
      const url = new URL('/api/elevenlabs/agents', window.location.origin);
      if (currentProject?.id) {
        url.searchParams.set('projectId', currentProject.id);
      }
      const response = await fetch(url.toString(), { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch agents');
      return response.json();
    },
    enabled: canAccessAdminFeatures(user),
  });

  const { data: projectsData, isLoading: projectsLoading } = useQuery<{ projects: TenantProject[] }>({
    queryKey: ['/api/org-admin/projects'],
    enabled: canAccessAdminFeatures(user),
  });

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "agent",
    },
  });

  const createUserForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      role: "agent",
    },
  });

  const settingsForm = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      companyName: "",
      timezone: "",
      enabledModules: [],
    },
  });

  const pipelineForm = useForm<PipelineFormData>({
    resolver: zodResolver(pipelineFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      pipelineType: "sales",
      description: "",
      aiPromptTemplate: "",
      voiceAgentId: "",
      isActive: true,
    },
  });

  const stageForm = useForm<StageFormData>({
    resolver: zodResolver(stageFormSchema),
    defaultValues: {
      name: "",
      stageType: "action",
      isTerminal: false,
    },
  });

  const projectForm = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      projectType: "campaign",
      description: "",
      accentColor: "#6366f1",
    },
  });

  useEffect(() => {
    if (settingsData?.tenant?.settings) {
      settingsForm.reset({
        companyName: settingsData.tenant.settings.companyName || "",
        timezone: settingsData.tenant.settings.timezone || "",
        enabledModules: settingsData.tenant.settings.enabledModules || [],
      });
    }
  }, [settingsData, settingsForm]);

  const availableModulesForTenant = useMemo(() => {
    const allowedModules = settingsData?.tenant?.settings?.allowedModules;
    if (!allowedModules || allowedModules.length === 0) {
      return AVAILABLE_MODULES;
    }
    return AVAILABLE_MODULES.filter(module => allowedModules.includes(module.id));
  }, [settingsData?.tenant?.settings?.allowedModules]);

  const createInviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      return await apiRequest("POST", "/api/org-admin/invites", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/invites'] });
      setIsInviteDialogOpen(false);
      inviteForm.reset();
      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      return await apiRequest("POST", "/api/org-admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/users'] });
      setIsCreateUserDialogOpen(false);
      createUserForm.reset();
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return await apiRequest("DELETE", `/api/org-admin/invites/${inviteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/invites'] });
      toast({
        title: "Success",
        description: "Invitation cancelled",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invitation",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("PATCH", `/api/org-admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/users'] });
      setRoleChangeUser(null);
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/org-admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/stats'] });
      setUserToRemove(null);
      toast({
        title: "Success",
        description: "User removed from organization",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user",
        variant: "destructive",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      return await apiRequest("PATCH", "/api/org-admin/settings", { settings: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/settings'] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const createPipelineMutation = useMutation({
    mutationFn: async (data: PipelineFormData) => {
      return await apiRequest("POST", "/api/org-admin/pipelines", {
        ...data,
        projectId: currentProject?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/pipelines'] });
      setIsPipelineDialogOpen(false);
      setEditingPipeline(null);
      pipelineForm.reset();
      toast({
        title: "Success",
        description: "Pipeline created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create pipeline",
        variant: "destructive",
      });
    },
  });

  const updatePipelineMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PipelineFormData }) => {
      return await apiRequest("PATCH", `/api/org-admin/pipelines/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/pipelines'] });
      if (selectedPipelineId) {
        queryClient.invalidateQueries({ queryKey: ['/api/org-admin/pipelines', selectedPipelineId] });
      }
      setIsPipelineDialogOpen(false);
      setEditingPipeline(null);
      pipelineForm.reset();
      toast({
        title: "Success",
        description: "Pipeline updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update pipeline",
        variant: "destructive",
      });
    },
  });

  const deletePipelineMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/org-admin/pipelines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/pipelines'] });
      setPipelineToDelete(null);
      if (selectedPipelineId === pipelineToDelete?.id) {
        setSelectedPipelineId(null);
      }
      toast({
        title: "Success",
        description: "Pipeline deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete pipeline",
        variant: "destructive",
      });
    },
  });

  const createStageMutation = useMutation({
    mutationFn: async ({ pipelineId, data }: { pipelineId: string; data: StageFormData }) => {
      return await apiRequest("POST", `/api/org-admin/pipelines/${pipelineId}/stages`, data);
    },
    onSuccess: () => {
      if (selectedPipelineId) {
        queryClient.invalidateQueries({ queryKey: ['/api/org-admin/pipelines', selectedPipelineId] });
      }
      setIsStageDialogOpen(false);
      setEditingStage(null);
      stageForm.reset();
      toast({
        title: "Success",
        description: "Stage created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create stage",
        variant: "destructive",
      });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ pipelineId, stageId, data }: { pipelineId: string; stageId: string; data: StageFormData }) => {
      return await apiRequest("PATCH", `/api/org-admin/pipelines/${pipelineId}/stages/${stageId}`, data);
    },
    onSuccess: () => {
      if (selectedPipelineId) {
        queryClient.invalidateQueries({ queryKey: ['/api/org-admin/pipelines', selectedPipelineId] });
      }
      setIsStageDialogOpen(false);
      setEditingStage(null);
      stageForm.reset();
      toast({
        title: "Success",
        description: "Stage updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update stage",
        variant: "destructive",
      });
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: async ({ pipelineId, stageId }: { pipelineId: string; stageId: string }) => {
      return await apiRequest("DELETE", `/api/org-admin/pipelines/${pipelineId}/stages/${stageId}`);
    },
    onSuccess: () => {
      if (selectedPipelineId) {
        queryClient.invalidateQueries({ queryKey: ['/api/org-admin/pipelines', selectedPipelineId] });
      }
      setStageToDelete(null);
      setDeletingStageId(null);
      toast({
        title: "Success",
        description: "Stage deleted successfully",
      });
    },
    onError: (error: any) => {
      setDeletingStageId(null);
      toast({
        title: "Error",
        description: error.message || "Failed to delete stage",
        variant: "destructive",
      });
    },
  });

  const reorderStagesMutation = useMutation({
    mutationFn: async ({ pipelineId, stageIds }: { pipelineId: string; stageIds: string[] }) => {
      return await apiRequest("POST", `/api/org-admin/pipelines/${pipelineId}/stages/reorder`, { stageIds });
    },
    onSuccess: () => {
      if (selectedPipelineId) {
        queryClient.invalidateQueries({ queryKey: ['/api/org-admin/pipelines', selectedPipelineId] });
      }
    },
    onError: (error: any) => {
      if (selectedPipelineId) {
        queryClient.invalidateQueries({ queryKey: ['/api/org-admin/pipelines', selectedPipelineId] });
      }
      toast({
        title: "Error",
        description: error.message || "Failed to reorder stages",
        variant: "destructive",
      });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      return await apiRequest("POST", "/api/org-admin/projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/projects'] });
      setIsProjectDialogOpen(false);
      setEditingProject(null);
      projectForm.reset();
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProjectFormData }) => {
      return await apiRequest("PATCH", `/api/org-admin/projects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/projects'] });
      setIsProjectDialogOpen(false);
      setEditingProject(null);
      projectForm.reset();
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const archiveProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/org-admin/projects/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/projects'] });
      setProjectToArchive(null);
      toast({
        title: "Success",
        description: "Project archived successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive project",
        variant: "destructive",
      });
    },
  });

  const restoreProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/org-admin/projects/${id}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/projects'] });
      toast({
        title: "Success",
        description: "Project restored successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore project",
        variant: "destructive",
      });
    },
  });

  const setDefaultProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/org-admin/projects/${id}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/projects'] });
      toast({
        title: "Success",
        description: "Project set as default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set project as default",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/org-admin/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/projects'] });
      setProjectToDelete(null);
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const handleInviteSubmit = (data: InviteFormData) => {
    createInviteMutation.mutate(data);
  };

  const handleCreateUserSubmit = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleSettingsSubmit = (data: SettingsFormData) => {
    updateSettingsMutation.mutate(data);
  };

  const handleOpenPipelineDialog = (pipeline?: Pipeline) => {
    if (pipeline) {
      setEditingPipeline(pipeline);
      pipelineForm.reset({
        name: pipeline.name,
        slug: pipeline.slug,
        pipelineType: pipeline.pipelineType as "sales" | "qualification" | "support" | "custom",
        description: pipeline.description || "",
        aiPromptTemplate: pipeline.aiPromptTemplate || "",
        voiceAgentId: pipeline.voiceAgentId || "",
        isActive: pipeline.isActive,
      });
    } else {
      setEditingPipeline(null);
      pipelineForm.reset({
        name: "",
        slug: "",
        pipelineType: "sales",
        description: "",
        aiPromptTemplate: "",
        voiceAgentId: "",
        isActive: true,
      });
    }
    setIsPipelineDialogOpen(true);
  };

  const handlePipelineSubmit = (data: PipelineFormData) => {
    if (editingPipeline) {
      updatePipelineMutation.mutate({ id: editingPipeline.id, data });
    } else {
      createPipelineMutation.mutate(data);
    }
  };

  const handleOpenStageDialog = (stage?: PipelineStage) => {
    if (stage) {
      setEditingStage(stage);
      stageForm.reset({
        name: stage.name,
        stageType: stage.stageType as "action" | "decision" | "wait" | "complete",
        isTerminal: stage.isTerminal,
      });
    } else {
      setEditingStage(null);
      stageForm.reset({
        name: "",
        stageType: "action",
        isTerminal: false,
      });
    }
    setIsStageDialogOpen(true);
  };

  const handleStageSubmit = (data: StageFormData) => {
    if (!selectedPipelineId) return;
    
    if (editingStage) {
      updateStageMutation.mutate({ pipelineId: selectedPipelineId, stageId: editingStage.id, data });
    } else {
      createStageMutation.mutate({ pipelineId: selectedPipelineId, data });
    }
  };

  const handleDeleteStage = (stage: PipelineStage) => {
    if (!selectedPipelineId) return;
    setDeletingStageId(stage.id);
    deleteStageMutation.mutate({ pipelineId: selectedPipelineId, stageId: stage.id });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !selectedPipelineId) return;
    
    const stages = selectedPipelineData?.pipeline?.stages || [];
    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    const newOrder = arrayMove(stages, oldIndex, newIndex);
    const stageIds = newOrder.map((s) => s.id);
    
    reorderStagesMutation.mutate({ pipelineId: selectedPipelineId, stageIds });
  };

  const getPipelineTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "sales": return "default";
      case "qualification": return "secondary";
      case "support": return "outline";
      case "custom": return "outline";
      default: return "outline";
    }
  };

  const handleOpenProjectDialog = (project?: TenantProject) => {
    if (project) {
      setEditingProject(project);
      projectForm.reset({
        name: project.name,
        slug: project.slug,
        projectType: project.projectType as "campaign" | "case" | "initiative" | "custom",
        description: project.description || "",
        accentColor: project.accentColor || "#6366f1",
      });
    } else {
      setEditingProject(null);
      projectForm.reset({
        name: "",
        slug: "",
        projectType: "campaign",
        description: "",
        accentColor: "#6366f1",
      });
    }
    setIsProjectDialogOpen(true);
  };

  const handleProjectSubmit = (data: ProjectFormData) => {
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data });
    } else {
      createProjectMutation.mutate(data);
    }
  };

  const getProjectStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "paused": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "archived": return "bg-gray-500/10 text-gray-600 border-gray-500/20";
      default: return "";
    }
  };

  const getProjectTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "campaign": return "default";
      case "case": return "secondary";
      case "initiative": return "outline";
      case "custom": return "outline";
      default: return "outline";
    }
  };

  if (authLoading) return null;

  if (!canAccessAdminFeatures(user)) {
    return null;
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "org_admin":
        return "default";
      case "agent":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getInviteStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "accepted":
        return "default";
      case "expired":
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const pendingInvites = invitesData?.invites?.filter(i => i.status === "pending") || [];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h2 className="text-3xl font-semibold text-foreground" data-testid="text-page-title">
          Organization Admin
        </h2>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">
          {settingsLoading ? (
            <Skeleton className="h-4 w-64 inline-block" />
          ) : (
            <>Manage {settingsData?.tenant?.name || "your organization"}</>
          )}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="team" data-testid="tab-team">
            <Users className="mr-2 h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="stats" data-testid="tab-stats">
            <BarChart3 className="mr-2 h-4 w-4" />
            Stats
          </TabsTrigger>
          <TabsTrigger value="pipelines" data-testid="tab-pipelines">
            <Workflow className="mr-2 h-4 w-4" />
            Pipelines
          </TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-projects">
            <FolderKanban className="mr-2 h-4 w-4" />
            Projects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage users in your organization</CardDescription>
                </div>
                <Button onClick={() => setIsCreateUserDialogOpen(true)} data-testid="button-create-user">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create User
                </Button>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData?.users?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No team members found
                          </TableCell>
                        </TableRow>
                      ) : (
                        usersData?.users?.map((u) => (
                          <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                            <TableCell className="font-medium">
                              {u.firstName || u.lastName
                                ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                                : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                            <TableCell>
                              <Select
                                value={u.roleInTenant}
                                onValueChange={(newRole) => setRoleChangeUser({ user: u, newRole })}
                                disabled={u.id === user?.id}
                              >
                                <SelectTrigger 
                                  className="w-32" 
                                  data-testid={`select-role-${u.id}`}
                                  disabled={u.id === user?.id}
                                >
                                  <SelectValue>
                                    <Badge variant={getRoleBadgeVariant(u.roleInTenant)} className="no-default-hover-elevate no-default-active-elevate">
                                      {u.roleInTenant === "org_admin" ? "Admin" : "Agent"}
                                    </Badge>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="org_admin">Admin</SelectItem>
                                  <SelectItem value="agent">Agent</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>{formatDate(u.joinedAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setUserToRemove(u)}
                                disabled={u.id === user?.id}
                                data-testid={`button-remove-user-${u.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {pendingInvites.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Pending Invitations
                  </CardTitle>
                  <CardDescription>Invitations that haven't been accepted yet</CardDescription>
                </CardHeader>
                <CardContent>
                  {invitesLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingInvites.map((invite) => (
                          <TableRow key={invite.id} data-testid={`row-invite-${invite.id}`}>
                            <TableCell className="font-medium">{invite.email}</TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(invite.role)} className="no-default-hover-elevate no-default-active-elevate">
                                {invite.role === "org_admin" ? "Admin" : "Agent"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getInviteStatusBadgeVariant(invite.status)} className="no-default-hover-elevate no-default-active-elevate">
                                {invite.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(invite.expiresAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => cancelInviteMutation.mutate(invite.id)}
                                disabled={cancelInviteMutation.isPending}
                                data-testid={`button-cancel-invite-${invite.id}`}
                              >
                                {cancelInviteMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>Configure your organization's settings</CardDescription>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Form {...settingsForm}>
                  <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Organization Name</label>
                        <Input 
                          value={settingsData?.tenant?.name || ""} 
                          disabled 
                          className="bg-muted"
                          data-testid="input-org-name"
                        />
                        <p className="text-xs text-muted-foreground">Contact support to change organization name</p>
                      </div>

                      <FormField
                        control={settingsForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name (Branding)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Your Company Name" 
                                {...field} 
                                data-testid="input-company-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={settingsForm.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Timezone</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-timezone">
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIMEZONES.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={settingsForm.control}
                      name="enabledModules"
                      render={() => (
                        <FormItem>
                          <FormLabel>Enabled Modules</FormLabel>
                          <p className="text-xs text-muted-foreground" data-testid="text-module-access-note">
                            Your organization has access to {availableModulesForTenant.length} module{availableModulesForTenant.length === 1 ? '' : 's'}
                            {availableModulesForTenant.length < AVAILABLE_MODULES.length && " (restricted by your plan)"}
                          </p>
                          <div className="grid grid-cols-2 gap-4 pt-2" data-testid="enabled-modules-container">
                            {availableModulesForTenant.map((module) => (
                              <FormField
                                key={module.id}
                                control={settingsForm.control}
                                name="enabledModules"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(module.id)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          if (checked) {
                                            field.onChange([...current, module.id]);
                                          } else {
                                            field.onChange(current.filter((v) => v !== module.id));
                                          }
                                        }}
                                        data-testid={`checkbox-module-${module.id}`}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      {module.label}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={updateSettingsMutation.isPending}
                      data-testid="button-save-settings"
                    >
                      {updateSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Settings
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid gap-4 md:grid-cols-3">
            <Card data-testid="card-stat-users">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-stat-users">
                    {statsData?.userCount ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-stat-clients">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-stat-clients">
                    {statsData?.clientCount ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-stat-calls">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-stat-calls">
                    {statsData?.callCount ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pipelines">
          {selectedPipelineId ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedPipelineId(null)}
                    data-testid="button-back-to-pipelines"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    {selectedPipelineLoading ? (
                      <>
                        <Skeleton className="h-6 w-48 mb-1" />
                        <Skeleton className="h-4 w-64" />
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <CardTitle data-testid="text-pipeline-name">{selectedPipelineData?.pipeline?.name}</CardTitle>
                          <Badge variant={getPipelineTypeBadgeVariant(selectedPipelineData?.pipeline?.pipelineType || "")} className="no-default-hover-elevate no-default-active-elevate">
                            {selectedPipelineData?.pipeline?.pipelineType}
                          </Badge>
                          {!selectedPipelineData?.pipeline?.isActive && (
                            <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">Inactive</Badge>
                          )}
                        </div>
                        <CardDescription data-testid="text-pipeline-description">
                          {selectedPipelineData?.pipeline?.description || "No description"}
                        </CardDescription>
                      </>
                    )}
                  </div>
                </div>
                <Button onClick={() => handleOpenStageDialog()} data-testid="button-add-stage">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Stage
                </Button>
              </CardHeader>
              <CardContent>
                {selectedPipelineLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(selectedPipelineData?.pipeline?.stages?.length || 0) === 0 ? (
                      <div className="text-center py-8 text-muted-foreground" data-testid="text-no-stages">
                        No stages yet. Click "Add Stage" to create your first stage.
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={selectedPipelineData?.pipeline?.stages?.map((s) => s.id) || []}
                          strategy={verticalListSortingStrategy}
                        >
                          {selectedPipelineData?.pipeline?.stages
                            ?.sort((a, b) => a.stageOrder - b.stageOrder)
                            .map((stage) => (
                              <SortableStageItem
                                key={stage.id}
                                stage={stage}
                                onEdit={() => handleOpenStageDialog(stage)}
                                onDelete={() => handleDeleteStage(stage)}
                                isDeleting={deletingStageId === stage.id}
                              />
                            ))}
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                <div>
                  <CardTitle>Pipelines</CardTitle>
                  <CardDescription>Manage workflow pipelines for your organization</CardDescription>
                </div>
                <Button onClick={() => handleOpenPipelineDialog()} data-testid="button-create-pipeline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Pipeline
                </Button>
              </CardHeader>
              <CardContent>
                {pipelinesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(pipelinesData?.pipelines?.length || 0) === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No pipelines found. Create your first pipeline to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pipelinesData?.pipelines?.map((pipeline) => (
                          <TableRow 
                            key={pipeline.id} 
                            data-testid={`row-pipeline-${pipeline.id}`}
                            className="cursor-pointer hover-elevate"
                            onClick={() => setSelectedPipelineId(pipeline.id)}
                          >
                            <TableCell className="font-medium" data-testid={`text-pipeline-name-${pipeline.id}`}>
                              {pipeline.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getPipelineTypeBadgeVariant(pipeline.pipelineType)} className="no-default-hover-elevate no-default-active-elevate">
                                {pipeline.pipelineType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-xs truncate">
                              {pipeline.description || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={pipeline.isActive ? "default" : "outline"} className="no-default-hover-elevate no-default-active-elevate">
                                {pipeline.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPipelineDialog(pipeline);
                                  }}
                                  data-testid={`button-edit-pipeline-${pipeline.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPipelineToDelete(pipeline);
                                  }}
                                  data-testid={`button-delete-pipeline-${pipeline.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
              <div>
                <CardTitle>Projects</CardTitle>
                <CardDescription>Manage projects for your organization</CardDescription>
              </div>
              <Button onClick={() => handleOpenProjectDialog()} data-testid="button-create-project">
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(projectsData?.projects?.length || 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No projects found. Create your first project to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      projectsData?.projects?.map((project) => (
                        <TableRow key={project.id} data-testid={`row-project-${project.id}`}>
                          <TableCell className="font-medium" data-testid={`text-project-name-${project.id}`}>
                            {project.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {project.slug}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getProjectTypeBadgeVariant(project.projectType)} className="no-default-hover-elevate no-default-active-elevate">
                              {project.projectType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`no-default-hover-elevate no-default-active-elevate ${getProjectStatusBadgeClass(project.status)}`}
                            >
                              {project.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {project.isDefault && (
                              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                                Default
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(project.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleOpenProjectDialog(project)}
                                data-testid={`button-edit-project-${project.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {project.status === "archived" ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => restoreProjectMutation.mutate(project.id)}
                                  disabled={restoreProjectMutation.isPending}
                                  data-testid={`button-restore-project-${project.id}`}
                                >
                                  <ArchiveRestore className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setProjectToArchive(project)}
                                  data-testid={`button-archive-project-${project.id}`}
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              )}
                              {!project.isDefault && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setDefaultProjectMutation.mutate(project.id)}
                                  disabled={setDefaultProjectMutation.isPending}
                                  data-testid={`button-set-default-project-${project.id}`}
                                >
                                  <Star className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setProjectToDelete(project)}
                                disabled={project.isDefault}
                                data-testid={`button-delete-project-${project.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>Send an invitation to join your organization</DialogDescription>
          </DialogHeader>
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit(handleInviteSubmit)} className="space-y-4">
              <FormField
                control={inviteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="user@example.com" 
                        {...field} 
                        data-testid="input-invite-email" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={inviteForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-invite-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="org_admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteDialogOpen(false)}
                  data-testid="button-cancel-invite-dialog"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createInviteMutation.isPending} data-testid="button-submit-invite" data-primary="true">
                  {createInviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invitation
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Create a new user in your organization</DialogDescription>
          </DialogHeader>
          <Form {...createUserForm}>
            <form onSubmit={createUserForm.handleSubmit(handleCreateUserSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createUserForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John" 
                          {...field} 
                          data-testid="input-create-firstname" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createUserForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Doe" 
                          {...field} 
                          data-testid="input-create-lastname" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={createUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="user@example.com" 
                        {...field} 
                        data-testid="input-create-email" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createUserForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="Enter password" 
                        {...field} 
                        data-testid="input-create-password" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createUserForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-create-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="org_admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateUserDialogOpen(false)}
                  data-testid="button-cancel-create-dialog"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-submit-create" data-primary="true">
                  {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!roleChangeUser} onOpenChange={(open) => !open && setRoleChangeUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to change {roleChangeUser?.user.firstName || roleChangeUser?.user.email || "this user"}'s role to {roleChangeUser?.newRole === "org_admin" ? "Admin" : "Agent"}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRoleChangeUser(null)}
              data-testid="button-cancel-role-change"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => roleChangeUser && updateRoleMutation.mutate({ userId: roleChangeUser.user.id, role: roleChangeUser.newRole })}
              disabled={updateRoleMutation.isPending}
              data-testid="button-confirm-role-change"
              data-primary="true"
            >
              {updateRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userToRemove} onOpenChange={(open) => !open && setUserToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {userToRemove?.firstName || userToRemove?.email || "this user"} from the organization? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUserToRemove(null)}
              data-testid="button-cancel-remove"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => userToRemove && removeUserMutation.mutate(userToRemove.id)}
              disabled={removeUserMutation.isPending}
              data-testid="button-confirm-remove"
              data-primary="true"
            >
              {removeUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPipelineDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPipelineDialogOpen(false);
          setEditingPipeline(null);
          pipelineForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPipeline ? "Edit Pipeline" : "Create Pipeline"}</DialogTitle>
            <DialogDescription>
              {editingPipeline 
                ? "Update the pipeline details below" 
                : "Configure your new workflow pipeline"}
            </DialogDescription>
          </DialogHeader>
          <Form {...pipelineForm}>
            <form onSubmit={pipelineForm.handleSubmit(handlePipelineSubmit)} className="space-y-4">
              <FormField
                control={pipelineForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Sales Outreach" 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (!editingPipeline) {
                            pipelineForm.setValue("slug", generateSlug(e.target.value));
                          }
                        }}
                        data-testid="input-pipeline-name" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pipelineForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="sales-outreach" 
                        {...field}
                        data-testid="input-pipeline-slug" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pipelineForm.control}
                name="pipelineType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pipeline Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-pipeline-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PIPELINE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pipelineForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what this pipeline is for..." 
                        {...field}
                        data-testid="input-pipeline-description" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-4">AI Configuration</h4>
                
                <FormField
                  control={pipelineForm.control}
                  name="voiceAgentId"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Voice Agent (optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-voice-agent">
                            <SelectValue placeholder="Select a voice agent" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {voiceAgentsData?.agents?.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name} {agent.isDefault && "(Default)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground">
                        ElevenLabs voice agent for AI calls in this pipeline
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={pipelineForm.control}
                  name="aiPromptTemplate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Prompt Template (optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter the AI prompt template for voice calls in this pipeline..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="input-ai-prompt-template" 
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground">
                        System prompt for AI voice calls. Use placeholders like {"{{clientName}}"}, {"{{companyName}}"}.
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={pipelineForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Enable or disable this pipeline
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-pipeline-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsPipelineDialogOpen(false);
                    setEditingPipeline(null);
                    pipelineForm.reset();
                  }}
                  data-testid="button-cancel-pipeline-dialog"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPipelineMutation.isPending || updatePipelineMutation.isPending}
                  data-testid="button-submit-pipeline"
                  data-primary="true"
                >
                  {(createPipelineMutation.isPending || updatePipelineMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingPipeline ? "Save Changes" : "Create Pipeline"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pipelineToDelete} onOpenChange={(open) => !open && setPipelineToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pipeline</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{pipelineToDelete?.name}"? This will also delete all stages in this pipeline. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPipelineToDelete(null)}
              data-testid="button-cancel-delete-pipeline"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => pipelineToDelete && deletePipelineMutation.mutate(pipelineToDelete.id)}
              disabled={deletePipelineMutation.isPending}
              data-testid="button-confirm-delete-pipeline"
              data-primary="true"
            >
              {deletePipelineMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStageDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsStageDialogOpen(false);
          setEditingStage(null);
          stageForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStage ? "Edit Stage" : "Add Stage"}</DialogTitle>
            <DialogDescription>
              {editingStage 
                ? "Update the stage details below" 
                : "Configure a new stage for this pipeline"}
            </DialogDescription>
          </DialogHeader>
          <Form {...stageForm}>
            <form onSubmit={stageForm.handleSubmit(handleStageSubmit)} className="space-y-4">
              <FormField
                control={stageForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Initial Contact" 
                        {...field}
                        data-testid="input-stage-name" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stageForm.control}
                name="stageType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-stage-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STAGE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stageForm.control}
                name="isTerminal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Terminal Stage</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Mark this as the final stage in the pipeline
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-stage-terminal"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsStageDialogOpen(false);
                    setEditingStage(null);
                    stageForm.reset();
                  }}
                  data-testid="button-cancel-stage-dialog"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createStageMutation.isPending || updateStageMutation.isPending}
                  data-testid="button-submit-stage"
                  data-primary="true"
                >
                  {(createStageMutation.isPending || updateStageMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingStage ? "Save Changes" : "Add Stage"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isProjectDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsProjectDialogOpen(false);
          setEditingProject(null);
          projectForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Create Project"}</DialogTitle>
            <DialogDescription>
              {editingProject 
                ? "Update the project details below" 
                : "Configure a new project for your organization"}
            </DialogDescription>
          </DialogHeader>
          <Form {...projectForm}>
            <form onSubmit={projectForm.handleSubmit(handleProjectSubmit)} className="space-y-4">
              <FormField
                control={projectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Q1 Campaign" 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (!editingProject) {
                            const slug = e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/^-+|-+$/g, '');
                            projectForm.setValue('slug', slug);
                          }
                        }}
                        data-testid="input-project-name" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={projectForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="q1-campaign" 
                        {...field}
                        data-testid="input-project-slug" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={projectForm.control}
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={projectForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the project..." 
                        {...field}
                        data-testid="input-project-description" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={projectForm.control}
                name="accentColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Header Color</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2" data-testid="color-picker-project">
                        {PROJECT_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => field.onChange(color.value)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              field.value === color.value 
                                ? 'border-foreground scale-110' 
                                : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={color.label}
                            data-testid={`color-option-${color.value}`}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsProjectDialogOpen(false);
                    setEditingProject(null);
                    projectForm.reset();
                  }}
                  data-testid="button-cancel-project-dialog"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
                  data-testid="button-submit-project"
                  data-primary="true"
                >
                  {(createProjectMutation.isPending || updateProjectMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingProject ? "Save Changes" : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!projectToArchive} onOpenChange={(open) => !open && setProjectToArchive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive "{projectToArchive?.name}"? Archived projects can be restored later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProjectToArchive(null)}
              data-testid="button-cancel-archive-project"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => projectToArchive && archiveProjectMutation.mutate(projectToArchive.id)}
              disabled={archiveProjectMutation.isPending}
              data-testid="button-confirm-archive-project"
              data-primary="true"
            >
              {archiveProjectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Archive Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProjectToDelete(null)}
              data-testid="button-cancel-delete-project"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => projectToDelete && deleteProjectMutation.mutate(projectToDelete.id)}
              disabled={deleteProjectMutation.isPending}
              data-testid="button-confirm-delete-project"
              data-primary="true"
            >
              {deleteProjectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
