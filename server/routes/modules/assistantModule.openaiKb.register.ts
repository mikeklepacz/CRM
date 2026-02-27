import type { Express } from "express";
import { registerOpenaiSettingsRoutes } from "../assistant/openaiSettings.routes";
import { registerOpenaiChatHistoryRoutes } from "../assistant/openaiChatHistory.routes";
import { registerOpenaiFilesReadRoutes } from "../assistant/openaiFilesRead.routes";
import { registerOpenaiFilesUploadRoutes } from "../assistant/openaiFilesUpload.routes";
import { registerOpenaiFilesMutationsRoutes } from "../assistant/openaiFilesMutations.routes";
import { registerKbManagementRoutes } from "../assistant/kbManagement.routes";
import { registerKbProposalMutationsRoutes } from "../assistant/kbProposalMutations.routes";
import { registerKbProposalApprovalRoutes } from "../assistant/kbProposalApproval.routes";
import { registerKbBatchUploadRoutes } from "../assistant/kbBatchUpload.routes";
import { registerKbRollbackRoutes } from "../assistant/kbRollback.routes";
import type { AssistantModuleDeps } from "./assistantModule.types";

export function registerAssistantOpenaiKbRoutes(
  app: Express,
  deps: AssistantModuleDeps,
  syncKbDocumentToElevenLabs: any
): void {
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
}
