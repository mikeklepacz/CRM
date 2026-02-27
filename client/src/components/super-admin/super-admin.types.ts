export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  userCount?: number;
  settings?: {
    allowedModules?: string[];
    enabledModules?: string[];
    companyName?: string;
    timezone?: string;
  };
}

export interface TenantMembership {
  tenantId: string;
  tenantName: string;
  roleInTenant: string;
}

export interface UserWithMemberships {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  agentName: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  hasVoiceAccess: boolean;
  tenantMemberships: TenantMembership[];
}

export interface Metrics {
  totalTenants: number;
  totalUsers: number;
  totalClients: number;
  activeTenants: number;
}

export interface SuperAdminTicket {
  id: string;
  tenantId: string;
  tenantName?: string;
  userId: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  isUnreadByAdmin: boolean;
  isUnreadByUser: boolean;
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
  userName?: string;
}

export interface TicketReply {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

export interface TenantDetails {
  tenant: Tenant & {
    settings?: {
      allowedModules?: string[];
      enabledModules?: string[];
      companyName?: string;
      timezone?: string;
    };
  };
  stats: {
    userCount: number;
    clientCount: number;
    callCount: number;
  };
}

export type SortField = "name" | "email" | "tenants" | null;
export type SortDirection = "asc" | "desc";
