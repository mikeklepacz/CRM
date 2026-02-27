import type { Express } from "express";
import type { TestEmailRouteDeps } from "./testEmail.types";
import { storage } from "../../storage";

export function registerTestDataNukeCountsRoute(app: Express, deps: TestEmailRouteDeps): void {
  app.get('/api/ehub/test-data/nuke/counts', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const emailPattern = req.query.emailPattern as string | undefined;
          const counts = await storage.getTestDataNukeCounts(emailPattern);
          res.json(counts);
      }
      catch (error: any) {
          console.error('Error getting nuke counts:', error);
          res.status(500).json({ message: error.message || 'Failed to get nuke counts' });
      }
  });
}
