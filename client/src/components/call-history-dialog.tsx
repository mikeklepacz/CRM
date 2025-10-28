import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Phone, Loader2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface CallHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CallRecord {
  id: string;
  timestamp: string;
  agentId: string;
  storeName: string;
  phoneNumber: string;
  storeLink: string | null;
}

interface GroupedCall {
  storeName: string;
  phoneNumber: string;
  storeLink: string | null;
  calls: CallRecord[];
  count: number;
  lastCallTime: string;
}

export function CallHistoryDialog({ open, onOpenChange }: CallHistoryDialogProps) {
  const { user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<string>("all");

  // Fetch all users (for admin agent filter)
  const { data: usersData } = useQuery<any>({
    queryKey: ["/api/users"],
    enabled: user?.role === 'admin',
  });

  const users = usersData?.users || [];
  const agents = users.filter((u: any) => u.role === 'agent');

  // Fetch call history with optional agent filter
  const { data: callHistory = [], isLoading } = useQuery<CallRecord[]>({
    queryKey: ['/api/call-history', selectedAgent !== 'all' ? { agentId: selectedAgent } : {}],
    queryFn: async () => {
      const url = user?.role === 'admin' && selectedAgent !== 'all'
        ? `/api/call-history?agentId=${selectedAgent}`
        : '/api/call-history';
      return await apiRequest('GET', url);
    },
  });

  // Log call mutation
  const logCallMutation = useMutation({
    mutationFn: async ({ storeName, phoneNumber, storeLink }: { storeName: string; phoneNumber: string; storeLink: string | null }) => {
      return await apiRequest("POST", "/api/call-history", {
        storeName,
        phoneNumber,
        storeLink,
      });
    },
    onSuccess: () => {
      // Invalidate call history to show the new call
      queryClient.invalidateQueries({ queryKey: ['/api/call-history'] });
    },
    onError: (error: Error) => {
      console.error('Failed to log call:', error);
    },
  });

  // Group calls by store and phone number
  const groupedCalls: GroupedCall[] = callHistory.reduce((acc: GroupedCall[], call) => {
    const key = `${call.storeName}-${call.phoneNumber}`;
    const existing = acc.find(g => `${g.storeName}-${g.phoneNumber}` === key);
    
    if (existing) {
      existing.calls.push(call);
      existing.count++;
      if (new Date(call.timestamp) > new Date(existing.lastCallTime)) {
        existing.lastCallTime = call.timestamp;
      }
    } else {
      acc.push({
        storeName: call.storeName,
        phoneNumber: call.phoneNumber,
        storeLink: call.storeLink,
        calls: [call],
        count: 1,
        lastCallTime: call.timestamp,
      });
    }
    
    return acc;
  }, []);

  // Sort by most recent call
  groupedCalls.sort((a, b) => new Date(b.lastCallTime).getTime() - new Date(a.lastCallTime).getTime());

  const handleCall = (group: GroupedCall) => {
    // Log the call
    logCallMutation.mutate({
      storeName: group.storeName,
      phoneNumber: group.phoneNumber,
      storeLink: group.storeLink,
    });

    // Open phone dialer
    window.location.href = `tel:${group.phoneNumber}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col" data-testid="dialog-call-history">
        <DialogHeader>
          <DialogTitle>Call History</DialogTitle>
          <DialogDescription>
            View your call history and make calls to stores
          </DialogDescription>
        </DialogHeader>

        {/* Admin Agent Filter */}
        {user?.role === 'admin' && (
          <div className="flex items-center gap-2 pb-4 border-b">
            <label className="text-sm font-medium">Filter by Agent:</label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-[200px]" data-testid="select-agent-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map((agent: any) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name || agent.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Call History List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : groupedCalls.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No call history yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Phone call logs will appear here when you call stores
              </p>
            </div>
          ) : (
            groupedCalls.map((group, index) => (
              <Card key={index} className="p-4 hover-elevate" data-testid={`call-history-item-${index}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold" data-testid={`text-store-name-${index}`}>
                        {group.storeName}
                      </h3>
                      {group.storeLink && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          asChild
                          data-testid={`button-store-link-${index}`}
                        >
                          <a href={group.storeLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span data-testid={`text-phone-${index}`}>{group.phoneNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" data-testid={`badge-call-count-${index}`}>
                        {group.count} {group.count === 1 ? 'call' : 'calls'}
                      </Badge>
                      <span data-testid={`text-last-call-${index}`}>
                        Last called {formatDistanceToNow(new Date(group.lastCallTime), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleCall(group)}
                    data-testid={`button-call-${index}`}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
