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
 * Extract the brand name from a store name
 * - Removes location suffix (everything after first dash)
 * - Removes generic terms (Cannabis, Co, Company, Dispensary, etc.)
 * - Returns the core brand identifier for exact matching
 */
function extractBrandName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  
  // First, remove everything after the first dash (location suffix)
  let brand = name.split('-')[0].trim();
  
  // Remove generic terms that don't help identify the brand
  const genericTerms = [
    /\bcannabis\b/gi,
    /\bco\.?\b/gi,
    /\bcompany\b/gi,
    /\bdispensary\b/gi,
    /\bthe\b/gi,
    /\binc\.?\b/gi,
    /\bllc\.?\b/gi,
    /\bltd\.?\b/gi,
  ];
  
  genericTerms.forEach(term => {
    brand = brand.replace(term, ' ');
  });
  
  // Normalize whitespace and convert to lowercase for comparison
  brand = brand.replace(/\s+/g, ' ').trim().toLowerCase();
  
  return brand;
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
 * Extract email domain (e.g., "example.com" from "info@example.com")
 */
function extractEmailDomain(email: string): string {
  if (!email || typeof email !== 'string') return '';
  const match = email.match(/@(.+)$/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Extract phone number digits only for comparison
 */
function normalizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/\D/g, ''); // Remove all non-digits
}

/**
 * Detect potential franchise groups from store data
 * Groups by website first (strongest signal), then by name similarity
 * @param stores - Array of store data
 * @param minLocations - Minimum number of locations for a franchise (default: 2)
 * @param maxLocations - Maximum number of locations for a franchise (default: 100)
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

  // Second pass: group ungrouped stores by EXACT brand name match
  const brandGroups = new Map<string, StoreData[]>();
  
  ungroupedStores.forEach(store => {
    const brand = extractBrandName(store.Name);
    if (!brand || brand.length < 2) return; // Need at least 2 chars for a brand
    
    // Use exact brand match - no fuzzy matching
    if (!brandGroups.has(brand)) {
      brandGroups.set(brand, []);
    }
    brandGroups.get(brand)!.push(store);
  });

  // Convert brand groups to franchise groups with multi-signal verification
  brandGroups.forEach((locations, brand) => {
    if (locations.length >= minLocations && locations.length <= maxLocations) {
      // Additional verification: check if stores share email domain or phone patterns
      const emailDomains = new Set(
        locations
          .map(s => extractEmailDomain(s.Email || ''))
          .filter(d => d && d.length > 3)
      );
      
      const phones = new Set(
        locations
          .map(s => normalizePhone(s.Phone || ''))
          .filter(p => p && p.length >= 10)
      );
      
      // Count matching signals
      const hasCommonEmail = emailDomains.size === 1 && emailDomains.size > 0;
      const hasCommonPhone = phones.size === 1 && phones.size > 0;
      
      // For name-based grouping, require at least one additional signal if locations > 10
      // This prevents over-grouping of common generic names
      const needsAdditionalSignal = locations.length > 10;
      const hasAdditionalSignal = hasCommonEmail || hasCommonPhone;
      
      if (!needsAdditionalSignal || hasAdditionalSignal) {
        franchiseGroups.push({
          brandName: locations[0].Name.split('-')[0].trim(),
          locations,
          matchType: 'name'
        });
      }
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
