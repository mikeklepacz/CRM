import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Loader2 } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

export function WooCommerceSync() {
  const { toast } = useToast();
  const [syncResult, setSyncResult] = useState<any>(null);

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/woocommerce/sync", {});
    },
    onSuccess: (data) => {
      setSyncResult(data);
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
            <p><strong>Total Orders:</strong> {syncResult.total ?? 0}</p>
            <p><strong>Synced:</strong> {syncResult.synced ?? 0}</p>
            <p><strong>Matched to Clients:</strong> {syncResult.matched ?? 0}</p>
            {syncResult.message && (
              <p className="text-muted-foreground italic mt-2">{syncResult.message}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
