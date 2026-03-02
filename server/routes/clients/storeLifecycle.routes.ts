import type { Express } from "express";
import type { StoreLifecycleDeps as Deps } from "./storeLifecycle.types";
import { registerStoreDeleteRoute } from "./storeDelete.routes";
import { registerStatusesHierarchyRoute } from "./statusesHierarchy.routes";

export function registerStoreLifecycleRoutes(app: Express, deps: Deps): void {
  registerStoreDeleteRoute(app, deps);
  registerStatusesHierarchyRoute(app, deps);
}
