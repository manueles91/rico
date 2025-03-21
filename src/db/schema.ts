import { z } from 'zod';

/**
 * Zod schemas for database entities
 * These are used for validation and type safety
 */

// User schema
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type User = z.infer<typeof userSchema>;

// Account schema
export const accountSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  is_personal: z.boolean(),
  created_by: z.string().uuid(),
  created_at: z.date(),
  updated_at: z.date().nullable(),
  is_deleted: z.boolean().default(false),
  deleted_at: z.date().nullable(),
});

export type Account = z.infer<typeof accountSchema>;

// Account member schema
export const accountMemberSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  account_id: z.string().uuid(),
  role: z.enum(['owner', 'editor', 'viewer']),
  created_at: z.string().datetime()
});

export type AccountMember = z.infer<typeof accountMemberSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  name: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  created_at: z.string().datetime(),
  created_by: z.string().uuid().nullable()
});

export type Category = z.infer<typeof categorySchema>;

// Expense schema
export const expenseSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().nullable(),
  vendor: z.string().nullable(),
  date: z.string().datetime(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  receipt_url: z.string().nullable(),
  metadata: z.record(z.any()).nullable()
});

export type Expense = z.infer<typeof expenseSchema>;

// Expense with categories schema (for the view)
export const expenseWithCategoriesSchema = expenseSchema.extend({
  category_ids: z.array(z.string().uuid()).nullable(),
  category_names: z.array(z.string()).nullable()
});

export type ExpenseWithCategories = z.infer<typeof expenseWithCategoriesSchema>;

// Expense category schema
export const expenseCategorySchema = z.object({
  id: z.string().uuid(),
  expense_id: z.string().uuid(),
  category_id: z.string().uuid(),
  created_at: z.string().datetime()
});

export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;

// Conversation schema
export const conversationSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  title: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type Conversation = z.infer<typeof conversationSchema>;

// Message schema
export const messageSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  is_from_ai: z.boolean(),
  content: z.string().nullable(),
  created_at: z.string().datetime(),
  metadata: z.record(z.any()).nullable()
});

export type Message = z.infer<typeof messageSchema>;

// Attachment schema
export const attachmentSchema = z.object({
  id: z.string().uuid(),
  message_id: z.string().uuid(),
  file_url: z.string(),
  file_type: z.string(),
  created_at: z.string().datetime()
});

export type Attachment = z.infer<typeof attachmentSchema>;

// Invitation schema
export const invitationSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['editor', 'viewer']),
  token: z.string(),
  invited_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  accepted_at: z.string().datetime().nullable()
});

export type Invitation = z.infer<typeof invitationSchema>;

// ShareableLink schema
export const ShareableLinkSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  token: z.string(),
  created_by: z.string().uuid(),
  expires_at: z.date(),
  created_at: z.date(),
  updated_at: z.date().nullable(),
});

export type ShareableLink = z.infer<typeof ShareableLinkSchema>;
