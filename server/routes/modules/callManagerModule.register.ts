import type { Express } from "express";
import { registerCallManagerElevenLabsLegacyRoutes } from "../callManager/elevenLabsLegacy.routes";
import { createEligibleStoresHandler } from "../../services/callManager/legacy/eligibleStores.handler";
import { createBatchCallHandler } from "../../services/callManager/legacy/batchCall.handler";
import { createDebugCallTraceHandler } from "../../services/callManager/legacy/debugCallTrace.handler";
import { createSyncCallsHandler } from "../../services/callManager/legacy/syncCalls.handler";
import { createReconcileSessionsHandler } from "../../services/callManager/legacy/reconcileSessions.handler";
import { createAnalyzeCallsHandler } from "../../services/callManager/legacy/analyzeCalls.handler";
import { createElevenlabsWebhookHandler } from "../../services/callManager/legacy/elevenLabsWebhook.handler";
import { registerCallManagerModuleElevenLabsAdminRoutes } from "./callManagerModule.elevenLabsAdmin.register";
import { registerCallManagerModuleCoreRoutes } from "./callManagerModule.core.register";
import { registerCallManagerModuleAnalyticsOpsRoutes } from "./callManagerModule.analyticsOps.register";
import { registerCallManagerModuleTailRoutes } from "./callManagerModule.tail.register";
import type { CallManagerModuleDeps as Deps } from "./callManagerModule.types";

export function registerCallManagerModuleRoutesImpl(app: Express, deps: Deps): void {
  registerCallManagerModuleElevenLabsAdminRoutes(app, deps);

  const handleElevenlabsWebhook = createElevenlabsWebhookHandler({
    analyzeCallTranscript: deps.analyzeCallTranscript,
    analyzeTranscriptQualification: deps.analyzeTranscriptQualification,
    columnIndexToLetter: deps.columnIndexToLetter,
    googleSheets: deps.googleSheets,
    storage: deps.storage,
  });

  registerCallManagerModuleCoreRoutes(app, deps);

  const handleEligibleStores = createEligibleStoresHandler({
    storage: deps.storage,
    checkAdminAccess: deps.checkAdminAccess,
    parseHoursToStructured: deps.parseHoursToStructured,
    checkIfStoreOpen: deps.checkIfStoreOpen,
  });
  const handleBatchCall = createBatchCallHandler({
    storage: deps.storage,
    checkAdminAccess: deps.checkAdminAccess,
    checkFlyVoiceProxyHealth: deps.checkFlyVoiceProxyHealth,
    calculateNextAvailableCallTime: deps.calculateNextAvailableCallTime,
    callDispatcher: deps.callDispatcher,
  });
  const handleDebugCallTrace = createDebugCallTraceHandler(deps.storage);

  registerCallManagerModuleAnalyticsOpsRoutes(app, deps);

  const handleSyncCalls = createSyncCallsHandler({ storage: deps.storage });
  const handleReconcileSessions = createReconcileSessionsHandler(deps.reconcileOrphanedCallSessions);
  const handleAnalyzeCalls = createAnalyzeCallsHandler({
    addCallsToThreadInMicroBatches: deps.addCallsToThreadInMicroBatches,
    storage: deps.storage,
  });

  registerCallManagerElevenLabsLegacyRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    handleAnalyzeCalls,
    handleBatchCall,
    handleDebugCallTrace,
    handleEligibleStores,
    handleElevenlabsWebhook,
    handleReconcileSessions,
    handleSyncCalls,
  });

  registerCallManagerModuleTailRoutes(app, deps);
}
