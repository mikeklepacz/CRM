import { storage } from "../../storage";

export async function getTenantByIdOrSlugOr404(tenantIdOrSlug: string, res: any) {
  const tenant = await storage.getTenantByIdOrSlug(tenantIdOrSlug);
  if (!tenant) {
    res.status(404).json({ message: "Tenant not found" });
    return null;
  }
  return tenant;
}

export async function getActiveTenantUsers(tenant: { id: string; slug?: string | null }) {
  let tenantUsers = await storage.listTenantUsers(tenant.id);
  if (tenantUsers.length === 0 && tenant.slug) {
    tenantUsers = await storage.listTenantUsers(tenant.slug);
  }
  return tenantUsers.filter((u) => u.isActive !== false);
}
