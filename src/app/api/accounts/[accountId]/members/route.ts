import { query, queryOne } from '@/lib/db';
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
    accountId: string;
  };
}

export interface AccountMember {
  account_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

// GET /api/accounts/[accountId]/members - Get all members of an account
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { accountId } = params;
    
    // Verify account exists
    const accountExists = await queryOne(
      'SELECT id FROM accounts WHERE id = $1',
      [accountId]
    );
    
    if (!accountExists) {
      return notFoundResponse('Account not found');
    }
    
    // Get all members of the account
    const members = await query(
      `SELECT 
         am.account_id,
         am.user_id,
         am.role,
         am.created_at,
         u.email,
         u.name,
         u.image
       FROM account_members am
       JOIN users u ON am.user_id = u.id
       WHERE am.account_id = $1
       ORDER BY am.created_at DESC`,
      [accountId]
    );
    
    return successResponse(members);
  } catch (error: any) {
    return errorResponse(`Error getting account members: ${error.message}`);
  }
}

// POST /api/accounts/[accountId]/members - Add a member to an account
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { accountId } = params;
    const body = await request.json();
    const { userId, role, requestingUserId } = body;
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    if (!role || !['owner', 'admin', 'member'].includes(role)) {
      return errorResponse('Valid role is required (owner, admin, or member)');
    }
    
    // Verify account exists
    const accountExists = await queryOne(
      'SELECT id FROM accounts WHERE id = $1',
      [accountId]
    );
    
    if (!accountExists) {
      return notFoundResponse('Account not found');
    }
    
    // Verify requesting user has permission to add members
    if (requestingUserId) {
      const requesterRole = await queryOne(
        'SELECT role FROM account_members WHERE account_id = $1 AND user_id = $2',
        [accountId, requestingUserId]
      );
      
      if (!requesterRole) {
        return forbiddenResponse('You are not a member of this account');
      }
      
      // Only owners and admins can add members
      if (requesterRole.role !== 'owner' && requesterRole.role !== 'admin') {
        return forbiddenResponse('You do not have permission to add members');
      }
      
      // Only owners can add other owners
      if (role === 'owner' && requesterRole.role !== 'owner') {
        return forbiddenResponse('Only owners can add other owners');
      }
    }
    
    // Check if user is already a member
    const existingMembership = await queryOne(
      'SELECT * FROM account_members WHERE account_id = $1 AND user_id = $2',
      [accountId, userId]
    );
    
    if (existingMembership) {
      const updatedMembership = await queryOne(
        `UPDATE account_members
         SET role = $1
         WHERE account_id = $2 AND user_id = $3
         RETURNING *`,
        [role, accountId, userId]
      );
      
      return successResponse(updatedMembership, 'Member role updated');
    }
    
    const newMembership = await queryOne(
      `INSERT INTO account_members (account_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [accountId, userId, role]
    );
    
    return createdResponse(newMembership);
  } catch (error: any) {
    return errorResponse(`Error adding account member: ${error.message}`);
  }
}

// DELETE /api/accounts/[accountId]/members - Remove a member from an account
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { accountId } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const requestingUserId = searchParams.get('requestingUserId');
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    // Verify account exists
    const accountExists = await queryOne(
      'SELECT id FROM accounts WHERE id = $1',
      [accountId]
    );
    
    if (!accountExists) {
      return notFoundResponse('Account not found');
    }
    
    // Get the member being removed
    const memberToRemove = await queryOne(
      'SELECT * FROM account_members WHERE account_id = $1 AND user_id = $2',
      [accountId, userId]
    );
    
    if (!memberToRemove) {
      return notFoundResponse('Member not found');
    }
    
    // Users can remove themselves
    if (requestingUserId === userId) {
      await query(
        'DELETE FROM account_members WHERE account_id = $1 AND user_id = $2',
        [accountId, userId]
      );
      
      return successResponse({ userId }, 'You have left the account');
    }
    
    // Verify requesting user has permission to remove members
    if (requestingUserId) {
      const requesterRole = await queryOne(
        'SELECT role FROM account_members WHERE account_id = $1 AND user_id = $2',
        [accountId, requestingUserId]
      );
      
      if (!requesterRole) {
        return forbiddenResponse('You are not a member of this account');
      }
      
      // Only owners and admins can remove members
      if (requesterRole.role !== 'owner' && requesterRole.role !== 'admin') {
        return forbiddenResponse('You do not have permission to remove members');
      }
      
      // Admins can't remove other admins or owners
      if (requesterRole.role === 'admin' && memberToRemove.role === 'admin') {
        return forbiddenResponse('Admins cannot remove other admins');
      }
      
      // Make sure there's at least one admin left
      if (memberToRemove.role === 'admin') {
        const adminCount = await queryOne(
          'SELECT COUNT(*) as count FROM account_members WHERE account_id = $1 AND role = $2',
          [accountId, 'admin']
        );
        
        if (adminCount.count <= 1) {
          return errorResponse('Cannot remove the last admin from an account');
        }
      }
    }
    
    // Remove the member
    await query(
      'DELETE FROM account_members WHERE account_id = $1 AND user_id = $2',
      [accountId, userId]
    );
    
    return successResponse({ userId }, 'Member removed successfully');
  } catch (error: any) {
    return errorResponse(`Error removing account member: ${error.message}`);
  }
}
