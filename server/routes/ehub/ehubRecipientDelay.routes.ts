import type { Express } from "express";
import type { EhubQueueRecipientsRouteDeps } from "./ehubQueueRecipients.types";
import { storage } from "../../storage";

export function registerEhubRecipientDelayRoute(app: Express, deps: EhubQueueRecipientsRouteDeps): void {
  app.patch('/api/ehub/recipients/:id/delay', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const { id } = req.params;
          const { hours } = req.body;
          if (typeof hours !== 'number' || hours <= 0) {
              return res.status(400).json({ message: 'Invalid hours value' });
          }
          const recipient = await storage.delayRecipient(id, hours, req.user.tenantId);
          res.json(recipient);
      }
      catch (error: any) {
          console.error('Error delaying recipient:', error);
          res.status(500).json({ message: error.message || 'Failed to delay send' });
      }
  });
}
