import type { Express } from "express";
import { getStoreByLink } from "../../services/clients/storeByLinkService";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerStoreByLinkRoutes(app: Express, deps: Deps): void {
  app.get("/api/stores/by-link", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { link, projectId, sheetId } = req.query;
      if (!link) {
        return res.status(400).json({ error: "Link parameter is required" });
      }

      const payload = await getStoreByLink({
        link: String(link),
        tenantId: req.user.tenantId,
        projectId: typeof projectId === "string" ? projectId : undefined,
        sheetId: typeof sheetId === "string" ? sheetId : undefined,
      });

      res.json(payload);
    } catch (error: any) {
      if (error.message === "Store Database sheet not configured") {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "No data found in Store Database") {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "Link column not found in Store Database") {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "Store not found") {
        return res.status(404).json({ error: error.message });
      }
      console.error("Error fetching store by link:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
}
