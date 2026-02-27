import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export async function handleStoreSearch(req: any, res: any): Promise<any> {
  try {
    const { searchTerm } = req.body;

    if (!searchTerm || searchTerm.trim().length === 0) {
      return res.status(400).json({ message: "Search term is required" });
    }

    const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
    const storeSheet = sheets.find((s) => s.sheetPurpose === "Store Database");

    if (!storeSheet) {
      return res.status(404).json({ message: "Store Database sheet not found" });
    }

    const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, `${storeSheet.sheetName}!A:ZZ`);

    if (storeRows.length === 0) {
      return res.json({ stores: [] });
    }

    const storeHeaders = storeRows[0];
    const nameIndex = storeHeaders.findIndex((h) => h.toLowerCase() === "name");
    const dbaIndex = storeHeaders.findIndex((h) => h.toLowerCase() === "dba");
    const linkIndex = storeHeaders.findIndex((h) => h.toLowerCase() === "link");
    const agentIndex = storeHeaders.findIndex((h) => h.toLowerCase() === "agent name");
    const addressIndex = storeHeaders.findIndex((h) => h.toLowerCase() === "address");
    const cityIndex = storeHeaders.findIndex((h) => h.toLowerCase() === "city");
    const stateIndex = storeHeaders.findIndex((h) => h.toLowerCase() === "state");

    const searchLower = searchTerm.toLowerCase().trim();

    const matchingStores = storeRows
      .slice(1)
      .map((row, index) => {
        const name = nameIndex !== -1 ? row[nameIndex] || "" : "";
        const dba = dbaIndex !== -1 ? row[dbaIndex] || "" : "";
        const link = linkIndex !== -1 ? row[linkIndex] || "" : "";
        const agentName = agentIndex !== -1 ? row[agentIndex] || "" : "";
        const address = addressIndex !== -1 ? row[addressIndex] || "" : "";
        const city = cityIndex !== -1 ? row[cityIndex] || "" : "";
        const state = stateIndex !== -1 ? row[stateIndex] || "" : "";

        const nameMatch = name.toLowerCase().includes(searchLower);
        const dbaMatch = dba.toLowerCase().includes(searchLower);

        if (nameMatch || dbaMatch) {
          return {
            rowIndex: index + 2,
            name,
            dba,
            link,
            agentName,
            address,
            city,
            state,
            isAssigned: !!agentName,
          };
        }

        return null;
      })
      .filter((store) => store !== null);

    res.json({ stores: matchingStores, storeSheetId: storeSheet.id });
  } catch (error: any) {
    console.error("Error searching stores:", error);
    res.status(500).json({ message: error.message || "Failed to search stores" });
  }
}
