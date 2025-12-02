import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { isSuperAdmin } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AVAILABLE_MODULES } from "@/lib/modules";
import { format } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Building2, Users, BarChart3, Plus, Edit, Eye, Loader2, Check, Trash2, UserPlus, 
  Search, ArrowUpDown, ArrowUp, ArrowDown, Mail, Lock, Briefcase, KeyRound, 
  UserX, UserCheck, Phone, Ticket, Webhook, Mic, FileSpreadsheet, Send, XCircle
} from "lucide-react";
import { VoiceSettings } from "@/components/voice-settings";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  userCount?: number;
  settings?: {
    allowedModules?: string[];
    enabledModules?: string[];
    companyName?: string;
    timezone?: string;
  };
}

interface TenantMembership {
  tenantId: string;
  tenantName: string;
  roleInTenant: string;
}

interface UserWithMemberships {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  agentName: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  hasVoiceAccess: boolean;
  tenantMemberships: TenantMembership[];
}

interface Metrics {
  totalTenants: number;
  totalUsers: number;
  totalClients: number;
  activeTenants: number;
}

interface SuperAdminTicket {
  id: string;
  tenantId: string;
  tenantName?: string;
  userId: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  isUnreadByAdmin: boolean;
  isUnreadByUser: boolean;
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
  userName?: string;
}

interface TicketReply {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

interface WebhookStatus {
  userId: string;
  userEmail: string;
  agentName: string | null;
  tenantId: string | null;
  tenantName: string;
  hasGoogleCalendar: boolean;
  channelId: string | null;
  resourceId: string | null;
  expiry: number | null;
  expiryDate: string | null;
  isExpired: boolean | null;
  registeredUrl: string;
  environment: 'production' | 'development';
}

const TICKET_CATEGORIES = [
  'Bug Report',
  'Feature Request',
  'Technical Support',
  'Account Issue',
  'Billing Question',
  'Data Issue',
  'Performance Problem',
  'Integration Help',
  'General Question',
  'Other',
] as const;

interface TenantDetails {
  tenant: Tenant & {
    settings?: {
      allowedModules?: string[];
      enabledModules?: string[];
      companyName?: string;
      timezone?: string;
    };
  };
  stats: {
    userCount: number;
    clientCount: number;
    callCount: number;
  };
}

const tenantFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  status: z.enum(["active", "trial", "suspended"]),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

const addUserToTenantSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  roleInTenant: z.enum(["org_admin", "agent"]),
});

type AddUserToTenantFormData = z.infer<typeof addUserToTenantSchema>;

const createUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  agentName: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  tenantId: z.string().min(1, "Tenant is required"),
  roleInTenant: z.enum(["org_admin", "agent"]),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

const editUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  agentName: z.string().optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

type SortField = "name" | "email" | "tenants" | null;
type SortDirection = "asc" | "desc";

