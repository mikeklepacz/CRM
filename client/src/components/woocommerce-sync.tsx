import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Loader2, Package, Link2 } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Badge } from "@/components/ui/badge";
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
        )}</div>
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
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
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
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">${parseFloat(order.total).toFixed(2)}</TableCell>
                      <TableCell>
                        {order.clientId ? (
                          <Badge variant="default">Matched</Badge>
                        ) : (
                          <Dialog open={matchingOrderId === order.id} onOpenChange={(open) => {
                            if (!open) {
                              setMatchingOrderId(null);
                              setSelectedClientId("");
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
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Match Order to Client</DialogTitle>
                                <DialogDescription>
                                  Select a client to match with order #{order.orderNumber}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <p className="text-sm"><strong>Email:</strong> {order.billingEmail || 'N/A'}</p>
                                  <p className="text-sm"><strong>Company:</strong> {order.billingCompany || 'N/A'}</p>
                                  <p className="text-sm"><strong>Total:</strong> ${parseFloat(order.total).toFixed(2)}</p>
                                </div>
                                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a client" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {clients.map((client: any) => (
                                      <SelectItem key={client.id} value={client.id}>
                                        {client.data?.Company || client.data?.company || client.data?.Email || client.data?.email || client.uniqueIdentifier || client.id}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button 
                                  onClick={handleMatchOrder}
                                  disabled={!selectedClientId || matchOrderMutation.isPending}
                                  className="w-full"
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
      </CardContent>
    </Card>
  );
}
