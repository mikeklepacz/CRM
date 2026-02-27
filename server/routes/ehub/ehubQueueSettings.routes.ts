import type { Express } from "express";
import type { EhubQueueRecipientsRouteDeps } from "./ehubQueueRecipients.types";
import { storage } from "../../storage";

export function registerEhubQueueSettingsRoute(app: Express, deps: EhubQueueRecipientsRouteDeps): void {
  app.get('/api/ehub/settings', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const settings = await storage.getEhubSettings(req.user.tenantId);
          if (!settings) {
              return res.json({
                  minDelayMinutes: 1,
                  maxDelayMinutes: 3,
                  dailyEmailLimit: 200,
                  sendingHoursStart: 9,
                  sendingHoursEnd: 14,
                  clientWindowStartOffset: 1.00,
                  clientWindowEndHour: 14,
                  promptInjection: '',
                  keywordBin: '',
                  excludedDays: [],
              });
          }
          res.json(settings);
      }
      catch (error: any) {
          console.error('Error fetching E-Hub settings:', error);
          res.status(500).json({ message: error.message || 'Failed to fetch settings' });
      }
  });
}
