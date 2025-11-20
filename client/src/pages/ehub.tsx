import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DOMPurify from 'dompurify';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Mail, Plus, Loader2, Upload, Send, Settings, Users, AlertCircle, AlertTriangle, Database, MessageSquare, Bot, User as UserIcon, Check, X, Trash2, MoreVertical, Pause, SkipForward, Clock, Play, Edit, Sparkles, Store, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AllContactsResponse, EhubContact } from "@shared/schema";
import { TestTube2, RefreshCw, Reply } from "lucide-react";

/**
 * Calculate optimal min/max delay suggestions for human-like email spacing
 * Based on pure company sending window (not client timezone overlap)
 * Spacing = (endHour - startHour) × 60 ÷ dailyLimit
 * Jitter = configurable percentage of spacing (default ±50%)
 */
function calculateOptimalDelays(
  companyStartHour: number,
  companyEndHour: number,
  dailyEmailLimit: number,
  jitterPercentage: number = 50
): { minDelayMinutes: number; maxDelayMinutes: number } {
  // Calculate pure company sending window (no client timezone logic)
  const companyWindowHours = companyEndHour - companyStartHour;
  const companyWindowMinutes = companyWindowHours * 60;
  
  // Calculate average spacing needed for daily limit
  const averageSpacingMinutes = dailyEmailLimit > 0 
    ? companyWindowMinutes / dailyEmailLimit 
    : 5;
  
  // Convert jitter percentage to multipliers (e.g., 50% = 0.5 to 1.5, 30% = 0.7 to 1.3)
  const jitterDecimal = jitterPercentage / 100;
  const minMultiplier = 1 - jitterDecimal;
  const maxMultiplier = 1 + jitterDecimal;
  
  // Apply jitter variance to create min/max range
  const minDelay = Math.max(1, Math.floor(averageSpacingMinutes * minMultiplier));
  const maxDelay = Math.ceil(averageSpacingMinutes * maxMultiplier);
  
  return {
    minDelayMinutes: minDelay,
    maxDelayMinutes: maxDelay
  };
}

interface Sequence {
  id: string;
  name: string;
  stepDelays: number[] | null;
  repeatLastStep: boolean;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  repliedCount: number;
  createdAt: string;
}

interface EhubSettings {
  id?: string;
  minDelayMinutes: number;
  maxDelayMinutes: number;
  jitterPercentage: number;
  dailyEmailLimit: number;
  sendingHoursStart: number;
  sendingHoursEnd: number;
  clientWindowStartOffset: number;
  clientWindowEndHour: number;
  promptInjection: string;
  keywordBin: string;
  skipWeekends: boolean;
}

interface Recipient {
  id: string;
  email: string;
  name: string;
  link: string;
  salesSummary: string;
  businessHours: string;
  timezone: string;
  status: string;
  contactedStatus: 'contacted' | 'not contacted' | 'unknown';
  trackerStatus: string | null;
}

interface TestEmailSend {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  gmailThreadId: string | null;
  sentAt: string | null;
  replyDetectedAt: string | null;
  followUpCount: number;
  createdAt: string;
}

interface IndividualSend {
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  sequenceId: string;
  sequenceName: string;
  stepNumber: number;
  scheduledAt: string | null;
  sentAt: string | null;
  status: 'sent' | 'scheduled' | 'overdue' | 'open';
  subject: string | null;
  threadId?: string | null;
  messageId?: string | null;
}

interface PausedRecipient {
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  sequenceId: string;
  sequenceName: string;
  currentStep: number;
  totalSteps: number;
  lastStepSentAt: string | null;
  pausedAt: string | null;
  messageHistory: Array<{
    stepNumber: number;
    subject: string | null;
    sentAt: string | null;
    threadId: string | null;
    messageId: string | null;
  }>;
}

