import type { Express } from "express";
import type { SuperAdminElevenLabsConfigWebhookDeps as Deps } from "./superAdminElevenLabsConfigWebhook.types";
import { registerSuperAdminElevenLabsConfigGetRoute } from "./superAdminElevenLabsConfigGet.routes";
import { registerSuperAdminElevenLabsConfigPutRoute } from "./superAdminElevenLabsConfigPut.routes";
import { registerSuperAdminDirectElevenLabsConfigGetRoute } from "./superAdminDirectElevenLabsConfigGet.routes";
import { registerSuperAdminDirectElevenLabsConfigPatchRoute } from "./superAdminDirectElevenLabsConfigPatch.routes";
import { registerSuperAdminElevenLabsWebhookStatusRoute } from "./superAdminElevenLabsWebhookStatus.routes";
import { registerSuperAdminElevenLabsRegisterWebhookRoute } from "./superAdminElevenLabsRegisterWebhook.routes";

export function registerSuperAdminElevenLabsConfigWebhookRoutes(
  app: Express,
  deps: Deps
): void {
  registerSuperAdminElevenLabsConfigGetRoute(app, deps);
  registerSuperAdminElevenLabsConfigPutRoute(app, deps);
  registerSuperAdminDirectElevenLabsConfigGetRoute(app, deps);
  registerSuperAdminDirectElevenLabsConfigPatchRoute(app, deps);
  registerSuperAdminElevenLabsWebhookStatusRoute(app, deps);
  registerSuperAdminElevenLabsRegisterWebhookRoute(app, deps);
}
