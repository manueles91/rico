require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function testSessionVariable() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
  });

  try {
    console.log('Testing session variable setting...');
    
    const client = await pool.connect();
    try {
      // Set a test user ID
      const testUserId = '00000000-0000-0000-0000-000000000001';
      console.log(`Setting app.current_user_id to: ${testUserId}`);
      
      await client.query(`SET app.current_user_id = '${testUserId}'`);
      
      // Check if the session variable was set correctly
      const result = await client.query(`
        SELECT current_setting('app.current_user_id', TRUE) AS user_id;
      `);
      
      console.log(`Retrieved app.current_user_id: ${result.rows[0].user_id}`);
      
      // Test the app.get_current_user_id() function
      try {
        const funcResult = await client.query(`
          SELECT app.get_current_user_id() AS user_id;
        `);
        
        console.log(`Result from app.get_current_user_id(): ${funcResult.rows[0].user_id}`);
      } catch (error) {
        console.error(`Error calling app.get_current_user_id(): ${error.message}`);
      }
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error testing session variable:', error);
  } finally {
    await pool.end();
  }
}

testSessionVariable();
