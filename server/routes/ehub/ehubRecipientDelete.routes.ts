import type { Express } from "express";
import type { EhubQueueRecipientsRouteDeps } from "./ehubQueueRecipients.types";
import { storage } from "../../storage";

export function registerEhubRecipientDeleteRoute(app: Express, deps: EhubQueueRecipientsRouteDeps): void {
  app.delete('/api/ehub/recipients/:id', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const { id } = req.params;
          const recipient = await storage.removeRecipient(id, req.user.tenantId);
          const { clearSlotsForRecipient } = await import('../../services/Matrix2/slotDb');
          await clearSlotsForRecipient(id);
          const { invalidateCache } = await import('../../services/ehubContactsService');
          invalidateCache();
          res.json(recipient);
      }
      catch (error: any) {
          console.error('Error removing recipient:', error);
          res.status(500).json({ message: error.message || 'Failed to remove recipient' });
      }
  });
}
