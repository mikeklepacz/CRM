import type { Express } from "express";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
  handleElevenlabsWebhook: any;
  handleEligibleStores: any;
  handleBatchCall: any;
  handleDebugCallTrace: any;
  handleSyncCalls: any;
  handleReconcileSessions: any;
  handleAnalyzeCalls: any;
};

export function registerCallManagerElevenLabsLegacyRoutes(app: Express, deps: Deps): void {
  app.post("/api/elevenlabs/webhook", deps.handleElevenlabsWebhook);
  app.get(
    "/api/elevenlabs/eligible-stores/:scenario",
    deps.isAuthenticatedCustom,
    deps.handleEligibleStores
  );
  app.post("/api/elevenlabs/batch-call", deps.isAuthenticatedCustom, deps.handleBatchCall);
  app.get(
    "/api/debug/call-trace/:callSid",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    deps.handleDebugCallTrace
  );
  app.post("/api/elevenlabs/sync-calls", deps.isAuthenticatedCustom, deps.isAdmin, deps.handleSyncCalls);
  app.post(
    "/api/elevenlabs/reconcile-sessions",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    deps.handleReconcileSessions
  );
  app.post("/api/elevenlabs/analyze-calls", deps.isAuthenticatedCustom, deps.isAdmin, deps.handleAnalyzeCalls);
}
