import type { Express } from "express";
import { deleteApolloContactById } from "../../services/apolloManagementService";
import type { ApolloManagementDeps } from "./apolloManagement.types";

export function registerApolloContactDeleteRoute(app: Express, deps: ApolloManagementDeps): void {
  app.delete("/api/apollo/contacts/:contactId", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const ok = await deleteApolloContactById(tenantId, req.params.contactId);
      if (!ok) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting Apollo contact:", error);
      res.status(500).json({ message: error.message || "Failed to delete contact" });
    }
  });
}
