require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function testAuthConnection() {
  const authenticatedConnectionString = process.env.NEON_DATABASE_AUTHENTICATED_URL;
  
  if (!authenticatedConnectionString) {
    console.error('Error: NEON_DATABASE_AUTHENTICATED_URL is not defined in .env.local');
    process.exit(1);
  }
  
  const client = new Client({
    connectionString: authenticatedConnectionString,
    ssl: true,
  });
  
  try {
    console.log('Testing authenticated connection...');
    
    await client.connect();
    console.log('Connected to database with authenticated URL');
    
    // Set a test user ID
    const testUserId = '00000000-0000-0000-0000-000000000001';
    console.log(`Setting app.current_user_id to: ${testUserId}`);
    
    await client.query(`SELECT set_config('app.current_user_id', $1, false)`, [testUserId]);
    
    // Check if the session variable was set correctly
    const result = await client.query(`
      SELECT current_setting('app.current_user_id', TRUE) AS user_id;
    `);
    
    console.log(`Retrieved app.current_user_id: ${result.rows[0].user_id}`);
    
    // Test the app.get_current_user_id() function
    const funcResult = await client.query(`
      SELECT app.get_current_user_id() AS user_id;
    `);
    
    console.log(`Result from app.get_current_user_id(): ${funcResult.rows[0].user_id}`);
    
    // Test a simple RLS policy
    console.log('\nTesting RLS with authenticated connection:');
    
    // Get all users
    const usersResult = await client.query('SELECT COUNT(*) FROM users');
    console.log(`Users count: ${usersResult.rows[0].count}`);
    
    // Get all accounts
    const accountsResult = await client.query('SELECT COUNT(*) FROM accounts');
    console.log(`Accounts count: ${accountsResult.rows[0].count}`);
    
    // Get all expenses
    const expensesResult = await client.query('SELECT COUNT(*) FROM expenses');
    console.log(`Expenses count: ${expensesResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error testing authenticated connection:', error);
  } finally {
    await client.end();
  }
}

testAuthConnection();
