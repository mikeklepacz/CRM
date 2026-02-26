import type { Express } from "express";
import { registerCallManagerTwilioVoipRoutes } from "../callManager/twilioVoip.routes";
import { registerCallManagerOutboundCallingRoutes } from "../callManager/outboundCalling.routes";
import { registerCallManagerSessionsRoutes } from "../callManager/callSessions.routes";
import { registerCallManagerVoiceProxyAudioRoutes } from "../callManager/voiceProxyAudio.routes";
import { registerCallManagerVoiceProxyHealthRoutes } from "../callManager/voiceProxyHealth.routes";
import { registerCallManagerHistoryEnrichedRoutes } from "../callManager/callHistoryEnriched.routes";
import { registerCallManagerQueueAnalyticsRoutes } from "../callManager/callQueueAnalytics.routes";
import { registerCallManagerInsightsAdminRoutes } from "../callManager/callInsightsAdmin.routes";
import { registerCallManagerOperationsRoutes } from "../callManager/callOperations.routes";
import { registerCallManagerElevenLabsConfigWebhookAdminRoutes } from "../callManager/elevenLabsConfigWebhookAdmin.routes";
import { registerCallManagerElevenLabsSystemHealthRoutes } from "../callManager/elevenLabsSystemHealth.routes";
import { registerCallManagerElevenLabsAgentsAdminRoutes } from "../callManager/elevenLabsAgentsAdmin.routes";
import { registerCallManagerElevenLabsAgentsSyncRoutes } from "../callManager/elevenLabsAgentsSync.routes";
import { registerCallManagerElevenLabsLegacyRoutes } from "../callManager/elevenLabsLegacy.routes";
import { registerCallManagerManualCallHistoryRoutes } from "../callManager/manualCallHistory.routes";
import { createEligibleStoresHandler } from "../../services/callManager/legacy/eligibleStores.handler";
import { createBatchCallHandler } from "../../services/callManager/legacy/batchCall.handler";
import { createDebugCallTraceHandler } from "../../services/callManager/legacy/debugCallTrace.handler";
import { createSyncCallsHandler } from "../../services/callManager/legacy/syncCalls.handler";
import { createReconcileSessionsHandler } from "../../services/callManager/legacy/reconcileSessions.handler";
import { createAnalyzeCallsHandler } from "../../services/callManager/legacy/analyzeCalls.handler";
import { createElevenlabsWebhookHandler } from "../../services/callManager/legacy/elevenLabsWebhook.handler";

type Deps = {
  addCallsToThreadInMicroBatches: any;
  analyzeCallTranscript: any;
  analyzeTranscriptQualification: any;
  callDispatcher: any;
  calculateNextAvailableCallTime: any;
  checkAdminAccess: any;
  checkFlyVoiceProxyHealth: any;
  checkIfStoreOpen: any;
  columnIndexToLetter: any;
  googleSheets: any;
  isAdmin: any;
  isAuthenticatedCustom: any;
  parseHoursToStructured: any;
  reconcileOrphanedCallSessions: any;
  storage: any;
  syncAgentSettingsFromElevenLabs: any;
  voiceProxyServer: any;
};

export function registerCallManagerModuleRoutes(app: Express, deps: Deps): void {
  registerCallManagerElevenLabsConfigWebhookAdminRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });
  registerCallManagerElevenLabsSystemHealthRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    checkFlyVoiceProxyHealth: deps.checkFlyVoiceProxyHealth,
  });
  registerCallManagerVoiceProxyHealthRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    checkAdminAccess: deps.checkAdminAccess,
    checkFlyVoiceProxyHealth: deps.checkFlyVoiceProxyHealth,
    voiceProxyServer: deps.voiceProxyServer,
  });
  registerCallManagerElevenLabsAgentsAdminRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    syncAgentSettingsFromElevenLabs: deps.syncAgentSettingsFromElevenLabs,
  });
  registerCallManagerElevenLabsAgentsSyncRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });

  const handleElevenlabsWebhook = createElevenlabsWebhookHandler({
    analyzeCallTranscript: deps.analyzeCallTranscript,
    analyzeTranscriptQualification: deps.analyzeTranscriptQualification,
    columnIndexToLetter: deps.columnIndexToLetter,
    googleSheets: deps.googleSheets,
    storage: deps.storage,
  });

  registerCallManagerTwilioVoipRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerCallManagerOutboundCallingRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    checkAdminAccess: deps.checkAdminAccess,
  });
  registerCallManagerSessionsRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    checkAdminAccess: deps.checkAdminAccess,
  });
  registerCallManagerHistoryEnrichedRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    checkAdminAccess: deps.checkAdminAccess,
  });
  registerCallManagerVoiceProxyAudioRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });

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

  registerCallManagerQueueAnalyticsRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    checkAdminAccess: deps.checkAdminAccess,
  });
  registerCallManagerOperationsRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    checkAdminAccess: deps.checkAdminAccess,
  });

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

  registerCallManagerInsightsAdminRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });
  registerCallManagerManualCallHistoryRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
}
