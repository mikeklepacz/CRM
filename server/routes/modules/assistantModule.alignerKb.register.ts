import type { Express } from "express";
import { registerAlignerProposalFlowsRoutes } from "../assistant/alignerProposalFlows.routes";
import { registerAlignerHistoryRoutes } from "../assistant/alignerHistory.routes";
import { registerKbSyncAnalyzeRoutes } from "../assistant/kbSyncAnalyze.routes";
import { registerAssistantsRoutes } from "../assistant/assistants.routes";
import { registerAlignerCoreRoutes } from "../assistant/alignerCore.routes";
import { registerAlignerFilesRoutes } from "../assistant/alignerFiles.routes";
import type { AssistantModuleDeps } from "./assistantModule.types";

export function registerAssistantAlignerKbRoutes(
  app: Express,
  deps: AssistantModuleDeps,
  handlers: {
    handleAlignerChat: any;
    handleAgreeAndCreateProposals: any;
    handleCreateProposalsFromChat: any;
    handleKbSync: any;
    handleKbAnalyzeAndPropose: any;
  }
): void {
  registerAlignerProposalFlowsRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    isAdmin: deps.isAdmin,
    handleAlignerChat: handlers.handleAlignerChat,
    handleAgreeAndCreateProposals: handlers.handleAgreeAndCreateProposals,
    handleCreateProposalsFromChat: handlers.handleCreateProposalsFromChat,
  });
  registerAlignerHistoryRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom, isAdmin: deps.isAdmin });

  registerKbSyncAnalyzeRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    isAdmin: deps.isAdmin,
    handleKbSync: handlers.handleKbSync,
    handleKbAnalyzeAndPropose: handlers.handleKbAnalyzeAndPropose,
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
}
