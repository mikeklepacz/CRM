import type { Express } from "express";
import { storage } from "../../storage";

export function registerNotificationsRoutes(app: Express): void {
  // Get all notifications for the current user (with optional agent filtering for admins)
  app.get('/api/notifications', async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { unreadOnly = 'false', agentIds } = req.query;

      // Get current user details for agent filtering
      const currentUser = await storage.getUserById(userId);
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // SECURITY: Determine which agents' data to show
      let allowedUserIds: string[] = [];
      const isAgent = currentUser.role === 'agent';

      if (isAgent) {
        // SECURITY: Agents can ONLY see their own notifications - ignore any agentIds parameter
        allowedUserIds = [userId];
      } else {
        // Admin: Use agentIds from query params or default to current user
        const requestedAgentIds = agentIds ? (Array.isArray(agentIds) ? agentIds : [agentIds]) : [userId];
        allowedUserIds = requestedAgentIds;
      }

      // Fetch notifications for allowed users
      const tenantId = req.user.tenantId;
      let allNotifications: any[] = [];
      for (const uid of allowedUserIds) {
        const userNotifications = await storage.getNotificationsByUser(uid, tenantId);
        allNotifications = allNotifications.concat(userNotifications);
      }

      const filtered = unreadOnly === 'true' ? allNotifications.filter((n) => !n.isRead) : allNotifications;

      // Sort by date (newest first)
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({ notifications: filtered });
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch notifications' });
    }
  });

  // Mark notification as read
  app.put('/api/notifications/:id/read', async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      // Verify ownership
      const existing = await storage.getNotificationById(id, tenantId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      const notification = await storage.markNotificationAsRead(id, tenantId);
      res.json({ notification });
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: error.message || 'Failed to mark notification as read' });
    }
  });

  // Mark notification as resolved
  app.put('/api/notifications/:id/resolve', async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      // Verify ownership
      const existing = await storage.getNotificationById(id, tenantId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      const notification = await storage.markNotificationAsResolved(id, tenantId);
      res.json({ notification });
    } catch (error: any) {
      console.error('Error resolving notification:', error);
      res.status(500).json({ message: error.message || 'Failed to resolve notification' });
    }
  });

  // Delete a notification
  app.delete('/api/notifications/:id', async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      // Verify ownership
      const existing = await storage.getNotificationById(id, tenantId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      await storage.deleteNotification(id, tenantId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: error.message || 'Failed to delete notification' });
    }
  });
}