function SentHistoryView() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSequence, setSelectedSequence] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch all sequences for filter dropdown
  const { data: sequences } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['/api/sequences'],
  });

  // Fetch sent history
  const { data: sentHistory, isLoading } = useQuery<{
    messages: Array<{
      messageId: string;
      recipientId: string;
      recipientEmail: string;
      recipientName: string | null;
      sequenceId: string;
      sequenceName: string;
      stepNumber: number;
      subject: string;
      sentAt: string;
      threadId: string | null;
      status: 'sent' | 'replied' | 'bounced' | 'pending';
      repliedAt: string | null;
      replyCount: number | null;
    }>;
    total: number;
    limit: number;
    hasMore: boolean;
  }>({
    queryKey: ['/api/ehub/sent-history', selectedSequence],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSequence !== 'all') {
        params.append('sequenceId', selectedSequence);
      }
      params.append('limit', '100');
      
      const url = `/api/ehub/sent-history?${params.toString()}`;
      const res = await fetch(url, { credentials: 'include' });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch sent history: ${res.statusText}`);
      }
      
      return await res.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Client-side filtering
  const filteredMessages = sentHistory?.messages.filter((msg) => {
    // Status filter
    if (selectedStatus !== 'all' && msg.status !== selectedStatus) {
      return false;
    }

    // Search filter (email, name, subject)
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      const matchesEmail = msg.recipientEmail.toLowerCase().includes(searchLower);
      const matchesName = msg.recipientName?.toLowerCase().includes(searchLower);
      const matchesSubject = msg.subject.toLowerCase().includes(searchLower);
      
      if (!matchesEmail && !matchesName && !matchesSubject) {
        return false;
      }
    }

    return true;
  }) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sent History</CardTitle>
            <CardDescription>
              {sentHistory?.total || 0} total emails sent
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Search by email, name, subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-sent-history"
              className="w-[300px]"
            />
            <Select value={selectedSequence} onValueChange={setSelectedSequence}>
              <SelectTrigger className="w-[200px]" data-testid="select-sequence-filter">
                <SelectValue placeholder="All Sequences" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sequences</SelectItem>
                {sequences?.map((seq) => (
                  <SelectItem key={seq.id} value={seq.id}>
                    {seq.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {debouncedSearch || selectedStatus !== 'all' 
              ? 'No emails match your filters'
              : 'No emails sent yet'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Sequence</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMessages.map((msg) => (
                <TableRow key={msg.messageId} data-testid={`row-sent-${msg.messageId}`}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{msg.recipientName || 'Unknown'}</span>
                      <span className="text-sm text-muted-foreground">{msg.recipientEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell>{msg.sequenceName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Step {msg.stepNumber}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {msg.subject}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.sentAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    {msg.status === 'replied' && (
                      <Badge variant="default" className="bg-green-600">
                        Replied {msg.replyCount && msg.replyCount > 1 ? `(${msg.replyCount})` : ''}
                      </Badge>
                    )}
                    {msg.status === 'sent' && (
                      <Badge variant="secondary">Sent</Badge>
                    )}
                    {msg.status === 'bounced' && (
                      <Badge variant="destructive">Bounced</Badge>
                    )}
                    {msg.status === 'pending' && (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {sentHistory?.hasMore && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Showing first {sentHistory.limit} results
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScannerManagementView() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [waitDays, setWaitDays] = useState(3);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [newBlacklistEmail, setNewBlacklistEmail] = useState('');
  const [newBlacklistReason, setNewBlacklistReason] = useState('');

  // Fetch blacklist
  const { data: blacklist, isLoading: isLoadingBlacklist } = useQuery<Array<{
    id: string;
    email: string;
    reason: string | null;
    createdAt: string;
  }>>({
    queryKey: ['/api/ehub/blacklist'],
  });

  // Add to blacklist mutation
  const addToBlacklistMutation = useMutation({
    mutationFn: async (data: { email: string; reason?: string }) => {
      return await apiRequest('/api/ehub/blacklist', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/blacklist'] });
      toast({
        title: 'Email Blacklisted',
        description: 'The email has been added to the blacklist',
      });
      setNewBlacklistEmail('');
      setNewBlacklistReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add email to blacklist',
        variant: 'destructive',
      });
    },
  });

  // Remove from blacklist mutation
  const removeFromBlacklistMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/ehub/blacklist/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/blacklist'] });
      toast({
        title: 'Email Removed',
        description: 'The email has been removed from the blacklist',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove email from blacklist',
        variant: 'destructive',
      });
    },
  });

  // Scan for replies (preview)
  const handleScan = async (dryRun: boolean) => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/ehub/scan-replies', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dryRun, 
          waitDays,
          selectedEmails: dryRun ? undefined : selectedEmails.length > 0 ? selectedEmails : undefined
        }),
      });

      if (!res.ok) throw new Error('Scan failed');

      const result = await res.json();
      setScanResults(result);

      if (dryRun) {
        toast({
          title: 'Scan Complete',
          description: result.message,
        });
      } else {
        toast({
          title: 'Enrollment Complete',
          description: result.message,
        });
        // Clear selection after enrollment
        setSelectedEmails([]);
        setSelectAll(false);
        // Re-scan to get updated data
        setTimeout(() => handleScan(true), 1000);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to scan for replies',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle email selection
  const toggleEmail = (email: string) => {
    setSelectedEmails(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  // Toggle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEmails([]);
    } else {
      const eligibleEmails = scanResults?.details
        .filter((d: any) => d.isNew && d.status !== 'has_reply' && d.status !== 'blacklisted')
        .map((d: any) => d.email) || [];
      setSelectedEmails(eligibleEmails);
    }
    setSelectAll(!selectAll);
  };

  // Add to blacklist
  const handleAddToBlacklist = () => {
    if (!newBlacklistEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Email address is required',
        variant: 'destructive',
      });
      return;
    }

    addToBlacklistMutation.mutate({
      email: newBlacklistEmail.trim(),
      reason: newBlacklistReason.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Reply Scanner Section */}
      <Card>
        <CardHeader>
          <CardTitle>Gmail Reply Scanner</CardTitle>
          <CardDescription>
            Scan your Gmail sent folder for draft recipients and enroll them into Manual Follow-Ups
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="wait-days">Wait Days</Label>
              <Input
                id="wait-days"
                type="number"
                min="1"
                value={waitDays}
                onChange={(e) => setWaitDays(parseInt(e.target.value) || 3)}
                data-testid="input-wait-days"
              />
            </div>
            <div className="flex gap-2 items-end">
              <Button
                onClick={() => handleScan(true)}
                disabled={isScanning}
                data-testid="button-scan-preview"
              >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Scan
              </Button>
              {scanResults && selectedEmails.length > 0 && (
                <Button
                  onClick={() => handleScan(false)}
                  disabled={isScanning}
                  variant="default"
                  data-testid="button-enroll-selected"
                >
                  Enroll {selectedEmails.length} Selected
                </Button>
              )}
            </div>
          </div>

          {scanResults && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Scan Results</AlertTitle>
                <AlertDescription>
                  Scanned {scanResults.scanned} emails. Found {scanResults.details.filter((d: any) => d.isNew).length} new contacts.
                </AlertDescription>
              </Alert>

              {scanResults.details.filter((d: any) => d.isNew && d.status !== 'has_reply' && d.status !== 'blacklisted').length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                    <Label className="cursor-pointer" onClick={handleSelectAll}>
                      Select All ({scanResults.details.filter((d: any) => d.isNew && d.status !== 'has_reply' && d.status !== 'blacklisted').length})
                    </Label>
                  </div>

                  <ScrollArea className="h-[300px] border rounded-md p-4">
                    <div className="space-y-2">
                      {scanResults.details
                        .filter((d: any) => d.isNew && d.status !== 'has_reply' && d.status !== 'blacklisted')
                        .map((detail: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 p-2 hover:bg-muted rounded">
                            <Checkbox
                              checked={selectedEmails.includes(detail.email)}
                              onCheckedChange={() => toggleEmail(detail.email)}
                              data-testid={`checkbox-email-${idx}`}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{detail.email}</div>
                              <div className="text-sm text-muted-foreground">{detail.message}</div>
                            </div>
                            <Badge variant={detail.status === 'new' ? 'default' : 'secondary'}>
                              {detail.status}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {scanResults.details.filter((d: any) => !d.isNew || d.status === 'has_reply' || d.status === 'blacklisted').length > 0 && (
                <div className="space-y-2">
                  <Label>Already Enrolled or Excluded</Label>
                  <ScrollArea className="h-[200px] border rounded-md p-4">
                    <div className="space-y-2">
                      {scanResults.details
                        .filter((d: any) => !d.isNew || d.status === 'has_reply' || d.status === 'blacklisted')
                        .map((detail: any, idx: number) => (
                          <div key={idx} className="p-2 hover:bg-muted rounded">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{detail.email}</div>
                              <Badge variant="secondary">{detail.status}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">{detail.message}</div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Blacklist Section */}
      <Card>
        <CardHeader>
          <CardTitle>Email Blacklist</CardTitle>
          <CardDescription>
            Permanently exclude email addresses from enrollment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add to Blacklist Form */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Email address"
                value={newBlacklistEmail}
                onChange={(e) => setNewBlacklistEmail(e.target.value)}
                data-testid="input-blacklist-email"
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Reason (optional)"
                value={newBlacklistReason}
                onChange={(e) => setNewBlacklistReason(e.target.value)}
                data-testid="input-blacklist-reason"
              />
            </div>
            <Button
              onClick={handleAddToBlacklist}
              disabled={addToBlacklistMutation.isPending}
              data-testid="button-add-blacklist"
            >
              {addToBlacklistMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add
            </Button>
          </div>

          {/* Blacklist Table */}
          {isLoadingBlacklist ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : blacklist && blacklist.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blacklist.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.email}</TableCell>
                    <TableCell>{entry.reason || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromBlacklistMutation.mutate(entry.id)}
                        disabled={removeFromBlacklistMutation.isPending}
                        data-testid={`button-remove-blacklist-${entry.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No blacklisted emails
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QueueView() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [timeWindowDays, setTimeWindowDays] = useState<number>(3);
  const [statusFilter, setStatusFilter] = useState<'active' | 'paused'>('active');
  const [showJitter, setShowJitter] = useState(false);
  
  console.log('[QueueView] Component mounted/updated', {
    search: debouncedSearch,
    timeWindowDays,
    statusFilter
  });
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  
  // Fetch active queue
  const { data: activeQueue, isLoading: isLoadingActive } = useQuery<IndividualSend[]>({
    queryKey: ['/api/ehub/queue', debouncedSearch, timeWindowDays],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('timeWindowDays', timeWindowDays.toString());
      params.append('statusFilter', 'active');
      
      const url = `/api/ehub/queue?${params.toString()}`;
      console.log('[QueueView] Fetching active queue:', url);
      const res = await fetch(url, { credentials: 'include' });
      
      if (!res.ok) {
        console.error('[QueueView] Failed to fetch queue:', res.status, res.statusText);
        throw new Error(`Failed to fetch queue: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('[QueueView] Active queue response:', {
        count: data.length,
        sample: data.slice(0, 3),
        timeWindow: timeWindowDays
      });
      return data;
    },
    staleTime: 0, // Always refetch
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    enabled: statusFilter === 'active',
  });

  // Fetch paused recipients
  const { data: pausedRecipients, isLoading: isLoadingPaused } = useQuery<PausedRecipient[]>({
    queryKey: ['/api/ehub/paused-recipients'],
    queryFn: async () => {
      const res = await fetch('/api/ehub/paused-recipients', { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`Failed to fetch paused recipients: ${res.statusText}`);
      }
      return await res.json();
    },
    staleTime: 0, // Always refetch
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    enabled: statusFilter === 'paused',
  });

  // Determine which data/loading state to use
  const queue = statusFilter === 'paused' ? pausedRecipients : activeQueue;
  const isLoading = statusFilter === 'paused' ? isLoadingPaused : isLoadingActive;

  // Pause recipient mutation
  const pauseMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      return await apiRequest('PATCH', `/api/ehub/recipients/${recipientId}/pause`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/paused-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/queue/paused-count'] });
      toast({
        title: 'Recipient paused',
        description: 'All future sends have been stopped',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to pause recipient',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Resume recipient mutation
  const resumeMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      return await apiRequest('PATCH', `/api/ehub/recipients/${recipientId}/resume`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/paused-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/queue/paused-count'] });
      toast({
        title: 'Recipient resumed',
        description: 'Emails will resume sending',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to resume recipient',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Skip step mutation
  const skipStepMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      return await apiRequest('PATCH', `/api/ehub/recipients/${recipientId}/skip-step`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/paused-recipients'] });
      toast({
        title: 'Step skipped',
        description: 'Advanced to next step without sending',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to skip step',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove recipient mutation
  const removeMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      return await apiRequest('DELETE', `/api/ehub/recipients/${recipientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/paused-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/queue/paused-count'] });
      toast({
        title: 'Recipient removed',
        description: 'Removed from sequence completely',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to remove recipient',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Send Now mutation
  const sendNowMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      return await apiRequest('POST', `/api/ehub/recipients/${recipientId}/send-now`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/paused-recipients'] });
      toast({
        title: 'Email sending now',
        description: 'Overriding schedule and sending immediately',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send email',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delay mutation
  const [delayDialog, setDelayDialog] = useState<{ open: boolean; recipientId: string | null; hours: number }>({
    open: false,
    recipientId: null,
    hours: 1,
  });

  const delayMutation = useMutation({
    mutationFn: async ({ recipientId, hours }: { recipientId: string; hours: number }) => {
      return await apiRequest('PATCH', `/api/ehub/recipients/${recipientId}/delay`, { hours });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/paused-recipients'] });
      toast({
        title: 'Send delayed',
        description: `Pushed back by ${variables.hours} hour${variables.hours !== 1 ? 's' : ''}`,
      });
      setDelayDialog({ open: false, recipientId: null, hours: 1 });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delay send',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Generate Queue mutation
  const generateQueueMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/ehub/queue/generate');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/queue'] });
      toast({
        title: 'Queue generated',
        description: '3 days of email slots have been created',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to generate queue',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch paused count separately
  const { data: pausedCount = 0 } = useQuery<number>({
    queryKey: ['/api/ehub/queue/paused-count'],
    queryFn: async () => {
      const res = await fetch('/api/ehub/queue/paused-count', { credentials: 'include' });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Calculate stats for ACTIVE queue only (don't calculate for paused view)
  const sentItems = activeQueue?.filter(item => item.status === 'sent') || [];
  const scheduledItems = activeQueue?.filter(item => item.status === 'scheduled') || [];
  const overdueItems = activeQueue?.filter(item => item.status === 'overdue') || [];
  
  // Get unique recipients for follow-ups vs fresh calculation (active only)
  const uniqueRecipients = new Set(activeQueue?.map(item => item.recipientId) || []);
  const followUpRecipients = new Set(
    activeQueue?.filter(item => item.stepNumber > 1).map(item => item.recipientId) || []
  );
  const freshRecipients = uniqueRecipients.size - followUpRecipients.size;
  
  // Get next send time from scheduled items (active only)
  const nextScheduled = scheduledItems.length > 0 && scheduledItems[0].scheduledAt
    ? new Date(scheduledItems[0].scheduledAt)
    : null;

  // Format date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not scheduled';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 0) return 'Overdue';
    if (diffMins < 60) return `in ${diffMins}m`;
    if (diffMins < 1440) return `in ${Math.floor(diffMins / 60)}h`;
    return `in ${Math.floor(diffMins / 1440)}d`;
  };

  // Format full timestamp
  const formatTimestamp = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get row background color based on status
  const getRowBgColor = (status: 'sent' | 'scheduled' | 'overdue' | 'open') => {
    if (status === 'sent') {
      return 'bg-green-50 dark:bg-green-900/20';
    }
    if (status === 'overdue') {
      return 'bg-red-50 dark:bg-red-900/20';
    }
    if (status === 'open') {
      return 'bg-gray-50 dark:bg-gray-900/20';
    }
    return 'bg-blue-50 dark:bg-blue-900/20'; // scheduled
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary - Only for Active View */}
      {statusFilter === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Follow-ups Pending</CardDescription>
              <CardTitle className="text-3xl" data-testid="text-followups-pending">
                {followUpRecipients.size}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Fresh Emails Pending</CardDescription>
              <CardTitle className="text-3xl" data-testid="text-fresh-pending">
                {freshRecipients}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Next Send</CardDescription>
              <CardTitle className="text-xl" data-testid="text-next-send">
                {nextScheduled ? formatDate(nextScheduled.toISOString()) : 'No emails queued'}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Queue/Paused Recipients Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle>{statusFilter === 'paused' ? 'Paused Recipients' : 'Email Queue'}</CardTitle>
              <CardDescription>
                {statusFilter === 'paused' 
                  ? 'Recipients whose email sequences have been paused'
                  : 'Chronological view of all time slots • Green = Sent, Blue = Scheduled, Gray = Open, Red = Overdue'
                }
              </CardDescription>
            </div>
            <div className="flex gap-3 flex-wrap">
              {statusFilter === 'active' && (
                <>
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs"
                    data-testid="input-queue-search"
                  />
                  <Select
                    value={timeWindowDays.toString()}
                    onValueChange={(val) => setTimeWindowDays(parseInt(val, 10))}
                  >
                    <SelectTrigger className="w-[200px]" data-testid="select-time-window">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Next 24 hours</SelectItem>
                      <SelectItem value="3">Next 3 days</SelectItem>
                      <SelectItem value="7">Next 7 days</SelectItem>
                      <SelectItem value="14">Next 14 days</SelectItem>
                      <SelectItem value="30">Next 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              {statusFilter === 'active' && !activeQueue?.length && !search && (
                <Button
                  onClick={() => generateQueueMutation.mutate()}
                  disabled={generateQueueMutation.isPending}
                  data-testid="button-generate-queue"
                >
                  {generateQueueMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Queue'
                  )}
                </Button>
              )}
              <Button
                variant={statusFilter === 'paused' ? 'default' : 'outline'}
                onClick={() => setStatusFilter(statusFilter === 'active' ? 'paused' : 'active')}
                data-testid="button-toggle-paused"
              >
                <Pause className="mr-2 h-4 w-4" />
                {statusFilter === 'paused' ? 'Show Active' : `Show Paused${pausedCount > 0 ? ` (${pausedCount})` : ''}`}
              </Button>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-jitter"
                  checked={showJitter}
                  onCheckedChange={(checked) => setShowJitter(!!checked)}
                  data-testid="checkbox-show-jitter"
                />
                <Label htmlFor="show-jitter" className="text-sm cursor-pointer">
                  Jitter
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {statusFilter === 'active' ? (
            // ACTIVE QUEUE VIEW
            !activeQueue || activeQueue.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {search ? 'No results found' : 'No emails in queue'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Sequence</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>{showJitter ? 'Jitter' : 'Status'}</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeQueue.map((item, idx) => (
                    <TableRow
                      key={`${item.recipientId}-${item.stepNumber}-${idx}`}
                      className={getRowBgColor(item.status)}
                      data-testid={`row-queue-${item.recipientId}-${item.stepNumber}`}
                    >
                    <TableCell data-testid={`text-recipient-name-${item.recipientId}-${item.stepNumber}`}>
                      <div>
                        <div className="font-medium">{item.recipientName || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{item.recipientEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-queue-sequence-${item.recipientId}-${item.stepNumber}`}>
                      {item.sequenceName}
                    </TableCell>
                    <TableCell data-testid={`text-queue-step-${item.recipientId}-${item.stepNumber}`}>
                      <Badge variant={item.stepNumber === 1 ? 'default' : 'secondary'}>
                        Step {item.stepNumber}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-queue-scheduled-${item.recipientId}-${item.stepNumber}`}>
                      {item.status === 'sent' 
                        ? formatTimestamp(item.sentAt)
                        : formatTimestamp(item.scheduledAt)
                      }
                    </TableCell>
                    <TableCell data-testid={`text-queue-status-${item.recipientId}-${item.stepNumber}`}>
                      {showJitter ? (
                        <span className="text-sm text-muted-foreground">
                          {(() => {
                            // Calculate jitter (time difference from previous entry)
                            if (idx === 0) return '—';
                            const prevItem = activeQueue[idx - 1];
                            if (!prevItem.scheduledAt || !item.scheduledAt) return '—';
                            
                            const prevTime = new Date(prevItem.scheduledAt).getTime();
                            const currTime = new Date(item.scheduledAt).getTime();
                            const diffMs = currTime - prevTime;
                            const diffMins = Math.floor(diffMs / 60000);
                            
                            if (diffMins < 60) return `${diffMins}m`;
                            const hours = Math.floor(diffMins / 60);
                            const mins = diffMins % 60;
                            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                          })()}
                        </span>
                      ) : (
                        <Badge 
                          variant={
                            item.status === 'sent' ? 'default' : 
                            item.status === 'overdue' ? 'destructive' :
                            item.status === 'open' ? 'secondary' :
                            'outline'
                          }
                        >
                          {item.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell data-testid={`actions-${item.recipientId}-${item.stepNumber}`}>
                      {item.status !== 'sent' && item.status !== 'open' && item.recipientId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-actions-${item.recipientId}-${item.stepNumber}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {statusFilter === 'paused' ? (
                              <DropdownMenuItem
                                onClick={() => resumeMutation.mutate(item.recipientId)}
                                disabled={resumeMutation.isPending}
                                data-testid={`action-resume-${item.recipientId}`}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Resume Recipient
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem
                                  onClick={() => pauseMutation.mutate(item.recipientId)}
                                  disabled={pauseMutation.isPending}
                                  data-testid={`action-pause-${item.recipientId}`}
                                >
                                  <Pause className="mr-2 h-4 w-4" />
                                  Pause Recipient
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => skipStepMutation.mutate(item.recipientId)}
                                  disabled={skipStepMutation.isPending}
                                  data-testid={`action-skip-${item.recipientId}`}
                                >
                                  <SkipForward className="mr-2 h-4 w-4" />
                                  Skip This Step
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => sendNowMutation.mutate(item.recipientId)}
                                  disabled={sendNowMutation.isPending}
                                  data-testid={`action-send-now-${item.recipientId}`}
                                >
                                  <Send className="mr-2 h-4 w-4" />
                                  Send Now
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDelayDialog({ open: true, recipientId: item.recipientId, hours: 1 })}
                                  data-testid={`action-delay-${item.recipientId}`}
                                >
                                  <Clock className="mr-2 h-4 w-4" />
                                  Delay by X hours
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => removeMutation.mutate(item.recipientId)}
                                  disabled={removeMutation.isPending}
                                  className="text-destructive"
                                  data-testid={`action-remove-${item.recipientId}`}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove from Sequence
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )
          ) : (
            // PAUSED RECIPIENTS VIEW
            !pausedRecipients || pausedRecipients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No paused recipients
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Sequence</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Last Sent</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pausedRecipients.map((item) => (
                    <TableRow
                      key={item.recipientId}
                      data-testid={`row-paused-${item.recipientId}`}
                    >
                      <TableCell data-testid={`text-paused-name-${item.recipientId}`}>
                        <div>
                          <div className="font-medium">{item.recipientName || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{item.recipientEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-paused-sequence-${item.recipientId}`}>
                        {item.sequenceName}
                      </TableCell>
                      <TableCell data-testid={`text-paused-progress-${item.recipientId}`}>
                        <Badge variant="secondary">
                          Step {item.currentStep} of {item.totalSteps}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-paused-last-sent-${item.recipientId}`}>
                        {formatTimestamp(item.lastStepSentAt)}
                      </TableCell>
                      <TableCell data-testid={`text-paused-messages-${item.recipientId}`}>
                        <Badge variant="outline">
                          {item.messageHistory.length} sent
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`actions-paused-${item.recipientId}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resumeMutation.mutate(item.recipientId)}
                          disabled={resumeMutation.isPending}
                          data-testid={`button-resume-${item.recipientId}`}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Resume
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>

      {/* Delay Dialog */}
      <Dialog open={delayDialog.open} onOpenChange={(open) => setDelayDialog({ ...delayDialog, open })}>
        <DialogContent data-testid="dialog-delay">
          <DialogHeader>
            <DialogTitle>Delay Email Send</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="delay-hours">Delay by (hours)</Label>
              <Input
                id="delay-hours"
                type="number"
                min="0.1"
                step="0.5"
                value={delayDialog.hours}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || val === '.') {
                    setDelayDialog({ ...delayDialog, hours: val as any });
                    return;
                  }
                  const parsed = parseFloat(val);
                  if (isNaN(parsed)) return;
                  setDelayDialog({ ...delayDialog, hours: parsed });
                }}
                onBlur={() => {
                  if (delayDialog.hours === '' || delayDialog.hours === '.' || delayDialog.hours === null as any) {
                    setDelayDialog({ ...delayDialog, hours: 1 });
                  } else {
                    const val = typeof delayDialog.hours === 'string' ? parseFloat(delayDialog.hours) : delayDialog.hours;
                    if (val < 0.1) {
                      setDelayDialog({ ...delayDialog, hours: 0.1 });
                    }
                  }
                }}
                data-testid="input-delay-hours"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Pushes back the next send time for this recipient
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDelayDialog({ open: false, recipientId: null, hours: 1 })}
                data-testid="button-cancel-delay"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (delayDialog.recipientId) {
                    delayMutation.mutate({ recipientId: delayDialog.recipientId, hours: delayDialog.hours });
                  }
                }}
                disabled={delayMutation.isPending || !delayDialog.recipientId}
                data-testid="button-confirm-delay"
              >
                {delayMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Delaying...
                  </>
                ) : (
                  <>Delay Send</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EHub() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sheetId, setSheetId] = useState("");
  const [contactedFilter, setContactedFilter] = useState<string>("all"); // 'all' | 'contacted' | 'not contacted' | 'unknown'
  const [activeTab, setActiveTab] = useState("all-contacts");
  
  // Navigation guard for unsaved settings changes
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showNavigationWarning, setShowNavigationWarning] = useState(false);
  
  // Strategy chat state
  const [strategyMessage, setStrategyMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stepDelays, setStepDelays] = useState<number[]>([]);
  const [repeatLastStep, setRepeatLastStep] = useState<boolean>(false);

  // All Contacts tab state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [contactStatusFilter, setContactStatusFilter] = useState<string>('all');
  const [selectedContacts, setSelectedContacts] = useState<EhubContact[]>([]);
  const [selectAllMode, setSelectAllMode] = useState<'none' | 'page' | 'all'>('none');
  const [isAddToSequenceDialogOpen, setIsAddToSequenceDialogOpen] = useState(false);
  const [targetSequenceId, setTargetSequenceId] = useState<string>('');
  const [deleteSequenceId, setDeleteSequenceId] = useState<string | null>(null);

  // Sequence form state
  const [name, setName] = useState("");

  // Test Email state
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [testSubject, setTestSubject] = useState("");
  const [testBody, setTestBody] = useState("");
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedTestEmailId, setSelectedTestEmailId] = useState<string | null>(null);
  const [followUpSubject, setFollowUpSubject] = useState("");
  const [followUpBody, setFollowUpBody] = useState("");

  // Nuke Test Data state
  const [nukeDialogOpen, setNukeDialogOpen] = useState(false);

  // Reply Scanner state
  const [replyScannnerDialogOpen, setReplyScannerDialogOpen] = useState(false);
  const [scanPreviewResults, setScanPreviewResults] = useState<{
    scanned: number;
    promoted: number;
    errors: number;
    dryRun?: boolean;
    details: Array<{
      recipientId: string;
      email: string;
      status: 'promoted' | 'has_reply' | 'too_recent' | 'error' | 'newly_enrolled' | 'blacklisted';
      message?: string;
      isNew?: boolean;
    }>;
  } | null>(null);
  const [selectedScanEmails, setSelectedScanEmails] = useState<Set<string>>(new Set());

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<EhubSettings>({
    minDelayMinutes: 1,
    maxDelayMinutes: 3,
    jitterPercentage: 50,
    dailyEmailLimit: 200,
    sendingHoursStart: 9,
    sendingHoursEnd: 14,
    clientWindowStartOffset: 1.0,
    clientWindowEndHour: 14,
    promptInjection: "",
    keywordBin: "",
    skipWeekends: true,
  });
  
  // Track original settings for dirty state detection
  const [originalSettings, setOriginalSettings] = useState<EhubSettings | null>(null);
  
  // Check if settings form has unsaved changes
  const isSettingsDirty = originalSettings && JSON.stringify(settingsForm) !== JSON.stringify(originalSettings);

  // Finalize Strategy state - track if textarea has been edited
  const [finalizedStrategyEdit, setFinalizedStrategyEdit] = useState("");

  // Synthetic Email Series Test state
  const [syntheticPreview, setSyntheticPreview] = useState<Array<{stepNumber: number; subject: string; body: string}> | null>(null);
  const [syntheticStoreContext, setSyntheticStoreContext] = useState<{
    name: string;
    link: string | null;
    salesSummary: string | null;
    state: string | null;
    timezone: string;
  } | null>(null);

  // Fetch sequences
  const { data: sequences, isLoading } = useQuery<Sequence[]>({
    queryKey: ['/api/sequences'],
  });

  // Fetch user preferences for blacklist toggle
  const { data: userPreferences } = useQuery<{ blacklistCheckEnabled?: boolean }>({
    queryKey: ['/api/user/preferences'],
  });

  // Fetch E-Hub settings
  const { data: settings } = useQuery<EhubSettings>({
    queryKey: ['/api/ehub/settings'],
  });

  // Fetch all contacts with pagination and filters
  const { data: allContactsData, isLoading: isLoadingContacts } = useQuery<AllContactsResponse>({
    queryKey: ['/api/ehub/all-contacts', page, debouncedSearch, contactStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', '50');
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      if (contactStatusFilter && contactStatusFilter !== 'all') {
        params.append('statusFilter', contactStatusFilter);
      }
      const response = await fetch(`/api/ehub/all-contacts?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      return response.json();
    },
  });

  // Fetch strategy chat transcript for selected sequence
  const { data: strategyTranscript } = useQuery({
    queryKey: ['/api/sequences', selectedSequenceId, 'strategy-chat'],
    enabled: !!selectedSequenceId,
    queryFn: async () => {
      const response = await fetch(`/api/sequences/${selectedSequenceId}/strategy-chat`);
      if (!response.ok) throw new Error('Failed to fetch strategy chat');
      return response.json();
    },
  });

  // Fetch test email history
  const { data: testEmailHistory, isLoading: isLoadingTestEmails } = useQuery<TestEmailSend[]>({
    queryKey: ['/api/test-email/history'],
    enabled: activeTab === 'test-emails' && user?.role === 'admin',
  });

  // Derive current sequence to check for finalized strategy
  const currentSequence = sequences?.find(s => s.id === selectedSequenceId);

  // Generate finalized strategy mutation
  const generateFinalizedStrategyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/sequences/${selectedSequenceId}/finalize-strategy`);
    },
    onSuccess: (data: any) => {
      setFinalizedStrategyEdit(data.finalizedStrategy);
      saveFinalizedStrategyMutation.mutate(data.finalizedStrategy);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate strategy brief",
        variant: "destructive",
      });
    },
  });

  // Save finalized strategy mutation
  const saveFinalizedStrategyMutation = useMutation({
    mutationFn: async (text: string) => {
      return await apiRequest("PATCH", `/api/sequences/${selectedSequenceId}/finalized-strategy`, 
        { finalizedStrategy: text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      toast({
        title: "Success",
        description: "Campaign strategy saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save strategy",
        variant: "destructive",
      });
    },
  });

  // Send strategy chat message mutation
  const sendStrategyChatMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest("POST", `/api/sequences/${selectedSequenceId}/strategy-chat`, { message });
    },
    onSuccess: () => {
      setStrategyMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/sequences', selectedSequenceId, 'strategy-chat'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Save step delays mutation
  const saveStepDelaysMutation = useMutation({
    mutationFn: async (data: { stepDelays: number[], repeatLastStep: boolean }) => {
      return await apiRequest("PUT", `/api/sequences/${selectedSequenceId}/step-delays`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      toast({
        title: "Success",
        description: "Step delays saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save step delays",
        variant: "destructive",
      });
    },
  });

  // Update sequence status mutation
  const updateSequenceStatusMutation = useMutation({
    mutationFn: async ({ sequenceId, status }: { sequenceId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/sequences/${sequenceId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      // Invalidate all queue queries regardless of search/filter parameters
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === '/api/ehub/queue'
      });
      toast({
        title: "Success",
        description: "Sequence status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sequence status",
        variant: "destructive",
      });
    },
  });

  // Scan for replies mutation
  const scanRepliesMutation = useMutation({
    mutationFn: async ({ dryRun, selectedEmails }: { dryRun: boolean; selectedEmails?: string[] }) => {
      return await apiRequest("POST", `/api/ehub/scan-replies`, { dryRun, selectedEmails });
    },
    onSuccess: (data: any) => {
      if (data.dryRun) {
        setScanPreviewResults(data);
        // Auto-select all enrollable emails (not blacklisted, not has_reply)
        const enrollable = data.details
          .filter((d: any) => d.status === 'newly_enrolled' || d.status === 'promoted')
          .map((d: any) => d.email);
        setSelectedScanEmails(new Set(enrollable));
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
        queryClient.invalidateQueries({ 
          predicate: (query) => query.queryKey[0] === '/api/ehub/queue'
        });
        
        const newEnrolled = data.newEnrollments || 0;
        const promoted = data.promoted || 0;
        
        toast({
          title: "Enrollment Complete",
          description: `Enrolled ${newEnrolled} new contacts at Step 0. Promoted ${promoted} to Step 1 for AI follow-ups.`,
        });
        setReplyScannerDialogOpen(false);
        setScanPreviewResults(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to scan for replies",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when transcript changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [strategyTranscript]);

  // Sync edit state when sequence changes or data loads
  useEffect(() => {
    const current = sequences?.find(s => s.id === selectedSequenceId);
    setFinalizedStrategyEdit((current as any)?.finalizedStrategy || "");
  }, [selectedSequenceId, sequences]);

  // Load step delays and repeat checkbox when sequence changes
  useEffect(() => {
    if (selectedSequenceId && sequences) {
      const selectedSeq = sequences.find((s) => s.id === selectedSequenceId);
      if (selectedSeq && (selectedSeq as any).stepDelays) {
        setStepDelays((selectedSeq as any).stepDelays);
        setRepeatLastStep((selectedSeq as any).repeatLastStep || false);
      } else {
        setStepDelays([]);
        setRepeatLastStep(false);
      }
    } else {
      setStepDelays([]);
      setRepeatLastStep(false);
    }
  }, [selectedSequenceId, sequences]);

  // Initialize settings form when data loads
  useEffect(() => {
    if (settings) {
      setSettingsForm(settings);
      setOriginalSettings(settings);
    }
  }, [settings]);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page to 1 when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, contactStatusFilter]);

  // Reset synthetic preview when sequence changes
  useEffect(() => {
    setSyntheticPreview(null);
  }, [selectedSequenceId]);

  // Fetch selected sequence recipients with filter
  const { data: recipients, isLoading: isLoadingRecipients, error: recipientsError } = useQuery<Recipient[]>({
    queryKey: ['/api/sequences', selectedSequenceId, 'recipients', contactedFilter],
    enabled: !!selectedSequenceId,
    queryFn: () => {
      const params = new URLSearchParams();
      if (contactedFilter && contactedFilter !== 'all') {
        params.append('contactedStatus', contactedFilter);
      }
      const url = `/api/sequences/${selectedSequenceId}/recipients?${params.toString()}`;
      return fetch(url).then(res => {
        if (!res.ok) {
          if (res.status === 503) {
            return res.json().then(data => {
              throw new Error(data.message || 'Service unavailable');
            });
          }
          throw new Error('Failed to fetch recipients');
        }
        return res.json();
      });
    },
  });

  // Create sequence mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/sequences', data),
    onSuccess: () => {
      toast({
        title: "Sequence Created",
        description: "Your email sequence has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      setIsCreateDialogOpen(false);
      resetSequenceForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sequence",
        variant: "destructive",
      });
    },
  });

  // Delete sequence mutation
  const deleteMutation = useMutation({
    mutationFn: (sequenceId: string) => apiRequest('DELETE', `/api/sequences/${sequenceId}`),
    onSuccess: (_, sequenceId) => {
      toast({
        title: "Sequence Deleted",
        description: "The sequence and all its data have been permanently deleted.",
      });
      // Invalidate sequences list
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      // Invalidate all queries for the deleted sequence (recipients, strategy chat)
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === '/api/sequences' && 
          query.queryKey[1] === sequenceId
      });
      setDeleteSequenceId(null);
      if (selectedSequenceId === deleteSequenceId) {
        setSelectedSequenceId(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sequence",
        variant: "destructive",
      });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<EhubSettings>) => apiRequest('PATCH', '/api/ehub/settings', data),
    onSuccess: async () => {
      toast({
        title: "Settings Updated",
        description: "Queue is being rescheduled with new settings. Coordinator will pick up changes on next tick.",
      });
      // Invalidate and refetch settings to ensure we have the latest values
      await queryClient.invalidateQueries({ queryKey: ['/api/ehub/settings'] });
      // The useEffect will automatically update both settingsForm and originalSettings when settings refetches
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Update blacklist preference mutation
  const updateBlacklistPreferenceMutation = useMutation({
    mutationFn: (enabled: boolean) => apiRequest('PATCH', '/api/user/preferences', { blacklistCheckEnabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      toast({
        title: "Blacklist Check " + (userPreferences?.blacklistCheckEnabled ? "Disabled" : "Enabled"),
        description: userPreferences?.blacklistCheckEnabled 
          ? "Blacklist checking is now OFF (for testing)"
          : "Blacklist checking is now ON",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update preference",
        variant: "destructive",
      });
    },
  });

  // Import recipients mutation
  const importMutation = useMutation({
    mutationFn: ({ sequenceId, sheetId }: { sequenceId: string; sheetId: string }) =>
      apiRequest('POST', `/api/sequences/${sequenceId}/recipients`, { sheetId }),
    onSuccess: (data: any, variables) => {
      toast({
        title: "Import Complete",
        description: `${data.count} recipients imported successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      // Invalidate all recipients queries for the imported sequence (all filters)
      // Use variables.sequenceId to avoid race conditions if user switches sequences
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === '/api/sequences' && 
          query.queryKey[1] === variables.sequenceId &&
          query.queryKey[2] === 'recipients'
      });
      setIsImportDialogOpen(false);
      setSheetId("");
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import recipients",
        variant: "destructive",
      });
    },
  });

  // Test send mutation
  const testSendMutation = useMutation({
    mutationFn: ({ sequenceId, testEmail }: { sequenceId: string; testEmail: string }) =>
      apiRequest('POST', `/api/sequences/${sequenceId}/test-send`, { testEmail }),
    onSuccess: (data: any) => {
      toast({
        title: "Test Email Sent",
        description: data.message || `Test email sent to ${testEmail}`,
      });
      setIsTestDialogOpen(false);
      setTestEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  // Test Email Sending Mutations
  const sendTestEmailMutation = useMutation({
    mutationFn: (payload: { recipientEmail: string; subject: string; body: string }) => 
      apiRequest('POST', '/api/test-email/send', payload),
    onSuccess: () => {
      toast({ 
        title: "Test Email Sent",
        description: "Your test email has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/test-email/history'] });
      setTestRecipientEmail("");
      setTestSubject("");
      setTestBody("");
    },
    onError: (error: any) => {
      if (error.status === 429) {
        toast({ 
          title: "Rate Limit Exceeded", 
          description: "Maximum 10 test emails per hour. Please wait before sending another.",
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Send Failed", 
          description: error.message || "Unable to send test email",
          variant: "destructive" 
        });
      }
    },
  });

  const checkReplyMutation = useMutation({
    mutationFn: (id: string) => apiRequest('GET', `/api/test-email/check-reply/${id}`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/test-email/history'] });
      toast({
        title: data.hasReply ? "Reply Detected" : "No Reply Yet",
        description: data.hasReply 
          ? `Found ${data.replyCount} ${data.replyCount === 1 ? 'reply' : 'replies'}`
          : "This email has not received any replies.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Check Failed",
        description: error.message || "Unable to check for replies",
        variant: "destructive",
      });
    },
  });

  const sendFollowUpMutation = useMutation({
    mutationFn: ({ id, subject, body }: { id: string; subject: string; body: string }) =>
      apiRequest('POST', `/api/test-email/send-followup/${id}`, { subject, body }),
    onSuccess: () => {
      toast({ 
        title: "Follow-up Sent",
        description: "Your threaded follow-up has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/test-email/history'] });
      setFollowUpDialogOpen(false);
      setSelectedTestEmailId(null);
      setFollowUpSubject("");
      setFollowUpBody("");
    },
    onError: (error: any) => {
      toast({
        title: "Follow-up Failed",
        description: error.message || "Unable to send follow-up",
        variant: "destructive",
      });
    },
  });

  // Synthetic Email Series Test mutation
  const syntheticTestMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/ehub/sequences/${selectedSequenceId}/synthetic-test`),
    onSuccess: (data: { 
      emails: Array<{stepNumber: number; subject: string; body: string}>;
      storeContext: {
        name: string;
        link: string | null;
        salesSummary: string | null;
        state: string | null;
        timezone: string;
      };
    }) => {
      setSyntheticPreview(data.emails);
      setSyntheticStoreContext(data.storeContext);
      toast({
        title: "Test Sequence Generated",
        description: `Generated ${data.emails.length} email previews using: ${data.storeContext.name}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Generation Failed",
        description: error.message || "Unable to generate synthetic emails",
        variant: "destructive",
      });
    },
  });

  // Nuke Test Data mutation
  const nukeTestDataMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/ehub/test-data/nuke', {}),
    onSuccess: (data: any) => {
      toast({
        title: "Test Data Deleted",
        description: `Deleted ${data.recipientsDeleted} recipients, ${data.messagesDeleted} messages, ${data.testEmailsDeleted} test emails, and ${data.sequencesDeleted || 0} empty sequences.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/test-email/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/all-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/paused-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/scheduled-sends'] });
      setNukeDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Unable to delete test data",
        variant: "destructive",
      });
    },
  });

  // Add contacts to sequence mutation
  const addContactsMutation = useMutation({
    mutationFn: ({ sequenceId, contacts, selectAll, search, statusFilter }: {
      sequenceId: string;
      contacts?: EhubContact[];
      selectAll?: boolean;
      search?: string;
      statusFilter?: string;
    }) => apiRequest('POST', `/api/sequences/${sequenceId}/contacts`, {
      contacts,
      selectAll,
      search,
      statusFilter,
    }),
    onSuccess: (data: any) => {
      toast({
        title: "Contacts Added",
        description: `${data.count} contacts added to sequence successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/all-contacts'] });
      setSelectedContacts([]);
      setSelectAllMode('none');
      setIsAddToSequenceDialogOpen(false);
      setTargetSequenceId('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add contacts to sequence",
        variant: "destructive",
      });
    },
  });

  const resetSequenceForm = () => {
    setName("");
  };

  // Selection handlers
  const handleToggleContact = (contact: EhubContact) => {
    setSelectAllMode('none');
    setSelectedContacts(prev => {
      const isSelected = prev.some(c => c.email === contact.email);
      if (isSelected) {
        return prev.filter(c => c.email !== contact.email);
      } else {
        return [...prev, contact];
      }
    });
  };

  const handleSelectAllOnPage = () => {
    if (selectAllMode === 'page') {
      setSelectedContacts([]);
      setSelectAllMode('none');
    } else {
      setSelectedContacts(allContactsData?.contacts || []);
      setSelectAllMode('page');
    }
  };

  const handleSelectAllMatching = () => {
    setSelectAllMode('all');
    setSelectedContacts([]);
  };

  const handleClearSelection = () => {
    setSelectedContacts([]);
    setSelectAllMode('none');
  };

  const handleAddToSequence = () => {
    if (!targetSequenceId) return;
    
    if (selectAllMode === 'all') {
      addContactsMutation.mutate({
        sequenceId: targetSequenceId,
        selectAll: true,
        search: debouncedSearch,
        statusFilter: contactStatusFilter,
      });
    } else {
      addContactsMutation.mutate({
        sequenceId: targetSequenceId,
        contacts: selectedContacts,
      });
    }
  };

  const handleCreateSequence = () => {
    createMutation.mutate({
      name,
    });
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settingsForm);
  };

  const handleDiscardSettings = () => {
    if (originalSettings) {
      setSettingsForm(originalSettings);
      toast({
        title: "Changes Discarded",
        description: "Settings have been reset to the last saved values.",
      });
    }
  };

  const handleTabChange = (newTab: string) => {
    // If leaving settings tab with unsaved changes, show warning
    if (activeTab === 'settings' && isSettingsDirty) {
      setPendingTab(newTab);
      setShowNavigationWarning(true);
    } else {
      setActiveTab(newTab);
    }
  };

  const handleConfirmNavigation = () => {
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
    setShowNavigationWarning(false);
  };

  const handleCancelNavigation = () => {
    setPendingTab(null);
    setShowNavigationWarning(false);
  };

  const handleImport = () => {
    if (!selectedSequenceId) return;
    importMutation.mutate({ sequenceId: selectedSequenceId, sheetId });
  };

  const handleTestSend = () => {
    if (!selectedSequenceId) return;
    testSendMutation.mutate({ sequenceId: selectedSequenceId, testEmail });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'paused':
        return 'secondary';
      case 'completed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">E-Hub</h1>
          <p className="text-muted-foreground">Email sequence automation system</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="all-contacts" data-testid="tab-all-contacts">
            <Database className="w-4 h-4 mr-2" />
            All Contacts
          </TabsTrigger>
          <TabsTrigger value="sequences" data-testid="tab-sequences">
            <Mail className="w-4 h-4 mr-2" />
            Sequences
          </TabsTrigger>
          <TabsTrigger value="recipients" data-testid="tab-recipients">
            <Users className="w-4 h-4 mr-2" />
            Recipients
          </TabsTrigger>
          <TabsTrigger value="strategy" data-testid="tab-strategy">
            <MessageSquare className="w-4 h-4 mr-2" />
            Campaign Strategy
          </TabsTrigger>
          <TabsTrigger value="queue" data-testid="tab-queue">
            <Mail className="w-4 h-4 mr-2" />
            Queue
          </TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="scanner" data-testid="tab-scanner">
              <Search className="w-4 h-4 mr-2" />
              Scanner
            </TabsTrigger>
          )}
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="test-emails" data-testid="tab-test-emails">
              <TestTube2 className="w-4 h-4 mr-2" />
              Test Emails
            </TabsTrigger>
          )}
        </TabsList>

        {/* All Contacts Tab */}
        <TabsContent value="all-contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Contacts</CardTitle>
                  <CardDescription>Master contact list from Store Database</CardDescription>
                </div>
                <ToggleGroup
                  type="single"
                  value={contactStatusFilter}
                  onValueChange={(value) => value && setContactStatusFilter(value)}
                  data-testid="filter-contact-status"
                >
                  <ToggleGroupItem value="all" data-testid="filter-all">
                    All ({allContactsData?.statusCounts.all || 0})
                  </ToggleGroupItem>
                  <ToggleGroupItem value="neverContacted" data-testid="filter-never-contacted">
                    Never Contacted ({allContactsData?.statusCounts.neverContacted || 0})
                  </ToggleGroupItem>
                  <ToggleGroupItem value="inSequence" data-testid="filter-in-sequence">
                    In Sequence ({allContactsData?.statusCounts.inSequence || 0})
                  </ToggleGroupItem>
                  <ToggleGroupItem value="replied" data-testid="filter-replied">
                    Replied ({allContactsData?.statusCounts.replied || 0})
                  </ToggleGroupItem>
                  <ToggleGroupItem value="bounced" data-testid="filter-bounced">
                    Bounced ({allContactsData?.statusCounts.bounced || 0})
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="pt-4">
                <Input
                  placeholder="Search by name, email, state..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-contacts"
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingContacts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : !allContactsData?.contacts || allContactsData.contacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No contacts found
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectAllMode === 'page' || selectAllMode === 'all'}
                            onCheckedChange={handleSelectAllOnPage}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead>Sales Summary</TableHead>
                        <TableHead>Sequences</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allContactsData.contacts.map((contact) => {
                        const isSelected = selectedContacts.some(c => c.email === contact.email) || selectAllMode === 'all';
                        return (
                          <TableRow key={contact.email} data-testid={`row-contact-${contact.email}`}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleContact(contact)}
                                data-testid={`checkbox-contact-${contact.email}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{contact.name}</TableCell>
                            <TableCell>{contact.email}</TableCell>
                            <TableCell>{contact.state || '—'}</TableCell>
                            <TableCell>{contact.hours || '—'}</TableCell>
                            <TableCell>
                              {contact.link ? (
                                <a
                                  href={contact.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  View
                                </a>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className="max-w-md truncate">
                              {contact.salesSummary || '—'}
                            </TableCell>
                            <TableCell>
                              {contact.sequenceNames.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {contact.sequenceNames.map((seqName) => (
                                    <Badge
                                      key={seqName}
                                      variant="outline"
                                      data-testid={`badge-sequence-${seqName}`}
                                    >
                                      {seqName}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Select All Matching Banner */}
                  {selectAllMode === 'page' && allContactsData.total > allContactsData.contacts.length && (
                    <div className="mt-4 p-3 bg-muted rounded-md flex items-center justify-between">
                      <span className="text-sm">
                        All {allContactsData.contacts.length} contacts on this page are selected.
                      </span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleSelectAllMatching}
                        data-testid="button-select-all-matching"
                      >
                        Select all {allContactsData.total} matching contacts
                      </Button>
                    </div>
                  )}

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {page} of {Math.ceil((allContactsData?.total || 0) / 50) || 1}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        data-testid="button-prev-page"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= Math.ceil((allContactsData?.total || 0) / 50)}
                        data-testid="button-next-page"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Floating Action Bar */}
          {(selectedContacts.length > 0 || selectAllMode === 'all') && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground shadow-lg rounded-lg px-6 py-4 flex items-center gap-4 z-50">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span className="font-medium">
                  {selectAllMode === 'all'
                    ? `All ${allContactsData?.total || 0} matching contacts selected`
                    : `${selectedContacts.length} contact${selectedContacts.length !== 1 ? 's' : ''} selected`}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddToSequenceDialogOpen(true)}
                  data-testid="button-add-to-sequence"
                >
                  Add to Sequence
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  data-testid="button-clear-selection"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Sequences Tab */}
        <TabsContent value="sequences" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReplyScannerDialogOpen(true);
                scanRepliesMutation.mutate({ dryRun: true });
              }}
              disabled={scanRepliesMutation.isPending}
              data-testid="button-scan-replies"
            >
              {scanRepliesMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Scan for Replies
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-sequence">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Sequence
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create AI Email Sequence</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    AI will generate all email content based on your campaign strategy
                  </p>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Sequence Name</Label>
                    <Input
                      id="name"
                      data-testid="input-sequence-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Cold Outreach Q1 2025"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateSequence}
                    disabled={!name || createMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Sequence
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {sequences && sequences.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Sequences Yet</CardTitle>
                <CardDescription>
                  Create your first email sequence to get started with automated outreach.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Sequences</CardTitle>
                <CardDescription>Manage your email sequences</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Steps</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Replies</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sequences?.map((sequence) => (
                      <TableRow 
                        key={sequence.id} 
                        data-testid={`row-sequence-${sequence.id}`}
                        className="cursor-pointer hover-elevate"
                        onClick={() => {
                          setSelectedSequenceId(sequence.id);
                          setActiveTab("recipients");
                        }}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {sequence.name}
                            {sequence.isSystem && (
                              <Badge variant="outline" className="text-xs">
                                🔒 System
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{sequence.stepDelays?.length || 0} steps</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(sequence.status)}>
                            {sequence.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{sequence.totalRecipients || 0}</TableCell>
                        <TableCell>{sequence.sentCount || 0}</TableCell>
                        <TableCell>{sequence.repliedCount || 0}</TableCell>
                        <TableCell>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSequenceId(sequence.id);
                                setIsImportDialogOpen(true);
                              }}
                              data-testid={`button-import-${sequence.id}`}
                            >
                              <Upload className="w-4 h-4 mr-1" />
                              Import
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSequenceId(sequence.id);
                                setIsTestDialogOpen(true);
                              }}
                              data-testid={`button-test-${sequence.id}`}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Test
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={async () => {
                                const newStatus = sequence.status === 'paused' ? 'active' : 'paused';
                                await updateSequenceStatusMutation.mutateAsync({ sequenceId: sequence.id, status: newStatus });
                              }}
                              disabled={updateSequenceStatusMutation.isPending}
                              data-testid={`button-pause-resume-${sequence.id}`}
                              title={sequence.status === 'paused' ? 'Resume sequence' : 'Pause sequence'}
                            >
                              {sequence.status === 'paused' ? (
                                <Play className="w-4 h-4" />
                              ) : (
                                <Pause className="w-4 h-4" />
                              )}
                            </Button>
                            {!sequence.isSystem && (
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => setDeleteSequenceId(sequence.id)}
                                data-testid={`button-delete-${sequence.id}`}
                                title="Delete sequence"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Recipients Tab */}
        <TabsContent value="recipients" className="space-y-4">
          {!selectedSequenceId ? (
            <Card>
              <CardHeader>
                <CardTitle>No Sequence Selected</CardTitle>
                <CardDescription>
                  Select a sequence from the Sequences tab to view its recipients.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : recipientsError ? (
            <Alert variant="destructive" data-testid="alert-recipients-error">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Commission Tracker Error</AlertTitle>
              <AlertDescription>
                {(recipientsError as Error).message || 'Failed to load recipients. Please check your Commission Tracker configuration.'}
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recipients</CardTitle>
                    <CardDescription>
                      Sequence recipients with Commission Tracker status
                    </CardDescription>
                  </div>
                  <ToggleGroup 
                    type="single" 
                    value={contactedFilter} 
                    onValueChange={(value) => value && setContactedFilter(value)}
                    data-testid="filter-contacted-status"
                  >
                    <ToggleGroupItem value="all" data-testid="filter-all">
                      All {recipients && `(${recipients.length})`}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="contacted" data-testid="filter-contacted">
                      Contacted
                    </ToggleGroupItem>
                    <ToggleGroupItem value="not contacted" data-testid="filter-not-contacted">
                      Not Contacted
                    </ToggleGroupItem>
                    <ToggleGroupItem value="unknown" data-testid="filter-unknown">
                      Unknown
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingRecipients ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : !recipients || recipients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No recipients found{contactedFilter !== 'all' ? ` with status "${contactedFilter}"` : ''}.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead>Tracker Status</TableHead>
                        <TableHead>Contacted</TableHead>
                        <TableHead>Sales Summary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients.map((recipient) => (
                        <TableRow key={recipient.id} data-testid={`row-recipient-${recipient.id}`}>
                          <TableCell className="font-medium">{recipient.name}</TableCell>
                          <TableCell>{recipient.email}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            <a 
                              href={recipient.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {recipient.link}
                            </a>
                          </TableCell>
                          <TableCell>
                            {recipient.trackerStatus ? (
                              <Badge variant="outline">{recipient.trackerStatus}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                recipient.contactedStatus === 'contacted' 
                                  ? 'default' 
                                  : recipient.contactedStatus === 'unknown'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              data-testid={`badge-contacted-${recipient.contactedStatus}`}
                            >
                              {recipient.contactedStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md truncate">{recipient.salesSummary || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Campaign Strategy Tab */}
        <TabsContent value="strategy" className="space-y-4">
          {/* Sequence Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Strategy</CardTitle>
              <CardDescription>
                Create sequences, chat with AI to plan campaigns, and configure timing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Inline Create Form */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-medium">Create New Sequence</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  AI will generate all email content based on your strategy conversation
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Cold Outreach Q1 2025"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && name) {
                        handleCreateSequence();
                      }
                    }}
                    data-testid="input-sequence-name-inline"
                  />
                  <Button
                    onClick={handleCreateSequence}
                    disabled={!name || createMutation.isPending}
                    data-testid="button-create-sequence-inline"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Create
                  </Button>
                </div>
              </div>
              
              {/* Existing Sequence Selector */}
              <div>
                <Label htmlFor="strategy-sequence-select">Or Select Existing Sequence</Label>
                <select
                  id="strategy-sequence-select"
                  data-testid="select-sequence-strategy"
                  className="w-full mt-2 rounded-md border border-input bg-background px-3 py-2"
                  value={selectedSequenceId || ''}
                  onChange={(e) => setSelectedSequenceId(e.target.value || null)}
                >
                  <option value="">Select a sequence...</option>
                  {sequences?.map((seq) => (
                    <option key={seq.id} value={seq.id}>
                      {seq.name} ({seq.status})
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Content: show only when sequence is selected */}
          {selectedSequenceId ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Chat Interface */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle>AI Strategy Chat</CardTitle>
                        <CardDescription>
                          Discuss your campaign goals, target audience, and messaging with the AI
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => generateFinalizedStrategyMutation.mutate()}
                        disabled={!strategyTranscript?.messages?.length || generateFinalizedStrategyMutation.isPending}
                        data-testid="button-finalize-strategy"
                      >
                        {generateFinalizedStrategyMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Finalize Strategy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Chat Transcript */}
                    <ScrollArea className="h-96 border rounded-md p-4 bg-muted/10" ref={scrollRef as any}>
                      {strategyTranscript && strategyTranscript.messages && strategyTranscript.messages.length > 0 ? (
                        <div className="space-y-4">
                          {strategyTranscript.messages.map((msg: any) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                              data-testid={`message-${msg.role}`}
                            >
                              <div
                                className={`flex gap-2 max-w-[80%] ${
                                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                }`}
                              >
                                <div className="shrink-0">
                                  {msg.role === 'user' ? (
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                      <UserIcon className="w-4 h-4 text-primary-foreground" />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                                      <Bot className="w-4 h-4 text-secondary-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div
                                  className={`rounded-lg p-3 ${
                                    msg.role === 'user'
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-card border'
                                  }`}
                                >
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                  <p className="text-xs opacity-70 mt-1">
                                    {new Date(msg.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {sendStrategyChatMutation.isPending && (
                            <div className="flex justify-start">
                              <div className="flex gap-2 max-w-[80%]">
                                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                                  <Bot className="w-4 h-4 text-secondary-foreground" />
                                </div>
                                <div className="rounded-lg p-3 bg-card border">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-sm text-muted-foreground text-center">
                            Start a conversation with the AI to plan your campaign strategy
                          </p>
                        </div>
                      )}
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="flex gap-2">
                      <Textarea
                        value={strategyMessage}
                        onChange={(e) => setStrategyMessage(e.target.value)}
                        placeholder="Ask the AI about your campaign strategy..."
                        className="flex-1 min-h-[60px] max-h-[200px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (strategyMessage.trim() && !sendStrategyChatMutation.isPending) {
                              sendStrategyChatMutation.mutate(strategyMessage);
                            }
                          }
                        }}
                        disabled={sendStrategyChatMutation.isPending}
                        data-testid="input-strategy-message"
                      />
                      <Button
                        onClick={() => sendStrategyChatMutation.mutate(strategyMessage)}
                        disabled={!strategyMessage.trim() || sendStrategyChatMutation.isPending}
                        size="icon"
                        data-testid="button-send-strategy-message"
                      >
                        {sendStrategyChatMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Configuration */}
              <div className="space-y-4">
                {/* Step Delays Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Step Delays</CardTitle>
                    <CardDescription>
                      Configure the delay (in days) before each email step
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {stepDelays.length > 0 ? (
                      <div className="space-y-3">
                        {stepDelays.map((delay, index) => {
                        const isLastStep = index === stepDelays.length - 1;
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <Label htmlFor={`delay-${index}`} className="text-xs">
                                  {index === 0 ? 'Delay before Email 1 (days)' : `Delay before Email ${index + 1} (days)`}
                                </Label>
                                <Input
                                  id={`delay-${index}`}
                                  type="number"
                                  step="0.0001"
                                  min="0"
                                  value={delay}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const newDelays = [...stepDelays];
                                    if (val === '' || val === '.') {
                                      newDelays[index] = val as any;
                                      setStepDelays(newDelays);
                                      return;
                                    }
                                    const parsed = parseFloat(val);
                                    if (isNaN(parsed)) return;
                                    newDelays[index] = parsed;
                                    setStepDelays(newDelays);
                                  }}
                                  onBlur={() => {
                                    const newDelays = [...stepDelays];
                                    if (delay === '' || delay === '.' || delay === null as any) {
                                      newDelays[index] = 0;
                                      setStepDelays(newDelays);
                                    } else {
                                      const val = typeof delay === 'string' ? parseFloat(delay) : delay;
                                      if (val < 0) {
                                        newDelays[index] = 0;
                                        setStepDelays(newDelays);
                                      }
                                    }
                                  }}
                                  data-testid={`input-step-delay-${index}`}
                                  className="mt-1"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const newDelays = stepDelays.filter((_, i) => i !== index);
                                  setStepDelays(newDelays);
                                }}
                                data-testid={`button-remove-delay-${index}`}
                                title="Remove this step delay"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            {isLastStep && stepDelays.length > 0 && (
                              <div className="flex items-center gap-2 pl-1">
                                <Checkbox
                                  id="repeat-last-step"
                                  checked={repeatLastStep}
                                  onCheckedChange={(checked) => setRepeatLastStep(!!checked)}
                                  data-testid="checkbox-repeat-last-step"
                                />
                                <Label htmlFor="repeat-last-step" className="text-xs text-muted-foreground cursor-pointer">
                                  Repeat this step every {delay} days until reply
                                </Label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No step delays configured yet
                      </p>
                    )}
                    
                    {/* Validation feedback */}
                    {stepDelays.length > 0 && (() => {
                      const hasNegative = stepDelays.some((d) => d < 0);
                      
                      if (hasNegative) {
                        return (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              All delays must be non-negative (0 or greater).
                            </AlertDescription>
                          </Alert>
                        );
                      }
                      return null;
                    })()}
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const lastDelay = stepDelays.length > 0 ? stepDelays[stepDelays.length - 1] : 0;
                          setStepDelays([...stepDelays, lastDelay + 1]);
                        }}
                        data-testid="button-add-delay"
                        className="flex-1"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Delay
                      </Button>
                      <Button
                        onClick={() => {
                          // Validate before saving
                          const hasNegative = stepDelays.some((d) => d < 0);
                          
                          if (hasNegative) {
                            toast({
                              title: "Invalid Delays",
                              description: "All delays must be non-negative (0 or greater)",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          saveStepDelaysMutation.mutate({ stepDelays, repeatLastStep });
                        }}
                        disabled={
                          saveStepDelaysMutation.isPending || 
                          stepDelays.length === 0 ||
                          stepDelays.some((d) => d < 0)
                        }
                        data-testid="button-save-delays"
                        className="flex-1"
                      >
                        {saveStepDelaysMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        Save Delays
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Campaign Brief Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Campaign Brief</CardTitle>
                      <Badge variant={(currentSequence as any)?.finalizedStrategy ? 'default' : 'outline'} data-testid="badge-brief-status">
                        {(currentSequence as any)?.finalizedStrategy ? 'Finalized' : 'Draft'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!finalizedStrategyEdit ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <p>Click "Finalize Strategy" above to generate your campaign brief from the AI conversation</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Textarea
                          value={finalizedStrategyEdit}
                          onChange={(e) => setFinalizedStrategyEdit(e.target.value)}
                          placeholder="Your campaign brief will appear here..."
                          className="min-h-[300px] font-mono text-sm"
                          data-testid="textarea-campaign-brief"
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {finalizedStrategyEdit.split(/\s+/).filter(w => w).length} words
                          </p>
                          {finalizedStrategyEdit !== ((currentSequence as any)?.finalizedStrategy || "") && (
                            <Button
                              size="sm"
                              onClick={() => saveFinalizedStrategyMutation.mutate(finalizedStrategyEdit)}
                              disabled={!finalizedStrategyEdit.trim() || saveFinalizedStrategyMutation.isPending}
                              data-testid="button-save-brief"
                            >
                              {saveFinalizedStrategyMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : null}
                              Save Changes
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Status & Activate Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {sequences && selectedSequenceId && (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Current Status:</span>
                            <Badge
                              variant={
                                sequences.find((s) => s.id === selectedSequenceId)?.status === 'active'
                                  ? 'default'
                                  : 'secondary'
                              }
                              data-testid="badge-sequence-status"
                            >
                              {sequences.find((s) => s.id === selectedSequenceId)?.status || 'draft'}
                            </Badge>
                          </div>
                          
                          {strategyTranscript?.lastUpdatedAt && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Last Updated:</span>
                              <span className="text-sm text-muted-foreground">
                                {new Date(strategyTranscript.lastUpdatedAt).toLocaleString()}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Step Delays:</span>
                            <span className="text-sm text-muted-foreground">
                              {stepDelays.length} step{stepDelays.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Strategy Messages:</span>
                            <span className="text-sm text-muted-foreground">
                              {strategyTranscript?.messages?.length || 0} message{strategyTranscript?.messages?.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2">
                          {(() => {
                            const currentStatus = sequences.find((s) => s.id === selectedSequenceId)?.status || 'draft';
                            const currentSequence = sequences.find((s) => s.id === selectedSequenceId);
                            const hasCampaignBrief = !!(currentSequence as any)?.finalizedStrategy?.trim();
                            const hasMessages = strategyTranscript?.messages && strategyTranscript.messages.length > 0;
                            const hasValidDelays = stepDelays.length > 0 && stepDelays.every((d) => d >= 0);
                            const canActivate = hasCampaignBrief && hasMessages && hasValidDelays;
                            
                            return currentStatus === 'active' ? (
                              <Button
                                variant="outline"
                                onClick={() => updateSequenceStatusMutation.mutate('draft')}
                                disabled={updateSequenceStatusMutation.isPending}
                                data-testid="button-deactivate-sequence"
                                className="w-full"
                              >
                                {updateSequenceStatusMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : null}
                                Deactivate Campaign
                              </Button>
                            ) : (
                              <div className="space-y-2">
                                <Button
                                  onClick={() => {
                                    // Double-check validation before activating
                                    const currentSequence = sequences.find((s) => s.id === selectedSequenceId);
                                    const hasCampaignBrief = !!(currentSequence as any)?.finalizedStrategy?.trim();
                                    const hasMessages = strategyTranscript?.messages && strategyTranscript.messages.length > 0;
                                    const hasValidDelays = stepDelays.length > 0 && stepDelays.every((d) => d >= 0) && 
                                      stepDelays.every((d, i) => i === 0 || d > stepDelays[i - 1]);
                                    
                                    if (!hasCampaignBrief) {
                                      toast({
                                        title: "Cannot Activate",
                                        description: "Campaign Brief is required. Complete 'Finalize Strategy' in the Strategy tab first.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    
                                    if (!hasMessages) {
                                      toast({
                                        title: "Cannot Activate",
                                        description: "Add at least one strategy message before activating",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    
                                    if (!hasValidDelays) {
                                      toast({
                                        title: "Cannot Activate",
                                        description: "Configure valid step delays (non-negative, ascending) before activating",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    
                                    updateSequenceStatusMutation.mutate('active');
                                  }}
                                  disabled={!canActivate || updateSequenceStatusMutation.isPending}
                                  data-testid="button-activate-sequence"
                                  className="w-full"
                                >
                                  {updateSequenceStatusMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : null}
                                  Activate Campaign
                                </Button>
                                {!canActivate && (
                                  <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                      {!hasCampaignBrief && "Complete 'Finalize Strategy' first. "}
                                      {!hasMessages && "Add at least one strategy message. "}
                                      {!hasValidDelays && "Configure valid step delays (non-negative, ascending)."}
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  Select a sequence to begin planning your campaign strategy
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Queue Tab with sub-tabs */}
        <TabsContent value="queue" className="space-y-4">
          <Tabs defaultValue="active-queue" className="w-full">
            <TabsList data-testid="tabs-queue-view">
              <TabsTrigger value="active-queue" data-testid="tab-active-queue">
                Queue
              </TabsTrigger>
              <TabsTrigger value="sent-history" data-testid="tab-sent-history">
                Sent History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="active-queue" className="mt-4">
              <QueueView />
            </TabsContent>
            
            <TabsContent value="sent-history" className="mt-4">
              <SentHistoryView />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Scanner Management Tab (Admin Only) */}
        {user?.role === 'admin' && (
          <TabsContent value="scanner" className="space-y-4">
            <ScannerManagementView />
          </TabsContent>
        )}

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global E-Hub Settings</CardTitle>
              <CardDescription>
                Configure system-wide settings for email sending, AI personalization, and automation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Sending Configuration</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="startHour">Start Hour (24h)</Label>
                    <Input
                      id="startHour"
                      data-testid="input-settings-start-hour"
                      type="number"
                      value={settingsForm.sendingHoursStart}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Allow empty string during typing
                        if (val === '') {
                          setSettingsForm({ ...settingsForm, sendingHoursStart: '' as any });
                          return;
                        }
                        const newStart = parseInt(val, 10);
                        if (isNaN(newStart)) return;
                        
                        const optimal = calculateOptimalDelays(
                          newStart,
                          settingsForm.sendingHoursEnd,
                          settingsForm.dailyEmailLimit,
                          settingsForm.jitterPercentage
                        );
                        setSettingsForm({ 
                          ...settingsForm, 
                          sendingHoursStart: newStart,
                          minDelayMinutes: optimal.minDelayMinutes,
                          maxDelayMinutes: optimal.maxDelayMinutes
                        });
                      }}
                      onBlur={() => {
                        if (settingsForm.sendingHoursStart === '' || settingsForm.sendingHoursStart === null as any) {
                          const optimal = calculateOptimalDelays(9, settingsForm.sendingHoursEnd, settingsForm.dailyEmailLimit, settingsForm.jitterPercentage);
                          setSettingsForm({ ...settingsForm, sendingHoursStart: 9, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                        } else if (settingsForm.sendingHoursStart < 0) {
                          const optimal = calculateOptimalDelays(0, settingsForm.sendingHoursEnd, settingsForm.dailyEmailLimit, settingsForm.jitterPercentage);
                          setSettingsForm({ ...settingsForm, sendingHoursStart: 0, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                        } else if (settingsForm.sendingHoursStart > 23) {
                          const optimal = calculateOptimalDelays(23, settingsForm.sendingHoursEnd, settingsForm.dailyEmailLimit, settingsForm.jitterPercentage);
                          setSettingsForm({ ...settingsForm, sendingHoursStart: 23, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                        }
                      }}
                      min={0}
                      max={23}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endHour">End Hour (24h)</Label>
                    <Input
                      id="endHour"
                      data-testid="input-settings-end-hour"
                      type="number"
                      value={settingsForm.sendingHoursEnd}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setSettingsForm({ ...settingsForm, sendingHoursEnd: '' as any });
                          return;
                        }
                        const newEnd = parseInt(val, 10);
                        if (isNaN(newEnd)) return;
                        
                        const optimal = calculateOptimalDelays(
                          settingsForm.sendingHoursStart,
                          newEnd,
                          settingsForm.dailyEmailLimit,
                          settingsForm.jitterPercentage
                        );
                        setSettingsForm({ 
                          ...settingsForm, 
                          sendingHoursEnd: newEnd,
                          minDelayMinutes: optimal.minDelayMinutes,
                          maxDelayMinutes: optimal.maxDelayMinutes
                        });
                      }}
                      onBlur={() => {
                        if (settingsForm.sendingHoursEnd === '' || settingsForm.sendingHoursEnd === null as any) {
                          const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, 14, settingsForm.dailyEmailLimit, settingsForm.jitterPercentage);
                          setSettingsForm({ ...settingsForm, sendingHoursEnd: 14, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                        } else if (settingsForm.sendingHoursEnd < 0) {
                          const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, 0, settingsForm.dailyEmailLimit, settingsForm.jitterPercentage);
                          setSettingsForm({ ...settingsForm, sendingHoursEnd: 0, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                        } else if (settingsForm.sendingHoursEnd > 23) {
                          const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, 23, settingsForm.dailyEmailLimit, settingsForm.jitterPercentage);
                          setSettingsForm({ ...settingsForm, sendingHoursEnd: 23, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                        }
                      }}
                      min={0}
                      max={23}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dailyLimit">Daily Email Limit</Label>
                    <Input
                      id="dailyLimit"
                      data-testid="input-settings-daily-limit"
                      type="number"
                      value={settingsForm.dailyEmailLimit}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setSettingsForm({ ...settingsForm, dailyEmailLimit: '' as any });
                          return;
                        }
                        const newLimit = parseInt(val, 10);
                        if (isNaN(newLimit)) return;
                        
                        const optimal = calculateOptimalDelays(
                          settingsForm.sendingHoursStart,
                          settingsForm.sendingHoursEnd,
                          newLimit,
                          settingsForm.jitterPercentage
                        );
                        setSettingsForm({ 
                          ...settingsForm, 
                          dailyEmailLimit: newLimit,
                          minDelayMinutes: optimal.minDelayMinutes,
                          maxDelayMinutes: optimal.maxDelayMinutes
                        });
                      }}
                      onBlur={() => {
                        if (settingsForm.dailyEmailLimit === '' || settingsForm.dailyEmailLimit === null as any) {
                          const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, settingsForm.sendingHoursEnd, 200, settingsForm.jitterPercentage);
                          setSettingsForm({ ...settingsForm, dailyEmailLimit: 200, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                        } else if (settingsForm.dailyEmailLimit < 1) {
                          const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, settingsForm.sendingHoursEnd, 1, settingsForm.jitterPercentage);
                          setSettingsForm({ ...settingsForm, dailyEmailLimit: 1, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                        } else if (settingsForm.dailyEmailLimit > 2000) {
                          const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, settingsForm.sendingHoursEnd, 2000, settingsForm.jitterPercentage);
                          setSettingsForm({ ...settingsForm, dailyEmailLimit: 2000, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                        }
                      }}
                      min={1}
                      max={2000}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your sending window: when your team can send emails (Gmail limit: 500-2000/day)
                </p>

                {/* Calculated Email Spacing Display */}
                <div className="rounded-md bg-muted/50 p-4 border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Calculated Email Spacing</p>
                      <p className="text-xs text-muted-foreground">
                        Based on company sending window and daily limit
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {(() => {
                          const companyWindowHours = settingsForm.sendingHoursEnd - settingsForm.sendingHoursStart;
                          const companyWindowMinutes = companyWindowHours * 60;
                          const averageSpacing = settingsForm.dailyEmailLimit > 0 
                            ? companyWindowMinutes / settingsForm.dailyEmailLimit 
                            : 5;
                          return Math.round(averageSpacing);
                        })()}
                        <span className="text-sm font-normal text-muted-foreground ml-1">min</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {settingsForm.sendingHoursEnd - settingsForm.sendingHoursStart}hr window ÷ {settingsForm.dailyEmailLimit} emails
                      </p>
                    </div>
                  </div>
                </div>

                {/* Jitter Controls (Auto-calculated) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Random Jitter Range</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        Auto-calculated to create natural variation (±
                        <Input
                          type="number"
                          value={settingsForm.jitterPercentage}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setSettingsForm({ ...settingsForm, jitterPercentage: '' as any });
                              return;
                            }
                            const newJitter = parseInt(val, 10);
                            if (isNaN(newJitter)) return;
                            
                            const optimal = calculateOptimalDelays(
                              settingsForm.sendingHoursStart,
                              settingsForm.sendingHoursEnd,
                              settingsForm.dailyEmailLimit,
                              newJitter
                            );
                            setSettingsForm({
                              ...settingsForm,
                              jitterPercentage: newJitter,
                              minDelayMinutes: optimal.minDelayMinutes,
                              maxDelayMinutes: optimal.maxDelayMinutes
                            });
                          }}
                          onBlur={() => {
                            if (settingsForm.jitterPercentage === '' || settingsForm.jitterPercentage === null as any) {
                              const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, settingsForm.sendingHoursEnd, settingsForm.dailyEmailLimit, 50);
                              setSettingsForm({ ...settingsForm, jitterPercentage: 50, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                            } else if (settingsForm.jitterPercentage < 1) {
                              const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, settingsForm.sendingHoursEnd, settingsForm.dailyEmailLimit, 1);
                              setSettingsForm({ ...settingsForm, jitterPercentage: 1, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                            } else if (settingsForm.jitterPercentage > 100) {
                              const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, settingsForm.sendingHoursEnd, settingsForm.dailyEmailLimit, 100);
                              setSettingsForm({ ...settingsForm, jitterPercentage: 100, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                            }
                          }}
                          min={1}
                          max={100}
                          className="w-14 h-6 px-2 text-xs text-center"
                          data-testid="input-jitter-percentage"
                        />
                        <span className="font-bold">%</span> of spacing)
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-md bg-muted/30 p-3 border border-dashed">
                      <Label className="text-xs text-muted-foreground">Min Jitter</Label>
                      <p className="text-lg font-semibold">{settingsForm.minDelayMinutes} min</p>
                    </div>
                    <div className="rounded-md bg-muted/30 p-3 border border-dashed">
                      <Label className="text-xs text-muted-foreground">Max Jitter</Label>
                      <p className="text-lg font-semibold">{settingsForm.maxDelayMinutes} min</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Client Time Range</h3>
                  <p className="text-sm text-muted-foreground">
                    When emails are delivered in recipient's local timezone
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="clientStartOffset" className="text-xs">Start Offset After Opening (hours)</Label>
                      <Input
                        id="clientStartOffset"
                        data-testid="input-settings-client-start-offset"
                        type="number"
                        step="0.25"
                        value={settingsForm.clientWindowStartOffset}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || val === '.') {
                            setSettingsForm({ ...settingsForm, clientWindowStartOffset: val as any });
                            return;
                          }
                          const newOffset = parseFloat(val);
                          if (isNaN(newOffset)) return;
                          
                          setSettingsForm({ 
                            ...settingsForm, 
                            clientWindowStartOffset: newOffset
                          });
                        }}
                        onBlur={() => {
                          if (settingsForm.clientWindowStartOffset === '' || settingsForm.clientWindowStartOffset === '.' || settingsForm.clientWindowStartOffset === null as any) {
                            setSettingsForm({ ...settingsForm, clientWindowStartOffset: 1.0 });
                          } else {
                            const val = typeof settingsForm.clientWindowStartOffset === 'string' 
                              ? parseFloat(settingsForm.clientWindowStartOffset) 
                              : settingsForm.clientWindowStartOffset;
                            if (val < 0) {
                              setSettingsForm({ ...settingsForm, clientWindowStartOffset: 0 });
                            } else if (val > 24) {
                              setSettingsForm({ ...settingsForm, clientWindowStartOffset: 24 });
                            }
                          }
                        }}
                        min={0}
                        max={24}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        e.g., 1.0 = 1 hour after opening
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="clientEndHour" className="text-xs">Cutoff Hour (24h local time)</Label>
                      <Input
                        id="clientEndHour"
                        data-testid="input-settings-client-end-hour"
                        type="number"
                        value={settingsForm.clientWindowEndHour}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setSettingsForm({ ...settingsForm, clientWindowEndHour: '' as any });
                            return;
                          }
                          const newCutoff = parseInt(val, 10);
                          if (isNaN(newCutoff)) return;
                          
                          setSettingsForm({ 
                            ...settingsForm, 
                            clientWindowEndHour: newCutoff
                          });
                        }}
                        onBlur={() => {
                          if (settingsForm.clientWindowEndHour === '' || settingsForm.clientWindowEndHour === null as any) {
                            setSettingsForm({ ...settingsForm, clientWindowEndHour: 14 });
                          } else if (settingsForm.clientWindowEndHour < 0) {
                            setSettingsForm({ ...settingsForm, clientWindowEndHour: 0 });
                          } else if (settingsForm.clientWindowEndHour > 23) {
                            setSettingsForm({ ...settingsForm, clientWindowEndHour: 23 });
                          }
                        }}
                        min={0}
                        max={23}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        e.g., 16 = 4 PM local time
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="skipWeekends">Skip Weekends</Label>
                    <p className="text-sm text-muted-foreground">
                      Don't send emails on Saturday and Sunday
                    </p>
                  </div>
                  <Switch
                    id="skipWeekends"
                    data-testid="switch-skip-weekends"
                    checked={settingsForm.skipWeekends}
                    onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, skipWeekends: checked })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">AI Personalization</h3>
                <div>
                  <Label htmlFor="promptInjection">AI Prompt Injection</Label>
                  <Textarea
                    id="promptInjection"
                    data-testid="input-settings-prompt"
                    value={settingsForm.promptInjection}
                    onChange={(e) => setSettingsForm({ ...settingsForm, promptInjection: e.target.value })}
                    placeholder="Custom AI instructions for email personalization..."
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Global AI instructions used to personalize all outreach emails
                  </p>
                </div>

                <div>
                  <Label htmlFor="keywordBin">Keyword Bin</Label>
                  <Textarea
                    id="keywordBin"
                    data-testid="input-settings-keywords"
                    value={settingsForm.keywordBin}
                    onChange={(e) => setSettingsForm({ ...settingsForm, keywordBin: e.target.value })}
                    placeholder="Context keywords for AI (comma-separated)..."
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Additional context keywords to help AI understand your business
                  </p>
                </div>
              </div>

              {/* Unsaved Changes Warning */}
              {isSettingsDirty && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      You have unsaved changes
                    </p>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Save your changes or discard them before switching tabs.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                {isSettingsDirty && (
                  <Button
                    variant="outline"
                    onClick={handleDiscardSettings}
                    data-testid="button-discard-settings"
                  >
                    Discard Changes
                  </Button>
                )}
                <Button
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending || !isSettingsDirty}
                  data-testid="button-save-settings"
                >
                  {updateSettingsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Emails Tab */}
        {user?.role === 'admin' && (
          <TabsContent value="test-emails" className="space-y-4">
            {/* Blacklist Toggle */}
            <Card>
              <CardHeader>
                <CardTitle>Blacklist Checking</CardTitle>
                <CardDescription>
                  Control whether enrollment checks the blacklist. Turn OFF for testing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={userPreferences?.blacklistCheckEnabled ?? true}
                      onCheckedChange={(checked) => updateBlacklistPreferenceMutation.mutate(checked)}
                      disabled={updateBlacklistPreferenceMutation.isPending}
                      data-testid="toggle-blacklist-check"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        Blacklist Check: {userPreferences?.blacklistCheckEnabled ? 'ON' : 'OFF'}
                      </span>
                      <Badge variant={userPreferences?.blacklistCheckEnabled ? 'default' : 'secondary'}>
                        {userPreferences?.blacklistCheckEnabled ? '✓ Enabled' : '✗ Disabled'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone - Nuke Test Data */}
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Danger Zone: Clear Test Data
                </CardTitle>
                <CardDescription>
                  Delete test emails and sequence recipients to reset testing environment. Use with caution.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setNukeDialogOpen(true);
                    setNukeCounts(null);
                    setNukeEmailPattern("");
                    setNukeConfirmText("");
                    setCountsError(null);
                  }}
                  data-testid="button-open-nuke-dialog"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Nuke Test Data
                </Button>
              </CardContent>
            </Card>

            {/* Synthetic Email Series Test */}
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <TestTube2 className="w-5 h-5" />
                  Synthetic Email Series Test
                </CardTitle>
                <CardDescription>
                  Preview your entire email sequence with AI-generated content without sending real emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const currentSequence = sequences.find((s) => s.id === selectedSequenceId);
                  const hasCampaignBrief = !!(currentSequence as any)?.finalizedStrategy?.trim();
                  const canTest = selectedSequenceId && hasCampaignBrief;
                  
                  return (
                    <>
                      {/* Display store context at the top */}
                      {syntheticStoreContext && (
                        <Alert className="bg-muted/50">
                          <Store className="h-4 w-4" />
                          <AlertDescription>
                            <div className="font-medium mb-1">Testing with: {syntheticStoreContext.name}</div>
                            {syntheticStoreContext.salesSummary && (
                              <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                                <span className="font-semibold">Sales Summary:</span>
                                <div className="mt-1 p-2 bg-background rounded border text-foreground">
                                  {syntheticStoreContext.salesSummary}
                                </div>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-2">
                              {syntheticStoreContext.state && `${syntheticStoreContext.state} • `}
                              {syntheticStoreContext.timezone}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <Button
                        variant="destructive"
                        onClick={() => syntheticTestMutation.mutate()}
                        disabled={!canTest || syntheticTestMutation.isPending}
                        data-testid="button-run-synthetic-test"
                      >
                        {syntheticTestMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {!syntheticTestMutation.isPending && <TestTube2 className="w-4 h-4 mr-2" />}
                        {syntheticTestMutation.isPending ? 'Generating...' : 'Run Test Sequence'}
                      </Button>
                      {selectedSequenceId && !hasCampaignBrief && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Campaign Brief required. Complete "Finalize Strategy" in the Strategy tab first.
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  );
                })()}

                {/* Preview results */}
                {syntheticPreview && syntheticPreview.length > 0 && (
                  <div className="space-y-4 mt-6">
                    {syntheticPreview.map((email) => (
                      <Card key={email.stepNumber} className="border-muted">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email Step {email.stepNumber} {email.stepNumber === 1 ? '(Cold Outreach)' : '(Follow-up)'}
                          </CardTitle>
                          <div className="text-sm font-medium mt-2">
                            Subject: <span className="font-normal">{email.subject}</span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-64 w-full rounded-md border p-4 bg-background">
                            <div 
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body) }}
                              data-testid={`preview-email-step-${email.stepNumber}`}
                            />
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Composer Card */}
            <Card>
              <CardHeader>
                <CardTitle>Manual Test Email Composer</CardTitle>
                <CardDescription>
                  Send instant test emails to verify threading and reply detection (bypasses queue)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="test-recipient-email">Recipient Email</Label>
                    <Input
                      id="test-recipient-email"
                      type="email"
                      value={testRecipientEmail}
                      onChange={(e) => setTestRecipientEmail(e.target.value)}
                      placeholder="recipient@example.com"
                      data-testid="input-test-recipient"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="test-subject">Subject</Label>
                    <Input
                      id="test-subject"
                      value={testSubject}
                      onChange={(e) => setTestSubject(e.target.value)}
                      placeholder="Email subject line"
                      data-testid="input-test-subject"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="test-body">Email Body (HTML)</Label>
                    <Textarea
                      id="test-body"
                      value={testBody}
                      onChange={(e) => setTestBody(e.target.value)}
                      placeholder="Email body content (HTML supported)"
                      rows={6}
                      data-testid="input-test-body"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">No rate limit - unlimited testing</p>
                  <Button
                    onClick={() => sendTestEmailMutation.mutate({ 
                      recipientEmail: testRecipientEmail, 
                      subject: testSubject, 
                      body: testBody 
                    })}
                    disabled={!testRecipientEmail || !testSubject || !testBody || sendTestEmailMutation.isPending}
                    data-testid="button-send-test"
                  >
                    {sendTestEmailMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Send className="w-4 h-4 mr-2" />
                    Send Test Email
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Email History Card */}
            <Card>
              <CardHeader>
                <CardTitle>Test Email History</CardTitle>
                <CardDescription>
                  Recent test emails with reply status and follow-up actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTestEmails ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !testEmailHistory || testEmailHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No test emails sent yet. Use the composer above to send your first test email.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Reply</TableHead>
                        <TableHead>Follow-ups</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testEmailHistory.map((test) => (
                        <TableRow key={test.id} data-testid={`row-test-email-${test.id}`}>
                          <TableCell className="font-medium">{test.recipientEmail}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{test.subject}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={test.status === 'replied' ? 'default' : test.status === 'sent' ? 'secondary' : 'outline'}
                              data-testid={`badge-status-${test.id}`}
                            >
                              {test.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {test.sentAt ? new Date(test.sentAt).toLocaleString() : '-'}
                          </TableCell>
                          <TableCell>
                            {test.replyDetectedAt ? (
                              <span className="text-sm text-green-600 dark:text-green-400">
                                {new Date(test.replyDetectedAt).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">No reply</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{test.followUpCount || 0}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => checkReplyMutation.mutate(test.id)}
                                disabled={!test.gmailThreadId || checkReplyMutation.isPending}
                                data-testid={`button-check-reply-${test.id}`}
                              >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Check
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTestEmailId(test.id);
                                  setFollowUpSubject(`Re: ${test.subject}`);
                                  setFollowUpBody('');
                                  setFollowUpDialogOpen(true);
                                }}
                                disabled={!test.gmailThreadId}
                                data-testid={`button-followup-${test.id}`}
                              >
                                <Reply className="w-3 h-3 mr-1" />
                                Follow-up
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Follow-up Dialog */}
      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Threaded Follow-up</DialogTitle>
            <p className="text-sm text-muted-foreground">
              This email will be sent in the same Gmail thread
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="followup-subject">Subject</Label>
              <Input
                id="followup-subject"
                value={followUpSubject}
                onChange={(e) => setFollowUpSubject(e.target.value)}
                placeholder="Re: Original subject"
                data-testid="input-followup-subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followup-body">Email Body (HTML)</Label>
              <Textarea
                id="followup-body"
                value={followUpBody}
                onChange={(e) => setFollowUpBody(e.target.value)}
                placeholder="Follow-up message content"
                rows={8}
                data-testid="input-followup-body"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFollowUpDialogOpen(false);
                setSelectedTestEmailId(null);
                setFollowUpSubject("");
                setFollowUpBody("");
              }}
              data-testid="button-cancel-followup"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTestEmailId) {
                  sendFollowUpMutation.mutate({
                    id: selectedTestEmailId,
                    subject: followUpSubject,
                    body: followUpBody,
                  });
                }
              }}
              disabled={!followUpSubject || !followUpBody || sendFollowUpMutation.isPending}
              data-testid="button-submit-followup"
            >
              {sendFollowUpMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Send className="w-4 h-4 mr-2" />
              Send Follow-up
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nuke Test Data Alert */}
      <AlertDialog open={nukeDialogOpen} onOpenChange={setNukeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete All Test Data?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all test emails, sequence recipients, and messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-nuke">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => nukeTestDataMutation.mutate()}
              disabled={nukeTestDataMutation.isPending}
              className="bg-destructive text-destructive-foreground hover-elevate active-elevate-2"
              data-testid="button-confirm-nuke"
            >
              {nukeTestDataMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Recipients Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Recipients from Google Sheets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="sheetId">Google Sheet ID</Label>
              <Input
                id="sheetId"
                data-testid="input-sheet-id"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="Paste Google Sheet ID here"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Emails will be imported from Column K (auto-deduplication enabled)
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!sheetId || importMutation.isPending}
              data-testid="button-submit-import"
            >
              {importMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import Recipients
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Send Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="testEmail">Test Email Address</Label>
              <Input
                id="testEmail"
                data-testid="input-test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsTestDialogOpen(false)}
              data-testid="button-cancel-test"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTestSend}
              disabled={!testEmail || testSendMutation.isPending}
              data-testid="button-submit-test"
            >
              {testSendMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Test
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to Sequence Dialog */}
      <Dialog open={isAddToSequenceDialogOpen} onOpenChange={setIsAddToSequenceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contacts to Sequence</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectAllMode === 'all'
                ? `Add all ${allContactsData?.total || 0} matching contacts to a sequence`
                : `Add ${selectedContacts.length} selected contact${selectedContacts.length !== 1 ? 's' : ''} to a sequence`}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="targetSequence">Select Sequence</Label>
              <Select value={targetSequenceId} onValueChange={setTargetSequenceId}>
                <SelectTrigger id="targetSequence" data-testid="select-target-sequence">
                  <SelectValue placeholder="Choose a sequence..." />
                </SelectTrigger>
                <SelectContent>
                  {sequences?.map((sequence) => (
                    <SelectItem
                      key={sequence.id}
                      value={sequence.id}
                      data-testid={`option-sequence-${sequence.id}`}
                    >
                      {sequence.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectAllMode === 'all' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Bulk Add Confirmation</AlertTitle>
                <AlertDescription>
                  This will add all {allContactsData?.total || 0} contacts matching your current filters to the selected sequence. Duplicates will be automatically skipped.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddToSequenceDialogOpen(false);
                setTargetSequenceId('');
              }}
              data-testid="button-cancel-add-to-sequence"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddToSequence}
              disabled={!targetSequenceId || addContactsMutation.isPending}
              data-testid="button-submit-add-to-sequence"
            >
              {addContactsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add to Sequence
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSequenceId} onOpenChange={(open) => !open && setDeleteSequenceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sequence?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this sequence and all its data:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All strategy chat conversation history</li>
                <li>All recipients</li>
                <li>All sent emails and tracking data</li>
              </ul>
              <p className="mt-2 font-medium">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete" disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSequenceId && deleteMutation.mutate(deleteSequenceId)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Sequence
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reply Scanner Dialog */}
      <Dialog open={replyScannnerDialogOpen} onOpenChange={setReplyScannerDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Scan for Replies - Preview</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Scanning Gmail Sent folder for emails to Commission Tracker POC Emails
            </p>
          </DialogHeader>

          {scanRepliesMutation.isPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Scanning Gmail...</span>
            </div>
          ) : scanPreviewResults ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Sent Emails Scanned:</span> <strong>{scanPreviewResults.scanned}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Newly Discovered:</span> <strong className="text-purple-600">{scanPreviewResults.details.filter((d: any) => d.isNew).length}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Ready to Promote:</span> <strong className="text-green-600">{scanPreviewResults.details.filter((d: any) => d.status === 'promoted').length}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Has Replies:</span> <strong className="text-blue-600">{scanPreviewResults.details.filter((d: any) => d.status === 'has_reply').length}</strong>
                </div>
              </div>

              <div className="border rounded-md max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedScanEmails.size > 0 && scanPreviewResults.details.filter(d => d.status === 'newly_enrolled' || d.status === 'promoted').every(d => selectedScanEmails.has(d.email))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const enrollable = scanPreviewResults.details
                                .filter(d => d.status === 'newly_enrolled' || d.status === 'promoted')
                                .map(d => d.email);
                              setSelectedScanEmails(new Set(enrollable));
                            } else {
                              setSelectedScanEmails(new Set());
                            }
                          }}
                          data-testid="checkbox-select-all-scan"
                        />
                      </TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scanPreviewResults.details.map((detail: any, idx: number) => {
                      const isEnrollable = detail.status === 'newly_enrolled' || detail.status === 'promoted';
                      const isSelected = selectedScanEmails.has(detail.email);
                      
                      return (
                        <TableRow key={idx} className={isSelected ? 'bg-accent/50' : ''}>
                          <TableCell>
                            {isEnrollable && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(selectedScanEmails);
                                  if (checked) {
                                    newSet.add(detail.email);
                                  } else {
                                    newSet.delete(detail.email);
                                  }
                                  setSelectedScanEmails(newSet);
                                }}
                                data-testid={`checkbox-scan-${idx}`}
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {detail.email}
                            {detail.isNew && <span className="ml-2 text-purple-600">✨ New</span>}
                          </TableCell>
                          <TableCell>
                            {detail.status === 'promoted' && (
                              <Badge variant="default" className="bg-green-600">Ready to Promote</Badge>
                            )}
                            {detail.status === 'has_reply' && (
                              <Badge variant="default" className="bg-blue-600">Has Reply</Badge>
                            )}
                            {detail.status === 'newly_enrolled' && (
                              <Badge variant="default" className="bg-purple-600">Newly Enrolled</Badge>
                            )}
                            {detail.status === 'too_recent' && (
                              <Badge variant="secondary">Too Recent</Badge>
                            )}
                            {detail.status === 'blacklisted' && (
                              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">Blacklisted</Badge>
                            )}
                            {detail.status === 'error' && (
                              <Badge variant="destructive">Error</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{detail.message}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReplyScannerDialogOpen(false);
                setScanPreviewResults(null);
              }}
              data-testid="button-cancel-scan"
            >
              Cancel
            </Button>
            <Button
              onClick={() => scanRepliesMutation.mutate({ dryRun: false, selectedEmails: Array.from(selectedScanEmails) })}
              disabled={
                !scanPreviewResults || 
                selectedScanEmails.size === 0 ||
                scanRepliesMutation.isPending
              }
              data-testid="button-confirm-enroll"
            >
              {scanRepliesMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enroll {selectedScanEmails.size} Selected Contact{selectedScanEmails.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Navigation Warning Dialog for Unsaved Settings */}
      <AlertDialog open={showNavigationWarning} onOpenChange={setShowNavigationWarning}>
        <AlertDialogContent data-testid="dialog-unsaved-settings">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in your settings. If you leave now, these changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              onClick={() => {
                handleSaveSettings();
                setShowNavigationWarning(false);
                if (pendingTab) {
                  setActiveTab(pendingTab);
                  setPendingTab(null);
                }
              }}
              disabled={updateSettingsMutation.isPending}
              data-testid="button-save-and-continue"
            >
              {updateSettingsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
            <AlertDialogCancel onClick={handleCancelNavigation} data-testid="button-cancel-navigation">
              Stay on Settings
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmNavigation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-navigation"
            >
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
