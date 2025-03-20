import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { stackServerApp } from '@/stack';

export async function GET() {
  try {
    // Get the user from Stack Auth
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required to initialize database' 
      }, { status: 401 });
    }
    
    // Initialize the database
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      // Start a transaction
      await client.query('BEGIN');
      
      // Create users table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          name TEXT,
          avatar_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create accounts table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          is_personal BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create account_members table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS account_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role TEXT NOT NULL DEFAULT 'owner',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(account_id, user_id)
        );
      `);
      
      // Create categories table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          icon TEXT,
          color TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL
        );
      `);
      
      // Create expenses table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          amount NUMERIC(12, 2) NOT NULL,
          description TEXT,
          vendor TEXT,
          date TIMESTAMP WITH TIME ZONE NOT NULL,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          receipt_url TEXT,
          metadata JSONB
        );
      `);
      
      // Create expense_categories table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS expense_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
          category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(expense_id, category_id)
        );
      `);
      
      // Create conversations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          title TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create messages table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          is_from_ai BOOLEAN NOT NULL DEFAULT FALSE,
          content TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        );
      `);
      
      // Create attachments table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS attachments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          file_url TEXT NOT NULL,
          file_type TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create invitations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS invitations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'editor',
          token TEXT NOT NULL UNIQUE,
          invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          accepted_at TIMESTAMP WITH TIME ZONE
        );
      `);
      
      // Create or update the current user if they don't exist
      const userResult = await client.query(`
        INSERT INTO users (id, email, name, avatar_url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE
        SET email = $2, name = $3, avatar_url = $4, updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `, [
        stackUser.id,
        stackUser.primaryEmail || '',
        stackUser.displayName || null,
        stackUser.profileImageUrl || null
      ]);
      
      const user = userResult.rows[0];
      
      // Check if the user has a personal account
      const personalAccountResult = await client.query(`
        SELECT a.* FROM accounts a
        JOIN account_members am ON a.id = am.account_id
        WHERE am.user_id = $1 AND a.is_personal = TRUE
        LIMIT 1;
      `, [user.id]);
      
      let personalAccount;
      
      if (personalAccountResult.rows.length === 0) {
        // Create a personal account for the user
        const accountResult = await client.query(`
          INSERT INTO accounts (name, description, is_personal)
          VALUES ($1, $2, TRUE)
          RETURNING *;
        `, [
          `${user.name || 'Personal'}'s Account`,
          'Your personal account'
        ]);
        
        personalAccount = accountResult.rows[0];
        
        // Add the user as an owner of the account
        await client.query(`
          INSERT INTO account_members (account_id, user_id, role)
          VALUES ($1, $2, 'owner');
        `, [personalAccount.id, user.id]);
      } else {
        personalAccount = personalAccountResult.rows[0];
      }
      
      // Commit the transaction
      await client.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        message: 'Database initialized successfully',
        user,
        personalAccount
      });
    } catch (error) {
      // Rollback the transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Database initialization failed',
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error)
    }, { status: 500 });
  }
}
