export function parseSheetDataToObjects(rows: any[][], uniqueIdentifierColumn: string) {
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((h: string) => h?.toString().trim() || "");
  const uniqueIdIndex = headers.findIndex((h: string) => h === uniqueIdentifierColumn);

  if (uniqueIdIndex === -1) {
    throw new Error(`Unique identifier column "${uniqueIdentifierColumn}" not found in sheet headers`);
  }

  const parsed = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const uniqueId = row[uniqueIdIndex]?.toString().trim();

    if (!uniqueId) {
      continue;
    }

    const data: Record<string, any> = {};
    headers.forEach((header: string, index: number) => {
      if (header) {
        data[header] = row[index] !== undefined ? row[index] : "";
      }
    });

    parsed.push({
      uniqueId,
      rowIndex: i + 1,
      data,
    });
  }

  return parsed;
}

export function convertObjectsToSheetRows(headers: string[], objects: Array<Record<string, any>>) {
  return objects.map((obj) => {
    return headers.map((header) => {
      return obj[header] !== undefined ? obj[header] : "";
    });
  });
}
