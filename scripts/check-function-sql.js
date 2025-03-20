require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkFunctionSql() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
  });

  try {
    console.log('Checking app.get_current_user_id function using SQL...');
    
    // Use a simpler query to get the function definition
    const result = await pool.query(`
      SELECT 
        prosrc AS source_code
      FROM pg_proc
      WHERE proname = 'get_current_user_id'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'app');
    `);
    
    if (result.rows.length > 0) {
      console.log('Function source code:');
      console.log(result.rows[0].source_code);
    } else {
      console.log('Function not found!');
    }
    
  } catch (error) {
    console.error('Error checking function:', error);
  } finally {
    await pool.end();
  }
}

checkFunctionSql();
