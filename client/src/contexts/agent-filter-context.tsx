import { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { canAccessAdminFeatures } from '@/lib/authUtils';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  agentName: string | null;
  role: 'admin' | 'agent';
}

interface AgentFilterContextType {
  selectedAgentIds: string[];
  setSelectedAgentIds: (ids: string[]) => void;
  availableAgents: User[];
  isLoadingAgents: boolean;
  currentUser: User | null;
}

const AgentFilterContext = createContext<AgentFilterContextType | undefined>(undefined);

export function AgentFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  // Fetch all users (for admin to see available agents)
  const { data: usersData, isLoading: isLoadingAgents } = useQuery<{ users: User[] }>({
    queryKey: ['/api/users'],
    enabled: canAccessAdminFeatures(currentUser),
  });

  const availableAgents = usersData?.users || [];

  // Default to current user's ID when they first load
  useEffect(() => {
    if (currentUser && selectedAgentIds.length === 0) {
      setSelectedAgentIds([currentUser.id]);
    }
  }, [currentUser]);

  return (
    <AgentFilterContext.Provider
      value={{
        selectedAgentIds,
        setSelectedAgentIds,
        availableAgents,
        isLoadingAgents,
        currentUser,
      }}
    >
      {children}
    </AgentFilterContext.Provider>
  );
}

export function useAgentFilter() {
  const context = useContext(AgentFilterContext);
  if (context === undefined) {
    throw new Error('useAgentFilter must be used within AgentFilterProvider');
  }
  return context;
}
