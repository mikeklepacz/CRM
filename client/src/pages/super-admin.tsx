import { useEffect } from "react";
import { useLocation } from "wouter";
import { SuperAdminShell } from "@/components/super-admin/super-admin-shell";
import { useSuperAdminConfigMutations } from "@/components/super-admin/use-super-admin-config-mutations";
import { useSuperAdminDerived } from "@/components/super-admin/use-super-admin-derived";
import { useSuperAdminForms } from "@/components/super-admin/use-super-admin-forms";
import { useSuperAdminHandlers } from "@/components/super-admin/use-super-admin-handlers";
import { useSuperAdminQueries } from "@/components/super-admin/use-super-admin-queries";
import { useSuperAdminState } from "@/components/super-admin/use-super-admin-state";
import { useSuperAdminTenantMutations } from "@/components/super-admin/use-super-admin-tenant-mutations";
import { useSuperAdminTicketMutations } from "@/components/super-admin/use-super-admin-ticket-mutations";
import { useSuperAdminUserMutations } from "@/components/super-admin/use-super-admin-user-mutations";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isSuperAdmin } from "@/lib/authUtils";

export default function SuperAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const state = useSuperAdminState();

  useEffect(() => {
    if (!authLoading && user && !isSuperAdmin(user)) {
      setLocation("/");
    }
  }, [authLoading, setLocation, user]);

  const queries = useSuperAdminQueries({
    configTenantId: state.configTenantId,
    selectedTicketId: state.selectedTicketId,
    user,
    viewingTenantId: state.viewingTenantId,
  });

  const forms = useSuperAdminForms({
    editingTenant: state.editingTenant,
    isAddToTenantOpen: state.isAddToTenantOpen,
    isCreateUserDialogOpen: state.isCreateUserDialogOpen,
    isEditingUser: state.isEditingUser,
    selectedUser: state.selectedUser,
    setEditingAllowedModules: state.setEditingAllowedModules,
    setSelectedUser: state.setSelectedUser,
    usersData: queries.usersData,
  });

  const useDirectElevenLabs = queries.directElevenLabsData?.useDirectElevenLabs ?? false;

  const { updateDirectElevenLabsMutation } = useSuperAdminConfigMutations({
    configTenantId: state.configTenantId,
    toast,
    useDirectElevenLabs,
  });

  const { createTenantMutation, updateTenantMutation } = useSuperAdminTenantMutations({
    createForm: forms.createForm,
    editForm: forms.editForm,
    setEditingAllowedModules: state.setEditingAllowedModules,
    setEditingTenant: state.setEditingTenant,
    setIsCreateDialogOpen: state.setIsCreateDialogOpen,
    toast,
  });

  const userMutations = useSuperAdminUserMutations({
    addUserToTenantForm: forms.addUserToTenantForm,
    createUserForm: forms.createUserForm,
    selectedUser: state.selectedUser,
    setConfirmPassword: state.setConfirmPassword,
    setIsAddToTenantOpen: state.setIsAddToTenantOpen,
    setIsCreateUserDialogOpen: state.setIsCreateUserDialogOpen,
    setIsEditingUser: state.setIsEditingUser,
    setIsResettingPassword: state.setIsResettingPassword,
    setNewPassword: state.setNewPassword,
    setSelectedUser: state.setSelectedUser,
    tenantsData: queries.tenantsData,
    toast,
  });

  const ticketMutations = useSuperAdminTicketMutations({
    selectedTicketId: state.selectedTicketId,
    setTicketReplyMessage: state.setTicketReplyMessage,
    toast,
  });

  const mutations = {
    ...userMutations,
    ...ticketMutations,
    createTenantMutation,
    updateDirectElevenLabsMutation,
    updateTenantMutation,
  };

  const derived = useSuperAdminDerived({
    searchQuery: state.searchQuery,
    selectedUser: state.selectedUser,
    sortDirection: state.sortDirection,
    sortField: state.sortField,
    tenantFilter: state.tenantFilter,
    tenants: queries.tenantsData?.tenants,
    ticketCategoryFilter: state.ticketCategoryFilter,
    ticketStatusFilter: state.ticketStatusFilter,
    ticketTenantFilter: state.ticketTenantFilter,
    tickets: queries.ticketsData?.tickets,
    userStatusFilter: state.userStatusFilter,
    users: queries.usersData?.users,
  });

  const handlers = useSuperAdminHandlers({
    confirmPassword: state.confirmPassword,
    editingAllowedModules: state.editingAllowedModules,
    editingTenant: state.editingTenant,
    mutations,
    newPassword: state.newPassword,
    selectedTicketId: state.selectedTicketId,
    selectedUser: state.selectedUser,
    setConfirmPassword: state.setConfirmPassword,
    setIsAddToTenantOpen: state.setIsAddToTenantOpen,
    setIsEditingUser: state.setIsEditingUser,
    setIsResettingPassword: state.setIsResettingPassword,
    setNewPassword: state.setNewPassword,
    setSelectedTicketId: state.setSelectedTicketId,
    setSelectedUser: state.setSelectedUser,
    setSortDirection: state.setSortDirection,
    setSortField: state.setSortField,
    setTicketReplyMessage: state.setTicketReplyMessage,
    sortField: state.sortField,
    ticketReplyMessage: state.ticketReplyMessage,
    tickets: queries.ticketsData?.tickets,
    toast,
  });

  const ticketDetail = queries.ticketDetailData?.ticket;
  const ticketReplies = queries.ticketDetailData?.replies || [];

  if (authLoading) {
    return null;
  }

  if (!isSuperAdmin(user)) {
    return null;
  }

  return (
    <SuperAdminShell
      derived={derived}
      forms={forms}
      handlers={handlers}
      mutations={mutations}
      queries={queries}
      state={state}
      ticketDetail={ticketDetail}
      ticketReplies={ticketReplies}
      useDirectElevenLabs={useDirectElevenLabs}
    />
  );
}
