import type { Express } from "express";
import { ParseMatchError, parseAndMatchStores } from "../../services/clients/storeParseMatch/service";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerStoreParseMatchRoutes(app: Express, deps: Deps): void {
  app.post("/api/stores/parse-and-match", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { rawText, sheetId } = req.body;

      if (!rawText || !rawText.trim()) {
        return res.status(400).json({ message: "Text to parse is required" });
      }

      if (!sheetId) {
        return res.status(400).json({ message: "Sheet ID is required" });
      }

      const result = await parseAndMatchStores(rawText, sheetId, req.user.tenantId);
      res.json(result);
    } catch (error: any) {
      if (error instanceof ParseMatchError) {
        return res.status(error.status).json({ message: error.message });
      }

      console.error("Error parsing and matching stores:", error);
      res.status(500).json({ message: error.message || "Failed to parse and match stores" });
    }
  });
}
