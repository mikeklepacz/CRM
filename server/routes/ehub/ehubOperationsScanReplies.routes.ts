import type { Express } from "express";
import type { EhubOperationsRouteDeps } from "./ehubOperations.types";

export function registerEhubOperationsScanRepliesRoute(app: Express, deps: EhubOperationsRouteDeps): void {
  app.post('/api/ehub/scan-replies', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const { gmailReplyScanner } = await import('../../services/gmailReplyScanner');
          const { dryRun = true, waitDays = 3, selectedEmails } = req.body;
          console.log(`[API] Starting reply scan (dryRun: ${dryRun}, waitDays: ${waitDays}, selected: ${selectedEmails?.length || 'all'})`);
          const result = await gmailReplyScanner.scan(waitDays, dryRun, selectedEmails, (req.user as any).tenantId);
          res.json({
              success: true,
              dryRun,
              ...result,
              message: dryRun
                  ? `Preview: ${result.details.filter(d => d.status === 'promoted').length} recipients ready to promote`
                  : `Enrolled ${result.newEnrollments} new contacts, promoted ${result.promoted} to Step 1`,
          });
      }
      catch (error: any) {
          console.error('[API] Error scanning for replies:', error);
          res.status(500).json({
              success: false,
              message: error.message || 'Failed to scan for replies',
          });
      }
  });
}
