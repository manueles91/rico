import { NextRequest } from 'next/server';
import { query, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { stackServerApp } from '@/stack';

export const dynamic = 'force-dynamic';

// GET /api/accounts/[accountId] - Get account details
export async function GET(
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
    
    // Check if the user has access to the account
    const accountMember = await queryOne(
      `SELECT am.role, a.* 
       FROM account_members am
       JOIN accounts a ON am.account_id = a.id
       WHERE am.account_id = $1 AND am.user_id = $2`,
      [accountId, stackUser.id]
    );
    
    if (!accountMember) {
      return errorResponse('Account not found or you do not have access to it', 404);
    }
    
    return successResponse(accountMember);
  } catch (error) {
    console.error('Error getting account details:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}

// DELETE /api/accounts/[accountId] - Delete an account (remove user's access)
export async function DELETE(
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
    
    // Check if the account exists and the user has access to it
    const accountMember = await queryOne(
      `SELECT am.role, a.is_personal, a.created_by
       FROM account_members am
       JOIN accounts a ON am.account_id = a.id
       WHERE am.account_id = $1 AND am.user_id = $2`,
      [accountId, stackUser.id]
    );
    
    if (!accountMember) {
      return errorResponse('Account not found or you do not have access to it', 404);
    }
    
    // For personal accounts, check if the user is the owner
    if (accountMember.is_personal && accountMember.created_by !== stackUser.id) {
      return errorResponse('You do not have permission to delete this account', 403);
    }
    
    // For shared accounts, check if the user is the owner or an admin
    if (!accountMember.is_personal && accountMember.role !== 'owner' && accountMember.role !== 'admin') {
      return errorResponse('You do not have permission to delete this account', 403);
    }
    
    // Remove the user's access to the account
    await transaction(async (client) => {
      // If it's a personal account or the user is the owner of a shared account,
      // we'll mark the account as deleted but keep the data
      if (accountMember.is_personal || accountMember.role === 'owner') {
        await client.query(
          `UPDATE accounts 
           SET is_deleted = true, deleted_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [accountId]
        );
      }
      
      // Remove the user from the account_members table
      await client.query(
        `DELETE FROM account_members
         WHERE account_id = $1 AND user_id = $2`,
        [accountId, stackUser.id]
      );
    });
    
    return successResponse({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}
