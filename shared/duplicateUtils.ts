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
 * Handles directional abbreviations and street type abbreviations
 */
function normalizeAddress(address: string): string {
  if (!address) return '';
  
  return address
    .toLowerCase()
    // Normalize directional abbreviations first
    .replace(/\bwest\b|\bw\b/g, 'west')
    .replace(/\beast\b|\be\b/g, 'east')
    .replace(/\bnorth\b|\bn\b/g, 'north')
    .replace(/\bsouth\b|\bs\b/g, 'south')
    // Normalize street types
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\broad\b/g, 'rd')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\blane\b/g, 'ln')
    .replace(/\bcourt\b/g, 'ct')
    // Remove all non-alphanumeric
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
 * - Shared address words (at least one 3+ character word)
 * 
 * Note: Skips phone number matching to avoid flagging franchises
 * (same name + phone but different addresses = different locations)
 */
export function detectDuplicates(
  stores: StoreRecord[],
  similarityThreshold: number = 0.75
): DuplicateGroup[] {
  console.log(`[DuplicateFinder] Starting duplicate detection on ${stores.length} stores`);
  const duplicateGroups: DuplicateGroup[] = [];
  const addedPairs = new Set<string>(); // Track unique pairs to avoid duplicate groups
  
  // Helper to create a sorted pair key for deduplication
  const makePairKey = (link1: string, link2: string): string => {
    return [link1, link2].sort().join('||');
  };
  
  // Group by address (don't skip already-grouped stores)
  const addressGroups = new Map<string, StoreRecord[]>();
  stores.forEach(store => {
    const address = normalizeAddress(store.Address || '');
    if (address && address.length >= 5) { // Lowered from 10 to 5
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
  
  // Check for name similarity with address confirmation
  // Simple word-based matching: names share 75%+ words AND shared address words
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
      
      // Split names into words
      const words1 = name1.split(/\s+/).filter(w => w.length > 2); // Ignore short words
      const words2 = name2.split(/\s+/).filter(w => w.length > 2);
      
      if (words1.length === 0 || words2.length === 0) continue;
      
      // Count how many words are shared
      const sharedWords = words1.filter(w => words2.includes(w));
      const minWordCount = Math.min(words1.length, words2.length);
      const wordSimilarity = minWordCount > 0 ? sharedWords.length / minWordCount : 0;
      
      // Names must share at least 75% of words (based on shorter name)
      if (wordSimilarity < 0.75) continue;
      
      // Check if they share meaningful address words including a house number
      const addr1 = (store1.Address || '').toLowerCase();
      const addr2 = (store2.Address || '').toLowerCase();
      const addrWords1 = addr1.split(/\s+/).filter(w => w.length > 0);
      const addrWords2 = addr2.split(/\s+/).filter(w => w.length > 0);
      
      // Extract numeric tokens (house numbers)
      const numericTokens1 = addrWords1.filter(w => /^\d+/.test(w));
      const numericTokens2 = addrWords2.filter(w => /^\d+/.test(w));
      const sharedNumbers = numericTokens1.filter(n => numericTokens2.includes(n));
      
      // If no shared house number, skip
      if (sharedNumbers.length === 0) continue;
      
      // Filter out generic address words (street types, directionals, etc.)
      const genericWords = new Set([
        'st', 'street', 'rd', 'road', 'ave', 'avenue', 'blvd', 'boulevard',
        'ln', 'lane', 'dr', 'drive', 'ct', 'court', 'way', 'pl', 'place',
        'pkwy', 'parkway', 'hwy', 'highway', 'n', 's', 'e', 'w',
        'north', 'south', 'east', 'west', 'ne', 'nw', 'se', 'sw',
        'suite', 'ste', 'unit', 'apt', '#'
      ]);
      
      // Get meaningful words (not numbers, not generic, at least 3 chars)
      const meaningfulWords1 = addrWords1.filter(w => 
        !genericWords.has(w) && !/^\d+$/.test(w) && w.length >= 3
      );
      const meaningfulWords2 = addrWords2.filter(w => 
        !genericWords.has(w) && !/^\d+$/.test(w) && w.length >= 3
      );
      const sharedMeaningful = meaningfulWords1.filter(w => meaningfulWords2.includes(w));
      
      // Only add as duplicate if they share house number AND meaningful street name
      // This prevents franchises at different locations from being flagged
      if (sharedMeaningful.length > 0) {
        duplicateGroups.push({
          stores: [store1, store2],
          reason: `Similar names (${Math.round(wordSimilarity * 100)}% word match) + same address: ${sharedNumbers.join(', ')} ${sharedMeaningful.join(', ')}`,
          similarity: wordSimilarity,
        });
        addedPairs.add(pairKey);
      }
    }
  }
  
  // Sort by number of stores in each group (descending)
  console.log(`[DuplicateFinder] Found ${duplicateGroups.length} duplicate groups`);
  duplicateGroups.forEach((group, idx) => {
    console.log(`  Group ${idx + 1}: ${group.stores.length} stores - ${group.reason}`);
  });
  return duplicateGroups.sort((a, b) => b.stores.length - a.stores.length);
}

export interface StatusHierarchy {
  [statusName: string]: number; // Maps status name to displayOrder
}

/**
 * Determine which status is "better" (further along in sales pipeline)
 * Returns:
 * - Positive number if status1 is better
 * - Negative number if status2 is better
 * - 0 if equal or unknown
 */
export function compareStatuses(
  status1: string | null | undefined,
  status2: string | null | undefined,
  statusHierarchy: StatusHierarchy
): number {
  // Empty/null status is worst
  if (!status1 && !status2) return 0;
  if (!status1) return -1;
  if (!status2) return 1;
  
  const order1 = statusHierarchy[status1] ?? -1;
  const order2 = statusHierarchy[status2] ?? -1;
  
  return order1 - order2;
}

/**
 * Select the keeper store from a duplicate group
 * Priority:
 * 1. Claimed over unclaimed
 * 2. If both claimed, keep the one with better status
 * 3. If neither claimed or equal status, keep the one with more data
 */
export function selectKeeper(
  stores: StoreRecord[],
  statusHierarchy: StatusHierarchy
): StoreRecord {
  if (stores.length === 0) throw new Error('Cannot select keeper from empty group');
  if (stores.length === 1) return stores[0];
  
  // Separate claimed and unclaimed
  const claimed = stores.filter(s => s.Agent && s.Agent.trim() !== '');
  const unclaimed = stores.filter(s => !s.Agent || s.Agent.trim() === '');
  
  // If we have claimed stores, pick from those
  if (claimed.length > 0) {
    // Sort by status (best first), then by field count
    const sorted = [...claimed].sort((a, b) => {
      const statusCompare = compareStatuses(a.Status, b.Status, statusHierarchy);
      if (statusCompare !== 0) return -statusCompare; // Negative to get best first
      return countNonEmptyFields(b) - countNonEmptyFields(a);
    });
    return sorted[0];
  }
  
  // All unclaimed - pick the one with most data
  const sorted = [...unclaimed].sort((a, b) => {
    return countNonEmptyFields(b) - countNonEmptyFields(a);
  });
  return sorted[0];
}

/**
 * Merge data from source store into target store
 * - Copies non-empty fields from source to target if target's field is empty
 * - For Status field: only upgrades to better status, never downgrades
 * Returns updated target store
 */
export function mergeStoreData(
  target: StoreRecord,
  source: StoreRecord,
  statusHierarchy: StatusHierarchy
): StoreRecord {
  const merged = { ...target };
  
  // All possible fields to merge (excluding Link which is the key)
  const fieldsToCheck = Object.keys(source).filter(key => key !== 'Link');
  
  for (const field of fieldsToCheck) {
    const sourceValue = source[field];
    const targetValue = target[field];
    
    // Skip if source has no value
    if (sourceValue === null || sourceValue === undefined || sourceValue === '') {
      continue;
    }
    
    // Special handling for Status field
    if (field === 'Status') {
      const statusCompare = compareStatuses(sourceValue, targetValue, statusHierarchy);
      // Only upgrade to better status
      if (statusCompare > 0) {
        merged[field] = sourceValue;
      }
      continue;
    }
    
    // For all other fields, copy if target is empty
    if (targetValue === null || targetValue === undefined || targetValue === '') {
      merged[field] = sourceValue;
    }
  }
  
  return merged;
}

/**
 * Smart select: automatically select stores for deletion in each duplicate group
 * Returns array of objects with Link to delete and Link to keep
 */
export function smartSelectDuplicates(
  duplicateGroups: DuplicateGroup[],
  statusHierarchy: StatusHierarchy
): Array<{ deleteLink: string; keepLink: string }> {
  const deletions: Array<{ deleteLink: string; keepLink: string }> = [];
  
  duplicateGroups.forEach(group => {
    const keeper = selectKeeper(group.stores, statusHierarchy);
    
    // Mark all others for deletion
    group.stores.forEach(store => {
      if (store.Link !== keeper.Link) {
        deletions.push({
          deleteLink: store.Link,
          keepLink: keeper.Link,
        });
      }
    });
  });
  
  return deletions;
}
