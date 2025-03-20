require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkAccountsPolicy() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
  });

  try {
    console.log('Checking accounts table RLS policy...');
    
    // Get the policy definition for accounts table
    const result = await pool.query(`
      SELECT 
        polname AS policy_name,
        CASE polcmd
          WHEN 'r' THEN 'SELECT'
          WHEN 'a' THEN 'INSERT'
          WHEN 'w' THEN 'UPDATE'
          WHEN 'd' THEN 'DELETE'
          WHEN '*' THEN 'ALL'
        END AS command,
        pg_get_expr(polqual, polrelid) AS using_expression,
        pg_get_expr(polwithcheck, polrelid) AS with_check_expression
      FROM pg_policy
      WHERE polrelid = 'public.accounts'::regclass
      ORDER BY polname;
    `);
    
    if (result.rows.length > 0) {
      console.log(`Found ${result.rows.length} policies for accounts table:`);
      result.rows.forEach((row, index) => {
        console.log(`\nPolicy ${index + 1}: ${row.policy_name}`);
        console.log(`Command: ${row.command}`);
        console.log(`USING expression: ${row.using_expression || '(none)'}`);
        console.log(`WITH CHECK expression: ${row.with_check_expression || '(none)'}`);
      });
    } else {
      console.log('No policies found for accounts table!');
    }
    
  } catch (error) {
    console.error('Error checking accounts policy:', error);
  } finally {
    await pool.end();
  }
}

checkAccountsPolicy();
