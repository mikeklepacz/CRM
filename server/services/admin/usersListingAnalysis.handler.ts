type Deps = {
  googleSheets: {
    readSheetData: (spreadsheetId: string, range: string) => Promise<any[][]>;
  };
  storage: any;
};

export function createUserListingAnalysisHandler(deps: Deps) {
  return async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const user = await deps.storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const sheets = await deps.storage.getAllActiveGoogleSheets((req.user as any).tenantId);
      const trackerSheet = sheets.find((s: any) => s.sheetPurpose === "commissions");

      if (!trackerSheet) {
        return res.json({ protectedCount: 0, releasableCount: 0, protected: [], releasable: [] });
      }

      const trackerRows = await deps.googleSheets.readSheetData(
        trackerSheet.spreadsheetId,
        `${trackerSheet.sheetName}!A:ZZ`
      );

      if (trackerRows.length === 0) {
        return res.json({ protectedCount: 0, releasableCount: 0, protected: [], releasable: [] });
      }

      const headers = trackerRows[0];
      const agentNameIndex = headers.findIndex((h: string) => h.toLowerCase() === "agent name");
      const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === "link");
      const transactionIdIndex = headers.findIndex((h: string) => h.toLowerCase() === "transaction id");
      const nameIndex = headers.findIndex((h: string) => h.toLowerCase() === "name");

      if (agentNameIndex === -1 || linkIndex === -1) {
        return res.status(400).json({ message: "Tracker sheet must have Agent Name and Link columns" });
      }

      const protectedListings: Array<{ link: string; name: string; transactionId: string }> = [];
      const releasable: Array<{ link: string; name: string }> = [];

      for (let i = 1; i < trackerRows.length; i++) {
        const row = trackerRows[i];
        const agentName = row[agentNameIndex] || "";
        const link = row[linkIndex] || "";
        const transactionId = row[transactionIdIndex] || "";
        const name = nameIndex !== -1 ? row[nameIndex] || "" : "";

        if (agentName.toLowerCase().trim() === (user.agentName || "").toLowerCase().trim()) {
          if (transactionId) {
            protectedListings.push({ link, name, transactionId });
          } else {
            releasable.push({ link, name });
          }
        }
      }

      return res.json({
        protectedCount: protectedListings.length,
        releasableCount: releasable.length,
        protected: protectedListings,
        releasable,
      });
    } catch (error: any) {
      console.error("Error analyzing user listings:", error);
      return res.status(500).json({ message: error.message || "Failed to analyze listings" });
    }
  };
}
