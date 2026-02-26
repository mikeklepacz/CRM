import { storage } from "../../storage";

function assertTenantId(tenantId: string | undefined): string {
  if (!tenantId) {
    throw new Error("Not authenticated");
  }
  return tenantId;
}

export async function listEmailImages(tenantId: string | undefined): Promise<any[]> {
  const scopedTenantId = assertTenantId(tenantId);
  return storage.listEmailImages(scopedTenantId);
}

export async function createEmailImage(params: {
  tenantId: string | undefined;
  url: unknown;
  label: unknown;
}): Promise<any> {
  const scopedTenantId = assertTenantId(params.tenantId);
  const url = typeof params.url === "string" ? params.url.trim() : "";
  const label = typeof params.label === "string" ? params.label.trim() : "";

  if (!url) {
    throw new Error("A valid URL is required");
  }
  if (!label) {
    throw new Error("A label is required");
  }
  if (label.length > 255) {
    throw new Error("Label is too long");
  }

  return storage.createEmailImage({
    tenantId: scopedTenantId,
    url,
    label,
  });
}

export async function deleteEmailImage(params: {
  tenantId: string | undefined;
  id: string;
}): Promise<boolean> {
  const scopedTenantId = assertTenantId(params.tenantId);
  return storage.deleteEmailImage(params.id, scopedTenantId);
}
