import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Loader2, Link2, Search, Sparkles, Save, Package } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { normalizeLink } from "@shared/linkUtils";
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
  const [selectedStores, setSelectedStores] = useState<Array<{link: string, name: string}>>([]);
  const [dbaName, setDbaName] = useState<string>("");
  const [clientSearch, setClientSearch] = useState<string>("");
  const [showAllClients, setShowAllClients] = useState<boolean>(false);
  
  // Commission management state
  const [commissionTypes, setCommissionTypes] = useState<Record<string, string>>({});
  const [commissionAmounts, setCommissionAmounts] = useState<Record<string, string>>({});
  const [modifiedOrders, setModifiedOrders] = useState<Set<string>>(new Set());
  
  // Sorting state - default to newest first (descending by order date)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
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
      const fetchedOrders = await apiRequest("GET", "/api/orders");
      
      // Load saved commission settings from database
      const types: Record<string, string> = {};
      const amounts: Record<string, string> = {};
      
      fetchedOrders.forEach((order: any) => {
        if (order.commissionType) {
          types[order.id] = order.commissionType;
        }
        if (order.commissionAmount) {
          amounts[order.id] = order.commissionAmount;
        }
      });
      
      setCommissionTypes(types);
      setCommissionAmounts(amounts);
      setModifiedOrders(new Set());
      
      return fetchedOrders;
    },
  });

  // Sort orders by order date (newest first by default)
  const sortedOrders = [...(orders || [])].sort((a: any, b: any) => {
    const dateA = new Date(a.orderDate).getTime();
    const dateB = new Date(b.orderDate).getTime();
    return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
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
  // Includes manual search support via clientSearch state
  const { data: matchSuggestions } = useQuery({
    queryKey: ["/api/orders", matchingOrderId, "match-suggestions", clientSearch],
    queryFn: async () => {
      if (!matchingOrderId) return null;
      const searchParam = clientSearch.trim() ? `?search=${encodeURIComponent(clientSearch)}` : '';
      return await apiRequest("GET", `/api/orders/${matchingOrderId}/match-suggestions${searchParam}`);
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
    mutationFn: async ({ orderId, storeLinks, dba }: { orderId: string; storeLinks: Array<{link: string, name: string}>; dba?: string }) => {
      return await apiRequest("POST", `/api/orders/${orderId}/match`, { storeLinks, dba });
    },
    onSuccess: () => {
      refetchOrders();
      setMatchingOrderId(null);
      setSelectedStores([]);
      setDbaName("");
      setShowAllClients(false);
      setClientSearch("");
      toast({
        title: "Success",
        description: `Order matched to ${selectedStores.length} store(s) successfully`,
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

  const saveCommissionsMutation = useMutation({
    mutationFn: async () => {
      // Include ALL matched orders (for Google Sheets), not just modified ones
      const orderUpdates = orders
        .filter((order: any) => order.clientId || order.hasTrackerRows)
        .map((order: any) => ({
          orderId: order.id,
          commissionType: commissionTypes[order.id] || 'auto',
          commissionAmount: commissionAmounts[order.id] || null,
        }));
      
      return await apiRequest("POST", "/api/orders/save-commissions", { orders: orderUpdates });
    },
    onSuccess: (data) => {
      setModifiedOrders(new Set());
      if (data.conflicts && data.conflicts.length > 0) {
        setConflicts(data.conflicts);
        setShowConflicts(true);
        toast({
          title: "Partial Success",
          description: `${data.dbUpdated} saved to database, ${data.sheetsWritten} written to Google Sheets. ${data.conflicts.length} conflicts need resolution.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Success",
          description: data.message,
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

  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);

  // Multi-location search and bulk-assign state
  const [showMultiLocationDialog, setShowMultiLocationDialog] = useState(false);
  const [multiLocationSearch, setMultiLocationSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [bulkSelectedStores, setBulkSelectedStores] = useState<Set<string>>(new Set());
  const [bulkAgentName, setBulkAgentName] = useState("");

  const searchStoresMutation = useMutation({
    mutationFn: async (searchTerm: string) => {
      return await apiRequest("POST", "/api/stores/search", { searchTerm });
    },
    onSuccess: (data) => {
      setSearchResults(data.stores || []);
      if (data.stores.length === 0) {
        toast({
          title: "No Results",
          description: "No stores found matching your search",
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

  const bulkAssignMutation = useMutation({
    mutationFn: async ({ storeLinks, agentName }: { storeLinks: string[]; agentName: string }) => {
      return await apiRequest("POST", "/api/stores/bulk-assign", { storeLinks, agentName });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      setShowMultiLocationDialog(false);
      setSearchResults([]);
      setBulkSelectedStores(new Set());
      setBulkAgentName("");
      setMultiLocationSearch("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMultiLocationSearch = () => {
    if (multiLocationSearch.trim().length > 0) {
      searchStoresMutation.mutate(multiLocationSearch.trim());
    }
  };

  const handleBulkAssign = () => {
    if (bulkSelectedStores.size === 0) {
      toast({
        title: "No Stores Selected",
        description: "Please select at least one store to assign",
        variant: "destructive",
      });
      return;
    }
    if (!bulkAgentName.trim()) {
      toast({
        title: "Agent Name Required",
        description: "Please enter an agent name",
        variant: "destructive",
      });
      return;
    }
    bulkAssignMutation.mutate({
      storeLinks: Array.from(bulkSelectedStores),
      agentName: bulkAgentName.trim(),
    });
  };

  const toggleBulkStoreSelection = (link: string) => {
    const newSelected = new Set(bulkSelectedStores);
    if (newSelected.has(link)) {
      newSelected.delete(link);
    } else {
      newSelected.add(link);
    }
    setBulkSelectedStores(newSelected);
  };

  const selectAllStores = () => {
    const allLinks = searchResults.map(s => s.link);
    setBulkSelectedStores(new Set(allLinks));
  };

  const deselectAllStores = () => {
    setBulkSelectedStores(new Set());
  };

  const handleMatchOrder = () => {
    if (matchingOrderId && selectedStores.length > 0) {
      matchOrderMutation.mutate({ 
        orderId: matchingOrderId, 
        storeLinks: selectedStores,
        dba: dbaName || undefined
      });
    }
  };
  
  const toggleStoreSelection = (link: string, name: string) => {
    setSelectedStores(prev => {
      const exists = prev.find(s => s.link === link);
      if (exists) {
        return prev.filter(s => s.link !== link);
      } else {
        return [...prev, { link, name }];
      }
    });
  };
  
  const isStoreSelected = (link: string) => {
    return selectedStores.some(s => s.link === link);
  };

  // Pre-select matched stores when dialog opens and suggestions load
  useEffect(() => {
    if (matchingOrderId && matchSuggestions?.matchedStoreLinks && matchSuggestions.matchedStoreLinks.length > 0) {
      const matchedLinks = new Set(matchSuggestions.matchedStoreLinks.map(normalizeLink));
      
      // Find matching stores from suggestions
      const matchedStores = matchSuggestions.suggestions
        ?.filter((s: any) => matchedLinks.has(normalizeLink(s.link)))
        .map((s: any) => ({ link: s.link, name: s.displayName })) || [];
      
      if (matchedStores.length > 0) {
        setSelectedStores(matchedStores);
      }
    }
  }, [matchingOrderId, matchSuggestions]);

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
            onClick={() => saveCommissionsMutation.mutate()}
            disabled={saveCommissionsMutation.isPending || !orders.some((o: any) => o.clientId || o.hasTrackerRows)}
            variant="default"
            data-testid="button-save-all-commissions"
          >
            {saveCommissionsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Commissions ({orders.filter((o: any) => o.clientId || o.hasTrackerRows).length})
              </>
            )}
          </Button>
          
          <Button
            onClick={() => setShowMultiLocationDialog(true)}
            variant="outline"
            data-testid="button-multi-location-assign"
          >
            <Search className="h-4 w-4 mr-2" />
            Multi-Location Assign
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
                    <TableHead 
                      className="cursor-pointer hover-elevate select-none"
                      onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                      data-testid="header-order-number-sort"
                    >
                      Order # {sortDirection === 'desc' ? '↓' : '↑'}
                    </TableHead>
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
                  {sortedOrders.map((order: any) => (
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
                        <Select 
                          value={commissionTypes[order.id] || 'auto'}
                          onValueChange={(value) => {
                            setCommissionTypes(prev => ({ ...prev, [order.id]: value }));
                            setModifiedOrders(prev => new Set(prev).add(order.id));
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
                      </TableCell>
                      <TableCell className="text-right">
                        {commissionTypes[order.id] === 'flat' ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="w-[120px] text-right"
                            value={commissionAmounts[order.id] || ''}
                            onChange={(e) => {
                              setCommissionAmounts(prev => ({ ...prev, [order.id]: e.target.value }));
                              setModifiedOrders(prev => new Set(prev).add(order.id));
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
                        )}
                      </TableCell>
                      <TableCell>
                        <Dialog open={matchingOrderId === order.id} onOpenChange={(open) => {
                          if (!open) {
                            setMatchingOrderId(null);
                            setSelectedStores([]);
                            setDbaName("");
                            setShowAllClients(false);
                            setClientSearch("");
                          } else {
                            // Reset state when opening dialog (useEffect will pre-select matched stores)
                            setSelectedStores([]);
                            setDbaName("");
                            setShowAllClients(false);
                            setClientSearch("");
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant={order.hasTrackerRows ? "default" : "outline"}
                              size="sm"
                              onClick={() => setMatchingOrderId(order.id)}
                              className={order.hasTrackerRows ? "bg-green-600 hover:bg-green-700 border-green-700" : ""}
                              data-testid={`button-match-${order.id}`}
                            >
                              <Link2 className="h-4 w-4 mr-1" />
                              {order.hasTrackerRows ? "Matched ✓" : "Match"}
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

                                {/* Match Button - Positioned at top for easy access */}
                                <Button 
                                  onClick={handleMatchOrder}
                                  disabled={selectedStores.length === 0 || matchOrderMutation.isPending}
                                  className="w-full"
                                  data-testid="button-confirm-match"
                                >
                                  {matchOrderMutation.isPending ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Matching...
                                    </>
                                  ) : (
                                    selectedStores.length > 0 
                                      ? `Match Order to ${selectedStores.length} Store${selectedStores.length > 1 ? 's' : ''}`
                                      : "Select Store(s) to Match"
                                  )}
                                </Button>

                                {/* Selected Stores Panel */}
                                {selectedStores.length > 0 && (
                                  <div className="p-3 bg-primary/10 border-2 border-primary rounded-md space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-semibold text-sm">Selected Stores ({selectedStores.length})</h4>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setSelectedStores([])}
                                        data-testid="button-clear-selections"
                                      >
                                        Clear All
                                      </Button>
                                    </div>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {selectedStores.map(store => (
                                        <div key={store.link} className="text-sm flex items-center gap-2">
                                          <span className="text-primary">✓</span>
                                          <span className="flex-1">{store.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* DBA Input Field */}
                                {selectedStores.length > 0 && (
                                  <div className="space-y-2">
                                    <Label htmlFor="dba-name">DBA / Umbrella Company Name (Optional)</Label>
                                    <Input
                                      id="dba-name"
                                      placeholder="e.g., Lift Cannabis Co"
                                      value={dbaName}
                                      onChange={(e) => setDbaName(e.target.value)}
                                      data-testid="input-dba-name"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      This DBA will be assigned to all {selectedStores.length} selected store(s)
                                    </p>
                                  </div>
                                )}

                                {/* Smart Suggestions */}
                                {matchSuggestions?.suggestions && matchSuggestions.suggestions.length > 0 && !showAllClients && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="h-4 w-4 text-primary" />
                                      <h4 className="font-semibold text-sm">Smart Suggestions</h4>
                                    </div>
                                    <div className="space-y-2">
                                      {matchSuggestions.suggestions.map((suggestion: any) => (
                                        <div
                                          key={suggestion.link}
                                          className={`p-3 rounded-md border-2 transition-all hover-elevate ${
                                            isStoreSelected(suggestion.link)
                                              ? 'border-primary bg-primary/10'
                                              : 'border-border'
                                          }`}
                                          data-testid={`suggestion-${suggestion.link}`}
                                        >
                                          <div className="flex items-start gap-3">
                                            <Checkbox
                                              checked={isStoreSelected(suggestion.link)}
                                              onCheckedChange={() => toggleStoreSelection(suggestion.link, suggestion.displayName)}
                                              data-testid={`checkbox-${suggestion.link}`}
                                            />
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
                                        </div>
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
                                      Search More Stores
                                    </Button>
                                  </div>
                                )}

                                {/* Manual search results */}
                                {(showAllClients || !matchSuggestions?.suggestions || matchSuggestions.suggestions.length === 0) && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Search className="h-4 w-4" />
                                      <Input
                                        placeholder="Search stores by name, company, email..."
                                        value={clientSearch}
                                        onChange={(e) => setClientSearch(e.target.value)}
                                        data-testid="input-search-clients"
                                      />
                                    </div>
                                    
                                    {/* Show search results with checkboxes (same as suggestions) */}
                                    {matchSuggestions?.suggestions && matchSuggestions.suggestions.length > 0 && (
                                      <div className="space-y-2">
                                        {matchSuggestions.suggestions.map((suggestion: any) => (
                                          <div
                                            key={suggestion.link}
                                            className={`p-3 rounded-md border-2 transition-all hover-elevate ${
                                              isStoreSelected(suggestion.link)
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border'
                                            }`}
                                            data-testid={`search-result-${suggestion.link}`}
                                          >
                                            <div className="flex items-start gap-3">
                                              <Checkbox
                                                checked={isStoreSelected(suggestion.link)}
                                                onCheckedChange={() => toggleStoreSelection(suggestion.link, suggestion.displayName)}
                                                data-testid={`checkbox-search-${suggestion.link}`}
                                              />
                                              <div className="flex-1">
                                                <p className="font-medium">{suggestion.displayName}</p>
                                                {suggestion.displayInfo && (
                                                  <p className="text-sm text-muted-foreground">{suggestion.displayInfo}</p>
                                                )}
                                              </div>
                                              <Badge 
                                                variant={suggestion.score >= 80 ? "default" : "secondary"}
                                                className="ml-2"
                                              >
                                                {Math.round(suggestion.score)}% match
                                              </Badge>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
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
                              </div>
                            </DialogContent>
                          </Dialog>
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

        {/* Multi-Location Search and Assign Dialog */}
        <Dialog open={showMultiLocationDialog} onOpenChange={setShowMultiLocationDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Multi-Location Store Assignment</DialogTitle>
              <DialogDescription>
                Search for stores by name or DBA (company name), then assign an agent to all matching locations at once.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Search Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Search by store name or DBA (e.g., 'Bud Mart')"
                  value={multiLocationSearch}
                  onChange={(e) => setMultiLocationSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleMultiLocationSearch();
                    }
                  }}
                  data-testid="input-multi-location-search"
                />
                <Button
                  onClick={handleMultiLocationSearch}
                  disabled={searchStoresMutation.isPending || !multiLocationSearch.trim()}
                  data-testid="button-search-stores"
                >
                  {searchStoresMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Found {searchResults.length} store(s)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllStores}
                        data-testid="button-select-all-stores"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={deselectAllStores}
                        data-testid="button-deselect-all-stores"
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>

                  {/* Store List */}
                  <div className="border rounded-md max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead className="w-12">Select</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>DBA</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Current Agent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((store) => (
                          <TableRow key={store.link}>
                            <TableCell>
                              <Checkbox
                                checked={bulkSelectedStores.has(store.link)}
                                onCheckedChange={() => toggleBulkStoreSelection(store.link)}
                                data-testid={`checkbox-store-${store.link}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{store.name}</TableCell>
                            <TableCell>{store.dba || '-'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {store.city && store.state ? `${store.city}, ${store.state}` : store.address || '-'}
                            </TableCell>
                            <TableCell>
                              {store.agentName ? (
                                <Badge variant="default">{store.agentName}</Badge>
                              ) : (
                                <Badge variant="outline">Unassigned</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Agent Assignment */}
                  <div className="space-y-2">
                    <Label htmlFor="bulk-agent-name">Agent Name</Label>
                    <Input
                      id="bulk-agent-name"
                      placeholder="Enter agent name (e.g., 'John Smith')"
                      value={bulkAgentName}
                      onChange={(e) => setBulkAgentName(e.target.value)}
                      data-testid="input-bulk-agent-name"
                    />
                    <p className="text-sm text-muted-foreground">
                      Selected: {bulkSelectedStores.size} store(s)
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowMultiLocationDialog(false);
                        setSearchResults([]);
                        setBulkSelectedStores(new Set());
                        setBulkAgentName("");
                        setMultiLocationSearch("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkAssign}
                      disabled={bulkAssignMutation.isPending || bulkSelectedStores.size === 0 || !bulkAgentName.trim()}
                      data-testid="button-execute-bulk-assign"
                    >
                      {bulkAssignMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        `Assign to ${bulkSelectedStores.size} Store(s)`
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* No Results Message */}
              {searchResults.length === 0 && multiLocationSearch && !searchStoresMutation.isPending && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No stores found matching "{multiLocationSearch}"</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
