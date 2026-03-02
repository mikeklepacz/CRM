import { createOrGetBasicTrackerRow, verifyTrackerRowExistsInSheet } from "../../services/trackerRowService";

export async function verifyTrackerRowExists(
  spreadsheetId: string,
  sheetName: string,
  link: string
): Promise<boolean> {
  try {
    return await verifyTrackerRowExistsInSheet(spreadsheetId, sheetName, link);
  } catch (error) {
    console.error("[VERIFY-TRACKER-ROW] Error:", error);
    return false;
  }
}

export async function createBasicTrackerRow(
  spreadsheetId: string,
  sheetName: string,
  link: string,
  agentName: string
): Promise<boolean> {
  try {
    const result = await createOrGetBasicTrackerRow({
      spreadsheetId,
      sheetName,
      link,
      agentName,
    });

    console.log("[CREATE-TRACKER-ROW] Row ready", {
      link,
      rowIndex: result.rowIndex,
      created: result.created,
    });

    return result.rowIndex > 0;
  } catch (error) {
    console.error("[CREATE-TRACKER-ROW] Error:", error);
    return false;
  }
}
