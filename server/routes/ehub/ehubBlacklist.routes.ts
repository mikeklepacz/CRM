import type { Express } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { emailBlacklist } from "@shared/schema";

export function registerEhubBlacklistRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
  app.get('/api/ehub/blacklist', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const blacklist = await db
        .select()
        .from(emailBlacklist)
        .orderBy(desc(emailBlacklist.createdAt));

      res.json(blacklist);
    } catch (error: any) {
      console.error('[API] Error fetching blacklist:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch blacklist' });
    }
  });

  app.post('/api/ehub/blacklist', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { email, reason } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email address is required' });
      }

      const existing = await db
        .select()
        .from(emailBlacklist)
        .where(eq(emailBlacklist.email, email.toLowerCase().trim()))
        .limit(1);

      if (existing.length > 0) {
        return res.status(409).json({ message: 'Email already blacklisted' });
      }

      const [newEntry] = await db
        .insert(emailBlacklist)
        .values({
          email: email.toLowerCase().trim(),
          reason: reason || null,
        })
        .returning();

      res.json(newEntry);
    } catch (error: any) {
      console.error('[API] Error adding to blacklist:', error);
      res.status(500).json({ message: error.message || 'Failed to add to blacklist' });
    }
  });

  app.delete('/api/ehub/blacklist/:id', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      const deleted = await db
        .delete(emailBlacklist)
        .where(eq(emailBlacklist.id, id))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({ message: 'Blacklist entry not found' });
      }

      res.json({ success: true, deleted: deleted[0] });
    } catch (error: any) {
      console.error('[API] Error removing from blacklist:', error);
      res.status(500).json({ message: error.message || 'Failed to remove from blacklist' });
    }
  });
}
