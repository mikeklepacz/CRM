import { z } from "zod";

export const updateTemplateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  type: z.enum(["Email", "Script"]).optional(),
  tags: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});
