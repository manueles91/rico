import { query, queryOne } from '@/lib/db';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  errorResponse,
} from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

// GET /api/users - Get all users
export async function GET() {
  try {
    const users = await query<User>('SELECT * FROM users ORDER BY created_at DESC');
    return successResponse(users);
  } catch (error: any) {
    return errorResponse(`Error fetching users: ${error.message}`);
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return errorResponse('Email is required');
    }

    // Check if user already exists
    const existingUser = await queryOne<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser) {
      return errorResponse('User with this email already exists', 409);
    }

    // Create new user
    const newUser = await queryOne<User>(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
      [email, name]
    );

    return createdResponse(newUser);
  } catch (error: any) {
    return errorResponse(`Error creating user: ${error.message}`);
  }
}

export const dynamic = 'force-dynamic';
