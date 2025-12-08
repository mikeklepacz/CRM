import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Plus, Trash2, Edit, Loader2, GripVertical, Settings, Copy, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { QualificationCampaign } from "@shared/schema";

// Predefined data collection placeholders matching ElevenLabs configuration
const DATA_COLLECTION_PLACEHOLDERS = [
  // Interest & Outcome
  { key: "interest_level", label: "Interest Level", category: "Interest & Outcome" },
  { key: "objections", label: "Objections", category: "Interest & Outcome" },
  { key: "follow_up_needed", label: "Follow-up Needed", category: "Interest & Outcome" },
  { key: "follow_up_date", label: "Follow-up Date", category: "Interest & Outcome" },
  // Point of Contact
  { key: "poc_name", label: "Contact Name", category: "Point of Contact" },
  { key: "poc_email", label: "Contact Email", category: "Point of Contact" },
  { key: "poc_phone", label: "Contact Phone", category: "Point of Contact" },
  { key: "poc_title", label: "Contact Title", category: "Point of Contact" },
  // Shipping Information
  { key: "shipping_name", label: "Shipping Name", category: "Shipping" },
  { key: "shipping_address", label: "Shipping Address", category: "Shipping" },
  { key: "shipping_city", label: "Shipping City", category: "Shipping" },
  { key: "shipping_state", label: "Shipping State", category: "Shipping" },
  // Business Intelligence
  { key: "current_supplier", label: "Current Supplier", category: "Business Intelligence" },
  { key: "monthly_volume", label: "Monthly Volume", category: "Business Intelligence" },
  { key: "decision_maker", label: "Decision Maker", category: "Business Intelligence" },
  { key: "business_type", label: "Business Type", category: "Business Intelligence" },
  { key: "pain_points", label: "Pain Points", category: "Business Intelligence" },
  { key: "next_action", label: "Next Action", category: "Business Intelligence" },
  { key: "notes", label: "Notes", category: "Business Intelligence" },
];

// Group placeholders by category
const PLACEHOLDER_CATEGORIES = DATA_COLLECTION_PLACEHOLDERS.reduce((acc, placeholder) => {
  if (!acc[placeholder.category]) {
    acc[placeholder.category] = [];
  }
  acc[placeholder.category].push(placeholder);
  return acc;
}, {} as Record<string, typeof DATA_COLLECTION_PLACEHOLDERS>);

