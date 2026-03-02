const NEGATION_PATTERNS = [
  /\b(?:no|not|never)\s+emailed\b/,
  /\b(?:hasn't|haven't|didn't|won't|wasn't|weren't)\s+emailed\b/,
  /\b(?:un|non)emailed\b/,
  /\bemailed\s+(?:yet|ever)\b/,
  /\bno\s+one\s+emailed\b/,
];

const POSITIVE_PATTERNS = [
  /\bemailed\b/,
  /\bcontacted\b/,
  /\breached\s+out\b/,
  /\breplied\b/,
];

export function isTrackerContacted(rawStatus: string | null | undefined): boolean {
  if (!rawStatus) return false;

  const normalized = rawStatus
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^\p{L}\p{N}\s'_-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return false;

  if (NEGATION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  return POSITIVE_PATTERNS.some((pattern) => pattern.test(normalized));
}
