import type { Express } from "express";
import { registerClientsLegacyRoutes } from "../clients/clientsLegacy.routes";
import { createGetMyClientsHandler } from "../../services/clients/getMyClients.handler";
import {
  createGetClientsHandler,
  createClaimClientHandler,
  createCreateClientNoteHandler,
  createCrawlClientEmailsHandler,
  createFilteredClientsHandler,
  createGetClientNotesHandler,
  createUnclaimClientHandler,
} from "../../services/clients/clientsLegacyHandlers.service";

type Deps = {
  clearUserCache: any;
  computeHash: any;
  crawlWebsiteForEmail: any;
  eventGateway: any;
  getCached: any;
  getCurrentUser: any;
  googleSheets: any;
  isAdmin: any;
  isAuthenticatedCustom: any;
  normalizeLink: any;
  setCache: any;
  storage: any;
};

export function registerClientsModuleRoutes(app: Express, deps: Deps): void {
  const handleGetClients = createGetClientsHandler(deps.storage);
  const handleGetMyClients = createGetMyClientsHandler({
    computeHash: deps.computeHash,
    eventGateway: deps.eventGateway,
    getCached: deps.getCached,
    googleSheets: deps.googleSheets,
    normalizeLink: deps.normalizeLink,
    setCache: deps.setCache,
    storage: deps.storage,
  });
  const handleFilteredClients = createFilteredClientsHandler(deps.storage);
  const handleClaimClient = createClaimClientHandler(deps.storage);
  const handleUnclaimClient = createUnclaimClientHandler(deps.storage);
  const handleGetClientNotes = createGetClientNotesHandler(deps.storage);
  const handleCreateClientNote = createCreateClientNoteHandler(deps.storage);
  const handleCrawlClientEmails = createCrawlClientEmailsHandler({
    clearUserCache: deps.clearUserCache,
    crawlWebsiteForEmail: deps.crawlWebsiteForEmail,
    googleSheets: deps.googleSheets,
    storage: deps.storage,
  });

  registerClientsLegacyRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    getCurrentUser: deps.getCurrentUser,
    handleClaimClient,
    handleCreateClientNote,
    handleCrawlClientEmails,
    handleFilteredClients,
    handleGetClientNotes,
    handleGetClients,
    handleGetMyClients,
    handleUnclaimClient,
  });
}
