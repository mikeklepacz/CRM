import { z } from "zod";

export const tenantFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  status: z.enum(["active", "trial", "suspended"]),
});

export type TenantFormData = z.infer<typeof tenantFormSchema>;

export const addUserToTenantSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  roleInTenant: z.enum(["org_admin", "agent"]),
});

export type AddUserToTenantFormData = z.infer<typeof addUserToTenantSchema>;

export const createUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  agentName: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  tenantId: z.string().min(1, "Tenant is required"),
  roleInTenant: z.enum(["org_admin", "agent"]),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  agentName: z.string().optional(),
});

export type EditUserFormData = z.infer<typeof editUserSchema>;
