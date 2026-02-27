export function extractFolderId(input: string): string {
  if (/^[a-zA-Z0-9_-]+$/.test(input)) {
    return input;
  }

  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /\/drive\/folders\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }

  throw new Error("Invalid Drive folder URL. Please provide a valid Google Drive folder link or ID.");
}
