import type { Express } from "express";
import { getFollowUpCenterDataForUser, isFollowUpCenterError } from "../../services/followup/followupCenterService";

export function registerFollowUpCenterRoutes(
  app: Express,
  deps: { isAuthenticatedCustom: any }
): void {
  app.get("/api/follow-up-center", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const data = await getFollowUpCenterDataForUser(req.user);
      res.json(data);
    } catch (error: any) {
      if (isFollowUpCenterError(error)) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("Error fetching follow-up center data:", error);
      res.status(500).json({ message: error.message || "Failed to fetch follow-up data" });
    }
  });
}
