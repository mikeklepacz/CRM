import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, sql, and, or, isNull } from "drizzle-orm";
import { users, kbFiles, categories, geocodeCache as geocodeCacheTable } from "@shared/schema";
import { setupAuth, isAuthenticated, getOidcConfig, requireSuperAdmin, requireOrgAdmin } from "./replitAuth";
import bcrypt from "bcrypt";
import * as client from "openid-client";
import * as googleSheets from "./googleSheets";
import * as googleDrive from "./googleDrive";
import { analyzeCallTranscript } from "./openai-reflection";
import { analyzeTranscript as analyzeTranscriptQualification } from "./services/aiTranscriptAnalysis";
import { normalizeLink } from "../shared/linkUtils";
import { ensureDailySlots } from "./services/Matrix2/slotGenerator";
import { assignSingleRecipient } from "./services/Matrix2/slotAssigner";
import { syncRemindersToCalendar, renewCalendarWatchIfNeeded, cleanupDeletedCalendarEvents } from "./calendarSync";
import { computeHash, getCached, setCache } from "./services/sheetCache";
import { eventGateway } from "./services/events/gateway";
import { callDispatcher } from "./call_dispatcher";
import { reconcileOrphanedCallSessions } from "./services/elevenLabsReconciliation";
import { crawlWebsiteForEmail } from "./emailCrawler";
import { voiceProxyServer } from "./voice-proxy";
import { registerWooCommerceRoutes } from "./routes/woocommerce.routes";
import {
  checkFlyVoiceProxyHealth,
  syncAgentSettingsFromElevenLabs,
} from "./services/callManager/legacy/elevenLabsAdminHelpers.service";
import {
  calculateNextAvailableCallTime,
  checkIfStoreOpen,
  parseHoursToStructured,
} from "./services/callManager/legacy/storeHoursLegacy.service";
import { registerPlatformAuthUserLegacyRoutes } from "./routes/platform/platformAuthUserLegacy.routes";
import {
  createAuthLoginHandler,
  createAuthRegisterHandler,
  createEventsHandler,
} from "./services/platform/authCoreLegacyHandlers.service";
import { createAuthContextHelpers } from "./services/platform/authContextHelpers.service";
import { createAuthUserHandler } from "./services/platform/authUserLegacy.handler";
import {
  createUserGmailSettingsUpdateHandler,
  createUserPasswordUpdateHandler,
  createUserPreferencesGetHandler,
  createUserPreferencesUpdateHandler,
  createUserProfileUpdateHandler,
  createUserUploadLoadingLogoHandler,
} from "./services/platform/userSettingsLegacyHandlers.service";
import { createSheetsMergedDataCache } from "./services/organization/sheetsMergedDataCache.service";
import { registerGmailDraftRoutes } from "./routes/docs/gmailDraft.routes";
import { registerGmailOauthSupportRoutes } from "./routes/docs/gmailOauthSupport.routes";
import { registerGmailPushRoutes } from "./routes/docs/gmailPush.routes";
import { registerGoogleSheetsAuthRoutes } from "./routes/docs/googleSheetsAuth.routes";
import { createGeocodeAddressFn } from "./services/mapSearch/geocodeAddress.service";
import {
  addCallsToThreadInMicroBatches,
  columnIndexToLetter,
  createSyncKbFileToAlignerVectorStore,
} from "./services/assistant/legacy/alignerOpsHelpers.service";
import { registerCallManagerModuleRoutes } from "./routes/modules/callManagerModule.routes";
import { registerAssistantModuleRoutes } from "./routes/modules/assistantModule.routes";
import { registerClientsModuleRoutes } from "./routes/modules/clientsModule.routes";
import { registerAdminModuleRoutes } from "./routes/modules/adminModule.routes";
import { registerOrganizationModuleRoutes } from "./routes/modules/organizationModule.routes";
import { registerStoresMapModuleRoutes } from "./routes/modules/storesMapModule.routes";
import { registerEngagementModuleRoutes } from "./routes/modules/engagementModule.routes";
import { registerGovernanceModuleRoutes } from "./routes/modules/governanceModule.routes";

