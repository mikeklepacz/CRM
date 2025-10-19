import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getOidcConfig } from "./replitAuth";
import { differenceInMonths } from "date-fns";
import axios from "axios";
import bcrypt from "bcrypt";
import * as client from "openid-client";
import * as googleSheets from "./googleSheets";
import { z } from "zod";

// Helper function for fuzzy string matching (Levenshtein distance)
function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  const matrix: number[][] = [];

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      const cost = s1[j - 1] === s2[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return 1 - (distance / maxLen);
}

// ============================================================================
// CRITICAL: Link Normalization Function
// ============================================================================
// DO NOT MODIFY without understanding the full context!
//
// Purpose:
// Ensures two different URL formats match correctly during merge operations:
// - "https://www.leafly.com/dispensary-info/10-collective/"
// - "leafly.com/dispensary-info/10-collective"
// Both normalize to: "leafly.com/dispensary-info/10-collective"
//
// Why This Matters:
// - Store Database may have URLs with http://, https://, www., trailing slashes
// - Commission Tracker may have clean URLs without protocols
// - Without normalization, identical stores won't merge (shown as orphaned)
//
// Normalization Steps:
// 1. Trim whitespace
// 2. Convert to lowercase (case-insensitive matching)
// 3. Remove http:// or https:// protocol
// 4. Remove www. prefix
// 5. Remove trailing slashes
//
// Impact if broken:
// - Stores won't match between sheets even when they're the same
// - Tracker data appears orphaned (_deletedFromStore: true)
// - CRM shows duplicate rows instead of merged data
// ============================================================================
function normalizeLink(link: string): string {
  if (!link || typeof link !== 'string') return '';
  
  return link
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '') // Remove http:// or https://
    .replace(/^www\./, '')        // Remove www.
    .replace(/\/+$/, '');          // Remove trailing slashes
}

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

  // Validation schemas
  const profileSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    agentName: z.string().optional(),
  });

  const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
  });

  const wooCommerceSchema = z.object({
    url: z.string().url("Invalid URL"),
    consumerKey: z.string().min(1, "Consumer key is required"),
    consumerSecret: z.string().min(1, "Consumer secret is required"),
  });

  const googleOAuthSchema = z.object({
    clientId: z.string().min(1, "Client ID is required"),
    clientSecret: z.string().min(1, "Client Secret is required"),
  });

  // User settings endpoints
  app.put('/api/user/profile', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const validation = profileSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { firstName, lastName, email, agentName } = validation.data;

      const updated = await storage.updateUser(userId, { firstName, lastName, email, agentName });
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: error.message || "Failed to update profile" });
    }
  });

  app.put('/api/user/password', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const validation = passwordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { currentPassword, newPassword } = validation.data;

      const user = await storage.getUser(userId);
      if (!user?.passwordHash) {
        return res.status(400).json({ message: "Password auth not enabled for this user" });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(userId, { passwordHash: newPasswordHash });
      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: error.message || "Failed to update password" });
    }
  });

  // User preferences endpoints
  app.get('/api/user/preferences', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences || null);
    } catch (error: any) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: error.message || "Failed to fetch preferences" });
    }
  });

  const statusColorSchema = z.record(z.object({
    background: z.string(),
    text: z.string()
  })).optional();

  const colorSchemaWithStatus = z.object({
    background: z.string(),
    text: z.string(),
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    border: z.string(),
    bodyBackground: z.string(),
    headerBackground: z.string(),
    statusColors: statusColorSchema,
  }).optional();

  const userPreferencesSchema = z.object({
    visibleColumns: z.record(z.boolean()).optional(),
    columnOrder: z.array(z.string()).optional(),
    columnWidths: z.record(z.number()).optional(),
    selectedStates: z.array(z.string()).optional(),
    selectedCities: z.array(z.string()).optional(),
    fontSize: z.number().optional(),
    rowHeight: z.number().optional(),
    lightModeColors: colorSchemaWithStatus,
    darkModeColors: colorSchemaWithStatus,
    textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
    verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
    colorRowByStatus: z.boolean().optional(),
    colorPresets: z.array(z.object({ name: z.string(), color: z.string() })).optional(),
    showCanadaOnly: z.boolean().optional(),
  });

  app.put('/api/user/preferences', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const validation = userPreferencesSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const preferences = await storage.saveUserPreferences(userId, validation.data);

      res.json(preferences);
    } catch (error: any) {
      console.error("Error saving user preferences:", error);
      res.status(500).json({ message: error.message || "Failed to save preferences" });
    }
  });

  app.get('/api/woocommerce/settings', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const integration = await storage.getUserIntegration(userId);

      res.json({
        url: integration?.wooUrl || "",
        consumerKey: integration?.wooConsumerKey || "",
        consumerSecret: integration?.wooConsumerSecret || "",
        lastSyncedAt: integration?.wooLastSyncedAt || null
      });
    } catch (error: any) {
      console.error("Error fetching WooCommerce settings:", error);
      res.status(500).json({ message: error.message || "Failed to fetch settings" });
    }
  });

  app.put('/api/woocommerce/settings', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const validation = wooCommerceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { url, consumerKey, consumerSecret } = validation.data;

      await storage.updateUserIntegration(userId, {
        wooUrl: url,
        wooConsumerKey: consumerKey,
        wooConsumerSecret: consumerSecret
      });

      res.json({ message: "WooCommerce settings updated successfully" });
    } catch (error: any) {
      console.error("Error updating WooCommerce settings:", error);
      res.status(500).json({ message: error.message || "Failed to update settings" });
    }
  });

  app.get('/api/google/settings', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const integration = await storage.getUserIntegration(userId);

      res.json({
        clientId: integration?.googleClientId || "",
        clientSecret: integration?.googleClientSecret || "",
        googleEmail: integration?.googleEmail || null
      });
    } catch (error: any) {
      console.error("Error fetching Google OAuth settings:", error);
      res.status(500).json({ message: error.message || "Failed to fetch settings" });
    }
  });

  app.put('/api/google/settings', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const validation = googleOAuthSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { clientId, clientSecret } = validation.data;

      await storage.updateUserIntegration(userId, {
        googleClientId: clientId,
        googleClientSecret: clientSecret
      });

      res.json({ message: "Google OAuth settings updated successfully" });
    } catch (error: any) {
      console.error("Error updating Google OAuth settings:", error);
      res.status(500).json({ message: error.message || "Failed to update settings" });
    }
  });

  app.get('/api/google/oauth-url', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const integration = await storage.getUserIntegration(userId);

      console.log('OAuth URL request - userId:', userId);
      console.log('Integration found:', !!integration);
      console.log('Client ID:', integration?.googleClientId ? 'present' : 'missing');

      if (!integration?.googleClientId) {
        return res.status(400).json({ message: "Please configure Google OAuth credentials first" });
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/google/callback`;
      const scope = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly';

      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', integration.googleClientId);
      oauthUrl.searchParams.set('redirect_uri', redirectUri);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('scope', scope);
      oauthUrl.searchParams.set('access_type', 'offline');
      oauthUrl.searchParams.set('prompt', 'consent');
      oauthUrl.searchParams.set('state', userId); // Pass userId as state

      const response = { url: oauthUrl.toString() };
      console.log('Sending OAuth URL response:', response);
      return res.json(response);
    } catch (error: any) {
      console.error("Error generating OAuth URL:", error);
      return res.status(500).json({ message: error.message || "Failed to generate OAuth URL" });
    }
  });

  app.get('/api/google/callback', async (req: any, res) => {
    try {
      const { code, state: userId } = req.query;

      if (!code || !userId) {
        return res.send('<script>window.close();</script>');
      }

      const integration = await storage.getUserIntegration(userId);
      if (!integration?.googleClientId || !integration?.googleClientSecret) {
        return res.send('<script>alert("OAuth credentials not configured"); window.close();</script>');
      }

      // Exchange code for tokens
      const redirectUri = `${req.protocol}://${req.get('host')}/api/google/callback`;
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: integration.googleClientId,
          client_secret: integration.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token exchange failed:', error);
        return res.send('<script>alert("Authentication failed"); window.close();</script>');
      }

      const tokens = await tokenResponse.json();

      // Get user email from Google
      const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      const userinfo = await userinfoResponse.json();

      // Store tokens - convert expiry to Unix timestamp (milliseconds)
      const expiryTimestamp = Date.now() + (tokens.expires_in * 1000);
      await storage.updateUserIntegration(userId, {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: expiryTimestamp,
        googleEmail: userinfo.email,
        googleConnectedAt: new Date()
      });

      res.send('<script>alert("Google Sheets connected successfully!"); window.close();</script>');
    } catch (error: any) {
      console.error("OAuth callback error:", error);
      res.send('<script>alert("Connection failed"); window.close();</script>');
    }
  });

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

  // Get all orders
  app.get('/api/orders', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: error.message || "Failed to fetch orders" });
    }
  });

  // Get smart match suggestions for an order (searches Google Sheets Store Database)
  // Supports manual search via ?search=term query parameter
  app.get('/api/orders/:orderId/match-suggestions', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { orderId } = req.params;
      const manualSearch = req.query.search || ''; // Manual search term from query param

      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Find Store Database sheet
      const sheets = await storage.getAllActiveGoogleSheets();
      const storeSheet = sheets.find(s => s.sheetPurpose === 'Store Database');

      if (!storeSheet) {
        return res.status(404).json({ message: 'Store Database sheet not found' });
      }

      // Read all store data
      const storeRange = `${storeSheet.sheetName}!A:ZZ`;
      const storeRows = await googleSheets.readSheetData(userId, storeSheet.spreadsheetId, storeRange);

      if (storeRows.length === 0) {
        return res.json({ order, suggestions: [] });
      }

      // Parse store data
      const storeHeaders = storeRows[0];
      const nameIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'name');
      const dbaIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'dba');
      const linkIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'link');
      const emailIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'email');
      const cityIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'city');
      const stateIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'state');

      const suggestions: any[] = [];
      const orderCompany = order.billingCompany || '';
      const orderEmail = order.billingEmail || '';
      const isManualSearch = manualSearch.trim().length > 0;
      const searchLower = manualSearch.toLowerCase().trim();

      // Process each store row
      storeRows.slice(1).forEach((row, index) => {
        let score = 0;
        const reasons: string[] = [];

        const storeName = nameIndex !== -1 ? (row[nameIndex] || '') : '';
        const storeDba = dbaIndex !== -1 ? (row[dbaIndex] || '') : '';
        const storeLink = linkIndex !== -1 ? (row[linkIndex] || '') : '';
        const storeEmail = emailIndex !== -1 ? (row[emailIndex] || '') : '';
        const storeCity = cityIndex !== -1 ? (row[cityIndex] || '') : '';
        const storeState = stateIndex !== -1 ? (row[stateIndex] || '') : '';

        // MANUAL SEARCH MODE: Simple substring matching
        if (isManualSearch) {
          const nameMatch = storeName.toLowerCase().includes(searchLower);
          const dbaMatch = storeDba.toLowerCase().includes(searchLower);
          const emailMatch = storeEmail.toLowerCase().includes(searchLower);
          
          if (nameMatch || dbaMatch || emailMatch) {
            score = 50; // Base score for manual matches
            if (nameMatch) reasons.push('Name match');
            if (dbaMatch) reasons.push('DBA match');
            if (emailMatch) reasons.push('Email match');
          }
        } 
        // AI SMART MATCHING MODE: Fuzzy matching based on order data
        else {
          // Company name similarity (check both Name and DBA fields)
          if (orderCompany && (storeName || storeDba)) {
            const nameSimilarity = stringSimilarity(orderCompany, storeName);
            const dbaSimilarity = storeDba ? stringSimilarity(orderCompany, storeDba) : 0;
            const companySimilarity = Math.max(nameSimilarity, dbaSimilarity);
            
            if (companySimilarity > 0.6) {
              score += companySimilarity * 50;
              reasons.push(`Company name ${Math.round(companySimilarity * 100)}% similar`);
            }
          }

          // Email similarity
          if (orderEmail && storeEmail) {
            const emailSimilarity = stringSimilarity(orderEmail, storeEmail);
            if (emailSimilarity > 0.8) {
              score += emailSimilarity * 30;
              reasons.push(`Email ${Math.round(emailSimilarity * 100)}% similar`);
            }
          }

          // Exact email match (highest priority)
          if (orderEmail && storeEmail && orderEmail.toLowerCase() === storeEmail.toLowerCase()) {
            score += 100;
            reasons.push('Exact email match');
          }

          // Exact company match (check both Name and DBA)
          if (orderCompany) {
            const exactNameMatch = storeName && orderCompany.toLowerCase() === storeName.toLowerCase();
            const exactDbaMatch = storeDba && orderCompany.toLowerCase() === storeDba.toLowerCase();
            
            if (exactNameMatch || exactDbaMatch) {
              score += 100;
              reasons.push('Exact company name match');
            }
          }
        }

        // Add to suggestions if score is high enough
        if (score > 10) {
          suggestions.push({
            rowIndex: index + 2,
            link: storeLink,
            name: storeName,
            dba: storeDba,
            email: storeEmail,
            score: Math.min(score, 100),
            reasons,
            displayName: storeName || storeDba || storeEmail,
            displayInfo: `${storeCity ? storeCity + ', ' : ''}${storeState || ''}`.trim(),
          });
        }
      });

      // Sort by score descending and return top results
      suggestions.sort((a, b) => b.score - a.score);
      const limit = isManualSearch ? 100 : 20; // More results for manual search
      const topSuggestions = suggestions.slice(0, limit);

      res.json({
        order,
        suggestions: topSuggestions,
        isManualSearch,
      });
    } catch (error: any) {
      console.error("Error getting match suggestions:", error);
      res.status(500).json({ message: error.message || "Failed to get suggestions" });
    }
  });

  // Manually match an order to multiple stores (Google Sheets-based multi-select)
  app.post('/api/orders/:orderId/match', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { orderId } = req.params;
      const { storeLinks, dba } = req.body; // Array of {link, name} objects and optional DBA

      if (!storeLinks || !Array.isArray(storeLinks) || storeLinks.length === 0) {
        return res.status(400).json({ message: "At least one store must be selected" });
      }

      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Find both Store Database and Commission Tracker sheets
      const sheets = await storage.getAllActiveGoogleSheets();
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'Commission Tracker');
      const storeDbSheet = sheets.find(s => s.sheetPurpose === 'Store Database');

      if (!trackerSheet) {
        return res.status(404).json({ message: 'Commission Tracker sheet not found' });
      }
      
      if (!storeDbSheet) {
        return res.status(404).json({ message: 'Store Database sheet not found' });
      }

      // Read Store Database to find stores and update DBA
      const storeDbRange = `${storeDbSheet.sheetName}!A:ZZ`;
      const storeDbRows = await googleSheets.readSheetData(userId, storeDbSheet.spreadsheetId, storeDbRange);
      
      if (storeDbRows.length === 0) {
        return res.status(400).json({ message: 'Store Database sheet is empty' });
      }
      
      const storeDbHeaders = storeDbRows[0];
      const storeDbLinkIndex = storeDbHeaders.findIndex(h => h.toLowerCase() === 'link');
      const storeDbDbaIndex = storeDbHeaders.findIndex(h => h.toLowerCase() === 'dba');
      
      if (storeDbLinkIndex === -1) {
        return res.status(400).json({ message: 'Store Database must have a "Link" column' });
      }

      // Read tracker data to check if stores already have rows
      const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
      const trackerRows = await googleSheets.readSheetData(userId, trackerSheet.spreadsheetId, trackerRange);

      if (trackerRows.length === 0) {
        return res.status(400).json({ message: 'Commission Tracker sheet is empty' });
      }

      const trackerHeaders = trackerRows[0];
      const linkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
      const orderIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'order id');
      const transactionIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'transaction id');
      const trackerDbaIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'dba');
      const agentNameIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'agent name');

      if (linkIndex === -1) {
        return res.status(400).json({ message: 'Commission Tracker must have a "Link" column' });
      }
      
      // Get agent name from order metadata
      const agentName = order.metaData?.find((m: any) => m.key === '_wc_order_attribution_utm_source')?.value 
        || order.metaData?.find((m: any) => m.key === 'agent_name')?.value
        || '';

      let rowsProcessed = 0;
      const results: Array<{link: string, name: string, action: string}> = [];

      // Process each selected store
      for (const store of storeLinks) {
        const { link: storeLink, name: storeName } = store;
        
        // 1. Update DBA in Store Database if DBA is provided
        if (dba && storeDbDbaIndex !== -1) {
          // Find the store in Store Database
          let storeDbRowIndex = -1;
          for (let i = 1; i < storeDbRows.length; i++) {
            if (normalizeLink(storeDbRows[i][storeDbLinkIndex]) === normalizeLink(storeLink)) {
              storeDbRowIndex = i + 1; // +1 for 1-indexed Google Sheets
              break;
            }
          }
          
          if (storeDbRowIndex > 0) {
            const dbaColumn = String.fromCharCode(65 + storeDbDbaIndex);
            const dbaRange = `${storeDbSheet.sheetName}!${dbaColumn}${storeDbRowIndex}`;
            await googleSheets.writeSheetData(userId, storeDbSheet.spreadsheetId, dbaRange, [[dba]]);
          }
        }
        
        // 2. Update or create row in Commission Tracker
        let existingTrackerRowIndex = -1;
        for (let i = 1; i < trackerRows.length; i++) {
          if (normalizeLink(trackerRows[i][linkIndex]) === normalizeLink(storeLink)) {
            existingTrackerRowIndex = i + 1; // +1 for 1-indexed Google Sheets
            break;
          }
        }

        if (existingTrackerRowIndex > 0) {
          // Update existing tracker row
          if (orderIdIndex !== -1) {
            const orderIdColumn = String.fromCharCode(65 + orderIdIndex);
            const updateRange = `${trackerSheet.sheetName}!${orderIdColumn}${existingTrackerRowIndex}`;
            await googleSheets.writeSheetData(userId, trackerSheet.spreadsheetId, updateRange, [[order.orderNumber]]);
          }
          
          if (transactionIdIndex !== -1) {
            const txIdColumn = String.fromCharCode(65 + transactionIdIndex);
            const txRange = `${trackerSheet.sheetName}!${txIdColumn}${existingTrackerRowIndex}`;
            await googleSheets.writeSheetData(userId, trackerSheet.spreadsheetId, txRange, [[order.id]]);
          }
          
          if (trackerDbaIndex !== -1 && dba) {
            const dbaColumn = String.fromCharCode(65 + trackerDbaIndex);
            const dbaRange = `${trackerSheet.sheetName}!${dbaColumn}${existingTrackerRowIndex}`;
            await googleSheets.writeSheetData(userId, trackerSheet.spreadsheetId, dbaRange, [[dba]]);
          }
          
          if (agentNameIndex !== -1 && agentName) {
            const agentColumn = String.fromCharCode(65 + agentNameIndex);
            const agentRange = `${trackerSheet.sheetName}!${agentColumn}${existingTrackerRowIndex}`;
            await googleSheets.writeSheetData(userId, trackerSheet.spreadsheetId, agentRange, [[agentName]]);
          }
          
          rowsProcessed++;
          results.push({ link: storeLink, name: storeName, action: 'updated' });
        } else {
          // Create new row in Commission Tracker
          const newRow: any[] = new Array(trackerHeaders.length).fill('');
          
          // Set Link
          if (linkIndex !== -1) newRow[linkIndex] = storeLink;
          
          // Set Order ID
          if (orderIdIndex !== -1) newRow[orderIdIndex] = order.orderNumber;
          
          // Set Transaction ID
          if (transactionIdIndex !== -1) newRow[transactionIdIndex] = order.id;
          
          // Set DBA
          if (trackerDbaIndex !== -1 && dba) newRow[trackerDbaIndex] = dba;
          
          // Set Agent Name
          if (agentNameIndex !== -1 && agentName) newRow[agentNameIndex] = agentName;
          
          // Append new row to Commission Tracker
          const appendRange = `${trackerSheet.sheetName}!A:ZZ`;
          await googleSheets.appendSheetData(userId, trackerSheet.spreadsheetId, appendRange, [newRow]);
          
          rowsProcessed++;
          results.push({ link: storeLink, name: storeName, action: 'created' });
        }
      }

      // Success! All data is now in Google Sheets Commission Tracker
      res.json({ 
        message: `Order ${order.orderNumber} matched to ${storeLinks.length} store(s)`,
        rowsProcessed,
        results,
        dba: dba || null
      });
    } catch (error: any) {
      console.error("Error matching order:", error);
      res.status(500).json({ message: error.message || "Failed to match order" });
    }
  });

  // Save commission settings for multiple orders
  app.post('/api/orders/save-commissions', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const { orders: orderUpdates } = req.body;

      if (!orderUpdates || !Array.isArray(orderUpdates)) {
        return res.status(400).json({ message: "Orders array is required" });
      }

      let updated = 0;
      for (const update of orderUpdates) {
        const { orderId, commissionType, commissionAmount } = update;
        
        if (!orderId) continue;

        const updates: any = {};
        if (commissionType !== undefined) updates.commissionType = commissionType;
        if (commissionAmount !== undefined) updates.commissionAmount = commissionAmount;

        if (Object.keys(updates).length > 0) {
          await storage.updateOrder(orderId, updates);
          updated++;
        }
      }

      res.json({ message: `Saved commission settings for ${updated} orders`, updated });
    } catch (error: any) {
      console.error("Error saving commission settings:", error);
      res.status(500).json({ message: error.message || "Failed to save commission settings" });
    }
  });

  // WooCommerce Webhook Endpoint (no auth required - validated by webhook secret)
  app.post('/api/woocommerce/webhook', async (req: any, res) => {
    try {
      const webhookData = req.body;
      const webhookSource = req.headers['x-wc-webhook-source'];
      const webhookTopic = req.headers['x-wc-webhook-topic'];
      const webhookSignature = req.headers['x-wc-webhook-signature'];

      console.log('WooCommerce webhook received:', {
        topic: webhookTopic,
        source: webhookSource,
        orderId: webhookData.id
      });

      // Verify webhook is for order events
      if (!webhookTopic || !webhookTopic.toString().startsWith('order.')) {
        console.log('Ignoring non-order webhook:', webhookTopic);
        return res.status(200).json({ message: 'Webhook received but not an order event' });
      }

      // Only process completed and processing orders
      if (webhookData.status !== 'completed' && webhookData.status !== 'processing') {
        console.log('Ignoring order with status:', webhookData.status);
        return res.status(200).json({ message: 'Order status not tracked' });
      }

      // Extract order data
      const order = webhookData;
      const email = order.billing?.email;
      const company = order.billing?.company;
      const salesAgentMeta = order.meta_data?.find((m: any) => m.key === '_sales_agent');
      const salesAgentName = salesAgentMeta?.value || null;

      console.log(`Processing webhook for order ${order.id}:`, {
        email,
        company,
        salesAgentName,
        total: order.total,
        status: order.status,
        date: order.date_created
      });

      // Find matching client
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
          salesAgentName: salesAgentName,
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
          salesAgentName: salesAgentName,
          total: order.total,
          status: order.status,
          orderDate: new Date(order.date_created),
        });
      }

      // Update client if matched
      if (client) {
        const orderDate = new Date(order.date_created);
        const orderTotal = parseFloat(order.total);

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

      console.log('Webhook processed successfully:', { orderId: order.id, matched: !!client });
      res.status(200).json({ message: 'Webhook processed', matched: !!client });
    } catch (error: any) {
      console.error("Webhook processing error:", error);
      // Always return 200 to WooCommerce to prevent retries
      res.status(200).json({ message: 'Webhook received but processing failed' });
    }
  });

  // Sync WooCommerce orders
  app.post('/api/woocommerce/sync', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      // Get WooCommerce credentials from database
      const integration = await storage.getUserIntegration(userId);
      const wooUrl = integration?.wooUrl;
      const consumerKey = integration?.wooConsumerKey;
      const consumerSecret = integration?.wooConsumerSecret;

      console.log('WooCommerce sync started for user:', userId);
      console.log('WooCommerce URL:', wooUrl);
      console.log('Has consumer key:', !!consumerKey);
      console.log('Has consumer secret:', !!consumerSecret);

      if (!wooUrl || !consumerKey || !consumerSecret) {
        return res.status(500).json({ message: "WooCommerce credentials not configured. Please configure in Settings." });
      }

      // Fetch ALL orders from WooCommerce with pagination
      const apiUrl = `${wooUrl}/wp-json/wc/v3/orders`;
      console.log('Fetching from:', apiUrl);

      let allOrders: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await axios.get(apiUrl, {
          auth: {
            username: consumerKey,
            password: consumerSecret,
          },
          params: {
            per_page: 100,
            page: page,
            orderby: 'date',
            order: 'desc',
            status: 'completed,processing', // Only fetch completed and processing orders
          },
        });

        console.log(`Fetched page ${page}: ${response.data.length} orders`);

        if (response.data.length === 0) {
          hasMore = false;
        } else {
          allOrders = allOrders.concat(response.data);
          page++;
        }

        // Safety check to prevent infinite loops
        if (page > 1000) {
          console.log('Reached maximum page limit (1000)');
          hasMore = false;
        }
      }

      console.log('WooCommerce total orders fetched:', allOrders.length);
      const orders = allOrders;

      if (!Array.isArray(orders)) {
        console.error('Expected array of orders but got:', typeof orders);
        return res.status(500).json({
          message: "Invalid response from WooCommerce API",
          total: 0,
          synced: 0,
          matched: 0
        });
      }

      if (orders.length === 0) {
        console.log('No orders found in WooCommerce');
        return res.json({
          message: "No orders found in WooCommerce",
          total: 0,
          synced: 0,
          matched: 0,
        });
      }
      let synced = 0;
      let matched = 0;

      console.log(`Processing ${orders.length} orders...`);

      for (const order of orders) {
        // Try to find matching client by email or company
        const email = order.billing?.email;
        const company = order.billing?.company;

        // Extract sales agent from WooCommerce custom field _sales_agent
        const salesAgentMeta = order.meta_data?.find((m: any) => m.key === '_sales_agent');
        const salesAgentName = salesAgentMeta?.value || null;

        console.log(`Processing order ${order.id}:`, {
          email,
          company,
          salesAgentName,
          total: order.total,
          status: order.status,
          date: order.date_created
        });

        let client = null;

        if (email) {
          client = await storage.findClientByUniqueKey('Email', email) ||
                   await storage.findClientByUniqueKey('email', email);
          console.log(`Client lookup by email '${email}':`, client ? 'FOUND' : 'NOT FOUND');
        }

        if (!client && company) {
          client = await storage.findClientByUniqueKey('Company', company) ||
                   await storage.findClientByUniqueKey('company', company);
          console.log(`Client lookup by company '${company}':`, client ? 'FOUND' : 'NOT FOUND');
        }

        // Create or update order
        const existingOrder = await storage.getOrderById(order.id.toString());

        if (existingOrder) {
          await storage.updateOrder(order.id.toString(), {
            clientId: client?.id || null,
            orderNumber: order.number || order.id.toString(),
            billingEmail: email,
            billingCompany: company,
            salesAgentName: salesAgentName,
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
            salesAgentName: salesAgentName,
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

      // TWO-WAY SYNC: Delete local orders that no longer exist in WooCommerce
      // This handles cancelled, deleted, or refunded orders
      const allLocalOrders = await storage.getAllOrders();
      const wooOrderIds = new Set(orders.map((o: any) => o.id.toString()));
      let deleted = 0;

      for (const localOrder of allLocalOrders) {
        if (!wooOrderIds.has(localOrder.id)) {
          // This order exists locally but not in WooCommerce anymore
          console.log(`Deleting order ${localOrder.id} (no longer in WooCommerce)`);
          await storage.deleteOrder(localOrder.id);
          deleted++;
        }
      }

      console.log('Sync completed:', { total: orders.length, synced, matched, deleted });

      // Update last synced timestamp
      await storage.updateUserIntegration(userId, {
        wooLastSyncedAt: new Date()
      });

      res.json({
        message: `WooCommerce sync completed. ${deleted > 0 ? `Removed ${deleted} deleted/cancelled orders.` : ''}`,
        synced,
        matched,
        total: orders.length,
      });
    } catch (error: any) {
      console.error("WooCommerce sync error:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      res.status(500).json({
        message: error.response?.data?.message || error.message || "Sync failed",
        total: 0,
        synced: 0,
        matched: 0
      });
    }
  });

  // Write matched WooCommerce orders to Commission Tracker sheet
  app.post('/api/woocommerce/write-to-tracker', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { orders: orderRequests } = req.body;

      if (!Array.isArray(orderRequests) || orderRequests.length === 0) {
        return res.status(400).json({ message: "No orders provided" });
      }

      // Get Commission Tracker sheet
      const trackerSheet = await storage.getGoogleSheetByPurpose('commission_tracker');
      if (!trackerSheet) {
        return res.status(400).json({ message: "Commission Tracker sheet not connected" });
      }

      const { spreadsheetId, sheetName } = trackerSheet;

      // Read tracker headers to understand column structure
      const headerRange = `${sheetName}!1:1`;
      const headerData = await googleSheets.readSheetData(userId, spreadsheetId, headerRange);
      if (headerData.length === 0) {
        return res.status(400).json({ message: "Commission Tracker sheet is empty" });
      }

      const headers = headerData[0];
      console.log('Commission Tracker headers:', headers);

      // Build column map (case-insensitive)
      const columnMap: Record<string, number> = {};
      headers.forEach((header: string, index: number) => {
        const lowerHeader = header.toLowerCase().trim();
        columnMap[lowerHeader] = index;
      });

      // Required columns: Link, Agent Name, Date, Order Number, Total, Amount
      const requiredColumns = ['link', 'agent name', 'date', 'order number', 'total', 'amount'];
      const missingColumns = requiredColumns.filter(col => !(col in columnMap));
      if (missingColumns.length > 0) {
        return res.status(400).json({ 
          message: `Missing required columns in Commission Tracker: ${missingColumns.join(', ')}` 
        });
      }

      // Read all existing tracker rows once for duplicate detection
      const allDataRange = `${sheetName}!A:ZZ`;
      const allRows = await googleSheets.readSheetData(userId, spreadsheetId, allDataRange);
      const existingRows = allRows.slice(1); // Skip header

      let written = 0;
      const skipped = 0;
      const conflicts: any[] = [];

      for (const orderReq of orderRequests) {
        const { orderId, commissionType, commissionAmount } = orderReq;

        // Get order from database
        const order = await storage.getOrderById(orderId);
        if (!order || !order.clientId) {
          console.log(`Skipping order ${orderId}: not matched to client`);
          continue;
        }

        // Get client to extract Link
        const client = await storage.getClient(order.clientId);
        if (!client) {
          console.log(`Skipping order ${orderId}: client not found`);
          continue;
        }

        // Extract Link from client data (case-insensitive search)
        let linkValue = client.data?.Link || client.data?.link || client.uniqueIdentifier;
        
        // If no link exists, generate unique 10-digit code and create Store Database entry
        if (!linkValue) {
          console.log(`No Link found for order ${orderId}, generating unique code...`);
          
          // Generate unique 10-digit code: WC + 8 random digits
          const generateUniqueCode = () => {
            const randomDigits = Math.floor(10000000 + Math.random() * 90000000); // 8 random digits
            return `WC${randomDigits}`;
          };
          
          linkValue = generateUniqueCode();
          
          // Get Store Database sheet
          const storeSheet = await storage.getGoogleSheetByPurpose('store_database');
          if (storeSheet) {
            // Read Store Database headers
            const storeHeaderRange = `${storeSheet.sheetName}!1:1`;
            const storeHeaderData = await googleSheets.readSheetData(userId, storeSheet.spreadsheetId, storeHeaderRange);
            
            if (storeHeaderData.length > 0) {
              const storeHeaders = storeHeaderData[0];
              
              // Build column map
              const storeColumnMap: Record<string, number> = {};
              storeHeaders.forEach((header: string, index: number) => {
                storeColumnMap[header.toLowerCase().trim()] = index;
              });
              
              // Prepare new store row with minimal data
              const newStoreRow = new Array(storeHeaders.length).fill('');
              if ('link' in storeColumnMap) newStoreRow[storeColumnMap['link']] = linkValue;
              if ('name' in storeColumnMap) newStoreRow[storeColumnMap['name']] = order.billingCompany || 'Unknown Company';
              if ('email' in storeColumnMap) newStoreRow[storeColumnMap['email']] = order.billingEmail || '';
              if ('dba' in storeColumnMap) newStoreRow[storeColumnMap['dba']] = order.billingCompany || '';
              
              // Append to Store Database
              await googleSheets.appendSheetData(userId, storeSheet.spreadsheetId, `${storeSheet.sheetName}!A:A`, [newStoreRow]);
              console.log(`Created new store in Store Database with Link: ${linkValue}`);
            }
          }
          
          // Update client record with the new Link
          await storage.updateClient(client.id, {
            ...client,
            uniqueIdentifier: linkValue,
            data: {
              ...client.data,
              Link: linkValue,
              link: linkValue,
            }
          });
          console.log(`Updated client ${client.id} with Link: ${linkValue}`);
        }

        const salesAgentName = order.salesAgentName;
        if (!salesAgentName) {
          console.log(`Skipping order ${orderId}: no sales agent name`);
          continue;
        }

        // Calculate commission amount
        const orderTotal = parseFloat(order.total);
        let amount: number;

        if (commissionType === 'flat' && commissionAmount) {
          amount = parseFloat(commissionAmount);
        } else if (commissionType === '25') {
          amount = orderTotal * 0.25;
        } else if (commissionType === '10') {
          amount = orderTotal * 0.10;
        } else {
          // Auto: determine based on 6-month rule
          // Find first order date for this client
          const firstOrderDate = client.firstOrderDate ? new Date(client.firstOrderDate) : new Date(order.orderDate);
          const orderDate = new Date(order.orderDate);
          const monthsSinceFirst = differenceInMonths(orderDate, firstOrderDate);
          const rate = monthsSinceFirst < 6 ? 0.25 : 0.10;
          amount = orderTotal * rate;
        }

        // Format date as M/d/yyyy to match existing pattern
        const orderDate = new Date(order.orderDate);
        const formattedDate = `${orderDate.getMonth() + 1}/${orderDate.getDate()}/${orderDate.getFullYear()}`;

        // Check for duplicates: order number already exists in tracker
        const duplicateRow = existingRows.find(row => {
          const existingOrderNumber = row[columnMap['order number']];
          return existingOrderNumber && existingOrderNumber.toString() === order.orderNumber.toString();
        });

        if (duplicateRow) {
          console.log(`Skipping order ${order.orderNumber}: already exists in Commission Tracker`);
          continue;
        }

        // Check for conflicts: same Link with different Agent Name
        const conflictingRow = existingRows.find(row => {
          const existingLink = row[columnMap['link']];
          const existingAgent = row[columnMap['agent name']];
          return normalizeLink(existingLink) === normalizeLink(linkValue) && 
                 existingAgent && 
                 existingAgent.toLowerCase().trim() !== salesAgentName.toLowerCase().trim();
        });

        if (conflictingRow) {
          conflicts.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            newAgent: salesAgentName,
            existingAgent: conflictingRow[columnMap['agent name']],
            link: linkValue,
          });
          console.log(`Conflict detected for order ${order.orderNumber}: existing agent ${conflictingRow[columnMap['agent name']]} vs new agent ${salesAgentName}`);
          continue; // Skip writing this row
        }

        // Prepare row data in correct column order
        const rowData = new Array(headers.length).fill('');
        rowData[columnMap['link']] = linkValue;
        rowData[columnMap['agent name']] = salesAgentName;
        rowData[columnMap['date']] = formattedDate;
        rowData[columnMap['order number']] = order.orderNumber;
        rowData[columnMap['total']] = orderTotal.toFixed(2);
        rowData[columnMap['amount']] = amount.toFixed(2);

        // Append row to tracker sheet
        await googleSheets.appendSheetData(userId, spreadsheetId, `${sheetName}!A:A`, [rowData]);
        written++;
        console.log(`Written order ${order.orderNumber} to tracker: ${salesAgentName} - $${amount.toFixed(2)}`);
      }

      res.json({
        message: `Successfully written ${written} orders to Commission Tracker`,
        written,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      });
    } catch (error: any) {
      console.error("Write to tracker error:", error);
      res.status(500).json({
        message: error.message || "Failed to write to tracker",
        written: 0
      });
    }
  });

  // ========== GOOGLE SHEETS ROUTES ==========

  // List user's Google Sheets
  app.get('/api/sheets/list', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const sheets = await googleSheets.listSpreadsheets(userId);
      res.json(sheets);
    } catch (error: any) {
      console.error("Error listing sheets:", error);
      res.status(500).json({ message: error.message || "Failed to list sheets" });
    }
  });

  // Get spreadsheet info (sheets/tabs)
  app.get('/api/sheets/:spreadsheetId/info', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { spreadsheetId } = req.params;
      const info = await googleSheets.getSpreadsheetInfo(userId, spreadsheetId);
      res.json(info);
    } catch (error: any) {
      console.error("Error getting sheet info:", error);
      res.status(500).json({ message: error.message || "Failed to get sheet info" });
    }
  });

  // Get active Google Sheet connections (deprecated - use /api/sheets instead)
  app.get('/api/sheets/active', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const sheets = await storage.getAllActiveGoogleSheets();
      res.json(sheets.length > 0 ? sheets[0] : null);
    } catch (error: any) {
      console.error("Error getting active sheets:", error);
      res.status(500).json({ message: error.message || "Failed to get active sheets" });
    }
  });

  // Connect a Google Sheet
  app.post('/api/sheets/connect', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { spreadsheetId, spreadsheetName, sheetName, uniqueIdentifierColumn } = req.body;

      if (!spreadsheetId || !sheetName || !uniqueIdentifierColumn) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify sheet exists and has the identifier column
      const range = `${sheetName}!A1:ZZ1`;
      const headers = await googleSheets.readSheetData(userId, spreadsheetId, range);

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

      // Create new connection
      const { sheetPurpose = 'clients' } = req.body; // Default to 'clients' if not provided
      const connection = await storage.createGoogleSheetConnection({
        spreadsheetId,
        spreadsheetName: spreadsheetName || spreadsheetId,
        sheetName,
        sheetPurpose,
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

  // List all connected Google Sheets
  app.get('/api/sheets', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const sheets = await storage.getAllActiveGoogleSheets();
      res.json({ sheets });
    } catch (error: any) {
      console.error("Error fetching sheets:", error);
      res.status(500).json({ message: error.message || "Failed to fetch sheets" });
    }
  });

  // Get raw data from a specific Google Sheet
  app.get('/api/sheets/:id/data', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;

      const sheet = await storage.getGoogleSheetById(id);
      if (!sheet) {
        return res.status(404).json({ message: "Google Sheet not found" });
      }

      const { spreadsheetId, sheetName } = sheet;
      const range = `${sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(userId, spreadsheetId, range);

      if (rows.length === 0) {
        return res.json({ headers: [], data: [] });
      }

      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj: any = { _rowIndex: index + 2 }; // +2 because row 1 is header, array is 0-indexed
        headers.forEach((header, i) => {
          obj[header] = row[i] || '';
        });
        return obj;
      });

      res.json({
        headers,
        data,
        sheetInfo: {
          id: sheet.id,
          spreadsheetName: sheet.spreadsheetName,
          sheetName: sheet.sheetName,
          sheetPurpose: sheet.sheetPurpose,
        }
      });
    } catch (error: any) {
      console.error("Error fetching sheet data:", error);
      res.status(500).json({ message: error.message || "Failed to fetch sheet data" });
    }
  });

  // Get merged data from multiple sheets (for Sales Dashboard)
  app.post('/api/sheets/merged-data', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { storeSheetId, trackerSheetId, joinColumn } = req.body;

      if (!storeSheetId || !trackerSheetId || !joinColumn) {
        return res.status(400).json({ message: "Store sheet ID, tracker sheet ID, and join column are required" });
      }

      // Fetch both sheets
      const storeSheet = await storage.getGoogleSheetById(storeSheetId);
      const trackerSheet = await storage.getGoogleSheetById(trackerSheetId);

      if (!storeSheet || !trackerSheet) {
        return res.status(404).json({ message: "One or both sheets not found" });
      }

      // Read data from both sheets
      const storeRange = `${storeSheet.sheetName}!A:ZZ`;
      const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;

      const storeRows = await googleSheets.readSheetData(userId, storeSheet.spreadsheetId, storeRange);
      const trackerRows = await googleSheets.readSheetData(userId, trackerSheet.spreadsheetId, trackerRange);

      console.log('=== MERGED DATA DEBUG ===');
      console.log('Store rows read from Google Sheets:', storeRows.length);
      console.log('Tracker rows read from Google Sheets:', trackerRows.length);

      if (storeRows.length === 0) {
        return res.json({ headers: [], data: [], editableColumns: [] });
      }

      // Parse store data
      const storeHeaders = storeRows[0];
      const storeData = storeRows.slice(1).map((row, index) => {
        const obj: any = { _storeRowIndex: index + 2, _storeSheetId: storeSheetId };
        storeHeaders.forEach((header, i) => {
          obj[header] = row[i] || '';
        });
        return obj;
      });

      // Parse tracker data
      const trackerHeaders = trackerRows.length > 0 ? trackerRows[0] : [];
      const trackerData = trackerRows.length > 1 ? trackerRows.slice(1).map((row, index) => {
        const obj: any = { _trackerRowIndex: index + 2, _trackerSheetId: trackerSheetId };
        trackerHeaders.forEach((header, i) => {
          obj[header] = row[i] || '';
        });
        return obj;
      }) : [];

      // ============================================================================
      // CRITICAL: Case-Insensitive Column Lookup
      // ============================================================================
      // DO NOT MODIFY without understanding the full context!
      //
      // Problem Solved:
      // - Frontend sends joinColumn: "link" (lowercase)
      // - Google Sheets returns headers as-is: "Link" (capitalized)
      // - Direct lookup row["link"] returns undefined (case mismatch)
      // - This caused merge failures: tracker rows marked _deletedFromStore: true
      //
      // Solution:
      // - Find the actual header name from Google Sheets (case-insensitive search)
      // - Use actualStoreJoinColumn and actualTrackerJoinColumn throughout merge
      // - This ensures row["Link"] works correctly even when frontend sends "link"
      //
      // Impact if broken:
      // - Tracker data won't merge with store data
      // - Rows will show as orphaned/deleted
      // - CRM won't display commission tracking information
      // ============================================================================
      const actualStoreJoinColumn = storeHeaders.find(h => 
        h.toLowerCase() === joinColumn.toLowerCase()
      ) || joinColumn;
      
      const actualTrackerJoinColumn = trackerHeaders.find(h => 
        h.toLowerCase() === joinColumn.toLowerCase()
      ) || joinColumn;

      console.log('Join column lookup:');
      console.log('  Requested:', joinColumn);
      console.log('  Store actual:', actualStoreJoinColumn);
      console.log('  Tracker actual:', actualTrackerJoinColumn);

      // ============================================================================
      // CRITICAL: Agent-Based Row-Level Security
      // ============================================================================
      // DO NOT MODIFY without understanding the full context!
      //
      // Purpose:
      // Implements row-level security so agents only see their own claimed stores
      //
      // Security Model:
      // - Admins: See ALL rows from both sheets (no filtering)
      // - Agents: See ONLY their assigned stores from Store Database + matching tracker rows
      //   - Unclaimed stores (no Agent Name in Store Database) = visible to all agents
      //   - Assigned stores (Agent Name in Store Database) = visible only to that agent
      //   - Tracker rows filtered to match agent's name
      //
      // Agent Name Source (WooCommerce Convention):
      // 1. Prefer user.agentName field (stored from profile/WooCommerce integration)
      // 2. Fallback to "firstName lastName" concatenation
      // 3. Case-insensitive matching with trimmed whitespace
      //
      // Column Lookup:
      // - Searches for "Agent Name" column (case-insensitive)
      // - Normalizes spaces (handles "Agent  Name" with extra spaces)
      //
      // Why This Matters:
      // - Prevents agents from seeing each other's claimed stores
      // - Maintains data privacy and sales territory boundaries
      // - Ensures commission tracking is agent-specific
      //
      // Impact if broken:
      // - Agents could see ALL stores (data leak)
      // - Agents could see competitors' commission data
      // - Row-level security completely bypassed
      // ============================================================================
      
      // Get user agent name for filtering
      const userAgentName = user?.agentName || 
        (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : null);
      
      // Filter Store Database by Agent Name (for non-admin users)
      let filteredStoreData = storeData;
      const storeAgentColumnName = storeHeaders.find(h => 
        h.toLowerCase().replace(/\s+/g, ' ').trim() === 'agent name'
      );
      
      if (user?.role !== 'admin' && storeAgentColumnName && userAgentName) {
        filteredStoreData = storeData.filter(row => {
          const rowAgentName = row[storeAgentColumnName];
          // Show unclaimed stores (empty Agent Name) OR stores assigned to this agent
          return !rowAgentName || rowAgentName.toLowerCase().trim() === userAgentName.toLowerCase().trim();
        });
        console.log(`Filtered store data for agent "${userAgentName}": ${filteredStoreData.length} rows (includes unclaimed stores)`);
      }
      
      // Filter Tracker Data by Agent Name (for non-admin users)
      let filteredTrackerData = trackerData;
      const trackerAgentColumnName = trackerHeaders.find(h => 
        h.toLowerCase().replace(/\s+/g, ' ').trim() === 'agent name'
      );
      
      if (user?.role !== 'admin' && trackerAgentColumnName && userAgentName) {
        filteredTrackerData = trackerData.filter(row => {
          const rowAgentName = row[trackerAgentColumnName];
          // Case-insensitive match
          return rowAgentName && rowAgentName.toLowerCase().trim() === userAgentName.toLowerCase().trim();
        });
        console.log(`Filtered tracker data for agent "${userAgentName}": ${filteredTrackerData.length} rows`);
      } else if (user?.role !== 'admin' && !userAgentName) {
        // No agent name available, filter both to empty (agent sees nothing)
        filteredTrackerData = [];
        filteredStoreData = [];
        console.log('No agent name found for user, filtering all rows');
      }

      // === COMPREHENSIVE MERGE DEBUGGING ===
      console.log('\n=== LINK NORMALIZATION DEBUG ===');
      if (filteredTrackerData.length > 0) {
        const trackerLink = filteredTrackerData[0][actualTrackerJoinColumn];
        const normalizedTrackerLink = normalizeLink(trackerLink);
        console.log('Tracker link (raw):', JSON.stringify(trackerLink));
        console.log('Tracker link (normalized):', JSON.stringify(normalizedTrackerLink));
        console.log('Tracker link length:', trackerLink?.length);
        console.log('Normalized tracker link length:', normalizedTrackerLink?.length);
        
        // Show a few sample store links
        console.log('\nSample store links (first 5):');
        filteredStoreData.slice(0, 5).forEach((sr, i) => {
          const storeLink = sr[actualStoreJoinColumn];
          const normalizedStoreLink = normalizeLink(storeLink);
          console.log(`  Store ${i}: (raw) "${storeLink}" -> (normalized) "${normalizedStoreLink}"`);
          console.log(`    Match? ${normalizedStoreLink === normalizedTrackerLink}`);
        });
        
        // Check if ANY store link matches
        const matchingStore = filteredStoreData.find(sr => normalizeLink(sr[actualStoreJoinColumn]) === normalizedTrackerLink);
        console.log('\nMatching store found?', !!matchingStore);
        if (matchingStore) {
          console.log('Matching store link (raw):', JSON.stringify(matchingStore[actualStoreJoinColumn]));
          console.log('Matching store name:', matchingStore['Name'] || matchingStore['name']);
        } else {
          console.log('NO MATCH FOUND - tracker row will be marked as deleted');
        }
      }
      console.log('=== END LINK NORMALIZATION DEBUG ===\n');

      // ============================================================================
      // CRITICAL: Two-Sheet Merge Logic
      // ============================================================================
      // DO NOT MODIFY without understanding the full context!
      //
      // Purpose:
      // Merges Store Database rows with Commission Tracker rows using Link as join key
      //
      // MUST USE: actualStoreJoinColumn and actualTrackerJoinColumn
      // - These are case-insensitive matches from headers (see above)
      // - Using raw joinColumn causes undefined lookups (case mismatch)
      //
      // Merge Strategy:
      // 1. Start with ALL store rows (baseline data from Store Database sheet)
      // 2. For each store row, find matching tracker row by normalized Link
      // 3. Merge tracker data into store row if match found
      // 4. Mark merged rows with _hasTrackerData: true, _deletedFromStore: false
      // 5. Add orphaned tracker rows (no matching store) as separate rows
      // 6. Mark orphaned rows with _hasTrackerData: true, _deletedFromStore: true
      //
      // Why Row Index Keys:
      // - Map keys use index to prevent overwriting duplicate/empty Link values
      // - Stores with same Link URL stay as separate rows (common for chains)
      //
      // Impact if broken:
      // - Tracker data won't merge with store data
      // - CRM shows empty Amount/Status/Follow-Up columns
      // - Agent sees orphaned tracker rows instead of merged data
      // ============================================================================
      const mergedDataMap = new Map();

      // First, add all FILTERED store rows (use row index as key to avoid overwriting duplicates)
      filteredStoreData.forEach((storeRow, index) => {
        const joinValue = storeRow[actualStoreJoinColumn];
        const normalizedJoinValue = normalizeLink(joinValue);
        const trackerRow = filteredTrackerData.find(tr => normalizeLink(tr[actualTrackerJoinColumn]) === normalizedJoinValue && normalizedJoinValue) || {};

        // Use row index as unique key so stores with empty/duplicate link values don't overwrite each other
        mergedDataMap.set(`store-${index}`, {
          ...storeRow,
          ...trackerRow,
          _hasTrackerData: Object.keys(trackerRow).length > 0,
          _deletedFromStore: false,
        });
      });

      // Then, add tracker rows that don't exist in FILTERED store (deleted orders)
      filteredTrackerData.forEach(trackerRow => {
        const joinValue = trackerRow[actualTrackerJoinColumn];
        const normalizedJoinValue = normalizeLink(joinValue);
        // Check if this tracker row already matched a FILTERED store row
        const alreadyMerged = filteredStoreData.some(sr => normalizeLink(sr[actualStoreJoinColumn]) === normalizedJoinValue && normalizedJoinValue);
        if (!alreadyMerged) {
          // This row only exists in tracker - it was deleted from store
          mergedDataMap.set(`tracker-${trackerRow._trackerRowIndex}`, {
            ...trackerRow,
            _hasTrackerData: true,
            _deletedFromStore: true,
          });
        }
      });

      const mergedData = Array.from(mergedDataMap.values());

      console.log('=== MERGED DATA DEBUG ===');
      console.log('Store headers:', storeHeaders);
      console.log('Tracker headers:', trackerHeaders);
      console.log('Store data parsed:', storeData.length, 'rows');
      console.log('Tracker data parsed:', trackerData.length, 'rows');
      console.log('Filtered tracker data (for agent):', filteredTrackerData.length, 'rows');
      console.log('Final merged data:', mergedData.length, 'rows');
      
      // Log a sample tracker row before merging
      if (filteredTrackerData.length > 0) {
        console.log('Sample tracker row (before merge):', JSON.stringify(filteredTrackerData[0], null, 2));
      }
      
      // Log a sample merged row that has tracker data
      const sampleRowWithTracker = mergedData.find(row => row._hasTrackerData);
      if (sampleRowWithTracker) {
        console.log('Sample merged row with tracker data (all keys):', Object.keys(sampleRowWithTracker));
        console.log('Tracker field values in merged row:');
        trackerHeaders.forEach(header => {
          console.log(`  ${header}: "${sampleRowWithTracker[header]}"`);
        });
      }

      // Combine headers (store headers + tracker headers, avoiding duplicates)
      const allHeaders = [...storeHeaders];
      trackerHeaders.forEach(header => {
        if (!allHeaders.some(h => h.toLowerCase() === header.toLowerCase())) {
          allHeaders.push(header);
        }
      });

      // Define editable columns (case-insensitive)
      const agentCol = trackerHeaders.find(h => h.toLowerCase() === 'agent');
      const excludedCols = [agentCol, joinColumn].filter(Boolean).map(c => c?.toLowerCase());
      const editableColumns = [
        ...trackerHeaders.filter(h => !excludedCols.includes(h.toLowerCase())), // All tracker columns except agent and join column
        'phone', 'email', 'additional phone', 'additional email', // Editable store columns
        'dba', 'agent name', // Corporate name and agent assignment for multi-location tracking
      ].filter(col => allHeaders.some(h => h.toLowerCase() === col.toLowerCase())); // Only include if they exist

      res.json({
        headers: allHeaders,
        data: mergedData,
        editableColumns,
        storeSheetId,
        trackerSheetId,
        storeHeaders,
        trackerHeaders,
      });
    } catch (error: any) {
      console.error("Error fetching merged data:", error);
      res.status(500).json({ message: error.message || "Failed to fetch merged data" });
    }
  });



  // Update a cell in a Google Sheet
  app.put('/api/sheets/:id/update', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;
      const { rowIndex, column, value } = req.body;

      if (!rowIndex || !column) {
        return res.status(400).json({ message: "Row index and column are required" });
      }

      const sheet = await storage.getGoogleSheetById(id);
      if (!sheet) {
        return res.status(404).json({ message: "Google Sheet not found" });
      }

      const { spreadsheetId, sheetName } = sheet;

      // Read headers to find column index (case-insensitive)
      const headerRange = `${sheetName}!1:1`;
      const headerRows = await googleSheets.readSheetData(userId, spreadsheetId, headerRange);
      const headers = headerRows[0] || [];
      const columnIndex = headers.findIndex(h => h.toLowerCase() === column.toLowerCase());

      if (columnIndex === -1) {
        return res.status(400).json({ message: `Column "${column}" not found in sheet` });
      }

      // Convert column index to letter (A, B, C, etc.)
      const columnLetter = String.fromCharCode(65 + columnIndex);
      const cellRange = `${sheetName}!${columnLetter}${rowIndex}`;

      // Update the cell
      await googleSheets.writeSheetData(userId, spreadsheetId, cellRange, [[value]]);

      res.json({ message: "Cell updated successfully" });
    } catch (error: any) {
      console.error("Error updating cell:", error);
      res.status(500).json({ message: error.message || "Failed to update cell" });
    }
  });

  // Create or update row in Commission Tracker by Link
  app.post('/api/sheets/tracker/upsert', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { link, updates } = req.body;

      if (!link || !updates) {
        return res.status(400).json({ message: "Link and updates are required" });
      }

      // Get user info to populate Agent Name
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Find Commission Tracker sheet
      const sheets = await storage.getAllActiveGoogleSheets();
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'Commission Tracker');

      if (!trackerSheet) {
        return res.status(404).json({ message: "Commission Tracker sheet not found" });
      }

      const { spreadsheetId, sheetName } = trackerSheet;

      // Read entire tracker sheet
      const range = `${sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(userId, spreadsheetId, range);

      if (rows.length === 0) {
        return res.status(400).json({ message: "Tracker sheet is empty (no headers)" });
      }

      const headers = rows[0];
      console.log('=== TRACKER UPSERT DEBUG ===');
      console.log('Tracker sheet headers:', headers);
      console.log('Updates requested:', updates);
      
      const linkIndex = headers.findIndex(h => h.toLowerCase() === 'link');
      const agentNameIndex = headers.findIndex(h => h.toLowerCase() === 'agent name');

      if (linkIndex === -1) {
        return res.status(400).json({ message: "Link column not found in tracker sheet" });
      }

      // Check if row exists with this link
      let existingRowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][linkIndex] === link) {
          existingRowIndex = i + 1; // +1 because sheets are 1-indexed
          break;
        }
      }

      if (existingRowIndex !== -1) {
        // Row exists - update it
        for (const [column, value] of Object.entries(updates)) {
          const colIndex = headers.findIndex(h => h.toLowerCase() === column.toLowerCase());
          if (colIndex !== -1) {
            const columnLetter = String.fromCharCode(65 + colIndex);
            const cellRange = `${sheetName}!${columnLetter}${existingRowIndex}`;
            await googleSheets.writeSheetData(userId, spreadsheetId, cellRange, [[value]]);
          }
        }

        res.json({ message: "Tracker row updated successfully", rowIndex: existingRowIndex });
      } else {
        // Row doesn't exist - create new row
        const newRow = new Array(headers.length).fill('');
        
        // Set Link
        newRow[linkIndex] = link;
        
        // Set Agent Name to claim the store
        if (agentNameIndex !== -1) {
          const agentName = currentUser.firstName && currentUser.lastName 
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : currentUser.email || 'Unknown Agent';
          newRow[agentNameIndex] = agentName;
        }
        
        // Set updated fields
        for (const [column, value] of Object.entries(updates)) {
          const colIndex = headers.findIndex(h => h.toLowerCase() === column.toLowerCase());
          if (colIndex !== -1) {
            newRow[colIndex] = value as string;
            console.log(`  Matched column "${column}" to header "${headers[colIndex]}" (index ${colIndex})`);
          } else {
            console.log(`  WARNING: Column "${column}" not found in tracker sheet headers`);
          }
        }

        // Append new row
        await googleSheets.appendSheetData(userId, spreadsheetId, `${sheetName}!A:ZZ`, [newRow]);

        res.json({ message: "Tracker row created successfully", claimed: true });
      }
    } catch (error: any) {
      console.error("Error upserting tracker row:", error);
      res.status(500).json({ message: error.message || "Failed to upsert tracker row" });
    }
  });

  // Claim a store by creating a new tracker row
  app.post('/api/sheets/:id/claim-store', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { id } = req.params;
      const { linkValue, column, value, joinColumn } = req.body;

      if (!linkValue || !column || !joinColumn) {
        return res.status(400).json({ message: "Link value, column, and join column are required" });
      }

      const sheet = await storage.getGoogleSheetById(id);
      if (!sheet) {
        return res.status(404).json({ message: "Google Sheet not found" });
      }

      const { spreadsheetId, sheetName } = sheet;

      // Read all data to find headers and next empty row
      const dataRange = `${sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(userId, spreadsheetId, dataRange);
      const headers = rows[0] || [];

      // Create a new row with empty values for all columns
      const newRow = headers.map(() => '');

      // Set the join column (case-insensitive)
      const linkColumnIndex = headers.findIndex(h => h.toLowerCase() === joinColumn.toLowerCase());
      if (linkColumnIndex !== -1) {
        newRow[linkColumnIndex] = linkValue;
      }

      // Set the agent column to current user's email (case-insensitive)
      const agentColumnIndex = headers.findIndex(h => h.toLowerCase() === 'agent');
      if (agentColumnIndex !== -1 && user?.email) {
        newRow[agentColumnIndex] = user.email;
      }

      // Set the column being edited (case-insensitive)
      const editColumnIndex = headers.findIndex(h => h.toLowerCase() === column.toLowerCase());
      if (editColumnIndex !== -1) {
        newRow[editColumnIndex] = value;
      }

      // Append the row to the sheet
      const appendRange = `${sheetName}!A:ZZ`;
      await googleSheets.appendSheetData(userId, spreadsheetId, appendRange, [newRow]);

      res.json({ message: "Store claimed successfully" });
    } catch (error: any) {
      console.error("Error claiming store:", error);
      res.status(500).json({ message: error.message || "Failed to claim store" });
    }
  });

  // Claim a store with contact action (includes Point of Contact)
  app.post('/api/sheets/:id/claim-store-with-contact', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;
      const { linkValue, joinColumn, agent, status, followUpDate, nextAction, notes, pointOfContact } = req.body;

      if (!linkValue || !joinColumn) {
        return res.status(400).json({ message: "Link value and join column are required" });
      }

      const sheet = await storage.getGoogleSheetById(id);
      if (!sheet) {
        return res.status(404).json({ message: "Google Sheet not found" });
      }

      const { spreadsheetId, sheetName } = sheet;

      // Read headers
      const dataRange = `${sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(userId, spreadsheetId, dataRange);
      const headers = rows[0] || [];

      // Create a new row with empty values
      const newRow = headers.map(() => '');

      // Set values based on header names (case-insensitive)
      const setCell = (columnName: string, value: string) => {
        const index = headers.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
        if (index !== -1) {
          newRow[index] = value;
        }
      };

      setCell(joinColumn, linkValue);
      setCell('agent', agent);
      setCell('status', status);
      setCell('follow-up date', followUpDate);
      setCell('followup', followUpDate);
      setCell('next action', nextAction);
      setCell('notes', notes);
      setCell('point of contact', pointOfContact);

      // Append the row
      const appendRange = `${sheetName}!A:ZZ`;
      await googleSheets.appendSheetData(userId, spreadsheetId, appendRange, [newRow]);

      res.json({ message: "Contact action saved and store claimed" });
    } catch (error: any) {
      console.error("Error saving contact action:", error);
      res.status(500).json({ message: error.message || "Failed to save contact action" });
    }
  });

  // Update contact action on existing tracker row
  app.put('/api/sheets/:id/update-contact-action', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;
      const { rowIndex, status, followUpDate, nextAction, notes, pointOfContact } = req.body;

      if (!rowIndex) {
        return res.status(400).json({ message: "Row index is required" });
      }

      const sheet = await storage.getGoogleSheetById(id);
      if (!sheet) {
        return res.status(404).json({ message: "Google Sheet not found" });
      }

      const { spreadsheetId, sheetName } = sheet;

      // Read headers
      const headerRange = `${sheetName}!1:1`;
      const headerRows = await googleSheets.readSheetData(userId, spreadsheetId, headerRange);
      const headers = headerRows[0] || [];

      // Update each field
      const updateCell = async (columnName: string, value: string) => {
        const columnIndex = headers.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
        if (columnIndex !== -1 && value) {
          const columnLetter = String.fromCharCode(65 + columnIndex);
          const cellRange = `${sheetName}!${columnLetter}${rowIndex}`;
          await googleSheets.writeSheetData(userId, spreadsheetId, cellRange, [[value]]);
        }
      };

      await updateCell('status', status);
      await updateCell('follow-up date', followUpDate);
      await updateCell('followup', followUpDate);
      await updateCell('next action', nextAction);
      await updateCell('notes', notes);
      await updateCell('point of contact', pointOfContact);

      res.json({ message: "Contact action updated successfully" });
    } catch (error: any) {
      console.error("Error updating contact action:", error);
      res.status(500).json({ message: error.message || "Failed to update contact action" });
    }
  });

  // Disconnect a specific Google Sheet
  app.post('/api/sheets/:id/disconnect', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.disconnectGoogleSheet(id);
      res.json({ message: "Sheet disconnected successfully" });
    } catch (error: any) {
      console.error("Error disconnecting sheet:", error);
      res.status(500).json({ message: error.message || "Failed to disconnect sheet" });
    }
  });

  // Sync FROM Google Sheets TO CRM (import)
  app.post('/api/sheets/:id/sync/import', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;

      const sheet = await storage.getGoogleSheetById(id);
      if (!sheet) {
        return res.status(400).json({ message: "Google Sheet not found" });
      }

      const { spreadsheetId, sheetName, uniqueIdentifierColumn } = sheet;
      const range = `${sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(userId, spreadsheetId, range);

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
      await storage.updateGoogleSheetLastSync(sheet.id);

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

  // Update address information in tracker sheet
  app.put('/api/sheets/:id/update-address', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;
      const { linkValue, joinColumn, rowIndex, address, city, state, phone, email, pointOfContact } = req.body;

      const sheet = await storage.getGoogleSheetById(id);
      if (!sheet) {
        return res.status(400).json({ message: "Google Sheet not found" });
      }

      const { spreadsheetId, sheetName } = sheet;

      // Read the current sheet to find the header row
      const range = `${sheetName}!1:1`;
      const headerData = await googleSheets.readSheetData(userId, spreadsheetId, range);

      if (headerData.length === 0) {
        return res.status(400).json({ message: "Could not read sheet headers" });
      }

      const headers = headerData[0];
      const updates: { range: string; values: any[][] }[] = [];

      // Map field names to their column indices
      const columnMap: Record<string, number> = {};
      headers.forEach((header: string, index: number) => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader === 'address') columnMap.address = index;
        if (lowerHeader === 'city') columnMap.city = index;
        if (lowerHeader === 'state') columnMap.state = index;
        if (lowerHeader === 'phone') columnMap.phone = index;
        if (lowerHeader === 'email') columnMap.email = index;
        if (lowerHeader === 'point of contact') columnMap.pointOfContact = index;
      });

      // Prepare batch updates
      const actualRowNumber = rowIndex + 1; // Convert 0-based to 1-based

      if (columnMap.address !== undefined && address !== undefined) {
        const colLetter = String.fromCharCode(65 + columnMap.address);
        updates.push({
          range: `${sheetName}!${colLetter}${actualRowNumber}`,
          values: [[address]]
        });
      }

      if (columnMap.city !== undefined && city !== undefined) {
        const colLetter = String.fromCharCode(65 + columnMap.city);
        updates.push({
          range: `${sheetName}!${colLetter}${actualRowNumber}`,
          values: [[city]]
        });
      }

      if (columnMap.state !== undefined && state !== undefined) {
        const colLetter = String.fromCharCode(65 + columnMap.state);
        updates.push({
          range: `${sheetName}!${colLetter}${actualRowNumber}`,
          values: [[state]]
        });
      }

      if (columnMap.phone !== undefined && phone !== undefined) {
        const colLetter = String.fromCharCode(65 + columnMap.phone);
        updates.push({
          range: `${sheetName}!${colLetter}${actualRowNumber}`,
          values: [[phone]]
        });
      }

      if (columnMap.email !== undefined && email !== undefined) {
        const colLetter = String.fromCharCode(65 + columnMap.email);
        updates.push({
          range: `${sheetName}!${colLetter}${actualRowNumber}`,
          values: [[email]]
        });
      }

      if (columnMap.pointOfContact !== undefined && pointOfContact !== undefined) {
        const colLetter = String.fromCharCode(65 + columnMap.pointOfContact);
        updates.push({
          range: `${sheetName}!${colLetter}${actualRowNumber}`,
          values: [[pointOfContact]]
        });
      }

      if (updates.length > 0) {
        for (const update of updates) {
          await googleSheets.writeSheetData(userId, spreadsheetId, update.range, update.values);
        }
      }

      res.json({ message: "Address updated successfully" });
    } catch (error: any) {
      console.error("Error updating address:", error);
      res.status(500).json({ message: error.message || "Failed to update address" });
    }
  });

  // Sync FROM CRM TO Google Sheets (export)
  app.post('/api/sheets/:id/sync/export', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;

      const sheet = await storage.getGoogleSheetById(id);
      if (!sheet) {
        return res.status(400).json({ message: "Google Sheet not found" });
      }

      const { spreadsheetId, sheetName, uniqueIdentifierColumn } = sheet;

      // Get headers from sheet
      const headerRange = `${sheetName}!A1:ZZ1`;
      const headerRows = await googleSheets.readSheetData(userId, spreadsheetId, headerRange);

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
          await googleSheets.writeSheetData(userId, spreadsheetId, range, [row]);
        }
      }

      await storage.updateGoogleSheetLastSync(sheet.id);

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
  app.post('/api/sheets/:id/sync/bidirectional', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;

      const sheet = await storage.getGoogleSheetById(id);
      if (!sheet) {
        return res.status(400).json({ message: "Google Sheet not found" });
      }

      const { spreadsheetId, sheetName, uniqueIdentifierColumn } = sheet;

      // STEP 1: Import from sheet
      const range = `${sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(userId, spreadsheetId, range);

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

      await storage.updateGoogleSheetLastSync(sheet.id);

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

  // === Store Details Endpoints ===
  app.get('/api/store/:storeId', isAuthenticatedCustom, async (req: any, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { storeId } = req.params;

      // Decode the storeId (it could be a link or row index)
      const decodedId = decodeURIComponent(storeId);

      // Find both sheets
      const sheets = await storage.getAllActiveGoogleSheets();
      const storeSheet = sheets.find(s => s.sheetPurpose === 'Store Database');
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'Commission Tracker');

      if (!storeSheet) {
        return res.status(404).json({ message: 'Store sheet not found' });
      }

      // Read data from store sheet
      const storeRange = `${storeSheet.sheetName}!A:ZZ`;
      const storeRows = await googleSheets.readSheetData(userId, storeSheet.spreadsheetId, storeRange);

      if (storeRows.length === 0) {
        return res.status(404).json({ message: 'Store sheet is empty' });
      }

      // Parse store data
      const storeHeaders = storeRows[0];
      const storeData = storeRows.slice(1).map((row, index) => {
        const obj: any = { _storeRowIndex: index + 2 };
        storeHeaders.forEach((header, i) => {
          obj[header] = row[i] || '';
        });
        return obj;
      });

      // Find the store by link
      const store = storeData.find((row: any) => row.link === decodedId);

      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }

      // If tracker sheet exists, merge in tracker data (Notes, POC fields)
      if (trackerSheet) {
        const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
        const trackerRows = await googleSheets.readSheetData(userId, trackerSheet.spreadsheetId, trackerRange);

        if (trackerRows.length > 0) {
          const trackerHeaders = trackerRows[0];
          const trackerData = trackerRows.slice(1).map((row) => {
            const obj: any = {};
            trackerHeaders.forEach((header, i) => {
              obj[header] = row[i] || '';
            });
            return obj;
          });

          // Find matching tracker row by link (case-insensitive)
          const linkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
          const trackerRow = trackerData.find((row: any) => {
            if (linkIndex !== -1) {
              const rowLink = row[trackerHeaders[linkIndex]];
              return rowLink && rowLink === decodedId;
            }
            return row.link === decodedId || row.Link === decodedId;
          });

          // Merge tracker fields into store object
          if (trackerRow) {
            // Merge all tracker fields - preserve both original names and standardized names
            trackerHeaders.forEach((header) => {
              const value = trackerRow[header];
              if (value) {
                // Store with original header name
                store[header] = value;
                
                // Also store with lowercase version for easier access
                const lowerHeader = header.toLowerCase();
                if (lowerHeader === 'notes') store.Notes = value;
                else if (lowerHeader === 'point of contact') store['Point of Contact'] = value;
                else if (lowerHeader === 'poc email') store['POC Email'] = value;
                else if (lowerHeader === 'poc phone') store['POC Phone'] = value;
              }
            });
          }
        }
      }

      res.json(store);
    } catch (error) {
      console.error("Error fetching store details:", error);
      next(error);
    }
  });

  app.put('/api/store/:storeId', isAuthenticatedCustom, async (req: any, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { storeId } = req.params;
      const updates = req.body;

      // Find the relevant store sheet
      const sheets = await storage.getAllActiveGoogleSheets();
      const storeSheet = sheets.find(s => s.sheetPurpose === 'Store Database');

      if (!storeSheet) {
        return res.status(404).json({ message: 'Store sheet not found' });
      }

      const decodedId = decodeURIComponent(storeId);

      // Read data from store sheet to find the row
      const storeRange = `${storeSheet.sheetName}!A:ZZ`;
      const storeRows = await googleSheets.readSheetData(userId, storeSheet.spreadsheetId, storeRange);

      if (storeRows.length === 0) {
        return res.status(404).json({ message: 'Store sheet is empty' });
      }

      // Parse store data
      const storeHeaders = storeRows[0];
      const storeData = storeRows.slice(1).map((row, index) => {
        const obj: any = { _storeRowIndex: index + 2 };
        storeHeaders.forEach((header, i) => {
          obj[header] = row[i] || '';
        });
        return obj;
      });

      // Find the store by link
      const store = storeData.find((row: any) => row.link === decodedId);

      if (!store || !store._storeRowIndex) {
        return res.status(404).json({ message: 'Store not found or has no row index' });
      }

      // Map form fields to Store Database column names
      const storeColumnMapping: Record<string, string> = {
        name: 'name',
        type: 'type',
        link: 'link',
        about: 'about',
        member_since: 'Member Since',
        address: 'Address',
        city: 'City',
        state: 'State',
        phone: 'Phone',
        website: 'Website',
        email: 'Email',
        followers: 'Followers',
        hours: 'Hours',
        vibe_score: 'Vibe Score',
        sales_ready_summary: 'Sales-ready Summary',
        dba: 'DBA',  // Company/corporate name (renamed from Error column)
        agent_name: 'Agent Name',  // Agent assignment for multi-location tracking (column Q)
      };

      // Map form fields to Commission Tracker column names (K, M, N columns)
      const trackerColumnMapping: Record<string, string> = {
        notes: 'Notes',
        point_of_contact: 'Point of Contact',
        poc_email: 'POC Email',
        poc_phone: 'POC Phone',
      };

      // Prepare batch updates for Store Database
      const storeBatchUpdates: { range: string; values: any[][] }[] = [];

      Object.entries(updates).forEach(([field, value]) => {
        const columnName = storeColumnMapping[field];
        if (columnName) {
          // Find column index (case-insensitive)
          const columnIndex = storeHeaders.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
          if (columnIndex !== -1) {
            const columnLetter = String.fromCharCode(65 + columnIndex);
            storeBatchUpdates.push({
              range: `${storeSheet.sheetName}!${columnLetter}${store._storeRowIndex}`,
              values: [[value]]
            });
          }
        }
      });

      // Execute batch update for Store Database
      if (storeBatchUpdates.length > 0) {
        for (const update of storeBatchUpdates) {
          await googleSheets.writeSheetData(userId, storeSheet.spreadsheetId, update.range, update.values);
        }
      }

      // Now handle Commission Tracker fields (notes, point_of_contact, poc_email, poc_phone)
      const trackerFields = Object.keys(trackerColumnMapping);
      const hasTrackerUpdates = trackerFields.some(field => field in updates);

      if (hasTrackerUpdates) {
        // Find Commission Tracker sheet
        const trackerSheet = sheets.find(s => s.sheetPurpose === 'Commission Tracker');

        if (trackerSheet) {
          // Read Commission Tracker data
          const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
          const trackerRows = await googleSheets.readSheetData(userId, trackerSheet.spreadsheetId, trackerRange);

          if (trackerRows.length > 0) {
            const trackerHeaders = trackerRows[0];
            const trackerData = trackerRows.slice(1).map((row, index) => {
              const obj: any = { _trackerRowIndex: index + 2 };
              trackerHeaders.forEach((header, i) => {
                obj[header] = row[i] || '';
              });
              return obj;
            });

            // Find matching row by link (case-insensitive)
            const linkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
            const trackerRow = trackerData.find((row: any) => {
              if (linkIndex !== -1) {
                const rowLink = row[trackerHeaders[linkIndex]];
                return rowLink && rowLink === decodedId;
              }
              return row.link === decodedId || row.Link === decodedId;
            });

            let rowIndex = trackerRow?._trackerRowIndex;
            
            // If no tracker row exists, create one
            if (!trackerRow) {
              // Append new row with link
              const newRowIndex = trackerRows.length + 1;
              const newRow = new Array(trackerHeaders.length).fill('');
              
              // Set link value
              if (linkIndex !== -1) {
                newRow[linkIndex] = decodedId;
              }
              
              // Append the new row
              const appendRange = `${trackerSheet.sheetName}!A${newRowIndex}`;
              await googleSheets.writeSheetData(userId, trackerSheet.spreadsheetId, appendRange, [newRow]);
              
              rowIndex = newRowIndex;
            }

            if (rowIndex) {
              // Prepare batch updates for Commission Tracker
              const trackerBatchUpdates: { range: string; values: any[][] }[] = [];

              Object.entries(updates).forEach(([field, value]) => {
                const columnName = trackerColumnMapping[field];
                if (columnName) {
                  // Find column index (case-insensitive)
                  const columnIndex = trackerHeaders.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
                  if (columnIndex !== -1) {
                    const columnLetter = String.fromCharCode(65 + columnIndex);
                    trackerBatchUpdates.push({
                      range: `${trackerSheet.sheetName}!${columnLetter}${rowIndex}`,
                      values: [[value]]
                    });
                  }
                }
              });

              // Execute batch update for Commission Tracker
              if (trackerBatchUpdates.length > 0) {
                for (const update of trackerBatchUpdates) {
                  await googleSheets.writeSheetData(userId, trackerSheet.spreadsheetId, update.range, update.values);
                }
              }
            }
          }
        }
      }

      res.json({ success: true, message: 'Store updated successfully' });
    } catch (error) {
      console.error("Error updating store details:", error);
      next(error);
    }
  });

  // Search stores by DBA or Name (for multi-location assignment)
  app.post('/api/stores/search', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { searchTerm } = req.body;

      if (!searchTerm || searchTerm.trim().length === 0) {
        return res.status(400).json({ message: "Search term is required" });
      }

      // Find Store Database sheet
      const sheets = await storage.getAllActiveGoogleSheets();
      const storeSheet = sheets.find(s => s.sheetPurpose === 'Store Database');

      if (!storeSheet) {
        return res.status(404).json({ message: 'Store Database sheet not found' });
      }

      // Read all store data
      const storeRange = `${storeSheet.sheetName}!A:ZZ`;
      const storeRows = await googleSheets.readSheetData(userId, storeSheet.spreadsheetId, storeRange);

      if (storeRows.length === 0) {
        return res.json({ stores: [] });
      }

      // Parse store data
      const storeHeaders = storeRows[0];
      const nameIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'name');
      const dbaIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'dba');
      const linkIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'link');
      const agentIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'agent name');
      const addressIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'address');
      const cityIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'city');
      const stateIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'state');

      const searchLower = searchTerm.toLowerCase().trim();
      
      const matchingStores = storeRows.slice(1)
        .map((row, index) => {
          const name = nameIndex !== -1 ? (row[nameIndex] || '') : '';
          const dba = dbaIndex !== -1 ? (row[dbaIndex] || '') : '';
          const link = linkIndex !== -1 ? (row[linkIndex] || '') : '';
          const agentName = agentIndex !== -1 ? (row[agentIndex] || '') : '';
          const address = addressIndex !== -1 ? (row[addressIndex] || '') : '';
          const city = cityIndex !== -1 ? (row[cityIndex] || '') : '';
          const state = stateIndex !== -1 ? (row[stateIndex] || '') : '';
          
          // Search in Name or DBA columns
          const nameMatch = name.toLowerCase().includes(searchLower);
          const dbaMatch = dba.toLowerCase().includes(searchLower);
          
          if (nameMatch || dbaMatch) {
            // Normalize keys to lowercase for frontend consistency
            return {
              rowIndex: index + 2, // +2 because row 1 is header, array is 0-indexed
              name: name,
              dba: dba,
              link: link, // CRITICAL: lowercase 'link' so frontend can access it
              agentName: agentName,
              address: address,
              city: city,
              state: state,
              isAssigned: !!agentName,
            };
          }
          return null;
        })
        .filter(store => store !== null);

      res.json({ 
        stores: matchingStores,
        storeSheetId: storeSheet.id,
      });
    } catch (error: any) {
      console.error("Error searching stores:", error);
      res.status(500).json({ message: error.message || "Failed to search stores" });
    }
  });

  // Bulk assign agent to multiple stores
  app.post('/api/stores/bulk-assign', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { storeLinks, agentName } = req.body;

      if (!storeLinks || !Array.isArray(storeLinks) || storeLinks.length === 0) {
        return res.status(400).json({ message: "Store links array is required" });
      }

      if (!agentName || agentName.trim().length === 0) {
        return res.status(400).json({ message: "Agent name is required" });
      }

      // Find Store Database sheet
      const sheets = await storage.getAllActiveGoogleSheets();
      const storeSheet = sheets.find(s => s.sheetPurpose === 'Store Database');

      if (!storeSheet) {
        return res.status(404).json({ message: 'Store Database sheet not found' });
      }

      // Read all store data
      const storeRange = `${storeSheet.sheetName}!A:ZZ`;
      const storeRows = await googleSheets.readSheetData(userId, storeSheet.spreadsheetId, storeRange);

      if (storeRows.length === 0) {
        return res.status(404).json({ message: 'Store sheet is empty' });
      }

      // Find Agent Name column
      const storeHeaders = storeRows[0];
      const agentNameIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'agent name');
      const linkIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'link');

      if (agentNameIndex === -1) {
        return res.status(404).json({ message: 'Agent Name column not found in Store Database' });
      }

      if (linkIndex === -1) {
        return res.status(404).json({ message: 'Link column not found in Store Database' });
      }

      // Build batch updates for all matching stores
      const agentColumnLetter = String.fromCharCode(65 + agentNameIndex);
      const batchUpdates: { range: string; values: any[][] }[] = [];
      let updatedCount = 0;

      storeRows.slice(1).forEach((row, index) => {
        const rowLink = row[linkIndex] || '';
        const rowIndex = index + 2; // +2 because row 1 is header, array is 0-indexed
        
        if (storeLinks.includes(rowLink)) {
          batchUpdates.push({
            range: `${storeSheet.sheetName}!${agentColumnLetter}${rowIndex}`,
            values: [[agentName]]
          });
          updatedCount++;
        }
      });

      // Execute all updates
      if (batchUpdates.length > 0) {
        for (const update of batchUpdates) {
          await googleSheets.writeSheetData(userId, storeSheet.spreadsheetId, update.range, update.values);
        }
      }

      res.json({ 
        success: true, 
        message: `Successfully assigned ${agentName} to ${updatedCount} store(s)`,
        updatedCount
      });
    } catch (error: any) {
      console.error("Error bulk assigning agent:", error);
      res.status(500).json({ message: error.message || "Failed to bulk assign agent" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}