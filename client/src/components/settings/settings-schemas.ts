import { z } from 'zod';

export const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  username: z.string().min(1, 'Username is required'),
  agentName: z.string().optional(),
  phone: z.string().optional(),
  meetingLink: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const wooCommerceSchema = z.object({
  url: z.string().url('Invalid URL').min(1, 'WooCommerce URL is required'),
  consumerKey: z.string().min(1, 'Consumer key is required'),
  consumerSecret: z.string().min(1, 'Consumer secret is required'),
});

export const googleOAuthSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
});
