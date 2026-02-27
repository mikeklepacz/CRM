export function extractDomain(website: string | undefined): string | undefined {
  if (!website) {
    return undefined;
  }

  try {
    const parsed = new URL(website.startsWith("http") ? website : `https://${website}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return website.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  }
}
