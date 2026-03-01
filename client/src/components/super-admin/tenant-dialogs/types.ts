import type { Tenant, TenantDetails } from "@/components/super-admin/super-admin.types";

export type SuperAdminTenantDialogsProps = {
  createForm: any;
  createTenantPending: boolean;
  detailsLoading: boolean;
  editingAllowedModules: string[];
  editingTenant: Tenant | null;
  editForm: any;
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
  handleCreateSubmit: (data: any) => void;
  handleEditSubmit: (data: any) => void;
  isCreateDialogOpen: boolean;
  setEditingAllowedModules: (modules: string[]) => void;
  setEditingTenant: (tenant: Tenant | null) => void;
  setIsCreateDialogOpen: (open: boolean) => void;
  setViewingTenantId: (id: string | null) => void;
  tenantDetails: TenantDetails | undefined;
  updateTenantPending: boolean;
  viewingTenantId: string | null;
};
