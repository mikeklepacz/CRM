import type { Express } from "express";
import { storage } from "../../storage";

type Deps = {
  isAuthenticated: any;
};

export function registerOrganizationInvitesRoutes(app: Express, deps: Deps): void {
  app.post("/api/invites/:token/accept", deps.isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;
      const userId = req.user.id;

      await storage.acceptTenantInvite(token, userId);
      res.json({ success: true, message: "Successfully joined the organization" });
    } catch (error: any) {
      console.error("Error accepting invite:", error);
      res.status(400).json({ message: error.message || "Failed to accept invite" });
    }
  });

  app.get("/api/invites/:token", async (req: any, res) => {
    try {
      const { token } = req.params;
      const invite = await storage.getTenantInviteByToken(token);

      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }

      if (invite.status !== "pending") {
        return res.status(400).json({ message: `Invite has been ${invite.status}` });
      }

      if (new Date() > invite.expiresAt) {
        return res.status(400).json({ message: "Invite has expired" });
      }

      const tenant = await storage.getTenantById(invite.tenantId);
      res.json({
        invite: {
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
          tenantName: tenant?.name || "Unknown Organization",
        },
      });
    } catch (error: any) {
      console.error("Error getting invite details:", error);
      res.status(500).json({ message: error.message || "Failed to get invite details" });
    }
  });
}
