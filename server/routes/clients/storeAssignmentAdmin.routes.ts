import type { Express } from "express";
import { normalizeLink } from "../../../shared/linkUtils";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

type Deps = {
  isAdmin: any;
  isAuthenticatedCustom: any;
  clearUserCache: (userId: string) => void;
};

export function registerStoreAssignmentAdminRoutes(app: Express, deps: Deps): void {
  app.post("/api/stores/search", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
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
  });

  app.post("/api/stores/bulk-assign", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { storeLinks, agentName } = req.body;

      if (!storeLinks || !Array.isArray(storeLinks) || storeLinks.length === 0) {
        return res.status(400).json({ message: "Store links array is required" });
      }
      if (!agentName || agentName.trim().length === 0) {
        return res.status(400).json({ message: "Agent name is required" });
      }

      const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
      const trackerSheet = sheets.find((s) => s.sheetPurpose === "commissions");

      if (!trackerSheet) {
        return res.status(404).json({ message: "Commission Tracker sheet not found" });
      }

      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}!A:ZZ`);

      if (trackerRows.length === 0) {
        return res.status(404).json({ message: "Commission Tracker sheet is empty" });
      }

      const trackerHeaders = trackerRows[0];
      const agentNameIndex = trackerHeaders.findIndex((h) => h.toLowerCase() === "agent name");
      const linkIndex = trackerHeaders.findIndex((h) => h.toLowerCase() === "link");

      if (agentNameIndex === -1) {
        return res.status(404).json({ message: "Agent Name column not found in Commission Tracker" });
      }
      if (linkIndex === -1) {
        return res.status(404).json({ message: "Link column not found in Commission Tracker" });
      }

      const agentColumnLetter = String.fromCharCode(65 + agentNameIndex);
      const batchUpdates: { range: string; values: any[][] }[] = [];
      let updatedCount = 0;

      trackerRows.slice(1).forEach((row, index) => {
        const rowLink = row[linkIndex] || "";
        const normalizedRowLink = normalizeLink(rowLink.toString().trim());
        const rowIndex = index + 2;

        const matchesAnyLink = storeLinks.some((storeLink) => {
          const normalizedStoreLink = normalizeLink(storeLink.toString().trim());
          return normalizedRowLink === normalizedStoreLink;
        });

        if (matchesAnyLink) {
          batchUpdates.push({
            range: `${trackerSheet.sheetName}!${agentColumnLetter}${rowIndex}`,
            values: [[agentName]],
          });
          updatedCount++;
        }
      });

      if (batchUpdates.length > 0) {
        for (const update of batchUpdates) {
          await googleSheets.writeSheetData(trackerSheet.spreadsheetId, update.range, update.values);
        }
      }

      deps.clearUserCache(userId);

      res.json({
        success: true,
        message: `Successfully assigned ${agentName} to ${updatedCount} store(s) in Commission Tracker`,
        updatedCount,
      });
    } catch (error: any) {
      console.error("Error bulk assigning agent:", error);
      res.status(500).json({ message: error.message || "Failed to bulk assign agent" });
    }
  });
}
