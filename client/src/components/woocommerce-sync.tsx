import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Loader2, Package, Link2, Search, Sparkles } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function WooCommerceSync() {
  const { toast } = useToast();
  const [syncResult, setSyncResult] = useState<any>(null);
  const [matchingOrderId, setMatchingOrderId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientSearch, setClientSearch] = useState<string>("");
  const [showAllClients, setShowAllClients] = useState<boolean>(false);
  
  // Commission management state
  const [commissionTypes, setCommissionTypes] = useState<Record<string, string>>({});
  const [commissionAmounts, setCommissionAmounts] = useState<Record<string, string>>({});
  
  // Calculate commission amount based on type and total
  const calculateCommission = (orderId: string, total: number) => {
    const type = commissionTypes[orderId] || 'auto';
    if (type === 'flat') {
      return commissionAmounts[orderId] || '0.00';
    }
    if (type === 'auto') {
      return 'calculating...'; // Backend will determine based on 6-month rule
    }
    let percentage = 0.25; // Default to 25%
    if (type === '10') percentage = 0.10;
    else if (type === '25') percentage = 0.25;
    const amount = (total * percentage).toFixed(2);
    return amount;
  };
  
  const { data: orders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/orders");
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/clients");
    },
  });

  const { data: wooSettings } = useQuery({
    queryKey: ["/api/woocommerce/settings"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/woocommerce/settings");
    },
  });

  // Fetch smart match suggestions for the order being matched
  const { data: matchSuggestions } = useQuery({
    queryKey: ["/api/orders", matchingOrderId, "match-suggestions"],
    queryFn: async () => {
      if (!matchingOrderId) return null;
      return await apiRequest("GET", `/api/orders/${matchingOrderId}/match-suggestions`);
    },
    enabled: !!matchingOrderId,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/woocommerce/sync", {});
    },
    onSuccess: (data) => {
      setSyncResult(data);
      refetchOrders();
      queryClient.invalidateQueries({ queryKey: ["/api/woocommerce/settings"] });
      toast({
        title: "Sync completed",
        description: `Synced ${data.synced} orders, matched ${data.matched} clients`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const matchOrderMutation = useMutation({
    mutationFn: async ({ orderId, clientId }: { orderId: string; clientId: string }) => {
      return await apiRequest("POST", `/api/orders/${orderId}/match`, { clientId });
    },
    onSuccess: () => {
      refetchOrders();
      setMatchingOrderId(null);
      setSelectedClientId("");
      toast({
        title: "Success",
        description: "Order matched to client successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);

  const writeToTrackerMutation = useMutation({
    mutationFn: async () => {
      // Get matched orders with commission data
      const matchedOrders = orders
        .filter((order: any) => order.clientId)
        .map((order: any) => ({
          orderId: order.id,
          commissionType: commissionTypes[order.id] || 'auto',
          commissionAmount: commissionAmounts[order.id] || null,
        }));
      
      return await apiRequest("POST", "/api/woocommerce/write-to-tracker", { orders: matchedOrders });
    },
    onSuccess: (data) => {
      if (data.conflicts && data.conflicts.length > 0) {
        setConflicts(data.conflicts);
        setShowConflicts(true);
        toast({
          title: "Partial Success",
          description: `${data.written} orders written. ${data.conflicts.length} conflicts need resolution.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Success",
          description: `${data.written} orders written to Commission Tracker`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMatchOrder = () => {
    if (matchingOrderId && selectedClientId) {
      matchOrderMutation.mutate({ orderId: matchingOrderId, clientId: selectedClientId });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          WooCommerce Sync
        </CardTitle>
        <CardDescription>
          Sync orders from WooCommerce and update client sales and commission data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            data-testid="button-sync-woocommerce"
          >
            {syncMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Orders
              </>
            )}
          </Button>
          
          <Button
            onClick={() => writeToTrackerMutation.mutate()}
            disabled={writeToTrackerMutation.isPending || !orders.some((o: any) => o.clientId)}
            variant="secondary"
            data-testid="button-write-to-tracker"
          >
            {writeToTrackerMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Writing...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Write to Tracker ({orders.filter((o: any) => o.clientId).length})
              </>
            )}
          </Button>
        </div>

        {(syncResult || wooSettings?.lastSyncedAt) && (
          <div className="text-sm space-y-1 p-3 bg-muted rounded-md">
            {syncResult && (
              <>
                <p><strong>Total Orders:</strong> {syncResult.total || 0}</p>
                <p><strong>Synced:</strong> {syncResult.synced || 0}</p>
                <p><strong>Matched to Clients:</strong> {syncResult.matched || 0}</p>
                {syncResult.total > 0 && syncResult.matched === 0 && (
                  <p className="text-yellow-600 dark:text-yellow-500 mt-2">
                    ⚠️ Orders were synced but couldn't be matched to any clients. 
                    Make sure client emails or company names match the WooCommerce billing details.
                  </p>
                )}
                {syncResult.message && (
                  <p className="text-muted-foreground italic mt-2">{syncResult.message}</p>
                )}
              </>
            )}
            {wooSettings?.lastSyncedAt && (
              <p className="text-muted-foreground mt-2">
                <strong>Last synced:</strong> {new Date(wooSettings.lastSyncedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {orders.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4" />
              <h3 className="font-semibold">All Orders ({orders.length})</h3>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Sales Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Commission Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Matched Client</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                      <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell>{order.billingEmail || '-'}</TableCell>
                      <TableCell>{order.billingCompany || '-'}</TableCell>
                      <TableCell>
                        {order.salesAgentName ? (
                          <Badge variant="outline">{order.salesAgentName}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">${parseFloat(order.total).toFixed(2)}</TableCell>
                      <TableCell>
                        {order.clientId ? (
                          <Select 
                            value={commissionTypes[order.id] || 'auto'}
                            onValueChange={(value) => {
                              setCommissionTypes(prev => ({ ...prev, [order.id]: value }));
                            }}
                          >
                            <SelectTrigger className="w-[140px]" data-testid={`select-commission-type-${order.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto (6mo rule)</SelectItem>
                              <SelectItem value="25">25%</SelectItem>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="flat">Flat Fee</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.clientId ? (
                          commissionTypes[order.id] === 'flat' ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="w-[120px] text-right"
                              value={commissionAmounts[order.id] || ''}
                              onChange={(e) => {
                                setCommissionAmounts(prev => ({ ...prev, [order.id]: e.target.value }));
                              }}
                              data-testid={`input-commission-amount-${order.id}`}
                            />
                          ) : (
                            <span className="font-medium">
                              {commissionTypes[order.id] === 'auto' || !commissionTypes[order.id] ? (
                                <span className="text-muted-foreground italic">{calculateCommission(order.id, parseFloat(order.total))}</span>
                              ) : (
                                `$${calculateCommission(order.id, parseFloat(order.total))}`
                              )}
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.clientId ? (
                          <Badge variant="default">Matched</Badge>
                        ) : (
                          <Dialog open={matchingOrderId === order.id} onOpenChange={(open) => {
                            if (!open) {
                              setMatchingOrderId(null);
                              setSelectedClientId("");
                              setShowAllClients(false);
                              setClientSearch("");
                            } else {
                              // Reset state when opening dialog
                              setSelectedClientId("");
                              setShowAllClients(false);
                              setClientSearch("");
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setMatchingOrderId(order.id)}
                              >
                                <Link2 className="h-4 w-4 mr-1" />
                                Match
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Match Order to Client</DialogTitle>
                                <DialogDescription>
                                  Select a client to match with order #{order.orderNumber}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2 p-3 bg-muted rounded-md">
                                  <p className="text-sm"><strong>Email:</strong> {order.billingEmail || 'N/A'}</p>
                                  <p className="text-sm"><strong>Company:</strong> {order.billingCompany || 'N/A'}</p>
                                  <p className="text-sm"><strong>Total:</strong> ${parseFloat(order.total).toFixed(2)}</p>
                                </div>

                                {/* Smart Suggestions */}
                                {matchSuggestions?.suggestions && matchSuggestions.suggestions.length > 0 && !showAllClients && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="h-4 w-4 text-primary" />
                                      <h4 className="font-semibold text-sm">Smart Suggestions</h4>
                                    </div>
                                    <div className="space-y-2">
                                      {matchSuggestions.suggestions.map((suggestion: any) => (
                                        <button
                                          key={suggestion.client.id}
                                          onClick={() => setSelectedClientId(suggestion.client.id)}
                                          className={`w-full text-left p-3 rounded-md border-2 transition-all hover-elevate ${
                                            selectedClientId === suggestion.client.id
                                              ? 'border-primary bg-primary/10'
                                              : 'border-border'
                                          }`}
                                          data-testid={`suggestion-${suggestion.client.id}`}
                                        >
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <p className="font-medium">{suggestion.displayName}</p>
                                              {suggestion.displayInfo && (
                                                <p className="text-sm text-muted-foreground">{suggestion.displayInfo}</p>
                                              )}
                                              <div className="flex flex-wrap gap-1 mt-2">
                                                {suggestion.reasons.map((reason: string, idx: number) => (
                                                  <Badge key={idx} variant="secondary" className="text-xs">
                                                    {reason}
                                                  </Badge>
                                                ))}
                                              </div>
                                            </div>
                                            <Badge 
                                              variant={suggestion.score >= 80 ? "default" : "secondary"}
                                              className="ml-2"
                                            >
                                              {Math.round(suggestion.score)}% match
                                            </Badge>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowAllClients(true)}
                                      className="w-full"
                                      data-testid="button-show-all-clients"
                                    >
                                      <Search className="h-4 w-4 mr-2" />
                                      Search All Clients
                                    </Button>
                                  </div>
                                )}

                                {/* Show all clients with search */}
                                {(showAllClients || !matchSuggestions?.suggestions || matchSuggestions.suggestions.length === 0) && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Search className="h-4 w-4" />
                                      <Input
                                        placeholder="Search clients by name, company, email..."
                                        value={clientSearch}
                                        onChange={(e) => setClientSearch(e.target.value)}
                                        data-testid="input-search-clients"
                                      />
                                    </div>
                                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                      <SelectTrigger data-testid="select-client">
                                        <SelectValue placeholder="Select a client" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {clients
                                          .filter((client: any) => {
                                            if (!clientSearch) return true;
                                            const search = clientSearch.toLowerCase();
                                            const name = (client.data?.name || client.data?.Name || '').toLowerCase();
                                            const company = (client.data?.company || client.data?.Company || '').toLowerCase();
                                            const email = (client.data?.email || client.data?.Email || '').toLowerCase();
                                            return name.includes(search) || company.includes(search) || email.includes(search);
                                          })
                                          .map((client: any) => (
                                            <SelectItem key={client.id} value={client.id}>
                                              {client.data?.Company || client.data?.company || client.data?.Name || client.data?.name || client.data?.Email || client.data?.email || client.uniqueIdentifier || client.id}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                    {showAllClients && matchSuggestions?.suggestions && matchSuggestions.suggestions.length > 0 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setShowAllClients(false);
                                          setClientSearch("");
                                        }}
                                        className="w-full"
                                      >
                                        Back to Suggestions
                                      </Button>
                                    )}
                                  </div>
                                )}

                                <Button 
                                  onClick={handleMatchOrder}
                                  disabled={!selectedClientId || matchOrderMutation.isPending}
                                  className="w-full"
                                  data-testid="button-confirm-match"
                                >
                                  {matchOrderMutation.isPending ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Matching...
                                    </>
                                  ) : (
                                    "Match Order"
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Conflict Resolution Dialog */}
        <Dialog open={showConflicts} onOpenChange={setShowConflicts}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Agent Assignment Conflicts</DialogTitle>
              <DialogDescription>
                The following orders have conflicting agent assignments. Please resolve them manually in Google Sheets.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {conflicts.map((conflict, idx) => (
                <div key={idx} className="p-4 border rounded-md space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">Order #{conflict.orderNumber}</p>
                      <p className="text-sm text-muted-foreground mt-1">Link: {conflict.link}</p>
                    </div>
                    <Badge variant="destructive">Conflict</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">WooCommerce Agent:</p>
                      <Badge variant="outline">{conflict.newAgent}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Existing Agent in Tracker:</p>
                      <Badge variant="default">{conflict.existingAgent}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    This store already has orders assigned to {conflict.existingAgent}, but WooCommerce shows {conflict.newAgent} for this order.
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConflicts(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
