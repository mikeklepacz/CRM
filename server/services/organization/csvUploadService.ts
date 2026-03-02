import { storage } from "../../storage";

export async function processCsvUpload(params: {
  body: any;
  tenantId: string;
  userId: string;
}): Promise<{ created: number; total: number; updated: number }> {
  const { body, tenantId, userId } = params;
  const { headers, rows, uniqueKey, filename } = body as {
    headers: string[];
    rows: Array<Record<string, any>>;
    uniqueKey: string;
    filename: string;
  };

  if (!headers || !rows || !uniqueKey) {
    throw new Error("Missing required fields");
  }

  await storage.createCsvUpload({
    tenantId,
    filename,
    uploadedBy: userId,
    uniqueKey,
    headers,
    rowCount: rows.length,
  });

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const uniqueValue = row[uniqueKey];
    if (!uniqueValue) {
      continue;
    }

    const existing = await storage.findClientByUniqueKey(uniqueKey, uniqueValue);
    if (existing) {
      await storage.updateClient(existing.id, tenantId, {
        data: row,
      });
      updated++;
    } else {
      await storage.createClient({
        data: row,
        status: "unassigned",
        tenantId,
      });
      created++;
    }
  }

  return {
    created,
    total: rows.length,
    updated,
  };
}
