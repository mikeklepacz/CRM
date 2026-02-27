import type {
  User,
  UpsertUser,
  Tenant,
  InsertTenant,
} from "./shared-types";

export interface PlatformStorageContract {
  // User operations - Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(userData: Partial<UpsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  createPasswordUser(userData: any): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getAgents(): Promise<User[]>;

  // Tenant operations
  getUserDefaultTenant(userId: string): Promise<{ tenantId: string; roleInTenant: string } | undefined>;
  listTenants(): Promise<Array<Tenant & { userCount: number }>>;
  getTenantById(tenantId: string): Promise<Tenant | undefined>;
  getTenantByIdOrSlug(idOrSlug: string): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  createTenant(data: InsertTenant): Promise<Tenant>;
  updateTenant(tenantId: string, updates: Partial<InsertTenant>): Promise<Tenant>;
  getTenantStats(tenantId: string): Promise<{ userCount: number; clientCount: number; callCount: number }>;

  // Cross-tenant user operations (Super Admin)
  listUsersAcrossTenants(): Promise<Array<User & { tenantMemberships: Array<{ tenantId: string; tenantName: string; roleInTenant: string }> }>>;
  getUserTenantMemberships(userId: string): Promise<Array<{ tenantId: string; tenantName: string; tenantSlug: string; roleInTenant: string; isDefault: boolean }>>;
  getUserTenantRole(userId: string, tenantId: string): Promise<string | null>;
  addUserToTenant(userId: string, tenantId: string, roleInTenant: string, isDefault?: boolean): Promise<void>;
  removeUserFromTenant(userId: string, tenantId: string): Promise<void>;
  getPlatformMetrics(): Promise<{ totalTenants: number; totalUsers: number; totalClients: number; activeTenants: number }>;

  // Org Admin operations
  listTenantUsers(tenantId: string): Promise<Array<User & { roleInTenant: string; joinedAt: Date | null }>>;
  updateUserRoleInTenant(userId: string, tenantId: string, newRole: string): Promise<void>;
  getTenantSettings(tenantId: string): Promise<Tenant['settings']>;
  updateTenantSettings(tenantId: string, settings: Partial<Tenant['settings']>): Promise<Tenant>;

}
