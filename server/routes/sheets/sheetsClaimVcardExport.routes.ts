import type { Express } from "express";
import { handleSheetsClaimVcardExport } from "./sheetsClaimVcardExport.handler";
import type { SheetsAutoClaimDeps } from "./sheetsAutoClaim.types";

export function registerSheetsClaimVcardExportRoute(app: Express, deps: SheetsAutoClaimDeps): void {
  app.post("/api/stores/claim-vcard-export", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleSheetsClaimVcardExport(req, res, deps);
  });
}
