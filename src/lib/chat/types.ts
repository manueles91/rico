import { z } from 'zod';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Schema for validating chat message requests
export const messageSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
      imageUrl: z.string().optional(),
      imageBase64: z.string().optional(),
    })
  ),
  accountId: z.string().uuid(),
});

export type ChatMessageRequest = z.infer<typeof messageSchema>;

// Type for expense data extracted from chat
export interface ExpenseData {
  amount: number;
  description?: string;
  vendor?: string;
  date?: string;
  categories?: string[];
}

// Type for conversation data
export interface Conversation {
  id: string;
  account_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

// Type for account details
export interface AccountDetails {
  id: string;
  name: string;
  is_personal: boolean;
  expense_count: number;
}

// Type for expense record
export interface Expense {
  id: string;
  account_id: string;
  amount: number;
  description: string;
  vendor?: string;
  date: string;
  categories?: string[];
  created_at: string;
  updated_at: string;
}
