import { storage } from "../../storage";

export async function handleReminderReadAll(req: any, res: any): Promise<any> {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const { agentIds } = req.query;

    const currentUser = await storage.getUserById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let allowedUserIds: string[] = [];
    const isAgent = currentUser.role === "agent";

    if (isAgent) {
      allowedUserIds = [userId];
    } else {
      const requestedAgentIds = agentIds ? (Array.isArray(agentIds) ? agentIds : [agentIds]) : [userId];
      allowedUserIds = requestedAgentIds;
    }

    const tenantId = req.user.tenantId;
    let allReminders: any[] = [];
    for (const uid of allowedUserIds) {
      const userReminders = await storage.getRemindersByUser(uid, tenantId);

      const reminderUser = await storage.getUserById(uid);
      if (!reminderUser) {
        continue;
      }

      const agentName = reminderUser.agentName || `${reminderUser.firstName || ""} ${reminderUser.lastName || ""}`.trim() || "Unknown";

      const enrichedReminders = userReminders.map((r) => ({
        ...r,
        agentId: uid,
        agentName,
      }));

      allReminders = allReminders.concat(enrichedReminders);
    }

    allReminders.sort((a, b) => {
      const aDateTime = `${a.scheduledDate || "9999-12-31"}T${a.scheduledTime || "23:59"}`;
      const bDateTime = `${b.scheduledDate || "9999-12-31"}T${b.scheduledTime || "23:59"}`;

      const aDate = new Date(aDateTime);
      const bDate = new Date(bDateTime);

      const aTime = isNaN(aDate.getTime()) ? Infinity : aDate.getTime();
      const bTime = isNaN(bDate.getTime()) ? Infinity : bDate.getTime();

      return aTime - bTime;
    });

    res.json({ reminders: allReminders });
  } catch (error: any) {
    console.error("Error fetching reminders:", error);
    res.status(500).json({ message: error.message || "Failed to fetch reminders" });
  }
}
