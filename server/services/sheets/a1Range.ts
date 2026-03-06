function escapeSheetName(sheetName: string): string {
  if (sheetName.startsWith("'") && sheetName.endsWith("'")) {
    return sheetName;
  }
  return `'${sheetName.replace(/'/g, "''")}'`;
}

export function buildSheetRange(sheetName: string, range: string): string {
  return `${escapeSheetName(sheetName)}!${range}`;
}

