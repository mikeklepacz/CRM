import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { useOptionalProject } from "@/contexts/project-context";
import { useModuleAccess } from "@/hooks/useModuleAccess";

import {
  PIPELINE_TYPES,
  PROJECT_COLORS,
  PROJECT_TYPES,
  STAGE_TYPES,
  generateSlug,
} from "@/components/org-admin/org-admin-constants";
import {
  formatDate,
  getInviteStatusBadgeVariant,
  getPipelineTypeBadgeVariant,
  getProjectStatusBadgeClass,
  getProjectTypeBadgeVariant,
  getRoleBadgeVariant,
} from "@/components/org-admin/org-admin-formatters";
import { OrgAdminView } from "@/components/org-admin/org-admin-view";
import { useOrgAdminForms } from "@/components/org-admin/use-org-admin-forms";
import { useOrgAdminHandlers } from "@/components/org-admin/use-org-admin-handlers";
import { useOrgAdminPipelineMutations } from "@/components/org-admin/use-org-admin-pipeline-mutations";
import { useOrgAdminProjectMutations } from "@/components/org-admin/use-org-admin-project-mutations";
import { useOrgAdminQueries } from "@/components/org-admin/use-org-admin-queries";
import { useOrgAdminState } from "@/components/org-admin/use-org-admin-state";
import { useOrgAdminTenantMutations } from "@/components/org-admin/use-org-admin-tenant-mutations";
import { useOrgAdminUserMutations } from "@/components/org-admin/use-org-admin-user-mutations";
import { detectBrowserTimezone } from "@/components/org-admin/org-admin-utils";
import { TIMEZONE_DATA } from "@shared/timezoneUtils";

