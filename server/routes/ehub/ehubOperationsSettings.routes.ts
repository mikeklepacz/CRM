import type { Express } from "express";
import type { EhubOperationsRouteDeps } from "./ehubOperations.types";
import { storage } from "../../storage";
import { updateEhubSettingsSchema } from "@shared/schema";

export function registerEhubOperationsSettingsRoute(app: Express, deps: EhubOperationsRouteDeps): void {
  app.patch('/api/ehub/settings', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const userId = req.user?.id;
          if (!userId) {
              return res.status(401).json({ message: 'Unauthorized' });
          }
          const oldSettings: any = await storage.getEhubSettings(req.user.tenantId);
          const updates = updateEhubSettingsSchema.parse({
              ...req.body,
              updatedBy: userId,
          });
          const newSettings: any = await storage.updateEhubSettings(req.user.tenantId, updates);
          const schedulingSettingsChanged = oldSettings && (oldSettings.sendingHoursStart !== newSettings.sendingHoursStart ||
              oldSettings.sendingHoursEnd !== newSettings.sendingHoursEnd ||
              oldSettings.dailyEmailLimit !== newSettings.dailyEmailLimit ||
              oldSettings.minDelayMinutes !== newSettings.minDelayMinutes ||
              oldSettings.maxDelayMinutes !== newSettings.maxDelayMinutes ||
              oldSettings.clientStartOffsetHours !== newSettings.clientStartOffsetHours ||
              oldSettings.clientCutoffHour !== newSettings.clientCutoffHour ||
              JSON.stringify(oldSettings.excludedDays) !== JSON.stringify(newSettings.excludedDays));
          if (schedulingSettingsChanged) {
              console.log('[EHub Settings] ⚡ Scheduling settings changed - triggering queue rebuild from next business day');
              const { rebuildQueueFromNextBusinessDay } = await import('../../services/Matrix2/queueRebuilder');
              rebuildQueueFromNextBusinessDay(userId).catch(err => {
                  console.error('[EHub Settings] ❌ Queue rebuild failed:', err);
              });
          }
          else {
              console.log('[EHub Settings] Content settings updated (no queue rebuild needed)');
          }
          res.json(newSettings);
      }
      catch (error: any) {
          if (error.name === 'ZodError') {
              return res.status(400).json({ message: 'Invalid settings data', errors: error.errors });
          }
          console.error('Error updating E-Hub settings:', error);
          res.status(500).json({ message: error.message || 'Failed to update settings' });
      }
  });
}
