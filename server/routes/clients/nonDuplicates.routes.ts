import type { Express } from "express";
import { storage } from "../../storage";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerNonDuplicatesRoutes(app: Express, deps: Deps): void {
  app.post("/api/non-duplicates", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { link1, link2 } = req.body;
      const userId = req.user.id;

      if (!link1 || !link2) {
        return res.status(400).json({ message: "Both link1 and link2 are required" });
      }
      if (link1 === link2) {
        return res.status(400).json({ message: "Cannot mark a store as non-duplicate with itself" });
      }

      await storage.markAsNotDuplicate(link1, link2, userId, req.user.tenantId);

      res.json({ success: true, message: "Store pair marked as not duplicates" });
    } catch (error: any) {
      console.error("Error marking non-duplicates:", error);
      res.status(500).json({ message: error.message || "Failed to mark non-duplicates" });
    }
  });

  app.delete("/api/non-duplicates", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { link1, link2 } = req.body;

      if (!link1 || !link2) {
        return res.status(400).json({ message: "Both link1 and link2 are required" });
      }

      await storage.removeNonDuplicateMark(link1, link2);

      res.json({ success: true, message: "Non-duplicate mark removed" });
    } catch (error: any) {
      console.error("Error removing non-duplicate mark:", error);
      res.status(500).json({ message: error.message || "Failed to remove non-duplicate mark" });
    }
  });

  app.get("/api/non-duplicates", deps.isAuthenticatedCustom, async (_req: any, res) => {
    try {
      const nonDuplicates = await storage.getAllNonDuplicates();
      res.json({ nonDuplicates });
    } catch (error: any) {
      console.error("Error fetching non-duplicates:", error);
      res.status(500).json({ message: error.message || "Failed to fetch non-duplicates" });
    }
  });
}
