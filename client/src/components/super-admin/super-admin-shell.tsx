import { TICKET_CATEGORIES, formatDate, getSortIcon, getStatusBadgeVariant } from "@/components/super-admin/super-admin-utils";
import { SuperAdminCreateUserDialog } from "@/components/super-admin/super-admin-create-user-dialog";
import { SuperAdminMainTabs } from "@/components/super-admin/super-admin-main-tabs";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { SuperAdminTenantDialogs } from "@/components/super-admin/super-admin-tenant-dialogs";
import { SuperAdminUserManagementDialog } from "@/components/super-admin/super-admin-user-management-dialog";

export function SuperAdminShell(props: any) {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <SuperAdminPageHeader metricsData={props.queries.metricsData} metricsLoading={props.queries.metricsLoading} />

      <SuperAdminMainTabs
        activeTab={props.state.activeTab}
        activeUsersCount={props.derived.activeUsersCount}
        configTenantId={props.state.configTenantId}
        directElevenLabsLoading={props.queries.directElevenLabsLoading}
        filteredAndSortedUsers={props.derived.filteredAndSortedUsers}
        filteredTickets={props.derived.filteredTickets}
        formatDate={formatDate}
        getSortIcon={getSortIcon}
        getStatusBadgeVariant={getStatusBadgeVariant}
        handleSort={props.handlers.handleSort}
        handleTicketReply={props.handlers.handleTicketReply}
        handleTicketSelect={props.handlers.handleTicketSelect}
        handleTicketStatusChange={props.handlers.handleTicketStatusChange}
        inactiveUsersCount={props.derived.inactiveUsersCount}
        metricsData={props.queries.metricsData}
        metricsLoading={props.queries.metricsLoading}
        replyToTicketMutation={props.mutations.replyToTicketMutation}
        searchQuery={props.state.searchQuery}
        selectedTicketId={props.state.selectedTicketId}
        setActiveTab={props.state.setActiveTab}
        setConfigTenantId={props.state.setConfigTenantId}
        setEditingTenant={props.state.setEditingTenant}
        setIsCreateDialogOpen={props.state.setIsCreateDialogOpen}
        setIsCreateUserDialogOpen={props.state.setIsCreateUserDialogOpen}
        setSearchQuery={props.state.setSearchQuery}
        setSelectedUser={props.state.setSelectedUser}
        setTenantFilter={props.state.setTenantFilter}
        setTicketCategoryFilter={props.state.setTicketCategoryFilter}
        setTicketReplyMessage={props.state.setTicketReplyMessage}
        setTicketStatusFilter={props.state.setTicketStatusFilter}
        setTicketTenantFilter={props.state.setTicketTenantFilter}
        setUserStatusFilter={props.state.setUserStatusFilter}
        setViewingTenantId={props.state.setViewingTenantId}
        sortDirection={props.state.sortDirection}
        sortField={props.state.sortField}
        tenantFilter={props.state.tenantFilter}
        tenantsData={props.queries.tenantsData}
        ticketCategories={TICKET_CATEGORIES}
        ticketCategoryFilter={props.state.ticketCategoryFilter}
        ticketDetail={props.ticketDetail}
        ticketDetailLoading={props.queries.ticketDetailLoading}
        ticketReplies={props.ticketReplies}
        ticketReplyMessage={props.state.ticketReplyMessage}
        ticketStatusFilter={props.state.ticketStatusFilter}
        ticketTenantFilter={props.state.ticketTenantFilter}
        ticketsLoading={props.queries.ticketsLoading}
        unreadTicketCount={props.handlers.unreadTicketCount}
        updateDirectElevenLabsMutation={props.mutations.updateDirectElevenLabsMutation}
        updateTicketStatusMutation={props.mutations.updateTicketStatusMutation}
        useDirectElevenLabs={props.useDirectElevenLabs}
        userStatusFilter={props.state.userStatusFilter}
        usersLoading={props.queries.usersLoading}
      />

      <SuperAdminTenantDialogs
        createForm={props.forms.createForm}
        createTenantPending={props.mutations.createTenantMutation.isPending}
        detailsLoading={props.queries.detailsLoading}
        editingAllowedModules={props.state.editingAllowedModules}
        editingTenant={props.state.editingTenant}
        editForm={props.forms.editForm}
        getStatusBadgeVariant={getStatusBadgeVariant}
        handleCreateSubmit={props.handlers.handleCreateSubmit}
        handleEditSubmit={props.handlers.handleEditSubmit}
        isCreateDialogOpen={props.state.isCreateDialogOpen}
        setEditingAllowedModules={props.state.setEditingAllowedModules}
        setEditingTenant={props.state.setEditingTenant}
        setIsCreateDialogOpen={props.state.setIsCreateDialogOpen}
        setViewingTenantId={props.state.setViewingTenantId}
        tenantDetails={props.queries.tenantDetails}
        updateTenantPending={props.mutations.updateTenantMutation.isPending}
        viewingTenantId={props.state.viewingTenantId}
      />

      <SuperAdminCreateUserDialog
        createUserForm={props.forms.createUserForm}
        createUserPending={props.mutations.createUserMutation.isPending}
        handleCreateUserSubmit={props.handlers.handleCreateUserSubmit}
        isCreateUserDialogOpen={props.state.isCreateUserDialogOpen}
        setIsCreateUserDialogOpen={props.state.setIsCreateUserDialogOpen}
        tenants={props.queries.tenantsData?.tenants}
      />
      <SuperAdminUserManagementDialog
        addUserToTenantForm={props.forms.addUserToTenantForm}
        addUserToTenantMutation={props.mutations.addUserToTenantMutation}
        availableTenants={props.derived.availableTenants}
        confirmPassword={props.state.confirmPassword}
        deactivateUserMutation={props.mutations.deactivateUserMutation}
        editUserForm={props.forms.editUserForm}
        handleAddUserToTenantSubmit={props.handlers.handleAddUserToTenantSubmit}
        handleCloseUserDialog={props.handlers.handleCloseUserDialog}
        handleDeactivateUser={props.handlers.handleDeactivateUser}
        handleEditUserSubmit={props.handlers.handleEditUserSubmit}
        handleReactivateUser={props.handlers.handleReactivateUser}
        handleRemoveUserFromTenant={props.handlers.handleRemoveUserFromTenant}
        handleResetPasswordSubmit={props.handlers.handleResetPasswordSubmit}
        isAddToTenantOpen={props.state.isAddToTenantOpen}
        isEditingUser={props.state.isEditingUser}
        isResettingPassword={props.state.isResettingPassword}
        newPassword={props.state.newPassword}
        reactivateUserMutation={props.mutations.reactivateUserMutation}
        removeUserFromTenantMutation={props.mutations.removeUserFromTenantMutation}
        resetPasswordMutation={props.mutations.resetPasswordMutation}
        selectedUser={props.state.selectedUser}
        setConfirmPassword={props.state.setConfirmPassword}
        setIsAddToTenantOpen={props.state.setIsAddToTenantOpen}
        setIsEditingUser={props.state.setIsEditingUser}
        setIsResettingPassword={props.state.setIsResettingPassword}
        setNewPassword={props.state.setNewPassword}
        toggleVoiceAccessMutation={props.mutations.toggleVoiceAccessMutation}
        updateUserMutation={props.mutations.updateUserMutation}
        updateUserRoleInTenantMutation={props.mutations.updateUserRoleInTenantMutation}
      />
    </div>
  );
}
