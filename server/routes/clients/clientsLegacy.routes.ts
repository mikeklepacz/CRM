import type { Express } from "express";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
  getCurrentUser: any;
  handleGetClients: any;
  handleGetMyClients: any;
  handleFilteredClients: any;
  handleClaimClient: any;
  handleUnclaimClient: any;
  handleGetClientNotes: any;
  handleCreateClientNote: any;
  handleCrawlClientEmails: any;
};

export function registerClientsLegacyRoutes(app: Express, deps: Deps): void {
  app.get("/api/clients", deps.isAuthenticatedCustom, deps.isAdmin, deps.handleGetClients);
  app.get("/api/clients/my", deps.isAuthenticatedCustom, deps.getCurrentUser, deps.handleGetMyClients);
  app.post(
    "/api/clients/filtered",
    deps.isAuthenticatedCustom,
    deps.getCurrentUser,
    deps.handleFilteredClients
  );
  app.post("/api/clients/:id/claim", deps.isAuthenticatedCustom, deps.getCurrentUser, deps.handleClaimClient);
  app.post("/api/clients/:id/unclaim", deps.isAuthenticatedCustom, deps.isAdmin, deps.handleUnclaimClient);
  app.get("/api/clients/:id/notes", deps.isAuthenticatedCustom, deps.handleGetClientNotes);
  app.post(
    "/api/clients/:id/notes",
    deps.isAuthenticatedCustom,
    deps.getCurrentUser,
    deps.handleCreateClientNote
  );
  app.post("/api/clients/crawl-emails", deps.isAuthenticatedCustom, deps.handleCrawlClientEmails);
}
