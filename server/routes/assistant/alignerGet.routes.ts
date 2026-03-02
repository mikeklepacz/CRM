import type { Express } from "express";
import { storage } from "../../storage";
import type { AlignerCoreDeps } from "./alignerCore.types";

export function registerAlignerGetRoute(app: Express, deps: AlignerCoreDeps): void {
  app.get("/api/aligner", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      console.log(
        "[Aligner] GET /api/aligner - tenantId:",
        tenantId,
        "sessionOverride:",
        req.session?.tenantOverrideId,
        "userTenantId:",
        req.user?.tenantId
      );
      const assistant = await storage.getAssistantBySlug("aligner", tenantId);
      console.log("[Aligner] Found assistant:", assistant ? assistant.id : "null");

      if (!assistant) {
        return res.status(404).json({ error: "Aligner assistant not found for this organization" });
      }

      const files = await storage.getAssistantFiles(assistant.id);
      res.json({
        assistant: {
          ...assistant,
          files,
        },
      });
    } catch (error: any) {
      console.error("[Aligner] Error fetching Aligner:", error);
      res.status(500).json({ error: error.message || "Failed to fetch Aligner" });
    }
  });
}
