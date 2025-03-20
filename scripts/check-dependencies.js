require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkDependencies() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
  });

  try {
    console.log('Checking dependencies on app.current_user_id...');
    
    // First check if the function exists
    const functionCheck = await pool.query(`
      SELECT proname, prorettype::regtype::text
      FROM pg_proc 
      WHERE proname = 'current_user_id' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'app');
    `);
    
    if (functionCheck.rows.length === 0) {
      console.log('Function app.current_user_id does not exist');
    } else {
      console.log(`Function app.current_user_id exists with return type: ${functionCheck.rows[0].prorettype}`);
    }
    
    // Check policies that use the function
    const policyCheck = await pool.query(`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE polqual::text LIKE '%app.current_user_id%' OR polwithcheck::text LIKE '%app.current_user_id%';
    `);
    
    console.log(`Found ${policyCheck.rows.length} policies using app.current_user_id:`);
    policyCheck.rows.forEach(row => {
      console.log(`  - ${row.policyname} on table ${row.tablename}`);
    });
    
  } catch (error) {
    console.error('Error checking dependencies:', error);
  } finally {
    await pool.end();
  }
}

checkDependencies();
