import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptionalProject } from "@/contexts/project-context";
import { useToast } from "@/hooks/use-toast";
import type { QualificationLead, QualificationCampaign, CallSession, CallTranscript } from "@shared/schema";
import { LeadDetailsDialog, TranscriptDialog } from "@/components/qualification/qualification-dialogs";
import { QualificationImportDialog } from "@/components/qualification/qualification-import-dialog";
import { AddLeadDialog, EditLeadDialog } from "@/components/qualification/qualification-lead-form-dialogs";
import { QualificationPageHeader } from "@/components/qualification/qualification-page-header";
import { QualificationStatsGrid } from "@/components/qualification/qualification-stats-grid";
import { QualificationLeadsTableCard } from "@/components/qualification/qualification-leads-table-card";
import { useQualificationTableLogic } from "@/components/qualification/use-qualification-table-logic";
import { useQualificationLeadMutations } from "@/components/qualification/use-qualification-lead-mutations";
import { useQualificationImportWorkflow } from "@/components/qualification/use-qualification-import-workflow";
import { type SortDirection, type SortField } from "@/components/qualification/qualification-utils";

export default function Qualification() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectContext = useOptionalProject();
  const currentProject = projectContext?.currentProject;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [callStatusFilter, setCallStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<QualificationLead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [newLead, setNewLead] = useState({
    company: '',
    pocName: '',
    pocEmail: '',
    pocPhone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    website: '',
    source: '',
    notes: '',
    campaignId: '',
  });
  
  const [isEditLeadOpen, setIsEditLeadOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<QualificationLead | null>(null);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [transcriptData, setTranscriptData] = useState<{ transcripts: CallTranscript[]; callSession: CallSession | null } | null>(null);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);

  const { data: leadsData, isLoading: leadsLoading, refetch: refetchLeads } = useQuery<{ leads: QualificationLead[]; total: number }>({
    queryKey: ['/api/qualification/leads', statusFilter, callStatusFilter, currentProject?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (callStatusFilter !== 'all') params.set('callStatus', callStatusFilter);
      if (currentProject?.id) params.set('projectId', currentProject.id);
      params.set('limit', '500');
      const response = await fetch(`/api/qualification/leads?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      return response.json();
    },
  });

  const { data: statsData } = useQuery<{ stats: { total: number; byStatus: Record<string, number>; byCallStatus: Record<string, number>; averageScore: number | null } }>({
    queryKey: ['/api/qualification/leads/stats', currentProject?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentProject?.id) params.set('projectId', currentProject.id);
      const response = await fetch(`/api/qualification/leads/stats?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  const { data: campaignsData } = useQuery<{ campaigns: QualificationCampaign[] }>({
    queryKey: ['/api/qualification/campaigns'],
  });

  const invalidateStats = () => queryClient.invalidateQueries({ queryKey: ['/api/qualification/leads/stats'] });

  const {
    bulkImportMutation,
    columnMapping,
    csvData,
    fileInputRef,
    getPreviewLeads,
    handleFileUpload,
    handleImport,
    importStep,
    isImportOpen,
    resetImport,
    setColumnMapping,
    setCsvData,
    setImportStep,
    setIsImportOpen,
  } = useQualificationImportWorkflow({
    currentProjectId: currentProject?.id,
    invalidateStats,
    refetchLeads,
    toast,
  });

  const { createLeadMutation, deleteLeadsMutation, updateLeadMutation } = useQualificationLeadMutations({
    currentProjectId: currentProject?.id,
    currentProjectTenantId: currentProject?.tenantId,
    invalidateStats,
    refetchLeads,
    resetNewLead: () =>
      setNewLead({
        company: '',
        pocName: '',
        pocEmail: '',
        pocPhone: '',
        address: '',
        city: '',
        state: '',
        country: '',
        website: '',
        source: '',
        notes: '',
        campaignId: '',
      }),
    setEditingLead,
    setIsAddLeadOpen,
    setIsEditLeadOpen,
    setSelectedLeads,
    toast,
  });


  const leads = leadsData?.leads || [];
  const stats = statsData?.stats;
  const campaigns = campaignsData?.campaigns || [];

  const { filteredAndSortedLeads, handleSort, toggleSelectAll, toggleSelectLead } = useQualificationTableLogic({
    leads,
    searchQuery,
    selectedLeads,
    setSelectedLeads,
    setSortDirection,
    setSortField,
    sortDirection,
    sortField,
  });

  const handleDeleteSelected = () => {
    if (selectedLeads.size > 0) {
      deleteLeadsMutation.mutate(Array.from(selectedLeads));
    }
  };

  const openLeadDetail = (lead: QualificationLead) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };

  const handleViewTranscript = async (conversationId: string) => {
    setIsLoadingTranscript(true);
    try {
      const response = await fetch(`/api/call-sessions/${conversationId}`);
      if (!response.ok) throw new Error('Failed to fetch transcript');
      const data = await response.json();
      setTranscriptData({ transcripts: data.transcripts || [], callSession: data.session || null });
      setIsTranscriptOpen(true);
    } catch (error) {
      toast({ title: 'Failed to load transcript', variant: 'destructive' });
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <QualificationPageHeader
        onAddLead={() => setIsAddLeadOpen(true)}
        onImport={() => setIsImportOpen(true)}
        onRefresh={() => refetchLeads()}
      />

      <QualificationStatsGrid
        totalLeads={stats?.total || 0}
        qualifiedLeads={stats?.byStatus?.['qualified'] || 0}
        pendingCalls={stats?.byCallStatus?.['pending'] || 0}
        averageScore={stats?.averageScore}
      />

      <QualificationLeadsTableCard
        callStatusFilter={callStatusFilter}
        deletePending={deleteLeadsMutation.isPending}
        filteredAndSortedLeads={filteredAndSortedLeads}
        leadsLoading={leadsLoading}
        onDeleteLead={(id) => deleteLeadsMutation.mutate([id])}
        onDeleteSelected={handleDeleteSelected}
        onEditLead={(lead) => {
          setEditingLead(lead);
          setIsEditLeadOpen(true);
        }}
        onOpenLeadDetail={openLeadDetail}
        onSelectAll={toggleSelectAll}
        onSelectLead={toggleSelectLead}
        onSetCallStatusFilter={setCallStatusFilter}
        onSetSearchQuery={setSearchQuery}
        onSetStatusFilter={setStatusFilter}
        onSort={handleSort}
        onStartAddLead={() => setIsAddLeadOpen(true)}
        searchQuery={searchQuery}
        selectedLeads={selectedLeads}
        sortDirection={sortDirection}
        sortField={sortField}
        statusFilter={statusFilter}
      />

      <AddLeadDialog
        isAddLeadOpen={isAddLeadOpen}
        setIsAddLeadOpen={setIsAddLeadOpen}
        newLead={newLead}
        setNewLead={setNewLead}
        campaigns={campaignsData?.campaigns || []}
        isCreatePending={createLeadMutation.isPending}
        onCreate={() => createLeadMutation.mutate(newLead)}
      />

      <LeadDetailsDialog
        isDetailOpen={isDetailOpen}
        selectedLead={selectedLead}
        setIsDetailOpen={setIsDetailOpen}
        onViewTranscript={handleViewTranscript}
        isLoadingTranscript={isLoadingTranscript}
      />

      <EditLeadDialog
        isEditLeadOpen={isEditLeadOpen}
        setIsEditLeadOpen={setIsEditLeadOpen}
        editingLead={editingLead}
        setEditingLead={setEditingLead}
        campaigns={campaignsData?.campaigns || []}
        isUpdatePending={updateLeadMutation.isPending}
        onUpdate={() => {
          if (editingLead) {
            updateLeadMutation.mutate({
              id: editingLead.id,
              data: ({
                company: editingLead.company,
                website: editingLead.website ?? undefined,
                pocName: editingLead.pocName ?? undefined,
                pocEmail: editingLead.pocEmail ?? undefined,
                pocPhone: editingLead.pocPhone ?? undefined,
                city: editingLead.city ?? undefined,
                state: editingLead.state ?? undefined,
                country: editingLead.country ?? undefined,
                campaignId: editingLead.campaignId ?? undefined,
                status: editingLead.status,
                notes: editingLead.notes ?? undefined,
              } as any),
            });
          }
        }}
      />

      <QualificationImportDialog
        isImportOpen={isImportOpen}
        setIsImportOpen={setIsImportOpen}
        resetImport={resetImport}
        fileInputRef={fileInputRef}
        handleFileUpload={handleFileUpload}
        importStep={importStep}
        setImportStep={setImportStep}
        csvData={csvData}
        columnMapping={columnMapping}
        setColumnMapping={setColumnMapping}
        setCsvData={setCsvData}
        getPreviewLeads={getPreviewLeads}
        handleImport={handleImport}
        isImportPending={bulkImportMutation.isPending}
      />

      <TranscriptDialog
        isTranscriptOpen={isTranscriptOpen}
        setIsTranscriptOpen={setIsTranscriptOpen}
        transcriptData={transcriptData}
      />

    </div>
  );
}
