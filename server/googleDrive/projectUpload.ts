import { Readable } from 'stream';
import { getSystemGoogleDriveClient } from './client';

async function findOrCreateLabelProjectsFolder(): Promise<string> {
  const drive = await getSystemGoogleDriveClient();

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

async function findOrCreateEmailFolder(email: string): Promise<string> {
  const drive = await getSystemGoogleDriveClient();
  const labelProjectsFolderId = await findOrCreateLabelProjectsFolder();

  const escapedEmail = email.replace(/'/g, "\\'");

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

async function createProjectFolder(projectName: string, email: string): Promise<string> {
  const drive = await getSystemGoogleDriveClient();

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

export async function uploadProjectToDrive(
  projectName: string,
  email: string,
  files: {
    designPng: string;
    mockupPng: string;
    specsPdf: string;
    assets: { name: string; data: string; mimeType: string }[];
  }
): Promise<{ folderId: string; folderUrl: string }> {
  const projectFolderId = await createProjectFolder(projectName, email);

  const assetsFolderId = await createAssetsFolder(projectFolderId);

  const cleanDesignPng = files.designPng.replace(/^data:[^;]+;base64,/, '');
  const cleanMockupPng = files.mockupPng.replace(/^data:[^;]+;base64,/, '');
  const cleanSpecsPdf = files.specsPdf.replace(/^data:[^;]+;base64,/, '');

  await Promise.all([
    uploadBase64File(projectFolderId, 'design.png', 'image/png', cleanDesignPng),
    uploadBase64File(projectFolderId, '3d-mockup.png', 'image/png', cleanMockupPng),
    uploadBase64File(projectFolderId, 'project-specs.pdf', 'application/pdf', cleanSpecsPdf),
  ]);

  for (const asset of files.assets) {
    const assetData = asset.data.replace(/^data:[^;]+;base64,/, '');
    await uploadBase64File(assetsFolderId, asset.name, asset.mimeType, assetData);
  }

  return {
    folderId: projectFolderId,
    folderUrl: `https://drive.google.com/drive/folders/${projectFolderId}`
  };
}
