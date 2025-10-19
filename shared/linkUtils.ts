// ============================================================================
// CRITICAL: Link Normalization Function
// ============================================================================
// DO NOT MODIFY without understanding the full context!
//
// Purpose:
// Ensures two different URL formats match correctly during merge operations:
// - "https://www.leafly.com/dispensary-info/10-collective/"
// - "leafly.com/dispensary-info/10-collective"
// Both normalize to: "leafly.com/dispensary-info/10-collective"
//
// Why This Matters:
// - Store Database may have URLs with http://, https://, www., trailing slashes
// - Commission Tracker may have clean URLs without protocols
// - Without normalization, identical stores won't merge (shown as orphaned)
//
// Normalization Steps:
// 1. Trim whitespace
// 2. Convert to lowercase (case-insensitive matching)
// 3. Remove http:// or https:// protocol
// 4. Remove www. prefix
// 5. Remove trailing slashes
//
// Impact if broken:
// - Stores won't match between sheets even when they're the same
// - Tracker data appears orphaned (_deletedFromStore: true)
// - CRM shows duplicate rows instead of merged data
// ============================================================================
export function normalizeLink(link: string): string {
  if (!link || typeof link !== 'string') return '';
  
  return link
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '') // Remove http:// or https://
    .replace(/^www\./, '')        // Remove www.
    .replace(/\/+$/, '');          // Remove trailing slashes
}
