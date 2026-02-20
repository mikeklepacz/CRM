import type { Express } from "express";
import { db } from "../../db";
import { storage } from "../../storage";
import { eq, sql } from "drizzle-orm";
import { dailySendSlots } from "@shared/schema";
import { ensureDailySlots } from "../../services/Matrix2/slotGenerator";
import { assignSingleRecipient } from "../../services/Matrix2/slotAssigner";
import { getNextEligibleDateIsos } from "../../services/Matrix2/eligibleDays";
import { resolveTenantTimezone } from "../../services/tenantTimezone";

export function registerEhubQueueRecipientsRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
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
    } catch (error: any) {
      console.error('Error fetching E-Hub settings:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch settings' });
    }
  });

  app.get('/api/ehub/queue', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const timeWindowDays = parseInt(req.query.timeWindowDays as string) || 3;
      const now = new Date();
      const settings = await storage.getEhubSettings(req.user.tenantId);
      const adminTz = await resolveTenantTimezone(req.user.tenantId, { adminUserId: req.user?.id });
      const eligibleDateIsos = await getNextEligibleDateIsos(now, timeWindowDays, adminTz, {
        excludedDays: settings?.excludedDays || [],
        tenantId: req.user.tenantId,
        maxLookaheadDays: 60,
      });

      if (eligibleDateIsos.length === 0) {
        return res.json([]);
      }

      const result = await db.execute(sql`
        SELECT 
          dss.id,
          dss.slot_time_utc,
          dss.slot_date,
          dss.filled,
          dss.sent,
          dss.recipient_id,
          dss.email_account_id,
          sr.email as recipient_email,
          sr.current_step,
          sr.sequence_id,
          s.name as sequence_name,
          ea.email as sender_email
        FROM daily_send_slots dss
        LEFT JOIN sequence_recipients sr ON sr.id = dss.recipient_id::varchar
        LEFT JOIN sequences s ON sr.sequence_id = s.id
        LEFT JOIN email_accounts ea ON dss.email_account_id = ea.id
        WHERE dss.slot_time_utc >= ${now.toISOString()}
        ORDER BY dss.slot_time_utc ASC
        LIMIT 500
      `);

      const rows = (result as any).rows || [];
      const eligibleDateSet = new Set(eligibleDateIsos);
      const filteredRows = rows.filter((row: any) => eligibleDateSet.has(String(row.slot_date)));

      res.json(filteredRows.map((row: any) => ({
        recipientId: row.recipient_id || '',
        recipientEmail: row.filled ? (row.recipient_email || 'Unknown') : '(Open slot)',
        recipientName: row.filled ? (row.recipient_email || 'Unknown') : '(Open slot)',
        sequenceId: row.sequence_id || '',
        sequenceName: row.sequence_name || '',
        stepNumber: row.current_step || 0,
        scheduledAt: row.slot_time_utc,
        sentAt: row.sent ? row.slot_time_utc : null,
        status: row.sent ? 'sent' : (row.filled ? 'scheduled' : 'open'),
        subject: null,
        senderEmail: row.sender_email || '',
        emailAccountId: row.email_account_id || '',
      })));
    } catch (error: any) {
      console.error('Error fetching queue:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch queue' });
    }
  });

  app.post('/api/ehub/queue/generate', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      await ensureDailySlots();
      res.json({ message: 'Queue generation completed successfully' });
    } catch (error: any) {
      console.error('Error generating queue:', error);
      res.status(500).json({ message: error.message || 'Failed to generate queue' });
    }
  });

  app.post('/api/ehub/queue/rebuild', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { rebuildQueueFromNextBusinessDay } = await import('../../services/Matrix2/queueRebuilder');
      await rebuildQueueFromNextBusinessDay(userId);

      res.json({ message: 'Queue rebuild completed successfully' });
    } catch (error: any) {
      console.error('Error rebuilding queue:', error);
      res.status(500).json({ message: error.message || 'Failed to rebuild queue' });
    }
  });

  app.get('/api/ehub/paused-recipients', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const pausedRecipients = await storage.getPausedRecipients();
      res.json(pausedRecipients);
    } catch (error: any) {
      console.error('Error fetching paused recipients:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch paused recipients' });
    }
  });

  app.get('/api/ehub/queue/paused-count', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const count = await storage.getPausedRecipientsCount();
      res.json({ count });
    } catch (error: any) {
      console.error('Error fetching paused count:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch paused count' });
    }
  });

  app.patch('/api/ehub/recipients/:id/pause', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const recipient = await storage.pauseRecipient(id);

      await db
        .delete(dailySendSlots)
        .where(eq(dailySendSlots.recipientId, id));

      res.json(recipient);
    } catch (error: any) {
      console.error('Error pausing recipient:', error);
      res.status(500).json({ message: error.message || 'Failed to pause recipient' });
    }
  });

  app.patch('/api/ehub/recipients/:id/resume', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const recipient = await storage.resumeRecipient(id);
      await assignSingleRecipient(id);
      res.json(recipient);
    } catch (error: any) {
      console.error('Error resuming recipient:', error);
      res.status(500).json({ message: error.message || 'Failed to resume recipient' });
    }
  });

  app.patch('/api/ehub/recipients/:id/skip-step', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const recipient = await storage.skipRecipientStep(id);

      await db
        .delete(dailySendSlots)
        .where(eq(dailySendSlots.recipientId, id));

      res.json(recipient);
    } catch (error: any) {
      console.error('Error skipping recipient step:', error);
      res.status(500).json({ message: error.message || 'Failed to skip step' });
    }
  });

  app.post('/api/ehub/recipients/:id/send-now', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const recipient = await storage.sendRecipientNow(id);
      res.json(recipient);
    } catch (error: any) {
      console.error('Error sending email now:', error);
      res.status(500).json({ message: error.message || 'Failed to send email now' });
    }
  });

  app.patch('/api/ehub/recipients/:id/delay', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { hours } = req.body;

      if (typeof hours !== 'number' || hours <= 0) {
        return res.status(400).json({ message: 'Invalid hours value' });
      }

      const recipient = await storage.delayRecipient(id, hours);
      res.json(recipient);
    } catch (error: any) {
      console.error('Error delaying recipient:', error);
      res.status(500).json({ message: error.message || 'Failed to delay send' });
    }
  });

  app.delete('/api/ehub/recipients/:id', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const recipient = await storage.removeRecipient(id);

      const { clearSlotsForRecipient } = await import('../../services/Matrix2/slotDb');
      await clearSlotsForRecipient(id);

      const { invalidateCache } = await import('../../services/ehubContactsService');
      invalidateCache();

      res.json(recipient);
    } catch (error: any) {
      console.error('Error removing recipient:', error);
      res.status(500).json({ message: error.message || 'Failed to remove recipient' });
    }
  });

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
          await storage.removeRecipient(recipientId);
          await clearSlotsForRecipient(recipientId);
          results.push({ id: recipientId, success: true });
        } catch (err) {
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
    } catch (error: any) {
      console.error('Error in bulk recipient delete:', error);
      res.status(500).json({ message: error.message || 'Failed to delete recipients' });
    }
  });
}
