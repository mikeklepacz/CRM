import type { Express } from "express";
import type { EhubOperationsRouteDeps } from "./ehubOperations.types";
import { assertTenantProjectScope } from "../../services/projectScopeValidation";

export function registerEhubOperationsAllContactsRoute(app: Express, deps: EhubOperationsRouteDeps): void {
  app.get('/api/ehub/all-contacts', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const { getAllContacts } = await import('../../services/ehubContactsService');
          const page = parseInt(req.query.page as string) || 1;
          const pageSize = parseInt(req.query.pageSize as string) || 50;
          const search = (req.query.search as string) || '';
          const statusFilter = (req.query.statusFilter as string) || 'all';
          const projectId = (req.query.projectId as string) || undefined;
          const tenantId = (req.user as any).tenantId;
          await assertTenantProjectScope(tenantId, projectId);
          const result = await getAllContacts({
              page,
              pageSize,
              search,
              statusFilter: statusFilter as any,
              tenantId,
              projectId,
          });
          res.json(result);
      }
      catch (error: any) {
          console.error('Error fetching all contacts:', error);
          res.status(500).json({ message: error.message || 'Failed to fetch contacts' });
      }
  });
}
