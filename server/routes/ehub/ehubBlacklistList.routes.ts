import type { Express } from "express";
import { desc } from "drizzle-orm";
import { emailBlacklist } from "@shared/schema";
import { db } from "../../db";
import type { EhubBlacklistDeps } from "./ehubBlacklist.types";

export function registerEhubBlacklistListRoute(app: Express, deps: EhubBlacklistDeps): void {
  app.get("/api/ehub/blacklist", deps.isAuthenticatedCustom, deps.isAdmin, async (_req: any, res) => {
    try {
      const blacklist = await db
        .select()
        .from(emailBlacklist)
        .orderBy(desc(emailBlacklist.createdAt));

      res.json(blacklist);
    } catch (error: any) {
      console.error("[API] Error fetching blacklist:", error);
      res.status(500).json({ message: error.message || "Failed to fetch blacklist" });
    }
  });
}
