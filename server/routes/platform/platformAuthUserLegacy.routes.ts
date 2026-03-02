import type { Express } from "express";

type Deps = {
  isAuthenticatedCustom: any;
  handleAuthLogin: any;
  handleAuthRegister: any;
  handleEvents: any;
  handleAuthUser: any;
  handleUserProfileUpdate: any;
  handleUserPasswordUpdate: any;
  handleUserGmailSettingsUpdate: any;
  handleUserPreferencesGet: any;
  handleUserPreferencesUpdate: any;
  handleUserUploadLoadingLogo: any;
};

export function registerPlatformAuthUserLegacyRoutes(app: Express, deps: Deps): void {
  app.post("/api/auth/login", deps.handleAuthLogin);
  app.post("/api/auth/register", deps.handleAuthRegister);
  app.get("/api/events", deps.isAuthenticatedCustom, deps.handleEvents);
  app.get("/api/auth/user", deps.isAuthenticatedCustom, deps.handleAuthUser);
  app.put("/api/user/profile", deps.isAuthenticatedCustom, deps.handleUserProfileUpdate);
  app.put("/api/user/password", deps.isAuthenticatedCustom, deps.handleUserPasswordUpdate);
  app.put("/api/user/gmail-settings", deps.isAuthenticatedCustom, deps.handleUserGmailSettingsUpdate);
  app.get("/api/user/preferences", deps.isAuthenticatedCustom, deps.handleUserPreferencesGet);
  app.put("/api/user/preferences", deps.isAuthenticatedCustom, deps.handleUserPreferencesUpdate);
  app.post("/api/user/upload-loading-logo", deps.isAuthenticatedCustom, deps.handleUserUploadLoadingLogo);
}
