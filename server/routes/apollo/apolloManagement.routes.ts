import type { Express } from "express";
import {
  cleanupInvalidApolloContacts,
  deleteApolloCompanyById,
  deleteApolloContactById,
  hideApolloCompanyById,
  listCompanyContactsWithAutoCleanup,
} from "../../services/apolloManagementService";

export function registerApolloManagementRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
  app.get("/api/apollo/companies/:companyId/contacts-clean", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const projectId = req.query.projectId as string | undefined;
      const contacts = await listCompanyContactsWithAutoCleanup(tenantId, req.params.companyId, projectId);
      res.json(contacts);
    } catch (error: any) {
      console.error("Error getting cleaned company contacts:", error);
      res.status(500).json({ message: error.message || "Failed to get contacts" });
    }
  });

  app.post("/api/apollo/contacts/cleanup-invalid", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const { companyId, projectId } = req.body || {};
      const deleted = await cleanupInvalidApolloContacts(tenantId, companyId, projectId);
      res.json({ deleted });
    } catch (error: any) {
      console.error("Error cleaning invalid Apollo contacts:", error);
      res.status(500).json({ message: error.message || "Failed to cleanup contacts" });
    }
  });

  app.delete("/api/apollo/contacts/:contactId", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
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

  app.patch("/api/apollo/companies/:companyId/hide", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const ok = await hideApolloCompanyById(tenantId, req.params.companyId);
      if (!ok) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error hiding Apollo company:", error);
      res.status(500).json({ message: error.message || "Failed to hide company" });
    }
  });

  app.delete("/api/apollo/companies/:companyId", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const ok = await deleteApolloCompanyById(tenantId, req.params.companyId);
      if (!ok) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting Apollo company:", error);
      res.status(500).json({ message: error.message || "Failed to delete company" });
    }
  });
}
