import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useOptionalProject } from "@/contexts/project-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Filter, Phone, Mail, Building2, MapPin, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Trash2, Download, Upload, RefreshCw, MoreVertical, Eye, Edit, PhoneCall, FileSpreadsheet, AlertCircle, CheckCircle2, Map } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as globalQueryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import type { QualificationLead, QualificationCampaign } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";

const LEAD_FIELD_OPTIONS = [
  { value: 'company', label: 'Company Name' },
  { value: 'pocName', label: 'Contact Name' },
  { value: 'pocEmail', label: 'Email' },
  { value: 'pocPhone', label: 'Phone' },
  { value: 'pocRole', label: 'Role/Title' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State/Region' },
  { value: 'postalCode', label: 'Postal Code' },
  { value: 'country', label: 'Country' },
  { value: 'website', label: 'Website' },
  { value: 'notes', label: 'Notes' },
  { value: 'skip', label: '-- Skip Column --' },
];

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
}

type SortField = 'company' | 'pocName' | 'status' | 'callStatus' | 'score' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'not_qualified', 'followup', 'please_email', 'closed'];
const CALL_STATUS_OPTIONS = ['pending', 'scheduled', 'in_progress', 'completed', 'failed', 'no_answer'];

const getStatusBadgeVariant = (status?: string | null): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'qualified':
      return 'default';
    case 'not_qualified':
      return 'destructive';
    case 'new':
    case 'contacted':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getCallStatusBadgeVariant = (status?: string | null): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'completed':
      return 'default';
    case 'failed':
    case 'no_answer':
      return 'destructive';
    case 'in_progress':
    case 'scheduled':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default function Qualification() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
  const [importStep, setImportStep] = useState<'upload' | 'map' | 'preview'>('upload');
  
  
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

  const createLeadMutation = useMutation({
    mutationFn: async (leadData: typeof newLead) => {
      const tenantId = currentProject?.tenantId;
      const projectId = currentProject?.id;
      if (!tenantId) {
        throw new Error('Tenant ID not found');
      }
      return apiRequest('POST', '/api/qualification/leads', {
        ...leadData,
        tenantId,
        projectId,
      });
    },
    onSuccess: () => {
      toast({ title: "Lead created successfully" });
      refetchLeads();
      queryClient.invalidateQueries({ queryKey: ['/api/qualification/leads/stats'] });
      setIsAddLeadOpen(false);
      setNewLead({
        company: '', pocName: '', pocEmail: '', pocPhone: '',
        address: '', city: '', state: '', country: '',
        website: '', source: '', notes: '', campaignId: '',
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create lead", description: error.message, variant: "destructive" });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof newLead> }) => {
      return apiRequest('PATCH', `/api/qualification/leads/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Lead updated successfully" });
      refetchLeads();
      queryClient.invalidateQueries({ queryKey: ['/api/qualification/leads/stats'] });
      setIsEditLeadOpen(false);
      setEditingLead(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update lead", description: error.message, variant: "destructive" });
    },
  });

  const deleteLeadsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return apiRequest('POST', '/api/qualification/leads/bulk-delete', { ids });
    },
    onSuccess: (data: any) => {
      toast({ title: `${data.deleted} leads deleted` });
      refetchLeads();
      queryClient.invalidateQueries({ queryKey: ['/api/qualification/leads/stats'] });
      setSelectedLeads(new Set());
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete leads", description: error.message, variant: "destructive" });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (leads: any[]) => {
      return apiRequest('POST', '/api/qualification/leads/bulk', { leads });
    },
    onSuccess: (data: any) => {
      toast({ title: `${data.count} leads imported successfully` });
      refetchLeads();
      queryClient.invalidateQueries({ queryKey: ['/api/qualification/leads/stats'] });
      resetImport();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to import leads", description: error.message, variant: "destructive" });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setCsvData(parsed);
      
      const autoMapping: Record<number, string> = {};
      parsed.headers.forEach((header, index) => {
        const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (lowerHeader.includes('company') || lowerHeader.includes('business') || lowerHeader.includes('name')) {
          autoMapping[index] = 'company';
        } else if (lowerHeader.includes('contact') || lowerHeader.includes('poc') || lowerHeader.includes('person')) {
          autoMapping[index] = 'pocName';
        } else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
          autoMapping[index] = 'pocEmail';
        } else if (lowerHeader.includes('phone') || lowerHeader.includes('tel') || lowerHeader.includes('mobile')) {
          autoMapping[index] = 'pocPhone';
        } else if (lowerHeader.includes('role') || lowerHeader.includes('title') || lowerHeader.includes('position')) {
          autoMapping[index] = 'pocRole';
        } else if (lowerHeader.includes('address') || lowerHeader.includes('street')) {
          autoMapping[index] = 'address';
        } else if (lowerHeader.includes('city') || lowerHeader.includes('town')) {
          autoMapping[index] = 'city';
        } else if (lowerHeader.includes('state') || lowerHeader.includes('region') || lowerHeader.includes('province')) {
          autoMapping[index] = 'state';
        } else if (lowerHeader.includes('zip') || lowerHeader.includes('postal') || lowerHeader.includes('post')) {
          autoMapping[index] = 'postalCode';
        } else if (lowerHeader.includes('country')) {
          autoMapping[index] = 'country';
        } else if (lowerHeader.includes('website') || lowerHeader.includes('url') || lowerHeader.includes('web')) {
          autoMapping[index] = 'website';
        } else if (lowerHeader.includes('note') || lowerHeader.includes('comment')) {
          autoMapping[index] = 'notes';
        }
      });
      setColumnMapping(autoMapping);
      setImportStep('map');
    };
    reader.readAsText(file);
  };

  const getPreviewLeads = (): any[] => {
    if (!csvData) return [];
    return csvData.rows.slice(0, 5).map(row => {
      const lead: any = { source: 'csv_import' };
      Object.entries(columnMapping).forEach(([index, field]) => {
        if (field && field !== 'skip') {
          lead[field] = row[parseInt(index)] || '';
        }
      });
      return lead;
    });
  };

  const handleImport = () => {
    if (!csvData) return;
    const leads = csvData.rows.map(row => {
      const lead: any = { source: 'csv_import', projectId: currentProject?.id || null };
      Object.entries(columnMapping).forEach(([index, field]) => {
        if (field && field !== 'skip') {
          lead[field] = row[parseInt(index)] || '';
        }
      });
      return lead;
    }).filter(lead => lead.company || lead.pocName || lead.pocEmail);
    
    if (leads.length === 0) {
      toast({ title: "No valid leads found", description: "Please map at least company, contact name, or email column", variant: "destructive" });
      return;
    }
    
    bulkImportMutation.mutate(leads);
  };

  const resetImport = () => {
    setIsImportOpen(false);
    setCsvData(null);
    setColumnMapping({});
    setImportStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const leads = leadsData?.leads || [];
  const stats = statsData?.stats;
  const campaigns = campaignsData?.campaigns || [];

  const filteredAndSortedLeads = useMemo(() => {
    let filtered = leads;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.company?.toLowerCase().includes(query) ||
        lead.pocName?.toLowerCase().includes(query) ||
        lead.pocEmail?.toLowerCase().includes(query) ||
        lead.pocPhone?.includes(query) ||
        lead.city?.toLowerCase().includes(query) ||
        lead.state?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'company':
          aVal = a.company || '';
          bVal = b.company || '';
          break;
        case 'pocName':
          aVal = a.pocName || '';
          bVal = b.pocName || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'callStatus':
          aVal = a.callStatus || '';
          bVal = b.callStatus || '';
          break;
        case 'score':
          aVal = a.score ?? -1;
          bVal = b.score ?? -1;
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? comparison : -comparison;
      } else {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });
  }, [leads, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredAndSortedLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredAndSortedLeads.map(l => l.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedLeads.size > 0) {
      deleteLeadsMutation.mutate(Array.from(selectedLeads));
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const openLeadDetail = (lead: QualificationLead) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Qualification Leads</h1>
          <p className="text-muted-foreground">Manage and qualify leads for your campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetchLeads()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/map-search?mode=qualification">
            <Button variant="outline" data-testid="button-map-search">
              <Map className="h-4 w-4 mr-2" />
              Map Search
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setIsImportOpen(true)} data-testid="button-import">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setIsAddLeadOpen(true)} data-testid="button-add-lead">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-leads">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Qualified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-qualified-leads">{stats?.byStatus?.['qualified'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending-calls">{stats?.byCallStatus?.['pending'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-score">{stats?.averageScore ?? 'N/A'}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[300px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
                data-testid="input-search"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={callStatusFilter} onValueChange={setCallStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-call-status-filter">
                  <SelectValue placeholder="Call Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Call Status</SelectItem>
                  {CALL_STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLeads.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleteLeadsMutation.isPending}
                  data-testid="button-delete-selected"
                >
                  {deleteLeadsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete ({selectedLeads.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAndSortedLeads.length === 0 ? (
            <div className="text-center p-12 border rounded-lg bg-muted/30">
              <p className="text-muted-foreground">No leads found</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsAddLeadOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first lead
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background border-b">
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedLeads.size === filteredAndSortedLeads.length && filteredAndSortedLeads.length > 0}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead className="cursor-pointer hover-elevate" onClick={() => handleSort('company')}>
                      <div className="flex items-center gap-2">
                        Company {renderSortIcon('company')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover-elevate" onClick={() => handleSort('pocName')}>
                      <div className="flex items-center gap-2">
                        Contact {renderSortIcon('pocName')}
                      </div>
                    </TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="cursor-pointer hover-elevate" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-2">
                        Status {renderSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover-elevate" onClick={() => handleSort('callStatus')}>
                      <div className="flex items-center gap-2">
                        Call Status {renderSortIcon('callStatus')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover-elevate text-right" onClick={() => handleSort('score')}>
                      <div className="flex items-center justify-end gap-2">
                        Score {renderSortIcon('score')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedLeads.map((lead) => (
                    <TableRow key={lead.id} className="hover-elevate" data-testid={`row-lead-${lead.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedLeads.has(lead.id)}
                          onCheckedChange={() => toggleSelectLead(lead.id)}
                          data-testid={`checkbox-lead-${lead.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span data-testid={`text-company-${lead.id}`}>{lead.company || 'Unknown'}</span>
                          {lead.website && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{lead.website}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span data-testid={`text-contact-${lead.id}`}>{lead.pocName || '-'}</span>
                          {lead.pocEmail && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {lead.pocEmail}
                            </span>
                          )}
                          {lead.pocPhone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {lead.pocPhone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {[lead.city, lead.state].filter(Boolean).join(', ') || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(lead.status)} data-testid={`badge-status-${lead.id}`}>
                          {lead.status?.replace('_', ' ') || 'new'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getCallStatusBadgeVariant(lead.callStatus)} data-testid={`badge-call-status-${lead.id}`}>
                          {lead.callStatus?.replace('_', ' ') || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-medium ${lead.score && lead.score >= 70 ? 'text-green-600' : lead.score && lead.score < 40 ? 'text-red-600' : ''}`} data-testid={`text-score-${lead.id}`}>
                          {lead.score ?? '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${lead.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openLeadDetail(lead)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setEditingLead(lead);
                              setIsEditLeadOpen(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <PhoneCall className="h-4 w-4 mr-2" />
                              Schedule Call
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteLeadsMutation.mutate([lead.id])}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Enter the lead information below</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                value={newLead.company}
                onChange={(e) => setNewLead(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Acme Corp"
                data-testid="input-company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={newLead.website}
                onChange={(e) => setNewLead(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://example.com"
                data-testid="input-website"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pocName">Contact Name</Label>
              <Input
                id="pocName"
                value={newLead.pocName}
                onChange={(e) => setNewLead(prev => ({ ...prev, pocName: e.target.value }))}
                placeholder="John Doe"
                data-testid="input-poc-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pocEmail">Contact Email</Label>
              <Input
                id="pocEmail"
                type="email"
                value={newLead.pocEmail}
                onChange={(e) => setNewLead(prev => ({ ...prev, pocEmail: e.target.value }))}
                placeholder="john@example.com"
                data-testid="input-poc-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pocPhone">Contact Phone</Label>
              <Input
                id="pocPhone"
                value={newLead.pocPhone}
                onChange={(e) => setNewLead(prev => ({ ...prev, pocPhone: e.target.value }))}
                placeholder="+1 555-1234"
                data-testid="input-poc-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Lead Source</Label>
              <Input
                id="source"
                value={newLead.source}
                onChange={(e) => setNewLead(prev => ({ ...prev, source: e.target.value }))}
                placeholder="Website, Referral, etc."
                data-testid="input-source"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={newLead.address}
                onChange={(e) => setNewLead(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main St"
                data-testid="input-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={newLead.city}
                onChange={(e) => setNewLead(prev => ({ ...prev, city: e.target.value }))}
                placeholder="New York"
                data-testid="input-city"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={newLead.state}
                onChange={(e) => setNewLead(prev => ({ ...prev, state: e.target.value }))}
                placeholder="NY"
                data-testid="input-state"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={newLead.country}
                onChange={(e) => setNewLead(prev => ({ ...prev, country: e.target.value }))}
                placeholder="e.g. USA, Canada, UK"
                data-testid="input-country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign">Campaign</Label>
              <Select
                value={newLead.campaignId || "__none__"}
                onValueChange={(value) => setNewLead(prev => ({ ...prev, campaignId: value === "__none__" ? '' : value }))}
              >
                <SelectTrigger data-testid="select-campaign">
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Campaign</SelectItem>
                  {campaignsData?.campaigns?.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newLead.notes}
                onChange={(e) => setNewLead(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this lead..."
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddLeadOpen(false)} data-testid="button-cancel-add">
              Cancel
            </Button>
            <Button onClick={() => createLeadMutation.mutate(newLead)} disabled={createLeadMutation.isPending} data-testid="button-submit-add">
              {createLeadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedLead?.company || 'Lead Details'}</DialogTitle>
            <DialogDescription>View and manage lead information</DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="answers">Parsed Answers</TabsTrigger>
                <TabsTrigger value="history">Call History</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Company</Label>
                    <p className="font-medium">{selectedLead.company || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Website</Label>
                    <p className="font-medium">{selectedLead.website || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Contact Name</Label>
                    <p className="font-medium">{selectedLead.pocName || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedLead.pocEmail || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedLead.pocPhone || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Location</Label>
                    <p className="font-medium">{[selectedLead.city, selectedLead.state, selectedLead.country].filter(Boolean).join(', ') || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge variant={getStatusBadgeVariant(selectedLead.status)}>{selectedLead.status?.replace('_', ' ') || 'new'}</Badge>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Call Status</Label>
                    <Badge variant={getCallStatusBadgeVariant(selectedLead.callStatus)}>{selectedLead.callStatus?.replace('_', ' ') || 'pending'}</Badge>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Score</Label>
                    <p className={`font-medium text-lg ${selectedLead.score && selectedLead.score >= 70 ? 'text-green-600' : selectedLead.score && selectedLead.score < 40 ? 'text-red-600' : ''}`}>
                      {selectedLead.score ?? 'Not scored'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Source</Label>
                    <p className="font-medium">{selectedLead.source || '-'}</p>
                  </div>
                </div>
                {selectedLead.notes && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm bg-muted p-3 rounded-md">{selectedLead.notes}</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="answers" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedLead.score !== null && selectedLead.score !== undefined ? (selectedLead.score >= 70 ? 'default' : selectedLead.score >= 40 ? 'secondary' : 'destructive') : 'outline'}>
                      Score: {selectedLead.score !== null && selectedLead.score !== undefined ? `${selectedLead.score}% (${selectedLead.scoreGrade || '-'})` : 'Not calculated'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/qualification/leads/${selectedLead.id}/calculate-score`, {
                            method: 'POST',
                          });
                          if (!response.ok) throw new Error('Failed to calculate score');
                          const data = await response.json();
                          toast({ title: `Score calculated: ${data.scoreDetails.score}% (Grade ${data.scoreDetails.scoreGrade})` });
                          queryClient.invalidateQueries({ queryKey: ['/api/qualification/leads'] });
                          setSelectedLead(data.lead);
                        } catch (error) {
                          toast({ title: 'Failed to calculate score', variant: 'destructive' });
                        }
                      }}
                      data-testid="button-calculate-score"
                    >
                      Calculate Score
                    </Button>
                  </div>
                </div>

                {selectedLead.answers && Object.keys(selectedLead.answers).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(selectedLead.answers).map(([key, value]) => (
                      <div key={key} className="border rounded-lg p-3">
                        <Label className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</Label>
                        <p className="font-medium mt-1">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    No parsed answers available. Complete a qualification call to populate this data.
                  </div>
                )}

                <Separator className="my-4" />

                <div className="space-y-3">
                  <Label>Parse Call Transcript</Label>
                  <p className="text-sm text-muted-foreground">
                    Paste a call transcript below to automatically extract answers using AI
                  </p>
                  <Textarea
                    placeholder="Paste the call transcript here..."
                    className="min-h-[120px]"
                    id="transcript-input"
                    data-testid="textarea-transcript"
                  />
                  <Button
                    onClick={async () => {
                      const textarea = document.getElementById('transcript-input') as HTMLTextAreaElement;
                      const transcript = textarea?.value;
                      if (!transcript?.trim()) {
                        toast({ title: 'Please enter a transcript', variant: 'destructive' });
                        return;
                      }
                      try {
                        const response = await fetch(`/api/qualification/leads/${selectedLead.id}/parse-transcript`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ transcript }),
                        });
                        if (!response.ok) {
                          const error = await response.json();
                          throw new Error(error.message || 'Failed to parse transcript');
                        }
                        const data = await response.json();
                        toast({ title: `Extracted ${Object.keys(data.extractedAnswers).length} answers from transcript` });
                        queryClient.invalidateQueries({ queryKey: ['/api/qualification/leads'] });
                        setSelectedLead(data.lead);
                        textarea.value = '';
                      } catch (error: any) {
                        toast({ title: error.message || 'Failed to parse transcript', variant: 'destructive' });
                      }
                    }}
                    data-testid="button-parse-transcript"
                  >
                    Parse Transcript with AI
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="history" className="space-y-4">
                <div className="text-center p-8 text-muted-foreground">
                  Call history will appear here after calls are made.
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditLeadOpen} onOpenChange={(open) => {
        setIsEditLeadOpen(open);
        if (!open) setEditingLead(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>Update lead information</DialogDescription>
          </DialogHeader>
          {editingLead && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={editingLead.company || ''}
                  onChange={(e) => setEditingLead(prev => prev ? { ...prev, company: e.target.value } : null)}
                  placeholder="Acme Corp"
                  data-testid="input-edit-company"
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={editingLead.website || ''}
                  onChange={(e) => setEditingLead(prev => prev ? { ...prev, website: e.target.value } : null)}
                  placeholder="https://example.com"
                  data-testid="input-edit-website"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={editingLead.pocName || ''}
                  onChange={(e) => setEditingLead(prev => prev ? { ...prev, pocName: e.target.value } : null)}
                  placeholder="John Doe"
                  data-testid="input-edit-poc-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={editingLead.pocEmail || ''}
                  onChange={(e) => setEditingLead(prev => prev ? { ...prev, pocEmail: e.target.value } : null)}
                  placeholder="john@example.com"
                  data-testid="input-edit-poc-email"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editingLead.pocPhone || ''}
                  onChange={(e) => setEditingLead(prev => prev ? { ...prev, pocPhone: e.target.value } : null)}
                  placeholder="+1 555-1234"
                  data-testid="input-edit-poc-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={editingLead.city || ''}
                  onChange={(e) => setEditingLead(prev => prev ? { ...prev, city: e.target.value } : null)}
                  placeholder="New York"
                  data-testid="input-edit-city"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={editingLead.state || ''}
                  onChange={(e) => setEditingLead(prev => prev ? { ...prev, state: e.target.value } : null)}
                  placeholder="NY"
                  data-testid="input-edit-state"
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={editingLead.country || ''}
                  onChange={(e) => setEditingLead(prev => prev ? { ...prev, country: e.target.value } : null)}
                  placeholder="e.g. USA, Canada, UK"
                  data-testid="input-edit-country"
                />
              </div>
              <div className="space-y-2">
                <Label>Campaign</Label>
                <Select
                  value={editingLead.campaignId || "__none__"}
                  onValueChange={(value) => setEditingLead(prev => prev ? { ...prev, campaignId: value === "__none__" ? null : value } : null)}
                >
                  <SelectTrigger data-testid="select-edit-campaign">
                    <SelectValue placeholder="Select a campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Campaign</SelectItem>
                    {campaignsData?.campaigns?.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editingLead.status || "new"}
                  onValueChange={(value) => setEditingLead(prev => prev ? { ...prev, status: value } : null)}
                >
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="disqualified">Disqualified</SelectItem>
                    <SelectItem value="exported">Exported</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editingLead.notes || ''}
                  onChange={(e) => setEditingLead(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  placeholder="Additional notes..."
                  data-testid="input-edit-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditLeadOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (editingLead) {
                  updateLeadMutation.mutate({ 
                    id: editingLead.id, 
                    data: {
                      company: editingLead.company,
                      website: editingLead.website,
                      pocName: editingLead.pocName,
                      pocEmail: editingLead.pocEmail,
                      pocPhone: editingLead.pocPhone,
                      city: editingLead.city,
                      state: editingLead.state,
                      country: editingLead.country,
                      campaignId: editingLead.campaignId,
                      status: editingLead.status,
                      notes: editingLead.notes,
                    }
                  });
                }
              }} 
              disabled={updateLeadMutation.isPending} 
              data-testid="button-submit-edit"
            >
              {updateLeadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportOpen} onOpenChange={(open) => { if (!open) resetImport(); else setIsImportOpen(true); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Import Leads from CSV
              </div>
            </DialogTitle>
            <DialogDescription>
              {importStep === 'upload' && 'Upload a CSV file with your lead data'}
              {importStep === 'map' && 'Map CSV columns to lead fields'}
              {importStep === 'preview' && 'Review the data before importing'}
            </DialogDescription>
          </DialogHeader>

          {importStep === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                  data-testid="input-csv-file"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Click to upload CSV file</p>
                  <p className="text-sm text-muted-foreground mt-1">or drag and drop</p>
                </label>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  CSV should have headers in the first row. Supported fields: Company, Contact Name, Email, Phone, Address, City, State, Country, Website, Notes.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {importStep === 'map' && csvData && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Found {csvData.rows.length} rows in your CSV. Map each column to a lead field.
                </AlertDescription>
              </Alert>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {csvData.headers.map((header, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="w-1/3">
                        <p className="font-medium text-sm">{header}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Sample: {csvData.rows[0]?.[index] || '(empty)'}
                        </p>
                      </div>
                      <div className="w-1/3">
                        <Select
                          value={columnMapping[index] || 'skip'}
                          onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [index]: value }))}
                        >
                          <SelectTrigger data-testid={`select-mapping-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LEAD_FIELD_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setImportStep('upload'); setCsvData(null); }} data-testid="button-back-upload">
                  Back
                </Button>
                <Button onClick={() => setImportStep('preview')} data-testid="button-preview">
                  Preview Import
                </Button>
              </DialogFooter>
            </div>
          )}

          {importStep === 'preview' && csvData && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Preview of first 5 leads. Total: {csvData.rows.filter(row => {
                    const lead: any = {};
                    Object.entries(columnMapping).forEach(([index, field]) => {
                      if (field && field !== 'skip') lead[field] = row[parseInt(index)];
                    });
                    return lead.company || lead.pocName || lead.pocEmail;
                  }).length} valid leads will be imported.
                </AlertDescription>
              </Alert>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPreviewLeads().map((lead, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{lead.company || '-'}</TableCell>
                        <TableCell>{lead.pocName || '-'}</TableCell>
                        <TableCell>{lead.pocEmail || '-'}</TableCell>
                        <TableCell>{lead.pocPhone || '-'}</TableCell>
                        <TableCell>{[lead.city, lead.state].filter(Boolean).join(', ') || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportStep('map')} data-testid="button-back-map">
                  Back to Mapping
                </Button>
                <Button onClick={handleImport} disabled={bulkImportMutation.isPending} data-testid="button-import-confirm">
                  {bulkImportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Import {csvData.rows.length} Leads
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
