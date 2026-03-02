import { z } from "zod";

export const PIPELINE_TYPES = [
  { value: "sales", label: "Sales" },
  { value: "qualification", label: "Qualification" },
  { value: "support", label: "Support" },
  { value: "custom", label: "Custom" },
];

export const STAGE_TYPES = [
  { value: "action", label: "Action" },
  { value: "decision", label: "Decision" },
  { value: "wait", label: "Wait" },
  { value: "complete", label: "Complete" },
];

export const PROJECT_TYPES = [
  { value: "campaign", label: "Campaign" },
  { value: "case", label: "Case" },
  { value: "initiative", label: "Initiative" },
  { value: "custom", label: "Custom" },
];

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const pipelineFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be URL-friendly (lowercase, numbers, hyphens only)"),
  pipelineType: z.enum(["sales", "qualification", "support", "custom"]),
  description: z.string().optional(),
  aiPromptTemplate: z.string().optional(),
  voiceAgentId: z.string().optional(),
  isActive: z.boolean(),
});

export type PipelineFormData = z.infer<typeof pipelineFormSchema>;

export const stageFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  stageType: z.enum(["action", "decision", "wait", "complete"]),
  isTerminal: z.boolean(),
});

export type StageFormData = z.infer<typeof stageFormSchema>;

export const PROJECT_COLORS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#64748b", label: "Slate" },
  { value: "#78716c", label: "Stone" },
];

export const projectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be URL-friendly (lowercase, numbers, hyphens only)"),
  projectType: z.enum(["campaign", "case", "initiative", "custom"]),
  description: z.string().optional(),
  accentColor: z.string().optional(),
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;

export const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["org_admin", "agent"]),
});

export type InviteFormData = z.infer<typeof inviteFormSchema>;

export const createUserFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["org_admin", "agent"]),
});

export type CreateUserFormData = z.infer<typeof createUserFormSchema>;

export const settingsFormSchema = z.object({
  companyName: z.string().optional(),
  timezone: z.string().optional(),
});

export type SettingsFormData = z.infer<typeof settingsFormSchema>;
