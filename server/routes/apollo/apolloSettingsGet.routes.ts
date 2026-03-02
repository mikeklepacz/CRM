import type { Express } from "express";
import type { ApolloCoreRouteDeps } from "./apolloCore.types";
import * as apolloService from "../../services/apolloService";

export function registerApolloSettingsGetRoute(app: Express, deps: ApolloCoreRouteDeps): void {
  app.get("/api/apollo/settings", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const tenantId = await deps.getEffectiveTenantId(req);
          if (!tenantId) {
              return res.status(400).json({ message: "No tenant associated with user" });
          }
          const settings = await apolloService.getOrCreateSettings(tenantId);
          res.json(settings);
      }
      catch (error: any) {
          console.error("Error getting Apollo settings:", error);
          res.status(500).json({ message: error.message || "Failed to get Apollo settings" });
      }
  });
}
