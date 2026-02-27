import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { useOptionalProject } from "@/contexts/project-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SentHistoryView() {
  const projectContext = useOptionalProject();
  const currentProject = projectContext?.currentProject;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSequence, setSelectedSequence] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch all sequences for filter dropdown
  const { data: sequences } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/sequences", currentProject?.id],
    queryFn: async () => {
      const url = new URL("/api/sequences", window.location.origin);
      if (currentProject?.id) {
        url.searchParams.set("projectId", currentProject.id);
      }
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch sequences");
      return response.json();
    },
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
      status: "sent" | "replied" | "bounced" | "pending";
      repliedAt: string | null;
      replyCount: number | null;
    }>;
    total: number;
    limit: number;
    hasMore: boolean;
  }>({
    queryKey: ["/api/ehub/sent-history", selectedSequence],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSequence !== "all") {
        params.append("sequenceId", selectedSequence);
      }
      params.append("limit", "100");

      const url = `/api/ehub/sent-history?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });

      if (!res.ok) {
        throw new Error(`Failed to fetch sent history: ${res.statusText}`);
      }

      return await res.json();
    },
  });

  // Client-side filtering
  const filteredMessages =
    sentHistory?.messages.filter((msg) => {
      // Status filter
      if (selectedStatus !== "all" && msg.status !== selectedStatus) {
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
            <CardDescription>{sentHistory?.total || 0} total emails sent</CardDescription>
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
            {debouncedSearch || selectedStatus !== "all" ? "No emails match your filters" : "No emails sent yet"}
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
                      <span className="font-medium">{msg.recipientName || "Unknown"}</span>
                      <span className="text-sm text-muted-foreground">{msg.recipientEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell>{msg.sequenceName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Step {msg.stepNumber}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">{msg.subject}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.sentAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    {msg.status === "replied" && (
                      <Badge variant="default" className="bg-green-600">
                        Replied {msg.replyCount && msg.replyCount > 1 ? `(${msg.replyCount})` : ""}
                      </Badge>
                    )}
                    {msg.status === "sent" && <Badge variant="secondary">Sent</Badge>}
                    {msg.status === "bounced" && <Badge variant="destructive">Bounced</Badge>}
                    {msg.status === "pending" && <Badge variant="outline">Pending</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {sentHistory?.hasMore && (
          <div className="text-center py-4 text-sm text-muted-foreground">Showing first {sentHistory.limit} results</div>
        )}
      </CardContent>
    </Card>
  );
}
