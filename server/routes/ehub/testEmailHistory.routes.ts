import type { Express } from "express";
import type { TestEmailRouteDeps } from "./testEmail.types";
import { storage } from "../../storage";

export function registerTestEmailHistoryRoute(app: Express, deps: TestEmailRouteDeps): void {
  app.get('/api/test-email/history', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const userId = req.user?.id;
          if (!userId) {
              return res.status(401).json({ message: 'Unauthorized' });
          }
          const history = await storage.listTestEmailSendsForUser(userId);
          res.json(history);
      }
      catch (error: any) {
          console.error('Error getting test email history:', error);
          res.status(500).json({ message: error.message || 'Failed to get test email history' });
      }
  });
}
