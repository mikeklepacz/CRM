import {
  widgetLayouts,
  type InsertWidgetLayout,
  type WidgetLayout,
} from "@shared/schema";
import { db } from "../db";
import { and, eq } from "drizzle-orm";

export async function getWidgetLayoutStorage(
  userId: string,
  dashboardType: string
): Promise<WidgetLayout | undefined> {
  const [layout] = await db
    .select()
    .from(widgetLayouts)
    .where(and(eq(widgetLayouts.userId, userId), eq(widgetLayouts.dashboardType, dashboardType), eq(widgetLayouts.isDefault, true)))
    .limit(1);
  return layout;
}

export async function saveWidgetLayoutStorage(layout: InsertWidgetLayout): Promise<WidgetLayout> {
  if (layout.isDefault) {
    await db
      .update(widgetLayouts)
      .set({ isDefault: false })
      .where(and(eq(widgetLayouts.userId, layout.userId), eq(widgetLayouts.dashboardType, layout.dashboardType || "sales")));
  }

  const [existing] = await db
    .select()
    .from(widgetLayouts)
    .where(and(eq(widgetLayouts.userId, layout.userId), eq(widgetLayouts.dashboardType, layout.dashboardType || "sales"), eq(widgetLayouts.isDefault, true)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(widgetLayouts)
      .set({ ...layout, updatedAt: new Date() } as any)
      .where(eq(widgetLayouts.id, existing.id))
      .returning();
    return updated;
  } else {
    const [newLayout] = await db.insert(widgetLayouts).values(layout as any).returning();
    return newLayout;
  }
}
