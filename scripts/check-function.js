require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkFunction() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
  });

  try {
    console.log('Checking app.get_current_user_id function...');
    
    // Check for app.get_current_user_id function
    const funcResult = await pool.query(`
      SELECT 
        p.proname AS function_name,
        pg_get_function_result(p.oid) AS result_type,
        pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'app' AND p.proname = 'get_current_user_id';
    `);
    
    if (funcResult.rows.length > 0) {
      console.log(`Function name: ${funcResult.rows[0].function_name}`);
      console.log(`Return type: ${funcResult.rows[0].result_type}`);
      console.log(`Definition:\n${funcResult.rows[0].definition}`);
    } else {
      console.log('Function not found!');
    }
    
  } catch (error) {
    console.error('Error checking function:', error);
  } finally {
    await pool.end();
  }
}

checkFunction();
