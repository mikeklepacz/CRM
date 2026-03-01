import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { QualificationLead } from '@shared/schema';

type ToastFn = (args: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;

type NewLeadForm = {
  company: string;
  pocName: string;
  pocEmail: string;
  pocPhone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  website: string;
  source: string;
  notes: string;
  campaignId: string;
};

type Props = {
  currentProjectId?: string;
  currentProjectTenantId?: string;
  invalidateStats: () => void;
  refetchLeads: () => void;
  resetNewLead: () => void;
  setEditingLead: (lead: QualificationLead | null) => void;
  setIsAddLeadOpen: (open: boolean) => void;
  setIsEditLeadOpen: (open: boolean) => void;
  setSelectedLeads: React.Dispatch<React.SetStateAction<Set<string>>>;
  toast: ToastFn;
};

export function useQualificationLeadMutations(props: Props) {
  const createLeadMutation = useMutation({
    mutationFn: async (leadData: NewLeadForm) => {
      if (!props.currentProjectTenantId) {
        throw new Error('Tenant ID not found');
      }
      return apiRequest('POST', '/api/qualification/leads', {
        ...leadData,
        tenantId: props.currentProjectTenantId,
        projectId: props.currentProjectId,
      });
    },
    onSuccess: () => {
      props.toast({ title: 'Lead created successfully' });
      props.refetchLeads();
      props.invalidateStats();
      props.setIsAddLeadOpen(false);
      props.resetNewLead();
    },
    onError: (error: Error) => {
      props.toast({ title: 'Failed to create lead', description: error.message, variant: 'destructive' });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NewLeadForm> }) => {
      return apiRequest('PATCH', `/api/qualification/leads/${id}`, data);
    },
    onSuccess: () => {
      props.toast({ title: 'Lead updated successfully' });
      props.refetchLeads();
      props.invalidateStats();
      props.setIsEditLeadOpen(false);
      props.setEditingLead(null);
    },
    onError: (error: Error) => {
      props.toast({ title: 'Failed to update lead', description: error.message, variant: 'destructive' });
    },
  });

  const deleteLeadsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return apiRequest('POST', '/api/qualification/leads/bulk-delete', { ids });
    },
    onSuccess: (data: any) => {
      props.toast({ title: `${data.deleted} leads deleted` });
      props.refetchLeads();
      props.invalidateStats();
      props.setSelectedLeads(new Set());
    },
    onError: (error: Error) => {
      props.toast({ title: 'Failed to delete leads', description: error.message, variant: 'destructive' });
    },
  });

  return { createLeadMutation, deleteLeadsMutation, updateLeadMutation };
}
