require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkRlsStatus() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
  });

  try {
    console.log('Checking RLS status for tables...');
    
    const result = await pool.query(`
      SELECT 
        t.tablename, 
        t.tableowner, 
        t.rowsecurity
      FROM pg_tables t
      WHERE t.schemaname = 'public'
      ORDER BY t.tablename;
    `);
    
    console.log('RLS status for tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.tablename}: RLS ${row.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
    });
    
    // Check policies
    console.log('\nChecking RLS policies:');
    const policiesResult = await pool.query(`
      SELECT 
        tablename, 
        policyname, 
        permissive, 
        cmd
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    
    if (policiesResult.rows.length === 0) {
      console.log('  No RLS policies found!');
    } else {
      policiesResult.rows.forEach(row => {
        console.log(`  - ${row.tablename}: ${row.policyname} (${row.cmd})`);
      });
    }
    
  } catch (error) {
    console.error('Error checking RLS status:', error);
  } finally {
    await pool.end();
  }
}

checkRlsStatus();
