import type { Express } from "express";
import { registerAdminUsersLegacyRoutes } from "../admin/usersLegacy.routes";
import { registerSalesReportsRoutes } from "../sales/reports.routes";
import {
  createDeactivateUserHandler,
  createDeleteUserHandler,
  createReactivateUserHandler,
} from "../../services/admin/usersLifecycleHandlers.service";
import { createUserListingAnalysisHandler } from "../../services/admin/usersListingAnalysis.handler";
import {
  createCreateUserHandler,
  createGetAgentsHandler,
  createListUsersHandler,
  createResetUserPasswordHandler,
  createUpdateVoiceAccessHandler,
} from "../../services/admin/usersLegacyCoreHandlers.service";

type Deps = {
  bcrypt: any;
  db: any;
  eq: any;
  getCurrentUser: any;
  googleSheets: any;
  isAdmin: any;
  isAuthenticatedCustom: any;
  storage: any;
  users: any;
};

export function registerAdminModuleRoutes(app: Express, deps: Deps): void {
  const handleGetAgents = createGetAgentsHandler(deps.storage);
  const handleListUsers = createListUsersHandler(deps.storage);
  const handleCreateUser = createCreateUserHandler({
    bcrypt: deps.bcrypt,
    storage: deps.storage,
  });
  const handleUpdateVoiceAccess = createUpdateVoiceAccessHandler({
    db: deps.db,
    eq: deps.eq,
    users: deps.users,
  });
  const handleResetUserPassword = createResetUserPasswordHandler({
    bcrypt: deps.bcrypt,
    db: deps.db,
    eq: deps.eq,
    storage: deps.storage,
    users: deps.users,
  });
  const handleUserListingAnalysis = createUserListingAnalysisHandler({
    googleSheets: deps.googleSheets,
    storage: deps.storage,
  });
  const handleDeactivateUser = createDeactivateUserHandler({
    googleSheets: deps.googleSheets,
    storage: deps.storage,
  });
  const handleReactivateUser = createReactivateUserHandler(deps.storage);
  const handleDeleteUser = createDeleteUserHandler(deps.storage);

  registerSalesReportsRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    isAdmin: deps.isAdmin,
    getCurrentUser: deps.getCurrentUser,
  });

  registerAdminUsersLegacyRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    handleCreateUser,
    handleDeactivateUser,
    handleDeleteUser,
    handleGetAgents,
    handleListUsers,
    handleReactivateUser,
    handleResetUserPassword,
    handleUpdateVoiceAccess,
    handleUserListingAnalysis,
  });
}
