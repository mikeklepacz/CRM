import OpenAI from "openai";

type Params = {
  conversationId: string;
  conversationThreadId: string | null;
  message: string;
  openai: OpenAI;
  settings: any;
  storage: any;
  systemInstructions: string;
  tenantId: string;
};

async function ensureAssistantId(openai: OpenAI, settings: any, storage: any, systemInstructions: string): Promise<string> {
  let assistantId = settings.assistantId;

  if (assistantId) {
    try {
      await openai.beta.assistants.update(assistantId, {
        instructions: systemInstructions,
        tool_resources: {
          file_search: { vector_store_ids: [settings.vectorStoreId] },
        },
      });
      return assistantId;
    } catch {
      assistantId = null;
    }
  }

  const assistant = await openai.beta.assistants.create({
    model: "gpt-4o",
    instructions: systemInstructions,
    tools: [{ type: "file_search" }],
    tool_resources: {
      file_search: { vector_store_ids: [settings.vectorStoreId] },
    },
  });

  await storage.saveOpenaiSettings({ assistantId: assistant.id });
  return assistant.id;
}

async function ensureThreadId(openai: OpenAI, storage: any, conversationId: string, conversationThreadId: string | null, tenantId: string): Promise<string> {
  let threadId = conversationThreadId;

  if (threadId) {
    try {
      await openai.beta.threads.retrieve(threadId);
      return threadId;
    } catch {
      threadId = null;
    }
  }

  const thread = await openai.beta.threads.create();
  await storage.updateConversation(conversationId, tenantId, { threadId: thread.id });
  return thread.id;
}

export async function runOpenaiSalesAssistant(params: Params): Promise<{ assistantMessage: string; responseId: string }> {
  const { conversationId, conversationThreadId, message, openai, settings, storage, systemInstructions, tenantId } = params;

  if (!settings.vectorStoreId) {
    throw new Error("Knowledge base required. Please upload files to the knowledge base before using the Sales Assistant.");
  }

  const assistantId = await ensureAssistantId(openai, settings, storage, systemInstructions);
  const threadId = await ensureThreadId(openai, storage, conversationId, conversationThreadId, tenantId);

  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: message,
  });

  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
  });

  let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: threadId });
  let attempts = 0;
  while (runStatus.status !== "completed" && runStatus.status !== "failed" && attempts < 60) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: threadId });
    attempts++;
  }

  if (runStatus.status !== "completed") {
    throw new Error("Assistant run did not complete successfully");
  }

  const messages = await openai.beta.threads.messages.list(threadId);
  const lastMessage = messages.data[0];
  if (!lastMessage || lastMessage.content[0]?.type !== "text") {
    throw new Error("No response from assistant");
  }

  return {
    assistantMessage: lastMessage.content[0].text.value,
    responseId: run.id,
  };
}
