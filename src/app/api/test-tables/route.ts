import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  try {
    // Test the database tables
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      // Check if the users table exists
      const usersResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      // Check if the accounts table exists
      const accountsResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'accounts'
        );
      `);
      
      // Check if the account_members table exists
      const accountMembersResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'account_members'
        );
      `);
      
      // Get table schemas if they exist
      const tableSchemas: Record<string, any> = {};
      
      if (usersResult.rows[0].exists) {
        const usersSchema = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'users'
          ORDER BY ordinal_position;
        `);
        tableSchemas.users = usersSchema.rows;
      }
      
      if (accountsResult.rows[0].exists) {
        const accountsSchema = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'accounts'
          ORDER BY ordinal_position;
        `);
        tableSchemas.accounts = accountsSchema.rows;
      }
      
      if (accountMembersResult.rows[0].exists) {
        const accountMembersSchema = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'account_members'
          ORDER BY ordinal_position;
        `);
        tableSchemas.account_members = accountMembersSchema.rows;
      }
      
      return NextResponse.json({
        success: true,
        tables: {
          users: usersResult.rows[0].exists,
          accounts: accountsResult.rows[0].exists,
          account_members: accountMembersResult.rows[0].exists
        },
        schemas: tableSchemas
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database tables check error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Database tables check failed',
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error)
    }, { status: 500 });
  }
}
