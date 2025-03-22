import { query } from '@/lib/db';
import { PolicyOperation, PolicyResult, RLSSetupResult, TablePolicies } from './types';
import { corePolicies } from './policies/core-tables.policy';
import { optionalPolicies } from './policies/optional-tables.policy';

/**
 * Service for managing Row Level Security (RLS) policies
 */
export class RLSService {
  /**
   * Creates the app schema and current user function if they don't exist
   */
  private static async setupAppSchema(): Promise<void> {
    try {
      // Create app schema if it doesn't exist
      await query(`CREATE SCHEMA IF NOT EXISTS app;`);
      
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
      console.error('Error setting up app schema:', error);
      throw error;
    }
  }

  /**
   * Creates policies for a specific table
   */
  private static async createPoliciesForTable(
    tableName: string, 
    policies: TablePolicies,
    skipIfError = false
  ): Promise<PolicyResult> {
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
      return { 
        success: false, 
        table: tableName, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Setup RLS for all tables
   */
  public static async setupRLS(): Promise<RLSSetupResult> {
    try {
      const results: PolicyResult[] = [];
      
      // Setup app schema and current_user_id function
      await this.setupAppSchema();
      
      // Apply policies to required tables
      for (const [tableName, policies] of Object.entries(corePolicies)) {
        const result = await this.createPoliciesForTable(tableName, policies);
        results.push(result);
      }
      
      // Apply policies to optional tables
      for (const [tableName, policies] of Object.entries(optionalPolicies)) {
        const result = await this.createPoliciesForTable(tableName, policies, true);
        results.push(result);
      }
      
      return { 
        success: results.some(r => r.success), 
        results 
      };
    } catch (error) {
      console.error("Error setting up RLS:", error);
      return { 
        success: false, 
        results: [],
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
