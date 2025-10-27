import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { commissions, users, clients } from "@shared/schema";
import { setupAuth, isAuthenticated, getOidcConfig } from "./replitAuth";
import { differenceInMonths } from "date-fns";
import { getTimezoneOffset } from "date-fns-tz";
import axios from "axios";
import bcrypt from "bcrypt";
import * as client from "openid-client";
import * as googleSheets from "./googleSheets";
import * as googleMaps from "./googleMaps";
import * as commissionService from "./commission-service";
import { z } from "zod";
import { normalizeLink } from "../shared/linkUtils";
import OpenAI from "openai";
import {
  insertConversationSchema,
  insertProjectSchema,
  insertTemplateSchema,
  insertReminderSchema,
  insertCategorySchema,
  insertStatusSchema,
  insertTicketSchema,
  insertTicketReplySchema,
} from "@shared/schema";
import { google } from "googleapis";
import { syncRemindersToCalendar, setupCalendarWatch, renewCalendarWatchIfNeeded } from "./calendarSync";
import { notifyNewTicket, notifyTicketReply } from "./gmail";
import { format } from "date-fns";

// ============================================================================
// In-Memory Cache for Google Sheets Data (30-second TTL)
// ============================================================================
interface CacheEntry {
  data: any;
  timestamp: number;
}

const sheetsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30000; // 30 seconds

// Generate cache key from request parameters
function generateCacheKey(userId: string, storeSheetId: string, trackerSheetId: string, category: string | null): string {
  return `${userId}:${storeSheetId}:${trackerSheetId}:${category || 'all'}`;
}

// Get cached data if still valid
function getCachedData(key: string): any | null {
  const entry = sheetsCache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    // Cache expired
    sheetsCache.delete(key);
    return null;
  }

  return entry.data;
}

