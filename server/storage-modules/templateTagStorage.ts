import {
  templates,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export async function getAllTemplateTagsStorage(tenantId: string): Promise<string[]> {
  const allTemplates = await db.select().from(templates).where(eq(templates.tenantId, tenantId));
  const tagsSet = new Set<string>();

  allTemplates.forEach((template) => {
    if (template.tags && Array.isArray(template.tags)) {
      template.tags.forEach((tag) => {
        if (tag && tag.trim()) {
          tagsSet.add(tag.trim());
        }
      });
    }
  });

  return Array.from(tagsSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}
