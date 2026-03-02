export async function findKbFileByFuzzyFilename(filename: string, allFiles?: any[]): Promise<any> {
  const files = allFiles || [];

  const exactMatch = files.find((file) => file.filename === filename);
  if (exactMatch) return exactMatch;

  const normalizedSearch = filename.toLowerCase().trim().replace(/_/g, " ").replace(/\s+/g, " ");

  const fuzzyMatch = files.find((file) => {
    const normalizedFilename = file.filename
      .toLowerCase()
      .trim()
      .replace(/_/g, " ")
      .replace(/\s+/g, " ");
    return normalizedFilename === normalizedSearch;
  });

  return fuzzyMatch || null;
}
