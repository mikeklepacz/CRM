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
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
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
      supportsAllDrives: true,
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
      { fileId, alt: 'media', supportsAllDrives: true },
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
    await drive.files.delete({ fileId, supportsAllDrives: true });
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
      supportsAllDrives: true,
    });

    return response.data;
  } catch (error: any) {
    console.error('Error getting folder info:', error);
    throw new Error(`Failed to get folder info: ${error.message}`);
  }
}

export async function backupKbFileToDrive(
  filename: string,
  versionNumber: number,
  content: string
) {
  try {
    // Get KB Backups folder from database
    const backupFolder = await storage.getDriveFolderByName('KB Backups');
    if (!backupFolder) {
      console.warn('[KB Backup] KB Backups folder not configured, skipping Drive backup');
      return null;
    }

    // Format: YYYYMMDD-FILENAME-vVERSION.txt
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const baseFilename = filename.replace(/\.txt$/, ''); // Remove .txt extension if present
    const backupFilename = `${dateStr}-${baseFilename}-v${versionNumber}.txt`;


    // Upload to Google Drive
    const fileBuffer = Buffer.from(content, 'utf-8');
    const result = await uploadFileToDrive(
      backupFolder.folderId,
      backupFilename,
      'text/plain',
      fileBuffer
    );

    return result;
  } catch (error: any) {
    console.error('[KB Backup] Failed to backup to Drive:', error);
    // Don't throw - backup failure shouldn't break the main operation
    return null;
  }
}

// ============================================================================
// Label Project Upload Functions (uses same credentials as KB backups)
// ============================================================================

// Find or create "Label Projects" folder in Drive
async function findOrCreateLabelProjectsFolder(): Promise<string> {
  const drive = await getSystemGoogleDriveClient();
  
  // Search for existing "Label Projects" folder
  const searchResponse = await drive.files.list({
    q: "name='Label Projects' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id, name)',
    spaces: 'drive',
    supportsAllDrives: true
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
    fields: 'id',
    supportsAllDrives: true
  });

  return folder.data.id!;
}

// Find or create email folder inside Label Projects
async function findOrCreateEmailFolder(email: string): Promise<string> {
  const drive = await getSystemGoogleDriveClient();
  const labelProjectsFolderId = await findOrCreateLabelProjectsFolder();
  
  // Escape single quotes in email for Drive query safety
  const escapedEmail = email.replace(/'/g, "\\'");
  
  // Search for existing email folder inside Label Projects
  const searchResponse = await drive.files.list({
    q: `name='${escapedEmail}' and mimeType='application/vnd.google-apps.folder' and '${labelProjectsFolderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
    supportsAllDrives: true
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
    fields: 'id',
    supportsAllDrives: true
  });

  return folder.data.id!;
}

// Create a project folder inside the email folder
async function createProjectFolder(projectName: string, email: string): Promise<string> {
  const drive = await getSystemGoogleDriveClient();
  
  // Get or create the email folder
  const emailFolderId = await findOrCreateEmailFolder(email);
  
  const folderMetadata = {
    name: projectName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [emailFolderId]
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
    supportsAllDrives: true
  });

  return folder.data.id!;
}

// Create assets subfolder
async function createAssetsFolder(projectFolderId: string): Promise<string> {
  const drive = await getSystemGoogleDriveClient();
  
  const folderMetadata = {
    name: 'assets',
    mimeType: 'application/vnd.google-apps.folder',
    parents: [projectFolderId]
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
    supportsAllDrives: true
  });

  return folder.data.id!;
}

// Upload a base64 file to a folder
async function uploadBase64File(
  folderId: string,
  fileName: string,
  mimeType: string,
  base64Content: string
): Promise<string> {
  const drive = await getSystemGoogleDriveClient();
  
  const fileMetadata = {
    name: fileName,
    parents: [folderId]
  };

  const media = {
    mimeType,
    body: Readable.from([Buffer.from(base64Content, 'base64')])
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id',
    supportsAllDrives: true
  });

  return file.data.id!;
}

// Upload all project files to Google Drive
// Structure: Label Projects / email / projectName / (files + assets/)
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
  
  // Strip data URL prefix if present (for safety)
  const cleanDesignPng = files.designPng.replace(/^data:[^;]+;base64,/, '');
  const cleanMockupPng = files.mockupPng.replace(/^data:[^;]+;base64,/, '');
  const cleanSpecsPdf = files.specsPdf.replace(/^data:[^;]+;base64,/, '');
  
  // Upload main files
  await Promise.all([
    uploadBase64File(projectFolderId, 'design.png', 'image/png', cleanDesignPng),
    uploadBase64File(projectFolderId, '3d-mockup.png', 'image/png', cleanMockupPng),
    uploadBase64File(projectFolderId, 'project-specs.pdf', 'application/pdf', cleanSpecsPdf),
  ]);
  
  // Upload original assets
  for (const asset of files.assets) {
    const assetData = asset.data.replace(/^data:[^;]+;base64,/, '');
    await uploadBase64File(assetsFolderId, asset.name, asset.mimeType, assetData);
  }
  
  return {
    folderId: projectFolderId,
    folderUrl: `https://drive.google.com/drive/folders/${projectFolderId}`
  };
}
