import type { Express } from "express";
import type { EhubQueueRecipientsRouteDeps } from "./ehubQueueRecipients.types";

export function registerEhubQueueRebuildRoute(app: Express, deps: EhubQueueRecipientsRouteDeps): void {
  app.post('/api/ehub/queue/rebuild', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const userId = req.user?.id;
          if (!userId) {
              return res.status(401).json({ message: 'Unauthorized' });
          }
          const { rebuildQueueFromNextBusinessDay } = await import('../../services/Matrix2/queueRebuilder');
          await rebuildQueueFromNextBusinessDay(userId);
          res.json({ message: 'Queue rebuild completed successfully' });
      }
      catch (error: any) {
          console.error('Error rebuilding queue:', error);
          res.status(500).json({ message: error.message || 'Failed to rebuild queue' });
      }
  });
}
