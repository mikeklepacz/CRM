import type { Express } from "express";
import type { SheetsContactActionDeps } from "./sheetsContactAction.types";
import { handleSheetsClaimStoreWithContact } from "./sheetsClaimStoreWithContact.handler";

export function registerSheetsClaimStoreWithContactRoute(app: Express, deps: SheetsContactActionDeps): void {
  app.post("/api/sheets/:id/claim-store-with-contact", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleSheetsClaimStoreWithContact(req, res, deps);
  });
}
