import { query, queryOne } from '@/lib/db';
import {
  successResponse,
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

// Helper to check if user has access to a message
async function checkMessageAccess(messageId: string, userId: string): Promise<{ hasAccess: boolean; isSender: boolean }> {
  const message = await queryOne(
    `SELECT m.id, m.sender_id, c.account_id
     FROM messages m
     JOIN conversations c ON m.conversation_id = c.id
     WHERE m.id = $1`,
    [messageId]
  );
  
  if (!message) {
    return { hasAccess: false, isSender: false };
  }
  
  const membership = await queryOne(
    'SELECT 1 FROM account_members WHERE account_id = $1 AND user_id = $2',
    [message.account_id, userId]
  );
  
  return {
    hasAccess: !!membership,
    isSender: message.sender_id === userId
  };
}

// GET /api/messages/[id] - Get a specific message
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: messageId } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    // Verify user has access to the message
    const { hasAccess } = await checkMessageAccess(messageId, userId);
    if (!hasAccess) {
      return forbiddenResponse('You do not have access to this message');
    }
    
    // Get message with attachments
    const message = await queryOne(
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
       WHERE m.id = $1
       GROUP BY m.id, u.name, u.email`,
      [messageId]
    );
    
    if (!message) {
      return notFoundResponse('Message');
    }
    
    return successResponse(message);
  } catch (error: any) {
    return errorResponse(`Error fetching message: ${error.message}`);
  }
}

// DELETE /api/messages/[id] - Delete a message
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id: messageId } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    // Verify user has access to the message
    const { hasAccess, isSender } = await checkMessageAccess(messageId, userId);
    if (!hasAccess) {
      return forbiddenResponse('You do not have access to this message');
    }
    
    // Only allow the sender to delete their own messages
    if (!isSender) {
      return forbiddenResponse('You can only delete your own messages');
    }
    
    // Delete the message (cascading delete will handle attachments)
    await query('DELETE FROM messages WHERE id = $1', [messageId]);
    
    return successResponse({ id: messageId }, 'Message deleted successfully');
  } catch (error: any) {
    return errorResponse(`Error deleting message: ${error.message}`);
  }
}
