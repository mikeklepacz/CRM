export interface GoogleSheet {
  id: string;
  spreadsheetName: string;
  sheetName: string;
  sheetPurpose: string;
}

export interface MergedDataRow {
  [key: string]: any;
  _storeRowIndex?: number;
  _trackerRowIndex?: number;
  _storeSheetId?: string;
  _trackerSheetId?: string;
  _deletedFromStore?: boolean;
  _hasTrackerData?: boolean;
}
