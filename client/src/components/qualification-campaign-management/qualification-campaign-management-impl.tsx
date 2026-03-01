import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { QualificationCampaign } from "@shared/schema";
import type { FieldDefinition } from "@/components/qualification-campaign-management/types";
import { generateKnowledgeBasePrompt } from "@/components/qualification-campaign-management/prompt-utils";
import { DATA_COLLECTION_PLACEHOLDERS } from "@/components/qualification-campaign-management/constants";
import { QualificationCampaignList } from "@/components/qualification-campaign-management/campaign-list";
import { QualificationCampaignEditorDialog } from "@/components/qualification-campaign-management/campaign-editor-dialog";

export function QualificationCampaignManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<QualificationCampaign | null>(null);
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
  });
  
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([]);
  const [newField, setNewField] = useState<FieldDefinition>({
    key: '',
    label: '',
    type: 'text',
    required: false,
    weight: 1,
    order: 0,
    isKnockout: false,
    knockoutAnswer: undefined,
  });
  const [newOption, setNewOption] = useState('');
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fieldKeyOpen, setFieldKeyOpen] = useState(false);
  const [isCustomKey, setIsCustomKey] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [fieldKeySearch, setFieldKeySearch] = useState('');

  const copyKnowledgeBasePrompt = (campaign: QualificationCampaign) => {
    const fields = (campaign.fieldDefinitions as FieldDefinition[]) || [];
    const prompt = generateKnowledgeBasePrompt(fields);
    
    if (!prompt) {
      toast({ title: "No fields to copy", description: "Add qualification fields first", variant: "destructive" });
      return;
    }
    
    navigator.clipboard.writeText(prompt);
    toast({ 
      title: "Copied to clipboard", 
      description: "Paste this into your voice agent's knowledge base" 
    });
  };

  const { data: campaignsData, isLoading } = useQuery<{ campaigns: QualificationCampaign[] }>({
    queryKey: ['/api/qualification/campaigns'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/qualification/campaigns', data);
    },
    onSuccess: () => {
      toast({ title: "Campaign created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/qualification/campaigns'] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create campaign", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest('PATCH', `/api/qualification/campaigns/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Campaign updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/qualification/campaigns'] });
      setIsEditOpen(false);
      setSelectedCampaign(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update campaign", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/qualification/campaigns/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Campaign deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/qualification/campaigns'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete campaign", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', isActive: true });
    setFieldDefinitions([]);
    resetFieldForm();
  };

  const resetFieldForm = () => {
    setNewField({ key: '', label: '', type: 'text', required: false, weight: 1, order: 0, isKnockout: false, knockoutAnswer: undefined });
    setEditingFieldIndex(null);
    setNewOption('');
    setIsCustomKey(false);
    setCustomKeyInput('');
    setFieldKeyOpen(false);
    setFieldKeySearch('');
  };

  const startEditField = (index: number) => {
    const field = fieldDefinitions[index];
    setNewField({ ...field });
    setEditingFieldIndex(index);
    
    // Check if this is a custom key (not in predefined list)
    const isPredefined = DATA_COLLECTION_PLACEHOLDERS.some(p => p.key === field.key);
    setIsCustomKey(!isPredefined);
    if (!isPredefined) {
      setCustomKeyInput(field.key);
    }
  };

  const saveField = () => {
    if (!newField.key.trim() || !newField.label.trim()) {
      toast({ title: "Field key and label are required", variant: "destructive" });
      return;
    }
    const key = newField.key.trim().toLowerCase().replace(/\s+/g, '_');
    
    if (editingFieldIndex !== null) {
      // Update existing field
      setFieldDefinitions(prev => prev.map((f, i) => i === editingFieldIndex ? { ...newField, key } : f));
    } else {
      // Add new field
      if (fieldDefinitions.some(f => f.key === key)) {
        toast({ title: "Field key already exists", variant: "destructive" });
        return;
      }
      setFieldDefinitions(prev => [...prev, { ...newField, key, order: prev.length }]);
    }
    resetFieldForm();
  };

  const openEdit = (campaign: QualificationCampaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      isActive: campaign.isActive ?? true,
    });
    setFieldDefinitions((campaign.fieldDefinitions as FieldDefinition[]) || []);
    setIsEditOpen(true);
  };

  const handleCreateSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Campaign name is required", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      isActive: formData.isActive,
      fieldDefinitions,
    });
  };

  const handleUpdateSubmit = () => {
    if (!selectedCampaign) return;
    if (!formData.name.trim()) {
      toast({ title: "Campaign name is required", variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      id: selectedCampaign.id,
      data: {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        isActive: formData.isActive,
        fieldDefinitions,
      },
    });
  };


  const removeField = (index: number) => {
    setFieldDefinitions(prev => prev.filter((_, i) => i !== index));
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    setNewField(prev => ({
      ...prev,
      options: [...(prev.options || []), newOption.trim()],
    }));
    setNewOption('');
  };

  const removeOption = (index: number) => {
    setNewField(prev => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== index),
    }));
  };

  const campaigns = campaignsData?.campaigns || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Qualification Campaigns</h3>
          <p className="text-sm text-muted-foreground">
            Define qualification questions and scoring rules for lead screening
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-campaign">
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      <QualificationCampaignList
        campaigns={campaigns}
        setIsCreateOpen={setIsCreateOpen}
        copyKnowledgeBasePrompt={copyKnowledgeBasePrompt}
        openEdit={openEdit}
        deleteMutation={deleteMutation}
      />
      <QualificationCampaignEditorDialog
        isCreateOpen={isCreateOpen}
        setIsCreateOpen={setIsCreateOpen}
        isEditOpen={isEditOpen}
        setIsEditOpen={setIsEditOpen}
        setSelectedCampaign={setSelectedCampaign}
        resetForm={resetForm}
        formData={formData}
        setFormData={setFormData}
        fieldDefinitions={fieldDefinitions}
        newField={newField}
        setNewField={setNewField}
        newOption={newOption}
        setNewOption={setNewOption}
        editingFieldIndex={editingFieldIndex}
        fieldKeyOpen={fieldKeyOpen}
        setFieldKeyOpen={setFieldKeyOpen}
        isCustomKey={isCustomKey}
        setIsCustomKey={setIsCustomKey}
        customKeyInput={customKeyInput}
        setCustomKeyInput={setCustomKeyInput}
        fieldKeySearch={fieldKeySearch}
        setFieldKeySearch={setFieldKeySearch}
        startEditField={startEditField}
        saveField={saveField}
        removeField={removeField}
        addOption={addOption}
        removeOption={removeOption}
        resetFieldForm={resetFieldForm}
        createMutation={createMutation}
        updateMutation={updateMutation}
        handleCreateSubmit={handleCreateSubmit}
        handleUpdateSubmit={handleUpdateSubmit}
      />
    </div>
  );
}
