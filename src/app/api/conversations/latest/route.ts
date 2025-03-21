import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse, forbiddenResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to use this API' },
        { status: 401 }
      );
    }

    // Get the account ID from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return errorResponse('Account ID is required');
    }

    // Verify user has access to the account
    const accountAccess = await queryOne(
      `SELECT am.* 
       FROM account_members am
       WHERE am.account_id = $1 AND am.user_id = $2`,
      [accountId, stackUser.id],
      { useAuthenticated: true }
    );

    if (!accountAccess) {
      return forbiddenResponse('You do not have access to this account');
    }

    // Get the latest conversation for this account
    const conversation = await queryOne(
      `SELECT * 
       FROM conversations 
       WHERE account_id = $1 
       ORDER BY updated_at DESC 
       LIMIT 1`,
      [accountId],
      { useAuthenticated: true }
    );

    if (!conversation) {
      return successResponse({ 
        conversation: null,
        messages: []
      });
    }

    // Get the messages for this conversation
    const messages = await query(
      `SELECT * 
       FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC`,
      [conversation.id],
      { useAuthenticated: true }
    );

    return successResponse({
      conversation,
      messages
    });
  } catch (error) {
    console.error('Error in latest conversation API:', error);
    return errorResponse(error instanceof Error ? error.message : 'An unexpected error occurred');
  }
}
