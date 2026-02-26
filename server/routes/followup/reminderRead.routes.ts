import type { Express } from "express";
import { storage } from "../../storage";

export function registerReminderReadRoutes(app: Express): void {
  // Get all reminders for the current user (with optional agent filtering for admins)
  app.get('/api/reminders', async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { agentIds } = req.query;

      // Get current user details for agent filtering
      const currentUser = await storage.getUserById(userId);
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // SECURITY: Determine which agents' data to show
      let allowedUserIds: string[] = [];
      const isAgent = currentUser.role === 'agent';

      if (isAgent) {
        // SECURITY: Agents can ONLY see their own reminders - ignore any agentIds parameter
        allowedUserIds = [userId];
      } else {
        // Admin: Use agentIds from query params or default to current user
        const requestedAgentIds = agentIds ? (Array.isArray(agentIds) ? agentIds : [agentIds]) : [userId];

        allowedUserIds = requestedAgentIds;
      }

      // Fetch reminders for allowed users
      const tenantId = req.user.tenantId;
      let allReminders: any[] = [];
      for (const uid of allowedUserIds) {
        const userReminders = await storage.getRemindersByUser(uid, tenantId);

        // Fetch user info to add agentName to each reminder
        const reminderUser = await storage.getUserById(uid);
        if (!reminderUser) {
          continue; // Skip if user not found
        }

        const agentName =
          reminderUser.agentName || `${reminderUser.firstName || ''} ${reminderUser.lastName || ''}`.trim() || 'Unknown';

        // Enrich reminders with agent info
        const enrichedReminders = userReminders.map((r) => ({
          ...r,
          agentId: uid,
          agentName,
        }));

        allReminders = allReminders.concat(enrichedReminders);
      }

      // Sort chronologically using proper datetime comparison
      allReminders.sort((a, b) => {
        // Construct ISO datetime strings (YYYY-MM-DDTHH:MM format)
        const aDateTime = `${a.scheduledDate || '9999-12-31'}T${a.scheduledTime || '23:59'}`;
        const bDateTime = `${b.scheduledDate || '9999-12-31'}T${b.scheduledTime || '23:59'}`;

        // Compare as Date objects for proper chronological ordering
        const aDate = new Date(aDateTime);
        const bDate = new Date(bDateTime);

        // Handle invalid dates by treating them as far future
        const aTime = isNaN(aDate.getTime()) ? Infinity : aDate.getTime();
        const bTime = isNaN(bDate.getTime()) ? Infinity : bDate.getTime();

        return aTime - bTime;
      });

      res.json({ reminders: allReminders });
    } catch (error: any) {
      console.error('Error fetching reminders:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch reminders' });
    }
  });

  // Get reminders for a specific client
  app.get('/api/reminders/client/:clientId', async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { clientId } = req.params;
      const reminders = await storage.getRemindersByClient(clientId, tenantId);

      // Filter by user (security check)
      const userReminders = reminders.filter((r) => r.userId === userId);
      res.json({ reminders: userReminders });
    } catch (error: any) {
      console.error('Error fetching client reminders:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch client reminders' });
    }
  });

  // Get reminders for a specific date
  app.get('/api/reminders/by-date/:date', async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { date } = req.params; // Expected format: YYYY-MM-DD

      // Get all user's reminders
      const allReminders = await storage.getRemindersByUser(userId, tenantId);

      // Filter by date
      const dateReminders = allReminders.filter((r) => r.scheduledDate === date && r.isActive);

      // Sort by time
      const sortedReminders = dateReminders.sort((a, b) => {
        if (a.scheduledTime && b.scheduledTime) {
          return a.scheduledTime.localeCompare(b.scheduledTime);
        }
        return 0;
      });

      res.json({ reminders: sortedReminders });
    } catch (error: any) {
      console.error('Error fetching reminders by date:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch reminders by date' });
    }
  });
}
