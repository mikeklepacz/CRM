import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProjectFormData } from "@/components/org-admin/org-admin-constants";

export function useOrgAdminProjectMutations(props: any) {
  const p = props;

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      return await apiRequest("POST", "/api/org-admin/projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/projects"] });
      p.projectContext?.refetchProjects();
      p.setIsProjectDialogOpen(false);
      p.setEditingProject(null);
      p.projectForm.reset();
      p.toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: (error: any) => {
      p.toast({
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
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/projects"] });
      p.projectContext?.refetchProjects();
      p.setIsProjectDialogOpen(false);
      p.setEditingProject(null);
      p.projectForm.reset();
      p.toast({
        title: "Success",
        description: "Project updated successfully",
      });
    },
    onError: (error: any) => {
      p.toast({
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
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/projects"] });
      p.projectContext?.refetchProjects();
      p.setProjectToArchive(null);
      p.toast({
        title: "Success",
        description: "Project archived successfully",
      });
    },
    onError: (error: any) => {
      p.toast({
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
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/projects"] });
      p.projectContext?.refetchProjects();
      p.toast({
        title: "Success",
        description: "Project restored successfully",
      });
    },
    onError: (error: any) => {
      p.toast({
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
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/projects"] });
      p.projectContext?.refetchProjects();
      p.toast({
        title: "Success",
        description: "Project set as default",
      });
    },
    onError: (error: any) => {
      p.toast({
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
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/projects"] });
      p.projectContext?.refetchProjects();
      p.setProjectToDelete(null);
      p.toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    },
    onError: (error: any) => {
      p.toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  return {
    archiveProjectMutation,
    createProjectMutation,
    deleteProjectMutation,
    restoreProjectMutation,
    setDefaultProjectMutation,
    updateProjectMutation,
  };
}
