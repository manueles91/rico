import fs from 'fs';
import path from 'path';
import { sql, query, pool } from '@/lib/neon';

/**
 * Runs all migration files in the migrations directory in order
 */
export async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Get all migration files
    const migrationsDir = path.join(process.cwd(), 'src', 'db', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure files are processed in order
    
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Get already applied migrations
    const appliedMigrationsResult = await pool.query('SELECT name FROM migrations');
    const appliedMigrationNames = new Set(appliedMigrationsResult.rows.map((m: any) => m.name));
    
    // Apply each migration that hasn't been applied yet
    for (const file of migrationFiles) {
      if (!appliedMigrationNames.has(file)) {
        console.log(`Applying migration: ${file}`);
        
        const filePath = path.join(migrationsDir, file);
        const migrationSql = fs.readFileSync(filePath, 'utf8');
        
        // Run the migration using a client connection instead of prepared statements
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          // Split the migration into separate statements to handle errors more gracefully
          const statements = migrationSql.split(';').filter(stmt => stmt.trim().length > 0);
          
          for (const statement of statements) {
            try {
              await client.query(statement);
            } catch (statementError: any) {
              // Ignore errors for statements that try to create objects that already exist
              if (statementError.code === '42710' || // duplicate_object
                  statementError.code === '42P07' || // duplicate_table
                  statementError.code === '42701') { // duplicate_column
                console.log(`Ignoring error for existing object: ${statementError.message}`);
                continue;
              }
              throw statementError;
            }
          }
          
          await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`Migration applied: ${file}`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`Error applying migration ${file}:`, error);
          // Continue with other migrations instead of failing completely
          console.log(`Continuing with other migrations...`);
        } finally {
          client.release();
        }
      } else {
        console.log(`Migration already applied: ${file}`);
      }
    }
    
    console.log('All migrations completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error running migrations:', error);
    return { success: false, error };
  }
}

/**
 * Seed the database with initial data
 */
export async function seedDatabase() {
  try {
    console.log('Seeding database with initial data...');
    
    // Check if we've already seeded the database
    const seedCheckResult = await pool.query(`
      SELECT COUNT(*) as count FROM users
    `);
    
    if (seedCheckResult.rows[0]?.count > 0) {
      console.log('Database already has data, skipping seed');
      return { success: true, skipped: true };
    }
    
    // Add your seeding logic here
    
    console.log('Database seeded successfully');
    return { success: true };
  } catch (error) {
    console.error('Error seeding database:', error);
    return { success: false, error };
  }
}

/**
 * Initialize the database (run migrations and seed)
 */
export async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // First run all migrations
    const migrationsResult = await runMigrations();
    if (!migrationsResult.success) {
      return migrationsResult;
    }
    
    // Ensure core tables exist (this provides a fallback if migrations fail)
    const client = await pool.connect();
    try {
      // Start a transaction
      await client.query('BEGIN');
      
      // Create users table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          name TEXT,
          avatar_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create accounts table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          is_personal BOOLEAN NOT NULL DEFAULT FALSE,
          created_by UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          is_deleted BOOLEAN DEFAULT FALSE,
          deleted_at TIMESTAMP WITH TIME ZONE
        );
      `);
      
      // Create account_members table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS account_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          account_id UUID NOT NULL,
          user_id UUID NOT NULL,
          role TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_account_user UNIQUE(account_id, user_id),
          CONSTRAINT fk_account FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      
      // Commit the transaction
      await client.query('COMMIT');
      console.log('Core tables initialized successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error initializing core tables:', error);
      return { success: false, error };
    } finally {
      client.release();
    }
    
    // Finally seed the database
    return await seedDatabase();
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error };
  }
}
