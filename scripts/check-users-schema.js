require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkUsersSchema() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
  });

  try {
    console.log('Checking users table schema...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('Users table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.udt_name})`);
    });
    
  } catch (error) {
    console.error('Error checking users schema:', error);
  } finally {
    await pool.end();
  }
}

checkUsersSchema();
