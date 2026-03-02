import OpenAI from "openai";
import { storage } from "../../../storage";

type Params = {
  tenantId: string;
};

export async function syncAlignerKbFiles(params: Params): Promise<any> {
  const { tenantId } = params;
  console.log("[Aligner Sync] Starting KB files sync to OpenAI vector store...");

  const alignerAssistant = await storage.getAssistantBySlug("aligner", tenantId);
  if (!alignerAssistant) {
    throw new Error("Aligner assistant not found for this organization");
  }
  if (!alignerAssistant.assistantId) {
    throw new Error("Aligner assistant ID not configured. Please set the assistant ID first.");
  }

  const openaiSettings = await storage.getOpenaiSettings(tenantId);
  if (!openaiSettings?.apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const openai = new OpenAI({ apiKey: openaiSettings.apiKey });
  let vectorStoreId = alignerAssistant.vectorStoreId;

  if (!vectorStoreId) {
    console.log("[Aligner Sync] Creating new vector store for Aligner...");
    const vectorStore = await openai.vectorStores.create({ name: "Aligner KB Files" });
    vectorStoreId = vectorStore.id;

    await storage.updateAssistant(alignerAssistant.id, { vectorStoreId });
    await openai.beta.assistants.update(alignerAssistant.assistantId, {
      tools: [{ type: "file_search" }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStoreId],
        },
      },
    });
    console.log("[Aligner Sync] Vector store created and linked:", vectorStoreId);
  } else {
    console.log("[Aligner Sync] Using existing vector store:", vectorStoreId);
  }

  const dbFiles = await storage.getAssistantFiles(alignerAssistant.id);
  console.log(`[Aligner Sync] Found ${dbFiles.length} files in database`);

  let vectorStoreFiles: any[] = [];
  try {
    const response = await openai.vectorStores.files.list(vectorStoreId, { limit: 100 });
    vectorStoreFiles = response.data || [];
    console.log(`[Aligner Sync] Found ${vectorStoreFiles.length} files in OpenAI vector store`);
  } catch (error: any) {
    console.error("[Aligner Sync] Error listing vector store files:", error);
  }

  const vectorStoreFileIds = new Set(vectorStoreFiles.map((file) => file.id));
  const missingFiles = dbFiles.filter((file) => !vectorStoreFileIds.has(file.openaiFileId));
  console.log(`[Aligner Sync] Found ${missingFiles.length} files missing from vector store`);

  let resynced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const file of missingFiles) {
    try {
      console.log(`[Aligner Sync] Re-adding file to vector store: ${file.filename}`);
      await openai.vectorStores.files.create(vectorStoreId, { file_id: file.openaiFileId });
      resynced++;
    } catch (error: any) {
      console.error(`[Aligner Sync] Failed to re-add ${file.filename}:`, error);
      failed++;
      errors.push(`${file.filename}: ${error.message}`);
    }
  }

  const summary = {
    success: true,
    totalInDb: dbFiles.length,
    totalInVectorStore: vectorStoreFiles.length,
    resynced,
    failed,
    alreadySynced: dbFiles.length - missingFiles.length,
    errors: errors.length > 0 ? errors : undefined,
  };

  console.log("[Aligner Sync] Complete:", summary);
  return summary;
}
