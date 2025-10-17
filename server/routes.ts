import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { differenceInMonths } from "date-fns";
import axios from "axios";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Admin middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      req.currentUser = user;
      next();
    } catch (error) {
      res.status(500).json({ message: "Authorization check failed" });
    }
  };

  // Get current user middleware
  const getCurrentUser = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      req.currentUser = user;
      next();
    } catch (error) {
      res.status(500).json({ message: "User fetch failed" });
    }
  };

  // CSV Upload endpoint
  app.post('/api/csv/upload', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { headers, rows, uniqueKey, filename } = req.body;
      const userId = req.user.claims.sub;

      if (!headers || !rows || !uniqueKey) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Create CSV upload record
      await storage.createCsvUpload({
        filename,
        uploadedBy: userId,
        uniqueKey,
        headers,
        rowCount: rows.length,
      });

      // Process rows and upsert clients
      let created = 0;
      let updated = 0;

      for (const row of rows) {
        const uniqueValue = row[uniqueKey];
        if (!uniqueValue) continue;

        // Check if client exists
        const existing = await storage.findClientByUniqueKey(uniqueKey, uniqueValue);

        if (existing) {
          // Update existing client
          await storage.updateClient(existing.id, {
            data: row,
          });
          updated++;
        } else {
          // Create new client
          await storage.createClient({
            data: row,
            status: 'unassigned',
          });
          created++;
        }
      }

      res.json({
        message: "CSV uploaded successfully",
        created,
        updated,
        total: rows.length,
      });
    } catch (error: any) {
      console.error("CSV upload error:", error);
      res.status(500).json({ message: error.message || "Upload failed" });
    }
  });

  // Get all clients (admin only)
  app.get('/api/clients', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: error.message || "Failed to fetch clients" });
    }
  });

  // Get agent's clients
  app.get('/api/clients/my', isAuthenticated, getCurrentUser, async (req: any, res) => {
    try {
      const clients = await storage.getClientsByAgent(req.currentUser.id);
      res.json(clients);
    } catch (error: any) {
      console.error("Error fetching agent clients:", error);
      res.status(500).json({ message: error.message || "Failed to fetch clients" });
    }
  });

  // Claim client
  app.post('/api/clients/:id/claim', isAuthenticated, getCurrentUser, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Check if client exists and is not already claimed
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      if (client.assignedAgent) {
        return res.status(400).json({ message: "Client already claimed" });
      }

      const updated = await storage.claimClient(id, req.currentUser.id);
      res.json(updated);
    } catch (error: any) {
      console.error("Error claiming client:", error);
      res.status(500).json({ message: error.message || "Failed to claim client" });
    }
  });

  // Unclaim client (admin only)
  app.post('/api/clients/:id/unclaim', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.unclaimClient(id);
      res.json(updated);
    } catch (error: any) {
      console.error("Error unclaiming client:", error);
      res.status(500).json({ message: error.message || "Failed to unclaim client" });
    }
  });

  // Get client notes
  app.get('/api/clients/:id/notes', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const notes = await storage.getClientNotes(id);
      res.json(notes);
    } catch (error: any) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: error.message || "Failed to fetch notes" });
    }
  });

  // Add client note
  app.post('/api/clients/:id/notes', isAuthenticated, getCurrentUser, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { content, isFollowUp } = req.body;

      if (!content) {
        return res.status(400).json({ message: "Note content is required" });
      }

      const note = await storage.createNote({
        clientId: id,
        userId: req.currentUser.id,
        content,
        isFollowUp: isFollowUp || false,
      });

      res.json(note);
    } catch (error: any) {
      console.error("Error creating note:", error);
      res.status(500).json({ message: error.message || "Failed to create note" });
    }
  });

  // Get agents (admin only)
  app.get('/api/users/agents', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (error: any) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: error.message || "Failed to fetch agents" });
    }
  });

  // Note: To make a user admin, run this SQL command in the database console:
  // UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

  // Sync WooCommerce orders
  app.post('/api/woocommerce/sync', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const wooUrl = process.env.WOOCOMMERCE_URL;
      const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
      const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

      if (!wooUrl || !consumerKey || !consumerSecret) {
        return res.status(500).json({ message: "WooCommerce credentials not configured" });
      }

      // Fetch orders from WooCommerce
      const response = await axios.get(`${wooUrl}/wp-json/wc/v3/orders`, {
        auth: {
          username: consumerKey,
          password: consumerSecret,
        },
        params: {
          per_page: 100,
          orderby: 'date',
          order: 'desc',
        },
      });

      const orders = response.data;
      let synced = 0;
      let matched = 0;

      for (const order of orders) {
        // Try to find matching client by email or company
        const email = order.billing?.email;
        const company = order.billing?.company;

        let client = null;
        
        if (email) {
          client = await storage.findClientByUniqueKey('Email', email) ||
                   await storage.findClientByUniqueKey('email', email);
        }
        
        if (!client && company) {
          client = await storage.findClientByUniqueKey('Company', company) ||
                   await storage.findClientByUniqueKey('company', company);
        }

        // Create or update order
        const existingOrder = await storage.getOrderById(order.id.toString());
        
        if (existingOrder) {
          await storage.updateOrder(order.id.toString(), {
            clientId: client?.id || null,
            orderNumber: order.number || order.id.toString(),
            billingEmail: email,
            billingCompany: company,
            total: order.total,
            status: order.status,
            orderDate: new Date(order.date_created),
          });
        } else {
          await storage.createOrder({
            id: order.id.toString(),
            clientId: client?.id || null,
            orderNumber: order.number || order.id.toString(),
            billingEmail: email,
            billingCompany: company,
            total: order.total,
            status: order.status,
            orderDate: new Date(order.date_created),
          });
        }

        synced++;

        // Update client if matched
        if (client) {
          matched++;
          const orderDate = new Date(order.date_created);
          const orderTotal = parseFloat(order.total);
          
          // Update order dates and totals
          const updates: any = {
            lastOrderDate: orderDate,
            totalSales: (parseFloat(client.totalSales || '0') + orderTotal).toString(),
          };

          if (!client.firstOrderDate || new Date(client.firstOrderDate) > orderDate) {
            updates.firstOrderDate = orderDate;
          }

          // Calculate commission if client is claimed
          if (client.assignedAgent && client.claimDate) {
            const monthsSinceClaim = differenceInMonths(orderDate, new Date(client.claimDate));
            const rate = monthsSinceClaim < 6 ? 0.25 : 0.10;
            const commission = orderTotal * rate;
            updates.commissionTotal = (parseFloat(client.commissionTotal || '0') + commission).toString();
          }

          await storage.updateClient(client.id, updates);
        }
      }

      res.json({
        message: "WooCommerce sync completed",
        synced,
        matched,
        total: orders.length,
      });
    } catch (error: any) {
      console.error("WooCommerce sync error:", error);
      res.status(500).json({ 
        message: error.response?.data?.message || error.message || "Sync failed" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
