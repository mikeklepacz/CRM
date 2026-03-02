import * as googleDrive from "../../googleDrive";
import { storage } from "../../storage";

export async function processKbBatchUpload(params: {
  files: Express.Multer.File[];
  tenantId: string;
  createdBy: string;
}): Promise<{ imported: number; updated: number; skipped: number; total: number; results: any[] }> {
  const { files, tenantId, createdBy } = params;

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const results = [];

  console.log(`[KB Upload] Starting batch upload of ${files.length} files`);

  for (const file of files) {
    try {
      const filename = file.originalname;
      const content = file.buffer.toString("utf-8");
      const existing = await storage.getKbFileByFilename(filename, tenantId);

      if (existing) {
        const versions = await storage.getKbFileVersions(existing.id, tenantId);
        const latestVersion = versions[0];
        const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

        const newVersion = await storage.createKbFileVersion({
          tenantId,
          kbFileId: existing.id,
          versionNumber: newVersionNumber,
          content,
          source: "manual_upload",
          createdBy,
        });

        await googleDrive.backupKbFileToDrive(filename, newVersionNumber, content);
        await storage.updateKbFile(existing.id, tenantId, {
          currentContent: content,
          currentSyncVersion: newVersion.id,
          localUpdatedAt: new Date(),
        });

        updated++;
        results.push({ filename, status: "updated", version: newVersionNumber });
        console.log(`[KB Upload] Updated ${filename} to version ${newVersionNumber}`);
      } else {
        const newFile = await storage.createKbFile({
          tenantId,
          filename,
          currentContent: content,
          fileType: "file",
          lastSyncedAt: new Date(),
        });

        const initialVersion = await storage.createKbFileVersion({
          tenantId,
          kbFileId: newFile.id,
          versionNumber: 1,
          content,
          source: "manual_upload",
          createdBy,
        });

        await googleDrive.backupKbFileToDrive(filename, 1, content);
        await storage.updateKbFile(newFile.id, tenantId, {
          currentSyncVersion: initialVersion.id,
        });

        imported++;
        results.push({ filename, status: "imported", version: 1 });
        console.log(`[KB Upload] Imported new file ${filename}`);
      }
    } catch (error: any) {
      console.error(`[KB Upload] Error processing ${file.originalname}:`, error);
      skipped++;
      results.push({ filename: file.originalname, status: "error", error: error.message });
    }
  }

  console.log(`[KB Upload] Batch upload complete: ${imported} imported, ${updated} updated, ${skipped} skipped`);
  return { imported, updated, skipped, total: files.length, results };
}
