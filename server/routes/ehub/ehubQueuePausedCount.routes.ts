import type { Express } from "express";
import type { EhubQueueRecipientsRouteDeps } from "./ehubQueueRecipients.types";
import { storage } from "../../storage";

export function registerEhubQueuePausedCountRoute(app: Express, deps: EhubQueueRecipientsRouteDeps): void {
  app.get('/api/ehub/queue/paused-count', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const count = await storage.getPausedRecipientsCount(req.user.tenantId);
          res.json({ count });
      }
      catch (error: any) {
          console.error('Error fetching paused count:', error);
          res.status(500).json({ message: error.message || 'Failed to fetch paused count' });
      }
  });
}
