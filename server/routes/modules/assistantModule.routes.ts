import type { Express } from "express";
import { registerOpenaiSettingsRoutes } from "../assistant/openaiSettings.routes";
import { registerConversationsRoutes } from "../assistant/conversations.routes";
import { registerOpenaiChatHistoryRoutes } from "../assistant/openaiChatHistory.routes";
import { registerOpenaiFilesReadRoutes } from "../assistant/openaiFilesRead.routes";
import { registerOpenaiFilesUploadRoutes } from "../assistant/openaiFilesUpload.routes";
import { registerOpenaiFilesMutationsRoutes } from "../assistant/openaiFilesMutations.routes";
import { registerOpenaiChatRoutes } from "../assistant/openaiChat.routes";
import { createOpenaiChatHandler } from "../../services/assistant/openaiChat.handler";
import { registerAssistantsRoutes } from "../assistant/assistants.routes";
import { registerAlignerProposalFlowsRoutes } from "../assistant/alignerProposalFlows.routes";
import {
  createAgreeAndCreateProposalsHandler,
  createCreateProposalsFromChatHandler,
} from "../../services/assistant/alignerProposalFlowHandlers.service";
import { createAlignerChatHandler } from "../../services/assistant/alignerChat.handler";
import { registerKbManagementRoutes } from "../assistant/kbManagement.routes";
import { registerKbProposalMutationsRoutes } from "../assistant/kbProposalMutations.routes";
import { registerKbRollbackRoutes } from "../assistant/kbRollback.routes";
import { registerKbProposalApprovalRoutes } from "../assistant/kbProposalApproval.routes";
import { registerKbBatchUploadRoutes } from "../assistant/kbBatchUpload.routes";
import { registerKbSyncAnalyzeRoutes } from "../assistant/kbSyncAnalyze.routes";
import { createKbAnalyzeAndProposeHandler } from "../../services/assistant/kbAnalyzeAndPropose.handler";
import { createKbSyncHandler } from "../../services/assistant/kbSync.handler";
import { createKbSyncOps } from "../../services/assistant/kbSyncOps.service";
import { findKbFileByFuzzyFilename } from "../../services/assistant/kbFileMatcher.service";
import { registerAlignerCoreRoutes } from "../assistant/alignerCore.routes";
import { registerAlignerFilesRoutes } from "../assistant/alignerFiles.routes";
import { registerAlignerHistoryRoutes } from "../assistant/alignerHistory.routes";

type Deps = {
  addCallsToThreadInMicroBatches: any;
  checkAdminAccess: any;
  db: any;
  eq: any;
  getEffectiveTenantId: any;
  googleDrive: any;
  isAdmin: any;
  isAuthenticated: any;
  isAuthenticatedCustom: any;
  kbFiles: any;
  sql: any;
  storage: any;
  syncKbFileToAlignerVectorStore: any;
};

export function registerAssistantModuleRoutes(app: Express, deps: Deps): void {
  const handleAlignerChat = createAlignerChatHandler(deps.storage);
  const handleAgreeAndCreateProposals = createAgreeAndCreateProposalsHandler({
    findKbFileByFuzzyFilename,
    storage: deps.storage,
  });
  const handleCreateProposalsFromChat = createCreateProposalsFromChatHandler({
    findKbFileByFuzzyFilename,
    storage: deps.storage,
  });

  registerAlignerProposalFlowsRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    isAdmin: deps.isAdmin,
    handleAlignerChat,
    handleAgreeAndCreateProposals,
    handleCreateProposalsFromChat,
  });
  registerAlignerHistoryRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom, isAdmin: deps.isAdmin });

  const { syncKbDocumentToElevenLabs } = createKbSyncOps(deps.storage);
  const handleKbSync = createKbSyncHandler({
    db: deps.db,
    eq: deps.eq,
    googleDrive: deps.googleDrive,
    kbFiles: deps.kbFiles,
    sql: deps.sql,
    storage: deps.storage,
    syncKbDocumentToElevenLabs,
  });
  const handleKbAnalyzeAndPropose = createKbAnalyzeAndProposeHandler({
    addCallsToThreadInMicroBatches: deps.addCallsToThreadInMicroBatches,
    findKbFileByFuzzyFilename,
    storage: deps.storage,
  });

  registerKbSyncAnalyzeRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    isAdmin: deps.isAdmin,
    handleKbSync,
    handleKbAnalyzeAndPropose,
  });

  registerAssistantsRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom, isAdmin: deps.isAdmin });
  registerAlignerCoreRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    isAdmin: deps.isAdmin,
    getEffectiveTenantId: deps.getEffectiveTenantId,
  });
  registerAlignerFilesRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    isAdmin: deps.isAdmin,
    getEffectiveTenantId: deps.getEffectiveTenantId,
  });

  registerOpenaiSettingsRoutes(app, { isAuthenticated: deps.isAuthenticated, checkAdminAccess: deps.checkAdminAccess });
  registerOpenaiChatHistoryRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerOpenaiFilesReadRoutes(app, { isAuthenticated: deps.isAuthenticated });
  registerOpenaiFilesUploadRoutes(app, {
    isAuthenticated: deps.isAuthenticated,
    checkAdminAccess: deps.checkAdminAccess,
  });
  registerOpenaiFilesMutationsRoutes(app, {
    isAuthenticated: deps.isAuthenticated,
    checkAdminAccess: deps.checkAdminAccess,
  });
  registerKbManagementRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    isAdmin: deps.isAdmin,
    syncKbDocumentToElevenLabs,
    syncKbFileToAlignerVectorStore: deps.syncKbFileToAlignerVectorStore,
  });
  registerKbProposalMutationsRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom, isAdmin: deps.isAdmin });
  registerKbProposalApprovalRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    isAdmin: deps.isAdmin,
    syncKbDocumentToElevenLabs,
    syncKbFileToAlignerVectorStore: deps.syncKbFileToAlignerVectorStore,
  });
  registerKbBatchUploadRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom, isAdmin: deps.isAdmin });
  registerKbRollbackRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    isAdmin: deps.isAdmin,
    syncKbFileToAlignerVectorStore: deps.syncKbFileToAlignerVectorStore,
  });

  const handleOpenaiChat = createOpenaiChatHandler(deps.storage);
  registerOpenaiChatRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom, handleOpenaiChat });
  registerConversationsRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
}