interface FieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'choice' | 'multichoice' | 'date' | 'boolean';
  options?: string[];
  required?: boolean;
  weight?: number;
  order?: number;
  isKnockout?: boolean;
  knockoutAnswer?: string | string[] | boolean;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'choice', label: 'Single Choice' },
  { value: 'multichoice', label: 'Multiple Choice' },
  { value: 'date', label: 'Date' },
];

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

  // Generate knowledge base prompt for a campaign
  const generateKnowledgeBasePrompt = (fields: FieldDefinition[]): string => {
    if (fields.length === 0) return '';
    
    let prompt = `During the call, collect answers to the following qualification questions. Store each answer in the corresponding placeholder field:\n\n`;
    
    fields.forEach((field, index) => {
      prompt += `${index + 1}. Question: "${field.label}"\n`;
      prompt += `   → Store answer in: {{${field.key}}}\n`;
      prompt += `   → Type: ${field.type}`;
      if (field.required) prompt += ` (Required)`;
      if (field.isKnockout) prompt += ` [KNOCKOUT - must match expected answer]`;
      prompt += `\n`;
      
      if (field.options && field.options.length > 0) {
        prompt += `   → Valid options: ${field.options.join(', ')}\n`;
      }
      
      if (field.isKnockout && field.knockoutAnswer !== undefined) {
        const answer = Array.isArray(field.knockoutAnswer) 
          ? field.knockoutAnswer.join(' or ') 
          : String(field.knockoutAnswer);
        prompt += `   → Expected answer to qualify: ${answer}\n`;
      }
      
      prompt += `\n`;
    });
    
    return prompt.trim();
  };

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

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No campaigns created yet.</p>
            <Button onClick={() => setIsCreateOpen(true)} className="mt-4" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {campaign.name}
                    {campaign.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </CardTitle>
                  {campaign.description && (
                    <CardDescription className="mt-1">{campaign.description}</CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyKnowledgeBasePrompt(campaign)}
                    data-testid={`button-copy-campaign-${campaign.id}`}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy for KB
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(campaign)} data-testid={`button-edit-campaign-${campaign.id}`}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this campaign?')) {
                        deleteMutation.mutate(campaign.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-campaign-${campaign.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {(campaign.fieldDefinitions as FieldDefinition[])?.length || 0} qualification fields defined
                </div>
                {(campaign.fieldDefinitions as FieldDefinition[])?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(campaign.fieldDefinitions as FieldDefinition[]).map((field, idx) => (
                      <Badge key={idx} variant="outline">
                        {field.label} ({field.type})
                        {field.weight && field.weight > 1 && ` [×${field.weight}]`}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          setSelectedCampaign(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{isEditOpen ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
            <DialogDescription>
              Define the qualification questions and scoring for this campaign
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Polish Tyre Cartel 2024"
                  data-testid="input-campaign-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this qualification campaign"
                  data-testid="input-campaign-description"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  data-testid="switch-campaign-active"
                />
                <Label htmlFor="active">Campaign Active</Label>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Qualification Fields</Label>
                <Badge variant="secondary">{fieldDefinitions.length} fields</Badge>
              </div>

              {fieldDefinitions.length > 0 && (
                <div className="space-y-2">
                  {fieldDefinitions.map((field, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer transition-colors ${editingFieldIndex === index ? 'bg-primary/10 border-primary' : 'bg-muted/30 hover-elevate'}`}
                      onClick={() => startEditField(index)}
                      data-testid={`field-item-${index}`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{field.label}</span>
                        <code className="text-muted-foreground ml-2 text-sm bg-muted/50 px-1 rounded">{`{{${field.key}}}`}</code>
                      </div>
                      <Badge variant="outline">{field.type}</Badge>
                      {field.required && <Badge variant="secondary">Required</Badge>}
                      {field.isKnockout && <Badge variant="destructive">Knockout</Badge>}
                      {field.weight && field.weight > 1 && (
                        <Badge variant="secondary">Weight: {field.weight}</Badge>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { e.stopPropagation(); removeField(index); }}
                        data-testid={`button-remove-field-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Card className={editingFieldIndex !== null ? 'border-primary' : ''}>
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">
                    {editingFieldIndex !== null ? 'Edit Field' : 'Add New Field'}
                  </CardTitle>
                  {editingFieldIndex !== null && (
                    <Button variant="ghost" size="sm" onClick={resetFieldForm} data-testid="button-cancel-edit-field">
                      Cancel
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="field-label">Question Label</Label>
                      <Input
                        id="field-label"
                        value={newField.label}
                        onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
                        placeholder="Did you purchase tyres?"
                        data-testid="input-field-label"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Field Key (Placeholder)</Label>
                      {isCustomKey ? (
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{`{{`}</span>
                            <Input
                              value={customKeyInput}
                              onChange={(e) => {
                                const value = e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                                setCustomKeyInput(value);
                                setNewField(prev => ({ ...prev, key: value }));
                              }}
                              placeholder="custom_key"
                              className="px-7"
                              data-testid="input-custom-field-key"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{`}}`}</span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setIsCustomKey(false);
                              setCustomKeyInput('');
                              setNewField(prev => ({ ...prev, key: '' }));
                            }}
                            data-testid="button-cancel-custom-key"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Popover open={fieldKeyOpen} onOpenChange={setFieldKeyOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={fieldKeyOpen}
                              className="w-full justify-between font-normal"
                              data-testid="combobox-field-key"
                            >
                              {newField.key ? (
                                <code className="text-sm">{`{{${newField.key}}}`}</code>
                              ) : (
                                <span className="text-muted-foreground">Select placeholder...</span>
                              )}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0 max-h-[350px]" align="start">
                            <Command className="flex flex-col max-h-[350px]">
                              <CommandInput placeholder="Search placeholders..." />
                              <CommandList className="flex-1 max-h-[280px] overflow-y-auto">
                                <CommandEmpty>
                                  <div className="py-4 text-center">
                                    <p className="text-sm text-muted-foreground mb-2">No placeholder found.</p>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setIsCustomKey(true);
                                        setFieldKeyOpen(false);
                                      }}
                                      data-testid="button-create-custom-empty"
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Create custom placeholder
                                    </Button>
                                  </div>
                                </CommandEmpty>
                                {Object.entries(PLACEHOLDER_CATEGORIES).map(([category, placeholders]) => (
                                  <CommandGroup key={category} heading={category}>
                                    {placeholders.map((placeholder) => (
                                      <CommandItem
                                        key={placeholder.key}
                                        value={placeholder.key}
                                        onSelect={() => {
                                          setNewField(prev => ({ ...prev, key: placeholder.key }));
                                          setFieldKeyOpen(false);
                                        }}
                                        data-testid={`option-placeholder-${placeholder.key}`}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            newField.key === placeholder.key ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <code className="text-xs">{`{{${placeholder.key}}}`}</code>
                                          <span className="text-xs text-muted-foreground">{placeholder.label}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                ))}
                                <CommandSeparator />
                                <CommandGroup heading="Custom" forceMount>
                                  <CommandItem
                                    value="__custom__ custom create new placeholder"
                                    onSelect={() => {
                                      setIsCustomKey(true);
                                      setFieldKeyOpen(false);
                                    }}
                                    data-testid="option-custom-key"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    <span>Add custom placeholder...</span>
                                  </CommandItem>
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="field-type">Type</Label>
                      <Select
                        value={newField.type}
                        onValueChange={(value: any) => setNewField(prev => ({ 
                          ...prev, 
                          type: value, 
                          options: value === 'choice' || value === 'multichoice' ? (prev.options || []) : undefined,
                          knockoutAnswer: undefined,
                        }))}
                      >
                        <SelectTrigger data-testid="select-field-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="field-weight">Weight (1-10)</Label>
                      <Input
                        id="field-weight"
                        type="number"
                        min={1}
                        max={10}
                        value={newField.weight}
                        onChange={(e) => setNewField(prev => ({ ...prev, weight: parseInt(e.target.value) || 1 }))}
                        data-testid="input-field-weight"
                      />
                    </div>
                    <div className="space-y-1 flex items-end">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="field-required"
                          checked={newField.required}
                          onCheckedChange={(checked) => setNewField(prev => ({ ...prev, required: checked }))}
                          data-testid="switch-field-required"
                        />
                        <Label htmlFor="field-required">Required</Label>
                      </div>
                    </div>
                  </div>

                  {(newField.type === 'choice' || newField.type === 'multichoice') && (
                    <div className="space-y-2">
                      <Label>Options</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newOption}
                          onChange={(e) => setNewOption(e.target.value)}
                          placeholder="Add option"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                          data-testid="input-option"
                        />
                        <Button type="button" variant="outline" onClick={addOption} data-testid="button-add-option">
                          Add
                        </Button>
                      </div>
                      {newField.options && newField.options.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {newField.options.map((opt, idx) => (
                            <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => removeOption(idx)}>
                              {opt} ×
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="field-knockout"
                        checked={newField.isKnockout}
                        onCheckedChange={(checked) => setNewField(prev => ({ 
                          ...prev, 
                          isKnockout: checked,
                          knockoutAnswer: checked ? (prev.type === 'boolean' ? true : '') : undefined,
                        }))}
                        data-testid="switch-field-knockout"
                      />
                      <Label htmlFor="field-knockout" className="font-medium">Knockout Question</Label>
                    </div>
                    {newField.isKnockout && (
                      <p className="text-xs text-muted-foreground">
                        If the answer doesn't match the expected value, the lead will be disqualified.
                      </p>
                    )}

                    {newField.isKnockout && (
                      <div className="space-y-2 p-3 border rounded-md bg-destructive/5">
                        <Label>Expected Answer (to qualify)</Label>
                        {newField.type === 'boolean' && (
                          <Select
                            value={String(newField.knockoutAnswer)}
                            onValueChange={(value) => setNewField(prev => ({ ...prev, knockoutAnswer: value === 'true' }))}
                          >
                            <SelectTrigger data-testid="select-knockout-answer">
                              <SelectValue placeholder="Select expected answer" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {newField.type === 'choice' && newField.options && newField.options.length > 0 && (
                          <Select
                            value={String(newField.knockoutAnswer || '')}
                            onValueChange={(value) => setNewField(prev => ({ ...prev, knockoutAnswer: value }))}
                          >
                            <SelectTrigger data-testid="select-knockout-answer">
                              <SelectValue placeholder="Select expected answer" />
                            </SelectTrigger>
                            <SelectContent>
                              {newField.options.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {newField.type === 'multichoice' && newField.options && newField.options.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Select options that qualify (at least one must match):</p>
                            <div className="flex flex-wrap gap-2">
                              {newField.options.map((opt) => {
                                const selected = Array.isArray(newField.knockoutAnswer) && newField.knockoutAnswer.includes(opt);
                                return (
                                  <Badge 
                                    key={opt} 
                                    variant={selected ? "default" : "outline"}
                                    className="cursor-pointer"
                                    onClick={() => {
                                      const current = Array.isArray(newField.knockoutAnswer) ? newField.knockoutAnswer : [];
                                      const updated = selected 
                                        ? current.filter(v => v !== opt)
                                        : [...current, opt];
                                      setNewField(prev => ({ ...prev, knockoutAnswer: updated }));
                                    }}
                                  >
                                    {opt}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {(newField.type === 'text' || newField.type === 'number' || newField.type === 'date') && (
                          <Input
                            value={String(newField.knockoutAnswer || '')}
                            onChange={(e) => setNewField(prev => ({ ...prev, knockoutAnswer: e.target.value }))}
                            placeholder={newField.type === 'number' ? "Minimum value" : "Expected value or pattern"}
                            data-testid="input-knockout-answer"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  <Button type="button" onClick={saveField} className="w-full" variant={editingFieldIndex !== null ? "default" : "outline"} data-testid="button-save-field">
                    {editingFieldIndex !== null ? (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        Update Field
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateOpen(false);
              setIsEditOpen(false);
              setSelectedCampaign(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={isEditOpen ? handleUpdateSubmit : handleCreateSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-campaign"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEditOpen ? 'Save Changes' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
