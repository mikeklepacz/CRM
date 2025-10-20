import { normalizeLink } from './linkUtils';

export interface StoreData {
  Name: string;
  Link: string;
  Website?: string;
  [key: string]: any;
}

export interface FranchiseGroup {
  brandName: string;
  locations: StoreData[];
  commonWebsite?: string;
  matchType: 'website' | 'name';
}

/**
 * Normalize a store name for comparison
 * - Lowercase
 * - Remove common suffixes like location indicators
 * - Trim whitespace and extra spaces
 */
function normalizeStoreName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .toLowerCase()
    .trim()
    // Remove common location patterns but keep the brand intact
    .replace(/\s*-\s*.+$/, '') // Remove everything after first dash (location suffix)
    .replace(/\s+/g, ' ')      // Normalize multiple spaces
    .trim();
}

/**
 * Extract domain from website URL
 */
function extractDomain(url: string): string {
  if (!url || typeof url !== 'string') return '';
  
  const normalized = normalizeLink(url);
  // Get just the domain (first segment)
  const domain = normalized.split('/')[0];
  return domain;
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a value between 0 and 1 (1 = identical)
 */
function stringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Detect potential franchise groups from store data
 * Groups by website first (strongest signal), then by name similarity
 */
export function detectFranchises(
  stores: StoreData[],
  minLocations: number = 2,
  maxLocations: number = 100
): FranchiseGroup[] {
  const websiteGroups = new Map<string, StoreData[]>();
  const ungroupedStores: StoreData[] = [];
  
  // First pass: group by website domain
  stores.forEach(store => {
    const domain = extractDomain(store.Website || '');
    if (domain && domain.length > 3) {
      if (!websiteGroups.has(domain)) {
        websiteGroups.set(domain, []);
      }
      websiteGroups.get(domain)!.push(store);
    } else {
      ungroupedStores.push(store);
    }
  });

  const franchiseGroups: FranchiseGroup[] = [];

  // Convert website groups to franchise groups
  websiteGroups.forEach((locations, domain) => {
    if (locations.length >= minLocations && locations.length <= maxLocations) {
      // Extract brand name from the most common store name prefix
      const brandName = findCommonPrefix(locations.map(s => s.Name));
      
      franchiseGroups.push({
        brandName: brandName || domain,
        locations,
        commonWebsite: domain,
        matchType: 'website'
      });
    }
  });

  // Second pass: group ungrouped stores by name similarity
  const nameGroups = new Map<string, StoreData[]>();
  
  ungroupedStores.forEach(store => {
    const normalized = normalizeStoreName(store.Name);
    if (!normalized || normalized.length < 3) return;
    
    // Try to find an existing group with similar name
    let foundGroup = false;
    const entries = Array.from(nameGroups.entries());
    for (const [groupKey, groupStores] of entries) {
      const similarity = stringSimilarity(normalized, groupKey);
      if (similarity >= 0.7) { // 70% similarity threshold
        groupStores.push(store);
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      nameGroups.set(normalized, [store]);
    }
  });

  // Convert name groups to franchise groups
  nameGroups.forEach((locations, normalizedName) => {
    if (locations.length >= minLocations && locations.length <= maxLocations) {
      franchiseGroups.push({
        brandName: locations[0].Name.split('-')[0].trim(),
        locations,
        matchType: 'name'
      });
    }
  });

  // Sort by number of locations (descending)
  return franchiseGroups.sort((a, b) => b.locations.length - a.locations.length);
}

/**
 * Find the common prefix among store names
 */
function findCommonPrefix(names: string[]): string {
  if (!names || names.length === 0) return '';
  if (names.length === 1) return names[0].split('-')[0].trim();

  // Normalize and split names
  const normalized = names.map(name => normalizeStoreName(name));
  
  // Find the shortest common prefix
  let prefix = normalized[0];
  for (let i = 1; i < normalized.length; i++) {
    let j = 0;
    while (j < prefix.length && j < normalized[i].length && prefix[j] === normalized[i][j]) {
      j++;
    }
    prefix = prefix.substring(0, j);
    if (!prefix) break;
  }

  // Clean up the prefix
  prefix = prefix.trim();
  
  // If prefix is too short or generic, use the first store's brand
  if (prefix.length < 3) {
    return names[0].split('-')[0].trim();
  }

  // Capitalize first letter of each word
  return prefix
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
