import type { Express } from "express";
import type { ElevenLabsConfigWebhookAdminDeps as Deps } from "./elevenLabsConfigWebhookAdmin.types";
import { registerElevenLabsConfigGetRoute } from "./elevenLabsConfigGet.routes";
import { registerElevenLabsConfigPutRoute } from "./elevenLabsConfigPut.routes";
import { registerElevenLabsRegisterWebhookRoute } from "./elevenLabsRegisterWebhook.routes";
import { registerElevenLabsWebhookStatusRoute } from "./elevenLabsWebhookStatus.routes";

export function registerCallManagerElevenLabsConfigWebhookAdminRoutes(
  app: Express,
  deps: Deps
): void {
  registerElevenLabsConfigGetRoute(app, deps);
  registerElevenLabsConfigPutRoute(app, deps);
  registerElevenLabsRegisterWebhookRoute(app, deps);
  registerElevenLabsWebhookStatusRoute(app, deps);
}
