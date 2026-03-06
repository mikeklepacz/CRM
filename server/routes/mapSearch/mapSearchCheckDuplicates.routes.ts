import type { Express } from "express";
import { findDuplicateWebsites } from "../../services/mapSearch/searchCoreService";
import type { MapSearchCoreDeps } from "./searchCore.types";

export function registerMapSearchCheckDuplicatesRoute(app: Express, deps: MapSearchCoreDeps): void {
  app.post("/api/maps/check-duplicates", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { websites, projectId } = req.body as { websites: string[]; projectId?: string };
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }
      if (!websites || !Array.isArray(websites) || websites.length === 0) {
        return res.json({ duplicates: [] });
      }

      const duplicates = await findDuplicateWebsites(tenantId, websites, projectId);
      res.json({ duplicates });
    } catch (error: any) {
      console.error("Error checking duplicates:", error);
      res.status(500).json({ message: error.message || "Failed to check duplicates" });
    }
  });
}
