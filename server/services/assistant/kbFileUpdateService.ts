import * as googleDrive from "../../googleDrive";
import { storage } from "../../storage";

type SyncKbDocFn = (
  apiKey: string,
  oldDocId: string,
  filename: string,
  content: string,
  tenantId: string
) => Promise<{ success: boolean; newDocId?: string; agentsUpdated?: number; error?: string }>;

type SyncAlignerFn = (
  kbFileId: string,
  content: string,
  filename: string,
  tenantId: string
) => Promise<{ success: boolean; error?: string }>;

export async function updateKbFileContent(params: {
  fileId: string;
  content: string;
  tenantId: string;
  userId: string;
  syncKbDocumentToElevenLabs: SyncKbDocFn;
  syncKbFileToAlignerVectorStore: SyncAlignerFn;
}): Promise<any> {
  const { fileId, content, tenantId, userId, syncKbDocumentToElevenLabs, syncKbFileToAlignerVectorStore } = params;

  const file = await storage.getKbFileById(fileId, tenantId);
  if (!file) {
    const error: any = new Error("File not found");
    error.statusCode = 404;
    throw error;
  }

  console.log(`[KB Update] Updating file: ${file.filename}`);
  const versions = await storage.getKbFileVersions(fileId, tenantId);
  const latestVersion = versions[0];
  const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

  const newVersion = await storage.createKbFileVersion({
    tenantId,
    kbFileId: fileId,
    versionNumber: newVersionNumber,
    content,
    source: "editor",
    createdBy: userId,
  });

  await googleDrive.backupKbFileToDrive(file.filename, newVersionNumber, content);

  const updatedFile = await storage.updateKbFile(fileId, tenantId, {
    currentContent: content,
    currentSyncVersion: newVersion.id,
    localUpdatedAt: new Date(),
  });

  console.log(`[KB Update] File updated to version ${newVersionNumber}, syncing to ElevenLabs...`);
  const elevenLabsConfig = await storage.getElevenLabsConfig(tenantId);

  if (elevenLabsConfig?.apiKey && file.elevenlabsDocId) {
    const syncResult = await syncKbDocumentToElevenLabs(
      elevenLabsConfig.apiKey,
      file.elevenlabsDocId,
      file.filename,
      content,
      tenantId
    );

    if (syncResult.success && syncResult.newDocId) {
      console.log(
        `[KB Update] Successfully synced to ElevenLabs (new docId: ${syncResult.newDocId}, agents updated: ${syncResult.agentsUpdated})`
      );

      await storage.updateKbFile(fileId, tenantId, {
        elevenlabsDocId: syncResult.newDocId,
        lastSyncedAt: new Date(),
      });
    } else {
      console.error(`[KB Update] Sync failed: ${syncResult.error}`);
    }
  }

  const alignerSyncResult = await syncKbFileToAlignerVectorStore(file.id, content, file.filename, tenantId);
  if (!alignerSyncResult.success) {
    console.warn(`[KB Update] Aligner sync failed (non-critical): ${alignerSyncResult.error}`);
  }

  return updatedFile;
}
