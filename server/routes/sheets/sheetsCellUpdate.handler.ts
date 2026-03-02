import { normalizeLink } from "../../../shared/linkUtils";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export async function handleSheetsCellUpdate(req: any, res: any, deps: any): Promise<any> {
  try {
    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const { id } = req.params;
    const { rowIndex, column, value } = req.body;

    if (!rowIndex || !column) {
      return res.status(400).json({ message: "Row index and column are required" });
    }

    const sheet = await storage.getGoogleSheetById(id, req.user.tenantId);
    if (!sheet) {
      return res.status(404).json({ message: "Google Sheet not found" });
    }

    const { spreadsheetId, sheetName } = sheet;
    const headerRange = `${sheetName}!1:1`;
    const headerRows = await googleSheets.readSheetData(spreadsheetId, headerRange);
    const headers = headerRows[0] || [];
    const columnIndex = headers.findIndex((h) => h.toLowerCase() === column.toLowerCase());

    if (columnIndex === -1) {
      console.log(`[CELL UPDATE] Column "${column}" not found in sheet ${sheetName}, skipping update`);
      return res.json({ message: `Column "${column}" skipped (not found in sheet)`, skipped: true });
    }

    const user = await storage.getUser(userId);
    if (user && user.role !== "admin" && user.agentName) {
      const rowRange = `${sheetName}!A${rowIndex}:ZZ${rowIndex}`;
      const rowData = await googleSheets.readSheetData(spreadsheetId, rowRange);
      if (rowData.length > 0) {
        const row = rowData[0];
        const linkIndex = headers.findIndex((h) => h.toLowerCase() === "link");
        if (linkIndex !== -1 && row[linkIndex]) {
          const linkValue = row[linkIndex];
          const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
          const trackerSheet = sheets.find((s) => s.sheetPurpose === "commissions");

          if (trackerSheet) {
            const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
            const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

            if (trackerRows.length > 0) {
              const trackerHeaders = trackerRows[0];
              const trackerLinkIndex = trackerHeaders.findIndex((h) => h.toLowerCase() === "link");
              const trackerAgentIndex = trackerHeaders.findIndex((h) => h.toLowerCase() === "agent name");

              let existingTrackerRow = -1;
              const normalizedInputLink = normalizeLink(linkValue);
              for (let i = 1; i < trackerRows.length; i++) {
                const rowLink = trackerRows[i][trackerLinkIndex];
                if (rowLink && normalizeLink(rowLink) === normalizedInputLink) {
                  existingTrackerRow = i + 1;
                  break;
                }
              }

              if (existingTrackerRow > 0) {
                if (trackerAgentIndex !== -1) {
                  const agentColLetter = String.fromCharCode(65 + trackerAgentIndex);
                  const agentCellRange = `${trackerSheet.sheetName}!${agentColLetter}${existingTrackerRow}`;
                  await googleSheets.writeSheetData(trackerSheet.spreadsheetId, agentCellRange, [[user.agentName]]);
                }
              } else {
                const newTrackerRow = new Array(trackerHeaders.length).fill("");
                if (trackerLinkIndex !== -1) newTrackerRow[trackerLinkIndex] = linkValue;
                if (trackerAgentIndex !== -1) newTrackerRow[trackerAgentIndex] = user.agentName;
                await googleSheets.appendSheetData(
                  trackerSheet.spreadsheetId,
                  `${trackerSheet.sheetName}`,
                  [newTrackerRow]
                );
              }
            }
          }
        }
      }
    }

    const columnLetter = String.fromCharCode(65 + columnIndex);
    const cellRange = `${sheetName}!${columnLetter}${rowIndex}`;
    await googleSheets.writeSheetData(spreadsheetId, cellRange, [[value]]);

    deps.clearUserCache(userId);
    res.json({ message: "Cell updated successfully" });
  } catch (error: any) {
    console.error("Error updating cell:", error);
    res.status(500).json({ message: error.message || "Failed to update cell" });
  }
}
