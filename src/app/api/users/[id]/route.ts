import { query, queryOne } from '@/lib/db';
import {
  successResponse,
  notFoundResponse,
  errorResponse,
} from '@/lib/api-utils';
import { NextRequest } from 'next/server';
import { User } from '../route';

interface Params {
  params: {
    id: string;
  };
}

// GET /api/users/[id] - Get a specific user
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    
    const user = await queryOne<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    if (!user) {
      return notFoundResponse('User');
    }
    
    return successResponse(user);
  } catch (error: any) {
    return errorResponse(`Error fetching user: ${error.message}`);
  }
}

// PUT /api/users/[id] - Update a user
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const body = await request.json();
    const { email, name } = body;
    
    // Verify user exists
    const existingUser = await queryOne<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    if (!existingUser) {
      return notFoundResponse('User');
    }
    
    // Check if email is being changed and if it already exists
    if (email && email !== existingUser.email) {
      const emailExists = await queryOne<User>(
        'SELECT * FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );
      
      if (emailExists) {
        return errorResponse('Email already in use', 409);
      }
    }
    
    // Update the user
    const updatedUser = await queryOne<User>(
      `UPDATE users 
       SET email = COALESCE($1, email), 
           name = COALESCE($2, name),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [email || existingUser.email, name, id]
    );
    
    return successResponse(updatedUser);
  } catch (error: any) {
    return errorResponse(`Error updating user: ${error.message}`);
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    
    // Verify user exists
    const existingUser = await queryOne<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    if (!existingUser) {
      return notFoundResponse('User');
    }
    
    // Delete the user
    await query('DELETE FROM users WHERE id = $1', [id]);
    
    return successResponse({ id }, 'User deleted successfully');
  } catch (error: any) {
    return errorResponse(`Error deleting user: ${error.message}`);
  }
}

export const dynamic = 'force-dynamic';
