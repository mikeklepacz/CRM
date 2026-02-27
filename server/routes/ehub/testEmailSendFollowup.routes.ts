import type { Express } from "express";
import type { TestEmailRouteDeps } from "./testEmail.types";
import { handleTestEmailSendFollowup } from "./testEmailSendFollowup.handler";

export function registerTestEmailSendFollowupRoute(app: Express, deps: TestEmailRouteDeps): void {
  app.post("/api/test-email/send-followup/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleTestEmailSendFollowup(req, res);
  });
}
