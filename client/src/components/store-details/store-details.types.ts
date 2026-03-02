export interface StoreDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: any;
  trackerSheetId: string | undefined;
  storeSheetId: string | undefined;
  currentColors: any;
  refetch: () => Promise<any>;
  franchiseContext?: {
    brandName: string;
    allLocations: any[];
  };
  statusOptions: string[];
  statusColors: { [status: string]: { background: string; text: string } };
  contextUpdateTrigger: number;
  setContextUpdateTrigger: (value: number | ((prev: number) => number)) => void;
  loadDefaultScriptTrigger: number;
  allVisibleStores?: any[];
  onNavigateToStore?: (row: any) => void;
}
