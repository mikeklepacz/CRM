import type { Express } from "express";
import { eq } from "drizzle-orm";
import { emailBlacklist } from "@shared/schema";
import { db } from "../../db";
import type { EhubBlacklistDeps } from "./ehubBlacklist.types";

export function registerEhubBlacklistCreateRoute(app: Express, deps: EhubBlacklistDeps): void {
  app.post("/api/ehub/blacklist", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { email, reason } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }

      const existing = await db
        .select()
        .from(emailBlacklist)
        .where(eq(emailBlacklist.email, email.toLowerCase().trim()))
        .limit(1);

      if (existing.length > 0) {
        return res.status(409).json({ message: "Email already blacklisted" });
      }

      const [newEntry] = await db
        .insert(emailBlacklist)
        .values({
          email: email.toLowerCase().trim(),
          reason: reason || null,
        } as any)
        .returning();

      res.json(newEntry);
    } catch (error: any) {
      console.error("[API] Error adding to blacklist:", error);
      res.status(500).json({ message: error.message || "Failed to add to blacklist" });
    }
  });
}
