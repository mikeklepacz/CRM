import type { Express } from "express";
import type { EhubQueueRecipientsRouteDeps } from "./ehubQueueRecipients.types";
import { storage } from "../../storage";

export function registerEhubRecipientSendNowRoute(app: Express, deps: EhubQueueRecipientsRouteDeps): void {
  app.post('/api/ehub/recipients/:id/send-now', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const { id } = req.params;
          const recipient = await storage.sendRecipientNow(id, req.user.tenantId);
          res.json(recipient);
      }
      catch (error: any) {
          console.error('Error sending email now:', error);
          res.status(500).json({ message: error.message || 'Failed to send email now' });
      }
  });
}
