import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// Helper function to apply RLS setup directly
async function applyRlsDirectly() {
  try {
    // First, create the app schema and app.current_user_id function
    await query(`
      -- Create app schema if it doesn't exist
      CREATE SCHEMA IF NOT EXISTS app;

      -- Drop the function if it exists
      DROP FUNCTION IF EXISTS app.get_current_user_id();

      -- Create a new function with UUID return type
      CREATE OR REPLACE FUNCTION app.get_current_user_id()
      RETURNS UUID AS $$
      DECLARE
        user_id UUID;
      BEGIN
        BEGIN
          user_id := current_setting('app.current_user_id', TRUE)::UUID;
          RETURN user_id;
        EXCEPTION
          WHEN OTHERS THEN
            RETURN NULL;
        END;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Apply RLS to users table
    await query(`
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS users_select_policy ON users;
      DROP POLICY IF EXISTS users_update_policy ON users;
      DROP POLICY IF EXISTS users_delete_policy ON users;
      
      CREATE POLICY users_select_policy ON users
        FOR SELECT USING (id = app.get_current_user_id() OR app.get_current_user_id() IS NULL);
        
      CREATE POLICY users_update_policy ON users
        FOR UPDATE USING (id = app.get_current_user_id());
        
      CREATE POLICY users_delete_policy ON users
        FOR DELETE USING (false);
    `);
    
    // Apply RLS to accounts table
    await query(`
      ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS accounts_select_policy ON accounts;
      DROP POLICY IF EXISTS accounts_insert_policy ON accounts;
      DROP POLICY IF EXISTS accounts_update_policy ON accounts;
      DROP POLICY IF EXISTS accounts_delete_policy ON accounts;
      
      CREATE POLICY accounts_select_policy ON accounts
        FOR SELECT USING (
          id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.get_current_user_id()
          ) OR app.get_current_user_id() IS NULL
        );
        
      CREATE POLICY accounts_insert_policy ON accounts
        FOR INSERT WITH CHECK (true);
        
      CREATE POLICY accounts_update_policy ON accounts
        FOR UPDATE USING (
          id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.get_current_user_id() AND role = 'owner'
          )
        );
        
      CREATE POLICY accounts_delete_policy ON accounts
        FOR DELETE USING (
          id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.get_current_user_id() AND role = 'owner'
          )
        );
    `);
    
    // Apply RLS to account_members table
    await query(`
      ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS account_members_select_policy ON account_members;
      DROP POLICY IF EXISTS account_members_insert_policy ON account_members;
      DROP POLICY IF EXISTS account_members_update_policy ON account_members;
      DROP POLICY IF EXISTS account_members_delete_policy ON account_members;
      
      CREATE POLICY account_members_select_policy ON account_members
        FOR SELECT USING (
          account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.get_current_user_id()
          ) OR app.get_current_user_id() IS NULL
        );
        
      CREATE POLICY account_members_insert_policy ON account_members
        FOR INSERT WITH CHECK (
          account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.get_current_user_id() AND role = 'owner'
          ) OR app.get_current_user_id() IS NULL
        );
        
      CREATE POLICY account_members_update_policy ON account_members
        FOR UPDATE USING (
          account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.get_current_user_id() AND role = 'owner'
          )
        );
        
      CREATE POLICY account_members_delete_policy ON account_members
        FOR DELETE USING (
          account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.get_current_user_id() AND role = 'owner'
          )
        );
    `);
    
    // Apply RLS to expenses table
    await query(`
      ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS expenses_select_policy ON expenses;
      DROP POLICY IF EXISTS expenses_insert_policy ON expenses;
      DROP POLICY IF EXISTS expenses_update_policy ON expenses;
      DROP POLICY IF EXISTS expenses_delete_policy ON expenses;
      
      CREATE POLICY expenses_select_policy ON expenses
        FOR SELECT USING (
          account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.get_current_user_id()
          ) OR app.get_current_user_id() IS NULL
        );
        
      CREATE POLICY expenses_insert_policy ON expenses
        FOR INSERT WITH CHECK (
          account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.get_current_user_id()
          ) OR app.get_current_user_id() IS NULL
        );
        
      CREATE POLICY expenses_update_policy ON expenses
        FOR UPDATE USING (
          (created_by = app.get_current_user_id() OR
          account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.get_current_user_id() AND role = 'owner'
          ))
        );
        
      CREATE POLICY expenses_delete_policy ON expenses
        FOR DELETE USING (
          (created_by = app.get_current_user_id() OR
          account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.get_current_user_id() AND role = 'owner'
          ))
        );
    `);
    
    // Apply RLS to categories table
    await query(`
      ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS categories_select_policy ON categories;
      DROP POLICY IF EXISTS categories_insert_policy ON categories;
      DROP POLICY IF EXISTS categories_update_policy ON categories;
      DROP POLICY IF EXISTS categories_delete_policy ON categories;
      
      CREATE POLICY categories_select_policy ON categories
        FOR SELECT USING (
          account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.get_current_user_id()
          ) OR app.get_current_user_id() IS NULL
        );
        
      CREATE POLICY categories_insert_policy ON categories
        FOR INSERT WITH CHECK (
          account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.get_current_user_id()
          )
        );
        
      CREATE POLICY categories_update_policy ON categories
        FOR UPDATE USING (
          account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.get_current_user_id()
          )
        );
        
      CREATE POLICY categories_delete_policy ON categories
        FOR DELETE USING (
          account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.get_current_user_id() AND role = 'owner'
          )
        );
    `);
    
    // Apply RLS to expense_categories table if it exists
    try {
      await query(`
        ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS expense_categories_select_policy ON expense_categories;
        DROP POLICY IF EXISTS expense_categories_insert_policy ON expense_categories;
        DROP POLICY IF EXISTS expense_categories_update_policy ON expense_categories;
        DROP POLICY IF EXISTS expense_categories_delete_policy ON expense_categories;
        
        CREATE POLICY expense_categories_select_policy ON expense_categories
          FOR SELECT USING (
            expense_id IN (
              SELECT id FROM expenses 
              WHERE account_id IN (
                SELECT account_id FROM account_members 
                WHERE user_id = app.get_current_user_id()
              )
            ) OR app.get_current_user_id() IS NULL
          );
          
        CREATE POLICY expense_categories_insert_policy ON expense_categories
          FOR INSERT WITH CHECK (
            expense_id IN (
              SELECT id FROM expenses 
              WHERE account_id IN (
                SELECT account_id FROM account_members 
                WHERE user_id = app.get_current_user_id()
              )
            )
          );
          
        CREATE POLICY expense_categories_update_policy ON expense_categories
          FOR UPDATE USING (
            expense_id IN (
              SELECT id FROM expenses 
              WHERE account_id IN (
                SELECT account_id FROM account_members 
                WHERE user_id = app.get_current_user_id()
              )
            )
          );
          
        CREATE POLICY expense_categories_delete_policy ON expense_categories
          FOR DELETE USING (
            expense_id IN (
              SELECT id FROM expenses 
              WHERE account_id IN (
                SELECT account_id FROM account_members 
                WHERE user_id = app.get_current_user_id()
              )
            )
          );
      `);
    } catch (error) {
      console.log("Skipping expense_categories table (may not exist yet)");
    }
    
    // Apply RLS to conversations table if it exists
    try {
      await query(`
        ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS conversations_select_policy ON conversations;
        DROP POLICY IF EXISTS conversations_insert_policy ON conversations;
        DROP POLICY IF EXISTS conversations_update_policy ON conversations;
        DROP POLICY IF EXISTS conversations_delete_policy ON conversations;
        
        CREATE POLICY conversations_select_policy ON conversations
          FOR SELECT USING (
            account_id IN (
              SELECT account_id FROM account_members 
              WHERE user_id = app.get_current_user_id()
            ) OR app.get_current_user_id() IS NULL
          );
          
        CREATE POLICY conversations_insert_policy ON conversations
          FOR INSERT WITH CHECK (
            account_id IN (
              SELECT account_id FROM account_members 
              WHERE user_id = app.get_current_user_id()
            )
          );
          
        CREATE POLICY conversations_update_policy ON conversations
          FOR UPDATE USING (
            account_id IN (
              SELECT account_id FROM account_members 
              WHERE user_id = app.get_current_user_id()
            )
          );
          
        CREATE POLICY conversations_delete_policy ON conversations
          FOR DELETE USING (
            account_id IN (
              SELECT account_id FROM account_members 
              WHERE user_id = app.get_current_user_id() AND role = 'owner'
            )
          );
      `);
    } catch (error) {
      console.log("Skipping conversations table (may not exist yet)");
    }
    
    // Apply RLS to messages table if it exists
    try {
      await query(`
        ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS messages_select_policy ON messages;
        DROP POLICY IF EXISTS messages_insert_policy ON messages;
        DROP POLICY IF EXISTS messages_update_policy ON messages;
        DROP POLICY IF EXISTS messages_delete_policy ON messages;
        
        CREATE POLICY messages_select_policy ON messages
          FOR SELECT USING (
            conversation_id IN (
              SELECT id FROM conversations 
              WHERE account_id IN (
                SELECT account_id FROM account_members 
                WHERE user_id = app.get_current_user_id()
              )
            ) OR app.get_current_user_id() IS NULL
          );
          
        CREATE POLICY messages_insert_policy ON messages
          FOR INSERT WITH CHECK (
            conversation_id IN (
              SELECT id FROM conversations 
              WHERE account_id IN (
                SELECT account_id FROM account_members 
                WHERE user_id = app.get_current_user_id()
              )
            )
          );
          
        CREATE POLICY messages_update_policy ON messages
          FOR UPDATE USING (
            (created_by = app.get_current_user_id() OR
            conversation_id IN (
              SELECT id FROM conversations 
              WHERE account_id IN (
                SELECT account_id FROM account_members 
                WHERE user_id = app.get_current_user_id() AND role = 'owner'
              )
            ))
          );
          
        CREATE POLICY messages_delete_policy ON messages
          FOR DELETE USING (
            (created_by = app.get_current_user_id() OR
            conversation_id IN (
              SELECT id FROM conversations 
              WHERE account_id IN (
                SELECT account_id FROM account_members 
                WHERE user_id = app.get_current_user_id() AND role = 'owner'
              )
            ))
          );
      `);
    } catch (error) {
      console.log("Skipping messages table (may not exist yet)");
    }
    
    // Apply RLS to attachments table if it exists
    try {
      await query(`
        ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS attachments_select_policy ON attachments;
        DROP POLICY IF EXISTS attachments_insert_policy ON attachments;
        DROP POLICY IF EXISTS attachments_update_policy ON attachments;
        DROP POLICY IF EXISTS attachments_delete_policy ON attachments;
        
        CREATE POLICY attachments_select_policy ON attachments
          FOR SELECT USING (
            message_id IN (
              SELECT id FROM messages 
              WHERE conversation_id IN (
                SELECT id FROM conversations 
                WHERE account_id IN (
                  SELECT account_id FROM account_members 
                  WHERE user_id = app.get_current_user_id()
                )
              )
            ) OR app.get_current_user_id() IS NULL
          );
          
        CREATE POLICY attachments_insert_policy ON attachments
          FOR INSERT WITH CHECK (
            message_id IN (
              SELECT id FROM messages 
              WHERE conversation_id IN (
                SELECT id FROM conversations 
                WHERE account_id IN (
                  SELECT account_id FROM account_members 
                  WHERE user_id = app.get_current_user_id()
                )
              )
            )
          );
          
        CREATE POLICY attachments_update_policy ON attachments
          FOR UPDATE USING (
            message_id IN (
              SELECT id FROM messages 
              WHERE created_by = app.get_current_user_id() OR 
              conversation_id IN (
                SELECT id FROM conversations 
                WHERE account_id IN (
                  SELECT account_id FROM account_members 
                  WHERE user_id = app.get_current_user_id() AND role = 'owner'
                )
              )
            )
          );
          
        CREATE POLICY attachments_delete_policy ON attachments
          FOR DELETE USING (
            message_id IN (
              SELECT id FROM messages 
              WHERE created_by = app.get_current_user_id() OR 
              conversation_id IN (
                SELECT id FROM conversations 
                WHERE account_id IN (
                  SELECT account_id FROM account_members 
                  WHERE user_id = app.get_current_user_id() AND role = 'owner'
                )
              )
            )
          );
      `);
    } catch (error) {
      console.log("Skipping attachments table (may not exist yet)");
    }
    
    // Apply RLS to invitations table if it exists
    try {
      await query(`
        ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS invitations_select_policy ON invitations;
        DROP POLICY IF EXISTS invitations_insert_policy ON invitations;
        DROP POLICY IF EXISTS invitations_update_policy ON invitations;
        DROP POLICY IF EXISTS invitations_delete_policy ON invitations;
        
        CREATE POLICY invitations_select_policy ON invitations
          FOR SELECT USING (
            (account_id IN (
              SELECT account_id FROM account_members 
              WHERE user_id = app.get_current_user_id()
            ) OR email = (
              SELECT email FROM users 
              WHERE id = app.get_current_user_id()
            )) OR app.get_current_user_id() IS NULL
          );
          
        CREATE POLICY invitations_insert_policy ON invitations
          FOR INSERT WITH CHECK (
            account_id IN (
              SELECT account_id FROM account_members 
              WHERE user_id = app.get_current_user_id() AND role IN ('owner', 'admin')
            )
          );
          
        CREATE POLICY invitations_update_policy ON invitations
          FOR UPDATE USING (
            account_id IN (
              SELECT account_id FROM account_members 
              WHERE user_id = app.get_current_user_id() AND role IN ('owner', 'admin')
            ) OR email = (
              SELECT email FROM users 
              WHERE id = app.get_current_user_id()
            )
          );
          
        CREATE POLICY invitations_delete_policy ON invitations
          FOR DELETE USING (
            account_id IN (
              SELECT account_id FROM account_members 
              WHERE user_id = app.get_current_user_id() AND role IN ('owner', 'admin')
            )
          );
      `);
    } catch (error) {
      console.log("Skipping invitations table (may not exist yet)");
    }
    
    return { success: true, message: "RLS applied directly to tables" };
  } catch (error: unknown) {
    console.error("Error applying RLS directly:", error);
    return { 
      success: false, 
      message: `Error applying RLS directly: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

// Main API route handler
export async function GET() {
  const results = [];
  let success = false;
  
  try {
    // Try direct application of RLS
    const directResult = await applyRlsDirectly();
    results.push(directResult);
    success = directResult.success;
    
    return NextResponse.json({
      success,
      message: success ? "RLS setup completed" : "RLS setup failed",
      results
    });
  } catch (error: unknown) {
    console.error("Error setting up RLS:", error);
    
    return NextResponse.json({
      success: false,
      message: `Error setting up RLS: ${error instanceof Error ? error.message : String(error)}`,
      results
    }, { status: 500 });
  }
}
