import { ArrowDown, ArrowUp, ArrowUpDown, Edit, Eye, Loader2, Mail, MapPin, MoreVertical, Phone, PhoneCall, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CALL_STATUS_OPTIONS, getCallStatusBadgeVariant, getStatusBadgeVariant, STATUS_OPTIONS, type SortField } from '@/components/qualification/qualification-utils';
import type { QualificationLead } from '@shared/schema';

type Props = {
  callStatusFilter: string;
  deletePending: boolean;
  filteredAndSortedLeads: QualificationLead[];
  leadsLoading: boolean;
  onDeleteLead: (id: string) => void;
  onDeleteSelected: () => void;
  onEditLead: (lead: QualificationLead) => void;
  onOpenLeadDetail: (lead: QualificationLead) => void;
  onSelectAll: () => void;
  onSelectLead: (leadId: string) => void;
  onSetSearchQuery: (value: string) => void;
  onSetStatusFilter: (value: string) => void;
  onSetCallStatusFilter: (value: string) => void;
  onSort: (field: SortField) => void;
  onStartAddLead: () => void;
  searchQuery: string;
  selectedLeads: Set<string>;
  sortDirection: 'asc' | 'desc';
  sortField: SortField;
  statusFilter: string;
};

export function QualificationLeadsTableCard(props: Props) {
  const renderSortIcon = (field: SortField) => {
    if (props.sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return props.sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={props.searchQuery}
              onChange={(e) => props.onSetSearchQuery(e.target.value)}
              className="max-w-sm"
              data-testid="input-search"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={props.statusFilter} onValueChange={props.onSetStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={props.callStatusFilter} onValueChange={props.onSetCallStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-call-status-filter">
                <SelectValue placeholder="Call Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Call Status</SelectItem>
                {CALL_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {props.selectedLeads.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={props.onDeleteSelected}
                disabled={props.deletePending}
                data-testid="button-delete-selected"
              >
                {props.deletePending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete ({props.selectedLeads.size})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {props.leadsLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : props.filteredAndSortedLeads.length === 0 ? (
          <div className="text-center p-12 border rounded-lg bg-muted/30">
            <p className="text-muted-foreground">No leads found</p>
            <Button variant="outline" className="mt-4" onClick={props.onStartAddLead}>
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
                      checked={props.selectedLeads.size === props.filteredAndSortedLeads.length && props.filteredAndSortedLeads.length > 0}
                      onCheckedChange={props.onSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer hover-elevate" onClick={() => props.onSort('company')}><div className="flex items-center gap-2">Company {renderSortIcon('company')}</div></TableHead>
                  <TableHead className="cursor-pointer hover-elevate" onClick={() => props.onSort('pocName')}><div className="flex items-center gap-2">Contact {renderSortIcon('pocName')}</div></TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="cursor-pointer hover-elevate" onClick={() => props.onSort('status')}><div className="flex items-center gap-2">Status {renderSortIcon('status')}</div></TableHead>
                  <TableHead className="cursor-pointer hover-elevate" onClick={() => props.onSort('callStatus')}><div className="flex items-center gap-2">Call Status {renderSortIcon('callStatus')}</div></TableHead>
                  <TableHead className="cursor-pointer hover-elevate text-right" onClick={() => props.onSort('score')}><div className="flex items-center justify-end gap-2">Score {renderSortIcon('score')}</div></TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.filteredAndSortedLeads.map((lead) => (
                  <TableRow key={lead.id} className="hover-elevate" data-testid={`row-lead-${lead.id}`}>
                    <TableCell><Checkbox checked={props.selectedLeads.has(lead.id)} onCheckedChange={() => props.onSelectLead(lead.id)} data-testid={`checkbox-lead-${lead.id}`} /></TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span data-testid={`text-company-${lead.id}`}>{lead.company || 'Unknown'}</span>
                        {lead.website && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{lead.website}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span data-testid={`text-contact-${lead.id}`}>{lead.pocName || '-'}</span>
                        {lead.pocEmail && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.pocEmail}</span>}
                        {lead.pocPhone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.pocPhone}</span>}
                      </div>
                    </TableCell>
                    <TableCell><div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3 w-3" />{[lead.city, lead.state].filter(Boolean).join(', ') || '-'}</div></TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(lead.status)} data-testid={`badge-status-${lead.id}`}>{lead.status?.replace('_', ' ') || 'new'}</Badge></TableCell>
                    <TableCell><Badge variant={getCallStatusBadgeVariant(lead.callStatus)} data-testid={`badge-call-status-${lead.id}`}>{lead.callStatus?.replace('_', ' ') || 'pending'}</Badge></TableCell>
                    <TableCell className="text-right"><span className={`font-medium ${lead.score && lead.score >= 70 ? 'text-green-600' : lead.score && lead.score < 40 ? 'text-red-600' : ''}`} data-testid={`text-score-${lead.id}`}>{lead.score ?? '-'}</span></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${lead.id}`}><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => props.onOpenLeadDetail(lead)}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => props.onEditLead(lead)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuItem><PhoneCall className="h-4 w-4 mr-2" />Schedule Call</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => props.onDeleteLead(lead.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
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
  );
}
