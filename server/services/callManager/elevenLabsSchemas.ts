import { z } from "zod";

export const elevenLabsConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  twilioNumber: z.string().optional(),
});

export const elevenLabsAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  agentId: z.string().min(1, "Agent ID is required"),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  projectId: z.string().optional().transform((val) => (val === "" ? null : val)),
  phoneNumberId: z.string().optional().transform((val) => (val === "" || val === "__none__" ? null : val)),
});
