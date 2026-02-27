import type { Express } from "express";
import type { ApolloCoreRouteDeps } from "./apolloCore.types";
import * as apolloService from "../../services/apolloService";

export function registerApolloContactsByLinkRoute(app: Express, deps: ApolloCoreRouteDeps): void {
  app.get("/api/apollo/contacts/by-link", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const tenantId = await deps.getEffectiveTenantId(req);
          if (!tenantId) {
              return res.status(400).json({ message: "No tenant associated with user" });
          }
          const { link } = req.query;
          if (!link || typeof link !== "string") {
              return res.status(400).json({ message: "link query parameter is required" });
          }
          const contacts = await apolloService.getContactsByLink(tenantId, link);
          res.json(contacts);
      }
      catch (error: any) {
          console.error("Error getting contacts by link:", error);
          res.status(500).json({ message: error.message || "Failed to get contacts by link" });
      }
  });
}