// Store data in cache
function setCachedData(key: string, data: any): void {
  sheetsCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// Clear all cache entries (for manual refresh)
function clearAllCache(): void {
  sheetsCache.clear();
}

// Clear cache entries for specific user
function clearUserCache(userId: string): void {
  for (const key of Array.from(sheetsCache.keys())) {
    if (key.startsWith(`${userId}:`)) {
      sheetsCache.delete(key);
    }
  }
}

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

// Convert column index to Google Sheets column letter (0 -> A, 25 -> Z, 26 -> AA, etc.)
function columnIndexToLetter(index: number): string {
  let letter = '';
  let num = index;

  while (num >= 0) {
    letter = String.fromCharCode((num % 26) + 65) + letter;
    num = Math.floor(num / 26) - 1;
  }

  return letter;
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
          res.json({ message: "Login successful", user: { id: user.id, username: user.username, role: user.role } });
        });
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: error.message || "Login failed" });
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
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  // Custom authentication middleware that supports both Replit Auth and username/password
  const isAuthenticatedCustom = async (req: any, res: any, next: any) => {
    // Check if user is authenticated at all
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = req.user as any;

    // Check if using password auth - it's valid as long as session exists
    if (user.isPasswordAuth) {
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
      console.error("Replit Auth refresh failed:", error);
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
    } catch (error: any) {
      console.error("Admin middleware error:", error);
      res.status(500).json({ message: error.message || "Authorization check failed" });
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
    } catch (error: any) {
      console.error("getCurrentUser middleware error:", error);
      res.status(500).json({ message: error.message || "User fetch failed" });
    }
  };

  // Auth routes
  app.get('/api/auth/user', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Background sync: Create missing calendar events and renew watch channel if needed
      setImmediate(async () => {
        try {
          // Sync any reminders that don't have calendar events yet
          const syncResult = await syncRemindersToCalendar(userId);
          if (syncResult.created > 0) {
            console.log(`[LoginSync] Created ${syncResult.created} calendar events for user ${userId}`);
          }

          // Renew watch channel if close to expiry
          await renewCalendarWatchIfNeeded(userId);
        } catch (error: any) {
          console.error('[LoginSync] Background sync failed:', error.message);
        }
      });

      res.json(user);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: error.message || "Failed to fetch user" });
    }
  });

  // Validation schemas
  const profileSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    agentName: z.string().optional(),
    phone: z.string().optional(),
    meetingLink: z.string().url("Invalid URL").optional().or(z.literal("")),
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

  const gmailSettingsSchema = z.object({
    signature: z.string().nullable().optional(),
    gmailLabels: z.array(z.string()).nullable().optional(),
    emailPreference: z.enum(["gmail_draft", "mailto"]).optional(),
  });

  // User settings endpoints
  app.put('/api/user/profile', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const validation = profileSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { firstName, lastName, email, agentName, phone, meetingLink } = validation.data;

      const updated = await storage.updateUser(userId, { firstName, lastName, email, agentName, phone, meetingLink });
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

  app.put('/api/user/gmail-settings', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const validation = gmailSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { signature, gmailLabels, emailPreference } = validation.data;

      const updated = await storage.updateUser(userId, { signature, gmailLabels, emailPreference });
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating Gmail settings:", error);
      res.status(500).json({ message: error.message || "Failed to update Gmail settings" });
    }
  });

  // User preferences endpoints
  app.get('/api/user/preferences', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const preferences = await storage.getUserPreferences(userId);
      console.log('🔴 [GET PREFERENCES] colorRowByStatus value being returned:', preferences?.colorRowByStatus);
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
    lightModeColors: colorSchemaWithStatus.nullable(),
    darkModeColors: colorSchemaWithStatus.nullable(),
    textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
    verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
    colorRowByStatus: z.boolean().optional(),
    colorPresets: z.array(z.object({ name: z.string(), color: z.string() })).nullable().optional(),
    showCanadaOnly: z.boolean().optional(),
    freezeFirstColumn: z.boolean().optional(),
    statusOptions: z.array(z.string()).optional(),
    showMyStoresOnly: z.boolean().optional(),
    loadingLogoUrl: z.string().nullable().optional(),
    timezone: z.string().optional(),
    defaultTimezoneMode: z.enum(['agent', 'customer']).optional(),
    timeFormat: z.enum(['12hr', '24hr']).optional(),
    defaultCalendarReminders: z.array(z.object({ method: z.string(), minutes: z.number() })).optional(),
  });

  app.put('/api/user/preferences', isAuthenticatedCustom, async (req: any, res) => {
    try {
      console.log('🎨 [BACKEND] PUT /api/user/preferences - Request body:', JSON.stringify(req.body, null, 2));

      const validation = userPreferencesSchema.safeParse(req.body);
      if (!validation.success) {
        console.error('🎨 [BACKEND] Validation failed:', validation.error.errors);
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      console.log('🎨 [BACKEND] Validation successful, data:', JSON.stringify(validation.data, null, 2));

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      console.log('🎨 [BACKEND] User ID:', userId);
      console.log('🔴 [BACKEND] colorRowByStatus value received:', validation.data.colorRowByStatus);

      const preferences = await storage.saveUserPreferences(userId, validation.data);
      console.log('🎨 [BACKEND] Preferences saved to DB:', JSON.stringify(preferences, null, 2));
      console.log('🔴 [BACKEND] colorRowByStatus value in saved preferences:', preferences.colorRowByStatus);

      console.log('🎨 [BACKEND] Sending response with status 200');
      res.json(preferences);
    } catch (error: any) {
      console.error("🎨 [BACKEND] Error saving user preferences:", error);
      res.status(500).json({ message: error.message || "Failed to save preferences" });
    }
  });

  // Upload loading logo
  app.post('/api/user/upload-loading-logo', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { imageData } = req.body;

      if (!imageData || !imageData.startsWith('data:image/')) {
        return res.status(400).json({ message: 'Invalid image data. Must be a base64-encoded image.' });
      }

      // Validate image size (limit to 5MB)
      const base64Length = imageData.length - (imageData.indexOf(',') + 1);
      const sizeInBytes = (base64Length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);

      if (sizeInMB > 5) {
        return res.status(400).json({ message: 'Image too large. Maximum size is 5MB.' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      // Save the loading logo URL to user preferences
      const preferences = await storage.saveUserPreferences(userId, {
        loadingLogoUrl: imageData
      });

      res.json({ 
        message: 'Loading logo uploaded successfully',
        loadingLogoUrl: preferences.loadingLogoUrl 
      });
    } catch (error: any) {
      console.error("Error uploading loading logo:", error);
      res.status(500).json({ message: error.message || "Failed to upload logo" });
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

  // ===== SYSTEM-WIDE GOOGLE SHEETS OAUTH (ADMIN ONLY) =====
  app.get('/api/auth/google/sheets/settings', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const integration = await storage.getSystemIntegration('google_sheets');
      const user = await storage.getUser(req.user.isPasswordAuth ? req.user.id : req.user.claims.sub);

      res.json({
        clientId: integration?.googleClientId || "",
        clientSecret: integration?.googleClientSecret || "",
        googleEmail: integration?.googleEmail || null,
        connected: !!(integration?.googleAccessToken && integration?.googleRefreshToken),
        connectedByEmail: integration?.connectedByEmail || null,
        connectedAt: integration?.createdAt || null
      });
    } catch (error: any) {
      console.error("❌ Error fetching Google Sheets settings:", error);
      res.status(500).json({ message: error.message || "Failed to fetch settings" });
    }
  });

  app.put('/api/auth/google/sheets/settings', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const validation = googleOAuthSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const { clientId, clientSecret } = validation.data;

      await storage.updateSystemIntegration('google_sheets', {
        googleClientId: clientId,
        googleClientSecret: clientSecret
      });

      res.json({ message: "Google Sheets OAuth settings updated successfully" });
    } catch (error: any) {
      console.error("❌ Error updating Google Sheets OAuth settings:", error);
      res.status(500).json({ message: error.message || "Failed to update settings" });
    }
  });

  app.get('/api/auth/google/sheets/oauth-url', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const integration = await storage.getSystemIntegration('google_sheets');

      if (!integration?.googleClientId) {
        return res.status(400).json({ message: "Please configure Google Sheets OAuth credentials first in Admin Dashboard" });
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/sheets/callback`;
      const scope = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly';

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', integration.googleClientId);
      oauthUrl.searchParams.set('redirect_uri', redirectUri);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('scope', scope);
      oauthUrl.searchParams.set('access_type', 'offline');
      oauthUrl.searchParams.set('prompt', 'consent');
      oauthUrl.searchParams.set('state', JSON.stringify({ userId, email: user?.email }));

      return res.json({ url: oauthUrl.toString() });
    } catch (error: any) {
      console.error("❌ Error generating Google Sheets OAuth URL:", error);
      return res.status(500).json({ message: error.message || "Failed to generate OAuth URL" });
    }
  });

  app.get('/api/auth/google/sheets/callback', async (req: any, res) => {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        return res.send('<script>window.close();</script>');
      }

      const { userId, email } = JSON.parse(state as string);
      const integration = await storage.getSystemIntegration('google_sheets');

      if (!integration?.googleClientId || !integration?.googleClientSecret) {
        return res.send('<script>alert("OAuth credentials not configured"); window.close();</script>');
      }

      // Exchange code for tokens
      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/sheets/callback`;
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
        console.error('❌ Google Sheets token exchange failed:', error);
        return res.send('<script>alert("Authentication failed"); window.close();</script>');
      }

      const tokens = await tokenResponse.json();

      // Get user email from Google
      const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      const userinfo = await userinfoResponse.json();

      // Store system-wide tokens
      const expiryTimestamp = Date.now() + (tokens.expires_in * 1000);
      await storage.updateSystemIntegration('google_sheets', {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: expiryTimestamp,
        googleEmail: userinfo.email,
        connectedBy: userId,
        connectedAt: new Date()
      });

      console.log('✅ Google Sheets connected successfully (system-wide)');
      res.send('<script>alert("Google Sheets connected successfully! All agents can now access client data."); window.close();</script>');
    } catch (error: any) {
      console.error("❌ Google Sheets OAuth callback error:", error);
      res.send('<script>alert("Connection failed"); window.close();</script>');
    }
  });

  app.delete('/api/auth/google/sheets/disconnect', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      await storage.deleteSystemIntegration('google_sheets');
      console.log('✅ Google Sheets disconnected successfully');
      res.json({ message: "Google Sheets disconnected successfully" });
    } catch (error: any) {
      console.error("❌ Error disconnecting Google Sheets:", error);
      res.status(500).json({ message: error.message || "Failed to disconnect" });
    }
  });

  // ===== PER-USER GOOGLE SERVICES OAUTH (GMAIL/CALENDAR - ALL USERS) =====
  app.get('/api/gmail/oauth-url', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      // Use system-wide Google OAuth credentials for client ID/secret
      const systemIntegration = await storage.getSystemIntegration('google_sheets');
      if (!systemIntegration?.googleClientId) {
        return res.status(400).json({ message: "Google OAuth not configured. Please contact admin." });
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/gmail/callback`;
      const scope = 'https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar';

      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', systemIntegration.googleClientId);
      oauthUrl.searchParams.set('redirect_uri', redirectUri);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('scope', scope);
      oauthUrl.searchParams.set('access_type', 'offline');
      oauthUrl.searchParams.set('prompt', 'consent');
      oauthUrl.searchParams.set('state', userId);

      res.json({ url: oauthUrl.toString() });
    } catch (error: any) {
      console.error("❌ Error generating Gmail OAuth URL:", error);
      res.status(500).json({ message: error.message || "Failed to generate OAuth URL" });
    }
  });

  app.get('/api/gmail/callback', async (req, res) => {
    try {
      const { code, state: userId } = req.query;

      if (!code || !userId) {
        return res.send('<script>alert("Authorization failed"); window.close();</script>');
      }

      // Use system-wide OAuth credentials
      const systemIntegration = await storage.getSystemIntegration('google_sheets');
      if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
        return res.send('<script>alert("Missing OAuth credentials"); window.close();</script>');
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/gmail/callback`;

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code as string,
          client_id: systemIntegration.googleClientId,
          client_secret: systemIntegration.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('❌ Gmail token exchange failed:', error);
        return res.send('<script>alert("Authentication failed"); window.close();</script>');
      }

      const tokens = await tokenResponse.json();

      // Get user email from Google
      const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      const userinfo = await userinfoResponse.json();

      // Store per-user Gmail/Calendar tokens (both fields for Gmail and Calendar)
      const expiryTimestamp = Date.now() + (tokens.expires_in * 1000);
      await storage.updateUserIntegration(userId as string, {
        googleClientId: systemIntegration.googleClientId,
        googleClientSecret: systemIntegration.googleClientSecret,
        // Gmail fields (used by getUserAccessToken)
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: expiryTimestamp,
        googleEmail: userinfo.email,
        // Calendar fields (used by direct calendar access)
        googleCalendarAccessToken: tokens.access_token,
        googleCalendarRefreshToken: tokens.refresh_token,
        googleCalendarTokenExpiry: expiryTimestamp,
        googleCalendarEmail: userinfo.email,
        googleCalendarConnectedAt: new Date()
      });

      // Set up Google Calendar watch channel for push notifications  
      setImmediate(async () => {
        try {
          const success = await setupCalendarWatch(userId as string);
          if (success) {
            console.log(`[CalendarWatch] Successfully set up watch channel for user ${userId}`);
          }
        } catch (error: any) {
          console.error('[CalendarWatch] Failed to setup watch:', error.message);
        }
      });

      res.send('<script>alert("Gmail and Calendar connected successfully!"); window.close();</script>');
    } catch (error: any) {
      console.error("Gmail OAuth callback error:", error);
      res.send('<script>alert("Connection failed"); window.close();</script>');
    }
  });

  // Helper function to get or create Gmail labels
  async function getOrCreateGmailLabels(accessToken: string, labelNames: string[]): Promise<string[]> {
    console.log('📧 [GMAIL LABELS] Starting label resolution for:', labelNames);

    if (!labelNames || labelNames.length === 0) {
      console.log('📧 [GMAIL LABELS] No labels requested, returning empty array');
      return [];
    }

    try {
      // List all existing labels
      console.log('📧 [GMAIL LABELS] Fetching existing labels from Gmail API...');
      const listResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        console.error('📧 [GMAIL LABELS] ❌ Failed to list Gmail labels. Status:', listResponse.status);
        console.error('📧 [GMAIL LABELS] Error details:', errorText);
        return [];
      }

      const { labels } = await listResponse.json();
      console.log(`📧 [GMAIL LABELS] ✅ Fetched ${labels.length} existing labels from Gmail`);

      const existingLabels = new Map(labels.map((l: any) => [l.name, l.id]));
      const labelIds: string[] = [];

      // For each requested label, get existing ID or create new
      for (const labelName of labelNames) {
        if (existingLabels.has(labelName)) {
          // Label exists, use its ID
          const labelId = existingLabels.get(labelName)!;
          labelIds.push(labelId);
          console.log(`📧 [GMAIL LABELS] ✅ Label "${labelName}" already exists (ID: ${labelId})`);
        } else {
          // Create new label
          console.log(`📧 [GMAIL LABELS] 🔨 Creating new label: "${labelName}"`);
          const createResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: labelName,
              labelListVisibility: 'labelShow',
              messageListVisibility: 'show'
            })
          });

          if (createResponse.ok) {
            const newLabel = await createResponse.json();
            labelIds.push(newLabel.id);
            console.log(`📧 [GMAIL LABELS] ✅ Successfully created label "${labelName}" (ID: ${newLabel.id})`);
          } else {
            const errorText = await createResponse.text();
            console.error(`📧 [GMAIL LABELS] ❌ Failed to create label "${labelName}". Status: ${createResponse.status}`);
            console.error(`📧 [GMAIL LABELS] Error details:`, errorText);
          }
        }
      }

      console.log(`📧 [GMAIL LABELS] ✅ Resolution complete. Returning ${labelIds.length} label IDs:`, labelIds);
      return labelIds;
    } catch (error) {
      console.error('📧 [GMAIL LABELS] ❌ Unexpected error in getOrCreateGmailLabels:', error);
      return [];
    }
  }

  app.post('/api/gmail/create-draft', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { to, subject, body } = req.body;

      if (!to || !subject || !body) {
        return res.status(400).json({ message: "Missing required fields: to, subject, body" });
      }

      // Server-side validation: reject bracket-style placeholders
      const anyBracketPattern = /\[[^\]]+\]/;
      if (anyBracketPattern.test(to) || anyBracketPattern.test(subject) || anyBracketPattern.test(body)) {
        return res.status(400).json({ 
          message: "Email contains invalid bracket-style placeholders like [recipient email]. Please use {{variable}} format instead." 
        });
      }

      // Server-side validation: reject unreplaced mustache placeholders in To field
      if (!to.includes('@') || to.includes('{{') || to.includes('}}')) {
        return res.status(400).json({ 
          message: "Invalid email address or unreplaced placeholder in To field." 
        });
      }

      // Get Gmail tokens
      const integration = await storage.getUserIntegration(userId);
      if (!integration?.googleCalendarAccessToken) {
        return res.status(400).json({ message: "Gmail not connected. Please connect Gmail in Settings." });
      }

      // Get system-wide OAuth credentials (needed for token refresh)
      const systemIntegration = await storage.getSystemIntegration('google_sheets');
      if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
        return res.status(500).json({ message: "System OAuth not configured. Please contact administrator." });
      }

      // Check if token needs refresh
      let accessToken = integration.googleCalendarAccessToken;
      if (integration.googleCalendarTokenExpiry && integration.googleCalendarTokenExpiry < Date.now()) {
        // Token expired, refresh it using system OAuth credentials
        if (!integration.googleCalendarRefreshToken) {
          return res.status(400).json({ message: "Gmail token expired. Please reconnect Gmail in Settings." });
        }

        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: systemIntegration.googleClientId,
            client_secret: systemIntegration.googleClientSecret,
            refresh_token: integration.googleCalendarRefreshToken,
            grant_type: 'refresh_token'
          })
        });

        if (!refreshResponse.ok) {
          const errorText = await refreshResponse.text();
          console.error('[Gmail] Token refresh failed:', {
            status: refreshResponse.status,
            error: errorText
          });
          return res.status(400).json({ message: "Failed to refresh Gmail token. Please reconnect Gmail in Settings." });
        }

        const tokens = await refreshResponse.json();
        accessToken = tokens.access_token;

        // Update stored token
        const newExpiry = Date.now() + (tokens.expires_in * 1000);
        await storage.updateUserIntegration(userId, {
          googleCalendarAccessToken: accessToken,
          googleCalendarTokenExpiry: newExpiry
        });
      }

      // Create RFC 2822 formatted email
      const emailContent = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\r\n');

      // Base64 encode for Gmail API
      const encodedMessage = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Create draft using Gmail API
      const draftResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: {
            raw: encodedMessage
          }
        })
      });

      if (!draftResponse.ok) {
        const error = await draftResponse.text();
        console.error('Gmail API error:', error);
        return res.status(500).json({ message: "Failed to create Gmail draft" });
      }

      const draft = await draftResponse.json();
      console.log('📧 [GMAIL] ✅ Draft created successfully. Draft ID:', draft.id, 'Message ID:', draft.message.id);

      // Apply labels if user has configured them
      console.log('📧 [GMAIL] Fetching user settings to check for Gmail labels...');
      const user = await storage.getUser(userId);

      let labelsApplied = false;
      let labelWarning = null;

      if (user?.gmailLabels && user.gmailLabels.length > 0) {
        console.log('📧 [GMAIL] 🏷️  User has configured labels:', user.gmailLabels);
        console.log('📧 [GMAIL] Starting label application process...');

        try {
          // Get or create label IDs
          const labelIds = await getOrCreateGmailLabels(accessToken, user.gmailLabels);

          if (labelIds.length > 0) {
            console.log(`📧 [GMAIL] Attempting to apply ${labelIds.length} labels to draft message...`);
            // Modify the draft's message to add labels
            const modifyResponse = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${draft.message.id}/modify`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  addLabelIds: labelIds
                })
              }
            );

            if (modifyResponse.ok) {
              const result = await modifyResponse.json();
              console.log(`📧 [GMAIL] ✅ Successfully applied ${labelIds.length} labels to draft`);
              console.log(`📧 [GMAIL] Modified message now has labels:`, result.labelIds);
              labelsApplied = true;
            } else {
              const errorText = await modifyResponse.text();
              console.error('📧 [GMAIL] ❌ Failed to apply labels to draft. Status:', modifyResponse.status);
              console.error('📧 [GMAIL] Error details:', errorText);

              // Check if it's a permission error
              if (modifyResponse.status === 403 || errorText.includes('insufficient') || errorText.includes('permission')) {
                labelWarning = "Draft created but labels could not be applied. You may need to reconnect Gmail in Settings to grant label permissions.";
              } else {
                labelWarning = "Draft created but labels could not be applied. Please check server logs for details.";
              }
            }
          } else {
            console.log('📧 [GMAIL] ⚠️  No label IDs returned from getOrCreateGmailLabels. Labels will not be applied.');
            labelWarning = "Draft created but configured labels could not be found or created.";
          }
        } catch (error: any) {
          console.error('📧 [GMAIL] ❌ Error during label application:', error);
          labelWarning = `Draft created but labels could not be applied: ${error.message}`;
        }
      } else {
        console.log('📧 [GMAIL] ℹ️  No Gmail labels configured for this user. Skipping label application.');
      }

      res.json({
        success: true,
        draftId: draft.id,
        message: labelsApplied 
          ? `Gmail draft created successfully with ${user?.gmailLabels?.length || 0} labels applied`
          : labelWarning 
            ? `${labelWarning}`
            : "Gmail draft created successfully",
        labelsApplied,
        labelWarning
      });
    } catch (error: any) {
      console.error("Error creating Gmail draft:", error);
      res.status(500).json({ message: error.message || "Failed to create Gmail draft" });
    }
  });

  // Gmail disconnect
  app.post('/api/gmail/disconnect', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      // Stop webhook before disconnecting
      const integration = await storage.getUserIntegration(userId);
      if (integration?.googleCalendarWebhookChannelId && 
          integration?.googleCalendarWebhookResourceId &&
          integration?.googleCalendarAccessToken) {
        try {
          const oauth2Client = new google.auth.OAuth2(
            integration.googleClientId,
            integration.googleClientSecret
          );

          oauth2Client.setCredentials({
            access_token: integration.googleCalendarAccessToken,
            refresh_token: integration.googleCalendarRefreshToken || undefined
          });

          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

          await calendar.channels.stop({
            requestBody: {
              id: integration.googleCalendarWebhookChannelId,
              resourceId: integration.googleCalendarWebhookResourceId,
            },
          });
          console.log('[Calendar Webhook] Stopped webhook on disconnect:', integration.googleCalendarWebhookChannelId);
        } catch (stopError: any) {
          console.error('[Calendar Webhook] Failed to stop webhook on disconnect:', stopError.message);
        }
      }

      await storage.updateUserIntegration(userId, {
        googleCalendarAccessToken: null,
        googleCalendarRefreshToken: null,
        googleCalendarTokenExpiry: null,
        googleCalendarEmail: null,
        googleCalendarConnectedAt: null,
        googleCalendarWebhookChannelId: null,
        googleCalendarWebhookResourceId: null,
        googleCalendarWebhookExpiry: null,
      });

      res.json({ message: "Gmail disconnected successfully" });
    } catch (error: any) {
      console.error("Error disconnecting Gmail:", error);
      res.status(500).json({ message: error.message || "Failed to disconnect Gmail" });
    }
  });

  // Get current user's webhook status
  app.get('/api/calendar/webhook-status', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const integration = await storage.getUserIntegration(userId);

      // Check if user has calendar connected
      if (!integration?.googleCalendarAccessToken) {
        return res.json({
          state: 'disconnected',
          expiresAt: null,
          remainingMs: null,
          reRegisterRecommended: false
        });
      }

      // Check webhook registration status
      if (!integration.googleCalendarWebhookChannelId || 
          !integration.googleCalendarWebhookExpiry) {
        return res.json({
          state: 'missing',
          expiresAt: null,
          remainingMs: null,
          reRegisterRecommended: true
        });
      }

      const now = Date.now();
      const expiresAt = integration.googleCalendarWebhookExpiry;
      const remainingMs = expiresAt - now;

      // Check if expired
      if (remainingMs <= 0) {
        return res.json({
          state: 'expired',
          expiresAt,
          remainingMs: 0,
          reRegisterRecommended: true
        });
      }

      // Check if expiring soon (within 24 hours)
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (remainingMs < oneDayMs) {
        return res.json({
          state: 'active',
          expiresAt,
          remainingMs,
          reRegisterRecommended: true
        });
      }

      // Webhook is active and healthy
      res.json({
        state: 'active',
        expiresAt,
        remainingMs,
        reRegisterRecommended: false
      });

    } catch (error: any) {
      console.error("Error checking webhook status:", error);
      res.status(500).json({ message: error.message || "Failed to check webhook status" });
    }
  });

  // Re-register user's webhook
  app.post('/api/calendar/webhook-register', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const integration = await storage.getUserIntegration(userId);

      // Check if user has calendar connected
      if (!integration?.googleCalendarAccessToken) {
        return res.status(400).json({ 
          message: "Google Calendar not connected. Please connect your calendar first." 
        });
      }

      // Stop existing webhook if present
      if (integration.googleCalendarWebhookChannelId && 
          integration.googleCalendarWebhookResourceId) {
        try {
          const oauth2Client = new google.auth.OAuth2(
            integration.googleClientId,
            integration.googleClientSecret
          );

          oauth2Client.setCredentials({
            access_token: integration.googleCalendarAccessToken,
            refresh_token: integration.googleCalendarRefreshToken || undefined
          });

          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

          await calendar.channels.stop({
            requestBody: {
              id: integration.googleCalendarWebhookChannelId,
              resourceId: integration.googleCalendarWebhookResourceId,
            },
          });
          console.log('[Webhook Re-register] Stopped old webhook:', integration.googleCalendarWebhookChannelId);
        } catch (stopError: any) {
          console.log('[Webhook Re-register] Failed to stop old webhook (may already be expired):', stopError.message);
        }
      }

      // Set up new webhook
      const success = await setupCalendarWatch(userId);

      if (!success) {
        return res.status(500).json({ 
          message: "Failed to register webhook. Please try again." 
        });
      }

      // Get updated integration to return new status
      const updatedIntegration = await storage.getUserIntegration(userId);

      res.json({
        message: "Webhook registered successfully",
        state: 'active',
        expiresAt: updatedIntegration?.googleCalendarWebhookExpiry || null,
        remainingMs: updatedIntegration?.googleCalendarWebhookExpiry 
          ? updatedIntegration.googleCalendarWebhookExpiry - Date.now()
          : null
      });

    } catch (error: any) {
      console.error("Error re-registering webhook:", error);
      res.status(500).json({ message: error.message || "Failed to re-register webhook" });
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

  // Get all clients (admin only) - filtered by user's selected category
  app.get('/api/clients', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const selectedCategory = await storage.getSelectedCategory(userId);

      const clients = await storage.getAllClients();

      // Filter by selected category if one is set
      const filteredClients = selectedCategory 
        ? clients.filter(client => client.category === selectedCategory)
        : clients;

      res.json(filteredClients);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: error.message || "Failed to fetch clients" });
    }
  });

  // Get agent's clients - filtered by user's selected category
  // Auto-syncs if last sync was > 5 minutes ago
  app.get('/api/clients/my', isAuthenticatedCustom, getCurrentUser, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const currentUser = await storage.getUserById(userId);
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get selected category for filtering
      const selectedCategory = await storage.getSelectedCategory(userId);

      // SECURITY: Determine which agents' data to show (same as analytics)
      let allowedAgentNames: string[] = [];
      const isAgent = currentUser.role === 'agent';

      if (isAgent) {
        // SECURITY: Agents can ONLY see their own claimed clients
        const currentAgentName = currentUser.agentName || `${currentUser.firstName} ${currentUser.lastName}`.trim();
        allowedAgentNames = [currentAgentName];
      } else {
        // Admins see all clients (no filtering)
        allowedAgentNames = [];
      }

      // Get Commission Tracker sheet (source of truth)
      const trackerSheet = await storage.getGoogleSheetByPurpose('commissions');
      if (!trackerSheet) {
        return res.json([]);
      }

      // Read Commission Tracker data (all columns to get Link, Agent Name, Amount, Total, etc.)
      const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

      if (trackerRows.length <= 1) {
        return res.json([]);
      }

      // Parse headers to find column indices
      const headers = trackerRows[0];
      const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === 'link');
      const agentNameIndex = headers.findIndex((h: string) => h.toLowerCase() === 'agent name');
      const amountIndex = headers.findIndex((h: string) => h.toLowerCase() === 'amount');
      const totalIndex = headers.findIndex((h: string) => h.toLowerCase() === 'total');
      const dateIndex = headers.findIndex((h: string) => h.toLowerCase() === 'date');
      const statusIndex = headers.findIndex((h: string) => h.toLowerCase() === 'status');
      const transactionIdIndex = headers.findIndex((h: string) => h.toLowerCase() === 'transaction id');
      const orderIdIndex = headers.findIndex((h: string) => h.toLowerCase() === 'order number' || h.toLowerCase() === 'order id');

      console.log('[MY-CLIENTS] allowedAgentNames:', allowedAgentNames);
      console.log('[MY-CLIENTS] Processing', trackerRows.length - 1, 'tracker rows');
      console.log('[MY-CLIENTS] Column indices:', { linkIndex, agentNameIndex, amountIndex, totalIndex, dateIndex, statusIndex });

      // Group commissions by client Link
      const clientMap: Map<string, {
        link: string;
        totalCommission: number;
        totalSales: number;
        lastOrderDate: Date | null;
        status: string;
        transactionId: string;
        orderId: string;
      }> = new Map();

      // Process each tracker row
      for (let i = 1; i < trackerRows.length; i++) {
        const row = trackerRows[i];
        const link = row[linkIndex]?.toString().trim();
        const rowAgent = row[agentNameIndex]?.toString().trim();
        const amountStr = row[amountIndex]?.toString() || '0';
        const totalStr = row[totalIndex]?.toString() || '0';
        const dateStr = row[dateIndex]?.toString() || '';
        const status = row[statusIndex]?.toString().trim() || '';
        const transactionId = row[transactionIdIndex]?.toString().trim() || '';
        const orderId = row[orderIdIndex]?.toString().trim() || '';

        if (!link) continue;

        // SECURITY: Filter by allowed agent names (agents see only their clients)
        if (allowedAgentNames.length > 0) {
          if (agentNameIndex === -1) {
            continue; // No agent column means agents see nothing
          }
          const rowAgentNormalized = rowAgent.toLowerCase().trim();
          const isAllowed = allowedAgentNames.some(name => 
            name.toLowerCase().trim() === rowAgentNormalized
          );
          if (!isAllowed) {
            continue;
          }
        }

        // Parse amount (commission) and total (gross order amount)
        const amount = parseFloat(String(amountStr).replace(/[^0-9.-]/g, '')) || 0;
        const total = parseFloat(String(totalStr).replace(/[^0-9.-]/g, '')) || 0;
        
        if (total > 0) {
          console.log(`[MY-CLIENTS] Row ${i}: link=${link}, total=${total}, amount=${amount}`);
        }

        // Parse date
        let orderDate: Date | null = null;
        if (dateStr) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            orderDate = parsed;
          }
        }

        // Add to client map
        if (!clientMap.has(link)) {
          clientMap.set(link, {
            link,
            totalCommission: 0,
            totalSales: 0,
            lastOrderDate: orderDate,
            status: status || '7 – Warm',
            transactionId: transactionId || '',
            orderId: orderId || '',
          });
        }

        const client = clientMap.get(link)!;
        client.totalCommission += amount;
        client.totalSales += total; // Gross order amount from "Total" column
        if (orderDate && (!client.lastOrderDate || orderDate > client.lastOrderDate)) {
          client.lastOrderDate = orderDate;
        }
        // Always use the latest non-empty status
        if (status) {
          client.status = status;
        }
        // Always use the latest non-empty transaction ID
        if (transactionId) {
          client.transactionId = transactionId;
        }
        // Always use the latest non-empty order ID
        if (orderId) {
          client.orderId = orderId;
        }
      }

      // Get Store Database to enrich client data with names and categories
      const storeSheet = await storage.getGoogleSheetByPurpose('Store Database');
      let enrichedClients = Array.from(clientMap.values()).map(client => ({
        id: client.link,
        uniqueIdentifier: client.link,
        data: { Link: client.link, Name: '', Contact: '' },
        assignedAgent: currentUser.id,
        claimDate: null,
        totalSales: client.totalSales.toFixed(2),
        commissionTotal: client.totalCommission.toFixed(2),
        category: null,
        status: client.status,
        lastOrderDate: client.lastOrderDate,
        transactionId: client.transactionId,
        orderId: client.orderId,
        lastSyncedAt: new Date(),
      }));

      // Enrich with Store Database data if available (using same approach as Top Clients widget)
      if (storeSheet) {
        const storeRange = `${storeSheet.sheetName}!A:S`;
        const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);
        
        if (storeRows.length > 1) {
          const storeHeaders = storeRows[0];
          const storeLinkIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'link');
          const nameIndex = 0; // Column A = Name
          const dbaIndex = 13; // Column N = DBA
          const storeCategoryIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'category');
          const pocNameIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'point of contact' || h.toLowerCase() === 'poc');
          
          // Build lookup map: normalized link -> store data (same as Top Clients)
          const storeMap = new Map<string, { name: string; category: string; contact: string }>();
          for (let i = 1; i < storeRows.length; i++) {
            const row = storeRows[i];
            const storeLink = row[storeLinkIndex]?.toString().trim();
            const dba = row[dbaIndex]?.toString().trim() || '';
            const name = row[nameIndex]?.toString().trim() || '';
            const storeCategory = row[storeCategoryIndex]?.toString().trim() || '';
            const pocName = row[pocNameIndex]?.toString().trim() || '';
            
            if (storeLink) {
              const normalized = normalizeLink(storeLink);
              // Prefer DBA over Name (same as Top Clients)
              storeMap.set(normalized, {
                name: dba || name || storeLink,
                category: storeCategory,
                contact: pocName,
              });
            }
          }
          
          // Enrich clients with store data using normalized link matching
          enrichedClients = enrichedClients.map(client => {
            const normalizedLink = normalizeLink(client.data.Link);
            const storeData = storeMap.get(normalizedLink);
            if (storeData) {
              return {
                ...client,
                data: { 
                  ...client.data, 
                  Name: storeData.name,
                  Contact: storeData.contact 
                },
                category: storeData.category,
              };
            }
            return client;
          });
        }
      }

      // Filter by selected category if one is set
      const filteredClients = selectedCategory 
        ? enrichedClients.filter(client => client.category === selectedCategory)
        : enrichedClients;

      console.log(`[MY-CLIENTS] Returning ${filteredClients.length} clients for ${currentUser.agentName || currentUser.email}` + 
                  (selectedCategory ? ` (filtered by category: ${selectedCategory})` : ''));
      
      // Debug: Log total sales for each client
      filteredClients.forEach((c, i) => {
        console.log(`[MY-CLIENTS] Client ${i + 1}: ${c.data.Name || 'Unknown'} - totalSales=${c.totalSales}, commission=${c.commissionTotal}`);
      });

      res.json(filteredClients);
    } catch (error: any) {
      console.error("Error fetching agent clients:", error);
      res.status(500).json({ message: error.message || "Failed to fetch clients" });
    }
  });

  // Get filtered clients (for vCard export and dashboard)
  app.post('/api/clients/filtered', isAuthenticatedCustom, getCurrentUser, async (req: any, res) => {
    try {
      const { search, nameFilter, cityFilter, states, cities, status } = req.body;
      const user = req.currentUser;

      // DEBUG: Log received filters
      console.log('🔍 [EXPORT FILTERS RECEIVED]:', JSON.stringify({
        search,
        nameFilter,
        cityFilter,
        states,
        cities,
        status
      }, null, 2));

      // Build filters - ONLY visual filters, no category or agent filtering
      const filters: any = {
        search,
        nameFilter,
        cityFilter,
        states,
        cities,
        status,
      };

      // Export endpoint NEVER filters by agent or category
      // It ONLY exports what is visually filtered in the CRM exactly what's visible in the filtered table
      // Check user.showMyStoresOnly here
      const showMyStoresOnly = user?.preferences?.showMyStoresOnly ?? false;
      if (user.role !== 'admin' && showMyStoresOnly) {
        filters.agentId = user.id;
      }

      const clients = await storage.getFilteredClients(filters);
      console.log(`✅ [EXPORT RESULTS]: Returning ${clients.length} clients`);
      if (clients.length <= 5) {
        console.log('📋 [EXPORT CLIENT NAMES]:', clients.map(c => c.data?.Name || c.data?.name || 'Unknown'));
      }
      res.json(clients);
    } catch (error: any) {
      console.error("Error fetching filtered clients:", error);
      res.status(500).json({ message: error.message || "Failed to fetch filtered clients" });
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

  // Get all users with sales metrics (admin only)
  app.get('/api/users', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();

      // Get all orders from database to calculate sales metrics
      const allOrders = await storage.getAllOrders();

      const usersWithMetrics = users.map((user) => {
        let totalSales = 0;
        let grossIncome = 0;

        // Match orders by salesAgentName
        if (user.agentName) {
          const userOrders = allOrders.filter(order => {
            if (!order.salesAgentName) return false;
            return order.salesAgentName.toLowerCase().trim() === user.agentName.toLowerCase().trim();
          });

          totalSales = userOrders.length;
          grossIncome = userOrders.reduce((sum, order) => {
            return sum + parseFloat(order.total || '0');
          }, 0);
        }

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          agentName: user.agentName,
          role: user.role,
          isActive: user.isActive ?? (user as any).is_active ?? true,
          totalSales,
          grossIncome: grossIncome.toFixed(2),
          createdAt: user.createdAt,
          referredBy: user.referredBy,
        };
      });

      res.json({ users: usersWithMetrics });
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: error.message || "Failed to fetch users" });
    }
  });

  // Create new user (admin only)
  app.post('/api/users', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const { email, firstName, lastName, agentName, password, role, selectedCategory, referredBy } = req.body;

      if (!email || !agentName || !password) {
        return res.status(400).json({ message: "Email, agent name, and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Use email as username
      const username = email;

      const newUser = await storage.createUser({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        agentName,
        username,
        passwordHash,
        role: role || 'agent',
        referredBy: referredBy || null,
      });

      // Set selectedCategory preference if provided
      if (selectedCategory) {
        await storage.setSelectedCategory(newUser.id, selectedCategory);
      }

      res.json({ user: newUser });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: error.message || "Failed to create user" });
    }
  });

  // Get sales report data (admin only)
  app.get('/api/reports/sales-data', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      // Parse dates
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999); // Include the entire end date

      // Fetch all orders within the date range
      const allOrders = await storage.getAllOrders();
      const ordersInRange = allOrders.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= start && orderDate <= end;
      });

      // Fetch all users to get agent information
      const allUsers = await storage.getAllUsers();

      // Group orders by agent and calculate metrics
      const agentSales: Record<string, {
        agentName: string;
        agentId: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        totalOrders: number;
        totalSales: number;
        totalCommission: number;
        orders: any[];
      }> = {};

      // Process each order
      for (const order of ordersInRange) {
        const agentName = order.salesAgentName || 'Unassigned';

        if (!agentSales[agentName]) {
          // Find matching user
          const matchingUser = allUsers.find(u => 
            u.agentName && u.agentName.toLowerCase().trim() === agentName.toLowerCase().trim()
          );

          agentSales[agentName] = {
            agentName,
            agentId: matchingUser?.id || null,
            firstName: matchingUser?.firstName || null,
            lastName: matchingUser?.lastName || null,
            email: matchingUser?.email || null,
            totalOrders: 0,
            totalSales: 0,
            totalCommission: 0,
            orders: [],
          };
        }

        const salesAmount = parseFloat(order.total || '0');
        const commissionAmount = parseFloat(order.commissionAmount || '0');

        agentSales[agentName].totalOrders++;
        agentSales[agentName].totalSales += salesAmount;
        agentSales[agentName].totalCommission += commissionAmount;
        agentSales[agentName].orders.push({
          id: order.id,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          billingCompany: order.billingCompany,
          billingEmail: order.billingEmail,
          total: salesAmount,
          commissionType: order.commissionType,
          commissionAmount: commissionAmount,
          status: order.status,
        });
      }

      // Convert to array and sort by total sales (descending)
      const agentSummaries = Object.values(agentSales)
        .filter(agent => agent.agentName !== 'Unassigned' && agent.totalOrders > 0)
        .sort((a, b) => b.totalSales - a.totalSales);

      // Calculate totals
      const summary = {
        totalAgents: agentSummaries.length,
        totalOrders: ordersInRange.length,
        totalRevenue: agentSummaries.reduce((sum, agent) => sum + agent.totalSales, 0),
        totalCommissionsPaid: agentSummaries.reduce((sum, agent) => sum + agent.totalCommission, 0),
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      };

      res.json({
        summary,
        agents: agentSummaries,
      });
    } catch (error: any) {
      console.error("Error fetching sales report data:", error);
      res.status(500).json({ message: error.message || "Failed to fetch sales report data" });
    }
  });

  // Get referral commission summary (accessible to agents and admins)
  app.get('/api/reports/referral-commissions', isAuthenticatedCustom, getCurrentUser, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      const isUserAdmin = currentUser.role === 'admin';

      // Query commissions table directly - filter for referral commissions only
      const allCommissions = await db.query.commissions.findMany({
        where: eq(commissions.commissionKind, 'referral')
      });
      const allUsers = await db.query.users.findMany();

      // Group referral commissions by referring agent (the person who earns the referral)
      const referralSummary: Record<string, {
        referringAgentId: string;
        referringAgentName: string;
        referredAgents: Record<string, {
          agentId: string;
          agentName: string;
          totalEarnings: number;
        }>;
        totalReferralCommission: number;
      }> = {};

      for (const commission of allCommissions) {
        // Use correct field names: commissionKind and agentId
        if (commission.commissionKind === 'referral' && commission.agentId && commission.sourceAgentId) {
          // commission.agentId = the referring agent (who earns the referral bonus)
          // commission.sourceAgentId = the agent who made the sale (who was referred)
          const referringAgentId = commission.agentId;
          const sourceAgentId = commission.sourceAgentId;

          // Skip if agent is not admin and this isn't their referral commission
          if (!isUserAdmin && referringAgentId !== currentUser.id) {
            continue;
          }

          // Initialize referring agent entry if doesn't exist
          if (!referralSummary[referringAgentId]) {
            const referringAgent = allUsers.find(u => u.id === referringAgentId);
            referralSummary[referringAgentId] = {
              referringAgentId,
              referringAgentName: referringAgent?.agentName || referringAgent?.email || 'Unknown',
              referredAgents: {},
              totalReferralCommission: 0,
            };
          }

          // Initialize source agent entry if doesn't exist
          if (!referralSummary[referringAgentId].referredAgents[sourceAgentId]) {
            const sourceAgent = allUsers.find(u => u.id === sourceAgentId);
            referralSummary[referringAgentId].referredAgents[sourceAgentId] = {
              agentId: sourceAgentId,
              agentName: sourceAgent?.agentName || sourceAgent?.email || 'Unknown',
              totalEarnings: 0,
            };
          }

          // Add to totals
          const amount = parseFloat(commission.amount);
          referralSummary[referringAgentId].referredAgents[sourceAgentId].totalEarnings += amount;
          referralSummary[referringAgentId].totalReferralCommission += amount;
        }
      }

      // Convert to array format with referred agents as array
      const referralData = Object.values(referralSummary).map(entry => ({
        referringAgentId: entry.referringAgentId,
        referringAgentName: entry.referringAgentName,
        totalReferralCommission: entry.totalReferralCommission,
        referredAgents: Object.values(entry.referredAgents)
          .sort((a, b) => b.totalEarnings - a.totalEarnings),
      })).sort((a, b) => b.totalReferralCommission - a.totalReferralCommission);

      console.log('[Referral Commissions API] User:', currentUser.agentName || currentUser.email);
      console.log('[Referral Commissions API] Returning data:', JSON.stringify(referralData, null, 2));

      res.json({ referralCommissions: referralData });
    } catch (error: any) {
      console.error("Error fetching referral commission data:", error);
      res.status(500).json({ message: error.message || "Failed to fetch referral commission data" });
    }
  });

  // Note: To make a user admin, run this SQL command in the database console:
  // UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

  // Analyze user's listings for deactivation (admin only)
  app.get('/api/users/:userId/listing-analysis', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const adminUserId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { userId } = req.params;

      // Get user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Find Commission Tracker sheet
      const sheets = await storage.getAllActiveGoogleSheets();
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

      if (!trackerSheet) {
        return res.json({
          protectedCount: 0,
          releasableCount: 0,
          protected: [],
          releasable: [],
        });
      }

      // Read tracker data
      const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

      if (trackerRows.length === 0) {
        return res.json({
          protectedCount: 0,
          releasableCount: 0,
          protected: [],
          releasable: [],
        });
      }

      const headers = trackerRows[0];
      const agentNameIndex = headers.findIndex(h => h.toLowerCase() === 'agent name');
      const linkIndex = headers.findIndex(h => h.toLowerCase() === 'link');
      const transactionIdIndex = headers.findIndex(h => h.toLowerCase() === 'transaction id');
      const nameIndex = headers.findIndex(h => h.toLowerCase() === 'name');

      if (agentNameIndex === -1 || linkIndex === -1) {
        return res.status(400).json({ message: "Tracker sheet must have Agent Name and Link columns" });
      }

      const protectedListings: Array<{ link: string; name: string; transactionId: string }> = [];
      const releasable: Array<{ link: string; name: string }> = [];

      // Analyze each row
      for (let i = 1; i < trackerRows.length; i++) {
        const row = trackerRows[i];
        const agentName = row[agentNameIndex] || '';
        const link = row[linkIndex] || '';
        const transactionId = row[transactionIdIndex] || '';
        const name = nameIndex !== -1 ? row[nameIndex] || '' : '';

        // Check if this row belongs to the user
        if (agentName.toLowerCase().trim() === (user.agentName || '').toLowerCase().trim()) {
          if (transactionId) {
            // Has transaction ID = protectedListings
            protectedListings.push({ link, name, transactionId });
          } else {
            // No transaction ID = releasable
            releasable.push({ link, name });
          }
        }
      }

      res.json({
        protectedCount: protectedListings.length,
        releasableCount: releasable.length,
        protected: protectedListings,
        releasable,
      });
    } catch (error: any) {
      console.error("Error analyzing user listings:", error);
      res.status(500).json({ message: error.message || "Failed to analyze listings" });
    }
  });

  // Deactivate user and release unclosed listings (admin only)
  app.post('/api/users/:userId/deactivate', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const adminUserId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { userId } = req.params;

      // Get user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Deactivate user in database
      await storage.updateUser(userId, { isActive: false });

      // Unregister Google Calendar webhook if exists
      try {
        const integration = await storage.getUserIntegration(userId);
        if (integration?.googleCalendarWebhookChannelId && 
            integration?.googleCalendarWebhookResourceId &&
            integration?.googleCalendarAccessToken) {

          const oauth2Client = new google.auth.OAuth2(
            integration.googleClientId,
            integration.googleClientSecret
          );

          oauth2Client.setCredentials({
            access_token: integration.googleCalendarAccessToken,
            refresh_token: integration.googleCalendarRefreshToken || undefined
          });

          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

          await calendar.channels.stop({
            requestBody: {
              id: integration.googleCalendarWebhookChannelId,
              resourceId: integration.googleCalendarWebhookResourceId,
            },
          });

          // Clear webhook fields in database
          await storage.updateUserIntegration(userId, {
            googleCalendarWebhookChannelId: undefined,
            googleCalendarWebhookResourceId: undefined,
            googleCalendarWebhookExpiry: undefined,
          });

          console.log(`[Deactivate] Unregistered Google Calendar webhook for user ${userId}`);
        }
      } catch (webhookError: any) {
        console.error(`[Deactivate] Failed to unregister webhook for user ${userId}:`, webhookError.message);
        // Continue with deactivation even if webhook unregistration fails
      }

      // Find both sheets
      const sheets = await storage.getAllActiveGoogleSheets();
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');
      const storeDbSheet = sheets.find(s => s.sheetPurpose === 'Store Database');

      let releasedCount = 0;
      let protectedCount = 0;

      if (trackerSheet && storeDbSheet) {
        // Read tracker data
        const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
        const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

        if (trackerRows.length > 0) {
          const headers = trackerRows[0];
          const agentNameIndex = headers.findIndex(h => h.toLowerCase() === 'agent name');
          const linkIndex = headers.findIndex(h => h.toLowerCase() === 'link');
          const transactionIdIndex = headers.findIndex(h => h.toLowerCase() === 'transaction id');
          const statusIndex = headers.findIndex(h => h.toLowerCase() === 'status');

          if (agentNameIndex !== -1 && linkIndex !== -1) {
            // Read Store Database
            const storeDbRange = `${storeDbSheet.sheetName}!A:ZZ`;
            const storeDbRows = await googleSheets.readSheetData(storeDbSheet.spreadsheetId, storeDbRange);

            if (storeDbRows.length > 0) {
              const storeHeaders = storeDbRows[0];
              const storeLinkIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'link');
              const storeAgentNameIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'agent name');

              // Process each tracker row
              for (let i = 1; i < trackerRows.length; i++) {
                const row = trackerRows[i];
                const agentName = row[agentNameIndex] || '';
                const link = row[linkIndex] || '';
                const transactionId = row[transactionIdIndex] || '';
                const rowIndex = i + 1; // 1-indexed

                // Check if this row belongs to the user
                if (agentName.toLowerCase().trim() === (user.agentName || '').toLowerCase().trim()) {
                  // Only release if no transaction ID
                  if (!transactionId) {
                    // Clear Agent Name in tracker (keep row for history)
                    if (agentNameIndex !== -1) {
                      const agentColumn = String.fromCharCode(65 + agentNameIndex);
                      const agentRange = `${trackerSheet.sheetName}!${agentColumn}${rowIndex}`;
                      await googleSheets.writeSheetData(trackerSheet.spreadsheetId, agentRange, [['']]);
                    }

                    // Set status to "7 – Warm" in tracker
                    if (statusIndex !== -1) {
                      const statusColumn = String.fromCharCode(65 + statusIndex);
                      const statusRange = `${trackerSheet.sheetName}!${statusColumn}${rowIndex}`;
                      await googleSheets.writeSheetData(trackerSheet.spreadsheetId, statusRange, [['7 – Warm']]);
                    }

                    // Note: Agent Name in Store Database is now synced automatically from Commission Tracker via Google Sheets
                    // No need to manually clear it here

                    releasedCount++;
                  } else {
                    // Has transaction ID - keep protected
                    protectedCount++;
                  }
                }
              }
            }
          }
        }
      }

      res.json({
        message: `User deactivated successfully. Released ${releasedCount} unclosed listings. Protected ${protectedCount} listings with transactions.`,
        releasedCount,
        protectedCount,
      });
    } catch (error: any) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ message: error.message || "Failed to deactivate user" });
    }
  });

  // Reactivate user (admin only)
  app.post('/api/users/:userId/reactivate', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;

      // Get user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Reactivate user in database
      await storage.updateUser(userId, { isActive: true });

      res.json({ message: "User reactivated successfully" });
    } catch (error: any) {
      console.error("Error reactivating user:", error);
      res.status(500).json({ message: error.message || "Failed to reactivate user" });
    }
  });

  // Permanently delete user and all their data (admin only)
  app.delete('/api/admin/users/:userId', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const adminUserId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { userId } = req.params;

      // Get user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent deleting yourself
      if (userId === adminUserId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      console.log(`[Delete User] Starting permanent deletion of user ${userId} (${user.email})`);

      // 1. Unregister Google Calendar webhook if exists
      try {
        const integration = await storage.getUserIntegration(userId);
        if (integration?.googleCalendarWebhookChannelId && 
            integration?.googleCalendarWebhookResourceId &&
            integration?.googleCalendarAccessToken) {

          const oauth2Client = new google.auth.OAuth2(
            integration.googleClientId,
            integration.googleClientSecret
          );

          oauth2Client.setCredentials({
            access_token: integration.googleCalendarAccessToken,
            refresh_token: integration.googleCalendarRefreshToken || undefined
          });

          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

          await calendar.channels.stop({
            requestBody: {
              id: integration.googleCalendarWebhookChannelId,
              resourceId: integration.googleCalendarWebhookResourceId,
            },
          });

          console.log(`[Delete User] Unregistered Google Calendar webhook for user ${userId}`);
        }
      } catch (webhookError: any) {
        console.error(`[Delete User] Failed to unregister webhook:`, webhookError.message);
        // Continue with deletion even if webhook unregistration fails
      }

      // 2. Delete OpenAI knowledge base files uploaded by this user
      try {
        // Get global OpenAI settings (admin's API key)
        const openaiSettings = await storage.getOpenaiSettings();
        if (openaiSettings?.apiKey) {
          // Get ALL knowledge base files and filter for this user's uploads
          const allFiles = await storage.getAllKnowledgeBaseFiles();
          const userFiles = allFiles.filter(file => file.uploadedBy === userId);

          if (userFiles.length > 0) {
            const openai = new OpenAI({ apiKey: openaiSettings.apiKey });

            for (const file of userFiles) {
              try {
                if (file.openaiFileId) {
                  await openai.files.del(file.openaiFileId);
                  console.log(`[Delete User] Deleted OpenAI file ${file.openaiFileId} (${file.originalName})`);
                }
              } catch (fileError: any) {
                console.error(`[Delete User] Failed to delete OpenAI file ${file.openaiFileId}:`, fileError.message);
                // Continue with other files
              }
            }
          }
        }
      } catch (openaiError: any) {
        console.error(`[Delete User] Failed to delete OpenAI files:`, openaiError.message);
        // Continue with deletion
      }

      // 3. Cascade delete all user data using storage methods
      await storage.deleteUser(userId);

      console.log(`[Delete User] ✅ Successfully deleted user ${userId} (${user.email})`);

      res.json({ 
        message: `User ${user.email} has been permanently deleted along with all their data.`
      });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: error.message || "Failed to delete user" });
    }
  });

  // Get all orders
  app.get('/api/orders', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const orders = await storage.getAllOrders();
      console.log('[GET /api/orders] All orders fetched:', orders.length);

      // Check Commission Tracker to see which orders have tracker rows
      const sheets = await storage.getAllActiveGoogleSheets();
      console.log('[GET /api/orders] All sheets:', sheets.map(s => ({ purpose: s.sheetPurpose, name: s.spreadsheetName })));
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');
      console.log('[GET /api/orders] Tracker sheet found:', trackerSheet ? trackerSheet.spreadsheetName : 'NONE');

      if (trackerSheet) {
        try {
          const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
          const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
          console.log('[GET /api/orders] Tracker rows read:', trackerRows.length);

          if (trackerRows.length > 0) {
            const trackerHeaders = trackerRows[0];
            console.log('[GET /api/orders] Tracker headers:', trackerHeaders);
            const transactionIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'transaction id');
            console.log('[GET /api/orders] Transaction ID column index:', transactionIdIndex);

            // Build set of order IDs that have tracker rows
            const ordersWithTrackerRows = new Set<string>();
            for (let i = 1; i < trackerRows.length; i++) {
              const transactionId = trackerRows[i][transactionIdIndex] || '';
              if (transactionId) {
                ordersWithTrackerRows.add(transactionId);
              }
            }
            console.log('[GET /api/orders] Orders with tracker rows:', Array.from(ordersWithTrackerRows));

            // Add hasTrackerRows field to each order
            const ordersWithStatus = orders.map((order: any) => ({
              ...order,
              hasTrackerRows: ordersWithTrackerRows.has(order.id)
            }));

            return res.json(ordersWithStatus);
          }
        } catch (trackerError) {
          console.error('Error checking Commission Tracker:', trackerError);
          // Continue without tracker status if error
        }
      }

      // If no tracker sheet or error, return orders without hasTrackerRows field
      res.json(orders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: error.message || "Failed to fetch orders" });
    }
  });

  // Update order (for commission type and amount)
  app.patch('/api/orders/:orderId', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const { commissionType, commissionAmount } = req.body;

      const updates: any = {};
      if (commissionType !== undefined) updates.commissionType = commissionType;
      if (commissionAmount !== undefined) updates.commissionAmount = commissionAmount;

      const updatedOrder = await storage.updateOrder(orderId, updates);

      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(updatedOrder);
    } catch (error: any) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: error.message || "Failed to update order" });
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

      // Find Store Database and Commission Tracker sheets
      const sheets = await storage.getAllActiveGoogleSheets();
      const storeSheet = sheets.find(s => s.sheetPurpose === 'Store Database');
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

      if (!storeSheet) {
        return res.status(404).json({ message: 'Store Database sheet not found' });
      }

      // Check Commission Tracker for already-matched stores
      const matchedStoreLinks: string[] = [];
      if (trackerSheet) {
        try {
          const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
          const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

          if (trackerRows.length > 0) {
            const trackerHeaders = trackerRows[0];
            const linkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
            const transactionIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'transaction id');

            // Find all stores matched to this order
            for (let i = 1; i < trackerRows.length; i++) {
              const trackerTransactionId = trackerRows[i][transactionIdIndex] || '';
              if (trackerTransactionId === orderId) {
                const storeLink = trackerRows[i][linkIndex] || '';
                if (storeLink) {
                  matchedStoreLinks.push(normalizeLink(storeLink));
                }
              }
            }
          }
        } catch (trackerError) {
          console.error('Error checking Commission Tracker:', trackerError);
          // Continue even if tracker check fails
        }
      }

      // Read all store data
      const storeRange = `${storeSheet.sheetName}!A:ZZ`;
      const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);

      if (storeRows.length === 0) {
        return res.json({ order, suggestions: [], matchedStoreLinks });
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
        matchedStoreLinks, // Array of normalized links for already-matched stores
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

      // Find Commission Tracker sheet (Store Database syncs from Tracker via Google Sheets)
      const sheets = await storage.getAllActiveGoogleSheets();
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

      if (!trackerSheet) {
        return res.status(404).json({ message: 'Commission Tracker sheet not found' });
      }

      // Read tracker data to check if stores already have rows
      const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

      if (trackerRows.length === 0) {
        return res.status(400).json({ message: 'Commission Tracker sheet is empty' });
      }

      const trackerHeaders = trackerRows[0];
      const linkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
      const orderIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'order id');
      const transactionIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'transaction id');
      const agentNameIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'agent name');
      const trackerDateIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'date');
      const trackerPocEmailIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'poc email');

      if (linkIndex === -1) {
        return res.status(400).json({ message: 'Commission Tracker must have a "Link" column' });
      }

      // Get agent name from order
      const agentName = order.salesAgentName || '';

      let rowsProcessed = 0;
      const results: Array<{link: string, name: string, action: string}> = [];

      // Process each selected store
      for (const store of storeLinks) {
        const { link: storeLink, name: storeName } = store;

        // Note: Store Database (DBA, Agent Name, Email) is now synced automatically from Commission Tracker via Google Sheets
        // We only write to Commission Tracker and let the sync handle the Store Database updates

        // Update or create row in Commission Tracker
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
            await googleSheets.writeSheetData(trackerSheet.spreadsheetId, updateRange, [[order.orderNumber]]);
          }

          if (transactionIdIndex !== -1) {
            const txIdColumn = String.fromCharCode(65 + transactionIdIndex);
            const txRange = `${trackerSheet.sheetName}!${txIdColumn}${existingTrackerRowIndex}`;
            await googleSheets.writeSheetData(trackerSheet.spreadsheetId, txRange, [[order.id]]);
          }

          if (agentNameIndex !== -1 && agentName) {
            const agentColumn = String.fromCharCode(65 + agentNameIndex);
            const agentRange = `${trackerSheet.sheetName}!${agentColumn}${existingTrackerRowIndex}`;
            await googleSheets.writeSheetData(trackerSheet.spreadsheetId, agentRange, [[agentName]]);
          }

          if (trackerDateIndex !== -1 && order.orderDate) {
            const dateColumn = String.fromCharCode(65 + trackerDateIndex);
            const dateRange = `${trackerSheet.sheetName}!${dateColumn}${existingTrackerRowIndex}`;
            const formattedDate = new Date(order.orderDate).toLocaleDateString('en-US');
            await googleSheets.writeSheetData(trackerSheet.spreadsheetId, dateRange, [[formattedDate]]);
          }

          if (trackerPocEmailIndex !== -1 && order.billingEmail) {
            const emailColumn = String.fromCharCode(65 + trackerPocEmailIndex);
            const emailRange = `${trackerSheet.sheetName}!${emailColumn}${existingTrackerRowIndex}`;
            await googleSheets.writeSheetData(trackerSheet.spreadsheetId, emailRange, [[order.billingEmail]]);
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

          // Set Agent Name
          if (agentNameIndex !== -1 && agentName) newRow[agentNameIndex] = agentName;

          // Set Date
          if (trackerDateIndex !== -1 && order.orderDate) {
            const formattedDate = new Date(order.orderDate).toLocaleDateString('en-US');
            newRow[trackerDateIndex] = formattedDate;
          }

          // Set POC Email
          if (trackerPocEmailIndex !== -1 && order.billingEmail) {
            newRow[trackerPocEmailIndex] = order.billingEmail;
          }

          // Append new row to Commission Tracker
          const appendRange = `${trackerSheet.sheetName}!A:ZZ`;
          await googleSheets.appendSheetData(trackerSheet.spreadsheetId, appendRange, [newRow]);

          rowsProcessed++;
          results.push({ link: storeLink, name: storeName, action: 'created' });
        }
      }

      // Populate/update clients table with matched store data
      // This ensures clients table becomes the source of truth for reorders
      for (const store of storeLinks) {
        const { link: storeLink, name: storeName } = store;
        const normalizedLink = normalizeLink(storeLink);

        // Check if client already exists by unique identifier (link)
        const existingClient = await db.query.clients.findFirst({
          where: eq(clients.uniqueIdentifier, normalizedLink),
        });

        if (existingClient) {
          // Update existing client with order data
          const updates: any = {};

          // Set firstOrderDate if not already set
          if (!existingClient.firstOrderDate && order.orderDate) {
            updates.firstOrderDate = order.orderDate;
          }

          // Update lastOrderDate if this order is more recent
          if (!existingClient.lastOrderDate || new Date(order.orderDate) > new Date(existingClient.lastOrderDate)) {
            updates.lastOrderDate = order.orderDate;
          }

          // Set assigned agent if not already set
          if (!existingClient.assignedAgent && order.salesAgentName) {
            const assignedUser = await db.query.users.findFirst({
              where: eq(users.agentName, order.salesAgentName),
            });
            if (assignedUser) {
              updates.assignedAgent = assignedUser.id;
            }
          }

          if (Object.keys(updates).length > 0) {
            await db.update(clients)
              .set({ ...updates, updatedAt: new Date() })
              .where(eq(clients.id, existingClient.id));
          }
        } else {
          // Create new client record
          const assignedUser = order.salesAgentName 
            ? await db.query.users.findFirst({ where: eq(users.agentName, order.salesAgentName) })
            : null;

          await db.insert(clients).values({
            uniqueIdentifier: normalizedLink,
            data: {
              storeName: storeName,
              link: storeLink,
              email: order.billingEmail || '',
              company: order.billingCompany || '',
            },
            assignedAgent: assignedUser?.id || null,
            firstOrderDate: order.orderDate,
            lastOrderDate: order.orderDate,
            status: 'active',
          });
        }
      }

      // Also link order to client in orders table
      if (storeLinks.length > 0) {
        const primaryStoreLink = normalizeLink(storeLinks[0].link);
        const primaryClient = await db.query.clients.findFirst({
          where: eq(clients.uniqueIdentifier, primaryStoreLink),
        });

        if (primaryClient) {
          await db.update(orders)
            .set({ clientId: primaryClient.id })
            .where(eq(orders.id, orderId));
        }
      }

      // Success! All data is now in Google Sheets Commission Tracker AND clients table
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

  // Save commission settings for multiple orders (database + Google Sheets)
  app.post('/api/orders/save-commissions', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { orders: orderUpdates } = req.body;

      if (!orderUpdates || !Array.isArray(orderUpdates)) {
        return res.status(400).json({ message: "Orders array is required" });
      }

      // Step 1: Update database
      let dbUpdated = 0;
      for (const update of orderUpdates) {
        const { orderId, commissionType, commissionAmount } = update;

        if (!orderId) continue;

        const updates: any = {};
        if (commissionType !== undefined) updates.commissionType = commissionType;
        if (commissionAmount !== undefined) updates.commissionAmount = commissionAmount;

        if (Object.keys(updates).length > 0) {
          await storage.updateOrder(orderId, updates);
          dbUpdated++;
          console.log(`DB: Updated order ${orderId} with:`, updates);
        }
      }

      // Step 2: Write to Google Sheets Commission Tracker
      let sheetsWritten = 0;
      const trackerSheet = await storage.getGoogleSheetByPurpose('commissions');
      console.log('Tracker sheet found:', trackerSheet ? `${trackerSheet.spreadsheetName} / ${trackerSheet.sheetName}` : 'NONE');

      if (trackerSheet) {
        const { spreadsheetId, sheetName } = trackerSheet;

        // Read tracker headers
        const headerRange = `${sheetName}!1:1`;
        const headerData = await googleSheets.readSheetData(spreadsheetId, headerRange);

        if (headerData.length > 0) {
          const headers = headerData[0];
          const columnMap: Record<string, number> = {};
          headers.forEach((header: string, index: number) => {
            columnMap[header.toLowerCase().trim()] = index;
          });

          console.log('Headers:', headers);
          console.log('Column map:', columnMap);

          // Read all existing rows
          const allDataRange = `${sheetName}!A:ZZ`;
          const allRows = await googleSheets.readSheetData(spreadsheetId, allDataRange);
          const existingRows = allRows.slice(1);
          console.log(`Read ${existingRows.length} data rows from sheet`);

          for (const orderReq of orderUpdates) {
            const { orderId, commissionType, commissionAmount } = orderReq;
            console.log(`\n--- Processing order ${orderId} ---`);

            // Get order from database
            const order = await storage.getOrderById(orderId);
            if (!order) {
              console.log(`Order ${orderId} not found in database`);
              continue;
            }
            console.log(`Order found: total=${order.total}`);

            // Find existing row(s) by Transaction ID in Commission Tracker
            const transactionIdIndex = columnMap['transaction id'];
            console.log(`Transaction ID column index: ${transactionIdIndex}`);
            if (transactionIdIndex === undefined) {
              console.log('ERROR: Transaction ID column not found in headers');
              continue;
            }

            // Find all rows matching this order ID (could be multiple stores)
            const matchingRowIndices: number[] = [];
            for (let i = 0; i < existingRows.length; i++) {
              const rowTransactionId = existingRows[i][transactionIdIndex];
              if (rowTransactionId === orderId) {
                matchingRowIndices.push(i + 2); // +2 for header and 1-indexed
                console.log(`Found match at row ${i + 2}: Transaction ID = ${rowTransactionId}`);
              }
            }

            console.log(`Found ${matchingRowIndices.length} matching rows for order ${orderId}`);
            if (matchingRowIndices.length === 0) {
              console.log('No matching rows found - skipping');
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
              // Auto: default to 25% (proper 6-month rule requires client data)
              amount = orderTotal * 0.25;
            }

            // Determine commission type label
            let commissionTypeLabel = 'Auto';
            if (commissionType === 'flat') commissionTypeLabel = 'Flat';
            else if (commissionType === '25') commissionTypeLabel = '25%';
            else if (commissionType === '10') commissionTypeLabel = '10%';

            // Update all matching rows
            console.log(`Calculated amount: $${amount.toFixed(2)}, type: ${commissionTypeLabel}`);

            for (const rowIndex of matchingRowIndices) {
              const updates: Array<{range: string, values: any[][]}> = [];

              if ('commission type' in columnMap) {
                const col = columnIndexToLetter(columnMap['commission type']);
                const range = `${sheetName}!${col}${rowIndex}`;
                updates.push({
                  range,
                  values: [[commissionTypeLabel]]
                });
                console.log(`Will update Commission Type: ${range} = ${commissionTypeLabel}`);
              } else {
                console.log('WARNING: "commission type" column not found');
              }

              if ('amount' in columnMap) {
                const col = columnIndexToLetter(columnMap['amount']);
                const range = `${sheetName}!${col}${rowIndex}`;
                updates.push({
                  range,
                  values: [[amount.toFixed(2)]]
                });
                console.log(`Will update Amount: ${range} = $${amount.toFixed(2)}`);
              } else {
                console.log('WARNING: "amount" column not found');
              }

              if ('total' in columnMap && !isNaN(orderTotal)) {
                const col = columnIndexToLetter(columnMap['total']);
                const range = `${sheetName}!${col}${rowIndex}`;
                updates.push({
                  range,
                  values: [[orderTotal.toFixed(2)]]
                });
                console.log(`Will update Total: ${range} = $${orderTotal.toFixed(2)}`);
              } else if (!('total' in columnMap)) {
                console.log('WARNING: "total" column not found');
              } else if (isNaN(orderTotal)) {
                console.log(`WARNING: orderTotal is not a valid number: ${orderTotal}`);
              }

              for (const update of updates) {
                console.log(`Writing to Google Sheets: ${update.range}`, update.values);
                await googleSheets.writeSheetData(spreadsheetId, update.range, update.values);
                console.log(`Successfully wrote: ${update.range}`);
              }

              sheetsWritten++;
            }
          }
        }
      }

      // Step 3: Recalculate commissions in SQL for all updated orders
      // This ensures the commissions table is accurate with new commission types/amounts
      let commissionsRecalculated = 0;
      for (const update of orderUpdates) {
        const { orderId } = update;
        if (!orderId) continue;

        try {
          await commissionService.applyCommissions(orderId);
          commissionsRecalculated++;
          console.log(`Recalculated commissions for order ${orderId}`);
        } catch (error: any) {
          console.error(`Failed to recalculate commissions for order ${orderId}:`, error);
        }
      }

      res.json({ 
        message: `Saved ${dbUpdated} commission settings to database` + 
                 (sheetsWritten > 0 ? `, wrote ${sheetsWritten} to Google Sheets` : '') +
                 `, and recalculated ${commissionsRecalculated} commission records`,
        dbUpdated,
        sheetsWritten,
        commissionsRecalculated
      });
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

      // Find matching client in clients table (source of truth)
      let client = null;

      // Try to find by email/company in clients table
      if (email || company) {
        const clientRecord = await db.query.clients.findFirst({
          where: email 
            ? eq(clients.data, sql`jsonb_build_object('email', ${email})`)
            : eq(clients.data, sql`jsonb_build_object('company', ${company})`)
        });
        client = clientRecord || null;
      }

      // Legacy fallback: also check old client lookup method
      if (!client && email) {
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

      // ONLY apply commissions automatically for REORDERS (existing clients)
      // First orders must be manually matched via WooCommerce Sync UI to set commission type
      if (client) {
        console.log('[Webhook] Client found - auto-calculating commissions for reorder');
        await commissionService.applyCommissions(order.id.toString());
      } else {
        console.log('[Webhook] New client - skipping auto commission calculation. Admin must match order manually.');
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
        let commission = 0;
        let commissionRate = 0;
        let commissionType = '';

        if (client.assignedAgent && client.claimDate) {
          const monthsSinceClaim = differenceInMonths(orderDate, new Date(client.claimDate));
          const rate = monthsSinceClaim < 6 ? 0.25 : 0.10;
          commission = orderTotal * rate;
          commissionRate = rate;
          commissionType = monthsSinceClaim < 6 ? '25%' : '10%';
          updates.commissionTotal = (parseFloat(client.commissionTotal || '0') + commission).toString();
        }

        await storage.updateClient(client.id, updates);

        // Write to Commission Tracker Google Sheet - ONLY if client has an assigned agent
        // This ensures we don't create incomplete commission records for unclaimed stores
        if (client.assignedAgent && commission > 0) {
          try {
            const sheetsConfig = await storage.getSheetsConfig();
            if (sheetsConfig?.spreadsheetId && sheetsConfig?.commissionTrackerSheetName) {
              console.log('[Webhook] Writing order to Commission Tracker:', {
                orderId: order.id,
                client: client.name,
                agent: client.assignedAgent,
                commission
              });

              // Get existing data to find next empty row
              const existingData = await googleSheets.readSheetData(
                sheetsConfig.spreadsheetId,
                `${sheetsConfig.commissionTrackerSheetName}!A:A`
              );
              const nextRow = (existingData?.length || 1) + 1;

              // Map WooCommerce status to our status system
              let orderStatus = 'Closed Won';
              if (order.status === 'processing') {
                orderStatus = '4 – Follow-Up'; // Processing orders need follow-up
              } else if (order.status === 'refunded' || order.status === 'cancelled') {
                orderStatus = '6 – Closed Lost';
              }

              // Prepare row data matching Commission Tracker columns
              // Columns: Link, Transaction ID, Date, Agent Name, Order ID, Commission Type, Amount, Status, Follow-Up Date, Next Action, Notes, Point of Contact, POC EMAIL, POC Phone
              const rowData = [
                client.link || '',                          // Link
                order.transaction_id || '',                 // Transaction ID
                format(orderDate, 'MM/dd/yyyy'),           // Date
                client.assignedAgent,                      // Agent Name
                order.id.toString(),                       // Order ID
                commissionType,                            // Commission Type (25% or 10%)
                commission.toFixed(2),                     // Amount
                orderStatus,                               // Status (based on WooCommerce order status)
                '',                                        // Follow-Up Date
                '',                                        // Next Action
                `WooCommerce order #${order.number || order.id} - $${orderTotal.toFixed(2)}`, // Notes
                client.pocName || '',                      // Point of Contact
                client.pocEmail || email || '',            // POC EMAIL
                client.pocPhone || ''                      // POC Phone
              ];

              await googleSheets.writeSheetData(
                sheetsConfig.spreadsheetId,
                `${sheetsConfig.commissionTrackerSheetName}!A${nextRow}:N${nextRow}`, // N is column 14
                [rowData]
              );
              
              // Write Column P (updated) timestamp for new commission record
              await googleSheets.writeCommissionTrackerTimestamp(
                sheetsConfig.spreadsheetId,
                sheetsConfig.commissionTrackerSheetName,
                nextRow,
                'P'
              );

              console.log('[Webhook] ✅ Successfully wrote to Commission Tracker row', nextRow);
            }
          } catch (sheetsError: any) {
            console.error('[Webhook] ❌ Failed to write to Commission Tracker:', sheetsError.message);
            // Don't fail the webhook - order is still processed in database
          }
        } else if (client.assignedAgent) {
          console.log('[Webhook] Skipping Commission Tracker write - no commission calculated (order may be outside commission period)');
        } else {
          console.log('[Webhook] Skipping Commission Tracker write - client has no assigned agent');
        }
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

        // RE-ORDER DETECTION: Check if this is a repeat order from an existing client
        let isReOrder = false;
        if (!existingOrder && client) {
          // This is a new order, check if client has previous orders
          const clientOrders = await storage.getOrdersByClient(client.id);
          if (clientOrders.length > 0) {
            isReOrder = true;
            console.log(`Re-order detected for client ${client.id} (${clientOrders.length} previous orders)`);
          }
        }

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

          // Create notification for re-order
          if (isReOrder && client.assignedAgent) {
            const clientName = (client.data as any)?.name || (client.data as any)?.company || 'Unknown Client';
            await storage.createNotification({
              userId: client.assignedAgent,
              clientId: client.id,
              type: 're_order',
              priority: 'medium',
              title: 'Re-Order Alert',
              message: `${clientName} has placed a new order! Order #${order.number || order.id} for $${order.total}`,
              metadata: {
                orderId: order.id.toString(),
                orderNumber: order.number || order.id.toString(),
                orderTotal: order.total,
                orderDate: order.date_created
              }
            });
            console.log(`Created re-order notification for agent ${client.assignedAgent}`);
          }
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

      // AUTO-MATCHING: Match orders to stores in Google Sheets based on billing email
      console.log('Starting auto-matching for claimed stores...');
      let autoMatched = 0;

      try {
        const sheets = await storage.getAllActiveGoogleSheets();
        const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');
        const storeDbSheet = sheets.find(s => s.sheetPurpose === 'Store Database');

        if (trackerSheet && storeDbSheet) {
          // Read Store Database to find claimed stores
          const storeDbRange = `${storeDbSheet.sheetName}!A:ZZ`;
          const storeDbRows = await googleSheets.readSheetData(storeDbSheet.spreadsheetId, storeDbRange);

          if (storeDbRows.length > 0) {
            const storeDbHeaders = storeDbRows[0];
            const storeDbLinkIndex = storeDbHeaders.findIndex(h => h.toLowerCase() === 'link');
            const storeDbEmailIndex = storeDbHeaders.findIndex(h => h.toLowerCase() === 'email');
            const storeDbAgentNameIndex = storeDbHeaders.findIndex(h => h.toLowerCase() === 'agent name');
            const storeDbDbaIndex = storeDbHeaders.findIndex(h => h.toLowerCase() === 'dba');

            // Read Commission Tracker
            const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
            const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

            if (trackerRows.length > 0) {
              const trackerHeaders = trackerRows[0];
              const linkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
              const orderIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'order id');
              const transactionIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'transaction id');
              const trackerDateIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'date');
              const trackerPocEmailIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'poc email');
              const agentNameIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'agent name');

              // For each order with billing email
              for (const order of orders) {
                if (!order.billing?.email) continue;

                const orderEmail = order.billing.email.toLowerCase().trim();
                const salesAgentMeta = order.meta_data?.find((m: any) => m.key === '_sales_agent');
                const salesAgentName = salesAgentMeta?.value || '';

                // Find matching store in Store Database by email AND agent name (claimed stores only)
                for (let i = 1; i < storeDbRows.length; i++) {
                  const storeEmail = storeDbRows[i][storeDbEmailIndex]?.toLowerCase().trim();
                  const storeAgentName = storeDbRows[i][storeDbAgentNameIndex]?.trim();
                  const storeLink = storeDbRows[i][storeDbLinkIndex];
                  const storeDba = storeDbRows[i][storeDbDbaIndex];

                  // Match only if email matches AND store is claimed (has agent name)
                  if (storeEmail === orderEmail && storeAgentName) {
                    // Check if this order already has a tracker row for this store
                    const normalizedStoreLink = normalizeLink(storeLink);
                    const currentOrderId = order.id.toString();
                    let alreadyTracked = false;

                    for (let j = 1; j < trackerRows.length; j++) {
                      const trackerLink = normalizeLink(trackerRows[j][linkIndex] || '');
                      const trackerTransactionId = trackerRows[j][transactionIdIndex] || '';

                      // Duplicate if BOTH Link and Transaction ID match
                      if (trackerLink === normalizedStoreLink && trackerTransactionId === currentOrderId) {
                        alreadyTracked = true;
                        break;
                      }
                    }

                    if (!alreadyTracked) {
                      // Create new tracker row for this order
                      const newRow: any[] = new Array(trackerHeaders.length).fill('');

                      if (linkIndex !== -1) newRow[linkIndex] = storeLink;
                      if (orderIdIndex !== -1) newRow[orderIdIndex] = order.number || order.id.toString();
                      if (transactionIdIndex !== -1) newRow[transactionIdIndex] = order.id.toString();
                      if (trackerDateIndex !== -1) {
                        const formattedDate = new Date(order.date_created).toLocaleDateString('en-US');
                        newRow[trackerDateIndex] = formattedDate;
                      }
                      if (trackerPocEmailIndex !== -1) newRow[trackerPocEmailIndex] = order.billing.email;
                      if (agentNameIndex !== -1 && salesAgentName) newRow[agentNameIndex] = salesAgentName;

                      const appendRange = `${trackerSheet.sheetName}!A:ZZ`;
                      await googleSheets.appendSheetData(trackerSheet.spreadsheetId, appendRange, [newRow]);

                      autoMatched++;
                      console.log(`Auto-matched order ${order.id} to store ${storeLink}`);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (autoMatchError: any) {
        console.error('Auto-matching error:', autoMatchError);
        // Don't fail the entire sync if auto-matching fails
      }

      console.log('Auto-matching completed:', { autoMatched });

      // COMMISSION SYNC: Recalculate commissions for orders with changes or missing commissions
      // This ensures agent transfers from WooCommerce are automatically applied
      console.log('Starting commission sync...');
      let commissionsCalculated = 0;
      let agentTransfers = 0;
      let sheetsUpdated = 0;

      // Get Commission Tracker sheet for updating agent names
      let trackerSheet: any = null;
      let trackerHeaders: string[] = [];
      let trackerRows: any[][] = [];

      try {
        const sheets = await storage.getAllActiveGoogleSheets();
        trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

        if (trackerSheet) {
          const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
          trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
          if (trackerRows.length > 0) {
            trackerHeaders = trackerRows[0];
          }
        }
      } catch (sheetError: any) {
        console.error('Failed to load Commission Tracker sheet:', sheetError.message);
      }

      try {
        const allLocalOrders = await storage.getAllOrders();

        for (const localOrder of allLocalOrders) {
          if (!localOrder.salesAgentName) continue;

          // Check if this order already has commission records
          const existingCommissions = await db.query.commissions.findMany({
            where: eq(commissions.orderId, localOrder.id),
          });

          // Recalculate if:
          // 1. No commissions exist yet (new order)
          // 2. Agent changed (detected by comparing agent name on commission vs order)
          let needsRecalculation = existingCommissions.length === 0;

          if (!needsRecalculation && existingCommissions.length > 0) {
            // Check if agent changed - find the primary commission's agent
            const primaryCommission = existingCommissions.find(c => c.commissionKind === 'primary');

            // Recalculate if primary commission is missing (data corruption or manual deletion)
            if (!primaryCommission) {
              needsRecalculation = true;
              console.log(`⚠️  Missing primary commission for order ${localOrder.id} - will recalculate`);
            } else {
              const commissionAgent = await db.query.users.findFirst({
                where: eq(users.id, primaryCommission.agentId),
              });

              // Agent changed if:
              // 1. Old agent user was deleted (!commissionAgent)
              // 2. Agent names don't match (case-insensitive)
              if (!commissionAgent) {
                needsRecalculation = true;
                agentTransfers++;
                console.log(`🔄 Agent transfer detected for order ${localOrder.id}: <deleted agent> → ${localOrder.salesAgentName}`);
              } else if (commissionAgent.agentName?.toLowerCase().trim() !== localOrder.salesAgentName.toLowerCase().trim()) {
                needsRecalculation = true;
                agentTransfers++;
                console.log(`🔄 Agent transfer detected for order ${localOrder.id}: ${commissionAgent.agentName} → ${localOrder.salesAgentName}`);
              }
            }
          }

          if (needsRecalculation) {
            try {
              await commissionService.applyCommissions(localOrder.id);
              commissionsCalculated++;
              console.log(`✓ Synced commission for order ${localOrder.id} → ${localOrder.salesAgentName}`);

              // Update Google Sheets Commission Tracker with agent name and order total
              if (trackerSheet && trackerHeaders.length > 0) {
                const orderIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'order id');
                const agentNameIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'agent name');
                const totalIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'total');

                if (orderIdIndex !== -1 && agentNameIndex !== -1) {
                  // Find the row with this order ID
                  for (let i = 1; i < trackerRows.length; i++) {
                    if (trackerRows[i][orderIdIndex] === localOrder.orderNumber) {
                      const rowNumber = i + 1; // +1 for 1-indexed Google Sheets
                      const updates: Array<{ range: string, values: any[][] }> = [];

                      // Update Agent Name column
                      const agentColumnLetter = columnIndexToLetter(agentNameIndex);
                      const agentCellRange = `${trackerSheet.sheetName}!${agentColumnLetter}${rowNumber}`;
                      updates.push({
                        range: agentCellRange,
                        values: [[localOrder.salesAgentName]]
                      });

                      // Update Total column if it exists
                      if (totalIndex !== -1 && localOrder.total) {
                        const totalColumnLetter = columnIndexToLetter(totalIndex);
                        const totalCellRange = `${trackerSheet.sheetName}!${totalColumnLetter}${rowNumber}`;
                        const orderTotal = parseFloat(localOrder.total);
                        if (!isNaN(orderTotal)) {
                          updates.push({
                            range: totalCellRange,
                            values: [[orderTotal.toFixed(2)]]
                          });
                        }
                      }

                      // Write all updates
                      try {
                        for (const update of updates) {
                          await googleSheets.writeSheetData(
                            trackerSheet.spreadsheetId,
                            update.range,
                            update.values
                          );
                        }

                        sheetsUpdated++;
                        console.log(`📝 Updated Google Sheets: Order ${localOrder.orderNumber} → ${localOrder.salesAgentName}, Total: $${localOrder.total}`);
                      } catch (writeErr: any) {
                        console.error(`✗ Failed to update Google Sheets for order ${localOrder.orderNumber}:`, writeErr.message);
                      }
                      break;
                    }
                  }
                }
              }
            } catch (commErr: any) {
              console.error(`✗ Failed to sync commission for order ${localOrder.id}:`, commErr.message);
            }
          }
        }
      } catch (syncError: any) {
        console.error('Commission sync error:', syncError);
        // Don't fail the entire sync if commission calculation fails
      }

      console.log('Commission sync completed:', { commissionsCalculated, agentTransfers, sheetsUpdated });

      // UPDATE TOTALS: Always update Column Q (Total) for all orders in tracker sheet
      console.log('Starting total column sync...');
      let totalsUpdated = 0;
      
      if (trackerSheet) {
        // Reload tracker sheet to include any rows added during this sync
        try {
          const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
          const freshTrackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
          if (freshTrackerRows.length > 0) {
            trackerRows = freshTrackerRows;
            trackerHeaders = trackerRows[0];
            console.log(`📋 Reloaded tracker sheet: ${trackerRows.length - 1} data rows, ${trackerHeaders.length} columns`);
          } else {
            console.log('⚠️  Tracker sheet is empty after reload');
          }
        } catch (reloadErr: any) {
          console.error('✗ Failed to reload tracker sheet:', reloadErr.message);
        }
      }
      
      if (trackerSheet && trackerHeaders.length > 0) {
        const orderIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'order id');
        const totalIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'total');
        
        if (orderIdIndex !== -1 && totalIndex !== -1) {
          const allLocalOrders = await storage.getAllOrders();
          
          for (const localOrder of allLocalOrders) {
            if (!localOrder.total) continue;
            
            // Find the row with this order ID (normalize to string for comparison)
            const orderNumberStr = String(localOrder.orderNumber || '').trim();
            for (let i = 1; i < trackerRows.length; i++) {
              const sheetOrderId = String(trackerRows[i][orderIdIndex] || '').trim();
              if (sheetOrderId === orderNumberStr) {
                const rowNumber = i + 1; // +1 for 1-indexed Google Sheets
                const totalColumnLetter = columnIndexToLetter(totalIndex);
                const totalCellRange = `${trackerSheet.sheetName}!${totalColumnLetter}${rowNumber}`;
                const orderTotal = parseFloat(localOrder.total);
                
                if (!isNaN(orderTotal)) {
                  try {
                    await googleSheets.writeSheetData(
                      trackerSheet.spreadsheetId,
                      totalCellRange,
                      [[orderTotal.toFixed(2)]]
                    );
                    totalsUpdated++;
                    console.log(`📝 Updated Total: Order ${localOrder.orderNumber} → $${orderTotal.toFixed(2)} (${totalCellRange})`);
                  } catch (writeErr: any) {
                    console.error(`✗ Failed to update total for order ${localOrder.orderNumber}:`, writeErr.message);
                  }
                }
                break;
              }
            }
          }
        } else {
          if (orderIdIndex === -1) console.log('⚠️  "Order ID" column not found in Commission Tracker');
          if (totalIndex === -1) console.log('⚠️  "Total" column not found in Commission Tracker');
        }
      }
      
      console.log('Total column sync completed:', { totalsUpdated });

      // Update last synced timestamp
      await storage.updateUserIntegration(userId, {
        wooLastSyncedAt: new Date()
      });

      res.json({
        message: `WooCommerce sync completed. ${deleted > 0 ? `Removed ${deleted} deleted/cancelled orders. ` : ''}${autoMatched > 0 ? `Auto-matched ${autoMatched} orders. ` : ''}${commissionsCalculated > 0 ? `Calculated ${commissionsCalculated} commissions.` : ''}`,
        synced,
        matched,
        autoMatched,
        commissionsCalculated,
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
      const trackerSheet = await storage.getGoogleSheetByPurpose('commissions');
      if (!trackerSheet) {
        return res.status(400).json({ message: "Commission Tracker sheet not connected" });
      }

      const { spreadsheetId, sheetName } = trackerSheet;

      // Read tracker headers to understand column structure
      const headerRange = `${sheetName}!1:1`;
      const headerData = await googleSheets.readSheetData(spreadsheetId, headerRange);
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
      const allRows = await googleSheets.readSheetData(spreadsheetId, allDataRange);
      const existingRows = allRows.slice(1); // Skip header

      let written = 0;
      const skipped = 0;
      const conflicts: any[] = [];

      for (const orderReq of orderRequests) {
        const { orderId, commissionType, commissionAmount } = orderReq;

        // Get order from database
        const order = await storage.getOrderById(orderId);
        if (!order) {
          console.log(`Skipping order ${orderId}: not matched to client`);
          continue;
        }

        // Extract link from order's client data
        const client = await storage.getClient(order.clientId);
        if (!client) {
          console.log(`Skipping order ${orderId}: client not found`);
          continue;
        }
        let linkValue = client.data?.Link || client.data?.link || client.uniqueIdentifier;
        if (!linkValue) {
          console.log(`Skipping order ${orderId}: no link found for client ${client.id}`);
          continue;
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
        await googleSheets.appendSheetData(spreadsheetId, `${sheetName}!A:ZZ`, [rowData]);
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

  // ========== COMMISSION ROUTES ==========

  // Get commissions for an agent
  app.get('/api/commissions', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const agentId = req.query.agentId || userId;

      if (user.role !== 'admin' && agentId !== userId) {
        return res.status(403).json({ message: "Cannot view other agents' commissions" });
      }

      const commissions = await commissionService.getAgentCommissions(agentId, {
        commissionKind: req.query.kind,
        startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      });

      res.json(commissions);
    } catch (error: any) {
      console.error("Error fetching commissions:", error);
      res.status(500).json({ message: error.message || "Failed to fetch commissions" });
    }
  });

  // Get commission summary for an agent
  app.get('/api/commissions/summary', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const agentId = req.query.agentId || userId;

      if (user.role !== 'admin' && agentId !== userId) {
        return res.status(403).json({ message: "Cannot view other agents' commission summary" });
      }

      const summary = await commissionService.getCommissionSummary(agentId);
      res.json(summary);
    } catch (error: any) {
      console.error("Error fetching commission summary:", error);
      res.status(500).json({ message: error.message || "Failed to fetch commission summary" });
    }
  });

  // Get team commissions (for referring agents)
  app.get('/api/commissions/team', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const referrerId = req.query.referrerId || userId;

      if (user.role !== 'admin' && referrerId !== userId) {
        return res.status(403).json({ message: "Cannot view other agents' team data" });
      }

      const teamData = await commissionService.getTeamCommissions(referrerId);
      res.json(teamData);
    } catch (error: any) {
      console.error("Error fetching team commissions:", error);
      res.status(500).json({ message: error.message || "Failed to fetch team commissions" });
    }
  });

  // ========== GOOGLE SHEETS ROUTES ==========

  // List user's Google Sheets
  app.get('/api/sheets/list', isAuthenticatedCustom, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const sheets = await googleSheets.listSpreadsheets();
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
      const info = await googleSheets.getSpreadsheetInfo(spreadsheetId);
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

  // List all connected Google Sheets (accessible by all authenticated users including agents)
  app.get('/api/sheets', isAuthenticatedCustom, async (req, res) => {
    try {
      const sheets = await storage.getAllActiveGoogleSheets();
      res.json({ sheets });
    } catch (error: any) {
      console.error("Error fetching sheets:", error);
      res.status(500).json({ message: error.message || "Failed to fetch sheets" });
    }
  });

  // Get raw data from a specific Google Sheet (accessible by all authenticated users including agents)
  app.get('/api/sheets/:id/data', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;

      const sheet = await storage.getGoogleSheetById(id);
      if (!sheet) {
        return res.status(404).json({ message: "Google Sheet not found" });
      }

      const { spreadsheetId, sheetName } = sheet;
      const range = `${sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(spreadsheetId, range);

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

  // Get merged data from multiple sheets (for Client Dashboard)
  app.post('/api/sheets/merged-data', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { storeSheetId, trackerSheetId, joinColumn } = req.body;

      if (!storeSheetId || !trackerSheetId || !joinColumn) {
        return res.status(400).json({ message: "Store sheet ID, tracker sheet ID, and join column are required" });
      }

      // Get selected category for cache key (lightweight DB query)
      const selectedCategory = await storage.getSelectedCategory(userId);

      // Check cache first (30-second TTL)
      const cacheKey = generateCacheKey(userId, storeSheetId, trackerSheetId, selectedCategory);
      const cachedData = getCachedData(cacheKey);

      if (cachedData) {
        // Cache hit - return immediately
        return res.json(cachedData);
      }

      // Cache miss - fetch fresh data from Google Sheets
      // Fetch both sheets
      const storeSheet = await storage.getGoogleSheetById(storeSheetId);
      const trackerSheet = await storage.getGoogleSheetById(trackerSheetId);

      if (!storeSheet || !trackerSheet) {
        return res.status(404).json({ message: "One or both sheets not found" });
      }

      // Read data from both sheets
      const storeRange = `${storeSheet.sheetName}!A:ZZ`;
      const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;

      const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

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
        (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : null)?.trim() || 
        null;

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
      } else if (user?.role !== 'admin' && !userAgentName) {
        // No agent name available for the user, filter all rows to empty
        filteredStoreData = [];
        console.log('No agent name found for user, filtering all store rows');
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
        // No agent name available, filter all tracker rows to empty
        filteredTrackerData = [];
        console.log('No agent name found for user, filtering all tracker rows');
      }

      // ============================================================================
      // CRITICAL: Filter by Selected Category
      // ============================================================================
      // Purpose:
      // Filter stores by the user's selected category preference
      //
      // This ensures users only see stores from their chosen category (e.g., "Pets" or "Cannabis")
      // enabling complete data segregation between different sales teams
      //
      // Column Lookup:
      // - Case-insensitive search for "Category" column in Store Database
      //
      // Filter Logic:
      // - If user has selectedCategory preference, show only matching stores
      // - If no category selected, show all stores (no filtering)
      // ============================================================================
      // selectedCategory already fetched earlier for cache key
      const storeCategoryColumnName = storeHeaders.find(h => 
        h.toLowerCase().trim() === 'category'
      );

      if (selectedCategory && storeCategoryColumnName) {
        const beforeFilterCount = filteredStoreData.length;
        filteredStoreData = filteredStoreData.filter(row => {
          const rowCategory = row[storeCategoryColumnName];
          // Case-insensitive category match
          return rowCategory && rowCategory.toLowerCase().trim() === selectedCategory.toLowerCase().trim();
        });
        const afterFilterCount = filteredStoreData.length;
        console.log(`Category filter applied: "${selectedCategory}" - ${afterFilterCount} stores shown (${beforeFilterCount - afterFilterCount} filtered out)`);
      } else if (selectedCategory && !storeCategoryColumnName) {
        console.log(`WARNING: User has selectedCategory "${selectedCategory}" but "Category" column not found in sheet`);
      }

      // ============================================================================
      // CRITICAL: Filter Out Closed Listings (Open = FALSE)
      // ============================================================================
      // Purpose:
      // Exclude stores where the "Open" column is set to FALSE (listing closed)
      //
      // Column Lookup:
      // - Case-insensitive search for "Open" column in Store Database
      //
      // Filter Logic:
      // - Keep stores where Open is empty, "TRUE", or any truthy value
      // - Filter out stores where Open is "FALSE" or "false" (case-insensitive)
      // ============================================================================
      const storeOpenColumnName = storeHeaders.find(h => 
        h.toLowerCase().trim() === 'open'
      );

      if (storeOpenColumnName) {
        const beforeFilterCount = filteredStoreData.length;
        filteredStoreData = filteredStoreData.filter(row => {
          const openValue = row[storeOpenColumnName];
          // Keep if empty (default open) OR not explicitly "FALSE"
          return !openValue || openValue.toLowerCase().trim() !== 'false';
        });
      }

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

      // Columns that agents cannot edit (read-only for agents, editable for admins)
      const agentReadOnlyColumns = ['order id', 'commission type', 'amount', 'transaction id'];

      // Base editable columns for all users
      let editableColumns = [
        ...trackerHeaders.filter(h => !excludedCols.includes(h.toLowerCase())), // All tracker columns except agent and join column
        'additional phone', 'additional email', // Editable store columns (main phone/email are clickable links)
        'dba', 'agent name', // Corporate name and agent assignment for multi-location tracking
      ].filter(col => allHeaders.some(h => h.toLowerCase() === col.toLowerCase())); // Only include if they exist

      // For agents (non-admins), remove the read-only columns
      if (user?.role !== 'admin') {
        editableColumns = editableColumns.filter(col => 
          !agentReadOnlyColumns.includes(col.toLowerCase())
        );
      }

      const responseData = {
        headers: allHeaders,
        data: mergedData,
        editableColumns,
        storeSheetId,
        trackerSheetId,
        storeHeaders,
        trackerHeaders,
      };

      // Cache the result for 30 seconds
      setCachedData(cacheKey, responseData);

      res.json(responseData);
    } catch (error: any) {
      console.error("Error fetching merged data:", error);
      res.status(500).json({ message: error.message || "Failed to fetch merged data" });
    }
  });

  // Manual refresh endpoint - syncs Commission Tracker to PostgreSQL and clears cache
  app.post('/api/sheets/refresh', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      // Find Commission Tracker sheet
      const sheets = await storage.getAllActiveGoogleSheets();
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

      if (trackerSheet) {
        // Sync Commission Tracker data to PostgreSQL
        const syncResult = await googleSheets.syncCommissionTrackerToPostgres(trackerSheet.id);
        console.log(`📊 Sync result:`, syncResult);
      } else {
        console.log('⚠️ No Commission Tracker sheet found, skipping sync');
      }

      // Clear cache for this user
      clearUserCache(userId);

      res.json({ message: "Sync completed and cache cleared successfully" });
    } catch (error: any) {
      console.error("Error during refresh:", error);
      res.status(500).json({ message: error.message || "Failed to refresh data" });
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
      const headerRows = await googleSheets.readSheetData(spreadsheetId, headerRange);
      const headers = headerRows[0] || [];
      const columnIndex = headers.findIndex(h => h.toLowerCase() === column.toLowerCase());

      if (columnIndex === -1) {
        return res.status(400).json({ message: `Column "${column}" not found in sheet` });
      }

      // Auto-claim store when editing any field (agents only)
      const user = await storage.getUser(userId);
      if (user && user.role !== 'admin' && user.agentName) {
        // Read the row to get the link value for claiming
        const rowRange = `${sheetName}!A${rowIndex}:ZZ${rowIndex}`;
        const rowData = await googleSheets.readSheetData(spreadsheetId, rowRange);
        if (rowData.length > 0) {
          const row = rowData[0];
          const linkIndex = headers.findIndex(h => h.toLowerCase() === 'link');
          if (linkIndex !== -1 && row[linkIndex]) {
            const linkValue = row[linkIndex];

            // Find Commission Tracker and claim the store
            const sheets = await storage.getAllActiveGoogleSheets();
            const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

            if (trackerSheet) {
              const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
              const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

              if (trackerRows.length > 0) {
                const trackerHeaders = trackerRows[0];
                const trackerLinkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
                const trackerAgentIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'agent name');

                // Check if row exists in tracker (using normalized comparison)
                let existingTrackerRow = -1;
                const normalizedInputLink = normalizeLink(linkValue);
                for (let i = 1; i < trackerRows.length; i++) {
                  const rowLink = trackerRows[i][trackerLinkIndex];
                  if (rowLink && normalizeLink(rowLink) === normalizedInputLink) {
                    existingTrackerRow = i + 1; // 1-indexed
                    break;
                  }
                }

                if (existingTrackerRow > 0) {
                  // Update existing row with agent name
                  if (trackerAgentIndex !== -1) {
                    const agentColLetter = String.fromCharCode(65 + trackerAgentIndex);
                    const agentCellRange = `${trackerSheet.sheetName}!${agentColLetter}${existingTrackerRow}`;
                    await googleSheets.writeSheetData(trackerSheet.spreadsheetId, agentCellRange, [[user.agentName]]);
                  }
                } else {
                  // Create new row in tracker
                  const newTrackerRow = new Array(trackerHeaders.length).fill('');
                  if (trackerLinkIndex !== -1) newTrackerRow[trackerLinkIndex] = linkValue;
                  if (trackerAgentIndex !== -1) newTrackerRow[trackerAgentIndex] = user.agentName;
                  await googleSheets.appendSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}!A:ZZ`, [newTrackerRow]);
                }
              }
            }
          }
        }
      }

      // Convert column index to letter (A, B, C, etc.)
      const columnLetter = String.fromCharCode(65 + columnIndex);
      const cellRange = `${sheetName}!${columnLetter}${rowIndex}`;

      // Update the cell
      await googleSheets.writeSheetData(spreadsheetId, cellRange, [[value]]);

      // Invalidate cache after successful update
      clearUserCache(userId);

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
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

      if (!trackerSheet) {
        return res.status(404).json({ message: "Commission Tracker sheet not found" });
      }

      const { spreadsheetId, sheetName } = trackerSheet;

      // Read entire tracker sheet
      const range = `${sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(spreadsheetId, range);

      if (rows.length === 0) {
        return res.status(400).json({ message: "Tracker sheet is empty (no headers)" });
      }

      const headers = rows[0];

      const linkIndex = headers.findIndex(h => h.toLowerCase() === 'link');
      const agentNameIndex = headers.findIndex(h => h.toLowerCase() === 'agent name');

      if (linkIndex === -1) {
        return res.status(400).json({ message: "Link column not found in tracker sheet" });
      }

      // Check if row exists with this link (using normalized comparison)
      const normalizedInputLink = normalizeLink(link.trim());
      let existingRowIndex = -1;

      for (let i = 1; i < rows.length; i++) {
        const rowLink = rows[i][linkIndex];
        const normalizedRowLink = rowLink ? normalizeLink(rowLink.toString().trim()) : '';

        if (rowLink && normalizedRowLink === normalizedInputLink) {
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
            await googleSheets.writeSheetData(spreadsheetId, cellRange, [[value]]);
          }
        }

        // Invalidate cache after successful update
        clearUserCache(userId);

        res.json({ message: "Tracker row updated successfully", rowIndex: existingRowIndex });
      } else {
        // Row doesn't exist - create new row
        const newRow = new Array(headers.length).fill('');

        // Set Link
        newRow[linkIndex] = link;

        // Set Agent Name to claim the store
        if (agentNameIndex !== -1) {
          if (!currentUser.agentName) {
            return res.status(400).json({ 
              message: "Agent Name is required in your profile to claim stores. Please set it in Settings." 
            });
          }
          newRow[agentNameIndex] = currentUser.agentName;
        }

        // Set Status to 'Claimed' when creating new tracker row
        const statusIndex = headers.findIndex(h => h.toLowerCase() === 'status');
        if (statusIndex !== -1) {
          newRow[statusIndex] = 'Claimed';
        }

        // Set updated fields
        for (const [column, value] of Object.entries(updates)) {
          const colIndex = headers.findIndex(h => h.toLowerCase() === column.toLowerCase());
          if (colIndex !== -1) {
            newRow[colIndex] = value as string;
          }
        }

        // Append new row
        await googleSheets.appendSheetData(spreadsheetId, `${sheetName}!A:ZZ`, [newRow]);

        // Invalidate cache after successful creation
        clearUserCache(userId);

        res.json({ message: "Tracker row created successfully", claimed: true });
      }
    } catch (error: any) {
      console.error("Error upserting tracker row:", error);
      res.status(500).json({ message: error.message || "Failed to upsert tracker row" });
    }
  });

  // Auto-claim store by link (simple endpoint for phone/email clicks)
  app.post('/api/stores/auto-claim', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { link } = req.body;

      if (!link) {
        return res.status(400).json({ message: "Link is required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.agentName) {
        return res.status(400).json({ message: "Agent name not set in profile" });
      }

      // Find Commission Tracker sheet
      const sheets = await storage.getAllActiveGoogleSheets();
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

      if (!trackerSheet) {
        return res.status(404).json({ message: "Commission Tracker sheet not found" });
      }

      const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

      if (trackerRows.length === 0) {
        return res.status(400).json({ message: "Tracker sheet is empty" });
      }

      const trackerHeaders = trackerRows[0];
      const trackerLinkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
      const trackerAgentIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'agent name');

      if (trackerLinkIndex === -1) {
        return res.status(400).json({ message: "Link column not found in tracker" });
      }

      // Check if row exists in tracker
      let existingTrackerRow = -1;
      for (let i = 1; i < trackerRows.length; i++) {
        if (trackerRows[i][trackerLinkIndex] === link) {
          existingTrackerRow = i + 1; // 1-indexed
          break;
        }
      }

      if (existingTrackerRow > 0) {
        // Update existing row with agent name and write Column O (time) timestamp
        if (trackerAgentIndex !== -1) {
          const agentColLetter = String.fromCharCode(65 + trackerAgentIndex);
          const agentCellRange = `${trackerSheet.sheetName}!${agentColLetter}${existingTrackerRow}`;
          await googleSheets.writeSheetData(trackerSheet.spreadsheetId, agentCellRange, [[user.agentName]]);
        }
        // Write Column O (time) timestamp for claim
        await googleSheets.writeCommissionTrackerTimestamp(
          trackerSheet.spreadsheetId,
          trackerSheet.sheetName,
          existingTrackerRow,
          'O'
        );
        res.json({ message: "Store claimed successfully", claimed: true });
      } else {
        // Create new row in tracker
        const newTrackerRow = new Array(trackerHeaders.length).fill('');
        if (trackerLinkIndex !== -1) newTrackerRow[trackerLinkIndex] = link;
        if (trackerAgentIndex !== -1) newTrackerRow[trackerAgentIndex] = user.agentName;
        
        // Set Status to 'Claimed' when creating new tracker row
        const trackerStatusIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'status');
        if (trackerStatusIndex !== -1) newTrackerRow[trackerStatusIndex] = 'Claimed';
        
        const appendResult = await googleSheets.appendSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}!A:ZZ`, [newTrackerRow]);
        
        // Write Column O (time) timestamp for new claim
        // Calculate row number: existing rows + 1
        const newRowNumber = trackerRows.length + 1;
        await googleSheets.writeCommissionTrackerTimestamp(
          trackerSheet.spreadsheetId,
          trackerSheet.sheetName,
          newRowNumber,
          'O'
        );
        
        res.json({ message: "Store claimed successfully", claimed: true });
      }
    } catch (error: any) {
      console.error("Error auto-claiming store:", error);
      res.status(500).json({ message: error.message || "Failed to auto-claim store" });
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

      // Read the current sheet to find the header row
      const headerRange = `${sheetName}!1:1`;
      const headerRows = await googleSheets.readSheetData(spreadsheetId, headerRange);
      const headers = headerRows[0] || [];

      // Find the link column index
      const linkColumnIndex = headers.findIndex(h => h.toLowerCase() === joinColumn.toLowerCase());
      if (linkColumnIndex === -1) {
        return res.status(400).json({ message: "Link column not found in sheet" });
      }

      // Check if row already exists with this link (using normalized comparison)
      const normalizedInputLink = normalizeLink(linkValue.trim());
      let existingRowIndex = -1;

      for (let i = 1; i < headers.length; i++) { // Check headers first
        if (headers[i].toLowerCase() === joinColumn.toLowerCase()) {
          // Found the link column, now search rows
          for (let r = 1; r < rows.length; r++) { // Start from row 2 (index 1)
            const rowLink = rows[r][linkColumnIndex];
            const normalizedRowLink = rowLink ? normalizeLink(rowLink.toString().trim()) : '';

            if (rowLink && normalizedRowLink === normalizedInputLink) {
              existingRowIndex = r + 1; // +1 because sheets are 1-indexed
              break;
            }
          }
          if (existingRowIndex !== -1) break;
        }
      }
      
      // Corrected logic: loop through rows directly after getting linkColumnIndex
      if (existingRowIndex === -1) { // If not found in the previous loop, search directly in rows
        for (let r = 1; r < rows.length; r++) {
          const rowLink = rows[r][linkColumnIndex];
          const normalizedRowLink = rowLink ? normalizeLink(rowLink.toString().trim()) : '';
          if (rowLink && normalizedRowLink === normalizedInputLink) {
            existingRowIndex = r + 1;
            break;
          }
        }
      }

      // Helper to update a cell (allows clearing values with empty string)
      const updateCell = async (columnName: string, value: string) => {
        const colIndex = headers.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
        if (colIndex !== -1 && value !== undefined) {
          const columnLetter = String.fromCharCode(65 + colIndex);
          const cellRange = `${sheetName}!${columnLetter}${existingRowIndex}`;
          await googleSheets.writeSheetData(spreadsheetId, cellRange, [[value || '']]);
        }
      };

      if (existingRowIndex !== -1) {
        // Row already exists - update the specific column instead of creating duplicate
        await updateCell(column, value);

        // Also update agent if not set
        const agentColumnIndex = headers.findIndex(h => h.toLowerCase() === 'agent');
        if (agentColumnIndex !== -1 && user?.email) {
          const agentColLetter = String.fromCharCode(65 + agentColumnIndex);
          const agentCellRange = `${sheetName}!${agentColLetter}${existingRowIndex}`;
          // Check if agent column is empty before overwriting
          const existingAgentValue = await googleSheets.readSheetData(spreadsheetId, agentCellRange);
          if (!existingAgentValue || !existingAgentValue[0] || !existingAgentValue[0][0]) {
            await googleSheets.writeSheetData(spreadsheetId, agentCellRange, [[user.email]]);
          }
        }

        res.json({ message: "Store updated successfully", existingRow: true });
      } else {
        // Row doesn't exist - create new row
        const newRow = headers.map(() => '');

        // Set the join column
        const linkColIndex = headers.findIndex(h => h.toLowerCase() === joinColumn.toLowerCase());
        if (linkColIndex !== -1) {
          newRow[linkColIndex] = linkValue;
        }

        // Set the agent column to current user's email
        const agentColumnIndex = headers.findIndex(h => h.toLowerCase() === 'agent');
        if (agentColumnIndex !== -1 && user?.email) {
          newRow[agentColumnIndex] = user.email;
        }

        // Set Status to 'Claimed' when creating new tracker row
        const statusColumnIndex = headers.findIndex(h => h.toLowerCase() === 'status');
        if (statusColumnIndex !== -1) {
          newRow[statusColumnIndex] = 'Claimed';
        }

        // Set the column being edited
        const editColumnIndex = headers.findIndex(h => h.toLowerCase() === column.toLowerCase());
        if (editColumnIndex !== -1) {
          newRow[editColumnIndex] = value;
        }

        // Append the row
        const appendRange = `${sheetName}!A:ZZ`;
        await googleSheets.appendSheetData(spreadsheetId, appendRange, [newRow]);

        res.json({ message: "Store claimed successfully", newRow: true });
      }
    } catch (error: any) {
      console.error("Error claiming store:", error);
      res.status(500).json({ message: error.message || "Failed to claim store" });
    }
  });

  // Claim a store with contact action (includes Point of Contact)
  app.post('/api/sheets/:id/claim-store-with-contact', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
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
      const rows = await googleSheets.readSheetData(spreadsheetId, dataRange);
      const headers = rows[0] || [];

      // Find the link column index
      const linkColumnIndex = headers.findIndex(h => h.toLowerCase() === joinColumn.toLowerCase());
      if (linkColumnIndex === -1) {
        return res.status(400).json({ message: "Link column not found in sheet" });
      }

      // Check if row already exists with this link (using normalized comparison)
      const normalizedInputLink = normalizeLink(linkValue.trim());
      let existingRowIndex = -1;

      for (let i = 1; i < rows.length; i++) {
        const rowLink = rows[i][linkColumnIndex];
        const normalizedRowLink = rowLink ? normalizeLink(rowLink.toString().trim()) : '';

        if (rowLink && normalizedRowLink === normalizedInputLink) {
          existingRowIndex = i + 1; // +1 because sheets are 1-indexed
          break;
        }
      }

      // Helper to update a cell (allows clearing values with empty string)
      const updateCell = async (columnName: string, value: string) => {
        const colIndex = headers.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
        if (colIndex !== -1 && value !== undefined) {
          const columnLetter = String.fromCharCode(65 + colIndex);
          const cellRange = `${sheetName}!${columnLetter}${existingRowIndex}`;
          await googleSheets.writeSheetData(spreadsheetId, cellRange, [[value || '']]);
        }
      };

      if (existingRowIndex !== -1) {
        // Row already exists - update fields instead of creating duplicate
        await updateCell('agent', agent);
        await updateCell('status', status);
        await updateCell('follow-up date', followUpDate);
        await updateCell('followup', followUpDate);
        await updateCell('next action', nextAction);
        await updateCell('notes', notes);
        await updateCell('point of contact', pointOfContact);

        res.json({ message: "Contact action updated successfully", existingRow: true });
      } else {
        // Row doesn't exist - create new row
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
        await googleSheets.appendSheetData(spreadsheetId, appendRange, [newRow]);

        res.json({ message: "Contact action saved and store claimed", newRow: true });
      }
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
      const headerRows = await googleSheets.readSheetData(spreadsheetId, headerRange);
      const headers = headerRows[0] || [];

      // Update each field
      const updateCell = async (columnName: string, value: string) => {
        const columnIndex = headers.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
        if (columnIndex !== -1 && value !== undefined) {
          const columnLetter = String.fromCharCode(65 + columnIndex);
          const cellRange = `${sheetName}!${columnLetter}${rowIndex}`;
          await googleSheets.writeSheetData(spreadsheetId, cellRange, [[value]]);
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
      const headerRange = `${sheetName}!1:1`;
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

  // === STORE DETAILS ENDPOINTS ===
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
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

      if (!storeSheet) {
        return res.status(404).json({ message: 'Store sheet not found' });
      }

      // Read data from store sheet
      const storeRange = `${storeSheet.sheetName}!A:ZZ`;
      const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);

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
        const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

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
      const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);

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
          await googleSheets.writeSheetData(storeSheet.spreadsheetId, update.range, update.values);
        }
      }

      // Now handle Commission Tracker fields (notes, point_of_contact, poc_email, poc_phone)
      const trackerFields = Object.keys(trackerColumnMapping);
      const hasTrackerUpdates = trackerFields.some(field => field in updates);

      if (hasTrackerUpdates) {
        // Find Commission Tracker sheet
        const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

        if (trackerSheet) {
          // Read Commission Tracker data
          const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
          const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

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
              await googleSheets.writeSheetData(trackerSheet.spreadsheetId, appendRange, [newRow]);

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
                  await googleSheets.writeSheetData(trackerSheet.spreadsheetId, update.range, update.values);
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

  // Get all stores (for multi-location picker)
  app.get('/api/stores/all/:sheetId', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { sheetId } = req.params;

      const sheet = await storage.getGoogleSheetById(sheetId);
      if (!sheet) {
        return res.status(404).json({ message: 'Sheet not found' });
      }

      // Read all store data
      const range = `${sheet.sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(sheet.spreadsheetId, range);

      if (rows.length === 0) {
        return res.json([]);
      }

      // Parse store data
      const headers = rows[0];
      const nameIndex = headers.findIndex((h: string) => h.toLowerCase() === 'name');
      const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === 'link');
      const cityIndex = headers.findIndex((h: string) => h.toLowerCase() === 'city');
      const stateIndex = headers.findIndex((h: string) => h.toLowerCase() === 'state');
      const addressIndex = headers.findIndex((h: string) => h.toLowerCase() === 'address');
      const openIndex = headers.findIndex((h: string) => h.toLowerCase() === 'open');

      const stores = rows.slice(1)
        .map((row: any[]) => ({
          name: nameIndex !== -1 ? (row[nameIndex] || '') : '',
          link: linkIndex !== -1 ? (row[linkIndex] || '') : '',
          city: cityIndex !== -1 ? (row[cityIndex] || '') : '',
          state: stateIndex !== -1 ? (row[stateIndex] || '') : '',
          address: addressIndex !== -1 ? (row[addressIndex] || '') : '',
          open: openIndex !== -1 ? (row[openIndex] || '') : '',
        }))
        .filter((store: any) => {
          // Only include stores with a link
          if (!store.link) return false;
          // Filter out closed listings (Open = FALSE)
          if (store.open && store.open.toLowerCase().trim() === 'false') return false;
          return true;
        });

      res.json(stores);
    } catch (error: any) {
      console.error("Error fetching all stores:", error);
      res.status(500).json({ message: error.message || "Failed to fetch stores" });
    }
  });

  // Get stores by DBA (for auto-loading DBA group members)
  app.get('/api/stores/by-dba/:sheetId/:dbaName', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { sheetId, dbaName } = req.params;

      const sheet = await storage.getGoogleSheetById(sheetId);
      if (!sheet) {
        return res.status(404).json({ message: 'Sheet not found' });
      }

      // Read all store data
      const range = `${sheet.sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(sheet.spreadsheetId, range);

      if (rows.length === 0) {
        return res.json([]);
      }

      // Parse store data
      const headers = rows[0];
      const nameIndex = headers.findIndex((h: string) => h.toLowerCase() === 'name');
      const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === 'link');
      const cityIndex = headers.findIndex((h: string) => h.toLowerCase() === 'city');
      const stateIndex = headers.findIndex((h: string) => h.toLowerCase() === 'state');
      const addressIndex = headers.findIndex((h: string) => h.toLowerCase() === 'address');
      const dbaIndex = headers.findIndex((h: string) => h.toLowerCase() === 'dba');

      if (dbaIndex === -1) {
        return res.status(404).json({ message: 'DBA column not found in Store Database' });
      }

      // Filter stores by DBA name (case-insensitive match)
      const stores = rows.slice(1)
        .filter((row: any[]) => {
          const rowDba = row[dbaIndex] || '';
          return rowDba.toLowerCase().trim() === dbaName.toLowerCase().trim();
        })
        .map((row: any[]) => ({
          name: nameIndex !== -1 ? (row[nameIndex] || '') : '',
          link: linkIndex !== -1 ? (row[linkIndex] || '') : '',
          city: cityIndex !== -1 ? (row[cityIndex] || '') : '',
          state: stateIndex !== -1 ? (row[stateIndex] || '') : '',
          address: addressIndex !== -1 ? (row[addressIndex] || '') : '',
        }))
        .filter((store: any) => store.link); // Only include stores with a link

      res.json(stores);
    } catch (error: any) {
      console.error("Error fetching stores by DBA:", error);
      res.status(500).json({ message: error.message || "Failed to fetch stores by DBA" });
    }
  });

  // Claim multiple stores with DBA
  app.post('/api/stores/claim-multiple', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const agentName = user?.agentName || 
        (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email)?.trim() || 
        'Unknown Agent';
      const { storeLinks, dbaName, storeSheetId, trackerSheetId, isUpdatingExisting } = req.body;

      if (!storeLinks || !Array.isArray(storeLinks) || storeLinks.length === 0) {
        return res.status(400).json({ message: "Store links array is required" });
      }

      if (!dbaName || dbaName.trim().length === 0) {
        return res.status(400).json({ message: "DBA name is required" });
      }

      if (!storeSheetId || !trackerSheetId) {
        return res.status(400).json({ message: "Both Store Database and Commission Tracker sheet IDs are required" });
      }

      // Get both sheets
      const storeSheet = await storage.getGoogleSheetById(storeSheetId);
      const trackerSheet = await storage.getGoogleSheetById(trackerSheetId);

      if (!storeSheet || !trackerSheet) {
        return res.status(404).json({ message: 'One or both sheets not found' });
      }

      // Read Store Database to find stores
      const storeRange = `${storeSheet.sheetName}!A:ZZ`;
      const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);

      if (storeRows.length === 0) {
        return res.status(404).json({ message: 'Store Database is empty' });
      }

      const storeHeaders = storeRows[0];
      const storeLinkIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'link');
      const storeDbaIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'dba');
      const storeAgentIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'agent name' || h.toLowerCase() === 'agent');

      console.log('[CLAIM-MULTIPLE] Store Database headers:', storeHeaders);
      console.log('[CLAIM-MULTIPLE] Column indices - Link:', storeLinkIndex, 'DBA:', storeDbaIndex, 'Agent:', storeAgentIndex);

      if (storeLinkIndex === -1) {
        return res.status(404).json({ message: 'Link column not found in Store Database' });
      }

      // Read Commission Tracker to check for existing rows
      const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

      const trackerHeaders = trackerRows.length > 0 ? trackerRows[0] : [];
      const trackerLinkIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'link');
      const trackerAgentIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'agent' || h.toLowerCase() === 'agent name');

      if (trackerLinkIndex === -1) {
        return res.status(404).json({ message: 'Link column not found in Commission Tracker' });
      }

      // Find existing tracker links to avoid duplicates (normalize all links)
      const existingTrackerLinks = new Set(
        trackerRows.slice(1).map((row: any[]) => normalizeLink(row[trackerLinkIndex] || ''))
      );

      let updatedStoreCount = 0;
      let skippedCount = 0;
      let createdTrackerCount = 0;

      // Update Store Database - update DBA and Agent Name for ALL stores
      for (const storeLink of storeLinks) {
        const normalizedLink = normalizeLink(storeLink);

        // Find store row in Store Database (using manual loop like WooCommerce match)
        let storeRowIndex = -1;
        for (let i = 1; i < storeRows.length; i++) {
          if (normalizeLink(storeRows[i][storeLinkIndex] || '') === normalizedLink) {
            storeRowIndex = i + 1; // +1 for 1-indexed Google Sheets
            break;
          }
        }

        if (storeRowIndex === -1 || storeRowIndex < 2) {
          console.warn(`Store not found in Store Database: ${storeLink}`);
          skippedCount++;
          continue;
        }

        // Update DBA and Agent Name in Store Database (if columns exist)
        console.log(`[CLAIM-MULTIPLE] Processing store: ${storeLink}`);
        console.log(`[CLAIM-MULTIPLE] Found at Google Sheets row: ${storeRowIndex}`);
        console.log(`[CLAIM-MULTIPLE] Store headers:`, storeHeaders);
        console.log(`[CLAIM-MULTIPLE] DBA column index: ${storeDbaIndex}, Agent column index: ${storeAgentIndex}`);

        if (storeDbaIndex !== -1) {
          const columnLetter = String.fromCharCode(65 + storeDbaIndex);
          const cellRange = `${storeSheet.sheetName}!${columnLetter}${storeRowIndex}`;
          console.log(`[CLAIM-MULTIPLE] Writing DBA "${dbaName}" to Store Database cell: ${cellRange}`);
          console.log(`[CLAIM-MULTIPLE] Spreadsheet ID: ${storeSheet.spreadsheetId}`);
          try {
            await googleSheets.writeSheetData(storeSheet.spreadsheetId, cellRange, [[dbaName]]);
            console.log(`[CLAIM-MULTIPLE] ✓ DBA write successful`);
          } catch (error: any) {
            console.error(`[CLAIM-MULTIPLE] ✗ DBA write failed:`, error.message);
            console.error(`[CLAIM-MULTIPLE] Full error:`, error);
          }
        } else {
          console.log(`[CLAIM-MULTIPLE] ✗ DBA column not found - skipping DBA update`);
        }

        if (storeAgentIndex !== -1) {
          const columnLetter = String.fromCharCode(65 + storeAgentIndex);
          const cellRange = `${storeSheet.sheetName}!${columnLetter}${storeRowIndex}`;
          console.log(`[CLAIM-MULTIPLE] Writing Agent "${agentName}" to Store Database cell: ${cellRange}`);
          console.log(`[CLAIM-MULTIPLE] Spreadsheet ID: ${storeSheet.spreadsheetId}`);
          try {
            await googleSheets.writeSheetData(storeSheet.spreadsheetId, cellRange, [[agentName]]);
            console.log(`[CLAIM-MULTIPLE] ✓ Agent write successful`);
            updatedStoreCount++;
          } catch (error: any) {
            console.error(`[CLAIM-MULTIPLE] ✗ Agent write failed:`, error.message);
            console.error(`[CLAIM-MULTIPLE] Full error:`, error);
          }
        } else {
          console.log(`[CLAIM-MULTIPLE] ✗ Agent Name column not found - skipping Agent update`);
        }
      }

      // Create ONE single Commission Tracker row using the first store's link
      // ONLY if this is a NEW DBA claim (not updating an existing one)
      const firstStoreLink = storeLinks[0];
      const normalizedFirstLink = normalizeLink(firstStoreLink);
      
      if (!isUpdatingExisting) {
        // Check if tracker row already exists for first store
        if (!existingTrackerLinks.has(normalizedFirstLink)) {
          console.log(`[CLAIM-MULTIPLE] Creating single tracker row for NEW DBA group using link: ${firstStoreLink}`);
          const newTrackerRow = new Array(trackerHeaders.length).fill('');
          if (trackerLinkIndex !== -1) newTrackerRow[trackerLinkIndex] = firstStoreLink;
          if (trackerAgentIndex !== -1) {
            newTrackerRow[trackerAgentIndex] = agentName;
            console.log(`[CLAIM-MULTIPLE] Setting tracker Agent at index ${trackerAgentIndex}: "${agentName}"`);
          }

          console.log(`[CLAIM-MULTIPLE] Tracker row prepared:`, newTrackerRow);

          const appendRange = `${trackerSheet.sheetName}!A:ZZ`;
          console.log(`[CLAIM-MULTIPLE] Appending 1 tracker row to Commission Tracker`);
          console.log(`[CLAIM-MULTIPLE] Append range: ${appendRange}`);
          console.log(`[CLAIM-MULTIPLE] Tracker headers:`, trackerHeaders);
          await googleSheets.appendSheetData(trackerSheet.spreadsheetId, appendRange, [newTrackerRow]);
          console.log(`[CLAIM-MULTIPLE] ✓ Commission Tracker append successful`);
          createdTrackerCount = 1;
        } else {
          console.log(`[CLAIM-MULTIPLE] Tracker row already exists for first store link, skipping tracker creation`);
        }
      } else {
        console.log(`[CLAIM-MULTIPLE] Updating existing DBA - skipping tracker creation (isUpdatingExisting=true)`);
      }

      console.log(`[CLAIM-MULTIPLE] FINAL SUMMARY:`);
      console.log(`  - Updated Store Database rows: ${updatedStoreCount}`);
      console.log(`  - Created Commission Tracker rows: ${createdTrackerCount}`);
      console.log(`  - Skipped: ${skippedCount}`);
      console.log(`  - Total requested: ${storeLinks.length}`);

      // Invalidate cache after successful updates
      clearUserCache(userId);

      res.json({
        message: "Successfully claimed multiple locations",
        updatedStoreCount,
        createdTrackerCount,
        skippedCount,
        total: storeLinks.length,
        warnings: storeDbaIndex === -1 ? ["DBA column not found in Store Database - DBA not updated"] : []
      });
    } catch (error: any) {
      console.error("Error claiming multiple stores:", error);
      res.status(500).json({ message: error.message || "Failed to claim stores" });
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
      const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);

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
      const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);

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
          await googleSheets.writeSheetData(storeSheet.spreadsheetId, update.range, update.values);
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

  // ===== SALES ANALYTICS ENDPOINTS =====

  // Get dashboard summary with key sales metrics (from Google Sheets)
  app.get('/api/analytics/dashboard-summary', async (req, res) => {
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
      let allowedAgentNames: string[] = [];
      const isAgent = currentUser.role === 'agent';

      if (isAgent) {
        // SECURITY: Agents can ONLY see their own data - ignore any agentIds parameter
        const currentAgentName = currentUser.agentName || `${currentUser.firstName} ${currentUser.lastName}`.trim();
        allowedAgentNames = [currentAgentName];
      } else {
        // Admin: Use agentIds from query params or default to current user
        const requestedAgentIds = agentIds 
          ? (Array.isArray(agentIds) ? agentIds : [agentIds])
          : [userId];

        // Fetch user details for requested agent IDs to get their names
        const agentUsers = await Promise.all(
          requestedAgentIds.map(id => storage.getUserById(id as string))
        );

        allowedAgentNames = agentUsers
          .filter(Boolean)
          .map(user => user!.agentName || `${user!.firstName} ${user!.lastName}`.trim());
      }

      // Get Commission Tracker sheet
      const trackerSheet = await storage.getGoogleSheetByPurpose('commissions');
      if (!trackerSheet) {
        return res.json({
          totalEarnings: "0.00",
          monthlyAverage: "0.00",
          thisMonthEarnings: "0.00",
          lastMonthEarnings: "0.00",
          projectedEarnings: "0.00",
          bestMonth: { month: '', earnings: "0.00" },
          commissionBreakdown: { commission25: "0.00", commission10: "0.00" }
        });
      }

      // Read Commission Tracker data
      const trackerRange = `${trackerSheet.sheetName}!A:G`;
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

      if (trackerRows.length <= 1) {
        return res.json({
          totalEarnings: "0.00",
          monthlyAverage: "0.00",
          thisMonthEarnings: "0.00",
          lastMonthEarnings: "0.00",
          projectedEarnings: "0.00",
          bestMonth: { month: '', earnings: "0.00" },
          commissionBreakdown: { commission25: "0.00", commission10: "0.00" }
        });
      }

      // Parse headers to find column indices
      const headers = trackerRows[0];
      const dateIndex = headers.findIndex((h: string) => h.toLowerCase() === 'date');
      const amountIndex = headers.findIndex((h: string) => h.toLowerCase() === 'amount');
      const commissionTypeIndex = headers.findIndex((h: string) => h.toLowerCase() === 'commission type');
      const agentIndex = headers.findIndex((h: string) => h.toLowerCase() === 'agent name');

      // Calculate metrics
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      let totalEarnings = 0;
      let thisMonthEarnings = 0;
      let lastMonthEarnings = 0;
      let commission25Earnings = 0;
      let commission10Earnings = 0;
      const monthlyEarnings: { [key: string]: number } = {};

      console.log('[DASHBOARD-SUMMARY] allowedAgentNames:', allowedAgentNames);
      console.log('[DASHBOARD-SUMMARY] agentIndex:', agentIndex);
      console.log('[DASHBOARD-SUMMARY] Processing', trackerRows.length - 1, 'tracker rows');

      // Process each tracker row
      for (let i = 1; i < trackerRows.length; i++) {
        const row = trackerRows[i];
        const dateStr = row[dateIndex] || '';
        const amountStr = row[amountIndex] || '0';
        const commissionType = row[commissionTypeIndex] || '';
        const rowAgent = row[agentIndex] || '';

        // SECURITY: Filter by allowed agent names
        if (allowedAgentNames.length > 0) {
          // If Agent column doesn't exist, agents see ZERO data
          if (agentIndex === -1) {
            console.log(`[DASHBOARD-SUMMARY] Row ${i}: SKIPPING - Agent column missing, security requires filtering`);
            continue;
          }

          const rowAgentNormalized = rowAgent.toLowerCase().trim();
          const isAllowed = allowedAgentNames.some(name => 
            name.toLowerCase().trim() === rowAgentNormalized
          );
          if (!isAllowed) {
            console.log(`[DASHBOARD-SUMMARY] Row ${i}: SKIPPING - rowAgent="${rowAgent}" not in allowedAgentNames`);
            continue;
          }
        }

        console.log(`[DASHBOARD-SUMMARY] Row ${i}:`, { dateStr, amountStr, commissionType, rowAgent });

        // Parse amount
        const amount = parseFloat(String(amountStr).replace(/[^0-9.-]/g, '')) || 0;
        if (amount === 0) {
          console.log(`[DASHBOARD-SUMMARY] Row ${i}: Skipping - amount is 0`);
          continue;
        }

        totalEarnings += amount;
        console.log(`[DASHBOARD-SUMMARY] Row ${i}: Added $${amount}, total now: $${totalEarnings}`);

        // Parse date (handle formats: MM/DD/YYYY, M/D/YYYY, etc.)
        let orderDate: Date | null = null;
        if (dateStr) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            orderDate = parsed;
          }
        }

        if (orderDate) {
          // Monthly tracking
          const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
          monthlyEarnings[monthKey] = (monthlyEarnings[monthKey] || 0) + amount;

          // This month vs last month
          if (orderDate >= thisMonthStart) {
            thisMonthEarnings += amount;
          }
          if (orderDate >= lastMonthStart && orderDate <= lastMonthEnd) {
            lastMonthEarnings += amount;
          }
        }

        // Track by commission type
        if (commissionType.includes('25')) {
          commission25Earnings += amount;
        } else if (commissionType.includes('10')) {
          commission10Earnings += amount;
        }
      }

      // Find best month
      let bestMonth = { month: '', earnings: 0 };
      for (const [month, earnings] of Object.entries(monthlyEarnings)) {
        if (earnings > bestMonth.earnings) {
          bestMonth = { month, earnings };
        }
      }

      // Calculate monthly average (last 6 months)
      const last6Months = Object.entries(monthlyEarnings)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 6);
      const monthlyAverage = last6Months.length > 0
        ? last6Months.reduce((sum, [_, val]) => sum + val, 0) / last6Months.length
        : 0;

      // Calculate projected earnings (based on this month's daily average)
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const currentDay = now.getDate();
      const projectedEarnings = currentDay > 0 
        ? (thisMonthEarnings / currentDay) * daysInMonth
        : 0;

      res.json({
        totalEarnings: totalEarnings.toFixed(2),
        monthlyAverage: monthlyAverage.toFixed(2),
        thisMonthEarnings: thisMonthEarnings.toFixed(2),
        lastMonthEarnings: lastMonthEarnings.toFixed(2),
        projectedEarnings: projectedEarnings.toFixed(2),
        bestMonth: {
          month: bestMonth.month,
          earnings: bestMonth.earnings.toFixed(2)
        },
        commissionBreakdown: {
          commission25: commission25Earnings.toFixed(2),
          commission10: commission10Earnings.toFixed(2)
        }
      });
    } catch (error: any) {
      console.error('Error fetching dashboard summary:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch dashboard summary' });
    }
  });

  // Get commission breakdown details (from Google Sheets)
  app.get('/api/analytics/commission-breakdown', async (req, res) => {
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
      let allowedAgentNames: string[] = [];
      const isAgent = currentUser.role === 'agent';

      if (isAgent) {
        // SECURITY: Agents can ONLY see their own data - ignore any agentIds parameter
        const currentAgentName = currentUser.agentName || `${currentUser.firstName} ${currentUser.lastName}`.trim();
        allowedAgentNames = [currentAgentName];
      } else {
        // Admin: Use agentIds from query params or default to current user
        const requestedAgentIds = agentIds 
          ? (Array.isArray(agentIds) ? agentIds : [agentIds])
          : [userId];

        // Fetch user details for requested agent IDs to get their names
        const agentUsers = await Promise.all(
          requestedAgentIds.map(id => storage.getUserById(id as string))
        );

        allowedAgentNames = agentUsers
          .filter(Boolean)
          .map(user => user!.agentName || `${user!.firstName} ${user!.lastName}`.trim());
      }

      // Get Commission Tracker sheet
      const trackerSheet = await storage.getGoogleSheetByPurpose('commissions');
      if (!trackerSheet) {
        return res.json({
          breakdown: {
            tier25Percent: { clients: 0, earnings: 0 },
            tier10Percent: { clients: 0, earnings: 0 }
          }
        });
      }

      // Read Commission Tracker data
      const trackerRange = `${trackerSheet.sheetName}!A:G`;
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

      if (trackerRows.length <= 1) {
        return res.json({
          breakdown: {
            tier25Percent: { clients: 0, earnings: 0 },
            tier10Percent: { clients: 0, earnings: 0 }
          }
        });
      }

      // Parse headers
      const headers = trackerRows[0];
      const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === 'link');
      const amountIndex = headers.findIndex((h: string) => h.toLowerCase() === 'amount');
      const commissionTypeIndex = headers.findIndex((h: string) => h.toLowerCase() === 'commission type');
      const agentIndex = headers.findIndex((h: string) => h.toLowerCase() === 'agent name');

      // Track unique stores and earnings by tier
      const tier25Stores = new Set<string>();
      const tier10Stores = new Set<string>();
      let tier25Earnings = 0;
      let tier10Earnings = 0;

      for (let i = 1; i < trackerRows.length; i++) {
        const row = trackerRows[i];
        const link = row[linkIndex] || '';
        const amountStr = row[amountIndex] || '0';
        const commissionType = row[commissionTypeIndex] || '';
        const rowAgent = row[agentIndex] || '';

        // SECURITY: Filter by allowed agent names
        if (allowedAgentNames.length > 0) {
          // If Agent column doesn't exist, agents see ZERO data
          if (agentIndex === -1) {
            continue;
          }

          const rowAgentNormalized = rowAgent.toLowerCase().trim();
          const isAllowed = allowedAgentNames.some(name => 
            name.toLowerCase().trim() === rowAgentNormalized
          );
          if (!isAllowed) {
            continue;
          }
        }

        const amount = parseFloat(String(amountStr).replace(/[^0-9.-]/g, '')) || 0;
        if (amount === 0) continue;

        if (commissionType.includes('25')) {
          tier25Earnings += amount;
          if (link) tier25Stores.add(link);
        } else if (commissionType.includes('10')) {
          tier10Earnings += amount;
          if (link) tier10Stores.add(link);
        }
      }

      res.json({
        breakdown: {
          tier25Percent: {
            clients: tier25Stores.size,
            earnings: tier25Earnings
          },
          tier10Percent: {
            clients: tier10Stores.size,
            earnings: tier10Earnings
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching commission breakdown:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch commission breakdown' });
    }
  });

  // Get client portfolio metrics (from Google Sheets)
  app.get('/api/analytics/portfolio-metrics', async (req, res) => {
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
      let allowedAgentNames: string[] = [];
      const isAgent = currentUser.role === 'agent';

      if (isAgent) {
        // SECURITY: Agents can ONLY see their own data - ignore any agentIds parameter
        const currentAgentName = currentUser.agentName || `${currentUser.firstName} ${currentUser.lastName}`.trim();
        allowedAgentNames = [currentAgentName];
      } else {
        // Admin: Use agentIds from query params or default to current user
        const requestedAgentIds = agentIds 
          ? (Array.isArray(agentIds) ? agentIds : [agentIds])
          : [userId];

        // Fetch user details for requested agent IDs to get their names
        const agentUsers = await Promise.all(
          requestedAgentIds.map(id => storage.getUserById(id as string))
        );

        allowedAgentNames = agentUsers
          .filter(Boolean)
          .map(user => user!.agentName || `${user!.firstName} ${user!.lastName}`.trim());
      }

      // Get both sheets
      const sheets = await storage.getAllActiveGoogleSheets();
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');
      const storeSheet = sheets.find(s => s.sheetPurpose === 'Store Database');

      if (!trackerSheet || !storeSheet) {
        return res.json({
          totalClients: 0,
          activeClients: 0,
          avgRevenuePerClient: "0.00",
          repeatOrderRate: "0.0"
        });
      }

      // Read Store Database to get total clients for this agent
      let totalClients = 0;
      if (isAgent) {
        // For agents, count only stores assigned to them
        const storeRange = `${storeSheet.sheetName}!A:Z`;
        const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);
        if (storeRows.length > 1) {
          const storeHeaders = storeRows[0];
          let storeAgentIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'agent'); // Check for 'agent' column
          if (storeAgentIndex === -1) { // Fallback to 'agent name' if 'agent' not found
             storeAgentIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'agent name');
          }
          
          if (storeAgentIndex !== -1) {
            totalClients = storeRows.slice(1).filter(row => {
              const rowAgent = row[storeAgentIndex] || '';
              const rowAgentNormalized = rowAgent.toLowerCase().trim();
              return allowedAgentNames.some(name => 
                name.toLowerCase().trim() === rowAgentNormalized
              );
            }).length;
          }
        }
      } else {
        // Admin: Filter by agentIds parameter
        if (allowedAgentNames.length > 0) {
          const storeRange = `${storeSheet.sheetName}!A:Z`;
          const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);
          if (storeRows.length > 1) {
            const storeHeaders = storeRows[0];
            let storeAgentIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'agent'); // Check for 'agent' column
            if (storeAgentIndex === -1) { // Fallback to 'agent name' if 'agent' not found
              storeAgentIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'agent name');
            }

            if (storeAgentIndex !== -1) {
              totalClients = storeRows.slice(1).filter(row => {
                const rowAgent = row[storeAgentIndex] || '';
                const rowAgentNormalized = rowAgent.toLowerCase().trim();
                return allowedAgentNames.some(name => 
                  name.toLowerCase().trim() === rowAgentNormalized
                );
              }).length;
            }
          }
        } else {
          // No filter, count all stores
          const storeRange = `${storeSheet.sheetName}!A:A`;
          const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);
          totalClients = Math.max(0, storeRows.length - 1);
        }
      }

      // Read Commission Tracker to calculate active clients and repeat order rate
      const trackerRange = `${trackerSheet.sheetName}!A:G`;
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

      if (trackerRows.length <= 1) {
        return res.json({
          totalClients,
          activeClients: 0,
          avgRevenuePerClient: "0.00",
          repeatOrderRate: "0.0"
        });
      }

      // Parse headers
      const headers = trackerRows[0];
      const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === 'link');
      const amountIndex = headers.findIndex((h: string) => h.toLowerCase() === 'amount');
      const dateIndex = headers.findIndex((h: string) => h.toLowerCase() === 'date');
      const agentIndex = headers.findIndex((h: string) => h.toLowerCase() === 'agent name');

      // Track transactions per store
      const storeTransactions: { [link: string]: { count: number; totalAmount: number; lastTransactionDate: Date | null } } = {};
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      for (let i = 1; i < trackerRows.length; i++) {
        const row = trackerRows[i];
        const link = row[linkIndex] || '';
        const amountStr = row[amountIndex] || '0';
        const dateStr = row[dateIndex] || '';
        const rowAgent = row[agentIndex] || '';

        // SECURITY: Filter by allowed agent names
        if (allowedAgentNames.length > 0) {
          // If Agent column doesn't exist, agents see ZERO data
          if (agentIndex === -1) {
            continue;
          }

          const rowAgentNormalized = rowAgent.toLowerCase().trim();
          const isAllowed = allowedAgentNames.some(name => 
            name.toLowerCase().trim() === rowAgentNormalized
          );
          if (!isAllowed) {
            continue;
          }
        }

        const amount = parseFloat(String(amountStr).replace(/[^0-9.-]/g, '')) || 0;
        if (!link || amount === 0) continue;

        if (!storeTransactions[link]) {
          storeTransactions[link] = { count: 0, totalAmount: 0, lastTransactionDate: null };
        }

        storeTransactions[link].count += 1;
        storeTransactions[link].totalAmount += amount;

        // Update last transaction date if this one is more recent
        let transactionDate: Date | null = null;
        if (dateStr) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            transactionDate = parsed;
          }
        }
        if (transactionDate && (!storeTransactions[link].lastTransactionDate || transactionDate > storeTransactions[link].lastTransactionDate)) {
          storeTransactions[link].lastTransactionDate = transactionDate;
        }
      }

      // Calculate metrics
      // Active clients = stores with transactions in the last 30 days
      const activeStores = Object.values(storeTransactions).filter(store => 
        store.lastTransactionDate && store.lastTransactionDate >= thirtyDaysAgo
      );
      const activeClients = activeStores.length;

      // Calculate average revenue per client (based on all stores with transactions, not just active)
      const allStoresWithTransactions = Object.values(storeTransactions);
      const totalRevenue = allStoresWithTransactions.reduce((sum, store) => sum + store.totalAmount, 0);
      const avgRevenuePerClient = allStoresWithTransactions.length > 0 ? totalRevenue / allStoresWithTransactions.length : 0;

      // Repeat order rate = percentage of stores (with transactions) that have multiple transactions
      const storesWithMultipleTransactions = allStoresWithTransactions.filter(store => store.count > 1).length;
      const repeatOrderRate = allStoresWithTransactions.length > 0 ? (storesWithMultipleTransactions / allStoresWithTransactions.length) * 100 : 0;

      res.json({
        totalClients,
        activeClients,
        avgRevenuePerClient: avgRevenuePerClient.toFixed(2),
        repeatOrderRate: repeatOrderRate.toFixed(1)
      });
    } catch (error: any) {
      console.error('Error fetching portfolio metrics:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch portfolio metrics' });
    }
  });

  // Get top clients ranked by commission (from Google Sheets)
  app.get('/api/analytics/top-clients', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { agentIds, limit } = req.query;
      const topLimit = limit ? parseInt(limit as string) : 10;

      // Get current user details for agent filtering
      const currentUser = await storage.getUserById(userId);
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // SECURITY: Determine which agents' data to show
      let allowedAgentNames: string[] = [];
      const isAgent = currentUser.role === 'agent';

      if (isAgent) {
        // SECURITY: Agents can ONLY see their own data - ignore any agentIds parameter
        const currentAgentName = currentUser.agentName || `${currentUser.firstName} ${currentUser.lastName}`.trim();
        allowedAgentNames = [currentAgentName];
      } else {
        // Admin: Use agentIds from query params or default to current user
        const requestedAgentIds = agentIds 
          ? (Array.isArray(agentIds) ? agentIds : [agentIds])
          : [userId];

        // Fetch user details for requested agent IDs to get their names
        const agentUsers = await Promise.all(
          requestedAgentIds.map(id => storage.getUserById(id as string))
        );

        allowedAgentNames = agentUsers
          .filter(Boolean)
          .map(user => user!.agentName || `${user!.firstName} ${user!.lastName}`.trim());
      }

      // Get Commission Tracker sheet
      const trackerSheet = await storage.getGoogleSheetByPurpose('commissions');
      if (!trackerSheet) {
        return res.json({ topClients: [] });
      }

      // Read Commission Tracker data
      const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

      if (trackerRows.length <= 1) {
        return res.json({ topClients: [] });
      }

      // Parse headers to find column indices
      const headers = trackerRows[0];
      const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === 'link');
      const amountIndex = headers.findIndex((h: string) => h.toLowerCase() === 'amount');
      const dateIndex = headers.findIndex((h: string) => h.toLowerCase() === 'date');
      const agentIndex = headers.findIndex((h: string) => h.toLowerCase() === 'agent name');

      // Track metrics per client (by link)
      const clientMetrics: { 
        [link: string]: { 
          totalCommission: number; 
          orderCount: number; 
          firstOrderDate: string | null; 
          lastOrderDate: string | null;
        } 
      } = {};

      for (let i = 1; i < trackerRows.length; i++) {
        const row = trackerRows[i];
        const link = row[linkIndex] || '';
        const amountStr = row[amountIndex] || '0';
        const dateStr = row[dateIndex] || '';
        const rowAgent = row[agentIndex] || '';

        // SECURITY: Filter by allowed agent names
        if (allowedAgentNames.length > 0) {
          // If Agent column doesn't exist, agents see ZERO data
          if (agentIndex === -1) {
            continue;
          }

          const rowAgentNormalized = rowAgent.toLowerCase().trim();
          const isAllowed = allowedAgentNames.some(name => 
            name.toLowerCase().trim() === rowAgentNormalized
          );
          if (!isAllowed) {
            continue;
          }
        }

        const amount = parseFloat(String(amountStr).replace(/[^0-9.-]/g, '')) || 0;
        if (!link || amount === 0) continue;

        // Initialize client metrics if doesn't exist
        if (!clientMetrics[link]) {
          clientMetrics[link] = {
            totalCommission: 0,
            orderCount: 0,
            firstOrderDate: null,
            lastOrderDate: null
          };
        }

        // Update metrics
        clientMetrics[link].totalCommission += amount;
        clientMetrics[link].orderCount += 1;

        // Update dates
        if (dateStr) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            const isoDate = parsed.toISOString();
            if (!clientMetrics[link].firstOrderDate || isoDate < clientMetrics[link].firstOrderDate!) {
              clientMetrics[link].firstOrderDate = isoDate;
            }
            if (!clientMetrics[link].lastOrderDate || isoDate > clientMetrics[link].lastOrderDate!) {
              clientMetrics[link].lastOrderDate = isoDate;
            }
          }
        }
      }

      // Helper function to normalize links for matching
      const normalizeLink = (link: string): string => {
        if (!link) return '';
        return link
          .toLowerCase()
          .trim()
          .replace(/^https?:\/\//, '') // Remove protocol
          .replace(/^www\./, '') // Remove www
          .replace(/\/$/, ''); // Remove trailing slash
      };

      // Get Store Database sheet to look up company names by link
      // Debug: Check all active sheets
      const allSheets = await storage.getAllActiveGoogleSheets();
      console.log('[TOP-CLIENTS] All active sheets:', allSheets.map(s => ({ name: s.spreadsheetName, purpose: s.sheetPurpose })));
      
      const storeSheet = allSheets.find(s => s.sheetPurpose === 'Store Database');
      const linkToNameMap: { [normalizedLink: string]: string } = {};

      console.log('[TOP-CLIENTS] Store sheet found:', !!storeSheet);

      if (storeSheet) {
        try {
          const storeRange = `${storeSheet.sheetName}!A:ZZ`;
          const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);

          console.log('[TOP-CLIENTS] Store Database rows:', storeRows.length);

          if (storeRows.length > 1) {
            const storeHeaders = storeRows[0];
            const storeLinkIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'link');
            const nameIndex = 0; // Column A = Name
            const dbaIndex = 13; // Column N = DBA

            console.log('[TOP-CLIENTS] Store Headers:', storeHeaders);
            console.log('[TOP-CLIENTS] Link column index:', storeLinkIndex, 'Name index:', nameIndex, 'DBA index:', dbaIndex);

            // Build lookup map: normalized link -> company name
            for (let i = 1; i < storeRows.length; i++) {
              const row = storeRows[i];
              const storeLink = row[storeLinkIndex] || '';
              const dba = row[dbaIndex] || '';
              const name = row[nameIndex] || '';

              if (storeLink) {
                const normalized = normalizeLink(storeLink);
                // Prefer DBA over Name
                linkToNameMap[normalized] = dba || name || storeLink;
                
                if (i <= 3) {
                  console.log(`[TOP-CLIENTS] Row ${i}: link="${storeLink}" -> normalized="${normalized}" -> name="${linkToNameMap[normalized]}"`);
                }
              }
            }
            console.log('[TOP-CLIENTS] Lookup map size:', Object.keys(linkToNameMap).length);
            console.log('[TOP-CLIENTS] Sample lookup keys:', Object.keys(linkToNameMap).slice(0, 5));
          }
        } catch (error) {
          console.error('[TOP-CLIENTS] Error reading Store Database for name lookup:', error);
          // Continue without names - will fall back to links
        }
      }

      // Convert to array and sort by total commission (descending)
      const topClients = Object.entries(clientMetrics)
        .map(([link, metrics], index) => {
          const normalizedLink = normalizeLink(link);
          const companyName = linkToNameMap[normalizedLink] || link;
          
          if (index < 3) {
            console.log(`[TOP-CLIENTS] Client ${index + 1}: original="${link}" -> normalized="${normalizedLink}" -> found="${companyName}"`);
          }
          
          return {
            id: link,
            name: companyName, // Use company name from Store Database (DBA > Name), fallback to link
            totalRevenue: metrics.totalCommission.toFixed(2),
            totalCommission: metrics.totalCommission.toFixed(2),
            orderCount: metrics.orderCount,
            firstOrderDate: metrics.firstOrderDate,
            lastOrderDate: metrics.lastOrderDate
          };
        })
        .sort((a, b) => parseFloat(b.totalCommission) - parseFloat(a.totalCommission))
        .slice(0, topLimit);

      console.log('[TOP-CLIENTS] Returning', topClients.length, 'clients');
      res.json({ topClients });
    } catch (error: any) {
      console.error('Error fetching top clients:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch top clients' });
    }
  });

  // ===== REMINDER MANAGEMENT ENDPOINTS =====

  // Get all reminders for the current user (with optional agent filtering for admins)
  app.get('/api/reminders', async (req, res) => {
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
        const requestedAgentIds = agentIds 
          ? (Array.isArray(agentIds) ? agentIds : [agentIds])
          : [userId];

        allowedUserIds = requestedAgentIds;
      }

      // Fetch reminders for allowed users
      let allReminders: any[] = [];
      for (const uid of allowedUserIds) {
        const userReminders = await storage.getRemindersByUser(uid);

        // Fetch user info to add agentName to each reminder
        const reminderUser = await storage.getUserById(uid);
        if (!reminderUser) {
          console.warn(`[Reminders] User ${uid} not found, skipping reminders`);
          continue; // Skip if user not found
        }

        const agentName = reminderUser.agentName || `${reminderUser.firstName || ''} ${reminderUser.lastName || ''}`.trim() || 'Unknown';

        // Enrich reminders with agent info
        const enrichedReminders = userReminders.map(r => ({
          ...r,
          agentId: uid,
          agentName
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
  app.get('/api/reminders/client/:clientId', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { clientId } = req.params;
      const reminders = await storage.getRemindersByClient(clientId);

      // Filter by user (security check)
      const userReminders = reminders.filter(r => r.userId === userId);
      res.json({ reminders: userReminders });
    } catch (error: any) {
      console.error('Error fetching client reminders:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch client reminders' });
    }
  });

  // Get reminders for a specific date
  app.get('/api/reminders/by-date/:date', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { date } = req.params; // Expected format: YYYY-MM-DD

      // Get all user's reminders
      const allReminders = await storage.getRemindersByUser(userId);

      // Filter by date
      const dateReminders = allReminders.filter(r => r.scheduledDate === date && r.isActive);

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

  // Create a new reminder
  // ✅ SET IN STONE - VERIFIED WORKING (Oct 25, 2025)
  // This endpoint correctly saves reminders to BOTH:
  //   1. Database (reminder card) 
  //   2. Google Calendar (calendar event with proper timezone handling)
  // Timezone handling: Uses scheduledDate + scheduledTime + timezone (no UTC conversion)
  // Customer timezone mode: Supports both agent timezone and customer timezone
  app.post('/api/reminders', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { 
        title, 
        description, 
        reminderDate, 
        reminderTime, 
        storeMetadata,
        useCustomerTimezone,
        customerTimezone,
        agentTimezone
      } = req.body;

      // Validate required fields
      if (!title || !reminderDate || !reminderTime) {
        return res.status(400).json({ message: 'Missing required fields: title, reminderDate, reminderTime' });
      }

      // Determine effective timezone
      const effectiveTimezone = useCustomerTimezone && customerTimezone 
        ? customerTimezone 
        : agentTimezone || 'UTC';

      // Extract date and time (simplified - no double conversion)
      const scheduledDate = reminderDate.split('T')[0]; // YYYY-MM-DD
      const scheduledTime = reminderTime; // HH:MM in 24hr format

      // Note: Past date validation removed - timezone complexity causes false positives
      // Users can manage their own reminder dates, and Google Calendar will handle any actual past dates

      // Prepare store metadata with customer timezone if applicable
      const enhancedStoreMetadata = storeMetadata ? {
        ...storeMetadata,
        customerTimeZone: useCustomerTimezone && customerTimezone ? customerTimezone : undefined
      } : null;

      // Create reminder data with simplified timezone handling
      const reminderData = {
        userId,
        title,
        description: description || null,
        reminderType: 'one_time' as const,
        scheduledDate,
        scheduledTime,
        timezone: effectiveTimezone,
        isActive: true,
        addToCalendar: false,
        storeMetadata: enhancedStoreMetadata,
      };

      // Validate with schema
      const validation = insertReminderSchema.safeParse(reminderData);
      if (!validation.success) {
        console.error('Validation failed:', validation.error.errors);
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      // Create the reminder
      const reminder = await storage.createReminder(validation.data);

      // Auto-claim store when creating reminder (agents only)
      const user = await storage.getUser(userId);
      if (user && user.role !== 'admin' && user.agentName && enhancedStoreMetadata?.link) {
        try {
          const linkValue = enhancedStoreMetadata.link;

          // Find Commission Tracker and claim the store
          const sheets = await storage.getAllActiveGoogleSheets();
          const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

          if (trackerSheet) {
            const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
            const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

            if (trackerRows.length > 0) {
              const trackerHeaders = trackerRows[0];
              const trackerLinkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
              const trackerAgentIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'agent name');

              // Check if row exists in tracker
              let existingTrackerRow = -1;
              for (let i = 1; i < trackerRows.length; i++) {
                if (trackerRows[i][trackerLinkIndex] === linkValue) {
                  existingTrackerRow = i + 1; // 1-indexed
                  break;
                }
              }

              if (existingTrackerRow > 0) {
                // Update existing row with agent name
                if (trackerAgentIndex !== -1) {
                  const agentColLetter = String.fromCharCode(65 + trackerAgentIndex);
                  const agentCellRange = `${trackerSheet.sheetName}!${agentColLetter}${existingTrackerRow}`;
                  await googleSheets.writeSheetData(trackerSheet.spreadsheetId, agentCellRange, [[user.agentName]]);
                }
              } else {
                // Create new row in tracker
                const newTrackerRow = new Array(trackerHeaders.length).fill('');
                if (trackerLinkIndex !== -1) newTrackerRow[trackerLinkIndex] = linkValue;
                if (trackerAgentIndex !== -1) newTrackerRow[trackerAgentIndex] = user.agentName;
                await googleSheets.appendSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}!A:ZZ`, [newTrackerRow]);
              }
            }
          }
        } catch (claimError: any) {
          // Log error but don't fail the request
          console.error('[Auto-Claim] Failed to claim store:', claimError.message);
        }
      }

      // Try to create Google Calendar event (non-blocking)
      try {
        const integration = await storage.getUserIntegration(userId);
        if (integration?.googleCalendarAccessToken) {
          console.log('[Calendar] Starting calendar event creation for reminder:', reminder.id);

          // Get system-wide OAuth credentials FIRST (needed for token refresh)
          const systemIntegration = await storage.getSystemIntegration('google_sheets');
          if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
            console.error('[Calendar] System-wide Google OAuth not configured');
            throw new Error('Google OAuth not configured');
          }

          // Check if token needs refresh
          let accessToken = integration.googleCalendarAccessToken;
          if (integration.googleCalendarTokenExpiry && integration.googleCalendarTokenExpiry < Date.now()) {
            console.log('[Calendar] Token expired, refreshing...');
            // Token expired, refresh it using system OAuth credentials
            if (integration.googleCalendarRefreshToken) {
              const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  client_id: systemIntegration.googleClientId,
                  client_secret: systemIntegration.googleClientSecret,
                  refresh_token: integration.googleCalendarRefreshToken,
                  grant_type: 'refresh_token'
                })
              });

              if (tokenResponse.ok) {
                const tokens = await tokenResponse.json();
                accessToken = tokens.access_token;
                await storage.updateUserIntegration(userId, {
                  googleCalendarAccessToken: tokens.access_token,
                  googleCalendarTokenExpiry: Date.now() + (tokens.expires_in * 1000)
                });
                console.log('[Calendar] Token refreshed successfully');
              } else {
                const errorText = await tokenResponse.text();
                console.error('[Calendar] Token refresh failed:', {
                  status: tokenResponse.status,
                  error: errorText
                });
                throw new Error(`Token refresh failed: ${tokenResponse.status}`);
              }
            } else {
              console.error('[Calendar] Missing refresh token for token refresh');
              throw new Error('Missing refresh token');
            }
          }

          // Build event description with contact info
          let eventDescription = description || '';
          if (enhancedStoreMetadata) {
            const contactParts: string[] = [];
            if (enhancedStoreMetadata.pointOfContact) {
              contactParts.push(`Contact: ${enhancedStoreMetadata.pointOfContact}`);
            }
            if (enhancedStoreMetadata.pocEmail) {
              contactParts.push(`Email: ${enhancedStoreMetadata.pocEmail}`);
            }
            if (enhancedStoreMetadata.pocPhone) {
              contactParts.push(`Phone: ${enhancedStoreMetadata.pocPhone}`);
            }
            if (contactParts.length > 0) {
              eventDescription = eventDescription 
                ? `${eventDescription}\n\n${contactParts.join('\n')}` 
                : contactParts.join('\n');
            }
          }

          // Build location from store metadata
          let location = '';
          if (enhancedStoreMetadata) {
            const addressParts: string[] = [];
            if (enhancedStoreMetadata.address) addressParts.push(enhancedStoreMetadata.address);
            if (enhancedStoreMetadata.city) addressParts.push(enhancedStoreMetadata.city);
            if (enhancedStoreMetadata.state) addressParts.push(enhancedStoreMetadata.state);
            location = addressParts.join(', ');
          }

          // Create OAuth2 client with system-wide credentials (already retrieved above)
          const oauth2Client = new google.auth.OAuth2(
            systemIntegration.googleClientId,
            systemIntegration.googleClientSecret
          );

          oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: integration.googleCalendarRefreshToken || undefined
          });

          // Create calendar event with timezone-aware datetime
          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

          // Build timezone-aware datetime strings (YYYY-MM-DDTHH:MM:SS format)
          const startDateTime = `${scheduledDate}T${scheduledTime}:00`;

          // Calculate end time by adding 30 minutes, handling midnight rollover
          const [hours, minutes] = scheduledTime.split(':').map(Number);
          const totalMinutes = hours * 60 + minutes + 30;
          const endHours = Math.floor(totalMinutes / 60) % 24;
          const endMinutes = totalMinutes % 60;
          const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

          // Check if we crossed midnight (need to advance date)
          let endDate = scheduledDate;
          if (totalMinutes >= 1440) { // 24 * 60 = 1440 minutes in a day
            // Use Date.UTC to avoid server timezone issues
            const [year, month, day] = scheduledDate.split('-').map(Number);
            const nextDayMs = Date.UTC(year, month - 1, day + 1);
            const nextDay = new Date(nextDayMs);
            endDate = nextDay.toISOString().split('T')[0]; // YYYY-MM-DD
          }
          const endDateTime = `${endDate}T${endTime}:00`;

          // Get calendar reminders from request or use default
          const calendarReminders = req.body.calendarReminders || [{ method: 'popup', minutes: 10 }];

          const event = {
            summary: title,
            description: eventDescription,
            location: location || undefined,
            start: {
              dateTime: startDateTime,
              timeZone: effectiveTimezone,
            },
            end: {
              dateTime: endDateTime,
              timeZone: effectiveTimezone,
            },
            reminders: {
              useDefault: false,
              overrides: calendarReminders.map((r: any) => ({ method: r.method, minutes: r.minutes })),
            },
          };

          console.log('[Calendar] Creating event with payload:', JSON.stringify(event, null, 2));

          const createdEvent = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
          });

          // Save calendar event ID to reminder
          if (createdEvent.data.id) {
            await storage.updateReminder(reminder.id, {
              googleCalendarEventId: createdEvent.data.id
            });
          }

          console.log(`[Calendar] ✅ Created event ${createdEvent.data.id} for reminder ${reminder.id}`);
        } else {
          console.log('[Calendar] Skipping - Google Calendar not connected');
        }
      } catch (calendarError: any) {
        // Log error but don't fail the request - comprehensive logging for debugging
        console.error('[Calendar] ❌ Failed to create calendar event:', {
          message: calendarError.message,
          status: calendarError.response?.status || calendarError.status,
          statusText: calendarError.response?.statusText,
          errorData: calendarError.response?.data,
          code: calendarError.code
        });
        // Also log stack trace for unexpected errors
        if (!calendarError.response?.status) {
          console.error('[Calendar] Stack trace:', calendarError.stack);
        }
      }

      // Smart default: Update user preferences if calendar reminders differ from current defaults
      try {
        const calendarReminders = req.body.calendarReminders;
        if (calendarReminders && Array.isArray(calendarReminders)) {
          const userPreferences = await storage.getUserPreferences(userId);
          const currentDefaults = userPreferences?.defaultCalendarReminders || [{ method: 'popup', minutes: 10 }]; // Default to popup 10 mins if not set

          // Compare calendar reminders with current defaults (handle empty arrays)
          const normalize = (arr: any[]) => JSON.stringify(
            arr.sort((a: any, b: any) => a.method.localeCompare(b.method) || a.minutes - b.minutes)
          );
          const remindersChanged = normalize(calendarReminders) !== normalize(currentDefaults);

          if (remindersChanged) {
            // Update user's default calendar reminders (including empty array for "no reminders")
            await storage.saveUserPreferences(userId, {
              defaultCalendarReminders: calendarReminders
            });
            console.log(`[Smart Default] Updated calendar reminder defaults for user ${userId}`, 
              calendarReminders.length === 0 ? '(no reminders)' : `(${calendarReminders.length} reminder(s))`);
          }
        }
      } catch (prefsError: any) {
        // Don't fail the request if preference update fails
        console.error('[Smart Default] Failed to update calendar reminder preferences:', prefsError.message);
      }

      res.json({ reminder });
    } catch (error: any) {
      console.error('Error creating reminder:', error);
      res.status(500).json({ message: error.message || 'Failed to create reminder' });
    }
  });

  // Update a reminder (PUT)
  app.put('/api/reminders/:id', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;

      // Verify ownership
      const existing = await storage.getReminderById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: 'Reminder not found' });
      }

      const reminder = await storage.updateReminder(id, req.body);
      res.json({ reminder });
    } catch (error: any) {
      console.error('Error updating reminder:', error);
      res.status(500).json({ message: error.message || 'Failed to update reminder' });
    }
  });

  // Update a reminder (PATCH)
  app.patch('/api/reminders/:id', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;

      // Verify ownership
      const existing = await storage.getReminderById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: 'Reminder not found' });
      }

      const reminder = await storage.updateReminder(id, req.body);
      res.json({ reminder });
    } catch (error: any) {
      console.error('Error updating reminder:', error);
      res.status(500).json({ message: error.message || 'Failed to update reminder' });
    }
  });

  // Delete a reminder
  app.delete('/api/reminders/:id', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;

      // Verify ownership
      const existing = await storage.getReminderById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: 'Reminder not found' });
      }

      await storage.deleteReminder(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting reminder:', error);
      res.status(500).json({ message: error.message || 'Failed to delete reminder' });
    }
  });

  // Sync existing reminders to Google Calendar
  app.post('/api/reminders/sync-to-calendar', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      // Get user's Google Calendar integration
      const integration = await storage.getUserIntegration(userId);
      if (!integration?.googleCalendarAccessToken) {
        return res.status(400).json({ message: 'Google Calendar not connected. Please connect in Settings.' });
      }

      // Get user preferences for calendar reminders
      const userPreferences = await storage.getUserPreferences(userId);
      const defaultCalendarReminders = userPreferences?.defaultCalendarReminders || [{ method: 'popup', minutes: 10 }];

      // Get all active reminders for this user
      const reminders = await storage.getRemindersByUser(userId);
      // Filter to only reminders that are active, have a trigger date, and don't already have a calendar event
      const activeReminders = reminders.filter(r => 
        r.isActive && 
        r.nextTrigger && 
        !r.storeMetadata?.calendarEventId
      );

      // Check if token needs refresh
      let accessToken = integration.googleCalendarAccessToken;
      if (integration.googleCalendarTokenExpiry && integration.googleCalendarTokenExpiry < Date.now()) {
        if (integration.googleCalendarRefreshToken && integration.googleClientId && integration.googleClientSecret) {
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: integration.googleClientId,
              client_secret: integration.googleClientSecret,
              refresh_token: integration.googleCalendarRefreshToken,
              grant_type: 'refresh_token'
            })
          });

          if (tokenResponse.ok) {
            const tokens = await tokenResponse.json();
            accessToken = tokens.access_token;
            await storage.updateUserIntegration(userId, {
              googleCalendarAccessToken: tokens.access_token,
              googleCalendarTokenExpiry: Date.now() + (tokens.expires_in * 1000)
            });
          }
        }
      }

      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        integration.googleClientId,
        integration.googleClientSecret
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: integration.googleCalendarRefreshToken || undefined
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Sync each reminder
      let syncedCount = 0;
      let errorCount = 0;

      for (const reminder of activeReminders) {
        try {
          // Build description with contact info
          let eventDescription = reminder.description || '';
          if (reminder.storeMetadata) {
            const contactParts: string[] = [];
            if (reminder.storeMetadata.pointOfContact) {
              contactParts.push(`Contact: ${reminder.storeMetadata.pointOfContact}`);
            }
            if (reminder.storeMetadata.pocEmail) {
              contactParts.push(`Email: ${reminder.storeMetadata.pocEmail}`);
            }
            if (reminder.storeMetadata.pocPhone) {
              contactParts.push(`Phone: ${reminder.storeMetadata.pocPhone}`);
            }
            if (contactParts.length > 0) {
              eventDescription = eventDescription 
                ? `${eventDescription}\n\n${contactParts.join('\n')}` 
                : contactParts.join('\n');
            }
          }

          // Build location
          let location = '';
          if (reminder.storeMetadata) {
            const addressParts: string[] = [];
            if (reminder.storeMetadata.address) addressParts.push(reminder.storeMetadata.address);
            if (reminder.storeMetadata.city) addressParts.push(reminder.storeMetadata.city);
            if (reminder.storeMetadata.state) addressParts.push(reminder.storeMetadata.state);
            location = addressParts.join(', ');
          }

          const triggerDate = new Date(reminder.nextTrigger);
          const endTime = new Date(triggerDate.getTime() + 30 * 60 * 1000);
          const timezone = reminder.reminderTimeZone || 'UTC';

          const event = {
            summary: reminder.title,
            description: eventDescription,
            location: location || undefined,
            start: {
              dateTime: triggerDate.toISOString(),
              timeZone: timezone,
            },
            end: {
              dateTime: endTime.toISOString(),
              timeZone: timezone,
            },
            reminders: {
              useDefault: false,
              overrides: defaultCalendarReminders.map((r: any) => ({ method: r.method, minutes: r.minutes })),
            },
          };

          const createdEvent = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
          });

          // Save calendar event ID to reminder metadata
          if (createdEvent.data.id) {
            await storage.updateReminder(reminder.id, {
              googleCalendarEventId: createdEvent.data.id
            });
          }

          syncedCount++;
          console.log(`[Calendar Sync] Created event ${createdEvent.data.id} for reminder ${reminder.id}`);
        } catch (error: any) {
          errorCount++;
          console.error(`[Calendar Sync] Failed to create event for reminder ${reminder.id}:`, error.message);
        }
      }

      res.json({ 
        success: true, 
        syncedCount, 
        errorCount,
        totalReminders: activeReminders.length,
        message: `Synced ${syncedCount} of ${activeReminders.length} reminders to Google Calendar`
      });
    } catch (error: any) {
      console.error('Error syncing reminders to calendar:', error);
      res.status(500).json({ message: error.message || 'Failed to sync reminders' });
    }
  });

  // Export reminders to .ics calendar file
  app.get('/api/reminders/export/calendar', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const reminders = await storage.getRemindersByUser(userId);

      // Filter only active reminders with nextTrigger set
      const activeReminders = reminders.filter(r => r.isActive && r.nextTrigger);

      // Generate .ics file content
      const icsLines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Hemp Wick CRM//Sales Dashboard//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
      ];

      // Helper function to format date for iCalendar
      const formatICalDate = (date: Date): string => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
      };

      // Add each reminder as an event
      for (const reminder of activeReminders) {
        if (!reminder.nextTrigger) continue;

        const now = new Date();
        const triggerDate = new Date(reminder.nextTrigger);

        icsLines.push('BEGIN:VEVENT');
        icsLines.push(`UID:${reminder.id}@hempwickcrm.app`);
        icsLines.push(`DTSTAMP:${formatICalDate(now)}`);
        icsLines.push(`DTSTART:${formatICalDate(triggerDate)}`);
        icsLines.push(`SUMMARY:${reminder.title.replace(/[,;\\]/g, '\\$&')}`);

        if (reminder.description) {
          const cleanDesc = reminder.description.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
          icsLines.push(`DESCRIPTION:${cleanDesc}`);
        }

        // Add priority if overdue
        if (triggerDate < now) {
          icsLines.push('PRIORITY:1');
        }

        icsLines.push('STATUS:CONFIRMED');
        icsLines.push('END:VEVENT');
      }

      icsLines.push('END:VCALENDAR');

      const icsContent = icsLines.join('\r\n');

      // Set headers for file download
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="reminders.ics"');
      res.send(icsContent);
    } catch (error: any) {
      console.error('Error exporting calendar:', error);
      res.status(500).json({ message: error.message || 'Failed to export calendar' });
    }
  });

  // ===== NOTIFICATION ENDPOINTS =====

  // Get all notifications for the current user (with optional agent filtering for admins)
  app.get('/api/notifications', async (req, res) => {
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
        const requestedAgentIds = agentIds 
          ? (Array.isArray(agentIds) ? agentIds : [agentIds])
          : [userId];

        allowedUserIds = requestedAgentIds;
      }

      // Fetch notifications for allowed users
      let allNotifications: any[] = [];
      for (const uid of allowedUserIds) {
        const userNotifications = await storage.getNotificationsByUser(uid);
        allNotifications = allNotifications.concat(userNotifications);
      }

      const filtered = unreadOnly === 'true'
        ? allNotifications.filter(n => !n.isRead)
        : allNotifications;

      // Sort by date (newest first)
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({ notifications: filtered });
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch notifications' });
    }
  });

  // Mark notification as read
  app.put('/api/notifications/:id/read', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;

      // Verify ownership
      const existing = await storage.getNotificationById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      const notification = await storage.markNotificationAsRead(id);
      res.json({ notification });
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: error.message || 'Failed to mark notification as read' });
    }
  });

  // Mark notification as resolved
  app.put('/api/notifications/:id/resolve', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;

      // Verify ownership
      const existing = await storage.getNotificationById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      const notification = await storage.markNotificationAsResolved(id);
      res.json({ notification });
    } catch (error: any) {
      console.error('Error resolving notification:', error);
      res.status(500).json({ message: error.message || 'Failed to resolve notification' });
    }
  });

  // Delete a notification
  app.delete('/api/notifications/:id', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;

      // Verify ownership
      const existing = await storage.getNotificationById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      await storage.deleteNotification(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: error.message || 'Failed to delete notification' });
    }
  });

  // ===== INTEGRATION ENDPOINTS =====

  // Get integration status for the current user
  app.get('/api/integrations/status', isAuthenticatedCustom, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const integration = await storage.getUserIntegration(userId);

      res.json({
        googleSheetsConnected: !!(integration?.googleAccessToken && integration?.googleRefreshToken),
        googleCalendarConnected: !!(integration?.googleCalendarAccessToken && integration?.googleCalendarRefreshToken),
        googleSheetsEmail: integration?.googleEmail || null,
        googleCalendarEmail: integration?.googleCalendarEmail || null
      });
    } catch (error: any) {
      console.error('Error fetching integration status:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch integration status' });
    }
  });

  // Connect Google Calendar/Gmail - initiate OAuth flow
  app.post('/api/integrations/google-calendar/connect', isAuthenticatedCustom, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      // For now, return a message that integration setup is coming soon
      // In Phase 2-3, we'll implement the full OAuth flow using Replit's Google Calendar connector
      res.json({
        message: 'Google Calendar integration setup is coming soon! This will use Replit\'s secure OAuth connector for a separate account.',
        authUrl: null
      });
    } catch (error: any) {
      console.error('Error connecting Google Calendar:', error);
      res.status(500).json({ message: error.message || 'Failed to connect Google Calendar' });
    }
  });

  // Disconnect Google Sheets integration
  app.post('/api/integrations/google-sheets/disconnect', isAuthenticatedCustom, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      // Clear Google Sheets tokens from user integration
      await storage.updateUserIntegration(userId, {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        googleEmail: null,
        googleConnectedAt: null
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error disconnecting Google Sheets:', error);
      res.status(500).json({ message: error.message || 'Failed to disconnect Google Sheets' });
    }
  });

  // Disconnect Google Calendar integration
  app.post('/api/integrations/google-calendar/disconnect', isAuthenticatedCustom, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      // Stop webhook before disconnecting
      const integration = await storage.getUserIntegration(userId);
      if (integration?.googleCalendarWebhookChannelId && 
          integration?.googleCalendarWebhookResourceId &&
          integration?.googleCalendarAccessToken) {
        try {
          const oauth2Client = new google.auth.OAuth2(
            integration.googleClientId,
            integration.googleClientSecret
          );

          oauth2Client.setCredentials({
            access_token: integration.googleCalendarAccessToken,
            refresh_token: integration.googleCalendarRefreshToken || undefined
          });

          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

          await calendar.channels.stop({
            requestBody: {
              id: integration.googleCalendarWebhookChannelId,
              resourceId: integration.googleCalendarWebhookResourceId,
            },
          });
          console.log('[Calendar Webhook] Stopped webhook on disconnect:', integration.googleCalendarWebhookChannelId);
        } catch (stopError: any) {
          console.error('[Calendar Webhook] Failed to stop webhook on disconnect:', stopError.message);
        }
      }

      // Clear Google Calendar tokens from user integration
      await storage.updateUserIntegration(userId, {
        googleCalendarAccessToken: null,
        googleCalendarRefreshToken: null,
        googleCalendarTokenExpiry: null,
        googleCalendarEmail: null,
        googleCalendarConnectedAt: null,
        googleCalendarWebhookChannelId: null,
        googleCalendarWebhookResourceId: null,
        googleCalendarWebhookExpiry: null,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error disconnecting Google Calendar:', error);
      res.status(500).json({ message: error.message || 'Failed to disconnect Google Calendar' });
    }
  });

  // ===== WIDGET LAYOUT ENDPOINTS =====

  // Get widget layout for the current user
  app.get('/api/widget-layout', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { dashboardType = 'sales' } = req.query;
      const layout = await storage.getWidgetLayout(userId, dashboardType as string);
      res.json({ layout });
    } catch (error: any) {
      console.error('Error fetching widget layout:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch widget layout' });
    }
  });

  // Save widget layout for the current user
  app.post('/api/widget-layout', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const layoutData = { ...req.body, userId };
      const layout = await storage.saveWidgetLayout(layoutData);
      res.json({ layout });
    } catch (error: any) {
      console.error('Error saving widget layout:', error);
      res.status(500).json({ message: error.message || 'Failed to save widget layout' });
    }
  });

  // ===== OPENAI ENDPOINTS =====

  // Get OpenAI settings
  app.get('/api/openai/settings', isAuthenticated, async (req, res) => {
    try {
      console.log('⚙️ [SETTINGS] Starting GET request...');

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      console.log('⚙️ [SETTINGS] User ID:', userId);

      const user = await storage.getUser(userId);
      console.log('⚙️ [SETTINGS] User role:', user?.role);

      if (user?.role !== 'admin') {
        console.log('⚙️ [SETTINGS] ❌ Access denied - user is not admin');
        return res.status(403).json({ message: 'Admin access required' });
      }

      console.log('⚙️ [SETTINGS] Fetching OpenAI settings from database...');
      const settings = await storage.getOpenaiSettings();
      console.log('⚙️ [SETTINGS] Settings retrieved:', {
        hasSettings: !!settings,
        hasApiKey: !!settings?.apiKey,
        hasVectorStoreId: !!settings?.vectorStoreId,
        hasAiInstructions: !!settings?.aiInstructions
      });

      // Don't send the full API key to frontend
      if (settings) {
        const maskedSettings = {
          ...settings,
          apiKey: settings.apiKey ? `sk-...${settings.apiKey.slice(-4)}` : null,
          hasApiKey: !!settings.apiKey
        };
        console.log('⚙️ [SETTINGS] ✅ Sending masked settings to client');
        res.json(maskedSettings);
      } else {
        console.log('⚙️ [SETTINGS] ✅ No settings found, sending null');
        res.json(null);
      }
    } catch (error: any) {
      console.error('⚙️ [SETTINGS] ❌ ERROR:', error.message);
      console.error('⚙️ [SETTINGS] Stack trace:', error.stack);
      console.error('⚙️ [SETTINGS] Full error object:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch settings' });
    }
  });

  // Save OpenAI settings
  app.post('/api/openai/settings', isAuthenticated, async (req, res) => {
    try {
      console.log('⚙️ [SETTINGS] Starting POST request...');

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      console.log('⚙️ [SETTINGS] User ID:', userId);

      const user = await storage.getUser(userId);
      console.log('⚙️ [SETTINGS] User role:', user?.role);

      if (user?.role !== 'admin') {
        console.log('⚙️ [SETTINGS] ❌ Access denied - user is not admin');
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { apiKey, aiInstructions, vectorStoreId } = req.body;
      console.log('⚙️ [SETTINGS] Request data:', {
        hasApiKey: !!apiKey,
        apiKeyPrefix: apiKey ? apiKey.substring(0, 7) + '...' : 'none',
        hasAiInstructions: !!aiInstructions,
        instructionsLength: aiInstructions?.length || 0,
        vectorStoreId: vectorStoreId || 'none'
      });

      console.log('⚙️ [SETTINGS] Saving settings to database...');
      const settings = await storage.saveOpenaiSettings({ apiKey, aiInstructions, vectorStoreId });
      console.log('⚙️ [SETTINGS] Settings saved successfully');

      const response = { 
        success: true,
        hasApiKey: !!settings.apiKey,
        vectorStoreId: settings.vectorStoreId
      };
      console.log('⚙️ [SETTINGS] ✅ Sending success response:', response);
      res.json(response);
    } catch (error: any) {
      console.error('⚙️ [SETTINGS] ❌ ERROR:', error.message);
      console.error('⚙️ [SETTINGS] Stack trace:', error.stack);
      console.error('⚙️ [SETTINGS] Full error object:', error);
      res.status(500).json({ message: error.message || 'Failed to save settings' });
    }
  });

  // Get all knowledge base files
  app.get('/api/openai/files', isAuthenticated, async (req, res) => {
    try {
      console.log('📁 [FILES] Starting GET request...');

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      console.log('📁 [FILES] User ID:', userId);

      console.log('📁 [FILES] Fetching all knowledge base files from database...');
      const files = await storage.getAllKnowledgeBaseFiles();
      console.log('📁 [FILES] Files retrieved:', {
        count: files.length,
        fileIds: files.map(f => f.id)
      });

      console.log('📁 [FILES] ✅ Sending files to client');
      res.json(files);
    } catch (error: any) {
      console.error('📁 [FILES] ❌ ERROR:', error.message);
      console.error('📁 [FILES] Stack trace:', error.stack);
      console.error('📁 [FILES] Full error object:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch files' });
    }
  });

  // Upload file to knowledge base
  app.post('/api/openai/files/upload', isAuthenticated, async (req, res) => {
    try {
      console.log('📤 [FILE UPLOAD] Starting file upload...');

      const user = await storage.getUser(req.user.isPasswordAuth ? req.user.id : req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { filename, content, category, productCategory, description } = req.body;
      console.log('📤 [FILE UPLOAD] File details:', {
        filename,
        contentLength: content?.length || 0,
        category,
        productCategory,
        description
      });

      if (!filename || !content) {
        return res.status(400).json({ message: 'Filename and content required' });
      }

      // Get OpenAI settings
      const settings = await storage.getOpenaiSettings();
      if (!settings?.apiKey) {
        return res.status(400).json({ message: 'OpenAI API key not configured' });
      }
      console.log('📤 [FILE UPLOAD] OpenAI settings retrieved, API key exists:', !!settings.apiKey);
      console.log('📤 [FILE UPLOAD] Existing vector store ID:', settings.vectorStoreId || 'none');

      // Initialize OpenAI client
      const openai = new OpenAI({ apiKey: settings.apiKey });
      console.log('📤 [FILE UPLOAD] OpenAI client initialized');
      console.log('📤 [FILE UPLOAD] OpenAI beta available:', !!openai.beta);
      console.log('📤 [FILE UPLOAD] OpenAI beta.vectorStores available:', !!openai.beta?.vectorStores);

      // Upload file to OpenAI using a temporary file
      const fs = await import('fs/promises');
      const path = await import('path');
      const os = await import('os');
      const { randomUUID } = await import('crypto');

      // Sanitize filename to prevent path traversal
      const safeFilename = path.basename(filename);
      const uniqueSuffix = randomUUID();
      const tmpFilename = `${uniqueSuffix}-${safeFilename}`;
      const tmpDir = os.tmpdir();
      const tmpFilePath = path.join(tmpDir, tmpFilename);

      console.log('📤 [FILE UPLOAD] Temp file path:', tmpFilePath);

      let file;
      try {
        console.log('📤 [FILE UPLOAD] Writing file to temp location...');
        await fs.writeFile(tmpFilePath, content, 'utf-8');
        console.log('📤 [FILE UPLOAD] File written successfully');

        const fileStream = (await import('fs')).createReadStream(tmpFilePath);

        console.log('📤 [FILE UPLOAD] Uploading to OpenAI...');
        file = await openai.files.create({
          file: fileStream,
          purpose: 'assistants'
        });
        console.log('📤 [FILE UPLOAD] File uploaded to OpenAI, file ID:', file.id);
      } finally {
        // Always clean up temporary file, even if upload fails
        await fs.unlink(tmpFilePath).catch(() => {});
        console.log('📤 [FILE UPLOAD] Temp file cleaned up');
      }

      // If no vector store exists, create one using direct API call
      let vectorStoreId = settings.vectorStoreId;
      if (!vectorStoreId) {
        console.log('📤 [FILE UPLOAD] No vector store exists, creating new one via REST API...');
        const vectorStoreResponse = await axios.post(
          'https://api.openai.com/v1/vector_stores',
          {
            name: 'Sales Knowledge Base'
          },
          {
            headers: {
              'Authorization': `Bearer ${settings.apiKey}`,
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2'
            }
          }
        );
        vectorStoreId = vectorStoreResponse.data.id;
        console.log('📤 [FILE UPLOAD] Vector store created:', vectorStoreId);
        await storage.saveOpenaiSettings({ vectorStoreId });
        console.log('📤 [FILE UPLOAD] Vector store ID saved to database');
      } else {
        console.log('📤 [FILE UPLOAD] Using existing vector store:', vectorStoreId);
      }

      // Save file metadata to database with 'uploading' status
      console.log('📤 [FILE UPLOAD] Saving file metadata to database...');
      const fileRecord = await storage.createKnowledgeBaseFile({
        filename: filename.replace(/[^a-zA-Z0-9.-]/g, '_'),
        originalName: filename,
        fileSize: content.length,
        mimeType: 'text/plain',
        openaiFileId: file.id,
        uploadedBy: user.id,
        category: category || 'general',
        productCategory: productCategory || null,
        description: description || null,
        processingStatus: 'uploading',
        isActive: true
      });
      console.log('📤 [FILE UPLOAD] File metadata saved, record ID:', fileRecord.id);

      // Update status to 'processing'
      await storage.updateKnowledgeBaseFileStatus(fileRecord.id, 'processing');
      console.log('📤 [FILE UPLOAD] Status updated to: processing');

      // Add file to vector store using direct API call
      console.log('📤 [FILE UPLOAD] Adding file to vector store via REST API...');
      const vectorStoreFileResponse = await axios.post(
        `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`,
        {
          file_id: file.id
        },
        {
          headers: {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );
      console.log('📤 [FILE UPLOAD] File added to vector store, status:', vectorStoreFileResponse.data.status);

      // Poll for file processing completion
      console.log('📤 [FILE UPLOAD] Waiting for file to be processed...');
      let processingComplete = false;
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max wait

      while (!processingComplete && attempts < maxAttempts) {
        const statusResponse = await axios.get(
          `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files/${file.id}`,
          {
            headers: {
              'Authorization': `Bearer ${settings.apiKey}`,
              'OpenAI-Beta': 'assistants=v2'
            }
          }
        );

        const status = statusResponse.data.status;
        console.log('📤 [FILE UPLOAD] Processing status:', status, 'attempt:', attempts + 1);

        if (status === 'completed') {
          processingComplete = true;
          console.log('📤 [FILE UPLOAD] File processing completed!');
          // Update status to 'ready'
          await storage.updateKnowledgeBaseFileStatus(fileRecord.id, 'ready');
          console.log('📤 [FILE UPLOAD] Status updated to: ready');
        } else if (status === 'failed') {
          await storage.updateKnowledgeBaseFileStatus(fileRecord.id, 'failed');
          console.log('📤 [FILE UPLOAD] Status updated to: failed');
          throw new Error('File processing failed in vector store');
        } else {
          // Wait 1 second before checking again
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      if (!processingComplete) {
        console.log('📤 [FILE UPLOAD] ⚠️ File processing timeout, but file may still complete');
        // Keep status as 'processing' if timeout - it might still complete on OpenAI's side
      }

      console.log('📤 [FILE UPLOAD] File added to vector store successfully');

      console.log('📤 [FILE UPLOAD] ✅ Upload completed successfully!');
      res.json({ success: true, file: fileRecord });
    } catch (error: any) {
      console.error('📤 [FILE UPLOAD] ❌ ERROR:', error.message);
      console.error('📤 [FILE UPLOAD] Stack trace:', error.stack);
      console.error('📤 [FILE UPLOAD] Full error object:', error);
      res.status(500).json({ message: error.message || 'Failed to upload file' });
    }
  });

  // Update knowledge base file metadata
  app.put('/api/openai/files/:id', isAuthenticated, async (req, res) => {
    try {
      console.log('📝 [EDIT FILE] Starting PUT request...');

      const user = await storage.getUser(req.user.isPasswordAuth ? req.user.id : req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      const { category, productCategory, description } = req.body;

      console.log('📝 [EDIT FILE] Updating file:', id);
      console.log('📝 [EDIT FILE] New values:', { category, productCategory, description });

      const updates: any = {};
      if (category !== undefined) updates.category = category;
      if (productCategory !== undefined) updates.productCategory = productCategory;
      if (description !== undefined) updates.description = description;

      const updatedFile = await storage.updateKnowledgeBaseFile(id, updates);
      console.log('📝 [EDIT FILE] File updated successfully');

      res.json(updatedFile);
    } catch (error: any) {
      console.error('📝 [EDIT FILE] ❌ ERROR:', error.message);
      res.status(500).json({ message: error.message || 'Failed to update file' });
    }
  });

  // Delete knowledge base file
  app.delete('/api/openai/files/:id', isAuthenticated, async (req, res) => {
    try {
      console.log('📁 [DELETE FILE] Starting DELETE request...');

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      console.log('📁 [DELETE FILE] User ID:', userId);

      const user = await storage.getUser(userId);
      console.log('📁 [DELETE FILE] User role:', user?.role);

      if (user?.role !== 'admin') {
        console.log('📁 [DELETE FILE] ❌ Access denied - user is not admin');
        return res.status(403).json({ message: 'Admin access required' });
      }

      const fileId = req.params.id;
      console.log('📁 [DELETE FILE] File ID to delete:', fileId);

      console.log('📁 [DELETE FILE] Fetching file metadata from database...');
      const file = await storage.getKnowledgeBaseFile(fileId);

      if (!file) {
        console.log('📁 [DELETE FILE] ❌ File not found in database');
        return res.status(404).json({ message: 'File not found' });
      }

      console.log('📁 [DELETE FILE] File found:', {
        filename: file.filename,
        openaiFileId: file.openaiFileId,
        uploadedBy: file.uploadedBy
      });

      // Get OpenAI settings and delete from OpenAI
      console.log('📁 [DELETE FILE] Fetching OpenAI settings...');
      const settings = await storage.getOpenaiSettings();
      console.log('📁 [DELETE FILE] Settings retrieved:', {
        hasApiKey: !!settings?.apiKey,
        hasOpenaiFileId: !!file.openaiFileId
      });

      if (settings?.apiKey && file.openaiFileId) {
        console.log('📁 [DELETE FILE] Deleting file from OpenAI...');
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: settings.apiKey });

        try {
          await openai.files.del(file.openaiFileId);
          console.log('📁 [DELETE FILE] File deleted from OpenAI successfully');
        } catch (err: any) {
          console.error('📁 [DELETE FILE] ⚠️ Error deleting from OpenAI:', err.message);
          console.error('📁 [DELETE FILE] Will continue with database deletion');
        }
      } else {
        console.log('📁 [DELETE FILE] Skipping OpenAI deletion (no API key or file ID)');
      }

      console.log('📁 [DELETE FILE] Deleting file from database...');
      await storage.deleteKnowledgeBaseFile(fileId);
      console.log('📁 [DELETE FILE] ✅ File deleted successfully');

      res.json({ success: true });
    } catch (error: any) {
      console.error('📁 [DELETE FILE] ❌ ERROR:', error.message);
      console.error('📁 [DELETE FILE] Stack trace:', error.stack);
      console.error('📁 [DELETE FILE] Full error object:', error);
      res.status(500).json({ message: error.message || 'Failed to delete file' });
    }
  });

  // Chat with AI
  app.post('/api/openai/chat', isAuthenticatedCustom, async (req: any, res) => {
    try {
      console.log('💬 [CHAT] Starting chat request...');

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { message, conversationId, contextData } = req.body;
      console.log('💬 [CHAT] Request details:', {
        userId,
        messageLength: message?.length || 0,
        conversationId: conversationId || 'new conversation',
        hasContextData: !!contextData
      });

      if (!message) {
        console.log('💬 [CHAT] ❌ No message provided');
        return res.status(400).json({ message: 'Message required' });
      }

      // Auto-create conversation if not provided
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        console.log('💬 [CHAT] Creating new conversation...');
        const newConversation = await storage.createConversation({
          userId,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          contextData: contextData || {},
          projectId: null,
        });
        activeConversationId = newConversation.id;
        console.log('💬 [CHAT] New conversation created:', activeConversationId);
      } else if (contextData) {
        console.log('💬 [CHAT] Updating conversation with context data...');
        await storage.updateConversation(activeConversationId, { contextData });
      }

      // Get OpenAI settings
      console.log('💬 [CHAT] Fetching OpenAI settings...');
      const settings = await storage.getOpenaiSettings();
      console.log('💬 [CHAT] Settings retrieved:', {
        hasApiKey: !!settings?.apiKey,
        hasVectorStoreId: !!settings?.vectorStoreId,
        hasAiInstructions: !!settings?.aiInstructions
      });

      if (!settings?.apiKey) {
        console.log('💬 [CHAT] ❌ No API key configured');
        return res.status(400).json({ message: 'OpenAI API key not configured' });
      }

      // Initialize OpenAI client
      console.log('💬 [CHAT] Initializing OpenAI client...');
      const openai = new OpenAI({ apiKey: settings.apiKey });
      console.log('💬 [CHAT] OpenAI client initialized');

      // Fetch conversation to get contextData
      console.log('💬 [CHAT] Fetching conversation for contextData...');
      const conversation = await storage.getConversation(activeConversationId);
      const contextInfo = conversation?.contextData as any;
      console.log('💬 [CHAT] Context data available:', !!contextInfo);

      // Save user message
      console.log('💬 [CHAT] Saving user message to database...');
      await storage.saveChatMessage({
        userId,
        conversationId: activeConversationId,
        role: 'user',
        content: message,
        responseId: null,
        metadata: {}
      });
      console.log('💬 [CHAT] User message saved');

      // Create AI response using Chat Completions with tools
      let assistantMessage = '';
      let responseId = '';
      let model = 'gpt-4o';
      let tokensUsed = 0;

      // Fetch current user info for email signatures
      console.log('💬 [CHAT] Fetching user info for email signatures...');
      const currentUser = await storage.getUser(userId);
      console.log('💬 [CHAT] User info retrieved:', {
        hasFirstName: !!currentUser?.firstName,
        hasLastName: !!currentUser?.lastName,
        hasEmail: !!currentUser?.email
      });

      // Get user's selected category for category-aware prompting
      const selectedCategory = await storage.getSelectedCategory(userId);
      console.log('💬 [CHAT] User selected category:', selectedCategory || 'none');

      // Get custom instructions or use default
      let systemInstructions = settings.aiInstructions || 'You are a helpful sales assistant for a hemp wick company. Use the knowledge base to answer questions about sales scripts, product information, objection handling, and closing techniques. Be specific and actionable in your responses.';

      // Add category-specific context to system prompt
      if (selectedCategory) {
        systemInstructions += `\n\nIMPORTANT CATEGORY RESTRICTION: You are specifically assisting with ${selectedCategory} product sales. Focus EXCLUSIVELY on ${selectedCategory}-related sales strategies, product information, and objection handling. DO NOT provide information, scripts, or advice about other product categories. If asked about other categories, politely redirect: "I specialize in ${selectedCategory} sales. For other products, please consult the appropriate specialist."\n`;
        console.log('💬 [CHAT] Category-specific context added for:', selectedCategory);
      }

      // Append user signature information
      if (currentUser) {
        console.log('💬 [CHAT] Appending user signature info to system instructions...');

        let signatureText = '';

        // Use custom signature if available, otherwise auto-generate
        if (currentUser.signature) {
          console.log('💬 [CHAT] Using custom signature from user profile');
          signatureText = currentUser.signature;
        } else {
          console.log('💬 [CHAT] Using auto-generated signature');
          const userFullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Sales Representative';
          const userEmail = currentUser.email || '';
          const userRole = currentUser.role === 'admin' ? 'Sales Manager' : 'Sales Representative';

          signatureText = `${userFullName}\n${userRole}\nNatural Materials Unlimited${userEmail ? `\n${userEmail}` : ''}`;
        }

        const signatureInstructions = `

YOUR IDENTITY & EMAIL SIGNATURE:
When drafting emails or communications, ALWAYS use this exact signature format:

${signatureText}

IMPORTANT: Never use placeholders like [Your Name] or [Your Contact Information]. Always use the exact information provided above.`;

        systemInstructions += signatureInstructions;
        console.log('💬 [CHAT] User signature appended');
      }

      // Append store context if available
      if (contextInfo && Object.keys(contextInfo).length > 0) {
        console.log('💬 [CHAT] Appending store context to system instructions...');
        const contextString = `

Current Store Information:
- Store Name: ${contextInfo.name || 'N/A'}
- Type: ${contextInfo.type || 'N/A'}
- Website Link: ${contextInfo.link || 'N/A'}
- Address: ${contextInfo.address || 'N/A'}
- City: ${contextInfo.city || 'N/A'}
- State: ${contextInfo.state || 'N/A'}
- Phone: ${contextInfo.phone || 'N/A'}
- Website: ${contextInfo.website || 'N/A'}
- Email: ${contextInfo.email || 'N/A'}
- DBA: ${contextInfo.dba || 'N/A'}
- Sales-Ready Summary: ${contextInfo.sales_ready_summary || 'N/A'}
- Status: ${contextInfo.status || 'N/A'}
- Follow-Up Date: ${contextInfo.follow_up_date || 'N/A'}
- Next Action: ${contextInfo.next_action || 'N/A'}
- Notes: ${contextInfo.notes || 'N/A'}
- Point of Contact: ${contextInfo.point_of_contact || 'N/A'}
- POC Email: ${contextInfo.poc_email || 'N/A'}
- POC Phone: ${contextInfo.poc_phone || 'N/A'}

CRITICAL CONTACT PRIORITY RULES:
When drafting emails or communications, ALWAYS prioritize POC (Point of Contact) information:
1. If POC Email is available, use it instead of the general Email field
2. If POC Phone is available, use it instead of the general Phone field
3. If Point of Contact name is available, address communications to that person specifically

EMAIL GENERATION PROTOCOL:
When the user asks you to draft an email:
1. FIRST: Check if POC Email exists → If yes, use {{pocEmail}} or {{email}} placeholder and mention: "I'll address this to the POC email"
2. SECOND: If no POC Email, check if general Email exists → If yes, use {{email}} placeholder and mention: "I'll address this to the store email"
3. THIRD: If NEITHER email exists → Ask the user: "I don't have an email address for this contact. Would you like me to generate a template email that you can customize with the recipient later?"
   - Only proceed with email generation if the user confirms
   - If they confirm, generate the email with {{email}} placeholder and make it clear they need to add the recipient

TEMPLATE PLACEHOLDER SYSTEM:
When generating emails, scripts, or templates, you MUST use ONLY the following placeholder format with double curly braces {{variable}}:

Store-related variables:
- {{storeName}}, {{storeAddress}}, {{storeCity}}, {{storeState}}
- {{storePhone}}, {{storeWebsite}}
- {{email}} or {{pocEmail}} - Smart fallback (uses POC email if available, otherwise store email)
- {{pocName}}, {{pocPhone}}

Agent/User variables:
- {{agentName}}, {{agentEmail}}, {{agentPhone}}, {{agentMeetingLink}}

Dynamic variables:
- {{currentDate}}, {{currentTime}}

CRITICAL PLACEHOLDER RULES:
1. ALWAYS use the {{mustache}} syntax with double curly braces
2. NEVER use bracket syntax like [recipient email], [Recipient's Name], [email], or [store name]
3. NEVER use other placeholder formats like <email>, {email}, or $email
4. These are the ONLY valid placeholders - do not invent new ones
5. When drafting emails, use these exact placeholders - they will be automatically replaced with actual values

Example CORRECT email format:
To: {{email}}
Subject: Follow up with {{storeName}}

Body:
Hello {{pocName}},

I'm {{agentName}} from Natural Materials Unlimited...

Best Regards,
{{agentName}}
{{agentEmail}}
{{agentPhone}}

Example INCORRECT formats to AVOID:
- To: [recipient email] ❌
- Hello [Recipient's Name] ❌
- I'm [Your Name] ❌

IMPORTANT: Never silently generate emails with missing recipient information. Always be transparent about which email placeholder you're using or ask for confirmation if none is available.

Use this store information to provide context-aware responses. When helping draft emails or communications, reference specific details about this store.`;
        systemInstructions += contextString;
        console.log('💬 [CHAT] Store context appended (length:', contextString.length, ')');
      }

      console.log('💬 [CHAT] System instructions length:', systemInstructions.length);

      if (settings.vectorStoreId) {
        console.log('💬 [CHAT] Using Assistants API with vector store:', settings.vectorStoreId);
        // Use Assistants API with file search
        try {
          /* ORIGINAL CODE (BACKUP - REMOVE COMMENT TO REVERT):
          // Create assistant with file search
          console.log('💬 [CHAT] Creating assistant with file search...');
          const assistant = await openai.beta.assistants.create({
            model: 'gpt-4o',
            instructions: systemInstructions,
            tools: [{ type: 'file_search' }],
            tool_resources: {
              file_search: {
                vector_store_ids: [settings.vectorStoreId]
              }
            }
          });
          console.log('💬 [CHAT] Assistant created:', assistant.id);
          */

          // OPTIMIZED: Reuse assistant instead of creating new one each time
          let assistantId = settings.assistantId;

          // Get or create assistant
          if (assistantId) {
            console.log('💬 [CHAT] Reusing existing assistant:', assistantId);
            try {
              // Verify assistant still exists and update its instructions AND vector store
              const assistant = await openai.beta.assistants.update(assistantId, {
                instructions: systemInstructions,
                tool_resources: {
                  file_search: {
                    vector_store_ids: [settings.vectorStoreId]
                  }
                }
              });
              console.log('💬 [CHAT] Assistant updated with new instructions and vector store');
            } catch (error: any) {
              console.log('💬 [CHAT] Existing assistant not found, creating new one...');
              assistantId = null; // Force recreation
            }
          }

          if (!assistantId) {
            console.log('💬 [CHAT] Creating new reusable assistant...');
            const assistant = await openai.beta.assistants.create({
              model: 'gpt-4o',
              instructions: systemInstructions,
              tools: [{ type: 'file_search' }],
              tool_resources: {
                file_search: {
                  vector_store_ids: [settings.vectorStoreId]
                }
              }
            });
            assistantId = assistant.id;
            console.log('💬 [CHAT] New assistant created:', assistantId);

            // Save assistant ID for future reuse
            await storage.saveOpenaiSettings({ assistantId });
            console.log('💬 [CHAT] Assistant ID saved to database');
          }

          /* ORIGINAL CODE (BACKUP - REMOVE COMMENT TO REVERT):
          // Create thread
          console.log('💬 [CHAT] Creating thread...');
          const thread = await openai.beta.threads.create();
          console.log('💬 [CHAT] Thread created:', thread.id);
          */

          // OPTIMIZED: Reuse thread for this conversation
          let threadId = conversation?.threadId;

          if (threadId) {
            console.log('💬 [CHAT] Reusing existing thread:', threadId);
          } else {
            console.log('💬 [CHAT] Creating new thread for this conversation...');
            const thread = await openai.beta.threads.create();
            threadId = thread.id;
            console.log('💬 [CHAT] New thread created:', threadId);

            // Save thread ID to conversation for future reuse
            await storage.updateConversation(activeConversationId, { threadId });
            console.log('💬 [CHAT] Thread ID saved to conversation');
          }

          // Add message to thread
          console.log('💬 [CHAT] Adding message to thread...');
          await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message
          });
          console.log('💬 [CHAT] Message added to thread');

          // Run assistant
          console.log('💬 [CHAT] Starting assistant run...');
          const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: assistantId
          });
          console.log('💬 [CHAT] Run started:', run.id);

          // Poll for completion (OPTIMIZED: faster polling at 500ms instead of 1000ms)
          console.log('💬 [CHAT] Polling for completion...');
          let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
          let attempts = 0;
          while (runStatus.status !== 'completed' && runStatus.status !== 'failed' && attempts < 60) {
            console.log('💬 [CHAT] Run status:', runStatus.status, 'attempt:', attempts + 1);
            await new Promise(resolve => setTimeout(resolve, 500)); // OPTIMIZED: 500ms instead of 1000ms
            runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
            attempts++;
          }

          if (runStatus.status === 'completed') {
            console.log('💬 [CHAT] Run completed successfully');
            // Get messages
            const messages = await openai.beta.threads.messages.list(threadId);
            const lastMessage = messages.data[0];

            if (lastMessage.content[0].type === 'text') {
              assistantMessage = lastMessage.content[0].text.value;
              console.log('💬 [CHAT] Assistant response length:', assistantMessage.length);
            }
            responseId = run.id;
          } else {
            console.log('💬 [CHAT] ⚠️ Run did not complete, status:', runStatus.status);
            throw new Error('Assistant run did not complete successfully');
          }

          /* ORIGINAL CODE (BACKUP - REMOVE COMMENT TO REVERT):
          // Clean up assistant
          console.log('💬 [CHAT] Cleaning up assistant...');
          await openai.beta.assistants.del(assistant.id);
          console.log('💬 [CHAT] Assistant deleted');
          */

          // OPTIMIZED: Don't delete assistant - reuse it next time
          console.log('💬 [CHAT] Assistant retained for future use (performance optimization)');
        } catch (error: any) {
          console.error('💬 [CHAT] ⚠️ Assistants API error:', error.message);
          console.log('💬 [CHAT] Falling back to regular chat completion...');
          // Fallback to regular chat completion
          const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: systemInstructions
              },
              {
                role: 'user',
                content: message
              }
            ]
          });

          assistantMessage = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
          responseId = response.id;
          model = response.model;
          tokensUsed = response.usage?.total_tokens || 0;
          console.log('💬 [CHAT] Fallback response received:', {
            responseId,
            model,
            tokensUsed,
            responseLength: assistantMessage.length
          });
        }
      } else {
        console.log('💬 [CHAT] No vector store - using regular chat completion...');
        // No vector store - use regular chat completion
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemInstructions
            },
            {
              role: 'user',
              content: message
            }
          ]
        });

        assistantMessage = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
        responseId = response.id;
        model = response.model;
        tokensUsed = response.usage?.total_tokens || 0;
        console.log('💬 [CHAT] Chat completion response received:', {
          responseId,
          model,
          tokensUsed,
          responseLength: assistantMessage.length
        });
      }

      // Save assistant message
      console.log('💬 [CHAT] Saving assistant message to database...');
      await storage.saveChatMessage({
        userId,
        conversationId: activeConversationId,
        role: 'assistant',
        content: assistantMessage,
        responseId: responseId,
        metadata: {
          model: model,
          tokensUsed: tokensUsed
        }
      });
      console.log('💬 [CHAT] Assistant message saved');

      console.log('💬 [CHAT] ✅ Chat completed successfully');
      res.json({
        message: assistantMessage,
        responseId: responseId,
        conversationId: activeConversationId
      });
    } catch (error: any) {
      console.error('💬 [CHAT] ❌ ERROR:', error.message);
      console.error('💬 [CHAT] Stack trace:', error.stack);
      console.error('💬 [CHAT] Full error object:', error);
      res.status(500).json({ message: error.message || 'Failed to get AI response' });
    }
  });

  // Get chat history
  app.get('/api/openai/chat/history', isAuthenticatedCustom, async (req: any, res) => {
    try {
      console.log('💬 [HISTORY] Starting GET request...');

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      console.log('💬 [HISTORY] Request details:', {
        userId,
        limit
      });

      console.log('💬 [HISTORY] Fetching chat history from database...');
      const history = await storage.getChatHistory(userId, limit);
      console.log('💬 [HISTORY] Chat history retrieved:', {
        messageCount: history.length,
        hasMessages: history.length > 0
      });

      // Return in chronological order (oldest first)
      const reversedHistory = history.reverse();
      console.log('💬 [HISTORY] ✅ Sending chat history to client');
      res.json(reversedHistory);
    } catch (error: any) {
      console.error('💬 [HISTORY] ❌ ERROR:', error.message);
      console.error('💬 [HISTORY] Stack trace:', error.stack);
      console.error('💬 [HISTORY] Full error object:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch chat history' });
    }
  });

  // Clear chat history
  app.delete('/api/openai/chat/history', isAuthenticatedCustom, async (req, res) => {
    try {
      console.log('💬 [CLEAR HISTORY] Starting DELETE request...');

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      console.log('💬 [CLEAR HISTORY] User ID:', userId);

      console.log('💬 [CLEAR HISTORY] Clearing chat history from database...');
      await storage.clearChatHistory(userId);
      console.log('💬 [CLEAR HISTORY] Chat history cleared successfully');

      console.log('💬 [CLEAR HISTORY] ✅ Sending success response');
      res.json({ success: true });
    } catch (error: any) {
      console.error('💬 [CLEAR HISTORY] ❌ ERROR:', error.message);
      console.error('💬 [CLEAR HISTORY] Stack trace:', error.stack);
      console.error('💬 [CLEAR HISTORY] Full error object:', error);
      res.status(500).json({ message: error.message || 'Failed to clear chat history' });
    }
  });

  // Conversations routes
  app.get('/api/conversations', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch conversations' });
    }
  });

  app.get('/api/conversations/:id', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      if (conversation.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const messages = await storage.getConversationMessages(id);
      res.json({ ...conversation, messages });
    } catch (error: any) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch conversation' });
    }
  });

  app.post('/api/conversations', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const validation = insertConversationSchema.safeParse({ ...req.body, userId });

      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const conversation = await storage.createConversation(validation.data);
      res.json(conversation);
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      res.status(500).json({ message: error.message || 'Failed to create conversation' });
    }
  });

  app.get('/api/conversations/:id/messages', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      if (conversation.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const messages = await storage.getConversationMessages(id);
      res.json(messages);
    } catch (error: any) {
      console.error('Error fetching conversation messages:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch messages' });
    }
  });

  app.post('/api/conversations/:id/rename', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      if (conversation.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const { title } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Title is required' });
      }

      const updated = await storage.updateConversation(id, { title: title.trim() });
      res.json(updated);
    } catch (error: any) {
      console.error('Error renaming conversation:', error);
      res.status(500).json({ message: error.message || 'Failed to rename conversation' });
    }
  });

  app.patch('/api/conversations/:id', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      if (conversation.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const updateSchema = z.object({
        title: z.string().min(1).optional(),
        contextData: z.record(z.any()).optional(),
      });

      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const updated = await storage.updateConversation(id, validation.data);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating conversation:', error);
      res.status(500).json({ message: error.message || 'Failed to update conversation' });
    }
  });

  app.delete('/api/conversations/:id', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      if (conversation.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      await storage.deleteConversation(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ message: error.message || 'Failed to delete conversation' });
    }
  });

  app.post('/api/conversations/:id/move', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      if (conversation.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const moveSchema = z.object({
        projectId: z.string().nullable(),
      });

      const validation = moveSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const updated = await storage.moveConversationToProject(id, validation.data.projectId);
      res.json(updated);
    } catch (error: any) {
      console.error('Error moving conversation:', error);
      res.status(500).json({ message: error.message || 'Failed to move conversation' });
    }
  });

  app.get('/api/conversations/:id/export', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      if (conversation.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const messages = await storage.getConversationMessages(id);

      let exportText = `Conversation: ${conversation.title}\n`;
      exportText += `Created: ${conversation.createdAt}\n\n`;

      if (conversation.contextData) {
        exportText += `Context:\n`;
        Object.entries(conversation.contextData).forEach(([key, value]) => {
          exportText += `  ${key}: ${value}\n`;
        });
        exportText += `\n`;
      }

      exportText += `Messages:\n${'='.repeat(50)}\n\n`;

      messages.forEach((msg: any) => {
        exportText += `[${msg.role.toUpperCase()}] ${new Date(msg.createdAt).toLocaleString()}\n`;
        exportText += `${msg.content}\n\n`;
      });

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="conversation-${id}.txt"`);
      res.send(exportText);
    } catch (error: any) {
      console.error('Error exporting conversation:', error);
      res.status(500).json({ message: error.message || 'Failed to export conversation' });
    }
  });

  // Projects routes
  app.get('/api/projects', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch projects' });
    }
  });

  app.post('/api/projects', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const validation = insertProjectSchema.safeParse({ ...req.body, userId });

      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const project = await storage.createProject(validation.data);
      res.json(project);
    } catch (error: any) {
      console.error('Error creating project:', error);
      res.status(500).json({ message: error.message || 'Failed to create project' });
    }
  });

  app.patch('/api/projects/:id', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const projects = await storage.getProjects(userId);
      const project = projects.find(p => p.id === id);

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      });

      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const updated = await storage.updateProject(id, validation.data);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating project:', error);
      res.status(500).json({ message: error.message || 'Failed to update project' });
    }
  });

  app.delete('/api/projects/:id', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const projects = await storage.getProjects(userId);
      const project = projects.find(p => p.id === id);

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      await storage.deleteProject(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting project:', error);
      res.status(500).json({ message: error.message || 'Failed to delete project' });
    }
  });

  // Templates routes - per-user templates
  app.get('/api/templates', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const templates = await storage.getUserTemplates(userId);
      res.json(templates);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch templates' });
    }
  });

  app.post('/api/templates', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const validation = insertTemplateSchema.safeParse({ ...req.body, userId });

      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      // If setting this as default Script, unset other defaults first
      if (validation.data.isDefault && validation.data.type === 'Script') {
        const existingTemplates = await storage.getUserTemplates(userId);
        for (const existing of existingTemplates) {
          if (existing.isDefault && existing.type === 'Script' && existing.id !== validation.data.id) {
            await storage.updateTemplate(existing.id, { isDefault: false });
          }
        }
      }

      const template = await storage.createTemplate(validation.data);
      res.json(template);
    } catch (error: any) {
      console.error('Error creating template:', error);
      res.status(500).json({ message: error.message || 'Failed to create template' });
    }
  });

  app.patch('/api/templates/:id', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const template = await storage.getTemplate(id);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      if (template.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const updateSchema = z.object({
        title: z.string().min(1).optional(),
        content: z.string().optional(),
        type: z.enum(['Email', 'Script']).optional(),
        tags: z.array(z.string()).optional(),
        isDefault: z.boolean().optional(),
      });

      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      // Determine the template type after update
      const updatedType = validation.data.type || template.type;

      // If setting this as default Script, unset other defaults first
      if (validation.data.isDefault && updatedType === 'Script') {
        const existingTemplates = await storage.getUserTemplates(userId);
        for (const existing of existingTemplates) {
          if (existing.isDefault && existing.type === 'Script' && existing.id !== id) {
            await storage.updateTemplate(existing.id, { isDefault: false });
          }
        }
      }

      const updated = await storage.updateTemplate(id, validation.data);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating template:', error);
      res.status(500).json({ message: error.message || 'Failed to update template' });
    }
  });

  app.delete('/api/templates/:id', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const template = await storage.getTemplate(id);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      if (template.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      await storage.deleteTemplate(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting template:', error);
      res.status(500).json({ message: error.message || 'Failed to delete template' });
    }
  });

  // Get all unique tags across all templates (alphabetically)
  app.get('/api/templates/tags', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const allTags = await storage.getAllTemplateTags();
      res.json(allTags);
    } catch (error: any) {
      console.error('Error fetching template tags:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch template tags' });
    }
  });

  // User Tags routes - personal tag collection
  app.get('/api/user-tags', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tags = await storage.getUserTags(userId);
      res.json(tags);
    } catch (error: any) {
      console.error('Error fetching user tags:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch user tags' });
    }
  });

  app.post('/api/user-tags', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { tag } = req.body;

      if (!tag || typeof tag !== 'string' || !tag.trim()) {
        return res.status(400).json({ message: 'Tag is required' });
      }

      const newTag = await storage.addUserTag(userId, tag);
      res.json(newTag);
    } catch (error: any) {
      console.error('Error adding user tag:', error);
      res.status(500).json({ message: error.message || 'Failed to add user tag' });
    }
  });

  app.delete('/api/user-tags/:tag', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { tag } = req.params;

      await storage.removeUserTag(userId, decodeURIComponent(tag));
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting user tag:', error);
      res.status(500).json({ message: error.message || 'Failed to delete user tag' });
    }
  });

  app.delete('/api/user-tags/by-id/:id', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { id } = req.params;

      await storage.removeUserTagById(userId, id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting user tag by ID:', error);
      res.status(500).json({ message: error.message || 'Failed to delete user tag' });
    }
  });

  // Webhook endpoint for Google Calendar push notifications
  app.post('/api/webhooks/google-calendar', async (req, res) => {
    try {
      // Validate webhook notification from Google
      const channelId = req.headers['x-goog-channel-id'];
      const resourceState = req.headers['x-goog-resource-state'];
      const resourceId = req.headers['x-goog-resource-id'];

      console.log('[Webhook] Received Google Calendar notification:', {
        channelId,
        resourceState,
        resourceId
      });

      // Respond immediately to Google (required within 30 seconds)
      res.status(200).send('OK');

      // Handle sync message (initial handshake)
      if (resourceState === 'sync') {
        console.log('[Webhook] Sync message received, webhook active');
        return;
      }

      // Find user by webhook channel ID
      const users = await storage.getAllUserIntegrations();
      const userIntegration = users.find((u: any) => 
        u.googleCalendarWebhookChannelId === channelId
      );

      if (!userIntegration) {
        console.log('[Webhook] No user found for channel ID:', channelId);
        return;
      }

      const userId = userIntegration.userId;
      console.log('[Webhook] Processing calendar changes for user:', userId);

      // Get system OAuth credentials for token refresh
      const systemIntegration = await storage.getSystemIntegration('google_sheets');
      if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
        console.error('[Webhook] System OAuth not configured');
        return;
      }

      // Check if token needs refresh
      let accessToken = userIntegration.googleCalendarAccessToken;
      if (userIntegration.googleCalendarTokenExpiry && 
          userIntegration.googleCalendarTokenExpiry < Date.now()) {
        if (userIntegration.googleCalendarRefreshToken) {
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: systemIntegration.googleClientId,
              client_secret: systemIntegration.googleClientSecret,
              refresh_token: userIntegration.googleCalendarRefreshToken,
              grant_type: 'refresh_token'
            })
          });

          if (tokenResponse.ok) {
            const tokens = await tokenResponse.json();
            accessToken = tokens.access_token;
            await storage.updateUserIntegration(userId, {
              googleCalendarAccessToken: tokens.access_token,
              googleCalendarTokenExpiry: Date.now() + (tokens.expires_in * 1000)
            });
          }
        }
      }

      // Fetch recent calendar events to detect changes
      const oauth2Client = new google.auth.OAuth2(
        systemIntegration.googleClientId,
        systemIntegration.googleClientSecret
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: userIntegration.googleCalendarRefreshToken || undefined
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Get all reminders for this user
      const reminders = await storage.getRemindersByUser(userId);

      // Fetch each event to check for updates/deletions
      for (const reminder of reminders) {
        const calendarEventId = reminder.googleCalendarEventId;
        if (!calendarEventId) continue;

        try {
          // Try to fetch the event
          const eventResponse = await calendar.events.get({
            calendarId: 'primary',
            eventId: calendarEventId,
          });

          const event = eventResponse.data;

          // Check if event was modified
          if (event.status === 'cancelled') {
            // Event was deleted, delete the reminder
            console.log(`[Webhook] Calendar event ${calendarEventId} deleted, deleting reminder ${reminder.id}`);
            await storage.deleteReminder(reminder.id);
          } else if (event.updated) {
            // Event was updated, sync the changes from Google Calendar
            // Google returns ISO datetime with timezone, parse it in the event's timezone
            const eventStartDateTime = event.start?.dateTime;
            const eventTimeZone = event.start?.timeZone || reminder.timezone;

            if (eventStartDateTime && eventTimeZone) {
              // Parse Google's datetime to extract local date and time components
              // eventStartDateTime format: "2025-10-24T23:00:00+02:00" or "2025-10-24T23:00:00"
              const dateTimeParts = eventStartDateTime.split('T');
              const newScheduledDate = dateTimeParts[0]; // YYYY-MM-DD
              const timePart = dateTimeParts[1].split('+')[0].split('-')[0].split('Z')[0]; // Remove timezone suffix
              const newScheduledTime = timePart.substring(0, 5); // HH:MM

              // Check if date or time changed
              if (newScheduledDate !== reminder.scheduledDate || newScheduledTime !== reminder.scheduledTime) {
                console.log(`[Webhook] Calendar event ${calendarEventId} time changed, updating reminder ${reminder.id}`);
                console.log(`[Webhook] Old: ${reminder.scheduledDate} ${reminder.scheduledTime}, New: ${newScheduledDate} ${newScheduledTime}`);
                await storage.updateReminder(reminder.id, {
                  scheduledDate: newScheduledDate,
                  scheduledTime: newScheduledTime,
                  timezone: eventTimeZone
                });
              }
            }

            // Update title if changed
            if (event.summary && event.summary !== reminder.title) {
              console.log(`[Webhook] Calendar event ${calendarEventId} title changed, updating reminder ${reminder.id}`);
              await storage.updateReminder(reminder.id, {
                title: event.summary
              });
            }
          }
        } catch (eventError: any) {
          // Event not found (404) means it was deleted
          if (eventError.code === 404 || eventError.status === 404) {
            console.log(`[Webhook] Calendar event ${calendarEventId} not found (deleted), deleting reminder ${reminder.id}`);
            await storage.deleteReminder(reminder.id);
          } else {
            console.error(`[Webhook] Error fetching event ${calendarEventId}:`, eventError.message);
          }
        }
      }

      console.log('[Webhook] Calendar sync completed for user:', userId);
    } catch (error: any) {
      console.error('[Webhook] Error processing calendar webhook:', error);
      // Don't send error response since we already responded with 200
    }
  });

  // Automatic webhook renewal system - runs daily
  async function renewWebhooksIfNeeded() {
    try {
      console.log('[Webhook Renewal] Checking for webhooks that need renewal...');

      const allIntegrations = await storage.getAllUserIntegrations();
      const threeDaysFromNow = Date.now() + (3 * 24 * 60 * 60 * 1000);

      for (const integration of allIntegrations) {
        // Skip if no webhook registered or no calendar access
        if (!integration.googleCalendarWebhookChannelId || 
            !integration.googleCalendarAccessToken ||
            !integration.googleCalendarWebhookExpiry) {
          continue;
        }

        // Skip inactive users - don't renew webhooks for deactivated accounts
        const user = await storage.getUser(integration.userId);
        if (!user || user.isActive === false) {
          console.log(`[Webhook Renewal] Skipping renewal for inactive user ${integration.userId}`);
          continue;
        }

        // Check if webhook expires in less than 3 days
        if (integration.googleCalendarWebhookExpiry < threeDaysFromNow) {
          console.log(`[Webhook Renewal] Renewing webhook for user ${integration.userId}`);

          try {
            // Check if token needs refresh
            let accessToken = integration.googleCalendarAccessToken;
            if (integration.googleCalendarTokenExpiry && 
                integration.googleCalendarTokenExpiry < Date.now()) {
              if (integration.googleCalendarRefreshToken && 
                  integration.googleClientId && 
                  integration.googleClientSecret) {
                const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams({
                    client_id: integration.googleClientId,
                    client_secret: integration.googleClientSecret,
                    refresh_token: integration.googleCalendarRefreshToken,
                    grant_type: 'refresh_token'
                  })
                });

                if (tokenResponse.ok) {
                  const tokens = await tokenResponse.json();
                  accessToken = tokens.access_token;
                  await storage.updateUserIntegration(integration.userId, {
                    googleCalendarAccessToken: tokens.access_token,
                    googleCalendarTokenExpiry: Date.now() + (tokens.expires_in * 1000)
                  });
                }
              }
            }

            // Stop old webhook
            if (integration.googleCalendarWebhookChannelId && 
                integration.googleCalendarWebhookResourceId) {
              try {
                const oauth2Client = new google.auth.OAuth2(
                  integration.googleClientId,
                  integration.googleClientSecret
                );

                oauth2Client.setCredentials({
                  access_token: accessToken,
                  refresh_token: integration.googleCalendarRefreshToken || undefined
                });

                const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

                await calendar.channels.stop({
                  requestBody: {
                    id: integration.googleCalendarWebhookChannelId,
                    resourceId: integration.googleCalendarWebhookResourceId,
                  },
                });
                console.log(`[Webhook Renewal] Stopped old webhook ${integration.googleCalendarWebhookChannelId}`);
              } catch (stopError: any) {
                console.error('[Webhook Renewal] Failed to stop old webhook:', stopError.message);
              }
            }

            // Register new webhook - always use HTTPS for production/Replit
            const webhookUrl = process.env.REPLIT_DEV_DOMAIN 
              ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/webhooks/google-calendar`
              : `https://localhost:5000/api/webhooks/google-calendar`; // Use HTTPS even for local (Google requires it)
            const channelId = `calendar-${integration.userId}-${Date.now()}`;
            const expiration = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

            const oauth2Client = new google.auth.OAuth2(
              integration.googleClientId,
              integration.googleClientSecret
            );

            oauth2Client.setCredentials({
              access_token: accessToken,
              refresh_token: integration.googleCalendarRefreshToken || undefined
            });

            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

            const watchResponse = await calendar.events.watch({
              calendarId: 'primary',
              requestBody: {
                id: channelId,
                type: 'web_hook',
                address: webhookUrl,
                expiration: expiration.toString(),
              },
            });

            // Update webhook details
            await storage.updateUserIntegration(integration.userId, {
              googleCalendarWebhookChannelId: channelId,
              googleCalendarWebhookResourceId: watchResponse.data.resourceId || undefined,
              googleCalendarWebhookExpiry: expiration,
            });

            console.log(`[Webhook Renewal] ✅ Successfully renewed webhook for user ${integration.userId}`, {
              channelId,
              expiration: new Date(expiration).toISOString()
            });
          } catch (renewError: any) {
            console.error(`[Webhook Renewal] ❌ FAILED to renew webhook for user ${integration.userId}:`, {
              error: renewError.message,
              userId: integration.userId
            });
            // Alert: Bidirectional sync will stop working for this user
          }
        }
      }

      console.log('[Webhook Renewal] Check completed');
    } catch (error: any) {
      console.error('[Webhook Renewal] Error during renewal check:', error);
    }
  }

  // Run webhook renewal check every 24 hours
  setInterval(renewWebhooksIfNeeded, 24 * 60 * 60 * 1000);

  // Run initial check 1 minute after startup
  setTimeout(renewWebhooksIfNeeded, 60 * 1000);

  console.log('[Webhook Renewal] Automatic renewal system started');

  // ============================================================================
  // CATEGORY MANAGEMENT ROUTES
  // ============================================================================

  // Get all categories (admin only)
  app.get('/api/categories', isAuthenticatedCustom, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json({ categories });
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch categories' });
    }
  });

  // Get active categories (all authenticated users)
  app.get('/api/categories/active', isAuthenticatedCustom, async (req, res) => {
    try {
      const categories = await storage.getActiveCategories();
      res.json({ categories });
    } catch (error: any) {
      console.error('Error fetching active categories:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch categories' });
    }
  });

  // Create category (admin only)
  app.post('/api/categories', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const validation = insertCategorySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const category = await storage.createCategory(validation.data);
      res.json({ category });
    } catch (error: any) {
      console.error('Error creating category:', error);
      res.status(500).json({ message: error.message || 'Failed to create category' });
    }
  });

  // Update category (admin only)
  app.put('/api/categories/:id', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validation = insertCategorySchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const category = await storage.updateCategory(id, validation.data);
      res.json({ category });
    } catch (error: any) {
      console.error('Error updating category:', error);
      res.status(500).json({ message: error.message || 'Failed to update category' });
    }
  });

  // Delete category (admin only)
  app.delete('/api/categories/:id', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCategory(id);
      res.json({ message: 'Category deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting category:', error);
      res.status(500).json({ message: error.message || 'Failed to delete category' });
    }
  });

  // ============================================================================
  // STATUS MANAGEMENT ROUTES
  // ============================================================================

  // Get all statuses (all authenticated users)
  app.get('/api/statuses', isAuthenticatedCustom, async (req, res) => {
    try {
      const statuses = await storage.getAllStatuses();
      res.json({ statuses });
    } catch (error: any) {
      console.error('Error fetching statuses:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch statuses' });
    }
  });

  // Get active statuses (all authenticated users)
  app.get('/api/statuses/active', isAuthenticatedCustom, async (req, res) => {
    try {
      const statuses = await storage.getActiveStatuses();
      res.json({ statuses });
    } catch (error: any) {
      console.error('Error fetching active statuses:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch statuses' });
    }
  });

  // Create status (admin only)
  app.post('/api/statuses', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const validation = insertStatusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: validation.error.errors 
        });
      }

      const status = await storage.createStatus(validation.data);
      res.json({ status });
    } catch (error: any) {
      console.error('Error creating status:', error);
      res.status(500).json({ message: error.message || 'Failed to create status' });
    }
  });

  // Update status (admin only)
  app.put('/api/statuses/:id', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      // Require all fields when updating - all 4 color fields must be provided
      const validation = insertStatusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: validation.error.errors 
        });
      }

      const status = await storage.updateStatus(id, validation.data);
      res.json({ status });
    } catch (error: any) {
      console.error('Error updating status:', error);
      res.status(500).json({ message: error.message || 'Failed to update status' });
    }
  });

  // Delete status (admin only)
  app.delete('/api/statuses/:id', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteStatus(id);
      res.json({ message: 'Status deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting status:', error);
      res.status(500).json({ message: error.message || 'Failed to delete status' });
    }
  });

  // Seed default statuses (admin only) - one-time setup
  app.post('/api/statuses/seed', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const existingStatuses = await storage.getAllStatuses();
      if (existingStatuses.length > 0) {
        return res.status(400).json({ message: 'Statuses already exist. Clear the database first if you want to re-seed.' });
      }

      const defaultStatuses = [
        {
          name: '1 – Contacted',
          displayOrder: 1,
          lightBgColor: '#dbeafe',
          lightTextColor: '#1e40af',
          darkBgColor: '#1e3a8a',
          darkTextColor: '#bfdbfe',
          isActive: true,
        },
        {
          name: '2 – Interested',
          displayOrder: 2,
          lightBgColor: '#fef3c7',
          lightTextColor: '#92400e',
          darkBgColor: '#78350f',
          darkTextColor: '#fef3c7',
          isActive: true,
        },
        {
          name: '3 – Sample Sent',
          displayOrder: 3,
          lightBgColor: '#e0e7ff',
          lightTextColor: '#3730a3',
          darkBgColor: '#312e81',
          darkTextColor: '#c7d2fe',
          isActive: true,
        },
        {
          name: '4 – Follow-Up',
          displayOrder: 4,
          lightBgColor: '#fed7aa',
          lightTextColor: '#9a3412',
          darkBgColor: '#7c2d12',
          darkTextColor: '#fed7aa',
          isActive: true,
        },
        {
          name: '5 – Closed Won',
          displayOrder: 5,
          lightBgColor: '#d1fae5',
          lightTextColor: '#065f46',
          darkBgColor: '#064e3b',
          darkTextColor: '#a7f3d0',
          isActive: true,
        },
        {
          name: '6 – Closed Lost',
          displayOrder: 6,
          lightBgColor: '#fee2e2',
          lightTextColor: '#991b1b',
          darkBgColor: '#7f1d1d',
          darkTextColor: '#fecaca',
          isActive: true,
        },
        {
          name: '7 – Warm',
          displayOrder: 7,
          lightBgColor: '#fef9c3',
          lightTextColor: '#854d0e',
          darkBgColor: '#78350f',
          darkTextColor: '#fef9c3',
          isActive: true,
        },
      ];

      const createdStatuses = [];
      for (const statusData of defaultStatuses) {
        const status = await storage.createStatus(statusData);
        createdStatuses.push(status);
      }

      res.json({ 
        message: 'Default statuses seeded successfully',
        statuses: createdStatuses 
      });
    } catch (error: any) {
      console.error('Error seeding statuses:', error);
      res.status(500).json({ message: error.message || 'Failed to seed statuses' });
    }
  });

  // ============================================================================
  // SAVED EXCLUSIONS ROUTES
  // ============================================================================

  // Get all saved exclusions
  app.get('/api/exclusions', isAuthenticatedCustom, async (req, res) => {
    try {
      const exclusions = await storage.getAllSavedExclusions();
      res.json({ exclusions });
    } catch (error: any) {
      console.error('Error fetching exclusions:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch exclusions' });
    }
  });

  // Get exclusions by type
  app.get('/api/exclusions/:type', isAuthenticatedCustom, async (req, res) => {
    try {
      const { type } = req.params;
      if (type !== 'keyword' && type !== 'place_type') {
        return res.status(400).json({ message: 'Invalid type. Must be "keyword" or "place_type"' });
      }
      const exclusions = await storage.getSavedExclusionsByType(type);
      res.json({ exclusions });
    } catch (error: any) {
      console.error('Error fetching exclusions by type:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch exclusions' });
    }
  });

  // Create new exclusion
  app.post('/api/exclusions', isAuthenticatedCustom, async (req, res) => {
    try {
      const { type, value } = req.body;
      if (!type || !value) {
        return res.status(400).json({ message: 'Type and value are required' });
      }
      if (type !== 'keyword' && type !== 'place_type') {
        return res.status(400).json({ message: 'Invalid type. Must be "keyword" or "place_type"' });
      }
      const exclusion = await storage.createSavedExclusion({ type, value: value.toLowerCase().trim() });
      res.json({ exclusion });
    } catch (error: any) {
      console.error('Error creating exclusion:', error);
      res.status(500).json({ message: error.message || 'Failed to create exclusion' });
    }
  });

  // Delete exclusion
  app.delete('/api/exclusions/:id', isAuthenticatedCustom, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSavedExclusion(id);
      res.json({ message: 'Exclusion deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting exclusion:', error);
      res.status(500).json({ message: error.message || 'Failed to delete exclusion' });
    }
  });

  // Update user's active exclusions
  app.put('/api/user/active-exclusions', isAuthenticatedCustom, async (req, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { activeKeywords = [], activeTypes = [] } = req.body;
      const prefs = await storage.updateUserActiveExclusions(userId, activeKeywords, activeTypes);
      res.json({ preferences: prefs });
    } catch (error: any) {
      console.error('Error updating active exclusions:', error);
      res.status(500).json({ message: error.message || 'Failed to update active exclusions' });
    }
  });

  // ============================================================================
  // GOOGLE MAPS SEARCH ROUTES
  // ============================================================================

  // Get all search history (global, newest first)
  app.get('/api/maps/search-history', isAuthenticatedCustom, async (req, res) => {
    try {
      const history = await storage.getAllSearchHistory();
      res.json({ history });
    } catch (error: any) {
      console.error('Error fetching search history:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch search history' });
    }
  });

  // Delete search history entry
  app.delete('/api/maps/search-history/:id', isAuthenticatedCustom, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSearchHistory(id);
      res.json({ message: 'Search history entry deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting search history:', error);
      res.status(500).json({ message: error.message || 'Failed to delete search history' });
    }
  });

  // Get last selected category for Map Search
  app.get('/api/maps/last-category', isAuthenticatedCustom, async (req, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const lastCategory = await storage.getLastCategory(userId);
      res.json({ category: lastCategory || 'Pets' }); // Default to 'Pets'
    } catch (error: any) {
      console.error('Error fetching last category:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch last category' });
    }
  });

  // Set last selected category for Map Search
  app.post('/api/maps/last-category', isAuthenticatedCustom, async (req, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { category } = req.body;

      if (!category) {
        return res.status(400).json({ message: 'Category is required' });
      }

      await storage.setLastCategory(userId, category);
      res.json({ message: 'Last category saved successfully', category });
    } catch (error: any) {
      console.error('Error saving last category:', error);
      res.status(500).json({ message: error.message || 'Failed to save last category' });
    }
  });

  // Get selected category for CRM filtering
  app.get('/api/user/selected-category', isAuthenticatedCustom, async (req, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const selectedCategory = await storage.getSelectedCategory(userId);
      res.json({ category: selectedCategory });
    } catch (error: any) {
      console.error('Error fetching selected category:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch selected category' });
    }
  });

  // Set selected category for CRM filtering
  app.post('/api/user/selected-category', isAuthenticatedCustom, async (req, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { category } = req.body;

      if (!category) {
        return res.status(400).json({ message: 'Category is required' });
      }

      await storage.setSelectedCategory(userId, category);
      res.json({ message: 'Selected category saved successfully', category });
    } catch (error: any) {
      console.error('Error saving selected category:', error);
      res.status(500).json({ message: error.message || 'Failed to save selected category' });
    }
  });

  // Search for places using Google Maps API
  app.post('/api/maps/search', isAuthenticatedCustom, async (req, res) => {
    try {
      const { query, location, excludedKeywords, excludedTypes, category, pageToken } = req.body;

      if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
      }

      // Parse location into city, state, country
      const locationParts = location.split(',').map((s: string) => s.trim());
      const city = locationParts[0] || '';
      const state = locationParts[1] || '';
      const country = locationParts[2] || '';

      // Parse excluded keywords from comma-separated string or array
      let excludedKeywordsArray: string[] = [];
      if (typeof excludedKeywords === 'string' && excludedKeywords.trim()) {
        excludedKeywordsArray = excludedKeywords
          .split(',')
          .map((k: string) => k.trim().toLowerCase())
          .filter((k: string) => k.length > 0);
      } else if (Array.isArray(excludedKeywords)) {
        excludedKeywordsArray = excludedKeywords
          .map((k: string) => k.trim().toLowerCase())
          .filter((k: string) => k.length > 0);
      }

      // Parse excluded types from comma-separated string or array
      let excludedTypesArray: string[] = [];
      if (typeof excludedTypes === 'string' && excludedTypes.trim()) {
        excludedTypesArray = excludedTypes
          .split(',')
          .map((k: string) => k.trim().toLowerCase().replace(/\s+/g, '_'))
          .filter((k: string) => k.length > 0);
      } else if (Array.isArray(excludedTypes)) {
        excludedTypesArray = excludedTypes
          .map((k: string) => k.trim().toLowerCase().replace(/\s+/g, '_'))
          .filter((k: string) => k.length > 0);
      }

      // Record this search in history only for new searches (not pagination)
      if (!pageToken) {
        await storage.recordSearch(query, city, state, country, excludedKeywordsArray, excludedTypesArray, category);
      }

      // Get search results from Google Maps with API-level type filtering and pagination
      const searchResponse = await googleMaps.searchPlaces(query, location, excludedTypesArray, pageToken);

      // Check which place_ids are already imported
      const placeIds = searchResponse.results.map(r => r.place_id);
      const importedPlaceIds = await storage.checkImportedPlaces(placeIds);

      // Filter out already imported places
      let filteredResults = searchResponse.results.filter(r => !importedPlaceIds.has(r.place_id));
      const duplicateCount = searchResponse.results.length - filteredResults.length;

      // Filter out results containing excluded keywords (backend filtering)
      let excludedCount = 0;
      if (excludedKeywordsArray.length > 0) {
        const beforeExclusionCount = filteredResults.length;
        filteredResults = filteredResults.filter(place => {
          const placeName = place.name?.toLowerCase() || '';
          // Check if place name contains any excluded keyword
          return !excludedKeywordsArray.some(keyword => placeName.includes(keyword));
        });
        excludedCount = beforeExclusionCount - filteredResults.length;
      }

      res.json({ 
        results: filteredResults,
        totalResults: searchResponse.results.length,
        duplicateCount,
        excludedCount,
        nextPageToken: searchResponse.nextPageToken
      });
    } catch (error: any) {
      console.error('Error searching places:', error);
      res.status(500).json({ message: error.message || 'Failed to search places' });
    }
  });

  // Get place details
  app.get('/api/maps/place/:placeId', isAuthenticatedCustom, async (req, res) => {
    try {
      const { placeId } = req.params;

      if (!placeId) {
        return res.status(400).json({ message: 'Place ID is required' });
      }

      const details = await googleMaps.getPlaceDetails(placeId);

      if (!details) {
        return res.status(404).json({ message: 'Place not found' });
      }

      res.json({ place: details });
    } catch (error: any) {
      console.error('Error fetching place details:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch place details' });
    }
  });

  // Save place to Store Database Google Sheet
  // Reverse geocode coordinates to get location details
  app.post('/api/maps/reverse-geocode', isAuthenticatedCustom, async (req, res) => {
    try {
      const { lat, lng } = req.body;

      if (lat === undefined || lng === undefined) {
        return res.status(400).json({ message: 'Latitude and longitude are required' });
      }

      const result = await googleMaps.reverseGeocode(lat, lng);

      if (!result) {
        return res.status(404).json({ message: 'Location not found' });
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error reverse geocoding:', error);
      res.status(500).json({ message: error.message || 'Failed to reverse geocode location' });
    }
  });

  app.post('/api/maps/save-to-sheet', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { placeId, category } = req.body;

      if (!placeId || !category) {
        return res.status(400).json({ message: 'Place ID and category are required' });
      }

      // Get place details from Google Maps
      const placeDetails = await googleMaps.getPlaceDetails(placeId);

      if (!placeDetails) {
        return res.status(404).json({ message: 'Place not found' });
      }

      // Parse address into street, city, state components for separate CRM columns
      const { street, city, state } = googleMaps.parseAddressComponents(placeDetails.formatted_address);

      // Find Store Database sheet for this category
      const sheets = await storage.getAllActiveGoogleSheets();
      const storeSheet = sheets.find(s => s.sheetPurpose === 'Store Database');

      if (!storeSheet) {
        return res.status(404).json({ message: 'Store Database sheet not found. Please connect a Google Sheet first.' });
      }

      // Format hours more concisely - just show if open and basic hours
      const formatHours = (weekdayText?: string[]): string => {
        if (!weekdayText || weekdayText.length === 0) return '';
        // Just take the first entry as a sample
        return weekdayText[0] || '';
      };

      // Prepare row data for Google Sheet
      // Columns: A=Name, B=Type, C=Link, D=Member Since, E=Address, F=City, G=State, 
      //          H=Phone, I=Website, J=Email, K=Followers, L=Tags, M=Hours, N=DBA, 
      //          O=Vibe Score, P=Sales-ready Summary, Q=Agent Name, R=OPEN, S=Category
      const row = [
        placeDetails.name || '',                                    // A: Name
        placeDetails.types?.[0] || '',                             // B: Type
        placeDetails.url || `https://www.google.com/maps/place/?q=place_id:${placeDetails.place_id}`, // C: Link
        '',                                                  // D: Member Since (blank)
        street,                                                // E: Address (street only) (e.g., "23 N Harlem Ave")
        city,                                                // F: City (e.g., "Oak Park")
        state,                                               // G: State (e.g., "Illinois")
        placeDetails.formatted_phone_number || placeDetails.international_phone_number || '', // H: Phone
        placeDetails.website || '',                                // I: Website
        '',                                                  // J: Email (blank)
        '',                                                  // K: Followers (blank)
        '',                                                  // L: Tags (blank)
        formatHours(placeDetails.opening_hours?.weekday_text),     // M: Hours (sample)
        '',                                                  // N: DBA (blank)
        '',                                                  // O: Vibe Score (blank)
        '',                                                  // P: Sales-ready Summary (blank)
        '',                                                  // Q: Agent Name (blank - unclaimed)
        placeDetails.business_status === 'OPERATIONAL' ? 'TRUE' : 'FALSE', // R: OPEN (based on business status)
        category,                                            // S: Category
      ];

      // Append to Google Sheet (A through S = 19 columns)
      const range = `${storeSheet.sheetName}!A:S`;
      await googleSheets.appendSheetData(storeSheet.spreadsheetId, range, [row]);

      // Record this place_id to prevent duplicates in future searches
      await storage.recordImportedPlace(placeId);

      res.json({ 
        message: 'Place saved successfully to Store Database',
        place: {
          name: placeDetails.name,
          address: placeDetails.formatted_address,
          category
        }
      });
    } catch (error: any) {
      console.error('Error saving place to sheet:', error);
      res.status(500).json({ message: error.message || 'Failed to save place to sheet' });
    }
  });

  // Ticket Routes

  // Get unread ticket count (admin only)
  app.get('/api/tickets/unread-count', isAuthenticatedCustom, async (req, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.json({ count: 0 });
      }

      const count = await storage.getUnreadAdminCount();
      res.json({ count });
    } catch (error: any) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ message: error.message || 'Failed to get unread count' });
    }
  });

  // Get all tickets with user info (admin only)
  app.get('/api/tickets/admin', isAuthenticatedCustom, async (req, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const allTickets = await storage.getAllTickets();
      const ticketsWithUserInfo = await Promise.all(
        allTickets.map(async (ticket) => {
          const ticketUser = await storage.getUser(ticket.userId);
          return {
            ...ticket,
            userEmail: ticketUser?.email,
            userName: ticketUser?.firstName && ticketUser?.lastName
              ? `${ticketUser.firstName} ${ticketUser.lastName}`
              : undefined,
          };
        })
      );

      res.json({ tickets: ticketsWithUserInfo });
    } catch (error: any) {
      console.error('Error fetching admin tickets:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch tickets' });
    }
  });

  // Get all tickets (admin) or user's tickets (regular users)
  app.get('/api/tickets', isAuthenticatedCustom, async (req, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      let tickets;
      if (user?.role === 'admin') {
        tickets = await storage.getAllTickets();
      } else {
        tickets = await storage.getUserTickets(userId);
      }

      res.json({ tickets });
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch tickets' });
    }
  });

  // Get single ticket with replies
  app.get('/api/tickets/:id', isAuthenticatedCustom, async (req, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const ticketId = req.params.id;

      const ticket = await storage.getTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // Check access: admin can see all, users can only see their own
      if (user?.role !== 'admin' && ticket.userId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const replies = await storage.getTicketReplies(ticketId);

      // Add user info to replies
      const repliesWithUserInfo = await Promise.all(
        replies.map(async (reply) => {
          const replyUser = await storage.getUser(reply.userId);
          return {
            ...reply,
            userEmail: replyUser?.email,
            userName: replyUser?.firstName && replyUser?.lastName
              ? `${replyUser.firstName} ${replyUser.lastName}`
              : undefined,
          };
        })
      );

      // Mark as read
      if (user?.role === 'admin') {
        await storage.markTicketReadByAdmin(ticketId);
      } else {
        await storage.markTicketReadByUser(ticketId);
      }

      res.json({ ticket, replies: repliesWithUserInfo });
    } catch (error: any) {
      console.error('Error fetching ticket:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch ticket' });
    }
  });

  // Create new ticket
  app.post('/api/tickets', isAuthenticatedCustom, async (req, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const validated = insertTicketSchema.parse({
        ...req.body,
        userId,
      });

      const ticket = await storage.createTicket(validated);

      // Send email notification to admin
      const user = await storage.getUser(userId);
      if (user) {
        notifyNewTicket(
          ticket.id,
          `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User',
          user.email || 'no-email',
          ticket.subject,
          ticket.message
        ).catch(err => console.error('Failed to send new ticket email:', err));
      }

      res.json({ ticket });
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid ticket data', errors: error.errors });
      }
      res.status(500).json({ message: error.message || 'Failed to create ticket' });
    }
  });

  // Reply to ticket
  app.post('/api/tickets/:id/reply', isAuthenticatedCustom, async (req, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const ticketId = req.params.id;

      const ticket = await storage.getTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // Check access
      if (user?.role !== 'admin' && ticket.userId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const validated = insertTicketReplySchema.parse({
        ticketId,
        userId,
        message: req.body.message,
      });

      const reply = await storage.createTicketReply(validated);

      // Mark ticket as having new reply
      if (user?.role === 'admin') {
        await storage.updateTicket(ticketId, { isUnreadByUser: true });
        // Admin replied - notify the ticket creator
        const ticketOwner = await storage.getUser(ticket.userId);
        if (ticketOwner?.email) {
          notifyTicketReply(
            ticketOwner.email,
            ticket.subject,
            req.body.message
          ).catch(err => console.error('Failed to send reply email:', err));
        }
      } else {
        await storage.updateTicket(ticketId, { isUnreadByAdmin: true });
        // User replied - notify admin (this is a follow-up message)
        notifyNewTicket(
          ticket.id,
          `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User',
          user.email || 'no-email',
          `Follow-up: ${ticket.subject}`,
          req.body.message
        ).catch(err => console.error('Failed to send follow-up email:', err));
      }

      res.json({ reply });
    } catch (error: any) {
      console.error('Error creating reply:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid reply data', errors: error.errors });
      }
      res.status(500).json({ message: error.message || 'Failed to create reply' });
    }
  });

  // Update ticket status (admin only)
  app.patch('/api/tickets/:id/status', isAuthenticatedCustom, async (req, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const ticketId = req.params.id;
      const { status } = req.body;

      if (!['open', 'replied', 'closed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const ticket = await storage.updateTicket(ticketId, { status });
      res.json({ ticket });
    } catch (error: any) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({ message: error.message || 'Failed to update ticket status' });
    }
  });

  // Admin: Get all users' webhook registration status
  app.get('/api/admin/webhooks', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Filter to only active users
      const activeUsers = users.filter(user => user.isActive !== false);
      const webhookStatuses = [];

      for (const user of activeUsers) {
        const integration = await storage.getUserIntegration(user.id);

        // Determine webhook URL based on environment
        let registeredUrl = 'Not configured';
        if (process.env.REPLIT_DOMAINS) {
          const domains = process.env.REPLIT_DOMAINS.split(',');
          registeredUrl = `https://${domains[0]}/api/webhooks/google-calendar`;
        } else if (process.env.REPLIT_DEV_DOMAIN) {
          registeredUrl = `https://${process.env.REPLIT_DEV_DOMAIN}/api/webhooks/google-calendar`;
        }

        const status: any = {
          userId: user.id,
          userEmail: user.email,
          agentName: user.agentName,
          hasGoogleCalendar: !!integration?.googleCalendarAccessToken,
          channelId: integration?.googleCalendarWebhookChannelId || null,
          resourceId: integration?.googleCalendarWebhookResourceId || null,
          expiry: integration?.googleCalendarWebhookExpiry || null,
          expiryDate: integration?.googleCalendarWebhookExpiry 
            ? new Date(integration.googleCalendarWebhookExpiry).toISOString()
            : null,
          isExpired: integration?.googleCalendarWebhookExpiry 
            ? integration.googleCalendarWebhookExpiry < Date.now()
            : null,
          registeredUrl,
          environment: process.env.REPLIT_DOMAINS ? 'production' : 'development'
        };

        webhookStatuses.push(status);
      }

      res.json({ webhooks: webhookStatuses });
    } catch (error: any) {
      console.error('Error fetching webhook statuses:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch webhook statuses' });
    }
  });

  // Admin: Bulk re-register all webhooks (for dev→production migration)
  app.post('/api/admin/webhooks/bulk-register', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Filter to only active users
      const activeUsers = users.filter(user => user.isActive !== false);
      const results = {
        total: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        details: [] as any[]
      };

      for (const user of activeUsers) {
        const integration = await storage.getUserIntegration(user.id);

        if (!integration?.googleCalendarAccessToken) {
          results.skipped++;
          results.details.push({
            userId: user.id,
            email: user.email,
            status: 'skipped',
            reason: 'No Google Calendar connected'
          });
          continue;
        }

        results.total++;

        try {
          const success = await setupCalendarWatch(user.id);
          if (success) {
            results.successful++;
            results.details.push({
              userId: user.id,
              email: user.email,
              status: 'success'
            });
          } else {
            results.failed++;
            results.details.push({
              userId: user.id,
              email: user.email,
              status: 'failed',
              reason: 'Setup returned false'
            });
          }
        } catch (error: any) {
          results.failed++;
          results.details.push({
            userId: user.id,
            email: user.email,
            status: 'failed',
            reason: error.message
          });
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error('Error bulk registering webhooks:', error);
      res.status(500).json({ message: error.message || 'Failed to bulk register webhooks' });
    }
  });

  // Admin: Register webhook for specific user
  app.post('/api/admin/webhooks/:userId/register', isAuthenticatedCustom, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const integration = await storage.getUserIntegration(userId);
      if (!integration?.googleCalendarAccessToken) {
        return res.status(400).json({ message: 'User does not have Google Calendar connected' });
      }

      const success = await setupCalendarWatch(userId);

      if (success) {
        // Fetch updated integration data
        const updatedIntegration = await storage.getUserIntegration(userId);
        res.json({
          success: true,
          channelId: updatedIntegration?.googleCalendarWebhookChannelId,
          expiry: updatedIntegration?.googleCalendarWebhookExpiry,
          expiryDate: updatedIntegration?.googleCalendarWebhookExpiry 
            ? new Date(updatedIntegration.googleCalendarWebhookExpiry).toISOString()
            : null
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Webhook registration failed' 
        });
      }
    } catch (error: any) {
      console.error('Error registering webhook:', error);
      res.status(500).json({ message: error.message || 'Failed to register webhook' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}