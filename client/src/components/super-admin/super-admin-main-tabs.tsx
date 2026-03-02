import { Tabs } from "@/components/ui/tabs";
import { SuperAdminCategoriesTab } from "@/components/super-admin/super-admin-categories-tab";
import { SuperAdminMetricsTab } from "@/components/super-admin/super-admin-metrics-tab";
import { SuperAdminSheetsTab } from "@/components/super-admin/super-admin-sheets-tab";
import { SuperAdminTabsList } from "@/components/super-admin/super-admin-tabs-list";
import { SuperAdminTenantsTab } from "@/components/super-admin/super-admin-tenants-tab";
import { SuperAdminTicketsTab } from "@/components/super-admin/super-admin-tickets-tab";
import { SuperAdminUsersTab } from "@/components/super-admin/super-admin-users-tab";
import { SuperAdminVoiceTab } from "@/components/super-admin/super-admin-voice-tab";
import { SuperAdminWebhooksTab } from "@/components/super-admin/super-admin-webhooks-tab";

export function SuperAdminMainTabs(props: any) {
  const p = props;

  return (
    <Tabs value={p.activeTab} onValueChange={p.setActiveTab} className="space-y-4">
      <SuperAdminTabsList unreadTicketCount={p.unreadTicketCount} />

      <SuperAdminTenantsTab
        formatDate={p.formatDate}
        getStatusBadgeVariant={p.getStatusBadgeVariant}
        setEditingTenant={p.setEditingTenant}
        setIsCreateDialogOpen={p.setIsCreateDialogOpen}
        setViewingTenantId={p.setViewingTenantId}
        tenantsData={p.tenantsData}
        tenantsLoading={p.tenantsLoading}
      />

      <SuperAdminUsersTab
        activeUsersCount={p.activeUsersCount}
        filteredAndSortedUsers={p.filteredAndSortedUsers}
        getSortIcon={p.getSortIcon}
        handleSort={p.handleSort}
        inactiveUsersCount={p.inactiveUsersCount}
        searchQuery={p.searchQuery}
        setIsCreateUserDialogOpen={p.setIsCreateUserDialogOpen}
        setSearchQuery={p.setSearchQuery}
        setSelectedUser={p.setSelectedUser}
        setTenantFilter={p.setTenantFilter}
        setUserStatusFilter={p.setUserStatusFilter}
        sortDirection={p.sortDirection}
        sortField={p.sortField}
        tenantFilter={p.tenantFilter}
        tenantsData={p.tenantsData}
        userStatusFilter={p.userStatusFilter}
        usersLoading={p.usersLoading}
      />

      <SuperAdminMetricsTab metricsData={p.metricsData} metricsLoading={p.metricsLoading} />

      <SuperAdminTicketsTab
        filteredTickets={p.filteredTickets}
        handleTicketReply={p.handleTicketReply}
        handleTicketSelect={p.handleTicketSelect}
        handleTicketStatusChange={p.handleTicketStatusChange}
        replyToTicketMutation={p.replyToTicketMutation}
        selectedTicketId={p.selectedTicketId}
        setTicketCategoryFilter={p.setTicketCategoryFilter}
        setTicketReplyMessage={p.setTicketReplyMessage}
        setTicketStatusFilter={p.setTicketStatusFilter}
        setTicketTenantFilter={p.setTicketTenantFilter}
        tenantsData={p.tenantsData}
        ticketCategories={p.ticketCategories}
        ticketCategoryFilter={p.ticketCategoryFilter}
        ticketDetail={p.ticketDetail}
        ticketDetailLoading={p.ticketDetailLoading}
        ticketReplies={p.ticketReplies}
        ticketReplyMessage={p.ticketReplyMessage}
        ticketStatusFilter={p.ticketStatusFilter}
        ticketTenantFilter={p.ticketTenantFilter}
        ticketsLoading={p.ticketsLoading}
        unreadTicketCount={p.unreadTicketCount}
        updateTicketStatusMutation={p.updateTicketStatusMutation}
      />

      <SuperAdminWebhooksTab
        configTenantId={p.configTenantId}
        setConfigTenantId={p.setConfigTenantId}
        tenantsData={p.tenantsData}
      />

      <SuperAdminVoiceTab
        configTenantId={p.configTenantId}
        directElevenLabsLoading={p.directElevenLabsLoading}
        setConfigTenantId={p.setConfigTenantId}
        tenantsData={p.tenantsData}
        updateDirectElevenLabsMutation={p.updateDirectElevenLabsMutation}
        useDirectElevenLabs={p.useDirectElevenLabs}
      />

      <SuperAdminSheetsTab
        configTenantId={p.configTenantId}
        setConfigTenantId={p.setConfigTenantId}
        tenantsData={p.tenantsData}
      />

      <SuperAdminCategoriesTab
        configTenantId={p.configTenantId}
        setConfigTenantId={p.setConfigTenantId}
        tenantsData={p.tenantsData}
      />
    </Tabs>
  );
}
