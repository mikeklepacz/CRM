export function extractDomain(input: string | undefined | null): string | null {
  if (!input) return null;

  const trimmed = input.trim().replace(/^['\"]+|['\"]+$/g, "");
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const hostname = parsed.hostname.replace(/^www\./, "").trim().toLowerCase();
    return hostname || null;
  } catch {
    const fallback = trimmed
      .replace(/^(https?:\/\/)?(www\.)?/i, "")
      .split("/")[0]
      .trim()
      .toLowerCase();

    // Reject obvious non-domains produced by malformed input (e.g. "https:")
    if (!fallback || fallback.endsWith(":")) return null;
    return fallback;
  }
}
