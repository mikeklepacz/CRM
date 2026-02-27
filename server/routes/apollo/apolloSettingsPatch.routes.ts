import type { Express } from "express";
import type { ApolloCoreRouteDeps } from "./apolloCore.types";
import * as apolloService from "../../services/apolloService";

export function registerApolloSettingsPatchRoute(app: Express, deps: ApolloCoreRouteDeps): void {
  app.patch("/api/apollo/settings", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const tenantId = await deps.getEffectiveTenantId(req);
          if (!tenantId) {
              return res.status(400).json({ message: "No tenant associated with user" });
          }
          const { targetTitles, targetSeniorities, maxContactsPerCompany, autoEnrichOnAdd } = req.body;
          const updated = await apolloService.updateSettings(tenantId, {
              targetTitles,
              targetSeniorities,
              maxContactsPerCompany,
              autoEnrichOnAdd,
          });
          res.json(updated);
      }
      catch (error: any) {
          console.error("Error updating Apollo settings:", error);
          res.status(500).json({ message: error.message || "Failed to update Apollo settings" });
      }
  });
}
