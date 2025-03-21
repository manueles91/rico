// Migration runner script
const fs = require('fs');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

async function runMigration() {
  // Get the migration file path from command line arguments
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Please provide a migration file path');
    process.exit(1);
  }
  
  // Read the migration SQL
  const migrationPath = path.resolve(process.cwd(), migrationFile);
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  // Connect to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log(`Running migration: ${migrationFile}`);
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute the migration
      await client.query(sql);
      
      // Commit the transaction
      await client.query('COMMIT');
      
      console.log('Migration completed successfully');
    } catch (error) {
      // Rollback the transaction on error
      await client.query('ROLLBACK');
      console.error('Migration failed:', error);
      process.exit(1);
    } finally {
      // Release the client
      client.release();
    }
  } finally {
    // Close the pool
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Error running migration:', err);
  process.exit(1);
});
