import type { Express } from "express";
import type { EhubQueueRecipientsRouteDeps } from "./ehubQueueRecipients.types";
import { storage } from "../../storage";
import { assignSingleRecipient } from "../../services/Matrix2/slotAssigner";

export function registerEhubRecipientResumeRoute(app: Express, deps: EhubQueueRecipientsRouteDeps): void {
  app.patch('/api/ehub/recipients/:id/resume', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const { id } = req.params;
          const recipient = await storage.resumeRecipient(id, req.user.tenantId);
          await assignSingleRecipient(id);
          res.json(recipient);
      }
      catch (error: any) {
          console.error('Error resuming recipient:', error);
          res.status(500).json({ message: error.message || 'Failed to resume recipient' });
      }
  });
}
