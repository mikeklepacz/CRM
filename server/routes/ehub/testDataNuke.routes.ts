import type { Express } from "express";
import type { TestEmailRouteDeps } from "./testEmail.types";
import { storage } from "../../storage";

export function registerTestDataNukeRoute(app: Express, deps: TestEmailRouteDeps): void {
  app.post('/api/ehub/test-data/nuke', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const userId = req.user?.id;
          if (!userId) {
              return res.status(401).json({ message: 'Unauthorized' });
          }
          const { emailPattern } = req.body;
          const result = await storage.nukeTestData(userId, req.user.tenantId, emailPattern);
          res.json({
              success: true,
              message: 'Test data deleted successfully',
              ...result,
          });
      }
      catch (error: any) {
          console.error('Error nuking test data:', error);
          res.status(500).json({ message: error.message || 'Failed to delete test data' });
      }
  });
}
