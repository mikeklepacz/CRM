import type { AllContactsResponse } from '../../shared/schema';
import { getCachedContacts, invalidateCache, setCachedContacts } from './ehubContacts/cache';
import { isTrackerContacted } from './ehubContacts/classification';
import { enrichWithSequenceStatus } from './ehubContacts/enrichStatus';
import { fetchSourceContacts } from './ehubContacts/fetchSources';

export { isTrackerContacted, invalidateCache };

export async function getAllContacts(options: {
  page?: number;
  pageSize?: number;
  search?: string;
  statusFilter?: 'all' | 'neverContacted' | 'contacted' | 'inSequence' | 'replied' | 'bounced';
  tenantId: string;
  projectId?: string;
}): Promise<AllContactsResponse> {
  const {
    page = 1,
    pageSize = 50,
    search = '',
    statusFilter = 'all',
    tenantId,
    projectId
  } = options;

  const cacheKey = projectId ? `${tenantId}:${projectId}` : tenantId;
  let contacts = getCachedContacts(cacheKey);

  if (!contacts) {
    const { contacts: sourceContacts, trackerEmailedMap } = await fetchSourceContacts(tenantId, projectId);
    contacts = await enrichWithSequenceStatus(sourceContacts, trackerEmailedMap, tenantId);
    setCachedContacts(cacheKey, contacts);
  }

  let filteredContacts = contacts;

  if (search) {
    const searchLower = search.toLowerCase();
    filteredContacts = filteredContacts.filter(contact =>
      contact.name.toLowerCase().includes(searchLower) ||
      contact.email.toLowerCase().includes(searchLower) ||
      contact.state?.toLowerCase().includes(searchLower) ||
      contact.salesSummary?.toLowerCase().includes(searchLower)
    );
  }

  const contactsAfterSearch = filteredContacts;

  if (statusFilter !== 'all') {
    filteredContacts = filteredContacts.filter(contact => {
      switch (statusFilter) {
        case 'neverContacted':
          return contact.neverContacted;
        case 'contacted':
          return contact.contacted;
        case 'inSequence':
          return contact.inSequence;
        case 'replied':
          return contact.replied;
        case 'bounced':
          return contact.bounced;
        default:
          return true;
      }
    });
  }

  const statusCounts = {
    all: contactsAfterSearch.length,
    neverContacted: contactsAfterSearch.filter(c => c.neverContacted).length,
    contacted: contactsAfterSearch.filter(c => c.contacted).length,
    inSequence: contactsAfterSearch.filter(c => c.inSequence).length,
    replied: contactsAfterSearch.filter(c => c.replied).length,
    bounced: contactsAfterSearch.filter(c => c.bounced).length,
  };

  const total = filteredContacts.length;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedContacts = filteredContacts.slice(startIndex, endIndex);

  return {
    contacts: paginatedContacts,
    total,
    statusCounts,
  };
}
