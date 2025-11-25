import { getAdminGmailClient, GMAIL_ADMIN_USER_ID } from './gmailClient';
import { storage } from '../storage';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { userIntegrations } from '../../shared/schema';

const GMAIL_PUBSUB_TOPIC = process.env.GMAIL_PUBSUB_TOPIC || 'projects/durable-student-395209/topics/gmail-inbox-push';
const WATCH_RENEWAL_BUFFER_MS = 24 * 60 * 60 * 1000; // Renew 24 hours before expiry
const PUSH_HEALTH_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours - consider unhealthy after this

export interface WatchStatus {
  isActive: boolean;
  expiration: number | null;
  historyId: string | null;
  lastPushReceived: Date | null;
  isHealthy: boolean;
  healthStatus: 'green' | 'yellow' | 'red';
  healthMessage: string;
}

export class GmailWatchManager {
  private static instance: GmailWatchManager;
  
  static getInstance(): GmailWatchManager {
    if (!GmailWatchManager.instance) {
      GmailWatchManager.instance = new GmailWatchManager();
    }
    return GmailWatchManager.instance;
  }

  async watch(): Promise<{ historyId: string; expiration: number }> {
    console.log('[GmailWatch] Starting Gmail watch...');
    
    const { gmail } = await getAdminGmailClient();
    
    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'],
        labelFilterAction: 'include',
        topicName: GMAIL_PUBSUB_TOPIC,
      },
    });

    const historyId = response.data.historyId || '';
    const expiration = parseInt(response.data.expiration || '0', 10);

    await db.update(userIntegrations)
      .set({
        gmailLastHistoryId: historyId,
        gmailWatchExpiration: expiration,
        updatedAt: new Date(),
      })
      .where(eq(userIntegrations.userId, GMAIL_ADMIN_USER_ID));

    console.log(`[GmailWatch] ✅ Watch registered. HistoryId: ${historyId}, Expires: ${new Date(expiration).toISOString()}`);
    
    return { historyId, expiration };
  }

  async stop(): Promise<void> {
    console.log('[GmailWatch] Stopping Gmail watch...');
    
    const { gmail } = await getAdminGmailClient();
    
    await gmail.users.stop({ userId: 'me' });

    await db.update(userIntegrations)
      .set({
        gmailWatchExpiration: null,
        updatedAt: new Date(),
      })
      .where(eq(userIntegrations.userId, GMAIL_ADMIN_USER_ID));

    console.log('[GmailWatch] ✅ Watch stopped');
  }

  async renewIfNeeded(): Promise<boolean> {
    const integration = await storage.getUserIntegration(GMAIL_ADMIN_USER_ID);
    if (!integration) {
      console.log('[GmailWatch] No integration found for admin user');
      return false;
    }

    const expiration = integration.gmailWatchExpiration;
    if (!expiration) {
      console.log('[GmailWatch] No active watch, starting new one...');
      await this.watch();
      return true;
    }

    const timeUntilExpiry = expiration - Date.now();
    if (timeUntilExpiry < WATCH_RENEWAL_BUFFER_MS) {
      console.log(`[GmailWatch] Watch expires in ${Math.round(timeUntilExpiry / 1000 / 60 / 60)}h, renewing...`);
      await this.watch();
      return true;
    }

    console.log(`[GmailWatch] Watch valid for ${Math.round(timeUntilExpiry / 1000 / 60 / 60)}h more`);
    return false;
  }

  async updateLastPushReceived(): Promise<void> {
    await db.update(userIntegrations)
      .set({
        gmailLastPushReceivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userIntegrations.userId, GMAIL_ADMIN_USER_ID));
  }

  async updateHistoryId(historyId: string): Promise<void> {
    await db.update(userIntegrations)
      .set({
        gmailLastHistoryId: historyId,
        updatedAt: new Date(),
      })
      .where(eq(userIntegrations.userId, GMAIL_ADMIN_USER_ID));
  }

  async getLastHistoryId(): Promise<string | null> {
    const integration = await storage.getUserIntegration(GMAIL_ADMIN_USER_ID);
    return integration?.gmailLastHistoryId || null;
  }

  async getStatus(): Promise<WatchStatus> {
    const integration = await storage.getUserIntegration(GMAIL_ADMIN_USER_ID);
    
    const expiration = integration?.gmailWatchExpiration || null;
    const historyId = integration?.gmailLastHistoryId || null;
    const lastPushReceived = integration?.gmailLastPushReceivedAt || null;
    
    const isActive = expiration !== null && expiration > Date.now();
    
    let healthStatus: 'green' | 'yellow' | 'red' = 'red';
    let healthMessage = 'Push notifications not configured';
    let isHealthy = false;

    if (!isActive) {
      healthStatus = 'red';
      healthMessage = 'Gmail watch not active';
    } else if (!lastPushReceived) {
      healthStatus = 'yellow';
      healthMessage = 'Waiting for first push notification';
      isHealthy = true; // Give benefit of doubt initially
    } else {
      const timeSinceLastPush = Date.now() - new Date(lastPushReceived).getTime();
      
      if (timeSinceLastPush < 60 * 60 * 1000) { // < 1 hour
        healthStatus = 'green';
        healthMessage = 'Push notifications active';
        isHealthy = true;
      } else if (timeSinceLastPush < PUSH_HEALTH_THRESHOLD_MS) { // 1-6 hours
        healthStatus = 'yellow';
        healthMessage = `No push in ${Math.round(timeSinceLastPush / 1000 / 60 / 60)}h (might be quiet inbox)`;
        isHealthy = true;
      } else { // > 6 hours
        healthStatus = 'red';
        healthMessage = `No push in ${Math.round(timeSinceLastPush / 1000 / 60 / 60)}h - possible issue`;
        isHealthy = false;
      }
    }

    return {
      isActive,
      expiration,
      historyId,
      lastPushReceived,
      isHealthy,
      healthStatus,
      healthMessage,
    };
  }

  async isHealthy(): Promise<boolean> {
    const status = await this.getStatus();
    return status.isHealthy;
  }

  async attemptAutoRecovery(): Promise<boolean> {
    console.log('[GmailWatch] Attempting auto-recovery...');
    try {
      await this.watch();
      console.log('[GmailWatch] ✅ Auto-recovery successful');
      return true;
    } catch (error: any) {
      console.error('[GmailWatch] ❌ Auto-recovery failed:', error.message);
      return false;
    }
  }
}

export const gmailWatchManager = GmailWatchManager.getInstance();
