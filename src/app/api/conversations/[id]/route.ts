import { query, queryOne } from '@/lib/db';
import {
  successResponse,
  notFoundResponse,
  errorResponse,
  forbiddenResponse,
} from '@/lib/api-utils';
import { NextRequest } from 'next/server';
import { Conversation } from '../route';

export const dynamic = 'force-dynamic';

interface Params {
  params: {
    id: string;
  };
}

// Helper to check if user has access to a conversation
async function checkConversationAccess(conversationId: string, userId: string): Promise<{ hasAccess: boolean; role: string | null; conversation: Conversation | null }> {
  const conversation = await queryOne<Conversation>(
    'SELECT * FROM conversations WHERE id = $1',
    [conversationId]
  );
  
  if (!conversation) {
    return { hasAccess: false, role: null, conversation: null };
  }
  
  const membership = await queryOne(
    'SELECT role FROM account_members WHERE account_id = $1 AND user_id = $2',
    [conversation.account_id, userId]
  );
  
  return {
    hasAccess: !!membership,
    role: membership ? membership.role : null,
    conversation
  };
}

// GET /api/conversations/[id] - Get a specific conversation with messages
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    // Verify user has access to the conversation
    const { hasAccess, conversation } = await checkConversationAccess(id, userId);
    
    if (!conversation) {
      return notFoundResponse('Conversation');
    }
    
    if (!hasAccess) {
      return forbiddenResponse('You do not have access to this conversation');
    }
    
    // Get the conversation with message count
    const conversationWithCount = await queryOne(
      `SELECT 
         c.*,
         COUNT(m.id) as message_count
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    );
    
    // Get messages for the conversation
    const messages = await query(
      `SELECT 
         m.*,
         u.name as sender_name,
         u.email as sender_email,
         json_agg(
           CASE WHEN a.id IS NOT NULL THEN
             json_build_object(
               'id', a.id,
               'file_url', a.file_url,
               'file_type', a.file_type
             )
           ELSE NULL
           END
         ) FILTER (WHERE a.id IS NOT NULL) as attachments
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       LEFT JOIN attachments a ON m.id = a.message_id
       WHERE m.conversation_id = $1
       GROUP BY m.id, u.name, u.email
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit.toString(), offset.toString()]
    );
    
    return successResponse({
      ...conversationWithCount,
      messages,
      pagination: {
        page,
        limit,
        total: parseInt(conversationWithCount.message_count) || 0,
        total_pages: Math.ceil(parseInt(conversationWithCount.message_count) / limit)
      }
    });
  } catch (error: any) {
    return errorResponse(`Error fetching conversation: ${error.message}`);
  }
}

// PUT /api/conversations/[id] - Update a conversation
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, userId } = body;
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    // Verify user has access to the conversation
    const { hasAccess, conversation } = await checkConversationAccess(id, userId);
    
    if (!conversation) {
      return notFoundResponse('Conversation');
    }
    
    if (!hasAccess) {
      return forbiddenResponse('You do not have access to this conversation');
    }
    
    // Update the conversation
    const updatedConversation = await queryOne<Conversation>(
      `UPDATE conversations
       SET title = COALESCE($1, title),
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [title, id]
    );
    
    return successResponse(updatedConversation);
  } catch (error: any) {
    return errorResponse(`Error updating conversation: ${error.message}`);
  }
}

// DELETE /api/conversations/[id] - Delete a conversation
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    // Verify user has access to the conversation
    const { hasAccess, role, conversation } = await checkConversationAccess(id, userId);
    
    if (!conversation) {
      return notFoundResponse('Conversation');
    }
    
    if (!hasAccess) {
      return forbiddenResponse('You do not have access to this conversation');
    }
    
    // Only allow delete for creator or admin
    if (conversation.created_by !== userId && role !== 'admin') {
      return forbiddenResponse('Only the creator or account admins can delete this conversation');
    }
    
    // Delete the conversation (cascading delete will handle messages and attachments)
    await query('DELETE FROM conversations WHERE id = $1', [id]);
    
    return successResponse({ id }, 'Conversation deleted successfully');
  } catch (error: any) {
    return errorResponse(`Error deleting conversation: ${error.message}`);
  }
}
