import { storage } from './storage';
import { db } from './db';
import { users, userIntegrations } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Migration script to move admin Google Sheets credentials from user_integrations
 * to system_integrations table.
 * 
 * This makes Google Sheets credentials system-wide (all agents use the same connection)
 * instead of per-user.
 */
async function migrateGoogleSheetsToSystemIntegration() {

  try {
    // Find admin users
    const allUsers = await db.select().from(users).where(eq(users.role, 'admin'));
    
    // Get their integrations
    const adminUsers = await Promise.all(
      allUsers.map(async (user) => {
        const integration = await storage.getUserIntegration(user.id);
        return {
          userId: user.id,
          userEmail: user.email,
          userRole: user.role,
          googleClientId: integration?.googleClientId,
          googleClientSecret: integration?.googleClientSecret,
          googleAccessToken: integration?.googleAccessToken,
          googleRefreshToken: integration?.googleRefreshToken,
          googleTokenExpiry: integration?.googleTokenExpiry,
          googleEmail: integration?.googleEmail,
          googleConnectedAt: integration?.googleConnectedAt,
        };
      })
    );

    const adminWithGoogleSheets = adminUsers.filter(
      (admin) => admin.googleAccessToken && admin.googleRefreshToken
    );

    if (adminWithGoogleSheets.length === 0) {
      return;
    }

    // Use the first admin's credentials as the system-wide credentials
    const primaryAdmin = adminWithGoogleSheets[0];

    // Check if system integration already exists
    const existingSystemIntegration = await storage.getSystemIntegration('google_sheets');
    
    if (existingSystemIntegration?.googleAccessToken) {
      return;
    }

    // Migrate to system_integrations
    await storage.updateSystemIntegration('google_sheets', {
      googleClientId: primaryAdmin.googleClientId || '',
      googleClientSecret: primaryAdmin.googleClientSecret || '',
      googleAccessToken: primaryAdmin.googleAccessToken || '',
      googleRefreshToken: primaryAdmin.googleRefreshToken || '',
      googleTokenExpiry: primaryAdmin.googleTokenExpiry || 0,
      googleEmail: primaryAdmin.googleEmail || '',
      connectedByUserId: primaryAdmin.userId,
      connectedByEmail: primaryAdmin.userEmail || '',
    });

    

    if (adminWithGoogleSheets.length > 1) {
    }

  } catch (error) {
    throw error;
  }
}

export { migrateGoogleSheetsToSystemIntegration };

// Run migration if this file is executed directly
migrateGoogleSheetsToSystemIntegration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });
