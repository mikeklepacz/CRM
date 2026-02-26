import { storage } from "../../storage";

export async function clearOtherDefaultScriptTemplates(
  userId: string,
  tenantId: string,
  excludeTemplateId?: string
): Promise<void> {
  const existingTemplates = await storage.getUserTemplates(userId, tenantId);

  for (const existing of existingTemplates) {
    if (existing.isDefault && existing.type === "Script" && existing.id !== excludeTemplateId) {
      await storage.updateTemplate(existing.id, tenantId, { isDefault: false });
    }
  }
}
