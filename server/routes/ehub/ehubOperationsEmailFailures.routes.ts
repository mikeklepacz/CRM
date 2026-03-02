import type { Express } from "express";
import type { EhubOperationsRouteDeps } from "./ehubOperations.types";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { sequenceRecipientMessages, sequenceRecipients, sequences } from "@shared/schema";

export function registerEhubOperationsEmailFailuresRoute(app: Express, deps: EhubOperationsRouteDeps): void {
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
              .leftJoin(sequenceRecipientMessages, eq(sequenceRecipients.id, sequenceRecipientMessages.recipientId))
              .where(eq(sequenceRecipients.status, 'failed'))
              .orderBy(sql `${sequenceRecipientMessages.sentAt} DESC NULLS LAST`)
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
      }
      catch (error: any) {
          console.error('Error fetching email failures:', error);
          res.status(500).json({ message: error.message || 'Failed to fetch email failures' });
      }
  });
}
