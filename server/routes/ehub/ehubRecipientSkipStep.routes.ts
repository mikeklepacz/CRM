import type { Express } from "express";
import type { EhubQueueRecipientsRouteDeps } from "./ehubQueueRecipients.types";
import { db } from "../../db";
import { storage } from "../../storage";
import { and, eq, sql } from "drizzle-orm";
import { dailySendSlots } from "@shared/schema";

export function registerEhubRecipientSkipStepRoute(app: Express, deps: EhubQueueRecipientsRouteDeps): void {
  app.patch('/api/ehub/recipients/:id/skip-step', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const { id } = req.params;
          const recipient = await storage.skipRecipientStep(id, req.user.tenantId);
          await db
              .delete(dailySendSlots)
              .where(and(eq(dailySendSlots.recipientId, id), eq(dailySendSlots.tenantId, req.user.tenantId)));
          res.json(recipient);
      }
      catch (error: any) {
          console.error('Error skipping recipient step:', error);
          res.status(500).json({ message: error.message || 'Failed to skip step' });
      }
  });
}
