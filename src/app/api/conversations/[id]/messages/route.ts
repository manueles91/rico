import { query, queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  errorResponse,
  forbiddenResponse,
} from '@/lib/api-utils';
import { NextRequest } from 'next/server';

interface Params {
  params: {
    id: string;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_ai: boolean;
  created_at: string;
}

// Helper to check if user has access to a conversation
async function checkConversationAccess(conversationId: string, userId: string): Promise<{ hasAccess: boolean; accountId: string | null }> {
  const conversation = await queryOne(
    'SELECT account_id FROM conversations WHERE id = $1',
    [conversationId]
  );
  
  if (!conversation) {
    return { hasAccess: false, accountId: null };
  }
  
  const membership = await queryOne(
    'SELECT 1 FROM account_members WHERE account_id = $1 AND user_id = $2',
    [conversation.account_id, userId]
  );
  
  return {
    hasAccess: !!membership,
    accountId: conversation.account_id
  };
}

// GET /api/conversations/[id]/messages - Get messages for a conversation
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: conversationId } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    // Verify user has access to the conversation
    const { hasAccess } = await checkConversationAccess(conversationId, userId);
    if (!hasAccess) {
      return forbiddenResponse('You do not have access to this conversation');
    }
    
    // Get message count for pagination
    const messageCount = await queryOne(
      'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1',
      [conversationId]
    );
    
    // Get messages with attachments and sender details
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
      [conversationId, limit, offset]
    );
    
    return successResponse({
      messages,
      pagination: {
        page,
        limit,
        total: parseInt(messageCount.count) || 0,
        total_pages: Math.ceil(parseInt(messageCount.count) / limit)
      }
    });
  } catch (error: any) {
    return errorResponse(`Error fetching messages: ${error.message}`);
  }
}

// POST /api/conversations/[id]/messages - Add a message to a conversation
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: conversationId } = params;
    const body = await request.json();
    const { content, senderId, isAi = false, attachments = [] } = body;
    
    if (!content && attachments.length === 0) {
      return errorResponse('Message content or attachments are required');
    }
    
    if (!senderId) {
      return errorResponse('Sender ID is required');
    }
    
    // Verify user has access to the conversation
    const { hasAccess, accountId } = await checkConversationAccess(conversationId, senderId);
    if (!hasAccess || !accountId) {
      return forbiddenResponse('You do not have access to this conversation');
    }
    
    // Update conversation timestamp
    await query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId]
    );
    
    let newMessage;
    
    // Use transaction if there are attachments
    if (attachments.length > 0) {
      newMessage = await transaction(async (client) => {
        // Insert message
        const messageResult = await client.query(
          `INSERT INTO messages (conversation_id, sender_id, content, is_ai)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [conversationId, senderId, content || '', isAi]
        );
        
        const message = messageResult.rows[0];
        
        // Insert attachments
        for (const attachment of attachments) {
          if (attachment.fileUrl && attachment.fileType) {
            await client.query(
              `INSERT INTO attachments (message_id, file_url, file_type)
               VALUES ($1, $2, $3)`,
              [message.id, attachment.fileUrl, attachment.fileType]
            );
          }
        }
        
        // Get message with attachments
        const fullMessageResult = await client.query(
          `SELECT 
             m.*,
             json_agg(
               json_build_object(
                 'id', a.id,
                 'file_url', a.file_url,
                 'file_type', a.file_type
               )
             ) FILTER (WHERE a.id IS NOT NULL) as attachments
           FROM messages m
           LEFT JOIN attachments a ON m.id = a.message_id
           WHERE m.id = $1
           GROUP BY m.id`,
          [message.id]
        );
        
        return fullMessageResult.rows[0];
      });
    } else {
      // Simple message without attachments
      newMessage = await queryOne<Message>(
        `INSERT INTO messages (conversation_id, sender_id, content, is_ai)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [conversationId, senderId, content, isAi]
      );
    }
    
    return createdResponse(newMessage);
  } catch (error: any) {
    return errorResponse(`Error creating message: ${error.message}`);
  }
}
