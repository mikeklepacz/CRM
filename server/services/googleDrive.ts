// Google Drive Integration for Label Projects
// Uses Replit's Google Drive connection

import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
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

// Label Projects folder ID from the shared link
const LABEL_PROJECTS_FOLDER_ID = '1VIEFwO2af3RAOJuUUa0esKUKAE1i-XgW';

// Create a project folder inside Label Projects
export async function createProjectFolder(projectName: string): Promise<string> {
  const drive = await getUncachableGoogleDriveClient();
  
  const folderMetadata = {
    name: projectName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [LABEL_PROJECTS_FOLDER_ID]
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
  // Create project folder with name and email
  const folderName = `${projectName} - ${email}`;
  const projectFolderId = await createProjectFolder(folderName);
  
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
