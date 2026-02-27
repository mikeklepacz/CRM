import { and, desc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { sequenceRecipientMessages, sequenceRecipients, sequences } from "@shared/schema";
import { db } from "../../db";

export async function handleEhubOperationsSentHistory(req: any, res: any): Promise<any> {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const sequenceId = req.query.sequenceId as string | undefined;
    const statusFilter = req.query.status as string | undefined;
    console.log("[SENT-HISTORY] Fetching with params:", { sequenceId, statusFilter, limit, offset });

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

    if (statusFilter === "replied") {
      query = query.where(isNotNull(sequenceRecipients.repliedAt));
    } else if (statusFilter === "bounced") {
      query = query.where(isNotNull(sequenceRecipients.bounceType));
    } else if (statusFilter === "pending") {
      query = query.where(eq(sequenceRecipients.status, "pending"));
    } else if (statusFilter === "sent") {
      query = query.where(and(isNull(sequenceRecipients.repliedAt), isNull(sequenceRecipients.bounceType), ne(sequenceRecipients.status, "pending")));
    }

    const messages = await query
      .orderBy(desc(sequenceRecipientMessages.sentAt))
      .limit(limit + 1)
      .offset(offset);

    console.log("[SENT-HISTORY] Query returned rows:", messages.length);
    const hasMore = messages.length > limit;
    const sliced = messages.slice(0, limit);

    const items = sliced.map((row: any) => {
      let status: "sent" | "replied" | "bounced" | "pending" = "sent";
      if (row.repliedAt) {
        status = "replied";
      } else if (row.bounceType) {
        status = "bounced";
      } else if (row.recipientStatus === "pending") {
        status = "pending";
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
        sentAt: row.sentAt ? (typeof row.sentAt.toISOString === "function" ? row.sentAt.toISOString() : new Date(row.sentAt).toISOString()) : null,
        threadId: row.threadId,
        status,
        repliedAt: row.repliedAt ? (typeof row.repliedAt.toISOString === "function" ? row.repliedAt.toISOString() : new Date(row.repliedAt).toISOString()) : null,
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

    if (statusFilter === "replied") {
      countQuery = countQuery.where(isNotNull(sequenceRecipients.repliedAt));
    } else if (statusFilter === "bounced") {
      countQuery = countQuery.where(isNotNull(sequenceRecipients.bounceType));
    } else if (statusFilter === "pending") {
      countQuery = countQuery.where(eq(sequenceRecipients.status, "pending"));
    } else if (statusFilter === "sent") {
      countQuery = countQuery.where(and(isNull(sequenceRecipients.repliedAt), isNull(sequenceRecipients.bounceType), ne(sequenceRecipients.status, "pending")));
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
    console.error("Error fetching sent history:", error);
    res.status(500).json({ message: error.message || "Failed to fetch sent history" });
  }
}
