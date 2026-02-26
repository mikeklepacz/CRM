import * as googleDrive from "../../googleDrive";
import { storage } from "../../storage";

type SyncAlignerFn = (
  kbFileId: string,
  content: string,
  filename: string,
  tenantId: string
) => Promise<{ success: boolean; error?: string }>;

export async function rollbackKbFileVersion(params: {
  fileId: string;
  versionId: string;
  tenantId: string;
  userId: string;
  syncKbFileToAlignerVectorStore: SyncAlignerFn;
}): Promise<{ version: any }> {
  const { fileId, versionId, tenantId, userId, syncKbFileToAlignerVectorStore } = params;

  const file = await storage.getKbFileById(fileId, tenantId);
  if (!file) {
    const error: any = new Error("File not found");
    error.statusCode = 404;
    throw error;
  }

  const targetVersion = await storage.getKbFileVersion(versionId, tenantId);
  if (!targetVersion || targetVersion.kbFileId !== fileId) {
    const error: any = new Error("Version not found");
    error.statusCode = 404;
    throw error;
  }

  const versions = await storage.getKbFileVersions(fileId, tenantId);
  const newVersionNumber = versions[0] ? versions[0].versionNumber + 1 : 1;

  const newVersion = await storage.createKbFileVersion({
    tenantId,
    kbFileId: fileId,
    versionNumber: newVersionNumber,
    content: targetVersion.content,
    source: "manual_edit",
    createdBy: userId,
  });

  await googleDrive.backupKbFileToDrive(file.filename, newVersionNumber, targetVersion.content);

  await storage.updateKbFile(fileId, tenantId, {
    currentContent: targetVersion.content,
    currentSyncVersion: newVersion.id,
    localUpdatedAt: new Date(),
  });

  const alignerSyncResult = await syncKbFileToAlignerVectorStore(file.id, targetVersion.content, file.filename, tenantId);
  if (!alignerSyncResult.success) {
    console.warn(`[KB Rollback] Aligner sync failed (non-critical): ${alignerSyncResult.error}`);
  }

  return { version: newVersion };
}
