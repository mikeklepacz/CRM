import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Loader2, Package } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Badge } from "@/components/ui/badge";

export function WooCommerceSync() {
  const { toast } = useToast();
  const [syncResult, setSyncResult] = useState<any>(null);
  
  const { data: orders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/orders");
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/woocommerce/sync", {});
    },
    onSuccess: (data) => {
      setSyncResult(data);
      refetchOrders();
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

        {syncResult && (
          <div className="text-sm space-y-1 p-3 bg-muted rounded-md">
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
                          <Badge variant="outline">Unmatched</Badge>
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
