import { Readable } from 'stream';
import { storage } from './storage';
import { getSystemGoogleDriveClient } from './googleDrive/client';
export { uploadProjectToDrive } from './googleDrive/projectUpload';

export { getSystemGoogleDriveClient };

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
    const backupFolder = await storage.getDriveFolderByName('KB Backups');
    if (!backupFolder) {
      console.warn('[KB Backup] KB Backups folder not configured, skipping Drive backup');
      return null;
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const baseFilename = filename.replace(/\.txt$/, '');
    const backupFilename = `${dateStr}-${baseFilename}-v${versionNumber}.txt`;

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
    return null;
  }
}
