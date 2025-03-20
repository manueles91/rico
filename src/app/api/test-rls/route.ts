import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { query, queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const stackUser = await stackServerApp.getUser();
    
    if (!stackUser) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to use this API' },
        { status: 401 }
      );
    }

    // Test queries with authenticated connection
    const results = await Promise.all([
      // Test user access
      queryOne(
        'SELECT * FROM users WHERE id = $1',
        [stackUser.id],
        { useAuthenticated: true }
      ),
      
      // Test accounts access through account_members
      query(
        `SELECT a.* 
         FROM accounts a
         JOIN account_members am ON a.id = am.account_id
         WHERE am.user_id = $1`,
        [stackUser.id],
        { useAuthenticated: true }
      ),
      
      // Test expenses access (if table exists)
      query(
        'SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)',
        ['expenses'],
        { useAuthenticated: true }
      ).then(async ([{ exists }]) => {
        if (exists) {
          return query(
            `SELECT e.* 
             FROM expenses e
             JOIN account_members am ON e.account_id = am.account_id
             WHERE am.user_id = $1`,
            [stackUser.id],
            { useAuthenticated: true }
          );
        }
        return [];
      })
    ]);

    const [user, accounts, expenses] = results;

    return NextResponse.json({
      success: true,
      message: 'RLS test completed successfully',
      data: {
        user,
        accounts,
        expenses,
        stackUserId: stackUser.id,
        stackUserEmail: stackUser.primaryEmail,
      }
    });
  } catch (error) {
    console.error('Error testing RLS:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test RLS',
        message: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
}
