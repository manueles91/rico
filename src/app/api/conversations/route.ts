import { query, queryOne } from '@/lib/db';
import {
  successResponse,
  createdResponse,
  errorResponse,
  forbiddenResponse,
} from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export interface Conversation {
  id: string;
  account_id: string;
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Helper to check if user has access to an account
async function checkAccountAccess(accountId: string, userId: string): Promise<{ hasAccess: boolean; role: string | null }> {
  const membership = await queryOne(
    'SELECT role FROM account_members WHERE account_id = $1 AND user_id = $2',
    [accountId, userId]
  );
  
  return {
    hasAccess: !!membership,
    role: membership ? membership.role : null
  };
}

// GET /api/conversations - Get all conversations for an account
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const userId = searchParams.get('userId');
    
    if (!accountId) {
      return errorResponse('Account ID is required');
    }
    
    // Verify user has access to the account
    if (userId) {
      const { hasAccess } = await checkAccountAccess(accountId, userId);
      if (!hasAccess) {
        return forbiddenResponse('You do not have access to this account');
      }
    }
    
    // Get conversations with message counts and last message date
    const conversations = await query<Conversation & { message_count: number; last_message_at: string }>(
      `SELECT 
         c.*,
         COUNT(m.id) as message_count,
         MAX(m.created_at) as last_message_at
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE c.account_id = $1
       GROUP BY c.id
       ORDER BY last_message_at DESC NULLS LAST, c.created_at DESC`,
      [accountId]
    );
    
    return successResponse(conversations);
  } catch (error: any) {
    return errorResponse(`Error fetching conversations: ${error.message}`);
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, title, createdBy } = body;
    
    if (!accountId) {
      return errorResponse('Account ID is required');
    }
    
    if (!createdBy) {
      return errorResponse('User ID is required');
    }
    
    // Verify user has access to the account
    const { hasAccess } = await checkAccountAccess(accountId, createdBy);
    if (!hasAccess) {
      return forbiddenResponse('You do not have access to this account');
    }
    
    // Create the conversation with a default title if not provided
    const defaultTitle = 'New Conversation';
    const newConversation = await queryOne<Conversation>(
      `INSERT INTO conversations (account_id, title, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [accountId, title || defaultTitle, createdBy]
    );
    
    return createdResponse(newConversation);
  } catch (error: any) {
    return errorResponse(`Error creating conversation: ${error.message}`);
  }
}
