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
  console.log('🔄 Starting Google Sheets migration to system-wide credentials...\n');

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
          googleAccessToken: integration?.googleCalendarAccessToken,
          googleRefreshToken: integration?.googleCalendarRefreshToken,
          googleTokenExpiry: integration?.googleCalendarTokenExpiry,
          googleEmail: integration?.googleCalendarEmail,
          googleConnectedAt: integration?.googleCalendarConnectedAt,
        };
      })
    );

    const adminWithGoogleSheets = adminUsers.filter(
      (admin) => admin.googleAccessToken && admin.googleRefreshToken
    );

    if (adminWithGoogleSheets.length === 0) {
      console.log('ℹ️  No admin users found with Google Sheets credentials.');
      console.log('ℹ️  Migration not needed. System is ready for fresh setup.');
      return;
    }

    // Use the first admin's credentials as the system-wide credentials
    const primaryAdmin = adminWithGoogleSheets[0];
    console.log(`📋 Found ${adminWithGoogleSheets.length} admin(s) with Google Sheets credentials`);
    console.log(`👤 Using credentials from: ${primaryAdmin.userEmail}\n`);

    // Check if system integration already exists
    const existingSystemIntegration = await storage.getSystemIntegration('google_sheets');
    
    if (existingSystemIntegration?.googleAccessToken) {
      console.log('✅ System-wide Google Sheets integration already configured.');
      console.log(`   Connected by: ${existingSystemIntegration.connectedByEmail}`);
      console.log(`   Google account: ${existingSystemIntegration.googleEmail}\n`);
      console.log('ℹ️  Migration already completed. No changes needed.');
      return;
    }

    // Migrate to system_integrations
    console.log('📦 Migrating credentials to system_integrations table...');
    await storage.updateSystemIntegration('google_sheets', {
      googleClientId: primaryAdmin.googleClientId || '',
      googleClientSecret: primaryAdmin.googleClientSecret || '',
      googleAccessToken: primaryAdmin.googleAccessToken || '',
      googleRefreshToken: primaryAdmin.googleRefreshToken || '',
      googleTokenExpiry: primaryAdmin.googleTokenExpiry || 0,
      googleEmail: primaryAdmin.googleEmail || '',
      connectedBy: primaryAdmin.userId,
    });

    console.log('✅ Successfully migrated Google Sheets credentials to system-wide integration!\n');
    console.log('📊 Summary:');
    console.log(`   • System credentials: ${primaryAdmin.googleClientId ? 'Configured' : 'Missing'}`);
    console.log(`   • Access token: ${primaryAdmin.googleAccessToken ? 'Present' : 'Missing'}`);
    console.log(`   • Refresh token: ${primaryAdmin.googleRefreshToken ? 'Present' : 'Missing'}`);
    console.log(`   • Connected Google account: ${primaryAdmin.googleEmail || 'Unknown'}`);
    console.log(`   • Connected by admin: ${primaryAdmin.userEmail}\n`);
    
    console.log('ℹ️  Next steps:');
    console.log('   1. All agents can now access Google Sheets with these system-wide credentials');
    console.log('   2. Admin users can manage this in Admin Dashboard > Google Sheets tab');
    console.log('   3. Individual users can still connect their own Gmail/Calendar in Settings > Integrations\n');

    if (adminWithGoogleSheets.length > 1) {
      console.log('⚠️  Note: Multiple admins had Google Sheets credentials.');
      console.log('   Only the first admin\'s credentials were migrated to system-wide.');
      console.log('   Other admin credentials remain in their user_integrations for Gmail/Calendar.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

export { migrateGoogleSheetsToSystemIntegration };

// Run migration if this file is executed directly
migrateGoogleSheetsToSystemIntegration()
  .then(() => {
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
