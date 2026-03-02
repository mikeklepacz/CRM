export type GoogleSheet = {
  id: string;
  name: string;
  modifiedTime: string;
};

export type SheetInfo = {
  properties: {
    title: string;
  };
  sheets: Array<{
    properties: {
      title: string;
      sheetId: number;
    };
  }>;
};

export type ConnectedSheet = {
  id: string;
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  sheetPurpose: string;
  uniqueIdentifierColumn: string;
  lastSyncedAt: string | null;
  syncStatus: string;
  createdAt: string;
};