const { clearUserCache, generateCacheKey, getCachedData, setCachedData } = createSheetsMergedDataCache();
const memoryGeocodeCache = new Map<string, { lat: number; lng: number } | null>();
const geocodeAddress = createGeocodeAddressFn({ db, eq, geocodeCacheTable, memoryGeocodeCache });
const syncKbFileToAlignerVectorStore = createSyncKbFileToAlignerVectorStore(storage);

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  app.use('/label-designer', (_req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    next();
  });

  app.use('/api/label-projects', (_req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'X-Drive-Folder-Url');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  await setupAuth(app);

  // Username/Password Authentication Routes
  const handleAuthLogin = createAuthLoginHandler({ bcrypt, storage });

  const handleAuthRegister = createAuthRegisterHandler({ bcrypt, storage });

  const { checkAdminAccess, getCurrentUser, getEffectiveTenantId, isAdmin, isAuthenticatedCustom } =
    createAuthContextHelpers({
      client,
      getOidcConfig,
      storage,
    });

  const handleEvents = createEventsHandler(eventGateway);

  const handleAuthUser = createAuthUserHandler({
    cleanupDeletedCalendarEvents,
    renewCalendarWatchIfNeeded,
    storage,
    syncRemindersToCalendar,
  });

  const handleUserProfileUpdate = createUserProfileUpdateHandler(storage);

  const handleUserPasswordUpdate = createUserPasswordUpdateHandler({
    bcrypt,
    storage,
  });

  const handleUserGmailSettingsUpdate = createUserGmailSettingsUpdateHandler(storage);

  const handleUserPreferencesGet = createUserPreferencesGetHandler(storage);

  const handleUserPreferencesUpdate = createUserPreferencesUpdateHandler(storage);

  const handleUserUploadLoadingLogo = createUserUploadLoadingLogoHandler(storage);

  registerPlatformAuthUserLegacyRoutes(app, {
    isAuthenticatedCustom,
    handleAuthLogin,
    handleAuthRegister,
    handleEvents,
    handleAuthUser,
    handleUserProfileUpdate,
    handleUserPasswordUpdate,
    handleUserGmailSettingsUpdate,
    handleUserPreferencesGet,
    handleUserPreferencesUpdate,
    handleUserUploadLoadingLogo,
  });

  registerWooCommerceRoutes(app, { isAdmin, isAuthenticatedCustom });

  registerCallManagerModuleRoutes(app, {
    addCallsToThreadInMicroBatches,
    analyzeCallTranscript,
    analyzeTranscriptQualification,
    callDispatcher,
    calculateNextAvailableCallTime,
    checkAdminAccess,
    checkFlyVoiceProxyHealth,
    checkIfStoreOpen,
    columnIndexToLetter,
    googleSheets,
    isAdmin,
    isAuthenticatedCustom,
    parseHoursToStructured,
    reconcileOrphanedCallSessions,
    storage,
    syncAgentSettingsFromElevenLabs,
    voiceProxyServer,
  });

  registerAssistantModuleRoutes(app, {
    addCallsToThreadInMicroBatches,
    checkAdminAccess,
    db,
    eq,
    getEffectiveTenantId,
    googleDrive,
    isAdmin,
    isAuthenticated,
    isAuthenticatedCustom,
    kbFiles,
    sql,
    storage,
    syncKbFileToAlignerVectorStore,
  });

  // ===== SYSTEM-WIDE GOOGLE SHEETS OAUTH (ADMIN ONLY) =====
  registerGoogleSheetsAuthRoutes(app, { isAdmin, isAuthenticatedCustom });

  // ===== PER-USER GOOGLE SERVICES OAUTH (GMAIL/CALENDAR - ALL USERS) =====
  registerGmailOauthSupportRoutes(app, { isAuthenticatedCustom });

  registerGmailDraftRoutes(app, { isAuthenticatedCustom });

  registerGmailPushRoutes(app, { checkAdminAccess, isAuthenticatedCustom });

  registerClientsModuleRoutes(app, {
    clearUserCache,
    computeHash,
    crawlWebsiteForEmail,
    eventGateway,
    getCached,
    getCurrentUser,
    googleSheets,
    isAdmin,
    isAuthenticatedCustom,
    normalizeLink,
    setCache,
    storage,
  });

  registerAdminModuleRoutes(app, {
    bcrypt,
    db,
    eq,
    getCurrentUser,
    googleSheets,
    isAdmin,
    isAuthenticatedCustom,
    storage,
    users,
  });

  registerOrganizationModuleRoutes(app, {
    and,
    categories,
    checkAdminAccess,
    clearUserCache,
    db,
    eq,
    generateCacheKey,
    getCachedData,
    googleSheets,
    isAdmin,
    isAuthenticatedCustom,
    isNull,
    normalizeLink,
    or,
    setCachedData,
    storage,
  });

  registerStoresMapModuleRoutes(app, {
    clearUserCache,
    geocodeAddress,
    isAdmin,
    isAuthenticatedCustom,
    memoryGeocodeCache,
  });

  registerEngagementModuleRoutes(app, {
    checkAdminAccess,
    clearUserCache,
    getEffectiveTenantId,
    googleSheets,
    isAdmin,
    isAuthenticatedCustom,
    storage,
  });

  registerGovernanceModuleRoutes(app, {
    getEffectiveTenantId,
    isAdmin,
    isAuthenticated,
    isAuthenticatedCustom,
    requireOrgAdmin,
    requireSuperAdmin,
    syncAgentSettingsFromElevenLabs,
  });
  const httpServer = createServer(app);
  return httpServer;
}
