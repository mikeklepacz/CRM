import type { Express } from "express";
import { and, desc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { db } from "../../db";
import { storage } from "../../storage";
import {
  sequenceRecipientMessages,
  sequenceRecipients,
  sequences,
  updateEhubSettingsSchema,
} from "@shared/schema";

export function registerEhubOperationsRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
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

      const schedulingSettingsChanged = oldSettings && (
        oldSettings.sendingHoursStart !== newSettings.sendingHoursStart ||
        oldSettings.sendingHoursEnd !== newSettings.sendingHoursEnd ||
        oldSettings.dailyEmailLimit !== newSettings.dailyEmailLimit ||
        oldSettings.minDelayMinutes !== newSettings.minDelayMinutes ||
        oldSettings.maxDelayMinutes !== newSettings.maxDelayMinutes ||
        oldSettings.clientStartOffsetHours !== newSettings.clientStartOffsetHours ||
        oldSettings.clientCutoffHour !== newSettings.clientCutoffHour ||
        JSON.stringify(oldSettings.excludedDays) !== JSON.stringify(newSettings.excludedDays)
      );

      if (schedulingSettingsChanged) {
        console.log('[EHub Settings] ⚡ Scheduling settings changed - triggering queue rebuild from next business day');
        const { rebuildQueueFromNextBusinessDay } = await import('../../services/Matrix2/queueRebuilder');
        rebuildQueueFromNextBusinessDay(userId).catch(err => {
          console.error('[EHub Settings] ❌ Queue rebuild failed:', err);
        });
      } else {
        console.log('[EHub Settings] Content settings updated (no queue rebuild needed)');
      }

      res.json(newSettings);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid settings data', errors: error.errors });
      }
      console.error('Error updating E-Hub settings:', error);
      res.status(500).json({ message: error.message || 'Failed to update settings' });
    }
  });

  app.get('/api/ehub/all-contacts', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { getAllContacts } = await import('../../services/ehubContactsService');

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      const search = (req.query.search as string) || '';
      const statusFilter = (req.query.statusFilter as string) || 'all';
      const projectId = (req.query.projectId as string) || undefined;

      const result = await getAllContacts({
        page,
        pageSize,
        search,
        statusFilter: statusFilter as any,
        tenantId: (req.user as any).tenantId,
        projectId,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error fetching all contacts:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch contacts' });
    }
  });

  app.get('/api/ehub/sent-history', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = parseInt(req.query.offset as string) || 0;
      const sequenceId = req.query.sequenceId as string | undefined;
      const statusFilter = req.query.status as string | undefined;

      console.log('[SENT-HISTORY] Fetching with params:', { sequenceId, statusFilter, limit, offset });

      let query: any = db
        .select({
          messageId: sequenceRecipientMessages.id,
          recipientId: sequenceRecipients.id,
          recipientEmail: sequenceRecipients.email,
          recipientName: sequenceRecipients.name,
          sequenceId: sequences.id,
          sequenceName: sequences.name,
          stepNumber: sequenceRecipientMessages.stepNumber,
          subject: sequenceRecipientMessages.subject,
          sentAt: sequenceRecipientMessages.sentAt,
          threadId: sequenceRecipientMessages.threadId,
          recipientStatus: sequenceRecipients.status,
          repliedAt: sequenceRecipients.repliedAt,
          replyCount: sequenceRecipients.replyCount,
          bounceType: sequenceRecipients.bounceType,
        })
        .from(sequenceRecipientMessages)
        .leftJoin(sequenceRecipients, eq(sequenceRecipientMessages.recipientId, sequenceRecipients.id))
        .leftJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
        .where(isNotNull(sequenceRecipientMessages.sentAt));

      if (sequenceId) {
        query = query.where(eq(sequences.id, sequenceId));
      }

      if (statusFilter === 'replied') {
        query = query.where(isNotNull(sequenceRecipients.repliedAt));
      } else if (statusFilter === 'bounced') {
        query = query.where(isNotNull(sequenceRecipients.bounceType));
      } else if (statusFilter === 'pending') {
        query = query.where(eq(sequenceRecipients.status, 'pending'));
      } else if (statusFilter === 'sent') {
        query = query.where(
          and(
            isNull(sequenceRecipients.repliedAt),
            isNull(sequenceRecipients.bounceType),
            ne(sequenceRecipients.status, 'pending')
          )
        );
      }

      const messages = await query
        .orderBy(desc(sequenceRecipientMessages.sentAt))
        .limit(limit + 1)
        .offset(offset);

      console.log('[SENT-HISTORY] Query returned rows:', messages.length);

      const hasMore = messages.length > limit;
      const sliced = messages.slice(0, limit);

      const items = sliced.map((row: any) => {
        let status: 'sent' | 'replied' | 'bounced' | 'pending' = 'sent';
        if (row.repliedAt) {
          status = 'replied';
        } else if (row.bounceType) {
          status = 'bounced';
        } else if (row.recipientStatus === 'pending') {
          status = 'pending';
        }

        return {
          messageId: row.messageId,
          recipientId: row.recipientId,
          recipientEmail: row.recipientEmail,
          recipientName: row.recipientName,
          sequenceId: row.sequenceId,
          sequenceName: row.sequenceName,
          stepNumber: row.stepNumber,
          subject: row.subject,
          sentAt: row.sentAt ? (typeof row.sentAt.toISOString === 'function' ? row.sentAt.toISOString() : new Date(row.sentAt).toISOString()) : null,
          threadId: row.threadId,
          status,
          repliedAt: row.repliedAt ? (typeof row.repliedAt.toISOString === 'function' ? row.repliedAt.toISOString() : new Date(row.repliedAt).toISOString()) : null,
          replyCount: row.replyCount,
        };
      });

      let countQuery: any = db
        .select({ count: sql<number>`count(*)` })
        .from(sequenceRecipientMessages)
        .leftJoin(sequenceRecipients, eq(sequenceRecipientMessages.recipientId, sequenceRecipients.id))
        .leftJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
        .where(isNotNull(sequenceRecipientMessages.sentAt));

      if (sequenceId) {
        countQuery = countQuery.where(eq(sequences.id, sequenceId));
      }

      if (statusFilter === 'replied') {
        countQuery = countQuery.where(isNotNull(sequenceRecipients.repliedAt));
      } else if (statusFilter === 'bounced') {
        countQuery = countQuery.where(isNotNull(sequenceRecipients.bounceType));
      } else if (statusFilter === 'pending') {
        countQuery = countQuery.where(eq(sequenceRecipients.status, 'pending'));
      } else if (statusFilter === 'sent') {
        countQuery = countQuery.where(
          and(
            isNull(sequenceRecipients.repliedAt),
            isNull(sequenceRecipients.bounceType),
            ne(sequenceRecipients.status, 'pending')
          )
        );
      }

      const countResult = await countQuery;
      const total = countResult[0]?.count ? Number(countResult[0].count) : 0;

      res.json({
        messages: items,
        total,
        limit,
        hasMore,
      });
    } catch (error: any) {
      console.error('Error fetching sent history:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch sent history' });
    }
  });

  app.get('/api/ehub/email-failures', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
      const offset = parseInt(req.query.offset as string) || 0;

      const failures = await db
        .select({
          recipientId: sequenceRecipients.id,
          email: sequenceRecipients.email,
          name: sequenceRecipients.name,
          sequenceId: sequences.id,
          sequenceName: sequences.name,
          status: sequenceRecipients.status,
          currentStep: sequenceRecipients.currentStep,
          lastAttempt: sequenceRecipientMessages.sentAt,
          failureDetails: (sequenceRecipients as any).failureDetails,
        })
        .from(sequenceRecipients)
        .innerJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
        .leftJoin(
          sequenceRecipientMessages,
          eq(sequenceRecipients.id, sequenceRecipientMessages.recipientId)
        )
        .where(eq(sequenceRecipients.status, 'failed'))
        .orderBy(sql`${sequenceRecipientMessages.sentAt} DESC NULLS LAST`)
        .limit(limit + 1)
        .offset(offset);

      const hasMore = failures.length > limit;
      const items = failures.slice(0, limit);

      res.json({
        failures: items,
        total: items.length,
        limit,
        hasMore,
      });
    } catch (error: any) {
      console.error('Error fetching email failures:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch email failures' });
    }
  });

  app.post('/api/ehub/scan-replies', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { gmailReplyScanner } = await import('../../services/gmailReplyScanner');
      const { dryRun = true, waitDays = 3, selectedEmails } = req.body;

      console.log(`[API] Starting reply scan (dryRun: ${dryRun}, waitDays: ${waitDays}, selected: ${selectedEmails?.length || 'all'})`);

      const result = await gmailReplyScanner.scan(waitDays, dryRun, selectedEmails, (req.user as any).tenantId);

      res.json({
        success: true,
        dryRun,
        ...result,
        message: dryRun
          ? `Preview: ${result.details.filter(d => d.status === 'promoted').length} recipients ready to promote`
          : `Enrolled ${result.newEnrollments} new contacts, promoted ${result.promoted} to Step 1`,
      });
    } catch (error: any) {
      console.error('[API] Error scanning for replies:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to scan for replies',
      });
    }
  });
}
