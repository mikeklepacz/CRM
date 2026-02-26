import type { Express } from "express";
import { storage } from "../../storage";

type Deps = {
  checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
  isAuthenticated: any;
};

export function registerOpenaiSettingsRoutes(app: Express, deps: Deps): void {
  // Get OpenAI settings
  app.get('/api/openai/settings', deps.isAuthenticated, async (req: any, res) => {
    try {
      console.log('⚙️ [SETTINGS] Starting GET request...');

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      console.log('⚙️ [SETTINGS] User ID:', userId);

      const user = await storage.getUser(userId);
      console.log('⚙️ [SETTINGS] User role:', user?.role);

      const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser) {
        console.log('⚙️ [SETTINGS] ❌ Access denied - user is not admin');
        return res.status(403).json({ message: 'Admin access required' });
      }

      console.log('⚙️ [SETTINGS] Fetching OpenAI settings from database...');
      const settings = await storage.getOpenaiSettings(req.user.tenantId);
      console.log('⚙️ [SETTINGS] Settings retrieved:', {
        hasSettings: !!settings,
        hasApiKey: !!settings?.apiKey,
        hasVectorStoreId: !!settings?.vectorStoreId,
        hasAiInstructions: !!settings?.aiInstructions,
      });

      // Don't send the full API key to frontend
      if (settings) {
        const maskedSettings = {
          ...settings,
          apiKey: settings.apiKey ? `sk-...${settings.apiKey.slice(-4)}` : null,
          hasApiKey: !!settings.apiKey,
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
  app.post('/api/openai/settings', deps.isAuthenticated, async (req: any, res) => {
    try {
      console.log('⚙️ [SETTINGS] Starting POST request...');

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      console.log('⚙️ [SETTINGS] User ID:', userId);

      const user = await storage.getUser(userId);
      console.log('⚙️ [SETTINGS] User role:', user?.role);

      const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser) {
        console.log('⚙️ [SETTINGS] ❌ Access denied - user is not admin');
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { apiKey, aiInstructions, vectorStoreId } = req.body;
      console.log('⚙️ [SETTINGS] Request data:', {
        hasApiKey: !!apiKey,
        apiKeyPrefix: apiKey ? apiKey.substring(0, 7) + '...' : 'none',
        hasAiInstructions: !!aiInstructions,
        instructionsLength: aiInstructions?.length || 0,
        vectorStoreId: vectorStoreId || 'none',
      });

      console.log('⚙️ [SETTINGS] Saving settings to database...');
      const settings = await storage.saveOpenaiSettings(req.user.tenantId, { apiKey, aiInstructions, vectorStoreId });
      console.log('⚙️ [SETTINGS] Settings saved successfully');

      const response = {
        success: true,
        hasApiKey: !!settings.apiKey,
        vectorStoreId: settings.vectorStoreId,
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
}
