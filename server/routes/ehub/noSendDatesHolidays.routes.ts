import type { Express } from "express";
import { storage } from "../../storage";
import { insertNoSendDateSchema } from "@shared/schema";

export function registerNoSendDatesAndHolidaysRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
  app.get('/api/no-send-dates', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const dates = await storage.getNoSendDates();
      res.json(dates);
    } catch (error: any) {
      console.error('Error fetching no-send dates:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch no-send dates' });
    }
  });

  app.post('/api/no-send-dates', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const validatedData = insertNoSendDateSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const created = await storage.createNoSendDate(validatedData);
      res.status(201).json(created);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        return res.status(409).json({ message: 'This date is already blocked' });
      }
      console.error('Error creating no-send date:', error);
      res.status(500).json({ message: error.message || 'Failed to create no-send date' });
    }
  });

  app.delete('/api/no-send-dates/:id', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      const existing = await storage.getNoSendDate(id);
      if (!existing) {
        return res.status(404).json({ message: 'No-send date not found' });
      }

      await storage.deleteNoSendDate(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting no-send date:', error);
      res.status(500).json({ message: error.message || 'Failed to delete no-send date' });
    }
  });

  app.get('/api/no-send-dates/upcoming', deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { getUpcomingBlockedDays } = await import('../../services/holidayCalendar');
      const blockedDays = await getUpcomingBlockedDays(new Date(), 90);
      res.json(blockedDays);
    } catch (error: any) {
      console.error('Error fetching upcoming blocked days:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch upcoming blocked days' });
    }
  });

  app.get('/api/holidays/toggles', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: 'Tenant ID required' });
      }
      const { getAllHolidaysWithStatus } = await import('../../services/holidayCalendar');
      const holidays = await getAllHolidaysWithStatus(tenantId);
      res.json(holidays);
    } catch (error: any) {
      console.error('Error fetching holiday toggles:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch holiday toggles' });
    }
  });

  app.post('/api/holidays/toggle', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const tenantId = req.user?.tenantId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      if (!tenantId) {
        return res.status(400).json({ message: 'Tenant ID required' });
      }

      const { holidayId, holidayName, ignore } = req.body;
      if (!holidayId || !holidayName || typeof ignore !== 'boolean') {
        return res.status(400).json({ message: 'Missing required fields: holidayId, holidayName, ignore' });
      }

      const { clearIgnoredHolidaysCache } = await import('../../services/holidayCalendar');

      if (ignore) {
        const existing = await storage.getIgnoredHolidayByHolidayId(tenantId, holidayId);
        if (!existing) {
          await storage.createIgnoredHoliday({
            tenantId,
            holidayId,
            holidayName,
            ignoredBy: userId,
          });
        }
      } else {
        await storage.deleteIgnoredHoliday(tenantId, holidayId);
      }

      clearIgnoredHolidaysCache(tenantId);
      res.json({ success: true, holidayId, ignored: ignore });
    } catch (error: any) {
      console.error('Error toggling holiday:', error);
      res.status(500).json({ message: error.message || 'Failed to toggle holiday' });
    }
  });

  app.get('/api/holidays/ignored', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: 'Tenant ID required' });
      }
      const ignored = await storage.getIgnoredHolidays(tenantId);
      res.json(ignored);
    } catch (error: any) {
      console.error('Error fetching ignored holidays:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch ignored holidays' });
    }
  });
}
