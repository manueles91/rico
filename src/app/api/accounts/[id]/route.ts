import { query, queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  notFoundResponse,
  errorResponse,
  forbiddenResponse,
} from '@/lib/api-utils';
import { NextRequest } from 'next/server';
import { Account, AccountWithMembers } from '../route';

interface Params {
  params: {
    accountId: string;
  };
}

// GET /api/accounts/[accountId] - Get a specific account with members
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { accountId } = params;
    
    const account = await queryOne<AccountWithMembers>(
      `SELECT 
         a.*, 
         json_agg(
           json_build_object(
             'user_id', u.id,
             'email', u.email,
             'name', u.name,
             'role', am.role
           )
         ) as members
       FROM accounts a
       JOIN account_members am ON a.id = am.account_id
       JOIN users u ON am.user_id = u.id
       WHERE a.id = $1
       GROUP BY a.id`,
      [accountId]
    );
    
    if (!account) {
      return notFoundResponse('Account');
    }
    
    return successResponse(account);
  } catch (error: any) {
    return errorResponse(`Error fetching account: ${error.message}`);
  }
}

// PUT /api/accounts/[accountId] - Update an account
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { accountId } = params;
    const body = await request.json();
    const { name, description, userId } = body;
    
    // Verify account exists
    const existingAccount = await queryOne<Account>(
      'SELECT * FROM accounts WHERE id = $1',
      [accountId]
    );
    
    if (!existingAccount) {
      return notFoundResponse('Account');
    }
    
    // Verify user has permission to update the account
    if (userId) {
      const userMembership = await queryOne(
        'SELECT role FROM account_members WHERE account_id = $1 AND user_id = $2',
        [accountId, userId]
      );
      
      if (!userMembership) {
        return forbiddenResponse('You do not have access to this account');
      }
      
      if (userMembership.role !== 'admin') {
        return forbiddenResponse('Only account admins can update account details');
      }
    }
    
    // Update the account
    const updatedAccount = await queryOne<Account>(
      `UPDATE accounts 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [name || existingAccount.name, description, accountId]
    );
    
    return successResponse(updatedAccount);
  } catch (error: any) {
    return errorResponse(`Error updating account: ${error.message}`);
  }
}

// DELETE /api/accounts/[accountId] - Delete an account
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { accountId } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    // Verify account exists
    const existingAccount = await queryOne<Account>(
      'SELECT * FROM accounts WHERE id = $1',
      [accountId]
    );
    
    if (!existingAccount) {
      return notFoundResponse('Account');
    }
    
    // Verify user has permission to delete the account
    const userMembership = await queryOne(
      'SELECT role FROM account_members WHERE account_id = $1 AND user_id = $2',
      [accountId, userId]
    );
    
    if (!userMembership) {
      return forbiddenResponse('You do not have access to this account');
    }
    
    if (userMembership.role !== 'admin') {
      return forbiddenResponse('Only account admins can delete accounts');
    }
    
    // Delete the account - cascading delete will remove related records
    await query('DELETE FROM accounts WHERE id = $1', [accountId]);
    
    return successResponse({ accountId }, 'Account deleted successfully');
  } catch (error: any) {
    return errorResponse(`Error deleting account: ${error.message}`);
  }
}
