import { db } from "../db";
import { systemIntegrations, userIntegrations, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage";
import { checkForReplies, fetchSentMessages, refreshAccessToken } from "./gmailReplyScanner/gmailApi";
import { ensureSystemSequence, fetchPOCEmails, isBlacklisted } from "./gmailReplyScanner/dbOps";
import { processDeduplicatedMessage } from "./gmailReplyScanner/scanProcessor";
import type { GmailMessage, ScanResult } from "./gmailReplyScanner/types";

/**
 * Gmail Reply Scanner Service
 *
 * Scans Gmail Sent folder for all emails sent to Commission Tracker POC Emails.
 * Auto-enrolls new contacts at Step 1 (manual email) and promotes non-responders to Step 2.
 */
export class GmailReplyScanner {
  private waitDays: number = 3;

  async scan(waitDays: number = 3, dryRun: boolean = false, selectedEmails?: string[], tenantId?: string): Promise<ScanResult> {
    this.waitDays = waitDays;

    const result: ScanResult = {
      scanned: 0,
      promoted: 0,
      newEnrollments: 0,
      errors: 0,
      details: [],
    };

    try {
      const [adminUser] = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
      if (!adminUser) {
        console.error("[ReplyScanner] No admin user found");
        return result;
      }

      const [userIntegration] = await db
        .select()
        .from(userIntegrations)
        .where(eq(userIntegrations.userId, adminUser.id))
        .limit(1);
      if (!userIntegration?.googleCalendarAccessToken) {
        return result;
      }

      let accessToken = userIntegration.googleCalendarAccessToken;
      if (
        userIntegration.googleCalendarTokenExpiry &&
        userIntegration.googleCalendarTokenExpiry < Date.now() &&
        userIntegration.googleCalendarRefreshToken
      ) {
        const [systemIntegration] = await db
          .select()
          .from(systemIntegrations)
          .where(eq(systemIntegrations.provider, "google_sheets"))
          .limit(1);

        if (systemIntegration?.googleClientId && systemIntegration?.googleClientSecret) {
          const newToken = await refreshAccessToken(
            userIntegration.googleCalendarRefreshToken,
            systemIntegration.googleClientId,
            systemIntegration.googleClientSecret,
          );

          if (newToken) {
            accessToken = newToken;
            await db
              .update(userIntegrations)
              .set({
                googleCalendarAccessToken: newToken,
                googleCalendarTokenExpiry: Date.now() + 3600 * 1000,
              })
              .where(eq(userIntegrations.userId, adminUser.id));
          }
        }
      }

      const effectiveTenantId = tenantId || (await storage.getAdminTenantId());
      if (!effectiveTenantId) {
        console.error("[ReplyScanner] No tenantId available");
        return result;
      }

      const pocEmails = await fetchPOCEmails(effectiveTenantId);
      if (pocEmails.size === 0) {
        return result;
      }

      const sentMessages = await fetchSentMessages(accessToken);
      if (sentMessages.length === 0) {
        return result;
      }

      const matchedMessages = sentMessages.filter((msg) => pocEmails.has(msg.to));

      const emailGroups = new Map<string, GmailMessage[]>();
      for (const msg of matchedMessages) {
        if (!emailGroups.has(msg.to)) {
          emailGroups.set(msg.to, []);
        }
        emailGroups.get(msg.to)!.push(msg);
      }

      const deduplicatedMessages: GmailMessage[] = [];
      const emailHasReply = new Map<string, boolean>();

      for (const [email, messages] of emailGroups.entries()) {
        messages.sort((a, b) => parseInt(b.internalDate) - parseInt(a.internalDate));
        deduplicatedMessages.push(messages[0]);

        let hasAnyReply = false;
        for (const msg of messages) {
          const hasReply = await checkForReplies(msg.id, msg.threadId, accessToken);
          if (hasReply) {
            hasAnyReply = true;
            break;
          }
        }
        emailHasReply.set(email, hasAnyReply);
      }

      const systemSequence = await ensureSystemSequence(adminUser.id, effectiveTenantId);
      if (!systemSequence) {
        console.error("[ReplyScanner] Failed to create/find system sequence");
        return result;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - waitDays);

      for (const message of deduplicatedMessages) {
        await processDeduplicatedMessage({
          message,
          result,
          dryRun,
          selectedEmails,
          waitDays,
          cutoffDate,
          hasReply: emailHasReply.get(message.to) || false,
          effectiveTenantId,
          systemSequence,
          isBlacklisted,
        });
      }

      return result;
    } catch (error: any) {
      console.error("[ReplyScanner] Fatal error during scan:", error);
      throw error;
    }
  }
}

export const gmailReplyScanner = new GmailReplyScanner();
