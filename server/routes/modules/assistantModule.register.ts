import type { Express } from "express";
import { createOpenaiChatHandler } from "../../services/assistant/openaiChat.handler";
import {
  createAgreeAndCreateProposalsHandler,
  createCreateProposalsFromChatHandler,
} from "../../services/assistant/alignerProposalFlowHandlers.service";
import { createAlignerChatHandler } from "../../services/assistant/alignerChat.handler";
import { createKbAnalyzeAndProposeHandler } from "../../services/assistant/kbAnalyzeAndPropose.handler";
import { createKbSyncHandler } from "../../services/assistant/kbSync.handler";
import { createKbSyncOps } from "../../services/assistant/kbSyncOps.service";
import { findKbFileByFuzzyFilename } from "../../services/assistant/kbFileMatcher.service";
import { registerAssistantAlignerKbRoutes } from "./assistantModule.alignerKb.register";
import { registerAssistantOpenaiKbRoutes } from "./assistantModule.openaiKb.register";
import { registerAssistantChatRoutes } from "./assistantModule.chat.register";
import type { AssistantModuleDeps as Deps } from "./assistantModule.types";

export function registerAssistantModuleRoutesImpl(app: Express, deps: Deps): void {
  const handleAlignerChat = createAlignerChatHandler(deps.storage);
  const handleAgreeAndCreateProposals = createAgreeAndCreateProposalsHandler({
    findKbFileByFuzzyFilename,
    storage: deps.storage,
  });
  const handleCreateProposalsFromChat = createCreateProposalsFromChatHandler({
    findKbFileByFuzzyFilename,
    storage: deps.storage,
  });

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

  registerAssistantAlignerKbRoutes(app, deps, {
    handleAlignerChat,
    handleAgreeAndCreateProposals,
    handleCreateProposalsFromChat,
    handleKbSync,
    handleKbAnalyzeAndPropose,
  });

  registerAssistantOpenaiKbRoutes(app, deps, syncKbDocumentToElevenLabs);

  const handleOpenaiChat = createOpenaiChatHandler(deps.storage);
  registerAssistantChatRoutes(app, deps, handleOpenaiChat);
}
