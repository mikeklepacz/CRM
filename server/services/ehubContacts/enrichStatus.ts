import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { sequenceRecipients, sequences } from '../../../shared/schema';
import type { EhubContact } from '../../../shared/schema';
import { detectTimezone } from '../timezoneHours';

export async function enrichWithSequenceStatus(
  contactsFromSheet: Array<{ name: string; email: string; state?: string; hours?: string; link?: string; salesSummary?: string }>,
  trackerEmailedMap: Map<string, boolean>,
  tenantId: string,
): Promise<EhubContact[]> {
  const uniqueEmails = [...new Set(contactsFromSheet.map(c => c.email))];

  let allRecipientData: Array<{
    email: string;
    sequenceId: string;
    sequenceName: string | null;
    replied: Date | null;
    bounced: string | null;
    status: string;
  }> = [];

  if (uniqueEmails.length > 0) {
    allRecipientData = await db
      .select({
        email: sql<string>`LOWER(${sequenceRecipients.email})`,
        sequenceId: sequenceRecipients.sequenceId,
        sequenceName: sql<string>`${sequences.name}`,
        replied: sequenceRecipients.repliedAt,
        bounced: sequenceRecipients.bounceType,
        status: sequenceRecipients.status,
      })
      .from(sequenceRecipients)
      .innerJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
      .where(
        and(
          eq(sequences.tenantId, tenantId),
          sql`LOWER(${sequenceRecipients.email}) = ANY(${sql.raw(`ARRAY[${uniqueEmails.map(e => `'${e.replace(/'/g, "''")}'`).join(',')}]`)})`
        )
      );
  }

  const hasSequenceHistoryMap = new Map<string, boolean>();
  allRecipientData.forEach(row => {
    hasSequenceHistoryMap.set(row.email, true);
  });

  const emailStatusMap = new Map<string, {
    inSequence: boolean;
    replied: boolean;
    bounced: boolean;
    sequenceNames: string[];
  }>();

  allRecipientData.forEach(row => {
    const existing = emailStatusMap.get(row.email) || {
      inSequence: false,
      replied: false,
      bounced: false,
      sequenceNames: [],
    };

    if (row.status === 'in_sequence') {
      existing.inSequence = true;
      if (row.sequenceName && !existing.sequenceNames.includes(row.sequenceName)) {
        existing.sequenceNames.push(row.sequenceName);
      }
    }

    if (row.replied) existing.replied = true;
    if (row.bounced) existing.bounced = true;

    emailStatusMap.set(row.email, existing);
  });

  return contactsFromSheet.map(contact => {
    const status = emailStatusMap.get(contact.email) || {
      inSequence: false,
      replied: false,
      bounced: false,
      sequenceNames: [],
    };

    const timezone = contact.state ? detectTimezone(contact.state) : undefined;
    const emailedInTracker = trackerEmailedMap.get(contact.email) || false;
    const hasSequenceHistory = hasSequenceHistoryMap.get(contact.email) || false;

    return {
      name: contact.name,
      email: contact.email,
      state: contact.state,
      timezone,
      hours: contact.hours,
      link: contact.link,
      salesSummary: contact.salesSummary,
      neverContacted: !emailedInTracker && !hasSequenceHistory,
      contacted: (emailedInTracker || hasSequenceHistory) && !status.inSequence,
      inSequence: status.inSequence,
      replied: status.replied,
      bounced: status.bounced,
      sequenceNames: status.sequenceNames,
    };
  });
}
