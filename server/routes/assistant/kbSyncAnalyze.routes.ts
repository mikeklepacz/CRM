import type { Express } from "express";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
  handleKbSync: (req: any, res: any) => Promise<void>;
  handleKbAnalyzeAndPropose: (req: any, res: any) => Promise<void>;
};

export function registerKbSyncAnalyzeRoutes(app: Express, deps: Deps): void {
  app.post("/api/kb/sync", deps.isAuthenticatedCustom, deps.isAdmin, deps.handleKbSync);
  app.post("/api/kb/analyze-and-propose", deps.isAuthenticatedCustom, deps.isAdmin, deps.handleKbAnalyzeAndPropose);
}
