import { NextRequest } from 'next/server';
import { stackServerApp } from '@/stack';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { Account } from '@/db/schema';

/**
 * GET /api/accounts/check - Check for existing accounts for a user
 * This endpoint is used to check if a user has any accounts in the system
 * even if they don't show up in the regular accounts endpoint
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    // Get the current authenticated user from Stack Auth
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) {
      console.error('Authentication failed: No user found in Stack Auth');
      return errorResponse('User not authenticated', 401);
    }
    
    console.log('GET /api/accounts/check - Stack Auth user:', {
      id: stackUser.id,
      email: stackUser.primaryEmail,
      name: stackUser.displayName
    });
    
    // If the requested userId is different from the current user's ID,
    // check if the current user has permission to view other users' accounts
    if (userId && userId !== stackUser.id) {
      // For now, only allow users to view their own accounts
      console.error(`Access denied: User ${stackUser.id} tried to access accounts for user ${userId}`);
      return errorResponse('You do not have permission to view other users\' accounts', 403);
    }
    
    const effectiveUserId = userId || stackUser.id;
    
    try {
      // Perform a thorough check for any accounts associated with this user
      // This query will find accounts even if they don't show up in the regular accounts endpoint
      const accounts = await query<Account>(
        `SELECT DISTINCT a.* 
         FROM accounts a
         JOIN account_members am ON a.id = am.account_id
         WHERE am.user_id = $1
         ORDER BY a.is_personal DESC, a.created_at ASC`,
        [effectiveUserId]
      );
      
      // Get member details for each account
      const accountsWithMembers = await Promise.all(
        accounts.map(async (account) => {
          const members = await query(
            `SELECT 
               am.user_id,
               u.email,
               u.name,
               am.role
             FROM account_members am
             JOIN users u ON am.user_id = u.id
             WHERE am.account_id = $1`,
            [account.id]
          );
          
          return {
            ...account,
            members
          };
        })
      );
      
      return successResponse(accountsWithMembers);
    } catch (error) {
      console.error('Database error when checking for accounts:', error);
      return errorResponse('Failed to check for accounts', 500);
    }
  } catch (error) {
    console.error('Error in GET /api/accounts/check:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}
