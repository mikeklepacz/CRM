import { google } from 'googleapis';
import { storage } from './storage';
import { Readable } from 'stream';

async function getSystemAccessToken() {
  const integration = await storage.getSystemIntegration('google_sheets');
  
  if (!integration?.googleAccessToken || !integration?.googleRefreshToken) {
    throw new Error('Google integration not configured. Admin must connect Google in Admin Dashboard.');
  }

  const now = Date.now();
  const expiryTime = integration.googleTokenExpiry || 0;
  const isExpired = expiryTime <= now + (5 * 60 * 1000);

  if (isExpired && integration.googleRefreshToken && integration.googleClientId && integration.googleClientSecret) {
    const oauth2Client = new google.auth.OAuth2(
      integration.googleClientId,
      integration.googleClientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: integration.googleRefreshToken
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      const newAccessToken = credentials.access_token!;
      const newExpiryTime = credentials.expiry_date || (Date.now() + 3600000);

      await storage.updateSystemIntegration('google_sheets', {
        googleAccessToken: newAccessToken,
        googleTokenExpiry: newExpiryTime
      });

      return newAccessToken;
    } catch (error) {
      console.error('Failed to refresh Google access token:', error);
      throw new Error('Failed to refresh Google access token. Admin must reconnect in Admin Dashboard.');
    }
  }

  return integration.googleAccessToken;
}

export async function getSystemGoogleDriveClient() {
  const accessToken = await getSystemAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function listFilesInFolder(folderId: string) {
  const drive = await getSystemGoogleDriveClient();
  
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, iconLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 1000,
    });

    return response.data.files || [];
  } catch (error: any) {
    console.error('Error listing Drive files:', error);
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

export async function uploadFileToDrive(
  folderId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer
) {
  const drive = await getSystemGoogleDriveClient();

  try {
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType,
      body: Readable.from(fileBuffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink',
    });

    return response.data;
  } catch (error: any) {
    console.error('Error uploading file to Drive:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

export async function downloadFileFromDrive(fileId: string) {
  const drive = await getSystemGoogleDriveClient();

  try {
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error downloading file from Drive:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }
}

export async function deleteFileFromDrive(fileId: string) {
  const drive = await getSystemGoogleDriveClient();

  try {
    await drive.files.delete({ fileId });
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting file from Drive:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

export async function getFolderInfo(folderId: string) {
  const drive = await getSystemGoogleDriveClient();

  try {
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType, webViewLink',
    });

    return response.data;
  } catch (error: any) {
    console.error('Error getting folder info:', error);
    throw new Error(`Failed to get folder info: ${error.message}`);
  }
}
