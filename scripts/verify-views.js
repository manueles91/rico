// This script verifies the created database views
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function verifyViews() {
  // Create a new client
  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
  });

  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to database');
    
    // 1. Check if user_accounts_view exists
    const userAccountsView = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' AND table_name = 'user_accounts_view'
    `);
    
    if (userAccountsView.rows.length > 0) {
      console.log('✅ user_accounts_view exists');
    } else {
      console.log('❌ user_accounts_view does not exist');
    }
    
    // 2. Check if expenses_with_categories_view exists
    const expensesView = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' AND table_name = 'expenses_with_categories_view'
    `);
    
    if (expensesView.rows.length > 0) {
      console.log('✅ expenses_with_categories_view exists');
    } else {
      console.log('❌ expenses_with_categories_view does not exist');
    }
    
    // 3. Check if add_simple_expense function exists
    const addExpenseFunction = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_name = 'add_simple_expense'
    `);
    
    if (addExpenseFunction.rows.length > 0) {
      console.log('✅ add_simple_expense function exists');
    } else {
      console.log('❌ add_simple_expense function does not exist');
    }
    
    // List all database tables
    console.log('\nAll Database Tables:');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    tables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // List all database views
    console.log('\nAll Database Views:');
    const views = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    views.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('Error verifying views:', error);
    throw error;
  } finally {
    // Close the client connection
    await client.end();
  }
}

// Run the function
verifyViews()
  .then(() => {
    console.log('\nVerification complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
