import { Button } from "@/components/ui/button";
import { Loader2, Package, RefreshCw, Save, Search } from "lucide-react";
import type { SyncResult, WooSettings, WooOrder } from "./types";

type Props = {
  syncMutationPending: boolean;
  saveCommissionsPending: boolean;
  orders: WooOrder[];
  liveTotalCount: number;
  liveMatchedCount: number;
  syncResult: SyncResult | null;
  wooSettings?: WooSettings;
  onSync: () => void;
  onSaveCommissions: () => void;
  onOpenMultiLocation: () => void;
};

export function SyncControls({
  syncMutationPending,
  saveCommissionsPending,
  orders,
  liveTotalCount,
  liveMatchedCount,
  syncResult,
  wooSettings,
  onSync,
  onSaveCommissions,
  onOpenMultiLocation,
}: Props) {
  const matchedOrdersCount = orders.filter((o) => o.clientId || o.hasTrackerRows).length;

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={onSync} disabled={syncMutationPending} data-testid="button-sync-woocommerce">
          {syncMutationPending ? (
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
          onClick={onSaveCommissions}
          disabled={saveCommissionsPending || matchedOrdersCount === 0}
          variant="default"
          data-testid="button-save-all-commissions"
        >
          {saveCommissionsPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Commissions ({matchedOrdersCount})
            </>
          )}
        </Button>

        <Button onClick={onOpenMultiLocation} variant="outline" data-testid="button-multi-location-assign">
          <Search className="h-4 w-4 mr-2" />
          Multi-Location Assign
        </Button>
      </div>

      {(syncResult || wooSettings?.lastSyncedAt) && (
        <div className="text-sm space-y-1 p-3 bg-muted rounded-md">
          {syncResult && (
            <>
              <p><strong>Total Orders:</strong> {liveTotalCount || syncResult.total || 0}</p>
              <p><strong>Synced:</strong> {syncResult.synced || 0}</p>
              <p><strong>Matched to Clients:</strong> {liveMatchedCount}</p>
              {(liveTotalCount || syncResult.total || 0) > 0 && liveMatchedCount === 0 && (
                <p className="text-yellow-600 dark:text-yellow-500 mt-2">
                  ⚠️ Orders were synced but couldn&apos;t be matched to any clients.
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
        </div>
      )}
    </>
  );
}
