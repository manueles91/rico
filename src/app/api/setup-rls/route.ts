import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper function to create policies for a table
async function createPoliciesForTable(
  tableName: string, 
  policies: {
    select: string;
    insert?: string;
    update?: string;
    delete?: string;
  },
  skipIfError = false
) {
  try {
    // Enable RLS
    await query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`);
    
    // Drop existing policies
    await query(`
      DROP POLICY IF EXISTS ${tableName}_select_policy ON ${tableName};
      DROP POLICY IF EXISTS ${tableName}_insert_policy ON ${tableName};
      DROP POLICY IF EXISTS ${tableName}_update_policy ON ${tableName};
      DROP POLICY IF EXISTS ${tableName}_delete_policy ON ${tableName};
    `);
    
    // Create SELECT policy (required)
    await query(`
      CREATE POLICY ${tableName}_select_policy ON ${tableName}
        FOR SELECT USING (${policies.select});
    `);
    
    // Create INSERT policy (optional)
    if (policies.insert) {
      await query(`
        CREATE POLICY ${tableName}_insert_policy ON ${tableName}
          FOR INSERT WITH CHECK (${policies.insert});
      `);
    }
    
    // Create UPDATE policy (optional)
    if (policies.update) {
      await query(`
        CREATE POLICY ${tableName}_update_policy ON ${tableName}
          FOR UPDATE USING (${policies.update});
      `);
    }
    
    // Create DELETE policy (optional)
    if (policies.delete) {
      await query(`
        CREATE POLICY ${tableName}_delete_policy ON ${tableName}
          FOR DELETE USING (${policies.delete});
      `);
    }
    
    return { success: true, table: tableName };
  } catch (error) {
    if (skipIfError) {
      console.log(`Skipping ${tableName} table (may not exist yet)`);
      return { success: false, table: tableName, skipped: true };
    }
    console.error(`Error setting up RLS for ${tableName}:`, error);
    throw error;
  }
}

// Helper function to apply RLS setup directly
async function applyRlsDirectly() {
  try {
    const results = [];
    
    // First, create the app schema and app.current_user_id function
    try {
      await query(`CREATE SCHEMA IF NOT EXISTS app;`);
    } catch (error) {
      console.log('Schema app already exists, continuing...');
    }

    try {
      // Check if function exists first
      const functionExistsResult = await query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'app' AND p.proname = 'get_current_user_id'
        ) as exists;
      `);
      
      const functionExists = functionExistsResult[0]?.exists;
      
      if (!functionExists) {
        await query(`
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
      }
    } catch (error) {
      console.error('Error with function creation:', error);
    }
    
    // Define table policies - centralized configuration
    const tablePolicies = {
      users: {
        select: "id = app.get_current_user_id() OR app.get_current_user_id() IS NULL",
        update: "id = app.get_current_user_id()",
        delete: "false"
      },
      accounts: {
        select: "id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()) OR app.get_current_user_id() IS NULL",
        insert: "true",
        update: "id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')",
        delete: "id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')"
      },
      account_members: {
        select: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()) OR app.get_current_user_id() IS NULL",
        insert: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner') OR app.get_current_user_id() IS NULL",
        update: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')",
        delete: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')"
      },
      expenses: {
        select: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()) OR app.get_current_user_id() IS NULL",
        insert: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()) OR app.get_current_user_id() IS NULL",
        update: "(created_by = app.get_current_user_id() OR account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner'))",
        delete: "(created_by = app.get_current_user_id() OR account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner'))"
      },
      categories: {
        select: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()) OR app.get_current_user_id() IS NULL",
        insert: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id())",
        update: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id())",
        delete: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')"
      }
    };
    
    // Optional tables (may not exist yet)
    const optionalTablePolicies = {
      expense_categories: {
        select: "expense_id IN (SELECT id FROM expenses WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id())) OR app.get_current_user_id() IS NULL",
        insert: "expense_id IN (SELECT id FROM expenses WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()))",
        update: "expense_id IN (SELECT id FROM expenses WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()))",
        delete: "expense_id IN (SELECT id FROM expenses WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()))"
      },
      conversations: {
        select: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()) OR app.get_current_user_id() IS NULL",
        insert: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id())",
        update: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id())",
        delete: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')"
      },
      messages: {
        select: "conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id())) OR app.get_current_user_id() IS NULL",
        insert: "conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()))",
        update: "(created_by = app.get_current_user_id() OR conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')))",
        delete: "(created_by = app.get_current_user_id() OR conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')))"
      },
      attachments: {
        select: "message_id IN (SELECT id FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()))) OR app.get_current_user_id() IS NULL",
        insert: "message_id IN (SELECT id FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id())))",
        update: "message_id IN (SELECT id FROM messages WHERE created_by = app.get_current_user_id() OR conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')))",
        delete: "message_id IN (SELECT id FROM messages WHERE created_by = app.get_current_user_id() OR conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')))"
      },
      invitations: {
        select: "(account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()) OR email = (SELECT email FROM users WHERE id = app.get_current_user_id())) OR app.get_current_user_id() IS NULL",
        insert: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role IN ('owner', 'admin'))",
        update: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role IN ('owner', 'admin')) OR email = (SELECT email FROM users WHERE id = app.get_current_user_id())",
        delete: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role IN ('owner', 'admin'))"
      }
    };
    
    // Apply policies to required tables
    for (const [tableName, policies] of Object.entries(tablePolicies)) {
      try {
        const result = await createPoliciesForTable(tableName, policies);
        results.push(result);
      } catch (error) {
        results.push({ success: false, table: tableName, error: String(error) });
      }
    }
    
    // Apply policies to optional tables
    for (const [tableName, policies] of Object.entries(optionalTablePolicies)) {
      try {
        const result = await createPoliciesForTable(tableName, policies, true);
        results.push(result);
      } catch (error) {
        results.push({ success: false, table: tableName, error: String(error) });
      }
    }
    
    return { 
      success: results.some(r => r.success), 
      results 
    };
  } catch (error) {
    console.error("Error applying RLS directly:", error);
    return { 
      success: false, 
      message: `Error applying RLS directly: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

// Main API route handler
export async function GET() {
  try {
    // Apply RLS directly
    const result = await applyRlsDirectly();
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? "RLS setup completed" : "RLS setup failed",
      details: result
    });
  } catch (error) {
    console.error("Error setting up RLS:", error);
    
    return NextResponse.json({
      success: false,
      message: `Error setting up RLS: ${error instanceof Error ? error.message : String(error)}`,
    }, { status: 500 });
  }
}
