import type { Express } from "express";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
  handleAlignerChat: (req: any, res: any) => Promise<void>;
  handleAgreeAndCreateProposals: (req: any, res: any) => Promise<void>;
  handleCreateProposalsFromChat: (req: any, res: any) => Promise<void>;
};

export function registerAlignerProposalFlowsRoutes(app: Express, deps: Deps): void {
  app.post("/api/aligner/chat", deps.isAuthenticatedCustom, deps.isAdmin, deps.handleAlignerChat);
  app.post(
    "/api/aligner/agree-and-create-proposals",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    deps.handleAgreeAndCreateProposals
  );
  app.post(
    "/api/aligner/create-proposals-from-chat",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    deps.handleCreateProposalsFromChat
  );
}
