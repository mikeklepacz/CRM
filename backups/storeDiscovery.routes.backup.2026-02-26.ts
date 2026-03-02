import type { Express } from "express";
import { normalizeLink } from "../../../shared/linkUtils";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

type Deps = {
  isAuthenticatedCustom: any;
  clearUserCache: (userId: string) => void;
};

export function registerStoreDiscoveryRoutes(app: Express, deps: Deps): void {
  app.get("/api/stores/all/:sheetId", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { sheetId } = req.params;
      const sheet = await storage.getGoogleSheetById(sheetId, req.user.tenantId);
      if (!sheet) {
        return res.status(404).json({ message: "Sheet not found" });
      }

      const range = `${sheet.sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(sheet.spreadsheetId, range);

      if (rows.length === 0) {
        return res.json([]);
      }

      const headers = rows[0];
      const nameIndex = headers.findIndex((h: string) => h.toLowerCase() === "name");
      const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === "link");
      const cityIndex = headers.findIndex((h: string) => h.toLowerCase() === "city");
      const stateIndex = headers.findIndex((h: string) => h.toLowerCase() === "state");
      const addressIndex = headers.findIndex((h: string) => h.toLowerCase() === "address");
      const openIndex = headers.findIndex((h: string) => h.toLowerCase() === "open");

      const stores = rows
        .slice(1)
        .map((row: any[]) => ({
          name: nameIndex !== -1 ? row[nameIndex] || "" : "",
          link: linkIndex !== -1 ? row[linkIndex] || "" : "",
          city: cityIndex !== -1 ? row[cityIndex] || "" : "",
          state: stateIndex !== -1 ? row[stateIndex] || "" : "",
          address: addressIndex !== -1 ? row[addressIndex] || "" : "",
          open: openIndex !== -1 ? row[openIndex] || "" : "",
        }))
        .filter((store: any) => {
          if (!store.link) return false;
          if (store.open && store.open.toLowerCase().trim() === "false") return false;
          return true;
        });

      res.json(stores);
    } catch (error: any) {
      console.error("Error fetching all stores:", error);
      res.status(500).json({ message: error.message || "Failed to fetch stores" });
    }
  });

  app.get("/api/stores/by-dba/:sheetId/:dbaName", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { sheetId, dbaName } = req.params;
      const sheet = await storage.getGoogleSheetById(sheetId, req.user.tenantId);
      if (!sheet) {
        return res.status(404).json({ message: "Sheet not found" });
      }

      const range = `${sheet.sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(sheet.spreadsheetId, range);

      if (rows.length === 0) {
        return res.json([]);
      }

      const headers = rows[0];
      const nameIndex = headers.findIndex((h: string) => h.toLowerCase() === "name");
      const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === "link");
      const cityIndex = headers.findIndex((h: string) => h.toLowerCase() === "city");
      const stateIndex = headers.findIndex((h: string) => h.toLowerCase() === "state");
      const addressIndex = headers.findIndex((h: string) => h.toLowerCase() === "address");
      const dbaIndex = headers.findIndex((h: string) => h.toLowerCase() === "dba");

      if (dbaIndex === -1) {
        return res.status(404).json({ message: "DBA column not found in Store Database" });
      }

      const stores = rows
        .slice(1)
        .filter((row: any[]) => {
          const rowDba = row[dbaIndex] || "";
          return rowDba.toLowerCase().trim() === dbaName.toLowerCase().trim();
        })
        .map((row: any[]) => ({
          name: nameIndex !== -1 ? row[nameIndex] || "" : "",
          link: linkIndex !== -1 ? row[linkIndex] || "" : "",
          city: cityIndex !== -1 ? row[cityIndex] || "" : "",
          state: stateIndex !== -1 ? row[stateIndex] || "" : "",
          address: addressIndex !== -1 ? row[addressIndex] || "" : "",
        }))
        .filter((store: any) => store.link);

      res.json(stores);
    } catch (error: any) {
      console.error("Error fetching stores by DBA:", error);
      res.status(500).json({ message: error.message || "Failed to fetch stores by DBA" });
    }
  });

  app.post("/api/stores/claim-multiple", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const agentName =
        user?.agentName ||
        (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email)?.trim() ||
        "Unknown Agent";
      const { storeLinks, dbaName, storeSheetId, trackerSheetId } = req.body;

      if (!storeLinks || !Array.isArray(storeLinks) || storeLinks.length === 0) {
        return res.status(400).json({ message: "Store links array is required" });
      }
      if (!dbaName || dbaName.trim().length === 0) {
        return res.status(400).json({ message: "DBA name is required" });
      }
      if (!storeSheetId || !trackerSheetId) {
        return res.status(400).json({
          message: "Both Store Database and Commission Tracker sheet IDs are required",
        });
      }

      const storeSheet = await storage.getGoogleSheetById(storeSheetId, req.user.tenantId);
      const trackerSheet = await storage.getGoogleSheetById(trackerSheetId, req.user.tenantId);

      if (!storeSheet || !trackerSheet) {
        return res.status(404).json({ message: "One or both sheets not found" });
      }

      const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, `${storeSheet.sheetName}!A:ZZ`);
      if (storeRows.length === 0) {
        return res.status(404).json({ message: "Store Database is empty" });
      }

      const storeHeaders = storeRows[0];
      const storeLinkIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === "link");
      const storeDbaIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === "dba");
      const storeAgentIndex = storeHeaders.findIndex(
        (h: string) => h.toLowerCase() === "agent name" || h.toLowerCase() === "agent"
      );

      console.log("[CLAIM-MULTIPLE] Store Database headers:", storeHeaders);
      console.log(
        "[CLAIM-MULTIPLE] Column indices - Link:",
        storeLinkIndex,
        "DBA:",
        storeDbaIndex,
        "Agent:",
        storeAgentIndex
      );

      if (storeLinkIndex === -1) {
        return res.status(404).json({ message: "Link column not found in Store Database" });
      }

      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}!A:ZZ`);
      const trackerHeaders = trackerRows.length > 0 ? trackerRows[0] : [];
      const trackerLinkIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === "link");
      const trackerAgentIndex = trackerHeaders.findIndex(
        (h: string) => h.toLowerCase() === "agent" || h.toLowerCase() === "agent name"
      );
      const trackerDbaIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === "dba");

      if (trackerLinkIndex === -1) {
        return res.status(404).json({ message: "Link column not found in Commission Tracker" });
      }

      let updatedTrackerCount = 0;
      let createdTrackerCount = 0;
      let skippedCount = 0;
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const writeDelayMs = 200;

      for (let idx = 0; idx < storeLinks.length; idx++) {
        const storeLink = storeLinks[idx];
        const normalizedLink = normalizeLink(storeLink);

        let trackerRowIndex = -1;
        for (let i = 1; i < trackerRows.length; i++) {
          if (normalizeLink(trackerRows[i][trackerLinkIndex] || "") === normalizedLink) {
            trackerRowIndex = i + 1;
            break;
          }
        }

        if (trackerRowIndex !== -1) {
          if (trackerAgentIndex !== -1) {
            const agentColumnLetter = String.fromCharCode(65 + trackerAgentIndex);
            await googleSheets.writeSheetData(
              trackerSheet.spreadsheetId,
              `${trackerSheet.sheetName}!${agentColumnLetter}${trackerRowIndex}`,
              [[agentName]]
            );
            await delay(writeDelayMs);
          }

          if (trackerDbaIndex !== -1) {
            const dbaColumnLetter = String.fromCharCode(65 + trackerDbaIndex);
            await googleSheets.writeSheetData(
              trackerSheet.spreadsheetId,
              `${trackerSheet.sheetName}!${dbaColumnLetter}${trackerRowIndex}`,
              [[dbaName]]
            );
            await delay(writeDelayMs);
          }

          updatedTrackerCount++;
        } else {
          const newTrackerRow = new Array(trackerHeaders.length).fill("");
          if (trackerLinkIndex !== -1) newTrackerRow[trackerLinkIndex] = storeLink;
          if (trackerAgentIndex !== -1) newTrackerRow[trackerAgentIndex] = agentName;
          if (trackerDbaIndex !== -1) newTrackerRow[trackerDbaIndex] = dbaName;

          const statusIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === "status");
          if (statusIndex !== -1) {
            newTrackerRow[statusIndex] = "Claimed";
          }

          await googleSheets.appendSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}!A:ZZ`, [newTrackerRow]);
          await delay(writeDelayMs);
          createdTrackerCount++;
        }
      }

      deps.clearUserCache(userId);

      res.json({
        message: "Successfully claimed multiple locations in Commission Tracker",
        updatedTrackerCount,
        createdTrackerCount,
        skippedCount,
        total: storeLinks.length,
        warnings: trackerDbaIndex === -1 ? ["DBA column not found in Commission Tracker - DBA not updated"] : [],
      });
    } catch (error: any) {
      console.error("Error claiming multiple stores:", error);
      res.status(500).json({ message: error.message || "Failed to claim stores" });
    }
  });
}
