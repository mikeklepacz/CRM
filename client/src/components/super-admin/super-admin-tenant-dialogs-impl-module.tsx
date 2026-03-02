import { TenantCreateDialog } from "@/components/super-admin/tenant-dialogs/create-dialog";
import { TenantDetailsDialog } from "@/components/super-admin/tenant-dialogs/details-dialog";
import { TenantEditDialog } from "@/components/super-admin/tenant-dialogs/edit-dialog";
import type { SuperAdminTenantDialogsProps } from "@/components/super-admin/tenant-dialogs/types";

export function SuperAdminTenantDialogs({
  createForm,
  createTenantPending,
  detailsLoading,
  editingAllowedModules,
  editingTenant,
  editForm,
  getStatusBadgeVariant,
  handleCreateSubmit,
  handleEditSubmit,
  isCreateDialogOpen,
  setEditingAllowedModules,
  setEditingTenant,
  setIsCreateDialogOpen,
  setViewingTenantId,
  tenantDetails,
  updateTenantPending,
  viewingTenantId,
}: SuperAdminTenantDialogsProps) {
  return (
    <>
      <TenantCreateDialog
        createForm={createForm}
        createTenantPending={createTenantPending}
        handleCreateSubmit={handleCreateSubmit}
        isCreateDialogOpen={isCreateDialogOpen}
        setIsCreateDialogOpen={setIsCreateDialogOpen}
      />
      <TenantEditDialog
        editingAllowedModules={editingAllowedModules}
        editingTenant={editingTenant}
        editForm={editForm}
        handleEditSubmit={handleEditSubmit}
        setEditingAllowedModules={setEditingAllowedModules}
        setEditingTenant={setEditingTenant}
        updateTenantPending={updateTenantPending}
      />
      <TenantDetailsDialog
        detailsLoading={detailsLoading}
        getStatusBadgeVariant={getStatusBadgeVariant}
        setViewingTenantId={setViewingTenantId}
        tenantDetails={tenantDetails}
        viewingTenantId={viewingTenantId}
      />
    </>
  );
}
