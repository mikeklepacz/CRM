import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { buildSheetRange } from "../../services/sheets/a1Range";

export async function handleStoreSearchManual(req: any, res: any): Promise<any> {
  try {
    const { query, sheetId } = req.body;

    if (!query || query.trim().length < 2) {
      return res.json({ stores: [] });
    }

    const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
    const sheet = sheets.find((s) => s.id === sheetId);

    if (!sheet) {
      return res.status(404).json({ message: "Sheet not found" });
    }

    const rows = await googleSheets.readSheetData(sheet.spreadsheetId, buildSheetRange(sheet.sheetName, "A:ZZ"));

    if (rows.length === 0) {
      return res.json({ stores: [] });
    }

    const headers = rows[0];
    const nameIndex = headers.findIndex((h: string) => h.toLowerCase() === "store name");
    const addressIndex = headers.findIndex((h: string) => h.toLowerCase() === "address");
    const cityIndex = headers.findIndex((h: string) => h.toLowerCase() === "city");
    const stateIndex = headers.findIndex((h: string) => h.toLowerCase() === "state");
    const phoneIndex = headers.findIndex((h: string) => h.toLowerCase() === "phone");
    const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === "link");

    const searchLower = query.toLowerCase();
    const matchingStores = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = row[nameIndex] || "";
      const address = row[addressIndex] || "";
      const city = row[cityIndex] || "";
      const state = row[stateIndex] || "";
      const phone = row[phoneIndex] || "";
      const link = row[linkIndex] || "";

      if (
        name.toLowerCase().includes(searchLower) ||
        address.toLowerCase().includes(searchLower) ||
        city.toLowerCase().includes(searchLower)
      ) {
        matchingStores.push({
          name,
          address,
          city,
          state,
          phone,
          link,
        });
      }

      if (matchingStores.length >= 20) break;
    }

    res.json({ stores: matchingStores });
  } catch (error: any) {
    console.error("Error searching stores:", error);
    res.status(500).json({ message: error.message || "Failed to search stores" });
  }
}
