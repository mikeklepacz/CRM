export interface AgentSalesData {
  agentName: string;
  agentId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  totalOrders: number;
  totalSales: number;
  totalCommission: number;
  orders: Array<{
    id: string;
    orderNumber: string;
    orderDate: string;
    billingCompany: string;
    billingEmail: string;
    total: number;
    commissionType: string;
    commissionAmount: number;
    status: string;
  }>;
}

export interface SalesReportData {
  summary: {
    totalAgents: number;
    totalOrders: number;
    totalRevenue: number;
    totalCommissionsPaid: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
  agents: AgentSalesData[];
}

export interface ReferralCommissionData {
  referringAgentId: string;
  referringAgentName: string;
  totalReferralCommission: number;
}

export interface ReferralCommissionsResponse {
  referralCommissions: ReferralCommissionData[];
}
