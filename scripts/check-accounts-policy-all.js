require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkAccountsPolicyAll() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
  });

  try {
    console.log('Checking all accounts table RLS policies...');
    
    // Get the policy definition for accounts table using a direct SQL query
    const result = await pool.query(`
      SELECT 
        polname,
        polcmd,
        polqual::text,
        polwithcheck::text
      FROM pg_policy
      WHERE polrelid = 'public.accounts'::regclass;
    `);
    
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Check the select policy specifically
    console.log('\nChecking SELECT policy for accounts table:');
    const selectResult = await pool.query(`
      SELECT 
        polname,
        pg_get_expr(polqual, polrelid) AS using_expr
      FROM pg_policy
      WHERE polrelid = 'public.accounts'::regclass
      AND polcmd = 'r';
    `);
    
    console.log(JSON.stringify(selectResult.rows, null, 2));
    
  } catch (error) {
    console.error('Error checking accounts policy:', error);
  } finally {
    await pool.end();
  }
}

checkAccountsPolicyAll();