export default function OrgAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const projectContext = useOptionalProject();
  const currentProject = projectContext?.currentProject;
  const {
    activeTab,
    deletingStageId,
    editingPipeline,
    editingProject,
    editingStage,
    editingUser,
    isCreateUserDialogOpen,
    isInviteDialogOpen,
    isPipelineDialogOpen,
    isProjectDialogOpen,
    isStageDialogOpen,
    pipelineToDelete,
    projectToArchive,
    projectToDelete,
    roleChangeUser,
    selectedPipelineId,
    sensors,
    setActiveTab,
    setDeletingStageId,
    setEditingPipeline,
    setEditingProject,
    setEditingStage,
    setEditingUser,
    setIsCreateUserDialogOpen,
    setIsInviteDialogOpen,
    setIsPipelineDialogOpen,
    setIsProjectDialogOpen,
    setIsStageDialogOpen,
    setPipelineToDelete,
    setProjectToArchive,
    setProjectToDelete,
    setRoleChangeUser,
    setSelectedPipelineId,
    setStageToDelete,
    setUserToRemove,
    userToRemove,
  } = useOrgAdminState();

  useEffect(() => {
    if (!authLoading && user && !canAccessAdminFeatures(user)) {
      setLocation('/');
    }
  }, [user, authLoading, setLocation]);

  const {
    invitesData,
    invitesLoading,
    pipelinesData,
    pipelinesLoading,
    projectsData,
    projectsLoading,
    selectedPipelineData,
    selectedPipelineLoading,
    settingsData,
    settingsLoading,
    statsData,
    statsLoading,
    tenantsData,
    tenantsLoading,
    usersData,
    usersLoading,
    voiceAgentsData,
  } = useOrgAdminQueries({
    currentProject,
    selectedPipelineId,
    user,
  });

  const { clearTenantOverrideMutation, switchTenantMutation } = useOrgAdminTenantMutations({
    toast,
  });

  const {
    createUserForm,
    inviteForm,
    pipelineForm,
    projectForm,
    settingsForm,
    stageForm,
  } = useOrgAdminForms({ settingsData });

  const {
    cancelInviteMutation,
    createInviteMutation,
    createUserMutation,
    editUserMutation,
    removeUserMutation,
    updateRoleMutation,
    updateSettingsMutation,
  } = useOrgAdminUserMutations({
    createUserForm,
    inviteForm,
    setEditingUser,
    setIsCreateUserDialogOpen,
    setIsInviteDialogOpen,
    setRoleChangeUser,
    setUserToRemove,
    toast,
  });

  const {
    createPipelineMutation,
    createStageMutation,
    deletePipelineMutation,
    deleteStageMutation,
    reorderStagesMutation,
    updatePipelineMutation,
    updateStageMutation,
  } = useOrgAdminPipelineMutations({
    currentProject,
    pipelineForm,
    pipelineToDelete,
    selectedPipelineId,
    setDeletingStageId,
    setEditingPipeline,
    setEditingStage,
    setIsPipelineDialogOpen,
    setIsStageDialogOpen,
    setPipelineToDelete,
    setSelectedPipelineId,
    setStageToDelete,
    stageForm,
    toast,
  });

  const {
    archiveProjectMutation,
    createProjectMutation,
    deleteProjectMutation,
    restoreProjectMutation,
    setDefaultProjectMutation,
    updateProjectMutation,
  } = useOrgAdminProjectMutations({
    projectContext,
    projectForm,
    setEditingProject,
    setIsProjectDialogOpen,
    setProjectToArchive,
    setProjectToDelete,
    toast,
  });

  const {
    handleCreateUserSubmit,
    handleDeleteStage,
    handleDragEnd,
    handleInviteSubmit,
    handleOpenPipelineDialog,
    handleOpenProjectDialog,
    handleOpenStageDialog,
    handlePipelineSubmit,
    handleProjectSubmit,
    handleSettingsSubmit,
  } = useOrgAdminHandlers({
    createInviteMutation,
    createPipelineMutation,
    createProjectMutation,
    createStageMutation,
    createUserMutation,
    deleteStageMutation,
    editingPipeline,
    editingProject,
    editingStage,
    pipelineForm,
    projectForm,
    reorderStagesMutation,
    selectedPipelineData,
    selectedPipelineId,
    setDeletingStageId,
    setEditingPipeline,
    setEditingProject,
    setEditingStage,
    setIsPipelineDialogOpen,
    setIsProjectDialogOpen,
    setIsStageDialogOpen,
    stageForm,
    updatePipelineMutation,
    updateProjectMutation,
    updateSettingsMutation,
    updateStageMutation,
  });

  if (authLoading) return null;

  if (!canAccessAdminFeatures(user)) {
    return null;
  }

  const pendingInvites = invitesData?.invites?.filter(i => i.status === "pending") || [];

  const { isModuleEnabled } = useModuleAccess();
  const isPipelinesAllowed = isModuleEnabled('pipelines');

  const isTenantMutating = switchTenantMutation.isPending || clearTenantOverrideMutation.isPending;
  const currentTenantName = tenantsData?.tenants?.find(t => t.id === user?.tenantId)?.name || user?.tenantName;
  const tenantSelectValue = user?.tenantId || '__none__';

  const viewProps = {
    activeTab, archiveProjectMutation, cancelInviteMutation, clearTenantOverrideMutation, createInviteMutation,
    createPipelineMutation, createProjectMutation, createStageMutation, createUserForm, createUserMutation,
    currentTenantName, deletePipelineMutation, deleteProjectMutation, deletingStageId, editingPipeline,
    editingProject, editingStage, editingUser, editUserMutation, formatDate, generateSlug,
    getInviteStatusBadgeVariant, getPipelineTypeBadgeVariant, getProjectStatusBadgeClass, getProjectTypeBadgeVariant,
    getRoleBadgeVariant, handleCreateUserSubmit, handleDeleteStage, handleDragEnd, handleInviteSubmit,
    handleOpenPipelineDialog, handleOpenProjectDialog, handleOpenStageDialog, handlePipelineSubmit,
    handleProjectSubmit, handleSettingsSubmit, inviteForm, invitesLoading, isCreateUserDialogOpen,
    isInviteDialogOpen, isPipelineDialogOpen, isPipelinesAllowed, isProjectDialogOpen, isStageDialogOpen,
    isTenantMutating, pendingInvites, pipelineForm, pipelineToDelete, pipelinesData, pipelinesLoading, projectForm,
    projectToArchive, projectToDelete, projectsData, projectsLoading, removeUserMutation, restoreProjectMutation,
    roleChangeUser, selectedPipelineData, selectedPipelineId, selectedPipelineLoading, sensors, setActiveTab,
    setDefaultProjectMutation, setEditingPipeline, setEditingProject, setEditingStage, setEditingUser,
    setIsCreateUserDialogOpen, setIsInviteDialogOpen, setIsPipelineDialogOpen, setIsProjectDialogOpen,
    setIsStageDialogOpen, setPipelineToDelete, setProjectToArchive, setProjectToDelete, setRoleChangeUser,
    setSelectedPipelineId, setUserToRemove, settingsData, settingsForm, settingsLoading, statsData, statsLoading,
    switchTenantMutation, tenantSelectValue, tenantsData, tenantsLoading, toast, updatePipelineMutation,
    updateProjectMutation, updateRoleMutation, updateSettingsMutation, updateStageMutation, user, userToRemove,
    usersData, usersLoading, voiceAgentsData,
    pipelineTypes: PIPELINE_TYPES, projectColors: PROJECT_COLORS, projectTypes: PROJECT_TYPES, stageTypes: STAGE_TYPES,
  };

  return <OrgAdminView {...viewProps} />;
}
