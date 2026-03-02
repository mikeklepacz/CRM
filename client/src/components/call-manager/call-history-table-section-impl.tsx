import type { Dispatch, SetStateAction } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CallHistoryComplete {
  id: string;
  conversationId: string;
  callDateTime: string;
  storeName: string;
  link: string;
  shippingAddress?: string;
  pocEmail?: string;
  pocName?: string;
  campaign: string;
  agentId: string;
  status: string;
  durationSecs: number;
  interestLevel: "hot" | "warm" | "cold" | "not-interested" | null;
  clientData?: any;
  storeRow?: any;
}

type CallHistoryTableSectionProps = {
  analyticsData: any;
  analyticsLoading: boolean;
  historyAgentFilter: string;
  historyCampaignFilter: string;
  historyEndDate: string;
  historyPage: number;
  historySearchQuery: string;
  historyStartDate: string;
  historyStatusFilter: string;
  setHistoryPage: Dispatch<SetStateAction<number>>;
  setStoreDetailsDialog: (value: any) => void;
  setStoreDetailsLoading: (value: string | null) => void;
  storeDetailsLoading: string | null;
  toast: (value: any) => void;
};

export function CallHistoryTableSection({
  analyticsData,
  analyticsLoading,
  historyAgentFilter,
  historyCampaignFilter,
  historyEndDate,
  historyPage,
  historySearchQuery,
  historyStartDate,
  historyStatusFilter,
  setHistoryPage,
  setStoreDetailsDialog,
  setStoreDetailsLoading,
  storeDetailsLoading,
  toast,
}: CallHistoryTableSectionProps) {
  const transformedData: CallHistoryComplete[] = (analyticsData?.calls || []).map((call: any) => {
    const clientData = call.client.data || {};
    const storeSnapshot = (call.session as any).storeSnapshot || {};

    return {
      id: call.session.id,
      conversationId: call.session.conversationId,
      callDateTime: call.session.startedAt,
      storeName: clientData.business_name || clientData.businessName || storeSnapshot.business_name || "Unknown Store",
      link: call.client.uniqueIdentifier || clientData.link || "",
      shippingAddress: clientData.shipping_address || storeSnapshot.shipping_address,
      pocEmail: clientData.poc_email || storeSnapshot.poc_email,
      pocName: clientData.poc_name || storeSnapshot.poc_name,
      campaign: clientData.scenario || storeSnapshot.scenario || "cold_calls",
      agentId: call.session.agentId,
      status: call.session.status,
      durationSecs: call.session.callDurationSecs || 0,
      interestLevel: call.session.interestLevel,
      clientData: call.client,
    };
  });

  const filteredData = transformedData.filter((row) => {
    if (historyStartDate && new Date(row.callDateTime) < new Date(historyStartDate)) return false;
    if (historyEndDate && new Date(row.callDateTime) > new Date(historyEndDate + "T23:59:59")) return false;
    if (historyStatusFilter !== "all" && row.status !== historyStatusFilter) return false;
    if (historyCampaignFilter !== "all" && row.campaign !== historyCampaignFilter) return false;
    if (historyAgentFilter !== "all" && row.agentId !== historyAgentFilter) return false;

    if (historySearchQuery) {
      const query = historySearchQuery.toLowerCase();
      const matchesStore = row.storeName.toLowerCase().includes(query);
      const matchesPOC = row.pocName?.toLowerCase().includes(query);
      const matchesAgent = row.agentId.toLowerCase().includes(query);
      if (!matchesStore && !matchesPOC && !matchesAgent) return false;
    }

    return true;
  });

  const sortedData = [...filteredData].sort(
    (a, b) => new Date(b.callDateTime).getTime() - new Date(a.callDateTime).getTime(),
  );

  const itemsPerPage = 20;
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate();
    const time = date.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${month} ${day}, ${time}`;
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  const getInterestBadgeVariant = (level: string | null) => {
    if (!level) return "secondary";
    if (level === "hot") return "default";
    if (level === "warm") return "secondary";
    return "outline";
  };

  const getInterestLabel = (level: string | null) => {
    if (!level) return "None";
    if (level === "hot") return "High";
    if (level === "warm") return "Medium";
    if (level === "cold") return "Low";
    if (level === "not-interested") return "None";
    return level;
  };

  const getStatusBadgeVariant = (status: string) => {
    if (status === "completed") return "default";
    if (status === "failed") return "destructive";
    return "secondary";
  };

  const getCampaignLabel = (campaign: string) => {
    if (campaign === "cold_calls") return "Cold Calls";
    if (campaign === "follow_ups") return "Follow-Ups";
    if (campaign === "recovery") return "Recovery";
    return campaign;
  };

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sortedData.length === 0) {
    return <div className="text-center py-12 text-sm text-muted-foreground">No call history found. Try adjusting your filters.</div>;
  }

  return (
    <>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs px-2 py-1">Date & Time</TableHead>
              <TableHead className="text-xs px-2 py-1">Store</TableHead>
              <TableHead className="text-xs px-2 py-1">Campaign</TableHead>
              <TableHead className="text-xs px-2 py-1">Agent ID</TableHead>
              <TableHead className="text-xs px-2 py-1">Status</TableHead>
              <TableHead className="text-xs px-2 py-1">Duration</TableHead>
              <TableHead className="text-xs px-2 py-1">Interest</TableHead>
              <TableHead className="text-xs px-2 py-1">POC Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row, idx) => (
              <TableRow key={row.id} className="hover:bg-muted/50" data-testid={`call-history-row-${idx}`}>
                <TableCell className="text-xs px-2 py-1.5">{formatDate(row.callDateTime)}</TableCell>
                <TableCell className="text-xs px-2 py-1.5">
                  <button
                    onClick={async () => {
                      if (!row.link) {
                        toast({
                          title: "Error",
                          description: "Store link not found",
                          variant: "destructive",
                        });
                        return;
                      }

                      setStoreDetailsLoading(row.id);

                      try {
                        const response = await fetch(`/api/stores/by-link?link=${encodeURIComponent(row.link)}`);
                        if (!response.ok) {
                          throw new Error("Failed to fetch store details");
                        }

                        const { storeRow, meta } = await response.json();
                        const rowWithMeta = {
                          ...storeRow,
                          meta: {
                            rowIndex: meta.rowIndex,
                            storeSheetId: meta.storeSheetId,
                          },
                        };

                        setStoreDetailsDialog({
                          open: true,
                          row: rowWithMeta,
                        });
                      } catch (error: any) {
                        toast({
                          title: "Error",
                          description: error.message || "Failed to load store details",
                          variant: "destructive",
                        });
                      } finally {
                        setStoreDetailsLoading(null);
                      }
                    }}
                    className="text-primary hover:underline text-left inline-flex items-center gap-1"
                    disabled={storeDetailsLoading === row.id}
                    data-testid={`store-link-${idx}`}
                  >
                    {storeDetailsLoading === row.id && <Loader2 className="h-3 w-3 animate-spin" />}
                    {row.storeName}
                  </button>
                </TableCell>
                <TableCell className="text-xs px-2 py-1.5">{getCampaignLabel(row.campaign)}</TableCell>
                <TableCell className="text-xs px-2 py-1.5 font-mono">{row.agentId.slice(0, 8)}...</TableCell>
                <TableCell className="text-xs px-2 py-1.5">
                  <Badge variant={getStatusBadgeVariant(row.status)} className="text-xs">
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs px-2 py-1.5">{formatDuration(row.durationSecs)}</TableCell>
                <TableCell className="text-xs px-2 py-1.5">
                  <Badge variant={getInterestBadgeVariant(row.interestLevel)} className="text-xs">
                    {getInterestLabel(row.interestLevel)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs px-2 py-1.5">{row.pocName || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-xs text-muted-foreground">
            Showing {((historyPage - 1) * itemsPerPage) + 1} to {Math.min(historyPage * itemsPerPage, sortedData.length)} of {sortedData.length} calls
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
              disabled={historyPage === 1}
              data-testid="button-history-prev"
            >
              Previous
            </Button>
            <div className="text-xs text-muted-foreground">
              Page {historyPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
              disabled={historyPage === totalPages}
              data-testid="button-history-next"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
