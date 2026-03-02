import type { Express } from "express";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
  handleGetAgents: any;
  handleListUsers: any;
  handleCreateUser: any;
  handleUpdateVoiceAccess: any;
  handleResetUserPassword: any;
  handleUserListingAnalysis: any;
  handleDeactivateUser: any;
  handleReactivateUser: any;
  handleDeleteUser: any;
};

export function registerAdminUsersLegacyRoutes(app: Express, deps: Deps): void {
  app.get("/api/users/agents", deps.isAuthenticatedCustom, deps.isAdmin, deps.handleGetAgents);
  app.get("/api/users", deps.isAuthenticatedCustom, deps.isAdmin, deps.handleListUsers);
  app.post("/api/users", deps.isAuthenticatedCustom, deps.isAdmin, deps.handleCreateUser);
  app.patch(
    "/api/users/:userId/voice-access",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    deps.handleUpdateVoiceAccess
  );
  app.patch(
    "/api/users/:userId/reset-password",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    deps.handleResetUserPassword
  );
  app.get(
    "/api/users/:userId/listing-analysis",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    deps.handleUserListingAnalysis
  );
  app.post(
    "/api/users/:userId/deactivate",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    deps.handleDeactivateUser
  );
  app.post(
    "/api/users/:userId/reactivate",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    deps.handleReactivateUser
  );
  app.delete(
    "/api/admin/users/:userId",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    deps.handleDeleteUser
  );
}
