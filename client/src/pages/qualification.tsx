import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Search, Plus, Filter, Phone, Mail, Building2, MapPin, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Trash2, Download, Upload, RefreshCw, MoreVertical, Eye, Edit, PhoneCall } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as globalQueryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import type { QualificationLead, QualificationCampaign } from "@shared/schema";

type SortField = 'company' | 'pocName' | 'status' | 'callStatus' | 'score' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'not_qualified', 'followup', 'closed'];
const CALL_STATUS_OPTIONS = ['pending', 'scheduled', 'in_progress', 'completed', 'failed', 'no_answer'];

const getStatusBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
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

const getCallStatusBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
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
    country: 'USA',
    website: '',
    source: '',
    notes: '',
  });

  const { data: leadsData, isLoading: leadsLoading, refetch: refetchLeads } = useQuery<{ leads: QualificationLead[]; total: number }>({
    queryKey: ['/api/qualification/leads', statusFilter, callStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (callStatusFilter !== 'all') params.set('callStatus', callStatusFilter);
      params.set('limit', '500');
      const response = await fetch(`/api/qualification/leads?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      return response.json();
    },
  });

  const { data: statsData } = useQuery<{ stats: { total: number; byStatus: Record<string, number>; byCallStatus: Record<string, number>; averageScore: number | null } }>({
    queryKey: ['/api/qualification/leads/stats'],
  });

  const { data: campaignsData } = useQuery<{ campaigns: QualificationCampaign[] }>({
    queryKey: ['/api/qualification/campaigns'],
  });

  const createLeadMutation = useMutation({
    mutationFn: async (leadData: typeof newLead) => {
      return apiRequest('POST', '/api/qualification/leads', leadData);
    },
    onSuccess: () => {
      toast({ title: "Lead created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/qualification/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/qualification/leads/stats'] });
      setIsAddLeadOpen(false);
      setNewLead({
        company: '', pocName: '', pocEmail: '', pocPhone: '',
        address: '', city: '', state: '', country: 'USA',
        website: '', source: '', notes: '',
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create lead", description: error.message, variant: "destructive" });
    },
  });

  const deleteLeadsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return apiRequest('POST', '/api/qualification/leads/bulk-delete', { ids });
    },
    onSuccess: (data: any) => {
      toast({ title: `${data.deleted} leads deleted` });
      queryClient.invalidateQueries({ queryKey: ['/api/qualification/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/qualification/leads/stats'] });
      setSelectedLeads(new Set());
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete leads", description: error.message, variant: "destructive" });
    },
  });

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
          <Button variant="outline" data-testid="button-import">
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
                            <DropdownMenuItem>
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
                placeholder="USA"
                data-testid="input-country"
              />
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
                {selectedLead.answers && Object.keys(selectedLead.answers).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(selectedLead.answers).map(([key, value]) => (
                      <div key={key} className="border rounded-lg p-3">
                        <Label className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</Label>
                        <p className="font-medium mt-1">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    No parsed answers available. Complete a qualification call to populate this data.
                  </div>
                )}
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
    </div>
  );
}
