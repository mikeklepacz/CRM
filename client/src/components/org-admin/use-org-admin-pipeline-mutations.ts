import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PipelineFormData, StageFormData } from "@/components/org-admin/org-admin-constants";

export function useOrgAdminPipelineMutations(props: any) {
  const p = props;

  const createPipelineMutation = useMutation({
    mutationFn: async (data: PipelineFormData) => {
      return await apiRequest("POST", "/api/org-admin/pipelines", {
        ...data,
        projectId: p.currentProject?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/pipelines"] });
      p.setIsPipelineDialogOpen(false);
      p.setEditingPipeline(null);
      p.pipelineForm.reset();
      p.toast({
        title: "Success",
        description: "Pipeline created successfully",
      });
    },
    onError: (error: any) => {
      p.toast({
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
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/pipelines"] });
      if (p.selectedPipelineId) {
        queryClient.invalidateQueries({ queryKey: ["/api/org-admin/pipelines", p.selectedPipelineId] });
      }
      p.setIsPipelineDialogOpen(false);
      p.setEditingPipeline(null);
      p.pipelineForm.reset();
      p.toast({
        title: "Success",
        description: "Pipeline updated successfully",
      });
    },
    onError: (error: any) => {
      p.toast({
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
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/pipelines"] });
      p.setPipelineToDelete(null);
      if (p.selectedPipelineId === p.pipelineToDelete?.id) {
        p.setSelectedPipelineId(null);
      }
      p.toast({
        title: "Success",
        description: "Pipeline deleted successfully",
      });
    },
    onError: (error: any) => {
      p.toast({
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
      if (p.selectedPipelineId) {
        queryClient.invalidateQueries({ queryKey: ["/api/org-admin/pipelines", p.selectedPipelineId] });
      }
      p.setIsStageDialogOpen(false);
      p.setEditingStage(null);
      p.stageForm.reset();
      p.toast({
        title: "Success",
        description: "Stage created successfully",
      });
    },
    onError: (error: any) => {
      p.toast({
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
      if (p.selectedPipelineId) {
        queryClient.invalidateQueries({ queryKey: ["/api/org-admin/pipelines", p.selectedPipelineId] });
      }
      p.setIsStageDialogOpen(false);
      p.setEditingStage(null);
      p.stageForm.reset();
      p.toast({
        title: "Success",
        description: "Stage updated successfully",
      });
    },
    onError: (error: any) => {
      p.toast({
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
      if (p.selectedPipelineId) {
        queryClient.invalidateQueries({ queryKey: ["/api/org-admin/pipelines", p.selectedPipelineId] });
      }
      p.setStageToDelete(null);
      p.setDeletingStageId(null);
      p.toast({
        title: "Success",
        description: "Stage deleted successfully",
      });
    },
    onError: (error: any) => {
      p.setDeletingStageId(null);
      p.toast({
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
      if (p.selectedPipelineId) {
        queryClient.invalidateQueries({ queryKey: ["/api/org-admin/pipelines", p.selectedPipelineId] });
      }
    },
    onError: (error: any) => {
      if (p.selectedPipelineId) {
        queryClient.invalidateQueries({ queryKey: ["/api/org-admin/pipelines", p.selectedPipelineId] });
      }
      p.toast({
        title: "Error",
        description: error.message || "Failed to reorder stages",
        variant: "destructive",
      });
    },
  });

  return {
    createPipelineMutation,
    createStageMutation,
    deletePipelineMutation,
    deleteStageMutation,
    reorderStagesMutation,
    updatePipelineMutation,
    updateStageMutation,
  };
}
