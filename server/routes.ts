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
      const { firstName, lastName, email } = validation.data;

      const updated = await storage.updateUser(userId, { firstName, lastName, email });
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
    statusOptions: z.array(z.string()).optional(),
    colorPresets: z.array(z.object({
      name: z.string(),
      color: z.string()
    })).optional(),
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

  // Get smart match suggestions for an order
  app.get('/api/orders/:orderId/match-suggestions', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const { orderId } = req.params;

      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const allClients = await storage.getAllClients();
      const suggestions: any[] = [];

      const orderCompany = order.billingCompany || '';
      const orderEmail = order.billingEmail || '';

      for (const client of allClients) {
        let score = 0;
        const reasons: string[] = [];

        // Get client fields
        const clientName = client.data?.['name'] || client.data?.['Name'] || '';
        const clientCompany = client.data?.['company'] || client.data?.['Company'] || '';
        const clientEmail = client.data?.['email'] || client.data?.['Email'] || client.data?.['Contact Email'] || '';
        const clientAddress = client.data?.['address'] || client.data?.['Address'] || '';
        const clientCity = client.data?.['city'] || client.data?.['City'] || '';
        const clientState = client.data?.['state'] || client.data?.['State'] || '';

        // Company name similarity (weighted heavily)
        if (orderCompany && (clientCompany || clientName)) {
          const companySimilarity = Math.max(
            stringSimilarity(orderCompany, clientCompany),
            stringSimilarity(orderCompany, clientName)
          );
          if (companySimilarity > 0.6) {
            score += companySimilarity * 50;
            reasons.push(`Company name ${Math.round(companySimilarity * 100)}% similar`);
          }
        }

        // Email similarity
        if (orderEmail && clientEmail) {
          const emailSimilarity = stringSimilarity(orderEmail, clientEmail);
          if (emailSimilarity > 0.8) {
            score += emailSimilarity * 30;
            reasons.push(`Email ${Math.round(emailSimilarity * 100)}% similar`);
          }
        }

        // Exact email match (highest priority)
        if (orderEmail && clientEmail && orderEmail.toLowerCase() === clientEmail.toLowerCase()) {
          score += 100;
          reasons.push('Exact email match');
        }

        // Exact company match
        if (orderCompany && (clientCompany || clientName)) {
          if (orderCompany.toLowerCase() === clientCompany.toLowerCase() || 
              orderCompany.toLowerCase() === clientName.toLowerCase()) {
            score += 100;
            reasons.push('Exact company name match');
          }
        }

        if (score > 10) {
          suggestions.push({
            client,
            score: Math.min(score, 100),
            reasons,
            displayName: clientName || clientCompany || clientEmail,
            displayInfo: `${clientCity ? clientCity + ', ' : ''}${clientState || ''}`.trim(),
          });
        }
      }

      // Sort by score descending and return top 5
      suggestions.sort((a, b) => b.score - a.score);
      const topSuggestions = suggestions.slice(0, 5);

      res.json({
        order,
        suggestions: topSuggestions,
      });
    } catch (error: any) {
      console.error("Error getting match suggestions:", error);
      res.status(500).json({ message: error.message || "Failed to get suggestions" });
    }
  });

  // Manually match an order to a client
  app.post('/api/orders/:orderId/match', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { clientId } = req.body;

      if (!clientId) {
        return res.status(400).json({ message: "Client ID is required" });
      }

      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Update order with client ID
      await storage.updateOrder(orderId, { clientId });

      // Update client sales data
      const orderDate = new Date(order.orderDate);
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

      res.json({ message: "Order matched successfully", order: { ...order, clientId } });
    } catch (error: any) {
      console.error("Error matching order:", error);
      res.status(500).json({ message: error.message || "Failed to match order" });
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

      // Filter tracker data by agent (if user is not admin)
      let filteredTrackerData = trackerData;
      const agentColumnName = trackerHeaders.find(h => h.toLowerCase() === 'agent');
      if (user?.role !== 'admin' && agentColumnName) {
        const userEmail = user?.email || '';
        filteredTrackerData = trackerData.filter(row => row[agentColumnName] === userEmail);
      }

      // Merge data by join column - include rows from BOTH sheets
      const mergedDataMap = new Map();

      // First, add all store rows (use row index as key to avoid overwriting duplicates)
      storeData.forEach((storeRow, index) => {
        const joinValue = storeRow[joinColumn];
        const trackerRow = filteredTrackerData.find(tr => tr[joinColumn] === joinValue && joinValue) || {};

        // Use row index as unique key so stores with empty/duplicate link values don't overwrite each other
        mergedDataMap.set(`store-${index}`, {
          ...storeRow,
          ...trackerRow,
          _hasTrackerData: Object.keys(trackerRow).length > 0,
          _deletedFromStore: false,
        });
      });

      // Then, add tracker rows that don't exist in store (deleted orders)
      filteredTrackerData.forEach(trackerRow => {
        const joinValue = trackerRow[joinColumn];
        // Check if this tracker row already matched a store row
        const alreadyMerged = storeData.some(sr => sr[joinColumn] === joinValue && joinValue);
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

      console.log('Store data parsed:', storeData.length, 'rows');
      console.log('Tracker data parsed:', trackerData.length, 'rows');
      console.log('Filtered tracker data (for agent):', filteredTrackerData.length, 'rows');
      console.log('Final merged data:', mergedData.length, 'rows');

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

      // Find the relevant store sheet
      const sheets = await storage.getAllActiveGoogleSheets();
      const storeSheet = sheets.find(s => s.sheetPurpose === 'clients');

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
      const storeSheet = sheets.find(s => s.sheetPurpose === 'clients');

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

      // Map form fields to column names in the Google Sheet
      const columnMapping: Record<string, string> = {
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
      };

      // Prepare batch updates
      const batchUpdates: { range: string; values: any[][] }[] = [];

      Object.entries(updates).forEach(([field, value]) => {
        const columnName = columnMapping[field];
        if (columnName) {
          // Find column index (case-insensitive)
          const columnIndex = storeHeaders.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
          if (columnIndex !== -1) {
            const columnLetter = String.fromCharCode(65 + columnIndex);
            batchUpdates.push({
              range: `${storeSheet.sheetName}!${columnLetter}${store._storeRowIndex}`,
              values: [[value]]
            });
          }
        }
      });

      // Execute batch update - write each cell individually
      if (batchUpdates.length > 0) {
        for (const update of batchUpdates) {
          await googleSheets.writeSheetData(userId, storeSheet.spreadsheetId, update.range, update.values);
        }
      }

      res.json({ success: true, message: 'Store updated successfully' });
    } catch (error) {
      console.error("Error updating store details:", error);
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}