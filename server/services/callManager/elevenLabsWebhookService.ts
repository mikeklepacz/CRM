import axios from "axios";
import { storage } from "../../storage";

function extractWebhookSecret(webhook: any): string | undefined {
  return webhook?.webhook_secret || webhook?.signing_secret || webhook?.secret;
}

function toWebhookErrorMessage(error: any): string {
  const errorDetail = error?.response?.data?.detail;
  if (Array.isArray(errorDetail)) {
    return errorDetail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(", ");
  }
  return errorDetail?.message || errorDetail || error?.message || "Webhook registration failed";
}

export function resolveElevenLabsWebhookUrl(fallbackHost?: string): string {
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(",");
    return `https://${domains[0]}/api/elevenlabs/webhook`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}/api/elevenlabs/webhook`;
  }
  if (fallbackHost) {
    return `https://${fallbackHost}/api/elevenlabs/webhook`;
  }
  throw new Error("Unable to determine webhook URL. Deploy environment not configured.");
}

export async function listWorkspaceWebhooks(apiKey: string): Promise<any[]> {
  try {
    const listResponse = await axios.get("https://api.elevenlabs.io/v1/workspace/webhooks", {
      headers: { "xi-api-key": apiKey },
    });
    return listResponse.data?.webhooks || [];
  } catch {
    return [];
  }
}

export function findWebhookByUrl(webhooks: any[], webhookUrl: string): any | undefined {
  return webhooks.find(
    (w: any) =>
      w.url === webhookUrl ||
      w.settings?.url === webhookUrl ||
      w.settings?.webhook_url === webhookUrl ||
      w.webhook_url === webhookUrl
  );
}

async function createWorkspaceWebhook(apiKey: string, webhookUrl: string) {
  return axios.post(
    "https://api.elevenlabs.io/v1/workspace/webhooks",
    {
      settings: {
        auth_type: "hmac",
        webhook_url: webhookUrl,
        name: "CRM Auto-Registered Webhook",
        events: ["post_call_transcription", "call_initiation_failure"],
      },
    },
    {
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
    }
  );
}

export async function ensureWebhookRegistration(tenantId: string, apiKey: string, webhookUrl: string) {
  let webhookRegistered = false;
  let webhookError: string | null = null;

  try {
    const existingWebhooks = await listWorkspaceWebhooks(apiKey);
    const existingWebhook = findWebhookByUrl(existingWebhooks, webhookUrl);

    if (existingWebhook) {
      const webhookSecret = extractWebhookSecret(existingWebhook);
      if (webhookSecret) {
        await storage.updateElevenLabsConfig(tenantId, { webhookSecret });
        webhookRegistered = true;
      } else {
        let deleteSucceeded = false;
        try {
          await axios.delete(`https://api.elevenlabs.io/v1/workspace/webhooks/${existingWebhook.webhook_id}`, {
            headers: { "xi-api-key": apiKey },
          });
          deleteSucceeded = true;
        } catch {
          webhookError =
            "Existing webhook found but could not delete/recreate. Please delete manually in ElevenLabs dashboard.";
        }
        if (!deleteSucceeded) {
          return { webhookRegistered, webhookError };
        }
      }
    }

    if (!webhookRegistered) {
      const response = await createWorkspaceWebhook(apiKey, webhookUrl);
      const webhookSecret = extractWebhookSecret(response.data);
      if (webhookSecret) {
        await storage.updateElevenLabsConfig(tenantId, { webhookSecret });
      }
      webhookRegistered = true;
    }
  } catch (error: any) {
    webhookError = toWebhookErrorMessage(error);
  }

  return { webhookRegistered, webhookError };
}

export async function registerWebhookIfMissing(tenantId: string, apiKey: string, webhookUrl: string) {
  const existingWebhooks = await listWorkspaceWebhooks(apiKey);
  const existingWebhook = findWebhookByUrl(existingWebhooks, webhookUrl);

  if (existingWebhook) {
    const webhookSecret = extractWebhookSecret(existingWebhook);
    if (webhookSecret) {
      await storage.updateElevenLabsConfig(tenantId, { webhookSecret });
    }
    return {
      alreadyRegistered: true,
      webhookId: existingWebhook.webhook_id,
      events: existingWebhook.events || ["post_call_transcription"],
    };
  }

  const response = await createWorkspaceWebhook(apiKey, webhookUrl);
  const webhookSecret = extractWebhookSecret(response.data);
  if (webhookSecret) {
    await storage.updateElevenLabsConfig(tenantId, { webhookSecret });
  }

  return {
    alreadyRegistered: false,
    webhookId: response.data?.webhook_id || response.data?.id,
    events: ["post_call_transcription", "call_initiation_failure"],
  };
}

export function formatWebhookRegistrationError(error: any) {
  const message = toWebhookErrorMessage(error);
  return {
    status: error?.response?.status || 500,
    message,
    details: error?.response?.data,
  };
}
