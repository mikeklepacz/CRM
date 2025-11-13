import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Mail, Plus, Loader2, Upload, Send, Settings, Users, AlertCircle, Database, MessageSquare, Bot, User as UserIcon, Check, X, Trash2, MoreVertical, Pause, SkipForward, Clock, Play } from "lucide-react";
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
  status: 'sent' | 'scheduled' | 'overdue';
  subject: string | null;
  threadId: string | null;
  messageId: string | null;
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

function QueueView() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [timeWindowDays, setTimeWindowDays] = useState<number>(3);
  const [statusFilter, setStatusFilter] = useState<'active' | 'paused'>('active');
  
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
      const res = await fetch(url, { credentials: 'include' });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch queue: ${res.statusText}`);
      }
      
      return await res.json();
    },
    refetchInterval: 30000,
    staleTime: 15000,
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
    refetchInterval: 30000,
    staleTime: 15000,
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

  // Fetch paused count separately
  const { data: pausedCount = 0 } = useQuery<number>({
    queryKey: ['/api/ehub/queue/paused-count'],
    queryFn: async () => {
      const res = await fetch('/api/ehub/queue/paused-count', { credentials: 'include' });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Calculate stats
  const sentItems = queue?.filter(item => item.status === 'sent') || [];
  const scheduledItems = queue?.filter(item => item.status === 'scheduled') || [];
  const overdueItems = queue?.filter(item => item.status === 'overdue') || [];
  
  // Get unique recipients for follow-ups vs fresh calculation
  const uniqueRecipients = new Set(queue?.map(item => item.recipientId) || []);
  const followUpRecipients = new Set(
    queue?.filter(item => item.stepNumber > 1).map(item => item.recipientId) || []
  );
  const freshRecipients = uniqueRecipients.size - followUpRecipients.size;
  
  // Get next send time from scheduled items
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
  const getRowBgColor = (status: 'sent' | 'scheduled' | 'overdue') => {
    if (status === 'sent') {
      return 'bg-green-50 dark:bg-green-900/20';
    }
    if (status === 'overdue') {
      return 'bg-red-50 dark:bg-red-900/20';
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
      {/* Stats Summary */}
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

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle>Email Queue</CardTitle>
              <CardDescription>
                Chronological view of all individual email sends • Green = Sent, Blue = Scheduled, Red = Overdue
              </CardDescription>
            </div>
            <div className="flex gap-3 flex-wrap">
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
              <Button
                variant={statusFilter === 'paused' ? 'default' : 'outline'}
                onClick={() => setStatusFilter(statusFilter === 'active' ? 'paused' : 'active')}
                data-testid="button-toggle-paused"
              >
                <Pause className="mr-2 h-4 w-4" />
                {statusFilter === 'paused' ? 'Show Active' : `Show Paused${pausedCount > 0 ? ` (${pausedCount})` : ''}`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!queue || queue.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {search ? 'No results found' : 'No emails in queue'}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Sequence</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((item, idx) => (
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
                        <Badge 
                          variant={
                            item.status === 'sent' ? 'default' : 
                            item.status === 'overdue' ? 'destructive' : 
                            'outline'
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`actions-${item.recipientId}-${item.stepNumber}`}>
                        {item.status !== 'sent' && (
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
            </ScrollArea>
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
                onChange={(e) => setDelayDialog({ ...delayDialog, hours: parseFloat(e.target.value) || 1 })}
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

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<EhubSettings>({
    minDelayMinutes: 1,
    maxDelayMinutes: 3,
    dailyEmailLimit: 200,
    sendingHoursStart: 9,
    sendingHoursEnd: 14,
    clientWindowStartOffset: 1.0,
    clientWindowEndHour: 14,
    promptInjection: "",
    keywordBin: "",
    skipWeekends: true,
  });

  // Fetch sequences
  const { data: sequences, isLoading } = useQuery<Sequence[]>({
    queryKey: ['/api/sequences'],
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
    mutationFn: async (status: string) => {
      return await apiRequest("PATCH", `/api/sequences/${selectedSequenceId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
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

  // Auto-scroll to bottom when transcript changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [strategyTranscript]);

  // Load step delays when sequence changes
  useEffect(() => {
    if (selectedSequenceId && sequences) {
      const selectedSeq = sequences.find((s) => s.id === selectedSequenceId);
      if (selectedSeq && (selectedSeq as any).stepDelays) {
        setStepDelays((selectedSeq as any).stepDelays);
      } else {
        setStepDelays([]);
      }
    } else {
      setStepDelays([]);
    }
  }, [selectedSequenceId, sequences]);

  // Initialize settings form when data loads
  useEffect(() => {
    if (settings) {
      setSettingsForm(settings);
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
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "E-Hub settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
          <div className="flex justify-end">
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
                        <TableCell className="font-medium">{sequence.name}</TableCell>
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
                              onClick={() => setDeleteSequenceId(sequence.id)}
                              data-testid={`button-delete-${sequence.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
                    <CardTitle>AI Strategy Chat</CardTitle>
                    <CardDescription>
                      Discuss your campaign goals, target audience, and messaging with the AI
                    </CardDescription>
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
                                    const newDelays = [...stepDelays];
                                    newDelays[index] = parseFloat(e.target.value) || 0;
                                    setStepDelays(newDelays);
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
                              >
                                <AlertCircle className="w-4 h-4" />
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
                            const hasMessages = strategyTranscript?.messages && strategyTranscript.messages.length > 0;
                            const hasValidDelays = stepDelays.length > 0 && stepDelays.every((d) => d >= 0);
                            const canActivate = hasMessages && hasValidDelays;
                            
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
                                    const hasMessages = strategyTranscript?.messages && strategyTranscript.messages.length > 0;
                                    const hasValidDelays = stepDelays.length > 0 && stepDelays.every((d) => d >= 0) && 
                                      stepDelays.every((d, i) => i === 0 || d > stepDelays[i - 1]);
                                    
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

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <QueueView />
        </TabsContent>

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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minDelay">Min Delay Between Sends (minutes)</Label>
                    <Input
                      id="minDelay"
                      data-testid="input-settings-min-delay"
                      type="number"
                      value={settingsForm.minDelayMinutes}
                      onChange={(e) => setSettingsForm({ ...settingsForm, minDelayMinutes: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={60}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxDelay">Max Delay Between Sends (minutes)</Label>
                    <Input
                      id="maxDelay"
                      data-testid="input-settings-max-delay"
                      type="number"
                      value={settingsForm.maxDelayMinutes}
                      onChange={(e) => setSettingsForm({ ...settingsForm, maxDelayMinutes: parseInt(e.target.value) || 3 })}
                      min={1}
                      max={120}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="dailyLimit">Daily Email Limit</Label>
                  <Input
                    id="dailyLimit"
                    data-testid="input-settings-daily-limit"
                    type="number"
                    value={settingsForm.dailyEmailLimit}
                    onChange={(e) => setSettingsForm({ ...settingsForm, dailyEmailLimit: parseInt(e.target.value) || 200 })}
                    min={1}
                    max={2000}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Maximum emails sent per day (Gmail limit: 500-2000/day)
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Company Time Range</h3>
                  <p className="text-sm text-muted-foreground -mt-2">
                    Your sending window (when your team can send emails)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startHour">Start Hour (24h format)</Label>
                      <Input
                        id="startHour"
                        data-testid="input-settings-start-hour"
                        type="number"
                        value={settingsForm.sendingHoursStart}
                        onChange={(e) => setSettingsForm({ ...settingsForm, sendingHoursStart: parseInt(e.target.value) || 9 })}
                        min={0}
                        max={23}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endHour">End Hour (24h format)</Label>
                      <Input
                        id="endHour"
                        data-testid="input-settings-end-hour"
                        type="number"
                        value={settingsForm.sendingHoursEnd}
                        onChange={(e) => setSettingsForm({ ...settingsForm, sendingHoursEnd: parseInt(e.target.value) || 14 })}
                        min={0}
                        max={23}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Client Time Range</h3>
                  <p className="text-sm text-muted-foreground -mt-2">
                    Client's receiving window (when emails are delivered in their timezone)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="clientStartOffset">Start Offset After Opening (hours)</Label>
                      <Input
                        id="clientStartOffset"
                        data-testid="input-settings-client-start-offset"
                        type="number"
                        step="0.25"
                        value={settingsForm.clientWindowStartOffset}
                        onChange={(e) => setSettingsForm({ ...settingsForm, clientWindowStartOffset: parseFloat(e.target.value) || 1.0 })}
                        min={0}
                        max={24}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Hours after business opens (e.g., 1.0 = 1 hour after)
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="clientEndHour">Cutoff Hour (local time)</Label>
                      <Input
                        id="clientEndHour"
                        data-testid="input-settings-client-end-hour"
                        type="number"
                        value={settingsForm.clientWindowEndHour}
                        onChange={(e) => setSettingsForm({ ...settingsForm, clientWindowEndHour: parseInt(e.target.value) || 14 })}
                        min={0}
                        max={23}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        24h format (e.g., 14 = 2 PM local time)
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

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
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
    </div>
  );
}
