import { db } from "../../db";
import { emailBlacklist, sequences } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../../storage";
import * as googleSheets from "../../googleSheets";

export async function fetchPOCEmails(tenantId: string): Promise<Set<string>> {
  const pocEmails = new Set<string>();

  try {
    const trackerSheet = await storage.getGoogleSheetByPurpose("commissions", tenantId);

    if (!trackerSheet) {
      return pocEmails;
    }

    const trackerData = await googleSheets.readSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}!A:ZZ`);

    if (!trackerData || trackerData.length === 0) {
      return pocEmails;
    }

    const headers = trackerData[0];
    const rows = trackerData.slice(1);

    const pocEmailIndex = headers.findIndex((h: string) => h.trim() === "POC EMAIL");
    const amountIndex = headers.findIndex((h: string) => h.trim() === "Amount");

    if (pocEmailIndex === -1) {
      console.error("[ReplyScanner] POC EMAIL column not found in Commission Tracker");
      return pocEmails;
    }

    if (amountIndex === -1) {
      console.error("[ReplyScanner] Amount column not found in Commission Tracker");
      return pocEmails;
    }

    for (const row of rows) {
      const email = row[pocEmailIndex];
      const amountStr = row[amountIndex];

      if (email && typeof email === "string" && email.includes("@")) {
        const amount = parseFloat((amountStr || "0").toString().replace(/[$,]/g, ""));
        if (amount === 0 || isNaN(amount)) {
          pocEmails.add(email.trim().toLowerCase());
        }
      }
    }

    return pocEmails;
  } catch (error: any) {
    console.error("[ReplyScanner] Error fetching POC Emails:", error);
    return pocEmails;
  }
}

export async function isBlacklisted(email: string): Promise<boolean> {
  try {
    const [blacklisted] = await db
      .select()
      .from(emailBlacklist)
      .where(eq(emailBlacklist.email, email.toLowerCase()))
      .limit(1);

    return !!blacklisted;
  } catch (error: any) {
    console.error("[ReplyScanner] Error checking blacklist:", error);
    return false;
  }
}

export async function ensureSystemSequence(adminUserId: string, tenantId: string): Promise<typeof sequences.$inferSelect | null> {
  try {
    const [existingSequence] = await db
      .select()
      .from(sequences)
      .where(eq(sequences.isSystem, true))
      .limit(1);

    if (existingSequence) {
      return existingSequence;
    }

    const [newSequence] = await (db.insert(sequences as any) as any)
      .values({
        tenantId,
        createdBy: adminUserId,
        name: "Manual Follow-Ups",
        description: "Protected system sequence for contacts created via Gmail drafts",
        stepDelays: [3, 7, 14],
        status: "paused",
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newSequence;
  } catch (error: any) {
    console.error("[ReplyScanner] Error ensuring system sequence:", error);
    return null;
  }
}
