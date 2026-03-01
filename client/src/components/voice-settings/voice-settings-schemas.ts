import { z } from "zod";

export const configSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  twilioNumber: z.string().optional(),
});

export const agentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  agentId: z.string().min(1, "Agent ID is required"),
  description: z.string().optional(),
  projectId: z.string().optional(),
  phoneNumberId: z.string().optional(),
});
