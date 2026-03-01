import { arrayMove } from "@dnd-kit/sortable";

export function useOrgAdminHandlers(props: any) {
  const p = props;

  const handleInviteSubmit = (data: any) => {
    p.createInviteMutation.mutate(data);
  };

  const handleCreateUserSubmit = (data: any) => {
    p.createUserMutation.mutate(data);
  };

  const handleSettingsSubmit = (data: any) => {
    p.updateSettingsMutation.mutate(data);
  };

  const handleOpenPipelineDialog = (pipeline?: any) => {
    if (pipeline) {
      p.setEditingPipeline(pipeline);
      p.pipelineForm.reset({
        name: pipeline.name,
        slug: pipeline.slug,
        pipelineType: pipeline.pipelineType as "sales" | "qualification" | "support" | "custom",
        description: pipeline.description || "",
        aiPromptTemplate: pipeline.aiPromptTemplate || "",
        voiceAgentId: pipeline.voiceAgentId || "",
        isActive: pipeline.isActive,
      });
    } else {
      p.setEditingPipeline(null);
      p.pipelineForm.reset({
        name: "",
        slug: "",
        pipelineType: "sales",
        description: "",
        aiPromptTemplate: "",
        voiceAgentId: "",
        isActive: true,
      });
    }
    p.setIsPipelineDialogOpen(true);
  };

  const handlePipelineSubmit = (data: any) => {
    if (p.editingPipeline) {
      p.updatePipelineMutation.mutate({ id: p.editingPipeline.id, data });
    } else {
      p.createPipelineMutation.mutate(data);
    }
  };

  const handleOpenStageDialog = (stage?: any) => {
    if (stage) {
      p.setEditingStage(stage);
      p.stageForm.reset({
        name: stage.name,
        stageType: stage.stageType as "action" | "decision" | "wait" | "complete",
        isTerminal: stage.isTerminal,
      });
    } else {
      p.setEditingStage(null);
      p.stageForm.reset({
        name: "",
        stageType: "action",
        isTerminal: false,
      });
    }
    p.setIsStageDialogOpen(true);
  };

  const handleStageSubmit = (data: any) => {
    if (!p.selectedPipelineId) return;

    if (p.editingStage) {
      p.updateStageMutation.mutate({ pipelineId: p.selectedPipelineId, stageId: p.editingStage.id, data });
    } else {
      p.createStageMutation.mutate({ pipelineId: p.selectedPipelineId, data });
    }
  };

  const handleDeleteStage = (stage: any) => {
    if (!p.selectedPipelineId) return;
    p.setDeletingStageId(stage.id);
    p.deleteStageMutation.mutate({ pipelineId: p.selectedPipelineId, stageId: stage.id });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !p.selectedPipelineId) return;

    const stages = p.selectedPipelineData?.pipeline?.stages || [];
    const oldIndex = stages.findIndex((s: any) => s.id === active.id);
    const newIndex = stages.findIndex((s: any) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(stages, oldIndex, newIndex);
    const stageIds = newOrder.map((s: any) => s.id);

    p.reorderStagesMutation.mutate({ pipelineId: p.selectedPipelineId, stageIds });
  };

  const handleOpenProjectDialog = (project?: any) => {
    if (project) {
      p.setEditingProject(project);
      p.projectForm.reset({
        name: project.name,
        slug: project.slug,
        projectType: project.projectType as "campaign" | "case" | "initiative" | "custom",
        description: project.description || "",
        accentColor: project.accentColor || "#6366f1",
      });
    } else {
      p.setEditingProject(null);
      p.projectForm.reset({
        name: "",
        slug: "",
        projectType: "campaign",
        description: "",
        accentColor: "#6366f1",
      });
    }
    p.setIsProjectDialogOpen(true);
  };

  const handleProjectSubmit = (data: any) => {
    if (p.editingProject) {
      p.updateProjectMutation.mutate({ id: p.editingProject.id, data });
    } else {
      p.createProjectMutation.mutate(data);
    }
  };

  return {
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
  };
}
