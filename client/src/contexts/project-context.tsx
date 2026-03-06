import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface TenantProject {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  projectType: string;
  status: string;
  description: string | null;
  accentColor: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProjectContextValue {
  currentProject: TenantProject | null;
  projects: TenantProject[];
  isLoading: boolean;
  switchProject: (projectId: string) => void;
  refetchProjects: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const STORAGE_KEY = 'selected-project-id';
const tenantStorageKey = (tenantId?: string | null) => (tenantId ? `${STORAGE_KEY}:${tenantId}` : STORAGE_KEY);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const scoped = localStorage.getItem(tenantStorageKey(user?.tenantId));
    const legacy = localStorage.getItem(STORAGE_KEY);
    setSelectedProjectId(scoped || legacy);
  }, [user?.tenantId]);

  const { data: projectsData, isLoading, refetch } = useQuery<{ projects: TenantProject[] }>({
    queryKey: ['/api/tenant/projects', user?.tenantId || 'no-tenant', user?.isSuperAdmin ? 'super-admin' : 'standard'],
    queryFn: async () => {
      const isAdminContext = !!(user?.isSuperAdmin || user?.role === 'admin' || user?.roleInTenant === 'org_admin');

      if (isAdminContext) {
        const orgAdminResponse = await fetch('/api/org-admin/projects', { credentials: 'include' });
        if (orgAdminResponse.ok) {
          const orgAdminData = await orgAdminResponse.json();
          const projects = Array.isArray(orgAdminData?.projects) ? orgAdminData.projects : [];
          if (projects.length > 0) {
            return { projects };
          }
        }
      }

      const tenantResponse = await fetch('/api/tenant/projects', { credentials: 'include' });
      if (tenantResponse.ok) {
        const tenantData = await tenantResponse.json();
        const tenantProjects = Array.isArray(tenantData?.projects) ? tenantData.projects : [];
        if (tenantProjects.length > 0) {
          return { projects: tenantProjects };
        }
      }

      if (user?.isSuperAdmin && user?.tenantId) {
        const superAdminResponse = await fetch(`/api/super-admin/tenants/${user.tenantId}/projects`, { credentials: 'include' });
        if (superAdminResponse.ok) {
          const superAdminData = await superAdminResponse.json();
          const projects = Array.isArray(superAdminData) ? superAdminData : [];
          if (projects.length > 0) {
            return { projects };
          }
        }
      }

      return { projects: [] };
    },
    enabled: isAuthenticated
      && (
        user?.isSuperAdmin
        || user?.role === 'admin'
        || user?.roleInTenant === 'org_admin'
        || user?.roleInTenant === 'agent'
      ),
  });

  const projects = projectsData?.projects || [];

  const currentProject = projects.find(p => p.id === selectedProjectId) 
    || projects.find(p => p.isDefault) 
    || projects[0] 
    || null;

  useEffect(() => {
    if (currentProject && currentProject.id !== selectedProjectId) {
      setSelectedProjectId(currentProject.id);
      localStorage.setItem(STORAGE_KEY, currentProject.id);
      localStorage.setItem(tenantStorageKey(currentProject.tenantId), currentProject.id);
    }
  }, [currentProject, selectedProjectId]);

  const switchProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem(STORAGE_KEY, projectId);

    const selectedProject = projects.find((project) => project.id === projectId);
    const scopedTenantId = selectedProject?.tenantId || user?.tenantId;
    if (scopedTenantId) {
      localStorage.setItem(tenantStorageKey(scopedTenantId), projectId);
    }
  }, [projects, user?.tenantId]);

  const refetchProjects = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <ProjectContext.Provider value={{
      currentProject,
      projects,
      isLoading,
      switchProject,
      refetchProjects,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

export function useOptionalProject() {
  return useContext(ProjectContext);
}
