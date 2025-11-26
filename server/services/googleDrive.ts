// Google Drive Integration for Label Projects
// Uses the same Google Sheets integration credentials as the docs section

import { google } from 'googleapis';
import { storage } from '../storage';

// Get access token from the Google Sheets integration (same as docs section)
async function getAccessToken() {
  const integration = await storage.getSystemIntegration('google_sheets');
  
  if (!integration?.googleAccessToken || !integration?.googleRefreshToken) {
    throw new Error('Google integration not configured. Admin must connect Google in Admin Dashboard.');
  }

  const now = Date.now();
  const expiryTime = integration.googleTokenExpiry || 0;
  const isExpired = expiryTime <= now + (5 * 60 * 1000); // 5 minute buffer

  if (isExpired && integration.googleRefreshToken && integration.googleClientId && integration.googleClientSecret) {
    // Token is expired, refresh it
    const oauth2Client = new google.auth.OAuth2(
      integration.googleClientId,
      integration.googleClientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: integration.googleRefreshToken
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update stored tokens
      await storage.updateSystemIntegration('google_sheets', {
        googleAccessToken: credentials.access_token!,
        googleTokenExpiry: credentials.expiry_date || (Date.now() + 3600 * 1000),
      });
      
      return credentials.access_token!;
    } catch (error) {
      console.error('Failed to refresh Google token:', error);
      throw new Error('Failed to refresh Google access token');
    }
  }

  return integration.googleAccessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getUncachableGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Find or create "Label Projects" folder in user's Drive
async function findOrCreateLabelProjectsFolder(): Promise<string> {
  const drive = await getUncachableGoogleDriveClient();
  
  // Search for existing "Label Projects" folder
  const searchResponse = await drive.files.list({
    q: "name='Label Projects' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id, name)',
    spaces: 'drive'
  });
  
  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    console.log('[GoogleDrive] Found existing Label Projects folder');
    return searchResponse.data.files[0].id!;
  }
  
  // Create new folder in Drive root
  console.log('[GoogleDrive] Creating new Label Projects folder');
  const folderMetadata = {
    name: 'Label Projects',
    mimeType: 'application/vnd.google-apps.folder'
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id'
  });

  return folder.data.id!;
}

// Find or create email folder inside Label Projects
async function findOrCreateEmailFolder(email: string): Promise<string> {
  const drive = await getUncachableGoogleDriveClient();
  const labelProjectsFolderId = await findOrCreateLabelProjectsFolder();
  
  // Search for existing email folder inside Label Projects
  const searchResponse = await drive.files.list({
    q: `name='${email}' and mimeType='application/vnd.google-apps.folder' and '${labelProjectsFolderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  });
  
  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    console.log(`[GoogleDrive] Found existing folder for ${email}`);
    return searchResponse.data.files[0].id!;
  }
  
  // Create new email folder
  console.log(`[GoogleDrive] Creating new folder for ${email}`);
  const folderMetadata = {
    name: email,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [labelProjectsFolderId]
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id'
  });

  return folder.data.id!;
}

// Create a project folder inside the email folder
export async function createProjectFolder(projectName: string, email: string): Promise<string> {
  const drive = await getUncachableGoogleDriveClient();
  
  // Get or create the email folder
  const emailFolderId = await findOrCreateEmailFolder(email);
  
  const folderMetadata = {
    name: projectName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [emailFolderId]
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id'
  });

  return folder.data.id!;
}

// Create assets subfolder
export async function createAssetsFolder(projectFolderId: string): Promise<string> {
  const drive = await getUncachableGoogleDriveClient();
  
  const folderMetadata = {
    name: 'assets',
    mimeType: 'application/vnd.google-apps.folder',
    parents: [projectFolderId]
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id'
  });

  return folder.data.id!;
}

// Upload a file to a folder
export async function uploadFile(
  folderId: string,
  fileName: string,
  mimeType: string,
  content: Buffer | string
): Promise<string> {
  const drive = await getUncachableGoogleDriveClient();
  
  const fileMetadata = {
    name: fileName,
    parents: [folderId]
  };

  const media = {
    mimeType,
    body: typeof content === 'string' 
      ? require('stream').Readable.from([Buffer.from(content, 'base64')])
      : require('stream').Readable.from([content])
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id'
  });

  return file.data.id!;
}

// Upload all project files to Google Drive
export async function uploadProjectToDrive(
  projectName: string,
  email: string,
  files: {
    designPng: string; // base64
    mockupPng: string; // base64
    specsPdf: string; // base64
    assets: { name: string; data: string; mimeType: string }[]; // original uploads
  }
): Promise<{ folderId: string; folderUrl: string }> {
  // Create project folder inside email folder
  // Structure: Label Projects / email / projectName
  const projectFolderId = await createProjectFolder(projectName, email);
  
  // Create assets subfolder
  const assetsFolderId = await createAssetsFolder(projectFolderId);
  
  // Upload main files
  await Promise.all([
    uploadFile(projectFolderId, 'design.png', 'image/png', files.designPng),
    uploadFile(projectFolderId, '3d-mockup.png', 'image/png', files.mockupPng),
    uploadFile(projectFolderId, 'project-specs.pdf', 'application/pdf', files.specsPdf),
  ]);
  
  // Upload original assets
  for (const asset of files.assets) {
    await uploadFile(assetsFolderId, asset.name, asset.mimeType, asset.data);
  }
  
  return {
    folderId: projectFolderId,
    folderUrl: `https://drive.google.com/drive/folders/${projectFolderId}`
  };
}
