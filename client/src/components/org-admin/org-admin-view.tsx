import { CategoryManagement } from "@/components/category-management";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { OrgAdminArchiveProjectDialog } from "@/components/org-admin/org-admin-archive-project-dialog";
import { OrgAdminDeletePipelineDialog } from "@/components/org-admin/org-admin-delete-pipeline-dialog";
import { OrgAdminDeleteProjectDialog } from "@/components/org-admin/org-admin-delete-project-dialog";
import { OrgAdminPageHeader } from "@/components/org-admin/org-admin-page-header";
import { OrgAdminPipelineDialog } from "@/components/org-admin/org-admin-pipeline-dialog";
import { OrgAdminPipelinesTab } from "@/components/org-admin/org-admin-pipelines-tab";
import { OrgAdminProjectDialog } from "@/components/org-admin/org-admin-project-dialog";
import { OrgAdminProjectsTab } from "@/components/org-admin/org-admin-projects-tab";
import { OrgAdminSettingsTab } from "@/components/org-admin/org-admin-settings-tab";
import { OrgAdminStageDialog } from "@/components/org-admin/org-admin-stage-dialog";
import { OrgAdminStatsTab } from "@/components/org-admin/org-admin-stats-tab";
import { OrgAdminTabsList } from "@/components/org-admin/org-admin-tabs-list";
import { OrgAdminTeamTab } from "@/components/org-admin/org-admin-team-tab";
import { OrgAdminTenantSwitcher } from "@/components/org-admin/org-admin-tenant-switcher";
import { OrgAdminUserCreationDialogs } from "@/components/org-admin/org-admin-user-creation-dialogs";
import { OrgAdminUserManagementDialogs } from "@/components/org-admin/org-admin-user-management-dialogs";

