import type { Express } from "express";
import { eq } from "drizzle-orm";
import { emailBlacklist } from "@shared/schema";
import { db } from "../../db";
import type { EhubBlacklistDeps } from "./ehubBlacklist.types";

export function registerEhubBlacklistDeleteRoute(app: Express, deps: EhubBlacklistDeps): void {
  app.delete("/api/ehub/blacklist/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      const deleted = await db
        .delete(emailBlacklist)
        .where(eq(emailBlacklist.id, id))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({ message: "Blacklist entry not found" });
      }

      res.json({ success: true, deleted: deleted[0] });
    } catch (error: any) {
      console.error("[API] Error removing from blacklist:", error);
      res.status(500).json({ message: error.message || "Failed to remove from blacklist" });
    }
  });
}
