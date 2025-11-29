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

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  const { data: projectsData, isLoading, refetch } = useQuery<{ projects: TenantProject[] }>({
    queryKey: ['/api/org-admin/projects'],
    enabled: isAuthenticated && (user?.role === 'admin' || user?.roleInTenant === 'org_admin' || user?.roleInTenant === 'agent'),
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
    }
  }, [currentProject, selectedProjectId]);

  const switchProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem(STORAGE_KEY, projectId);
  }, []);

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
