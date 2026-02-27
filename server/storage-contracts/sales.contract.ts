import type {
  Client,
  Order,
  InsertOrder,
  Commission,
  InsertCommission,
  CsvUpload,
  InsertCsvUpload,
  GoogleSheet,
  InsertGoogleSheet,
} from "./shared-types";

export interface SalesStorageContract {
  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: string, tenantId: string): Promise<Order | undefined>;
  updateOrder(id: string, tenantId: string, updates: Partial<InsertOrder>): Promise<Order>;
  deleteOrder(id: string, tenantId: string): Promise<void>;
  getAllOrders(tenantId: string): Promise<Order[]>;

  // Commission operations
  createCommission(commission: InsertCommission): Promise<Commission>;
  getCommissionsByAgent(agentId: string, tenantId: string): Promise<Commission[]>;
  getCommissionsByOrder(orderId: string, tenantId: string): Promise<Commission[]>;
  deleteCommissionsByOrder(orderId: string, tenantId: string): Promise<void>;

  // CSV Upload operations
  createCsvUpload(upload: InsertCsvUpload): Promise<CsvUpload>;
  getRecentCsvUploads(limit: number): Promise<CsvUpload[]>;

  // Google Sheets operations
  getAllActiveGoogleSheets(tenantId: string): Promise<GoogleSheet[]>;
  getGoogleSheetById(id: string, tenantId: string): Promise<GoogleSheet | null>;
  getGoogleSheetByPurpose(purpose: string, tenantId: string): Promise<GoogleSheet | null>;
  createGoogleSheetConnection(connection: InsertGoogleSheet): Promise<GoogleSheet>;
  disconnectGoogleSheet(id: string): Promise<void>;
  updateGoogleSheetLastSync(id: string): Promise<void>;
  getClientByUniqueIdentifier(uniqueId: string): Promise<Client | undefined>;

}
