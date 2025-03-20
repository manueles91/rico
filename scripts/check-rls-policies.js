require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkRlsPolicies() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
  });

  try {
    console.log('Checking RLS policies in detail...');
    
    // Check policies with their definitions
    const policiesResult = await pool.query(`
      SELECT 
        n.nspname AS schemaname,
        c.relname AS tablename,
        pol.polname AS policyname,
        CASE pol.polpermissive WHEN 't' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS permissive,
        CASE pol.polcmd
          WHEN 'r' THEN 'SELECT'
          WHEN 'a' THEN 'INSERT'
          WHEN 'w' THEN 'UPDATE'
          WHEN 'd' THEN 'DELETE'
          WHEN '*' THEN 'ALL'
        END AS cmd,
        pg_get_expr(pol.polqual, pol.polrelid) AS qual,
        pg_get_expr(pol.polwithcheck, pol.polrelid) AS withcheck
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      ORDER BY tablename, policyname;
    `);
    
    if (policiesResult.rows.length === 0) {
      console.log('  No RLS policies found!');
    } else {
      console.log('RLS policies with definitions:');
      policiesResult.rows.forEach(row => {
        console.log(`\nTable: ${row.tablename}`);
        console.log(`  Policy: ${row.policyname}`);
        console.log(`  Command: ${row.cmd}`);
        console.log(`  Type: ${row.permissive}`);
        console.log(`  USING expression: ${row.qual || '(none)'}`);
        console.log(`  WITH CHECK expression: ${row.withcheck || '(none)'}`);
      });
    }
    
    // Check for app.get_current_user_id function
    console.log('\nChecking app.get_current_user_id function:');
    try {
      const funcResult = await pool.query(`
        SELECT pg_get_functiondef(oid) AS definition
        FROM pg_proc
        WHERE proname = 'get_current_user_id'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'app');
      `);
      
      if (funcResult.rows.length > 0) {
        console.log('Function definition:');
        console.log(funcResult.rows[0].definition);
      } else {
        console.log('Function not found!');
      }
    } catch (error) {
      console.error(`Error checking function: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error checking RLS policies:', error);
  } finally {
    await pool.end();
  }
}

checkRlsPolicies();
