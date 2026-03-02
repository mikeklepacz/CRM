import type { Express } from "express";
import type { EhubQueueRecipientsRouteDeps } from "./ehubQueueRecipients.types";
import { storage } from "../../storage";

export function registerEhubPausedRecipientsRoute(app: Express, deps: EhubQueueRecipientsRouteDeps): void {
  app.get('/api/ehub/paused-recipients', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const pausedRecipients = await storage.getPausedRecipients(req.user.tenantId);
          res.json(pausedRecipients);
      }
      catch (error: any) {
          console.error('Error fetching paused recipients:', error);
          res.status(500).json({ message: error.message || 'Failed to fetch paused recipients' });
      }
  });
}
