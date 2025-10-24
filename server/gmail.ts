import { google } from 'googleapis';
import { storage } from './storage';

const ADMIN_EMAIL = 'michael@naturalmaterials.eu';

/**
 * Send email via Gmail API
 * Uses the admin user's Gmail integration
 */
export async function sendGmailNotification(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  try {
    // Get admin user (first user with admin role)
    const users = await storage.getAllUsers();
    const adminUser = users.find(u => u.role === 'admin');
    
    if (!adminUser) {
      console.error('[Gmail] No admin user found');
      return;
    }

    // Get Gmail integration for admin
    const integration = await storage.getUserIntegration(adminUser.id);
    
    if (!integration?.accessToken || !integration?.refreshToken) {
      console.error('[Gmail] No Gmail integration found for admin user');
      return;
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
    });

    // Check if token needs refresh
    if (integration.expiresAt && new Date(integration.expiresAt) <= new Date()) {
      console.log('[Gmail] Token expired, refreshing...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      if (credentials.access_token) {
        await storage.updateUserIntegration(adminUser.id, {
          accessToken: credentials.access_token,
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
        });
        
        oauth2Client.setCredentials({
          access_token: credentials.access_token,
          refresh_token: integration.refreshToken,
        });
      }
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create email in RFC 2822 format
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ].join('\n');

    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    console.log(`[Gmail] Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('[Gmail] Error sending email:', error);
    // Don't throw - email failures shouldn't break ticket creation
  }
}

/**
 * Send notification when a new support ticket is created
 */
export async function notifyNewTicket(
  ticketId: string,
  userName: string,
  userEmail: string,
  subject: string,
  message: string
): Promise<void> {
  const emailSubject = `New Support Ticket: ${subject}`;
  const emailBody = `
    <h2>New Support Ticket</h2>
    <p><strong>From:</strong> ${userName} (${userEmail})</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Message:</strong></p>
    <p>${message.replace(/\n/g, '<br>')}</p>
    <hr>
    <p><em>Reply to this ticket from your admin dashboard.</em></p>
  `;

  await sendGmailNotification(ADMIN_EMAIL, emailSubject, emailBody);
}

/**
 * Send notification when admin replies to a ticket
 */
export async function notifyTicketReply(
  userEmail: string,
  subject: string,
  replyMessage: string
): Promise<void> {
  const emailSubject = `Re: ${subject}`;
  const emailBody = `
    <h2>Support Ticket Reply</h2>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Reply:</strong></p>
    <p>${replyMessage.replace(/\n/g, '<br>')}</p>
    <hr>
    <p><em>You can view and reply to this ticket in your dashboard.</em></p>
  `;

  await sendGmailNotification(userEmail, emailSubject, emailBody);
}
