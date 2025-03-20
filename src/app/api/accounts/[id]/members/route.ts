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
    id: string;
  };
}

export interface AccountMember {
  account_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

// GET /api/accounts/[id]/members - Get all members of an account
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    
    // Verify account exists
    const accountExists = await queryOne(
      'SELECT id FROM accounts WHERE id = $1',
      [id]
    );
    
    if (!accountExists) {
      return notFoundResponse('Account');
    }
    
    // Get account members with user details
    const members = await query(
      `SELECT 
         am.account_id, 
         am.user_id, 
         am.role, 
         am.created_at,
         u.email,
         u.name
       FROM account_members am
       JOIN users u ON am.user_id = u.id
       WHERE am.account_id = $1
       ORDER BY am.created_at DESC`,
      [id]
    );
    
    return successResponse(members);
  } catch (error: any) {
    return errorResponse(`Error fetching account members: ${error.message}`);
  }
}

// POST /api/accounts/[id]/members - Add a member to an account
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const body = await request.json();
    const { userId, role, requestingUserId } = body;
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    if (!role || !['admin', 'editor', 'viewer'].includes(role)) {
      return errorResponse('Valid role is required (admin, editor, or viewer)');
    }
    
    // Verify account exists
    const accountExists = await queryOne(
      'SELECT id FROM accounts WHERE id = $1',
      [id]
    );
    
    if (!accountExists) {
      return notFoundResponse('Account');
    }
    
    // Verify requesting user has permission to add members
    if (requestingUserId) {
      const requesterRole = await queryOne(
        'SELECT role FROM account_members WHERE account_id = $1 AND user_id = $2',
        [id, requestingUserId]
      );
      
      if (!requesterRole) {
        return forbiddenResponse('You do not have access to this account');
      }
      
      if (requesterRole.role !== 'admin') {
        return forbiddenResponse('Only account admins can add members');
      }
    }
    
    // Verify user exists
    const userExists = await queryOne(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );
    
    if (!userExists) {
      return notFoundResponse('User');
    }
    
    // Check if user is already a member
    const existingMembership = await queryOne(
      'SELECT * FROM account_members WHERE account_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (existingMembership) {
      // Update role if already a member
      const updatedMembership = await queryOne<AccountMember>(
        `UPDATE account_members 
         SET role = $1
         WHERE account_id = $2 AND user_id = $3
         RETURNING *`,
        [role, id, userId]
      );
      
      return successResponse(updatedMembership, 'Member role updated');
    }
    
    // Add new member
    const newMembership = await queryOne<AccountMember>(
      `INSERT INTO account_members (account_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, userId, role]
    );
    
    return createdResponse(newMembership);
  } catch (error: any) {
    return errorResponse(`Error adding account member: ${error.message}`);
  }
}

// DELETE /api/accounts/[id]/members - Remove a member from an account
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const requestingUserId = searchParams.get('requestingUserId');
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    // Verify account exists
    const accountExists = await queryOne(
      'SELECT id FROM accounts WHERE id = $1',
      [id]
    );
    
    if (!accountExists) {
      return notFoundResponse('Account');
    }
    
    // Get the member being removed
    const memberToRemove = await queryOne(
      'SELECT * FROM account_members WHERE account_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (!memberToRemove) {
      return notFoundResponse('Account member');
    }
    
    // Special case: user removing themselves
    if (requestingUserId === userId) {
      await query(
        'DELETE FROM account_members WHERE account_id = $1 AND user_id = $2',
        [id, userId]
      );
      
      return successResponse({ userId }, 'You have left the account');
    }
    
    // Verify requesting user has permission to remove members
    if (requestingUserId) {
      const requesterRole = await queryOne(
        'SELECT role FROM account_members WHERE account_id = $1 AND user_id = $2',
        [id, requestingUserId]
      );
      
      if (!requesterRole) {
        return forbiddenResponse('You do not have access to this account');
      }
      
      if (requesterRole.role !== 'admin') {
        return forbiddenResponse('Only account admins can remove members');
      }
      
      // Cannot remove the last admin
      if (memberToRemove.role === 'admin') {
        const adminCount = await queryOne(
          'SELECT COUNT(*) as count FROM account_members WHERE account_id = $1 AND role = $2',
          [id, 'admin']
        );
        
        if (adminCount.count <= 1) {
          return errorResponse('Cannot remove the last admin from an account', 409);
        }
      }
    }
    
    // Remove the member
    await query(
      'DELETE FROM account_members WHERE account_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    return successResponse({ userId }, 'Member removed successfully');
  } catch (error: any) {
    return errorResponse(`Error removing account member: ${error.message}`);
  }
}
