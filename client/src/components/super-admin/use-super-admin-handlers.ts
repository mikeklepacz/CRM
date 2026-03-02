import type { FormEvent } from "react";
import type { AddUserToTenantFormData, CreateUserFormData, EditUserFormData, TenantFormData } from "@/components/super-admin/super-admin.forms";
import { getUnreadTicketCount } from "@/components/super-admin/super-admin-utils";
import type { SortField, SuperAdminTicket, Tenant } from "@/components/super-admin/super-admin.types";

interface UseSuperAdminHandlersProps {
  confirmPassword: string;
  editingAllowedModules: string[];
  editingTenant: Tenant | null;
  newPassword: string;
  selectedTicketId: string | null;
  selectedUser: { id: string } | null;
  setConfirmPassword: (value: string) => void;
  setIsAddToTenantOpen: (open: boolean) => void;
  setIsEditingUser: (editing: boolean) => void;
  setIsResettingPassword: (resetting: boolean) => void;
  setNewPassword: (value: string) => void;
  setSelectedTicketId: (ticketId: string | null) => void;
  setSelectedUser: (user: any) => void;
  setSortDirection: (value: "asc" | "desc" | ((prev: "asc" | "desc") => "asc" | "desc")) => void;
  setSortField: (field: SortField) => void;
  setTicketReplyMessage: (value: string) => void;
  sortField: SortField;
  ticketReplyMessage: string;
  tickets?: SuperAdminTicket[];
  toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void;
  mutations: {
    addUserToTenantMutation: { mutate: (payload: { roleInTenant: string; tenantId: string; userId: string }) => void };
    createTenantMutation: { mutate: (payload: TenantFormData) => void };
    createUserMutation: { mutate: (payload: CreateUserFormData) => void };
    deactivateUserMutation: { mutate: (userId: string) => void };
    markTicketReadMutation: { mutate: (ticketId: string) => void };
    reactivateUserMutation: { mutate: (userId: string) => void };
    removeUserFromTenantMutation: { mutate: (payload: { tenantId: string; userId: string }) => void };
    replyToTicketMutation: { mutate: (payload: { message: string; ticketId: string }) => void };
    resetPasswordMutation: { mutate: (payload: { newPassword: string; userId: string }) => void };
    updateTenantMutation: {
      mutate: (payload: {
        data: TenantFormData & {
          settings: {
            allowedModules: string[];
            companyName?: string;
            enabledModules?: string[];
            timezone?: string;
          };
        };
        id: string;
      }) => void;
    };
    updateTicketStatusMutation: { mutate: (payload: { status: string; ticketId: string }) => void };
    updateUserMutation: { mutate: (payload: { data: EditUserFormData; userId: string }) => void };
  };
}

export function useSuperAdminHandlers(props: UseSuperAdminHandlersProps) {
  const handleCreateSubmit = (data: TenantFormData) => {
    props.mutations.createTenantMutation.mutate(data);
  };

  const handleEditSubmit = (data: TenantFormData) => {
    if (props.editingTenant) {
      props.mutations.updateTenantMutation.mutate({
        id: props.editingTenant.id,
        data: {
          ...data,
          settings: {
            ...props.editingTenant.settings,
            allowedModules: props.editingAllowedModules,
          },
        },
      });
    }
  };

  const handleAddUserToTenantSubmit = (data: AddUserToTenantFormData) => {
    if (props.selectedUser) {
      props.mutations.addUserToTenantMutation.mutate({
        userId: props.selectedUser.id,
        tenantId: data.tenantId,
        roleInTenant: data.roleInTenant,
      });
    }
  };

  const handleRemoveUserFromTenant = (userId: string, tenantId: string) => {
    props.mutations.removeUserFromTenantMutation.mutate({ userId, tenantId });
  };

  const handleCreateUserSubmit = (data: CreateUserFormData) => {
    props.mutations.createUserMutation.mutate(data);
  };

  const handleEditUserSubmit = (data: EditUserFormData) => {
    if (props.selectedUser) {
      props.mutations.updateUserMutation.mutate({ userId: props.selectedUser.id, data });
    }
  };

  const handleResetPasswordSubmit = () => {
    if (!props.selectedUser) return;

    if (!props.newPassword) {
      props.toast({
        title: "Validation Error",
        description: "Password is required",
        variant: "destructive",
      });
      return;
    }

    if (props.newPassword.length < 6) {
      props.toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (props.newPassword !== props.confirmPassword) {
      props.toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    props.mutations.resetPasswordMutation.mutate({ userId: props.selectedUser.id, newPassword: props.newPassword });
  };

  const handleDeactivateUser = () => {
    if (props.selectedUser) {
      props.mutations.deactivateUserMutation.mutate(props.selectedUser.id);
    }
  };

  const handleReactivateUser = () => {
    if (props.selectedUser) {
      props.mutations.reactivateUserMutation.mutate(props.selectedUser.id);
    }
  };

  const handleSort = (field: SortField) => {
    if (props.sortField === field) {
      props.setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      props.setSortField(field);
      props.setSortDirection("asc");
    }
  };

  const handleCloseUserDialog = () => {
    props.setSelectedUser(null);
    props.setIsAddToTenantOpen(false);
    props.setIsEditingUser(false);
    props.setIsResettingPassword(false);
    props.setNewPassword("");
    props.setConfirmPassword("");
  };

  const handleTicketReply = (e: FormEvent) => {
    e.preventDefault();
    if (!props.ticketReplyMessage.trim() || !props.selectedTicketId) return;
    props.mutations.replyToTicketMutation.mutate({ ticketId: props.selectedTicketId, message: props.ticketReplyMessage });
  };

  const handleTicketStatusChange = (status: string) => {
    if (!props.selectedTicketId) return;
    props.mutations.updateTicketStatusMutation.mutate({ ticketId: props.selectedTicketId, status });
  };

  const handleTicketSelect = (ticketId: string) => {
    props.setSelectedTicketId(ticketId);
    const ticket = props.tickets?.find((t) => t.id === ticketId);
    if (ticket?.isUnreadByAdmin) {
      props.mutations.markTicketReadMutation.mutate(ticketId);
    }
  };

  const unreadTicketCount = getUnreadTicketCount(props.tickets);

  return {
    handleAddUserToTenantSubmit,
    handleCloseUserDialog,
    handleCreateSubmit,
    handleCreateUserSubmit,
    handleDeactivateUser,
    handleEditSubmit,
    handleEditUserSubmit,
    handleReactivateUser,
    handleRemoveUserFromTenant,
    handleResetPasswordSubmit,
    handleSort,
    handleTicketReply,
    handleTicketSelect,
    handleTicketStatusChange,
    unreadTicketCount,
  };
}
