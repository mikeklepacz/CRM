import OpenAI from "openai";
import { storage } from "../../../storage";

type Params = {
  fileId: string;
  tenantId: string;
};

type DeleteResult = {
  success: true;
};

export async function deleteAlignerFile(params: Params): Promise<DeleteResult> {
  const { fileId, tenantId } = params;
  const fileInfo = await storage.getAssistantFileById(fileId);
  if (!fileInfo) {
    throw new Error("File not found");
  }

  const alignerAssistant = await storage.getAssistantBySlug("aligner", tenantId);
  if (!alignerAssistant) {
    throw new Error("Aligner assistant not found for this organization");
  }

  if (fileInfo.assistantId !== alignerAssistant.id) {
    throw new Error("File not found or does not belong to Aligner assistant");
  }

  if (fileInfo.openaiFileId && alignerAssistant.vectorStoreId) {
    try {
      const openaiSettings = await storage.getOpenaiSettings(tenantId);
      if (openaiSettings?.apiKey) {
        const openai = new OpenAI({ apiKey: openaiSettings.apiKey });

        try {
          await (openai.vectorStores.files as any).del(alignerAssistant.vectorStoreId, fileInfo.openaiFileId);
          console.log(`[Aligner Delete] Removed file ${fileInfo.openaiFileId} from vector store`);
        } catch (vectorStoreError: any) {
          console.log(
            `[Aligner Delete] Could not remove from vector store (may already be removed): ${vectorStoreError.message}`
          );
        }

        try {
          await (openai.files as any).del(fileInfo.openaiFileId);
          console.log(`[Aligner Delete] Deleted file ${fileInfo.openaiFileId} from OpenAI`);
        } catch (openaiFileError: any) {
          console.log(`[Aligner Delete] Could not delete from OpenAI (may already be deleted): ${openaiFileError.message}`);
        }
      }
    } catch (openaiError: any) {
      console.error(`[Aligner Delete] OpenAI deletion error: ${openaiError.message}`);
    }
  }

  const deleted = await storage.deleteAssistantFileByAssistantId(fileId, alignerAssistant.id);
  if (!deleted) {
    throw new Error("Failed to delete file from database");
  }

  console.log(`[Aligner Delete] Successfully deleted file: ${fileInfo.filename}`);
  return { success: true };
}
