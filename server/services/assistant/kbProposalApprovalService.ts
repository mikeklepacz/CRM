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

type ServiceError = {
  statusCode: number;
  payload: any;
};

function normalizeForMatching(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function createError(statusCode: number, payload: any): ServiceError {
  return { statusCode, payload };
}

function applyProposalEdits(rawProposedContent: string, baseContent: string): { finalContent: string } | ServiceError {
  let finalContent = baseContent;
  const failedEdits: Array<{ edit: any; reason: string; index: number }> = [];

  try {
    const edits = JSON.parse(rawProposedContent);
    const editArray = Array.isArray(edits) ? edits : [edits];

    const editsWithPosition = editArray.map((edit: any, i: number) => {
      let position = -1;
      if ("old" in edit && edit.old === "" && edit.new) {
        position = finalContent.length;
      } else if (edit.old) {
        position = finalContent.indexOf(edit.old);
        if (position === -1) {
          const normalizedOld = normalizeForMatching(edit.old);
          const normalizedContent = normalizeForMatching(finalContent);
          const fuzzyIndex = normalizedContent.indexOf(normalizedOld);
          if (fuzzyIndex !== -1) {
            let charCount = 0;
            let actualIndex = 0;
            const targetWithoutWS = normalizedContent.substring(0, fuzzyIndex).replace(/\s+/g, "");
            for (let j = 0; j < finalContent.length; j++) {
              if (finalContent[j].match(/\S/)) {
                if (charCount === targetWithoutWS.length) {
                  actualIndex = j;
                  break;
                }
                charCount++;
              }
            }
            position = actualIndex;
          }
        }
      }
      return { edit, originalIndex: i, position };
    });

    editsWithPosition.sort((a, b) => {
      if (a.position === -1 && b.position === -1) return a.originalIndex - b.originalIndex;
      if (a.position === -1) return 1;
      if (b.position === -1) return -1;
      return b.position - a.position;
    });

    console.log(`[KB Approve] Applying ${editsWithPosition.length} edits in reverse position order to prevent text shifting`);

    for (let idx = 0; idx < editsWithPosition.length; idx++) {
      const { edit, originalIndex, position } = editsWithPosition[idx];
      const i = originalIndex;

      if ("old" in edit && edit.old === "" && edit.new) {
        console.log(`[KB Approve] Adding new content (edit ${i + 1}/${editArray.length})`);
        finalContent = finalContent + "\n\n" + edit.new;
        continue;
      }

      if (!edit.old || !edit.new) {
        failedEdits.push({ edit, reason: "Missing old or new text", index: i });
        continue;
      }

      let index = finalContent.indexOf(edit.old);
      if (index === -1) {
        const normalizedOld = normalizeForMatching(edit.old);
        const normalizedContent = normalizeForMatching(finalContent);
        const fuzzyIndex = normalizedContent.indexOf(normalizedOld);
        if (fuzzyIndex !== -1) {
          let charCount = 0;
          let actualIndex = 0;
          const targetWithoutWS = normalizedContent.substring(0, fuzzyIndex).replace(/\s+/g, "");
          for (let j = 0; j < finalContent.length; j++) {
            if (finalContent[j].match(/\S/)) {
              if (charCount === targetWithoutWS.length) {
                actualIndex = j;
                break;
              }
              charCount++;
            }
          }
          index = actualIndex;
          console.log(`[KB Approve] Fuzzy match found for edit ${i + 1} at position ${index}`);
        }
      }

      if (index !== -1) {
        finalContent = finalContent.substring(0, index) + edit.new + finalContent.substring(index + edit.old.length);
        console.log(`[KB Approve] Edit ${i + 1}/${editArray.length} applied successfully (original position: ${position})`);
      } else {
        const preview = edit.old.length > 100 ? `${edit.old.substring(0, 100)}...` : edit.old;
        console.error(`[KB Approve] Edit ${i + 1} FAILED - text not found: "${preview}"`);
        failedEdits.push({ edit, reason: "Original text not found in current file content", index: i });
      }
    }

    if (failedEdits.length > 0) {
      console.error(`[KB Approve] Approval FAILED: ${failedEdits.length}/${editArray.length} edits could not be applied`);
      return createError(422, {
        error: "One or more edits could not be applied",
        failedEdits: failedEdits.map((f) => ({
          editNumber: f.index + 1,
          reason: f.reason,
          oldTextPreview: f.edit.old?.substring(0, 100),
          newTextPreview: f.edit.new?.substring(0, 100),
        })),
        totalEdits: editArray.length,
        failedCount: failedEdits.length,
      });
    }

    console.log(`[KB Approve] All ${editArray.length} edits applied successfully`);
    return { finalContent };
  } catch (error: any) {
    console.error("[KB Approve] Failed to parse/apply edits:", error);
    return createError(400, {
      error: "Failed to parse proposal edits",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function approveKbProposal(params: {
  proposalId: string;
  tenantId: string;
  userId: string;
  syncKbDocumentToElevenLabs: SyncKbDocFn;
  syncKbFileToAlignerVectorStore: SyncAlignerFn;
}): Promise<{ success: true; version: any; syncState: string; elevenlabsSynced: boolean; syncError: string | null; agentsUpdated: number } | ServiceError> {
  const { proposalId, tenantId, userId, syncKbDocumentToElevenLabs, syncKbFileToAlignerVectorStore } = params;
  const proposal = await storage.getKbProposalById(proposalId, tenantId);
  if (!proposal) {
    return createError(404, { error: "Proposal not found" });
  }

  const file = await storage.getKbFileById(proposal.kbFileId, tenantId);
  if (!file) {
    return createError(404, { error: "File not found" });
  }

  const currentVersions = await storage.getKbFileVersions(file.id, tenantId);
  const latestVersion = currentVersions[0];
  if (latestVersion && latestVersion.id !== proposal.baseVersionId) {
    return createError(409, {
      error: "File has been updated since proposal was created. Please review the latest version.",
    });
  }

  const applied = applyProposalEdits(proposal.proposedContent, latestVersion?.content || "");
  if ("statusCode" in applied) {
    return applied;
  }

  const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;
  const newVersion = await storage.createKbFileVersion({
    tenantId,
    kbFileId: file.id,
    versionNumber: newVersionNumber,
    content: applied.finalContent,
    source: "aligner_approved",
    createdBy: userId,
  });

  await googleDrive.backupKbFileToDrive(file.filename, newVersionNumber, applied.finalContent);

  await storage.updateKbFile(file.id, tenantId, {
    currentContent: applied.finalContent,
    currentSyncVersion: newVersion.id,
    localUpdatedAt: new Date(),
  });

  await storage.updateKbProposal(proposalId, tenantId, {
    status: "approved",
    appliedVersionId: newVersion.id,
    reviewedAt: new Date(),
    reviewedBy: userId,
  });

  const elevenLabsConfig = await storage.getElevenLabsConfig(tenantId);
  let syncSuccess = false;
  let syncError: string | null = null;
  let agentsUpdated = 0;

  if (file.syncState === "synced" && elevenLabsConfig?.apiKey && file.elevenlabsDocId) {
    console.log("[KB Approve] Syncing to ElevenLabs (file is in 'synced' state)");
    const syncResult = await syncKbDocumentToElevenLabs(
      elevenLabsConfig.apiKey,
      file.elevenlabsDocId,
      file.filename,
      applied.finalContent,
      tenantId
    );

    if (syncResult.success && syncResult.newDocId) {
      console.log(`[KB Approve] Successfully synced to ElevenLabs (new docId: ${syncResult.newDocId}, agents updated: ${syncResult.agentsUpdated})`);
      await storage.updateKbFile(file.id, tenantId, {
        elevenlabsDocId: syncResult.newDocId,
        lastSyncedAt: new Date(),
      });
      syncSuccess = true;
      agentsUpdated = syncResult.agentsUpdated || 0;
    } else {
      console.error(`[KB Approve] Sync failed: ${syncResult.error}`);
      syncError = syncResult.error || null;
    }
  } else if (file.syncState === "local_only") {
    console.log("[KB Approve] Skipping ElevenLabs sync (file is local-only)");
  }

  const alignerSyncResult = await syncKbFileToAlignerVectorStore(file.id, applied.finalContent, file.filename, tenantId);
  if (!alignerSyncResult.success) {
    console.warn(`[KB Approve] Aligner sync failed (non-critical): ${alignerSyncResult.error}`);
  }

  return {
    success: true,
    version: newVersion,
    syncState: file.syncState || "local_only",
    elevenlabsSynced: syncSuccess,
    syncError,
    agentsUpdated,
  };
}
