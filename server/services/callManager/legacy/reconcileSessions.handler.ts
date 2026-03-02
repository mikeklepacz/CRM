type ReconcileFn = (tenantId: string) => Promise<{
  processed: number;
  matched: number;
  analysisTriggered: number;
  errors: string[];
}>;

export function createReconcileSessionsHandler(reconcileOrphanedCallSessions: ReconcileFn) {
  return async (req: any, res: any) => {
    try {
      const tenantId = (req.user as any).tenantId;
      console.log(`[Reconciliation] Manual trigger by admin for tenant ${tenantId}`);

      const result = await reconcileOrphanedCallSessions(tenantId);
      res.json({
        success: true,
        processed: result.processed,
        matched: result.matched,
        analysisTriggered: result.analysisTriggered,
        errors: result.errors.slice(0, 5),
      });
    } catch (error: any) {
      console.error("[Reconciliation] Manual reconciliation error:", error);
      res.status(500).json({ error: error.message || "Failed to reconcile sessions" });
    }
  };
}
