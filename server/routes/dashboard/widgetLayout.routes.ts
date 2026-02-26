import type { Express } from "express";
import { storage } from "../../storage";

export function registerWidgetLayoutRoutes(app: Express): void {
  // Get widget layout for the current user
  app.get('/api/widget-layout', async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { dashboardType = 'sales' } = req.query;
      const layout = await storage.getWidgetLayout(userId, dashboardType as string);
      res.json({ layout });
    } catch (error: any) {
      console.error('Error fetching widget layout:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch widget layout' });
    }
  });

  // Save widget layout for the current user
  app.post('/api/widget-layout', async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const layoutData = { ...req.body, userId };
      const layout = await storage.saveWidgetLayout(layoutData);
      res.json({ layout });
    } catch (error: any) {
      console.error('Error saving widget layout:', error);
      res.status(500).json({ message: error.message || 'Failed to save widget layout' });
    }
  });
}
