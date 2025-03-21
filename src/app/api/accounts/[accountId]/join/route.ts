import { NextRequest } from 'next/server';
import { query, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { stackServerApp } from '@/stack';

// POST /api/accounts/[accountId]/join - Join an account using a shareable link
export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const { accountId } = params;
    
    // Get the current authenticated user from Stack Auth
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) {
      return errorResponse('User not authenticated', 401);
    }
    
    // Get the request body
    const body = await request.json();
    const { token } = body;
    
    if (!token) {
      return errorResponse('Token is required', 400);
    }
    
    // Check if the shareable link exists and is valid
    const shareableLink = await queryOne(
      `SELECT * FROM shareable_links
       WHERE account_id = $1 AND token = $2 AND expires_at > NOW()`,
      [accountId, token]
    );
    
    if (!shareableLink) {
      return errorResponse('Invalid or expired invitation link', 404);
    }
    
    // Check if the account exists
    const account = await queryOne(
      'SELECT * FROM accounts WHERE id = $1',
      [accountId]
    );
    
    if (!account) {
      return errorResponse('Account not found', 404);
    }
    
    // Check if the user is already a member of the account
    const existingMember = await queryOne(
      'SELECT * FROM account_members WHERE account_id = $1 AND user_id = $2',
      [accountId, stackUser.id]
    );
    
    if (existingMember) {
      return successResponse({
        message: 'You are already a member of this account',
        accountId,
      });
    }
    
    // Add the user to the account
    await transaction(async (client) => {
      // Add the user as a member with the 'editor' role
      await client.query(
        `INSERT INTO account_members (account_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [accountId, stackUser.id, 'editor']
      );
    });
    
    return successResponse({
      message: 'Successfully joined the account',
      accountId,
    });
  } catch (error) {
    console.error('Error joining account:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}
