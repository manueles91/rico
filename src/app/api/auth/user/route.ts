import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { queryOne } from '@/lib/db';
import { ensurePersonalAccount } from '@/lib/account';

export async function GET(request: NextRequest) {
  try {
    // Get the user from Stack Auth
    const stackUser = await stackServerApp.getUser();

    if (!stackUser) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Check if user exists in our database - use authenticated connection
    const dbUser = await queryOne(
      'SELECT * FROM users WHERE id = $1',
      [stackUser.id],
      { useAuthenticated: true }
    );

    if (!dbUser) {
      try {
        // Create the user in our database - use authenticated connection
        const newUser = await queryOne(
          `INSERT INTO users (id, email, name, avatar_url)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [
            stackUser.id,
            stackUser.primaryEmail || '',
            stackUser.displayName || null,
            stackUser.profileImageUrl || null
          ],
          { useAuthenticated: true }
        );
        
        // Create a personal account for the new user
        await ensurePersonalAccount(
          stackUser.id, 
          stackUser.displayName || (stackUser.primaryEmail ? stackUser.primaryEmail.split('@')[0] : 'User')
        );

        return NextResponse.json({ 
          authenticated: true,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            avatar_url: newUser.avatar_url,
            created_at: newUser.created_at,
            updated_at: newUser.updated_at
          }
        });
      } catch (createError) {
        console.error('Error creating user:', createError);
        // Return the Stack Auth user as a fallback
        return NextResponse.json({ 
          authenticated: true,
          user: {
            id: stackUser.id,
            email: stackUser.primaryEmail || '',
            name: stackUser.displayName || null,
            avatar_url: stackUser.profileImageUrl || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        });
      }
    }

    return NextResponse.json({ 
      authenticated: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        avatar_url: dbUser.avatar_url,
        created_at: dbUser.created_at,
        updated_at: dbUser.updated_at
      }
    });
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to authenticate user', 
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