export default function SuperAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("tenants");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewingTenantId, setViewingTenantId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithMemberships | null>(null);
  const [isAddToTenantOpen, setIsAddToTenantOpen] = useState(false);

  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [userStatusFilter, setUserStatusFilter] = useState<"active" | "inactive">("active");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [editingAllowedModules, setEditingAllowedModules] = useState<string[]>([]);

  // Ticket state
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketReplyMessage, setTicketReplyMessage] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState<string>('all');
  const [ticketTenantFilter, setTicketTenantFilter] = useState<string>('all');

  // Tenant context for config tabs (Webhooks, Voice, Sheets)
  const [configTenantId, setConfigTenantId] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && user && !isSuperAdmin(user)) {
      setLocation('/');
    }
  }, [user, authLoading, setLocation]);

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery<{ tenants: Tenant[] }>({
    queryKey: ['/api/super-admin/tenants'],
    enabled: isSuperAdmin(user),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: UserWithMemberships[] }>({
    queryKey: ['/api/super-admin/users'],
    enabled: isSuperAdmin(user),
  });

  const { data: metricsData, isLoading: metricsLoading } = useQuery<Metrics>({
    queryKey: ['/api/super-admin/metrics'],
    enabled: isSuperAdmin(user),
  });

  const { data: tenantDetails, isLoading: detailsLoading } = useQuery<TenantDetails>({
    queryKey: [`/api/super-admin/tenants/${viewingTenantId}`],
    enabled: !!viewingTenantId,
  });

  // Super admin tickets query - fetches all tickets across all tenants
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery<{ tickets: SuperAdminTicket[] }>({
    queryKey: ['/api/super-admin/tickets'],
    enabled: isSuperAdmin(user),
  });

  // Selected ticket details
  const { data: ticketDetailData, isLoading: ticketDetailLoading } = useQuery<{ ticket: SuperAdminTicket; replies: TicketReply[] }>({
    queryKey: ['/api/tickets', selectedTicketId],
    enabled: !!selectedTicketId,
  });

  // Super admin webhooks query - with tenant filtering
  const { data: webhooksData, isLoading: webhooksLoading, refetch: refetchWebhooks } = useQuery<{ webhooks: WebhookStatus[] }>({
    queryKey: ['/api/super-admin/webhooks', configTenantId],
    enabled: isSuperAdmin(user),
  });

  const createForm = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      status: "active",
    },
  });

  const editForm = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      status: "active",
    },
  });

  const addUserToTenantForm = useForm<AddUserToTenantFormData>({
    resolver: zodResolver(addUserToTenantSchema),
    defaultValues: {
      tenantId: "",
      roleInTenant: "agent",
    },
  });

  const createUserForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      agentName: "",
      password: "",
      tenantId: "",
      roleInTenant: "agent",
    },
  });

  const editUserForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      agentName: "",
    },
  });

  useEffect(() => {
    if (editingTenant) {
      editForm.reset({
        name: editingTenant.name,
        slug: editingTenant.slug,
        status: editingTenant.status as "active" | "trial" | "suspended",
      });
      // If allowedModules is empty/undefined, default to all modules (matching actual behavior)
      const currentAllowed = editingTenant.settings?.allowedModules;
      const allModuleIds = AVAILABLE_MODULES.map(m => m.id);
      setEditingAllowedModules(currentAllowed && currentAllowed.length > 0 ? currentAllowed : allModuleIds);
    }
  }, [editingTenant, editForm]);

  useEffect(() => {
    if (isAddToTenantOpen) {
      addUserToTenantForm.reset({
        tenantId: "",
        roleInTenant: "agent",
      });
    }
  }, [isAddToTenantOpen, addUserToTenantForm]);

  useEffect(() => {
    if (selectedUser && usersData?.users) {
      const freshUser = usersData.users.find(u => u.id === selectedUser.id);
      if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(selectedUser)) {
        setSelectedUser(freshUser);
      }
    }
  }, [usersData, selectedUser]);

  useEffect(() => {
    if (selectedUser && isEditingUser) {
      editUserForm.reset({
        email: selectedUser.email || "",
        firstName: selectedUser.firstName || "",
        lastName: selectedUser.lastName || "",
        agentName: selectedUser.agentName || "",
      });
    }
  }, [selectedUser, isEditingUser, editUserForm]);

  useEffect(() => {
    if (isCreateUserDialogOpen) {
      createUserForm.reset({
        email: "",
        firstName: "",
        lastName: "",
        agentName: "",
        password: "",
        tenantId: "",
        roleInTenant: "agent",
      });
    }
  }, [isCreateUserDialogOpen, createUserForm]);

  const filteredAndSortedUsers = useMemo(() => {
    if (!usersData?.users) return [];

    let filtered = usersData.users.filter(u => {
      const isActiveMatch = userStatusFilter === "active" ? u.isActive !== false : u.isActive === false;
      if (!isActiveMatch) return false;

      if (tenantFilter !== "all") {
        const hasTenant = u.tenantMemberships?.some(m => m.tenantId === tenantFilter);
        if (!hasTenant) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
        const email = (u.email || "").toLowerCase();
        const agentName = (u.agentName || "").toLowerCase();
        if (!fullName.includes(query) && !email.includes(query) && !agentName.includes(query)) {
          return false;
        }
      }

      return true;
    });

    if (sortField) {
      filtered.sort((a, b) => {
        let aVal = "";
        let bVal = "";

        switch (sortField) {
          case "name":
            aVal = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
            bVal = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
            break;
          case "email":
            aVal = (a.email || "").toLowerCase();
            bVal = (b.email || "").toLowerCase();
            break;
          case "tenants":
            aVal = String(a.tenantMemberships?.length || 0);
            bVal = String(b.tenantMemberships?.length || 0);
            break;
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [usersData?.users, userStatusFilter, tenantFilter, searchQuery, sortField, sortDirection]);

  const activeUsersCount = useMemo(() => {
    return usersData?.users?.filter(u => u.isActive !== false).length ?? 0;
  }, [usersData?.users]);

  const inactiveUsersCount = useMemo(() => {
    return usersData?.users?.filter(u => u.isActive === false).length ?? 0;
  }, [usersData?.users]);

  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      return await apiRequest("POST", "/api/super-admin/tenants", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/metrics'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Tenant created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant",
        variant: "destructive",
      });
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TenantFormData & { settings?: { allowedModules?: string[] } } }) => {
      return await apiRequest("PATCH", `/api/super-admin/tenants/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/metrics'] });
      setEditingTenant(null);
      editForm.reset();
      setEditingAllowedModules([]);
      toast({
        title: "Success",
        description: "Tenant updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tenant",
        variant: "destructive",
      });
    },
  });

  const addUserToTenantMutation = useMutation({
    mutationFn: async ({ userId, tenantId, roleInTenant }: { userId: string; tenantId: string; roleInTenant: string }) => {
      return await apiRequest("POST", `/api/super-admin/users/${userId}/tenants`, { tenantId, roleInTenant });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants'] });
      setIsAddToTenantOpen(false);
      addUserToTenantForm.reset();
      if (selectedUser) {
        const tenant = tenantsData?.tenants?.find(t => t.id === variables.tenantId);
        if (tenant) {
          setSelectedUser({
            ...selectedUser,
            tenantMemberships: [
              ...selectedUser.tenantMemberships,
              { tenantId: variables.tenantId, tenantName: tenant.name, roleInTenant: variables.roleInTenant }
            ]
          });
        }
      }
      toast({
        title: "Success",
        description: "User added to tenant successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add user to tenant",
        variant: "destructive",
      });
    },
  });

  const removeUserFromTenantMutation = useMutation({
    mutationFn: async ({ userId, tenantId }: { userId: string; tenantId: string }) => {
      return await apiRequest("DELETE", `/api/super-admin/users/${userId}/tenants/${tenantId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants'] });
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          tenantMemberships: selectedUser.tenantMemberships.filter(m => m.tenantId !== variables.tenantId)
        });
      }
      toast({
        title: "Success",
        description: "User removed from tenant",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user from tenant",
        variant: "destructive",
      });
    },
  });

  const updateUserRoleInTenantMutation = useMutation({
    mutationFn: async ({ userId, tenantId, roleInTenant }: { userId: string; tenantId: string; roleInTenant: string }) => {
      return await apiRequest("PATCH", `/api/super-admin/users/${userId}/tenants/${tenantId}`, { roleInTenant });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants'] });
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          tenantMemberships: selectedUser.tenantMemberships.map(m => 
            m.tenantId === variables.tenantId 
              ? { ...m, roleInTenant: variables.roleInTenant }
              : m
          )
        });
      }
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

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      return await apiRequest("POST", "/api/super-admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/metrics'] });
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

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: EditUserFormData }) => {
      return await apiRequest("PATCH", `/api/super-admin/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      setIsEditingUser(false);
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      return await apiRequest("PATCH", `/api/super-admin/users/${userId}/reset-password`, { newPassword });
    },
    onSuccess: () => {
      setIsResettingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/super-admin/users/${userId}/deactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/metrics'] });
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, isActive: false });
      }
      toast({
        title: "Success",
        description: "User deactivated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate user",
        variant: "destructive",
      });
    },
  });

  const reactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/super-admin/users/${userId}/reactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/metrics'] });
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, isActive: true });
      }
      toast({
        title: "Success",
        description: "User reactivated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate user",
        variant: "destructive",
      });
    },
  });

  const toggleVoiceAccessMutation = useMutation({
    mutationFn: async ({ userId, hasVoiceAccess }: { userId: string; hasVoiceAccess: boolean }) => {
      return await apiRequest("PATCH", `/api/super-admin/users/${userId}/voice-access`, { hasVoiceAccess });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, hasVoiceAccess: variables.hasVoiceAccess });
      }
      toast({
        title: "Success",
        description: "Voice access updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update voice access",
        variant: "destructive",
      });
    },
  });

  // Ticket mutations
  const markTicketReadMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      return await apiRequest('POST', `/api/tickets/${ticketId}/mark-read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tickets'] });
      if (selectedTicketId) {
        queryClient.invalidateQueries({ queryKey: ['/api/tickets', selectedTicketId] });
      }
    },
  });

  const updateTicketStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      return await apiRequest('PATCH', `/api/tickets/${ticketId}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Ticket status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tickets'] });
      if (selectedTicketId) {
        queryClient.invalidateQueries({ queryKey: ['/api/tickets', selectedTicketId] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const replyToTicketMutation = useMutation({
    mutationFn: async (data: { ticketId: string; message: string }) => {
      return await apiRequest('POST', `/api/tickets/${data.ticketId}/reply`, { message: data.message });
    },
    onSuccess: () => {
      toast({
        title: "Reply Sent",
        description: "Your reply has been sent and user notified.",
      });
      setTicketReplyMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tickets'] });
      if (selectedTicketId) {
        queryClient.invalidateQueries({ queryKey: ['/api/tickets', selectedTicketId] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    },
  });

  // Webhook mutations
  const bulkRegisterWebhooksMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return await apiRequest('POST', '/api/super-admin/webhooks/bulk-register', { tenantId });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/webhooks'] });
      toast({
        title: "Bulk Registration Complete",
        description: `Successfully registered ${data.successful} webhooks. Failed: ${data.failed}, Skipped: ${data.skipped}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Registration Failed",
        description: error.message || "Failed to register webhooks",
        variant: "destructive",
      });
    },
  });

  const registerSingleWebhookMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('POST', `/api/super-admin/webhooks/${userId}/register`, {});
    },
    onSuccess: (data: any, userId: string) => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/webhooks'] });
      const webhook = webhooksData?.webhooks.find(w => w.userId === userId);
      toast({
        title: "Webhook Registered",
        description: `Successfully registered webhook for ${webhook?.userEmail}`,
      });
    },
    onError: (error: any, userId: string) => {
      const webhook = webhooksData?.webhooks.find(w => w.userId === userId);
      toast({
        title: "Registration Failed",
        description: `Failed to register webhook for ${webhook?.userEmail}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmit = (data: TenantFormData) => {
    createTenantMutation.mutate(data);
  };

  const handleEditSubmit = (data: TenantFormData) => {
    if (editingTenant) {
      updateTenantMutation.mutate({ 
        id: editingTenant.id, 
        data: {
          ...data,
          settings: {
            ...editingTenant.settings,
            allowedModules: editingAllowedModules,
          }
        }
      });
    }
  };

  const handleAddUserToTenantSubmit = (data: AddUserToTenantFormData) => {
    if (selectedUser) {
      addUserToTenantMutation.mutate({
        userId: selectedUser.id,
        tenantId: data.tenantId,
        roleInTenant: data.roleInTenant,
      });
    }
  };

  const handleRemoveUserFromTenant = (userId: string, tenantId: string) => {
    removeUserFromTenantMutation.mutate({ userId, tenantId });
  };

  const handleCreateUserSubmit = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleEditUserSubmit = (data: EditUserFormData) => {
    if (selectedUser) {
      updateUserMutation.mutate({ userId: selectedUser.id, data });
    }
  };

  const handleResetPasswordSubmit = () => {
    if (!selectedUser) return;

    if (!newPassword) {
      toast({
        title: "Validation Error",
        description: "Password is required",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate({ userId: selectedUser.id, newPassword });
  };

  const handleDeactivateUser = () => {
    if (selectedUser) {
      deactivateUserMutation.mutate(selectedUser.id);
    }
  };

  const handleReactivateUser = () => {
    if (selectedUser) {
      reactivateUserMutation.mutate(selectedUser.id);
    }
  };

  const getAvailableTenants = () => {
    if (!selectedUser || !tenantsData?.tenants) return [];
    const memberTenantIds = new Set(selectedUser.tenantMemberships.map(m => m.tenantId));
    return tenantsData.tenants.filter(t => !memberTenantIds.has(t.id));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const handleCloseUserDialog = () => {
    setSelectedUser(null);
    setIsAddToTenantOpen(false);
    setIsEditingUser(false);
    setIsResettingPassword(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  // Ticket helper functions
  const handleTicketReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketReplyMessage.trim() || !selectedTicketId) return;
    replyToTicketMutation.mutate({ ticketId: selectedTicketId, message: ticketReplyMessage });
  };

  const handleTicketStatusChange = (status: string) => {
    if (!selectedTicketId) return;
    updateTicketStatusMutation.mutate({ ticketId: selectedTicketId, status });
  };

  const handleTicketSelect = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    const ticket = ticketsData?.tickets?.find(t => t.id === ticketId);
    if (ticket?.isUnreadByAdmin) {
      markTicketReadMutation.mutate(ticketId);
    }
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    if (!ticketsData?.tickets) return [];
    return ticketsData.tickets.filter(t => {
      const statusMatch = ticketStatusFilter === 'all' || t.status === ticketStatusFilter;
      const categoryMatch = ticketCategoryFilter === 'all' || t.category === ticketCategoryFilter;
      const tenantMatch = ticketTenantFilter === 'all' || t.tenantId === ticketTenantFilter;
      return statusMatch && categoryMatch && tenantMatch;
    });
  }, [ticketsData?.tickets, ticketStatusFilter, ticketCategoryFilter, ticketTenantFilter]);

  const ticketDetail = ticketDetailData?.ticket;
  const ticketReplies = ticketDetailData?.replies || [];
  const unreadTicketCount = ticketsData?.tickets?.filter(t => t.isUnreadByAdmin).length ?? 0;

  // Webhook helper data
  const webhooks = useMemo(() => {
    if (!webhooksData?.webhooks) return [];
    // Filter by tenant if one is selected
    if (configTenantId && configTenantId !== 'all') {
      return webhooksData.webhooks.filter(w => w.tenantId === configTenantId);
    }
    return webhooksData.webhooks;
  }, [webhooksData?.webhooks, configTenantId]);

  const connectedWebhooks = webhooks.filter(w => w.hasGoogleCalendar);
  const activeWebhooks = connectedWebhooks.filter(w => w.channelId && !w.isExpired);
  const expiredWebhooks = connectedWebhooks.filter(w => w.channelId && w.isExpired);

  const getWebhookStatusBadge = (webhook: WebhookStatus) => {
    if (!webhook.hasGoogleCalendar) {
      return <Badge variant="outline">No Calendar</Badge>;
    }
    if (!webhook.channelId) {
      return <Badge variant="secondary">Not Registered</Badge>;
    }
    if (webhook.isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
  };

  const formatWebhookExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return 'N/A';
    const date = new Date(expiryDate);
    const now = new Date();
    const hoursUntil = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntil < 0) {
      return `Expired ${Math.abs(hoursUntil).toFixed(0)}h ago`;
    }
    if (hoursUntil < 24) {
      return `${hoursUntil.toFixed(0)}h remaining`;
    }
    return `${(hoursUntil / 24).toFixed(1)} days`;
  };

  if (authLoading) return null;

  if (!isSuperAdmin(user)) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "trial":
        return "secondary";
      case "suspended":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h2 className="text-3xl font-semibold text-foreground" data-testid="text-page-title">
          Super Admin Dashboard
        </h2>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">
          {metricsLoading ? (
            <Skeleton className="h-4 w-64 inline-block" />
          ) : (
            <>
              {metricsData?.totalTenants ?? 0} tenants, {metricsData?.totalUsers ?? 0} users, {metricsData?.totalClients ?? 0} clients
            </>
          )}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="tenants" data-testid="tab-tenants">
            <Building2 className="mr-2 h-4 w-4" />
            Tenants
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="mr-2 h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="metrics" data-testid="tab-metrics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="tickets" data-testid="tab-tickets">
            <Ticket className="mr-2 h-4 w-4" />
            Tickets
            {unreadTicketCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{unreadTicketCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="webhooks" data-testid="tab-webhooks">
            <Webhook className="mr-2 h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="voice" data-testid="tab-voice">
            <Mic className="mr-2 h-4 w-4" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="sheets" data-testid="tab-sheets">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Google Sheets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenants">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
              <div>
                <CardTitle>Tenants</CardTitle>
                <CardDescription>Manage all tenants on the platform</CardDescription>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-tenant">
                <Plus className="mr-2 h-4 w-4" />
                Create Tenant
              </Button>
            </CardHeader>
            <CardContent>
              {tenantsLoading ? (
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
                      <TableHead>Status</TableHead>
                      <TableHead>User Count</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenantsData?.tenants?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No tenants found
                        </TableCell>
                      </TableRow>
                    ) : (
                      tenantsData?.tenants?.map((tenant) => (
                        <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                          <TableCell className="font-medium">{tenant.name}</TableCell>
                          <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(tenant.status)}>
                              {tenant.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{tenant.userCount ?? 0}</TableCell>
                          <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingTenant(tenant)}
                                data-testid={`button-edit-tenant-${tenant.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingTenantId(tenant.id)}
                                data-testid={`button-view-tenant-${tenant.id}`}
                              >
                                <Eye className="h-4 w-4" />
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

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>View and manage users across all tenants</CardDescription>
              </div>
              <Button onClick={() => setIsCreateUserDialogOpen(true)} data-testid="button-create-user">
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or agent name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-user-search"
                    />
                  </div>
                </div>
                <Select value={tenantFilter} onValueChange={setTenantFilter}>
                  <SelectTrigger className="w-[200px]" data-testid="select-tenant-filter">
                    <SelectValue placeholder="Filter by tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tenants</SelectItem>
                    {tenantsData?.tenants?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs value={userStatusFilter} onValueChange={(v) => setUserStatusFilter(v as "active" | "inactive")} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="active" data-testid="tab-active-users">
                    Active Users ({activeUsersCount})
                  </TabsTrigger>
                  <TabsTrigger value="inactive" data-testid="tab-inactive-users">
                    Inactive Users ({inactiveUsersCount})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-0">
                  {usersLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead 
                              className="cursor-pointer select-none"
                              onClick={() => handleSort("name")}
                            >
                              <div className="flex items-center" data-testid="sort-name">
                                Name {getSortIcon("name")}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer select-none"
                              onClick={() => handleSort("email")}
                            >
                              <div className="flex items-center" data-testid="sort-email">
                                Email {getSortIcon("email")}
                              </div>
                            </TableHead>
                            <TableHead>Agent Name</TableHead>
                            <TableHead>Super Admin</TableHead>
                            <TableHead>Voice Access</TableHead>
                            <TableHead 
                              className="cursor-pointer select-none"
                              onClick={() => handleSort("tenants")}
                            >
                              <div className="flex items-center" data-testid="sort-tenants">
                                Tenant Memberships {getSortIcon("tenants")}
                              </div>
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAndSortedUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                No active users found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredAndSortedUsers.map((u) => (
                              <TableRow 
                                key={u.id} 
                                data-testid={`row-user-${u.id}`}
                                className="cursor-pointer hover-elevate"
                                onClick={() => setSelectedUser(u)}
                              >
                                <TableCell className="font-medium">
                                  {u.firstName || u.lastName
                                    ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                                    : "—"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{u.agentName ?? "—"}</TableCell>
                                <TableCell>
                                  {u.isSuperAdmin ? (
                                    <Badge variant="default">
                                      <Check className="mr-1 h-3 w-3" />
                                      Yes
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">No</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {u.hasVoiceAccess ? (
                                    <Badge variant="secondary">
                                      <Phone className="mr-1 h-3 w-3" />
                                      Yes
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">No</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {u.tenantMemberships?.length > 0 ? (
                                      u.tenantMemberships.map((m) => (
                                        <Badge key={m.tenantId} variant="outline">
                                          {m.tenantName} ({m.roleInTenant})
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-muted-foreground">None</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedUser(u);
                                    }}
                                    data-testid={`button-manage-user-${u.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="inactive" className="mt-0">
                  {usersLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead 
                              className="cursor-pointer select-none"
                              onClick={() => handleSort("name")}
                            >
                              <div className="flex items-center" data-testid="sort-name-inactive">
                                Name {getSortIcon("name")}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer select-none"
                              onClick={() => handleSort("email")}
                            >
                              <div className="flex items-center" data-testid="sort-email-inactive">
                                Email {getSortIcon("email")}
                              </div>
                            </TableHead>
                            <TableHead>Agent Name</TableHead>
                            <TableHead>Super Admin</TableHead>
                            <TableHead>Voice Access</TableHead>
                            <TableHead 
                              className="cursor-pointer select-none"
                              onClick={() => handleSort("tenants")}
                            >
                              <div className="flex items-center" data-testid="sort-tenants-inactive">
                                Tenant Memberships {getSortIcon("tenants")}
                              </div>
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAndSortedUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                No inactive users found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredAndSortedUsers.map((u) => (
                              <TableRow 
                                key={u.id} 
                                data-testid={`row-user-${u.id}`}
                                className="cursor-pointer hover-elevate"
                                onClick={() => setSelectedUser(u)}
                              >
                                <TableCell className="font-medium">
                                  {u.firstName || u.lastName
                                    ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                                    : "—"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{u.agentName ?? "—"}</TableCell>
                                <TableCell>
                                  {u.isSuperAdmin ? (
                                    <Badge variant="default">
                                      <Check className="mr-1 h-3 w-3" />
                                      Yes
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">No</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {u.hasVoiceAccess ? (
                                    <Badge variant="secondary">
                                      <Phone className="mr-1 h-3 w-3" />
                                      Yes
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">No</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {u.tenantMemberships?.length > 0 ? (
                                      u.tenantMemberships.map((m) => (
                                        <Badge key={m.tenantId} variant="outline">
                                          {m.tenantName} ({m.roleInTenant})
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-muted-foreground">None</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedUser(u);
                                    }}
                                    data-testid={`button-manage-user-${u.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-metric-tenants">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{metricsData?.totalTenants ?? 0}</div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-metric-users">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{metricsData?.totalUsers ?? 0}</div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-metric-clients">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{metricsData?.totalClients ?? 0}</div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-metric-active">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
                <Check className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{metricsData?.activeTenants ?? 0}</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Platform Support Tickets - All tenants */}
        <TabsContent value="tickets">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Tickets List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Platform Support</CardTitle>
                <CardDescription>
                  {unreadTicketCount > 0 && (
                    <span className="text-destructive font-medium">
                      {unreadTicketCount} unread ticket{unreadTicketCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {unreadTicketCount === 0 && <span>All tickets read</span>}
                </CardDescription>
                <div className="pt-2 space-y-2">
                  <Select value={ticketTenantFilter} onValueChange={setTicketTenantFilter}>
                    <SelectTrigger data-testid="select-ticket-tenant-filter">
                      <SelectValue placeholder="Filter by tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tenants</SelectItem>
                      {tenantsData?.tenants?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={ticketStatusFilter} onValueChange={setTicketStatusFilter}>
                    <SelectTrigger data-testid="select-ticket-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={ticketCategoryFilter} onValueChange={setTicketCategoryFilter}>
                    <SelectTrigger data-testid="select-ticket-category-filter">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {TICKET_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {ticketsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredTickets.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No tickets found
                      </div>
                    ) : (
                      filteredTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className={`p-3 border rounded-md hover-elevate active-elevate-2 cursor-pointer ${
                            selectedTicketId === ticket.id ? 'bg-accent' : ''
                          }`}
                          onClick={() => handleTicketSelect(ticket.id)}
                          data-testid={`ticket-${ticket.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium text-sm truncate">{ticket.subject}</h4>
                                {ticket.isUnreadByAdmin && (
                                  <Badge variant="destructive" className="text-xs">New</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {ticket.tenantName || 'Unknown Tenant'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {ticket.category}
                                </Badge>
                                <Badge variant={ticket.status === 'closed' ? 'secondary' : 'default'} className="text-xs">
                                  {ticket.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                From: {ticket.userName || ticket.userEmail}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(ticket.createdAt), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Ticket Detail */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {ticketDetail ? ticketDetail.subject : 'Select a ticket'}
                </CardTitle>
                {ticketDetail && (
                  <CardDescription>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {ticketDetail.tenantName || 'Unknown Tenant'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {ticketDetail.category}
                          </Badge>
                        </div>
                        <p>From: {ticketDetail.userName || ticketDetail.userEmail}</p>
                        <p className="text-xs">
                          Created: {format(new Date(ticketDetail.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={ticketDetail.status}
                          onValueChange={handleTicketStatusChange}
                          disabled={updateTicketStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-32" data-testid="select-ticket-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {!ticketDetail ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Select a ticket from the list to view details and reply
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ScrollArea className="h-[400px] border rounded-md p-4">
                      <div className="space-y-4">
                        <div className="bg-muted p-4 rounded-md">
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-xs text-muted-foreground">
                              {ticketDetail.userName || ticketDetail.userEmail}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(ticketDetail.createdAt), 'MMM d, h:mm a')}
                            </p>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{ticketDetail.message}</p>
                        </div>

                        {ticketReplies.map((reply) => (
                          <div
                            key={reply.id}
                            className={`p-4 rounded-md ${
                              reply.userName === ticketDetail.userName || reply.userEmail === ticketDetail.userEmail
                                ? 'bg-muted ml-4'
                                : 'bg-primary/10 mr-4'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-xs text-muted-foreground font-medium">
                                {reply.userName || reply.userEmail || 'Platform Support'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(reply.createdAt), 'MMM d, h:mm a')}
                              </p>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                          </div>
                        ))}

                        {ticketDetailLoading && (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    {ticketDetail.status !== 'closed' && (
                      <form onSubmit={handleTicketReply} className="space-y-2">
                        <Textarea
                          value={ticketReplyMessage}
                          onChange={(e) => setTicketReplyMessage(e.target.value)}
                          placeholder="Type your reply as Platform Support..."
                          rows={4}
                          data-testid="input-ticket-reply"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleTicketStatusChange('closed')}
                            disabled={updateTicketStatusMutation.isPending}
                            data-testid="button-close-ticket"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Close Ticket
                          </Button>
                          <Button type="submit" disabled={replyToTicketMutation.isPending} data-testid="button-send-reply">
                            {replyToTicketMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Send Reply
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    )}
                    
                    {ticketDetail.status === 'closed' && (
                      <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground py-4">
                        <Check className="h-4 w-4" />
                        This ticket is closed
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Webhooks - Per tenant config */}
        <TabsContent value="webhooks">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Google Calendar Webhook Management</CardTitle>
                    <CardDescription>
                      Manage webhook registrations for Google Calendar synchronization
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={configTenantId} onValueChange={setConfigTenantId}>
                      <SelectTrigger className="w-[200px]" data-testid="select-webhook-tenant">
                        <SelectValue placeholder="Filter by tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tenants</SelectItem>
                        {tenantsData?.tenants?.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => bulkRegisterWebhooksMutation.mutate(configTenantId)}
                      disabled={bulkRegisterWebhooksMutation.isPending}
                      data-testid="button-bulk-register"
                    >
                      {bulkRegisterWebhooksMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        <>
                          <Webhook className="mr-2 h-4 w-4" />
                          Bulk Re-register
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Webhook Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Users</CardDescription>
                      <CardTitle className="text-2xl">{webhooks.length}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Connected Calendars</CardDescription>
                      <CardTitle className="text-2xl">{connectedWebhooks.length}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Active Webhooks</CardDescription>
                      <CardTitle className="text-2xl text-green-600">{activeWebhooks.length}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Expired/Missing</CardDescription>
                      <CardTitle className="text-2xl text-destructive">
                        {connectedWebhooks.length - activeWebhooks.length}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Environment Info */}
                <div className="mb-4 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Current Environment: {webhooks[0]?.environment || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Webhook URL: <code className="text-xs bg-background px-1 py-0.5 rounded">{webhooks[0]?.registeredUrl || 'Not configured'}</code>
                  </p>
                </div>

                {/* Webhook Table */}
                {webhooksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Agent Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Channel ID</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {webhooks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        webhooks.map((webhook) => (
                          <TableRow key={webhook.userId} data-testid={`webhook-row-${webhook.userId}`}>
                            <TableCell className="font-medium">{webhook.userEmail}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{webhook.tenantName}</Badge>
                            </TableCell>
                            <TableCell>{webhook.agentName || 'N/A'}</TableCell>
                            <TableCell>{getWebhookStatusBadge(webhook)}</TableCell>
                            <TableCell>
                              {webhook.channelId ? (
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {webhook.channelId.slice(0, 16)}...
                                </code>
                              ) : (
                                <span className="text-muted-foreground text-sm">Not registered</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={webhook.isExpired ? 'text-destructive' : ''}>
                                {formatWebhookExpiry(webhook.expiryDate)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => registerSingleWebhookMutation.mutate(webhook.userId)}
                                disabled={!webhook.hasGoogleCalendar || registerSingleWebhookMutation.isPending}
                                data-testid={`button-register-${webhook.userId}`}
                              >
                                {registerSingleWebhookMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Re-register'
                                )}
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

            {/* Help Card */}
            <Card>
              <CardHeader>
                <CardTitle>About Webhook Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong>What are webhooks?</strong> Webhooks allow Google Calendar to notify your application when events are created, updated, or deleted, enabling real-time two-way synchronization with reminders.
                </p>
                <p>
                  <strong>When to use bulk re-register:</strong> Use this when deploying from development (.replit.dev) to production (.replit.app). Webhooks are tied to specific URLs, so they must be re-registered after deployment.
                </p>
                <p>
                  <strong>Webhook expiry:</strong> Google Calendar webhooks expire after approximately 7 days. The system automatically renews them, but you can manually re-register if needed.
                </p>
                <p>
                  <strong>Troubleshooting:</strong> If calendar sync is not working for a user, check their webhook status here. Re-register if it shows as "Expired" or "Not Registered".
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Voice Settings - Per tenant config */}
        <TabsContent value="voice">
          <Card>
            <CardHeader>
              <CardTitle>Voice Settings</CardTitle>
              <CardDescription>
                ElevenLabs voice agent configuration - Per tenant settings
              </CardDescription>
              <div className="pt-2">
                <Select value={configTenantId} onValueChange={setConfigTenantId}>
                  <SelectTrigger className="w-[300px]" data-testid="select-voice-tenant">
                    <SelectValue placeholder="Select tenant to configure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tenants (Overview)</SelectItem>
                    {tenantsData?.tenants?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {configTenantId === 'all' ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mic className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Voice Configuration</p>
                  <p className="text-sm">
                    Select a tenant to manage their voice settings
                  </p>
                </div>
              ) : (
                <VoiceSettings tenantId={configTenantId} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Sheets - Per tenant config */}
        <TabsContent value="sheets">
          <Card>
            <CardHeader>
              <CardTitle>Google Sheets Integration</CardTitle>
              <CardDescription>
                Manage Google Sheets connections - Per tenant settings
              </CardDescription>
              <div className="pt-2">
                <Select value={configTenantId} onValueChange={setConfigTenantId}>
                  <SelectTrigger className="w-[300px]" data-testid="select-sheets-tenant">
                    <SelectValue placeholder="Select tenant to configure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tenants (Overview)</SelectItem>
                    {tenantsData?.tenants?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileSpreadsheet className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Google Sheets Configuration</p>
                <p className="text-sm">
                  {configTenantId === 'all' 
                    ? 'Select a tenant to manage their Google Sheets connections'
                    : `Google Sheets settings for ${tenantsData?.tenants?.find(t => t.id === configTenantId)?.name}`
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Coming soon: Per-tenant Google Sheets sync configuration
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tenant</DialogTitle>
            <DialogDescription>Add a new tenant to the platform</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Tenant name" {...field} data-testid="input-tenant-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="tenant-slug" {...field} data-testid="input-tenant-slug" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tenant-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
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
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTenantMutation.isPending} data-testid="button-submit-create" data-primary="true">
                  {createTenantMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>Update tenant information</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Tenant name" {...field} data-testid="input-edit-tenant-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="tenant-slug" {...field} data-testid="input-edit-tenant-slug" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-tenant-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Separator className="my-4" />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Allowed Modules</Label>
                <p className="text-xs text-muted-foreground">
                  Select which modules this tenant can enable. The tenant's org admin will only see these options.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2" data-testid="allowed-modules-container">
                  {AVAILABLE_MODULES.map((module) => (
                    <div key={module.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`allowed-module-${module.id}`}
                        checked={editingAllowedModules.includes(module.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditingAllowedModules([...editingAllowedModules, module.id]);
                          } else {
                            setEditingAllowedModules(editingAllowedModules.filter(id => id !== module.id));
                          }
                        }}
                        data-testid={`checkbox-allowed-module-${module.id}`}
                      />
                      <Label 
                        htmlFor={`allowed-module-${module.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {module.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {editingAllowedModules.length === AVAILABLE_MODULES.length 
                    ? "All modules enabled" 
                    : editingAllowedModules.length === 0
                      ? "No modules allowed - tenant cannot access any features"
                      : `${editingAllowedModules.length} of ${AVAILABLE_MODULES.length} modules allowed`}
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTenant(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTenantMutation.isPending} data-testid="button-submit-edit" data-primary="true">
                  {updateTenantMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingTenantId} onOpenChange={(open) => !open && setViewingTenantId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
            <DialogDescription>
              {tenantDetails?.tenant?.name ?? "Loading..."}
            </DialogDescription>
          </DialogHeader>
          {detailsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : tenantDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Slug</p>
                  <p className="font-medium">{tenantDetails.tenant.slug}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadgeVariant(tenantDetails.tenant.status)}>
                    {tenantDetails.tenant.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Users</p>
                  <p className="font-medium">{tenantDetails.stats.userCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clients</p>
                  <p className="font-medium">{tenantDetails.stats.clientCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Calls</p>
                  <p className="font-medium">{tenantDetails.stats.callCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(tenantDetails.tenant.createdAt)}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Allowed Modules</p>
                <div className="flex flex-wrap gap-1.5" data-testid="details-allowed-modules">
                  {tenantDetails.tenant.settings?.allowedModules && tenantDetails.tenant.settings.allowedModules.length > 0 ? (
                    tenantDetails.tenant.settings.allowedModules.map((moduleId) => {
                      const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
                      return module ? (
                        <Badge key={moduleId} variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                          {module.label}
                        </Badge>
                      ) : null;
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground italic">All modules available (no restrictions)</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingTenantId(null)} data-testid="button-close-details">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user to the platform</DialogDescription>
          </DialogHeader>
          <Form {...createUserForm}>
            <form onSubmit={createUserForm.handleSubmit(handleCreateUserSubmit)} className="space-y-4">
              <FormField
                control={createUserForm.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-create-user-tenant">
                          <SelectValue placeholder="Select tenant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tenantsData?.tenants?.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="user@example.com" 
                          className="pl-10"
                          {...field} 
                          data-testid="input-create-user-email" 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createUserForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} data-testid="input-create-user-firstname" />
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
                        <Input placeholder="Doe" {...field} data-testid="input-create-user-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createUserForm.control}
                name="agentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Agent display name" 
                          className="pl-10"
                          {...field} 
                          data-testid="input-create-user-agentname" 
                        />
                      </div>
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
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="password"
                          placeholder="Minimum 6 characters" 
                          className="pl-10"
                          {...field} 
                          data-testid="input-create-user-password" 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createUserForm.control}
                name="roleInTenant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role in Tenant</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-create-user-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="org_admin">Admin</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
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
                  data-testid="button-cancel-create-user"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-submit-create-user" data-primary="true">
                  {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && handleCloseUserDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage User</DialogTitle>
            <DialogDescription>
              {selectedUser?.firstName || selectedUser?.lastName
                ? `${selectedUser?.firstName ?? ""} ${selectedUser?.lastName ?? ""}`.trim()
                : selectedUser?.email ?? "User"}
              {selectedUser?.isActive === false && (
                <Badge variant="destructive" className="ml-2">Inactive</Badge>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">User Details</h4>
                {!isEditingUser && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingUser(true)}
                    data-testid="button-edit-user-details"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>

              {isEditingUser ? (
                <Form {...editUserForm}>
                  <form onSubmit={editUserForm.handleSubmit(handleEditUserSubmit)} className="space-y-4">
                    <FormField
                      control={editUserForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-edit-user-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editUserForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-edit-user-firstname" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editUserForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-edit-user-lastname" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={editUserForm.control}
                      name="agentName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agent Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-edit-user-agentname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditingUser(false)}
                        data-testid="button-cancel-edit-user"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updateUserMutation.isPending} data-testid="button-save-edit-user">
                        {updateUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedUser?.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">
                      {selectedUser?.firstName || selectedUser?.lastName
                        ? `${selectedUser?.firstName ?? ""} ${selectedUser?.lastName ?? ""}`.trim()
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Agent Name</p>
                    <p className="font-medium">{selectedUser?.agentName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Super Admin</p>
                    <p className="font-medium">{selectedUser?.isSuperAdmin ? "Yes" : "No"}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Voice Access</h4>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="voice-access"
                  checked={selectedUser?.hasVoiceAccess ?? false}
                  onCheckedChange={(checked) => {
                    if (selectedUser) {
                      toggleVoiceAccessMutation.mutate({
                        userId: selectedUser.id,
                        hasVoiceAccess: checked as boolean,
                      });
                    }
                  }}
                  disabled={toggleVoiceAccessMutation.isPending}
                  data-testid="checkbox-voice-access"
                />
                <Label htmlFor="voice-access" className="text-sm">
                  Enable voice access for this user
                </Label>
                {toggleVoiceAccessMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Password Reset</h4>
                {!isResettingPassword && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsResettingPassword(true)}
                    data-testid="button-show-reset-password"
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    Reset Password
                  </Button>
                )}
              </div>

              {isResettingPassword && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Minimum 6 characters"
                        className="pl-10"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        data-testid="input-new-password"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm new password"
                        className="pl-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        data-testid="input-confirm-password"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsResettingPassword(false);
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      data-testid="button-cancel-reset-password"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleResetPasswordSubmit}
                      disabled={resetPasswordMutation.isPending}
                      data-testid="button-submit-reset-password"
                    >
                      {resetPasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Reset Password
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Account Status</h4>
              <div className="flex items-center gap-2">
                {selectedUser?.isActive !== false ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeactivateUser}
                    disabled={deactivateUserMutation.isPending}
                    data-testid="button-deactivate-user"
                  >
                    {deactivateUserMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserX className="mr-2 h-4 w-4" />
                    )}
                    Deactivate User
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleReactivateUser}
                    disabled={reactivateUserMutation.isPending}
                    data-testid="button-reactivate-user"
                  >
                    {reactivateUserMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="mr-2 h-4 w-4" />
                    )}
                    Reactivate User
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Current Memberships</h4>
              {selectedUser?.tenantMemberships?.length === 0 ? (
                <p className="text-sm text-muted-foreground">This user is not a member of any tenant.</p>
              ) : (
                <div className="space-y-2">
                  {selectedUser?.tenantMemberships?.map((m) => {
                    const isUpdatingRole = updateUserRoleInTenantMutation.isPending && 
                      updateUserRoleInTenantMutation.variables?.tenantId === m.tenantId;
                    return (
                      <div 
                        key={m.tenantId} 
                        className="flex items-center justify-between p-2 rounded-md border"
                        data-testid={`membership-${m.tenantId}`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{m.tenantName}</Badge>
                          <Select
                            value={m.roleInTenant}
                            onValueChange={(newRole) => {
                              if (newRole !== m.roleInTenant) {
                                updateUserRoleInTenantMutation.mutate({
                                  userId: selectedUser!.id,
                                  tenantId: m.tenantId,
                                  roleInTenant: newRole
                                });
                              }
                            }}
                            disabled={isUpdatingRole}
                          >
                            <SelectTrigger 
                              className="w-[130px] h-8"
                              data-testid={`select-role-${m.tenantId}`}
                            >
                              {isUpdatingRole ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="org_admin">Admin</SelectItem>
                              <SelectItem value="agent">Agent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveUserFromTenant(selectedUser!.id, m.tenantId)}
                          disabled={removeUserFromTenantMutation.isPending}
                          data-testid={`button-remove-from-${m.tenantId}`}
                        >
                          {removeUserFromTenantMutation.isPending && 
                            removeUserFromTenantMutation.variables?.tenantId === m.tenantId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Add to Tenant</h4>
                {!isAddToTenantOpen && getAvailableTenants().length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddToTenantOpen(true)}
                    data-testid="button-show-add-form"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add to Tenant
                  </Button>
                )}
              </div>

              {getAvailableTenants().length === 0 && !isAddToTenantOpen && (
                <p className="text-sm text-muted-foreground">
                  This user is already a member of all available tenants.
                </p>
              )}

              {isAddToTenantOpen && (
                <Form {...addUserToTenantForm}>
                  <form onSubmit={addUserToTenantForm.handleSubmit(handleAddUserToTenantSubmit)} className="space-y-4">
                    <FormField
                      control={addUserToTenantForm.control}
                      name="tenantId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tenant</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-add-tenant">
                                <SelectValue placeholder="Select tenant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getAvailableTenants().map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addUserToTenantForm.control}
                      name="roleInTenant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-add-role">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="org_admin">Admin</SelectItem>
                              <SelectItem value="agent">Agent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddToTenantOpen(false)}
                        data-testid="button-cancel-add"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={addUserToTenantMutation.isPending}
                        data-testid="button-submit-add"
                      >
                        {addUserToTenantMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Add
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCloseUserDialog}
              data-testid="button-close-user-dialog"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
