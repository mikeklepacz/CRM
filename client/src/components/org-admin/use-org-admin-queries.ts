import { useQuery } from "@tanstack/react-query";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import type {
  ElevenLabsAgent,
  Pipeline,
  PipelineWithStages,
  Tenant,
  TenantInvite,
  TenantProject,
  TenantStats,
  TenantUser,
} from "@/components/org-admin/org-admin.types";

export function useOrgAdminQueries(props: any) {
  const p = props;
  const canAccess = canAccessAdminFeatures(p.user);

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: TenantUser[] }>({
    queryKey: ["/api/org-admin/users"],
    enabled: canAccess,
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<{ tenant: Tenant }>({
    queryKey: ["/api/org-admin/settings"],
    enabled: canAccess,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<TenantStats>({
    queryKey: ["/api/org-admin/stats"],
    enabled: canAccess,
  });

  const { data: invitesData, isLoading: invitesLoading } = useQuery<{ invites: TenantInvite[] }>({
    queryKey: ["/api/org-admin/invites"],
    enabled: canAccess,
  });

  const { data: pipelinesData, isLoading: pipelinesLoading } = useQuery<{ pipelines: Pipeline[] }>({
    queryKey: ["/api/org-admin/pipelines", p.currentProject?.id],
    queryFn: async () => {
      const url = new URL("/api/org-admin/pipelines", window.location.origin);
      if (p.currentProject?.id) {
        url.searchParams.set("projectId", p.currentProject.id);
      }
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch pipelines");
      return response.json();
    },
    enabled: canAccess,
  });

  const { data: selectedPipelineData, isLoading: selectedPipelineLoading } = useQuery<{ pipeline: PipelineWithStages }>({
    queryKey: ["/api/org-admin/pipelines", p.selectedPipelineId],
    enabled: canAccess && !!p.selectedPipelineId,
  });

  const { data: voiceAgentsData } = useQuery<{ agents: ElevenLabsAgent[] }>({
    queryKey: ["/api/elevenlabs/agents", p.currentProject?.id],
    queryFn: async () => {
      const url = new URL("/api/elevenlabs/agents", window.location.origin);
      if (p.currentProject?.id) {
        url.searchParams.set("projectId", p.currentProject.id);
      }
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch agents");
      return response.json();
    },
    enabled: canAccess,
  });

  const { data: projectsData, isLoading: projectsLoading } = useQuery<{ projects: TenantProject[] }>({
    queryKey: ["/api/org-admin/projects"],
    enabled: canAccess,
  });

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery<{ tenants: Array<{ id: string; name: string }> }>({
    queryKey: ["/api/super-admin/tenants"],
    enabled: !!p.user?.isSuperAdmin,
  });

  return {
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
  };
}
