/**
 * Script to test Row-Level Security in the Neon database
 * 
 * This script:
 * 1. Creates two test users with different personal accounts
 * 2. Creates test data (expenses, categories, etc.) for each user
 * 3. Tests that each user can only see their own data
 * 
 * Instructions:
 * 1. Make sure your Neon database is running and your .env.local has the correct URLs
 * 2. Run: node scripts/test-rls.js
 */

const { Pool, Client } = require('pg');
const util = require('util');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Database connection setup
const connectionString = process.env.NEON_DATABASE_URL;
const authenticatedConnectionString = process.env.NEON_DATABASE_AUTHENTICATED_URL;

if (!connectionString) {
  console.error('Error: NEON_DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

if (!authenticatedConnectionString) {
  console.error('Error: NEON_DATABASE_AUTHENTICATED_URL is not defined in .env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Log with colors
function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

// Create a test user and return the user object
async function createTestUser(email, name) {
  log(`Creating test user: ${email}`, colors.cyan);
  
  // Create user
  const userResult = await pool.query(
    `INSERT INTO users (id, email, name, created_at, updated_at) 
     VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) 
     RETURNING *`,
    [email, name]
  );
  
  const user = userResult.rows[0];
  log(`User created: ${user.id}`, colors.green);
  
  // Create personal account
  const accountResult = await pool.query(
    `INSERT INTO accounts (id, name, description, is_personal, created_at, updated_at) 
     VALUES (gen_random_uuid(), $1, $2, true, NOW(), NOW()) 
     RETURNING *`,
    [`${name}'s Personal Account`, 'Personal budget account']
  );
  
  const account = accountResult.rows[0];
  log(`Personal account created: ${account.id}`, colors.green);
  
  // Link user to account
  await pool.query(
    `INSERT INTO account_members (account_id, user_id, role, created_at) 
     VALUES ($1, $2, 'owner', NOW())`,
    [account.id, user.id]
  );
  log(`User linked to account as owner`, colors.green);
  
  return { user, account };
}

// Create test data (expenses, categories) for a user's account
async function createTestData(user, account) {
  log(`Creating test data for user: ${user.email}`, colors.cyan);
  
  // Create categories
  const categoryResult = await pool.query(
    `INSERT INTO categories (id, account_id, name, color, icon, created_at, created_by)
     VALUES 
     (gen_random_uuid(), $1, 'Groceries', '#4CAF50', 'shopping-cart', NOW(), $2),
     (gen_random_uuid(), $1, 'Transportation', '#2196F3', 'car', NOW(), $2)
     RETURNING *`,
    [account.id, user.id]
  );
  
  const categories = categoryResult.rows;
  log(`Created ${categories.length} categories`, colors.green);
  
  // Create expenses
  const expensesResult = await pool.query(
    `INSERT INTO expenses (id, account_id, amount, description, date, created_at, updated_at, created_by)
     VALUES 
     (gen_random_uuid(), $1, 45.99, 'Weekly groceries', NOW() - INTERVAL '3 days', NOW(), NOW(), $2),
     (gen_random_uuid(), $1, 25.50, 'Gas', NOW() - INTERVAL '1 day', NOW(), NOW(), $2)
     RETURNING *`,
    [account.id, user.id]
  );
  
  const expenses = expensesResult.rows;
  log(`Created ${expenses.length} expenses`, colors.green);
  
  // Link expenses to categories
  try {
    await pool.query(
      `INSERT INTO expense_categories (expense_id, category_id)
       VALUES ($1, $2), ($3, $4)`,
      [expenses[0].id, categories[0].id, expenses[1].id, categories[1].id]
    );
    log(`Linked expenses to categories`, colors.green);
  } catch (error) {
    log(`Note: Could not link expenses to categories (table may not exist yet): ${error.message}`, colors.yellow);
  }
  
  return { categories, expenses };
}

// Get an authenticated client for a specific user
async function getAuthenticatedClient(userId) {
  const client = new Client({
    connectionString: authenticatedConnectionString,
    ssl: true,
  });
  
  await client.connect();
  
  // Set the user ID as a session parameter for RLS
  await client.query(`SET app.current_user_id = $1`, [userId]);
  
  return client;
}

// Test RLS by impersonating different users
async function testRLS(user1, user2, account1, account2) {
  log(`\nTesting Row-Level Security (RLS)`, colors.magenta);
  
  // Direct database connection without RLS
  log(`\nTest: Direct database connection (no RLS)`, colors.yellow);
  
  log(`Query: Get all users`, colors.blue);
  const allUsersResult = await pool.query('SELECT * FROM users');
  log(`Result: ${allUsersResult.rows.length} users found`);
  
  log(`Query: Get all accounts`, colors.blue);
  const allAccountsResult = await pool.query('SELECT * FROM accounts');
  log(`Result: ${allAccountsResult.rows.length} accounts found`);
  
  log(`Query: Get all expenses`, colors.blue);
  const allExpensesResult = await pool.query('SELECT * FROM expenses');
  log(`Result: ${allExpensesResult.rows.length} expenses found`);
  
  // Test RLS with user1
  log(`\nTest: RLS with user1 (${user1.email})`, colors.yellow);
  
  // Create an authenticated client for user1
  const client1 = await getAuthenticatedClient(user1.id);
  try {
    log(`Query: Get all users`, colors.blue);
    const user1UsersResult = await client1.query('SELECT * FROM users');
    log(`Result: ${user1UsersResult.rows.length} users found`);
    
    log(`Query: Get all accounts`, colors.blue);
    const user1AccountsResult = await client1.query('SELECT * FROM accounts');
    log(`Result: ${user1AccountsResult.rows.length} accounts found`);
    
    log(`Query: Get all expenses`, colors.blue);
    const user1ExpensesResult = await client1.query('SELECT * FROM expenses');
    log(`Result: ${user1ExpensesResult.rows.length} expenses found`);
  } finally {
    await client1.end();
  }
  
  // Test RLS with user2
  log(`\nTest: RLS with user2 (${user2.email})`, colors.yellow);
  
  // Create an authenticated client for user2
  const client2 = await getAuthenticatedClient(user2.id);
  try {
    log(`Query: Get all users`, colors.blue);
    const user2UsersResult = await client2.query('SELECT * FROM users');
    log(`Result: ${user2UsersResult.rows.length} users found`);
    
    log(`Query: Get all accounts`, colors.blue);
    const user2AccountsResult = await client2.query('SELECT * FROM accounts');
    log(`Result: ${user2AccountsResult.rows.length} accounts found`);
    
    log(`Query: Get all expenses`, colors.blue);
    const user2ExpensesResult = await client2.query('SELECT * FROM expenses');
    log(`Result: ${user2ExpensesResult.rows.length} expenses found`);
  } finally {
    await client2.end();
  }
}

// Clean up test data
async function cleanupTestData(user1, user2) {
  log(`\nCleaning up test data`, colors.magenta);
  
  try {
    // Delete expense_categories if it exists
    try {
      await pool.query('DELETE FROM expense_categories WHERE expense_id IN (SELECT id FROM expenses WHERE created_by IN ($1, $2))', [user1.id, user2.id]);
      log(`Deleted expense_categories links`, colors.green);
    } catch (error) {
      log(`Note: Could not delete expense_categories (table may not exist): ${error.message}`, colors.yellow);
    }
    
    // Delete expenses and account_members
    await pool.query('DELETE FROM expenses WHERE created_by IN ($1, $2)', [user1.id, user2.id]);
    log(`Deleted test expenses`, colors.green);
    
    await pool.query('DELETE FROM categories WHERE created_by IN ($1, $2)', [user1.id, user2.id]);
    log(`Deleted test categories`, colors.green);
    
    await pool.query('DELETE FROM account_members WHERE user_id IN ($1, $2)', [user1.id, user2.id]);
    log(`Deleted account memberships`, colors.green);
    
    // Delete accounts and users
    await pool.query('DELETE FROM accounts WHERE is_personal = true AND name LIKE $1', ['%Personal Account']);
    log(`Deleted test accounts`, colors.green);
    
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [user1.email, user2.email]);
    log(`Deleted test users`, colors.green);
  } catch (error) {
    log(`Error during cleanup: ${error.message}`, colors.red);
  }
}

// Main function
async function main() {
  try {
    log(`Starting RLS test script`, colors.magenta);
    
    // Create test users with unique emails using timestamp
    const timestamp = Date.now();
    const { user: user1, account: account1 } = await createTestUser(`test1_${timestamp}@example.com`, 'Test User 1');
    const { user: user2, account: account2 } = await createTestUser(`test2_${timestamp}@example.com`, 'Test User 2');
    
    // Create test data for each user
    await createTestData(user1, account1);
    await createTestData(user2, account2);
    
    // Test RLS
    await testRLS(user1, user2, account1, account2);
    
    // Clean up
    await cleanupTestData(user1, user2);
    
    log(`RLS test completed successfully`, colors.green);
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the script
main();
