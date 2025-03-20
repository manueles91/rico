/**
 * Script to check database connectivity and configuration
 * 
 * This script:
 * 1. Checks if the database connection is working
 * 2. Verifies if environment variables are set correctly
 * 3. Lists all tables and checks if RLS is enabled
 * 
 * Usage: node scripts/check-db-connection.js
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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

// Check if a database URL is valid
function isValidDatabaseUrl(url) {
  if (!url) return false;
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
}

// Check environment variables
async function checkEnvironmentVariables() {
  log('\nChecking environment variables...', colors.cyan);
  
  const requiredVars = [
    'NEON_DATABASE_URL',
    'NEON_DATABASE_AUTHENTICATED_URL',
    'NEXT_PUBLIC_STACK_PROJECT_ID',
    'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
    'STACK_SECRET_SERVER_KEY',
  ];
  
  const optionalVars = [
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_OPENAI_API_KEY'
  ];
  
  let allRequired = true;
  let someOptional = false;
  
  // Check required variables
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      log(`❌ Missing required environment variable: ${varName}`, colors.red);
      allRequired = false;
    } else if (varName.includes('DATABASE_URL') && !isValidDatabaseUrl(value)) {
      log(`❌ Invalid database URL format: ${varName}`, colors.red);
      allRequired = false;
    } else {
      log(`✅ Found ${varName}`, colors.green);
    }
  }
  
  // Check optional variables
  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (!value) {
      log(`⚠️ Missing optional environment variable: ${varName}`, colors.yellow);
    } else {
      log(`✅ Found ${varName}`, colors.green);
      someOptional = true;
    }
  }
  
  if (allRequired) {
    log('✅ All required environment variables are set correctly', colors.green);
  } else {
    log('❌ Some required environment variables are missing or invalid', colors.red);
  }
  
  if (someOptional) {
    log('⚠️ Some optional environment variables are set', colors.yellow);
  } else {
    log('⚠️ No optional environment variables are set', colors.yellow);
  }
}

// Test database connection
async function testDatabaseConnection() {
  log('\nTesting database connection...', colors.cyan);
  
  const connectionString = process.env.NEON_DATABASE_URL;
  
  if (!connectionString) {
    log('❌ Cannot test connection: NEON_DATABASE_URL is not defined', colors.red);
    return false;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    const result = await pool.query('SELECT NOW() as time');
    log(`✅ Database connection successful! Current time: ${result.rows[0].time}`, colors.green);
    return true;
  } catch (error) {
    log(`❌ Database connection failed: ${error.message}`, colors.red);
    return false;
  } finally {
    await pool.end();
  }
}

// Check database tables and RLS status
async function checkDatabaseTables() {
  log('\nChecking database tables and RLS status...', colors.cyan);
  
  const connectionString = process.env.NEON_DATABASE_URL;
  
  if (!connectionString) {
    log('❌ Cannot check tables: NEON_DATABASE_URL is not defined', colors.red);
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    // Get a list of all tables
    const tablesResult = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    const tables = tablesResult.rows.map(row => row.tablename);
    
    if (tables.length === 0) {
      log('❌ No tables found in the database', colors.red);
      return;
    }
    
    log(`Found ${tables.length} tables:`, colors.green);
    
    // Check RLS status for each table
    for (const table of tables) {
      const rlsResult = await pool.query(`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `, [table]);
      
      const hasRls = rlsResult.rows.length > 0 && rlsResult.rows[0].relrowsecurity;
      
      if (hasRls) {
        log(`  ✅ ${table} (RLS enabled)`, colors.green);
        
        // Get RLS policies for this table
        const policiesResult = await pool.query(`
          SELECT polname, polcmd, polpermissive
          FROM pg_policy
          WHERE polrelid = (
            SELECT oid 
            FROM pg_class 
            WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
          )
        `, [table]);
        
        if (policiesResult.rows.length > 0) {
          log(`    Policies (${policiesResult.rows.length}):`, colors.blue);
          for (const policy of policiesResult.rows) {
            const cmd = policy.polcmd === 'r' ? 'SELECT' : 
                       policy.polcmd === 'a' ? 'INSERT' :
                       policy.polcmd === 'w' ? 'UPDATE' :
                       policy.polcmd === 'd' ? 'DELETE' : 'ALL';
                       
            log(`      - ${policy.polname} (${cmd})`, colors.blue);
          }
        } else {
          log('    ⚠️ RLS enabled but no policies defined', colors.yellow);
        }
      } else {
        log(`  ⚠️ ${table} (RLS not enabled)`, colors.yellow);
      }
    }
  } catch (error) {
    log(`❌ Error checking tables: ${error.message}`, colors.red);
  } finally {
    await pool.end();
  }
}

// Check migration files
async function checkMigrationFiles() {
  log('\nChecking migration files...', colors.cyan);
  
  const migrationsDir = path.resolve(process.cwd(), 'src/db/migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    log(`❌ Migrations directory not found: ${migrationsDir}`, colors.red);
    return;
  }
  
  const files = fs.readdirSync(migrationsDir);
  
  if (files.length === 0) {
    log('❌ No migration files found', colors.red);
    return;
  }
  
  log(`Found ${files.length} migration files:`, colors.green);
  
  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const stats = fs.statSync(fullPath);
    
    log(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`, colors.green);
    
    // Check content for RLS-related SQL
    const content = fs.readFileSync(fullPath, 'utf8');
    
    const hasRls = content.includes('ROW LEVEL SECURITY') || 
                  content.includes('ENABLE ROW LEVEL SECURITY') ||
                  content.includes('CREATE POLICY');
                  
    if (hasRls) {
      log(`    ✅ Contains RLS configuration`, colors.green);
      
      // Count policies
      const policyMatches = content.match(/CREATE\s+POLICY/gi);
      const policyCount = policyMatches ? policyMatches.length : 0;
      
      if (policyCount > 0) {
        log(`    Found approximately ${policyCount} policy definitions`, colors.blue);
      }
    }
  }
}

// Main function
async function main() {
  log('Database Connection Checker', colors.magenta);
  log('=========================', colors.magenta);
  
  await checkEnvironmentVariables();
  const connected = await testDatabaseConnection();
  
  if (connected) {
    await checkDatabaseTables();
  }
  
  await checkMigrationFiles();
  
  log('\nCheck complete!', colors.magenta);
}

// Run the script
main().catch(error => {
  log(`Error: ${error.message}`, colors.red);
  process.exit(1);
});
