import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getOidcConfig } from "./replitAuth";
import { differenceInMonths } from "date-fns";
import axios from "axios";
import bcrypt from "bcrypt";
import * as client from "openid-client";
import * as googleSheets from "./googleSheets";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Username/Password Authentication Routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create session using passport's login
      req.login({ id: user.id, isPasswordAuth: true }, (err: any) => {
        if (err) {
          console.error("Session creation error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        // Explicitly save session before responding
        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Session save failed" });
          }
          console.log("Session saved successfully for user:", user.id);
          console.log("Session ID:", req.sessionID);
          console.log("Session data:", req.session);
          res.json({ message: "Login successful", user: { id: user.id, username: user.username, role: user.role } });
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password, email } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createPasswordUser({
        username,
        passwordHash,
        email: email || `${username}@example.com`,
        firstName: username,
        lastName: "",
      });

      res.json({ message: "Registration successful", user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Custom authentication middleware that supports both Replit Auth and username/password
  const isAuthenticatedCustom = async (req: any, res: any, next: any) => {
    console.log("Auth check - isAuthenticated:", req.isAuthenticated());
    console.log("Auth check - session:", req.session);
    console.log("Auth check - user:", req.user);
    
    // Check if user is authenticated at all
    if (!req.isAuthenticated()) {
      console.log("Auth failed: not authenticated");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = req.user as any;

    // Check if using password auth - it's valid as long as session exists
    if (user.isPasswordAuth) {
      console.log("Auth success: password auth user");
      return next();
    }
    
    // Using Replit Auth - check token expiry
    if (!user || !user.expires_at) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      return next();
    }

    // Try to refresh Replit Auth token
    const refreshToken = user.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      
      user.claims = tokenResponse.claims();
      user.access_token = tokenResponse.access_token;
      user.refresh_token = tokenResponse.refresh_token;
      user.expires_at = user.claims?.exp;
      
      return next();
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  };

  // Auth routes
  app.get('/api/auth/user', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
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
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
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
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
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
  app.post('/api/csv/upload', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
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
  app.get('/api/clients', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: error.message || "Failed to fetch clients" });
    }
  });

  // Get agent's clients
  app.get('/api/clients/my', isAuthenticatedCustom, getCurrentUser, async (req: any, res) => {
    try {
      const clients = await storage.getClientsByAgent(req.currentUser.id);
      res.json(clients);
    } catch (error: any) {
      console.error("Error fetching agent clients:", error);
      res.status(500).json({ message: error.message || "Failed to fetch clients" });
    }
  });

  // Claim client
  app.post('/api/clients/:id/claim', isAuthenticatedCustom, getCurrentUser, async (req: any, res) => {
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
  app.post('/api/clients/:id/unclaim', isAuthenticatedCustom, isAdmin, async (req, res) => {
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
  app.get('/api/clients/:id/notes', isAuthenticatedCustom, async (req, res) => {
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
  app.post('/api/clients/:id/notes', isAuthenticatedCustom, getCurrentUser, async (req: any, res) => {
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
  app.get('/api/users/agents', isAuthenticatedCustom, isAdmin, async (req, res) => {
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
  app.post('/api/woocommerce/sync', isAuthenticatedCustom, isAdmin, async (req, res) => {
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

  // ========== GOOGLE SHEETS ROUTES ==========

  // List user's Google Sheets
  app.get('/api/sheets/list', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const sheets = await googleSheets.listSpreadsheets();
      res.json(sheets);
    } catch (error: any) {
      console.error("Error listing sheets:", error);
      res.status(500).json({ message: error.message || "Failed to list sheets" });
    }
  });

  // Get spreadsheet info (sheets/tabs)
  app.get('/api/sheets/:spreadsheetId/info', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const { spreadsheetId } = req.params;
      const info = await googleSheets.getSpreadsheetInfo(spreadsheetId);
      res.json(info);
    } catch (error: any) {
      console.error("Error getting sheet info:", error);
      res.status(500).json({ message: error.message || "Failed to get sheet info" });
    }
  });

  // Get active Google Sheet connection
  app.get('/api/sheets/active', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const activeSheet = await storage.getActiveGoogleSheet();
      res.json(activeSheet);
    } catch (error: any) {
      console.error("Error getting active sheet:", error);
      res.status(500).json({ message: error.message || "Failed to get active sheet" });
    }
  });

  // Connect a Google Sheet
  app.post('/api/sheets/connect', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const { spreadsheetId, spreadsheetName, sheetName, uniqueIdentifierColumn } = req.body;

      if (!spreadsheetId || !sheetName || !uniqueIdentifierColumn) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify sheet exists and has the identifier column
      const range = `${sheetName}!A1:ZZ1`;
      const headers = await googleSheets.readSheetData(spreadsheetId, range);
      
      if (!headers || headers.length === 0) {
        return res.status(400).json({ message: "Sheet is empty or not found" });
      }

      const headerRow = headers[0];
      const hasIdentifier = headerRow.some((h: string) => 
        h.toLowerCase() === uniqueIdentifierColumn.toLowerCase()
      );

      if (!hasIdentifier) {
        return res.status(400).json({ 
          message: `Column "${uniqueIdentifierColumn}" not found in sheet. Available columns: ${headerRow.join(', ')}` 
        });
      }

      const userId = req.user.id;

      // Deactivate any existing active sheet
      await storage.deactivateAllGoogleSheets();

      // Create new connection
      const connection = await storage.createGoogleSheetConnection({
        spreadsheetId,
        spreadsheetName: spreadsheetName || spreadsheetId,
        sheetName,
        uniqueIdentifierColumn,
        connectedBy: userId,
        syncStatus: 'active',
      });

      res.json({ message: "Sheet connected successfully", connection });
    } catch (error: any) {
      console.error("Error connecting sheet:", error);
      res.status(500).json({ message: error.message || "Failed to connect sheet" });
    }
  });

  // Disconnect Google Sheet
  app.post('/api/sheets/disconnect', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      await storage.deactivateAllGoogleSheets();
      res.json({ message: "Sheet disconnected successfully" });
    } catch (error: any) {
      console.error("Error disconnecting sheet:", error);
      res.status(500).json({ message: error.message || "Failed to disconnect sheet" });
    }
  });

  // Sync FROM Google Sheets TO CRM (import)
  app.post('/api/sheets/sync/import', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const activeSheet = await storage.getActiveGoogleSheet();
      if (!activeSheet) {
        return res.status(400).json({ message: "No active Google Sheet connected" });
      }

      const { spreadsheetId, sheetName, uniqueIdentifierColumn } = activeSheet;
      const range = `${sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(spreadsheetId, range);

      if (rows.length === 0) {
        return res.status(400).json({ message: "Sheet is empty" });
      }

      const parsed = googleSheets.parseSheetDataToObjects(rows, uniqueIdentifierColumn);
      let created = 0;
      let updated = 0;

      for (const item of parsed) {
        const existing = await storage.getClientByUniqueIdentifier(item.uniqueId);

        if (existing) {
          // Update existing client
          await storage.updateClient(existing.id, {
            data: item.data,
            googleSheetId: spreadsheetId,
            googleSheetRowId: item.rowIndex,
            lastSyncedAt: new Date(),
          });
          updated++;
        } else {
          // Create new client
          await storage.createClient({
            uniqueIdentifier: item.uniqueId,
            googleSheetId: spreadsheetId,
            googleSheetRowId: item.rowIndex,
            data: item.data,
            status: 'unassigned',
            lastSyncedAt: new Date(),
          });
          created++;
        }
      }

      // Update last synced time on the sheet connection
      await storage.updateGoogleSheetLastSync(activeSheet.id);

      res.json({
        message: "Import completed",
        created,
        updated,
        total: parsed.length,
      });
    } catch (error: any) {
      console.error("Error importing from sheet:", error);
      res.status(500).json({ message: error.message || "Import failed" });
    }
  });

  // Sync FROM CRM TO Google Sheets (export)
  app.post('/api/sheets/sync/export', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const activeSheet = await storage.getActiveGoogleSheet();
      if (!activeSheet) {
        return res.status(400).json({ message: "No active Google Sheet connected" });
      }

      const { spreadsheetId, sheetName, uniqueIdentifierColumn } = activeSheet;
      
      // Get headers from sheet
      const headerRange = `${sheetName}!A1:ZZ1`;
      const headerRows = await googleSheets.readSheetData(spreadsheetId, headerRange);
      
      if (!headerRows || headerRows.length === 0) {
        return res.status(400).json({ message: "Cannot read sheet headers" });
      }

      const headers = headerRows[0];

      // Get all clients
      const clients = await storage.getAllClients();
      const rows: any[][] = [];

      for (const client of clients) {
        if (client.googleSheetRowId && client.uniqueIdentifier) {
          // Update existing row
          const range = `${sheetName}!A${client.googleSheetRowId}`;
          const row = googleSheets.convertObjectsToSheetRows(headers, [client.data])[0];
          await googleSheets.writeSheetData(spreadsheetId, range, [row]);
        }
      }

      await storage.updateGoogleSheetLastSync(activeSheet.id);

      res.json({
        message: "Export completed",
        updated: clients.length,
      });
    } catch (error: any) {
      console.error("Error exporting to sheet:", error);
      res.status(500).json({ message: error.message || "Export failed" });
    }
  });

  // Bidirectional sync (import then export)
  app.post('/api/sheets/sync/bidirectional', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const activeSheet = await storage.getActiveGoogleSheet();
      if (!activeSheet) {
        return res.status(400).json({ message: "No active Google Sheet connected" });
      }

      const { spreadsheetId, sheetName, uniqueIdentifierColumn } = activeSheet;
      
      // STEP 1: Import from sheet
      const range = `${sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(spreadsheetId, range);

      if (rows.length === 0) {
        return res.status(400).json({ message: "Sheet is empty" });
      }

      const parsed = googleSheets.parseSheetDataToObjects(rows, uniqueIdentifierColumn);
      let created = 0;
      let updated = 0;

      for (const item of parsed) {
        const existing = await storage.getClientByUniqueIdentifier(item.uniqueId);

        if (existing) {
          await storage.updateClient(existing.id, {
            data: item.data,
            googleSheetId: spreadsheetId,
            googleSheetRowId: item.rowIndex,
            lastSyncedAt: new Date(),
          });
          updated++;
        } else {
          await storage.createClient({
            uniqueIdentifier: item.uniqueId,
            googleSheetId: spreadsheetId,
            googleSheetRowId: item.rowIndex,
            data: item.data,
            status: 'unassigned',
            lastSyncedAt: new Date(),
          });
          created++;
        }
      }

      await storage.updateGoogleSheetLastSync(activeSheet.id);

      res.json({
        message: "Bidirectional sync completed",
        imported: { created, updated },
        total: parsed.length,
      });
    } catch (error: any) {
      console.error("Error in bidirectional sync:", error);
      res.status(500).json({ message: error.message || "Sync failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
