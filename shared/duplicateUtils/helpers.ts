import type { StatusHierarchy, StoreRecord } from './types';

export function normalizeStoreName(name: string): string {
  if (!name) return '';

  return name
    .toLowerCase()
    .replace(/\s*\((med|rec|medical|recreational)\)\s*/gi, '')
    .replace(/\s*-\s*(med|rec|medical|recreational)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeAddress(address: string): string {
  if (!address) return '';

  return address
    .toLowerCase()
    .replace(/\bwest\b|\bw\b/g, 'west')
    .replace(/\beast\b|\be\b/g, 'east')
    .replace(/\bnorth\b|\bn\b/g, 'north')
    .replace(/\bsouth\b|\bs\b/g, 'south')
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\broad\b/g, 'rd')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\blane\b/g, 'ln')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function extractCanonicalStem(address: string): string {
  if (!address) return '';

  const normalized = address.toLowerCase();

  const cleaned = normalized
    .replace(/\s+(suite|ste|unit|apt|apartment|building|bldg|floor|fl|#)\s*[a-z0-9-]*$/i, '')
    .replace(/\s+(suite|ste|unit|apt|apartment|building|bldg|floor|fl|#)\s+[a-z0-9-]+/gi, '')
    .trim();

  const words = cleaned.split(/\s+/);
  const houseNum = words.find(w => /^\d+$/.test(w)) || '';

  const genericWords = new Set([
    'st', 'street', 'rd', 'road', 'ave', 'avenue', 'blvd', 'boulevard',
    'ln', 'lane', 'dr', 'drive', 'ct', 'court', 'way', 'pl', 'place',
    'pkwy', 'parkway', 'hwy', 'highway', 'n', 's', 'e', 'w',
    'north', 'south', 'east', 'west', 'ne', 'nw', 'se', 'sw'
  ]);

  const streetWord = words.find(w =>
    !genericWords.has(w) &&
    !/^\d+$/.test(w) &&
    w.length >= 3
  ) || '';

  return houseNum && streetWord ? `${houseNum}-${streetWord}` : '';
}

export function countNonEmptyFields(store: StoreRecord): number {
  let count = 0;
  const fieldsToCheck = [
    'Name', 'Phone', 'Email', 'Address', 'City', 'State', 'Zip',
    'Website', 'Tags', 'Notes', 'Point of Contact', 'POC EMAIL', 'POC Phone',
    'Followers', 'Vibe Score', 'Sales-ready Summary', 'DBA'
  ];

  fieldsToCheck.forEach(field => {
    const value = store[field];
    if (value && typeof value === 'string' && value.trim() !== '') {
      count++;
    }
  });

  return count;
}

export function extractHouseNumber(address: string): string {
  if (!address) return '';
  const cleaned = address.replace(/^(suite|ste|unit|apt|apartment|#)\s*\d+\s*/i, '');
  const match = cleaned.match(/\b(\d+)/);
  return match ? match[1] : '';
}

export function compareStatuses(
  status1: string | null | undefined,
  status2: string | null | undefined,
  statusHierarchy: StatusHierarchy
): number {
  if (!status1 && !status2) return 0;
  if (!status1) return -1;
  if (!status2) return 1;

  const order1 = statusHierarchy[status1] ?? -1;
  const order2 = statusHierarchy[status2] ?? -1;

  return order1 - order2;
}
