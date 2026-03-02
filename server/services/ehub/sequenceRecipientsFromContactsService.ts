import { insertSequenceRecipientSchema } from "@shared/schema";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { getAllContacts } from "../ehubContactsService";
import { emailRegex, ensureImportableSequence, persistImportedRecipients } from "./sequenceRecipientsImportShared";

type ImportFromContactsInput = {
  sequenceId: string;
  tenantId: string;
  contacts?: any[];
  selectAll?: boolean;
  search?: string;
  statusFilter?: string;
};

export async function importSequenceRecipientsFromContacts(input: ImportFromContactsInput) {
  const sequence = await ensureImportableSequence(input.sequenceId, input.tenantId);

  let contactsToAdd: any[] = [];
  if (input.selectAll) {
    const { contacts } = await getAllContacts({
      page: 1,
      pageSize: 99999,
      search: input.search || "",
      statusFilter: (input.statusFilter || "all") as any,
      tenantId: input.tenantId,
      projectId: sequence.projectId || undefined,
    });
    contactsToAdd = contacts;
  } else {
    contactsToAdd = input.contacts || [];
  }

  if (!contactsToAdd.length) {
    return { message: "No contacts to add", count: 0 };
  }

  const storeEmailToLink = new Map<string, { link?: string; salesSummary?: string }>();
  const storeSheet = await storage.getGoogleSheetByPurpose("Store Database", input.tenantId);

  if (storeSheet) {
    const storeData = await googleSheets.readSheetData(storeSheet.spreadsheetId, `${storeSheet.sheetName}!A:ZZ`);
    if (storeData.length) {
      const headers = storeData[0].map((h: string) => h.toLowerCase().trim());
      const emailIndex = headers.indexOf("email");
      const linkIndex = headers.indexOf("link");
      const salesSummaryIndex = headers.indexOf("sales-ready summary");

      if (emailIndex !== -1) {
        for (const row of storeData.slice(1)) {
          const rowEmail = row[emailIndex]?.toString().toLowerCase().trim();
          if (rowEmail && rowEmail.includes("@")) {
            storeEmailToLink.set(rowEmail, {
              link: linkIndex !== -1 ? row[linkIndex] : undefined,
              salesSummary: salesSummaryIndex !== -1 ? row[salesSummaryIndex] : undefined,
            });
          }
        }
      }
    }
  }

  const recipients: any[] = [];
  const seenEmails = new Set<string>();

  for (const contact of contactsToAdd) {
    const rawEmail = contact.email?.toString().trim();
    const rawName = contact.name?.toString().trim();

    if (!rawName || !rawEmail) {
      continue;
    }

    const email = rawEmail.toLowerCase();
    if (!emailRegex.test(email) || seenEmails.has(email)) {
      continue;
    }

    const existing = await storage.findRecipientByEmail(input.sequenceId, email);
    if (existing) {
      continue;
    }

    const storeData = storeEmailToLink.get(email);
    const link = contact.link || storeData?.link || "";
    const salesSummary = contact.salesSummary || storeData?.salesSummary || "";

    try {
      insertSequenceRecipientSchema.parse({
        tenantId: input.tenantId,
        sequenceId: input.sequenceId,
        email,
        name: rawName,
        link,
        salesSummary,
        businessHours: contact.hours || contact.businessHours || "",
        state: contact.state || null,
        timezone: contact.timezone || "America/New_York",
        status: "pending",
      });

      seenEmails.add(email);
      recipients.push({
        tenantId: input.tenantId,
        sequenceId: input.sequenceId,
        email,
        name: rawName,
        link,
        salesSummary,
        businessHours: contact.hours || contact.businessHours || "",
        state: contact.state || null,
        timezone: contact.timezone || "America/New_York",
        status: "pending",
      });
    } catch {
      continue;
    }
  }

  if (!recipients.length) {
    return { message: "No new recipients to import", count: 0 };
  }

  const created = await persistImportedRecipients(input.sequenceId, input.tenantId, sequence, recipients);
  return { message: "Recipients imported successfully", count: created.length };
}
