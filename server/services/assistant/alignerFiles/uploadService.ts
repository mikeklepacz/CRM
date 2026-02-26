import OpenAI, { toFile } from "openai";
import { storage } from "../../../storage";

type Params = {
  category?: string;
  file: any;
  tenantId: string;
  userId: string;
};

async function attachFileToVectorStore(
  openai: OpenAI,
  vectorStoreId: string,
  uploadedFileId: string
): Promise<void> {
  console.log(`[Aligner Upload] Adding file to vector store: ${vectorStoreId}`);
  const vectorStoreFile = await openai.vectorStores.files.create(vectorStoreId, {
    file_id: uploadedFileId,
  });
  console.log(`[Aligner Upload] ✅ File added to vector store. Status: ${vectorStoreFile.status}`);

  console.log("[Aligner Upload] Polling file status to verify processing...");
  let attempt = 0;
  const maxAttempts = 30;
  let finalStatus = vectorStoreFile.status;

  while (attempt < maxAttempts) {
    try {
      const fileStatus = await openai.vectorStores.files.retrieve(uploadedFileId, {
        vector_store_id: vectorStoreId,
      });
      finalStatus = fileStatus.status;
      console.log(`[Aligner Upload] File status: ${fileStatus.status} (attempt ${attempt + 1}/${maxAttempts})`);

      if (fileStatus.status === "completed") {
        console.log("[Aligner Upload] ✅ File processing completed successfully");
        break;
      }
      if (fileStatus.status === "failed") {
        console.error("[Aligner Upload] ❌ File processing FAILED");
        console.error(`[Aligner Upload] Error code: ${fileStatus.last_error?.code || "unknown"}`);
        console.error(
          `[Aligner Upload] Error message: ${fileStatus.last_error?.message || "No error message provided"}`
        );
        console.error("[Aligner Upload] Full error object:", JSON.stringify(fileStatus.last_error, null, 2));
        throw new Error(`OpenAI failed to process file: ${fileStatus.last_error?.message || "Unknown error"}`);
      }
      if (fileStatus.status === "cancelled") {
        console.error("[Aligner Upload] ⚠️ File processing was cancelled");
        throw new Error("File processing was cancelled");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempt++;
    } catch (pollError: any) {
      if (pollError.message.includes("OpenAI failed to process file") || pollError.message.includes("cancelled")) {
        throw pollError;
      }
      console.error(`[Aligner Upload] Error polling file status (attempt ${attempt + 1}):`, pollError.message);
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (attempt >= maxAttempts && finalStatus === "in_progress") {
    console.warn(`[Aligner Upload] ⚠️ File still processing after ${maxAttempts} seconds. Status: ${finalStatus}`);
  }

  console.log("[Aligner Upload] Verifying file in vector store...");
  try {
    const filesInStore = await openai.vectorStores.files.list(vectorStoreId, { limit: 10 });
    const ourFile = filesInStore.data.find((file) => file.id === uploadedFileId);
    if (ourFile) {
      console.log(`[Aligner Upload] ✅ VERIFIED: File found in vector store with status: ${ourFile.status}`);
    } else {
      console.log("[Aligner Upload] ⚠️ WARNING: File not found in vector store list");
    }
    console.log(`[Aligner Upload] Total files in vector store: ${filesInStore.data.length}`);
  } catch (verifyError: any) {
    console.error("[Aligner Upload] ⚠️ Could not verify file in vector store:", verifyError.message);
  }
}

export async function uploadAlignerFile(params: Params): Promise<{ file: any }> {
  const { category, file, tenantId, userId } = params;
  if (!file) {
    throw new Error("File is required");
  }

  const assistant = await storage.getAssistantBySlug("aligner", tenantId);
  if (!assistant) {
    throw new Error("Aligner assistant not found for this organization");
  }

  const openaiSettings = await storage.getOpenaiSettings(tenantId);
  if (!openaiSettings?.apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const openai = new OpenAI({ apiKey: openaiSettings.apiKey });
  const fs = await import("fs/promises");
  const path = await import("path");
  const os = await import("os");

  const tmpDir = os.tmpdir();
  const safeFilename = path.basename(file.originalname);
  const tmpFilePath = path.join(tmpDir, `aligner-upload-${Date.now()}-${safeFilename}`);

  await fs.writeFile(tmpFilePath, file.buffer);
  console.log(`[Aligner Upload] Temp file created: ${tmpFilePath} (${file.size} bytes)`);

  const fileStream = await fs.open(tmpFilePath, "r");
  const uploadedFile = await openai.files.create({
    file: await toFile(fileStream.createReadStream(), file.originalname),
    purpose: "assistants",
  });

  await fileStream.close();
  await fs.unlink(tmpFilePath);
  console.log(`[Aligner Upload] ✅ File uploaded to OpenAI: ${uploadedFile.id}`);

  if (assistant.vectorStoreId) {
    try {
      await attachFileToVectorStore(openai, assistant.vectorStoreId, uploadedFile.id);
    } catch (vectorError: any) {
      console.error("[Aligner Upload] ❌ FAILED to add file to vector store:", vectorError.message);
      console.error("[Aligner Upload] Error details:", vectorError);
      throw new Error(`Vector store attachment failed: ${vectorError.message}`);
    }
  } else {
    console.log("[Aligner Upload] ⚠️ No vector store configured for assistant");
  }

  const dbFile = await storage.createAssistantFile({
    tenantId,
    assistantId: assistant.id,
    filename: file.originalname,
    openaiFileId: uploadedFile.id,
    fileSize: file.size,
    uploadedBy: userId,
    category: category || "general",
  });

  console.log(`[Aligner Upload] ✅ File uploaded successfully: ${file.originalname}`);
  return { file: dbFile };
}
