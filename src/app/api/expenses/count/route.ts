import { query } from '@/lib/db';
import { stackServerApp } from '@/stack';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to use this API' },
        { status: 401 }
      );
    }

    // Get the account ID from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to the account
    const accountAccess = await query(
      `SELECT am.* 
       FROM account_members am
       WHERE am.account_id = $1 AND am.user_id = $2`,
      [accountId, stackUser.id],
      { useAuthenticated: true }
    );

    if (!accountAccess || accountAccess.length === 0) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this account' },
        { status: 403 }
      );
    }

    // Get the count of expenses
    const result = await query(
      'SELECT COUNT(*) as count FROM expenses WHERE account_id = $1',
      [accountId],
      { useAuthenticated: true }
    );

    // Get the database schema info for debugging
    const schemaInfo = await query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'expenses'`,
      [],
      { useAuthenticated: true }
    );

    return NextResponse.json({
      success: true,
      count: result[0]?.count || 0,
      schema: schemaInfo
    });
  } catch (error) {
    console.error('Error in expenses count API:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    );
  }
}
