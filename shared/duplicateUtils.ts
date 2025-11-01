/**
 * Utilities for detecting duplicate store listings
 */

export interface StoreRecord {
  Link: string;
  Name: string;
  Phone?: string;
  Address?: string;
  [key: string]: any;
}

export interface DuplicateGroup {
  stores: StoreRecord[];
  reason: string;
  similarity: number;
}

/**
 * Calculate Jaro-Winkler similarity between two strings
 * Returns a value between 0 (no match) and 1 (perfect match)
 */
function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0 || len2 === 0) return 0.0;
  
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Find transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  
  // Calculate Jaro similarity
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  
  // Calculate Jaro-Winkler similarity (boost common prefixes)
  const prefixLength = Math.min(4, Math.min(len1, len2));
  let commonPrefix = 0;
  for (let i = 0; i < prefixLength; i++) {
    if (s1[i] === s2[i]) commonPrefix++;
    else break;
  }
  
  return jaro + commonPrefix * 0.1 * (1 - jaro);
}

/**
 * Normalize a store name for comparison
 * - Removes common suffixes like (Med), (Rec), etc.
 * - Removes extra whitespace
 * - Converts to lowercase
 */
function normalizeStoreName(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .replace(/\s*\((med|rec|medical|recreational)\)\s*/gi, '')
    .replace(/\s*-\s*(med|rec|medical|recreational)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize phone number for comparison
 */
function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, ''); // Remove all non-digits
}

/**
 * Normalize address for comparison
 */
function normalizeAddress(address: string): string {
  if (!address) return '';
  
  return address
    .toLowerCase()
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

/**
 * Count the number of non-empty fields in a store record
 * Used to determine which duplicate has less information
 */
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

/**
 * Detect duplicate stores based on:
 * - 75%+ name similarity (accounting for Med/Rec variations)
 * - Identical phone numbers
 * - Identical addresses
 * 
 * Note: Does NOT skip stores after grouping - allows stores to appear in multiple groups
 * if they match on different criteria (e.g., same phone AND similar name to another store)
 */
export function detectDuplicates(
  stores: StoreRecord[],
  similarityThreshold: number = 0.75
): DuplicateGroup[] {
  const duplicateGroups: DuplicateGroup[] = [];
  const addedPairs = new Set<string>(); // Track unique pairs to avoid duplicate groups
  
  // Helper to create a sorted pair key for deduplication
  const makePairKey = (link1: string, link2: string): string => {
    return [link1, link2].sort().join('||');
  };
  
  // Group by phone number
  const phoneGroups = new Map<string, StoreRecord[]>();
  stores.forEach(store => {
    const phone = normalizePhone(store.Phone || '');
    if (phone && phone.length >= 10) {
      if (!phoneGroups.has(phone)) {
        phoneGroups.set(phone, []);
      }
      phoneGroups.get(phone)!.push(store);
    }
  });
  
  // Add phone-based duplicates and track pairs
  phoneGroups.forEach((group, phone) => {
    if (group.length > 1) {
      duplicateGroups.push({
        stores: group,
        reason: `Same phone number: ${group[0].Phone || phone}`,
        similarity: 1.0,
      });
      
      // Mark all pairs in this group as processed
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          addedPairs.add(makePairKey(group[i].Link, group[j].Link));
        }
      }
    }
  });
  
  // Group by address (don't skip already-grouped stores)
  const addressGroups = new Map<string, StoreRecord[]>();
  stores.forEach(store => {
    const address = normalizeAddress(store.Address || '');
    if (address && address.length >= 10) {
      if (!addressGroups.has(address)) {
        addressGroups.set(address, []);
      }
      addressGroups.get(address)!.push(store);
    }
  });
  
  // Add address-based duplicates if they're new pairs
  addressGroups.forEach((group, address) => {
    if (group.length > 1) {
      // Check if this is a genuinely new group
      let hasNewPair = false;
      for (let i = 0; i < group.length && !hasNewPair; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (!addedPairs.has(makePairKey(group[i].Link, group[j].Link))) {
            hasNewPair = true;
            break;
          }
        }
      }
      
      if (hasNewPair) {
        duplicateGroups.push({
          stores: group,
          reason: `Same address: ${group[0].Address || ''}`,
          similarity: 1.0,
        });
        
        // Mark pairs as processed
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            addedPairs.add(makePairKey(group[i].Link, group[j].Link));
          }
        }
      }
    }
  });
  
  // Check for name similarity across ALL stores (not just remaining)
  for (let i = 0; i < stores.length; i++) {
    for (let j = i + 1; j < stores.length; j++) {
      const store1 = stores[i];
      const store2 = stores[j];
      
      // Skip if this pair already matched
      const pairKey = makePairKey(store1.Link, store2.Link);
      if (addedPairs.has(pairKey)) continue;
      
      const name1 = normalizeStoreName(store1.Name || '');
      const name2 = normalizeStoreName(store2.Name || '');
      
      if (!name1 || !name2) continue;
      
      const similarity = jaroWinklerSimilarity(name1, name2);
      
      if (similarity >= similarityThreshold) {
        duplicateGroups.push({
          stores: [store1, store2],
          reason: `Similar names (${Math.round(similarity * 100)}% match)`,
          similarity,
        });
        addedPairs.add(pairKey);
      }
    }
  }
  
  // Sort by number of stores in each group (descending)
  return duplicateGroups.sort((a, b) => b.stores.length - a.stores.length);
}

/**
 * Smart select: automatically select stores with less information in each duplicate group
 * Returns array of Link values to delete
 */
export function smartSelectDuplicates(duplicateGroups: DuplicateGroup[]): string[] {
  const toDelete: string[] = [];
  
  duplicateGroups.forEach(group => {
    // Sort stores by field count (descending) - most info first
    const sortedStores = [...group.stores].sort((a, b) => {
      return countNonEmptyFields(b) - countNonEmptyFields(a);
    });
    
    // Keep the first store (most complete), mark rest for deletion
    sortedStores.slice(1).forEach(store => {
      toDelete.push(store.Link);
    });
  });
  
  return toDelete;
}
