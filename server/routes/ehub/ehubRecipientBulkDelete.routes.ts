import type { Express } from "express";
import type { EhubQueueRecipientsRouteDeps } from "./ehubQueueRecipients.types";
import { storage } from "../../storage";

export function registerEhubRecipientBulkDeleteRoute(app: Express, deps: EhubQueueRecipientsRouteDeps): void {
  app.post('/api/ehub/recipients/bulk-delete', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const { recipientIds } = req.body;
          if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
              return res.status(400).json({ message: 'No recipients to delete' });
          }
          const { clearSlotsForRecipient } = await import('../../services/Matrix2/slotDb');
          const { invalidateCache } = await import('../../services/ehubContactsService');
          const results = [];
          for (const recipientId of recipientIds) {
              try {
                  await storage.removeRecipient(recipientId, req.user.tenantId);
                  await clearSlotsForRecipient(recipientId);
                  results.push({ id: recipientId, success: true });
              }
              catch (err) {
                  console.error(`Failed to remove recipient ${recipientId}:`, err);
                  results.push({ id: recipientId, success: false, error: (err as any).message });
              }
          }
          invalidateCache();
          res.json({
              deleted: results.filter(r => r.success).length,
              failed: results.filter(r => !r.success).length,
              results,
          });
      }
      catch (error: any) {
          console.error('Error in bulk recipient delete:', error);
          res.status(500).json({ message: error.message || 'Failed to delete recipients' });
      }
  });
}
