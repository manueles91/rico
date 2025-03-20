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
          await client.query(migrationSql);
          await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`Migration applied: ${file}`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`Error applying migration ${file}:`, error);
          throw error;
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
  const migrationsResult = await runMigrations();
  if (!migrationsResult.success) {
    return migrationsResult;
  }
  
  return await seedDatabase();
}
