import OpenAI from "openai";

export async function addCallsToThreadInMicroBatches(
  openai: OpenAI,
  threadId: string,
  calls: any[],
  callsPerBatch: number = 2
): Promise<void> {
  const batches = [];
  for (let i = 0; i < calls.length; i += callsPerBatch) {
    batches.push(calls.slice(i, i + callsPerBatch));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchLabel = `Batch ${i + 1}/${batches.length}`;
    const transcriptContent = batch
      .filter((call) => call.transcripts && call.transcripts.length > 0)
      .map((call, idx) => {
        const fullTranscript = call.transcripts.map((t: any) => `${t.role}: ${t.message}`).join("\n");
        const storeInfo = call.client?.data?.Name ? ` (Store: ${call.client.data.Name})` : "";
        const overallIdx = i * callsPerBatch + idx + 1;
        return `\n#### Call ${overallIdx}${storeInfo}\n- Duration: ${call.session?.callDurationSecs || "N/A"}s\n- Outcome: ${call.session?.status}\n- Interest Level: ${call.session?.interestLevel || "N/A"}\n- Transcript:\n\`\`\`\n${fullTranscript}\n\`\`\``;
      })
      .join("\n");

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: `${batchLabel}:\n${transcriptContent}`,
    });

    if (i < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

export function createSyncKbFileToAlignerVectorStore(storage: any) {
  return async function syncKbFileToAlignerVectorStore(
    kbFileId: string,
    content: string,
    filename: string,
    tenantId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const alignerAssistant = await storage.getAssistantBySlug("aligner", tenantId);
      if (!alignerAssistant?.assistantId || !alignerAssistant.vectorStoreId) {
        return { success: false, error: "Aligner not configured with vector store" };
      }

      const openaiSettings = await storage.getOpenaiSettings(tenantId);
      if (!openaiSettings?.apiKey) {
        return { success: false, error: "OpenAI API key not configured" };
      }

      const openai = new OpenAI({ apiKey: openaiSettings.apiKey });
      const fs = await import("fs/promises");
      const path = await import("path");
      const os = await import("os");
      const tmpDir = os.tmpdir();
      const tmpFilePath = path.join(tmpDir, `aligner-${Date.now()}-${filename}`);
      await fs.writeFile(tmpFilePath, content, "utf-8");

      const fileStream = await fs.open(tmpFilePath, "r");
      const uploadedFile = await openai.files.create({
        file: fileStream.createReadStream(),
        purpose: "assistants",
      });
      await fileStream.close();
      await fs.unlink(tmpFilePath);

      await openai.vectorStores.files.create(alignerAssistant.vectorStoreId, {
        file_id: uploadedFile.id,
      });

      return { success: true };
    } catch (error: any) {
      console.error(`[Auto-Sync] Failed to sync ${filename}:`, error);
      return { success: false, error: error.message };
    }
  };
}

export function columnIndexToLetter(index: number): string {
  let letter = "";
  let num = index;

  while (num >= 0) {
    letter = String.fromCharCode((num % 26) + 65) + letter;
    num = Math.floor(num / 26) - 1;
  }

  return letter;
}
