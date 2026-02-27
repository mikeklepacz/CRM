import axios from "axios";
import OpenAI, { toFile } from "openai";
import { storage } from "../../storage";

type Deps = {
  checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
  isAuthenticated: any;
};

export function buildOpenaiFilesUploadHandler(deps: Deps) {
  return async (req: any, res: any) => {
    try {
      console.log("📤 [FILE UPLOAD] Starting file upload...");

      const user = await storage.getUser(req.user.isPasswordAuth ? req.user.id : req.user.claims.sub);
      const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { filename, content, category, productCategory, description } = req.body;
      console.log("📤 [FILE UPLOAD] File details:", {
        filename,
        contentLength: content?.length || 0,
        category,
        productCategory,
        description,
      });

      if (!filename || !content) {
        return res.status(400).json({ message: "Filename and content required" });
      }

      const settings = await storage.getOpenaiSettings(req.user.tenantId);
      if (!settings?.apiKey) {
        return res.status(400).json({ message: "OpenAI API key not configured" });
      }
      console.log("📤 [FILE UPLOAD] OpenAI settings retrieved, API key exists:", !!settings.apiKey);
      console.log("📤 [FILE UPLOAD] Existing vector store ID:", settings.vectorStoreId || "none");

      const openai = new OpenAI({ apiKey: settings.apiKey });
      console.log("📤 [FILE UPLOAD] OpenAI client initialized");
      console.log("📤 [FILE UPLOAD] OpenAI beta available:", !!openai.beta);
      console.log("📤 [FILE UPLOAD] OpenAI beta.vectorStores available:", !!(openai as any).beta?.vectorStores);

      const fs = await import("fs/promises");
      const path = await import("path");
      const os = await import("os");
      const { randomUUID } = await import("crypto");

      const safeFilename = path.basename(filename);
      const uniqueSuffix = randomUUID();
      const tmpFilename = `${uniqueSuffix}-${safeFilename}`;
      const tmpDir = os.tmpdir();
      const tmpFilePath = path.join(tmpDir, tmpFilename);
      console.log("📤 [FILE UPLOAD] Temp file path:", tmpFilePath);

      let file: any;
      try {
        console.log("📤 [FILE UPLOAD] Writing file to temp location...");
        await fs.writeFile(tmpFilePath, content, "utf-8");
        console.log("📤 [FILE UPLOAD] File written successfully");

        const fileHandle = await fs.open(tmpFilePath, "r");
        console.log("📤 [FILE UPLOAD] Uploading to OpenAI...");
        file = await openai.files.create({
          file: await toFile(fileHandle.createReadStream(), safeFilename),
          purpose: "assistants",
        });
        await fileHandle.close();
        console.log("📤 [FILE UPLOAD] File uploaded to OpenAI, file ID:", file.id);
      } finally {
        await fs.unlink(tmpFilePath).catch(() => {});
        console.log("📤 [FILE UPLOAD] Temp file cleaned up");
      }

      let vectorStoreId = settings.vectorStoreId;
      if (!vectorStoreId) {
        console.log("📤 [FILE UPLOAD] No vector store exists, creating new one via REST API...");
        const vectorStoreResponse = await axios.post(
          "https://api.openai.com/v1/vector_stores",
          { name: "Sales Knowledge Base" },
          {
            headers: {
              Authorization: `Bearer ${settings.apiKey}`,
              "Content-Type": "application/json",
              "OpenAI-Beta": "assistants=v2",
            },
          }
        );
        vectorStoreId = vectorStoreResponse.data.id;
        console.log("📤 [FILE UPLOAD] Vector store created:", vectorStoreId);
        await storage.saveOpenaiSettings(req.user.tenantId, { vectorStoreId });
        console.log("📤 [FILE UPLOAD] Vector store ID saved to database");
      } else {
        console.log("📤 [FILE UPLOAD] Using existing vector store:", vectorStoreId);
      }

      console.log("📤 [FILE UPLOAD] Saving file metadata to database...");
      const fileRecord = await storage.createKnowledgeBaseFile({
        tenantId: req.user.tenantId,
        filename: filename.replace(/[^a-zA-Z0-9.-]/g, "_"),
        originalName: filename,
        fileSize: content.length,
        mimeType: "text/plain",
        openaiFileId: file.id,
        uploadedBy: user?.id || req.user.id,
        category: category || "general",
        productCategory: productCategory || null,
        description: description || null,
        processingStatus: "uploading",
        isActive: true,
      });
      console.log("📤 [FILE UPLOAD] File metadata saved, record ID:", fileRecord.id);

      await storage.updateKnowledgeBaseFileStatus(fileRecord.id, req.user.tenantId, "processing");
      console.log("📤 [FILE UPLOAD] Status updated to: processing");

      console.log("📤 [FILE UPLOAD] Adding file to vector store using SDK...");
      try {
        const vectorStoreFile = await openai.vectorStores.files.create(vectorStoreId as string, {
          file_id: file.id,
        });
        console.log("📤 [FILE UPLOAD] ✅ File added to vector store. Status:", vectorStoreFile.status);

        console.log("📤 [FILE UPLOAD] Verifying file in vector store...");
        try {
          const filesInStore = await openai.vectorStores.files.list(vectorStoreId as string, { limit: 10 });
          const ourFile = filesInStore.data.find((item) => item.id === file.id);
          if (ourFile) {
            console.log(`📤 [FILE UPLOAD] ✅ VERIFIED: File found in vector store with status: ${ourFile.status}`);
          } else {
            console.log("📤 [FILE UPLOAD] ⚠️ WARNING: File not found in vector store list (may still be processing)");
          }
          console.log(`📤 [FILE UPLOAD] Total files in vector store: ${filesInStore.data.length}`);
        } catch (verifyError: any) {
          console.error("📤 [FILE UPLOAD] ⚠️ Could not verify file in vector store:", verifyError.message);
        }
      } catch (vectorError: any) {
        console.error("📤 [FILE UPLOAD] ❌ FAILED to add file to vector store:", vectorError.message);
        console.error("📤 [FILE UPLOAD] Error details:", vectorError);
        await storage.updateKnowledgeBaseFileStatus(fileRecord.id, req.user.tenantId, "failed");
        throw new Error(`Vector store attachment failed: ${vectorError.message}`);
      }

      console.log("📤 [FILE UPLOAD] Waiting for file to be processed...");
      let processingComplete = false;
      let attempts = 0;
      const maxAttempts = 60;

      while (!processingComplete && attempts < maxAttempts) {
        const statusResponse = await axios.get(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files/${file.id}`, {
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            "OpenAI-Beta": "assistants=v2",
          },
        });

        const status = statusResponse.data.status;
        console.log("📤 [FILE UPLOAD] Processing status:", status, "attempt:", attempts + 1);

        if (status === "completed") {
          processingComplete = true;
          console.log("📤 [FILE UPLOAD] File processing completed!");
          await storage.updateKnowledgeBaseFileStatus(fileRecord.id, req.user.tenantId, "ready");
          console.log("📤 [FILE UPLOAD] Status updated to: ready");
        } else if (status === "failed") {
          await storage.updateKnowledgeBaseFileStatus(fileRecord.id, req.user.tenantId, "failed");
          console.log("📤 [FILE UPLOAD] Status updated to: failed");
          throw new Error("File processing failed in vector store");
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      if (!processingComplete) {
        console.log("📤 [FILE UPLOAD] ⚠️ File processing timeout, but file may still complete");
      }

      console.log("📤 [FILE UPLOAD] File added to vector store successfully");
      console.log("📤 [FILE UPLOAD] ✅ Upload completed successfully!");
      res.json({ success: true, file: fileRecord });
    } catch (error: any) {
      console.error("📤 [FILE UPLOAD] ❌ ERROR:", error.message);
      console.error("📤 [FILE UPLOAD] Stack trace:", error.stack);
      console.error("📤 [FILE UPLOAD] Full error object:", error);
      res.status(500).json({ message: error.message || "Failed to upload file" });
    }
  };
}
