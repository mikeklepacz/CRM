type Deps = {
  db: any;
  eq: any;
  googleDrive: { backupKbFileToDrive: (filename: string, version: number, content: string) => Promise<any> };
  kbFiles: any;
  sql: any;
  storage: any;
  syncKbDocumentToElevenLabs: (
    apiKey: string,
    oldDocId: string,
    filename: string,
    newContent: string,
    tenantId: string
  ) => Promise<{ success: boolean; newDocId?: string; agentsUpdated?: number; error?: string }>;
};

function detectAgentId(filename: string, agentNameMap: Map<string, string>): string | null {
  const match = filename.match(/^([^-]+)\s*-\s*/);
  if (!match) return null;
  const agentName = match[1].trim().toLowerCase();
  return agentNameMap.get(agentName) || null;
}

export function createKbSyncHandler(deps: Deps) {
  return async (req: any, res: any) => {
    try {
      const tenantId = req.user.tenantId;
      const elevenLabsConfig = await deps.storage.getElevenLabsConfig(tenantId);
      if (!elevenLabsConfig?.apiKey) {
        return res.status(400).json({ error: "ElevenLabs API key not configured" });
      }

      const agents = await deps.storage.getAllElevenLabsAgents(tenantId);
      const agentNameMap = new Map<string, string>();
      for (const agent of agents) {
        agentNameMap.set(agent.name.toLowerCase(), agent.agentId);
      }

      const response = await fetch("https://api.elevenlabs.io/v1/convai/knowledge-base?page_size=100", {
        headers: { "xi-api-key": elevenLabsConfig.apiKey },
      });
      if (!response.ok) throw new Error(`ElevenLabs API error: ${response.statusText}`);

      const data = await response.json();
      const documents = data.documents || [];

      const remoteFiles = new Map<string, any>();
      for (const doc of documents) {
        const docResponse = await fetch(`https://api.elevenlabs.io/v1/convai/knowledge-base/${doc.id}`, {
          headers: { "xi-api-key": elevenLabsConfig.apiKey },
        });
        if (!docResponse.ok) continue;

        const fullDoc = await docResponse.json();
        const remoteModifiedAt = fullDoc.updated_at || fullDoc.modified_at || null;
        remoteFiles.set(doc.id, {
          name: doc.name,
          content: fullDoc.content || "",
          modifiedAt: remoteModifiedAt ? new Date(remoteModifiedAt) : null,
          agentId: detectAgentId(doc.name, agentNameMap),
          type: doc.type || "file",
        });
      }

      const localFiles: any[] = await deps.storage.getAllKbFiles(tenantId);
      const filesToPush: Array<{ localFile: any; remoteDocId?: string }> = [];
      const filesToPull: Array<{ remoteDocId: string; remoteName: string }> = [];
      const filesToSkip: Array<{ filename: string; reason: string }> = [];
      const warnings: string[] = [];

      const localByDocIdEntries = localFiles
        .map((f: any) => [f.elevenlabsDocId, f] as [string, any])
        .filter((entry: any) => entry[0]);
      const localByDocId = new Map<string, any>(localByDocIdEntries as any);
      const localByFilename = new Map<string, any>(localFiles.map((f: any) => [f.filename, f]) as any);
      const remoteDocIds = new Set(remoteFiles.keys());
      const processedLocalFiles = new Set<string>();

      for (const [remoteDocId, remoteData] of remoteFiles.entries()) {
        const localFile = localByDocId.get(remoteDocId) || localByFilename.get(remoteData.name);
        if (localFile) {
          processedLocalFiles.add(localFile.id);
          if (localFile.currentContent !== remoteData.content) {
            filesToPush.push({ localFile, remoteDocId });
          } else {
            filesToSkip.push({ filename: remoteData.name, reason: "content identical" });
          }
        } else {
          filesToPull.push({ remoteDocId, remoteName: remoteData.name });
        }
      }

      for (const localFile of localFiles) {
        if (processedLocalFiles.has(localFile.id)) continue;

        if (localFile.elevenlabsDocId && !remoteDocIds.has(localFile.elevenlabsDocId)) {
          const localUpdatedAt = localFile.localUpdatedAt || localFile.createdAt;
          warnings.push(
            `File "${localFile.filename}" was deleted from ElevenLabs but exists locally (last local update: ${localUpdatedAt.toISOString()}). Not auto-deleting. Consider manual review.`
          );
        } else {
          filesToPush.push({ localFile });
        }
      }

      let pushedCount = 0;
      let pulledCount = 0;
      let createdRemote = 0;
      let createdLocal = 0;
      let updatedRemote = 0;
      let updatedLocal = 0;

      for (const { localFile, remoteDocId } of filesToPush) {
        try {
          if (remoteDocId) {
            const syncResult = await deps.syncKbDocumentToElevenLabs(
              elevenLabsConfig.apiKey,
              remoteDocId,
              localFile.filename,
              localFile.currentContent,
              tenantId
            );

            if (!syncResult.success) {
              warnings.push(`Failed to update "${localFile.filename}": ${syncResult.error}`);
              continue;
            }

            await deps.storage.updateKbFile(localFile.id, tenantId, {
              elevenLabsUpdatedAt: new Date(),
              lastSyncedSource: "local_to_remote",
              lastSyncedAt: new Date(),
            });

            pushedCount++;
            updatedRemote++;
            continue;
          }

          const createResponse = await fetch("https://api.elevenlabs.io/v1/convai/knowledge-base", {
            method: "POST",
            headers: {
              "xi-api-key": elevenLabsConfig.apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: localFile.filename, content: localFile.currentContent }),
          });

          if (!createResponse.ok) {
            warnings.push(`Failed to push new file "${localFile.filename}": ${await createResponse.text()}`);
            continue;
          }

          const newDoc = await createResponse.json();
          await deps.storage.updateKbFile(localFile.id, tenantId, {
            elevenlabsDocId: newDoc.id,
            elevenLabsUpdatedAt: new Date(),
            lastSyncedSource: "local_to_remote",
            lastSyncedAt: new Date(),
          });

          pushedCount++;
          createdRemote++;
        } catch (error: any) {
          warnings.push(`Failed to push "${localFile.filename}": ${error.message}`);
        }
      }

      for (const { remoteDocId, remoteName } of filesToPull) {
        try {
          const remoteData = remoteFiles.get(remoteDocId);
          if (!remoteData) continue;

          let localFile = localByDocId.get(remoteDocId);
          if (!localFile) localFile = localByFilename.get(remoteName);

          if (localFile) {
            if (localFile.filename !== remoteName) {
              await deps.db.execute(deps.sql`ALTER TABLE kb_files DISABLE TRIGGER enforce_filename_immutability`);
              try {
                await deps.db
                  .update(deps.kbFiles)
                  .set({ filename: remoteName, updatedAt: new Date() })
                  .where(deps.eq(deps.kbFiles.id, localFile.id));
              } finally {
                await deps.db.execute(deps.sql`ALTER TABLE kb_files ENABLE TRIGGER enforce_filename_immutability`);
              }
            }

            const versions = await deps.storage.getKbFileVersions(localFile.id, tenantId);
            const latestVersion = versions[0];
            const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

            const newVersion = await deps.storage.createKbFileVersion({
              tenantId,
              kbFileId: localFile.id,
              versionNumber: newVersionNumber,
              content: remoteData.content,
              source: "elevenlabs_sync",
              createdBy: "system",
            });

            await deps.googleDrive.backupKbFileToDrive(remoteName, newVersionNumber, remoteData.content);
            await deps.storage.updateKbFile(localFile.id, tenantId, {
              currentContent: remoteData.content,
              elevenlabsDocId: remoteDocId,
              currentSyncVersion: newVersion.id,
              agentId: remoteData.agentId,
              elevenLabsUpdatedAt: remoteData.modifiedAt || new Date(),
              lastSyncedSource: "remote_to_local",
              lastSyncedAt: new Date(),
            });

            pulledCount++;
            updatedLocal++;
            continue;
          }

          const newFile = await deps.storage.createKbFile({
            tenantId,
            filename: remoteName,
            elevenlabsDocId: remoteDocId,
            currentContent: remoteData.content,
            fileType: remoteData.type,
            agentId: remoteData.agentId,
            elevenLabsUpdatedAt: remoteData.modifiedAt || new Date(),
            lastSyncedSource: "remote_to_local",
            lastSyncedAt: new Date(),
          });

          const initialVersion = await deps.storage.createKbFileVersion({
            tenantId,
            kbFileId: newFile.id,
            versionNumber: 1,
            content: remoteData.content,
            source: "elevenlabs_sync",
            createdBy: "system",
          });

          await deps.googleDrive.backupKbFileToDrive(remoteName, 1, remoteData.content);
          await deps.storage.updateKbFile(newFile.id, tenantId, { currentSyncVersion: initialVersion.id });

          pulledCount++;
          createdLocal++;
        } catch (error: any) {
          warnings.push(`Failed to pull "${remoteName}": ${error.message}`);
        }
      }

      return res.json({
        success: true,
        pushedCount,
        pulledCount,
        createdLocal,
        createdRemote,
        updatedLocal,
        updatedRemote,
        skipped: filesToSkip.length,
        skippedFiles: filesToSkip,
        warnings,
        totalRemote: documents.length,
        totalLocal: localFiles.length,
      });
    } catch (error: any) {
      console.error("[KB Sync] Error during bidirectional sync:", error);
      return res.status(500).json({ error: error.message || "Failed to sync KB files" });
    }
  };
}