export function OrgAdminView(props: any) {
  const p = props;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <OrgAdminTenantSwitcher
        clearTenantOverrideMutation={p.clearTenantOverrideMutation}
        currentTenantName={p.currentTenantName}
        isTenantMutating={p.isTenantMutating}
        tenantSelectValue={p.tenantSelectValue}
        tenantsData={p.tenantsData}
        tenantsLoading={p.tenantsLoading}
        switchTenantMutation={p.switchTenantMutation}
        user={p.user}
      />

      <OrgAdminPageHeader settingsData={p.settingsData} settingsLoading={p.settingsLoading} />

      <Tabs value={p.activeTab} onValueChange={p.setActiveTab} className="space-y-4">
        <OrgAdminTabsList isPipelinesAllowed={p.isPipelinesAllowed} />

        <OrgAdminTeamTab
          cancelInviteMutation={p.cancelInviteMutation}
          formatDate={p.formatDate}
          getInviteStatusBadgeVariant={p.getInviteStatusBadgeVariant}
          getRoleBadgeVariant={p.getRoleBadgeVariant}
          invitesLoading={p.invitesLoading}
          pendingInvites={p.pendingInvites}
          setEditingUser={p.setEditingUser}
          setIsCreateUserDialogOpen={p.setIsCreateUserDialogOpen}
          setRoleChangeUser={p.setRoleChangeUser}
          setUserToRemove={p.setUserToRemove}
          user={p.user}
          usersData={p.usersData}
          usersLoading={p.usersLoading}
        />

        <OrgAdminSettingsTab
          handleSettingsSubmit={p.handleSettingsSubmit}
          settingsData={p.settingsData}
          settingsForm={p.settingsForm}
          settingsLoading={p.settingsLoading}
          toast={p.toast}
          updateSettingsMutation={p.updateSettingsMutation}
        />

        <OrgAdminStatsTab statsData={p.statsData} statsLoading={p.statsLoading} />

        {p.isPipelinesAllowed && (
          <OrgAdminPipelinesTab
            deletingStageId={p.deletingStageId}
            getPipelineTypeBadgeVariant={p.getPipelineTypeBadgeVariant}
            handleDeleteStage={p.handleDeleteStage}
            handleDragEnd={p.handleDragEnd}
            handleOpenPipelineDialog={p.handleOpenPipelineDialog}
            handleOpenStageDialog={p.handleOpenStageDialog}
            pipelinesData={p.pipelinesData}
            pipelinesLoading={p.pipelinesLoading}
            selectedPipelineData={p.selectedPipelineData}
            selectedPipelineId={p.selectedPipelineId}
            selectedPipelineLoading={p.selectedPipelineLoading}
            sensors={p.sensors}
            setPipelineToDelete={p.setPipelineToDelete}
            setSelectedPipelineId={p.setSelectedPipelineId}
          />
        )}

        <OrgAdminProjectsTab
          formatDate={p.formatDate}
          getProjectStatusBadgeClass={p.getProjectStatusBadgeClass}
          getProjectTypeBadgeVariant={p.getProjectTypeBadgeVariant}
          handleOpenProjectDialog={p.handleOpenProjectDialog}
          projectsData={p.projectsData}
          projectsLoading={p.projectsLoading}
          restoreProjectMutation={p.restoreProjectMutation}
          setDefaultProjectMutation={p.setDefaultProjectMutation}
          setProjectToArchive={p.setProjectToArchive}
          setProjectToDelete={p.setProjectToDelete}
        />

        <TabsContent value="categories">
          <CategoryManagement />
        </TabsContent>
      </Tabs>

      <OrgAdminUserCreationDialogs
        createInvitePending={p.createInviteMutation.isPending}
        createUserForm={p.createUserForm}
        createUserPending={p.createUserMutation.isPending}
        handleCreateUserSubmit={p.handleCreateUserSubmit}
        handleInviteSubmit={p.handleInviteSubmit}
        inviteForm={p.inviteForm}
        isCreateUserDialogOpen={p.isCreateUserDialogOpen}
        isInviteDialogOpen={p.isInviteDialogOpen}
        setIsCreateUserDialogOpen={p.setIsCreateUserDialogOpen}
        setIsInviteDialogOpen={p.setIsInviteDialogOpen}
      />

      <OrgAdminUserManagementDialogs
        editUserMutationPending={p.editUserMutation.isPending}
        editingUser={p.editingUser}
        onCloseEditingUser={() => p.setEditingUser(null)}
        onCloseRoleChange={() => p.setRoleChangeUser(null)}
        onCloseUserRemove={() => p.setUserToRemove(null)}
        onEditUserSave={(data) => p.editingUser && p.editUserMutation.mutate({ userId: p.editingUser.id, data })}
        onRoleChangeConfirm={() => {
          if (p.roleChangeUser) {
            p.updateRoleMutation.mutate({ userId: p.roleChangeUser.user.id, role: p.roleChangeUser.newRole });
          }
        }}
        onUserRemoveConfirm={() => {
          if (p.userToRemove) {
            p.removeUserMutation.mutate(p.userToRemove.id);
          }
        }}
        removeUserMutationPending={p.removeUserMutation.isPending}
        roleChangeUser={p.roleChangeUser}
        updateRoleMutationPending={p.updateRoleMutation.isPending}
        userToRemove={p.userToRemove}
      />

      <OrgAdminPipelineDialog
        createPipelineMutation={p.createPipelineMutation}
        editingPipeline={p.editingPipeline}
        generateSlug={p.generateSlug}
        handlePipelineSubmit={p.handlePipelineSubmit}
        isPipelineDialogOpen={p.isPipelineDialogOpen}
        pipelineForm={p.pipelineForm}
        pipelineTypes={p.pipelineTypes}
        setEditingPipeline={p.setEditingPipeline}
        setIsPipelineDialogOpen={p.setIsPipelineDialogOpen}
        updatePipelineMutation={p.updatePipelineMutation}
        voiceAgentsData={p.voiceAgentsData}
      />

      <OrgAdminDeletePipelineDialog
        deletePipelineMutation={p.deletePipelineMutation}
        pipelineToDelete={p.pipelineToDelete}
        setPipelineToDelete={p.setPipelineToDelete}
      />

      <OrgAdminStageDialog
        createStageMutation={p.createStageMutation}
        editingStage={p.editingStage}
        handleStageSubmit={p.handleStageSubmit}
        isStageDialogOpen={p.isStageDialogOpen}
        setEditingStage={p.setEditingStage}
        setIsStageDialogOpen={p.setIsStageDialogOpen}
        stageForm={p.stageForm}
        stageTypes={p.stageTypes}
        updateStageMutation={p.updateStageMutation}
      />

      <OrgAdminProjectDialog
        createProjectMutation={p.createProjectMutation}
        editingProject={p.editingProject}
        handleProjectSubmit={p.handleProjectSubmit}
        isProjectDialogOpen={p.isProjectDialogOpen}
        projectColors={p.projectColors}
        projectForm={p.projectForm}
        projectTypes={p.projectTypes}
        setEditingProject={p.setEditingProject}
        setIsProjectDialogOpen={p.setIsProjectDialogOpen}
        updateProjectMutation={p.updateProjectMutation}
      />

      <OrgAdminArchiveProjectDialog
        archiveProjectMutation={p.archiveProjectMutation}
        projectToArchive={p.projectToArchive}
        setProjectToArchive={p.setProjectToArchive}
      />

      <OrgAdminDeleteProjectDialog
        deleteProjectMutation={p.deleteProjectMutation}
        projectToDelete={p.projectToDelete}
        setProjectToDelete={p.setProjectToDelete}
      />
    </div>
  );
}
