import type { Express } from "express";
import type { EhubQueueRecipientsRouteDeps } from "./ehubQueueRecipients.types";
import { ensureDailySlots } from "../../services/Matrix2/slotGenerator";

export function registerEhubQueueGenerateRoute(app: Express, deps: EhubQueueRecipientsRouteDeps): void {
  app.post('/api/ehub/queue/generate', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          await ensureDailySlots();
          res.json({ message: 'Queue generation completed successfully' });
      }
      catch (error: any) {
          console.error('Error generating queue:', error);
          res.status(500).json({ message: error.message || 'Failed to generate queue' });
      }
  });
}
