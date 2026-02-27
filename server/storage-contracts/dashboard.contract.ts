import type {
  User,
  Order,
  WidgetLayout,
  InsertWidgetLayout,
} from "./shared-types";

export interface DashboardStorageContract {
  // Dashboard operations
  getDashboardCardsByRole(role: string): Promise<any[]>;
  getDashboardStats(userId: string, role: string): Promise<any>;

  // Helper methods
  getUserById(id: string): Promise<User | undefined>;
  getOrdersByClient(clientId: string, tenantId: string): Promise<Order[]>;

  // Widget layout operations
  getWidgetLayout(userId: string, dashboardType: string): Promise<WidgetLayout | undefined>;
  saveWidgetLayout(layout: InsertWidgetLayout): Promise<WidgetLayout>;

}
