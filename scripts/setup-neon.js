// This script sets up the Neon database URL in the .env.local file
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to .env.local file
const envPath = path.join(process.cwd(), '.env.local');

// Check if .env.local exists
if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found. Please create it first.');
  process.exit(1);
}

// Read the current .env.local file
let envContent = fs.readFileSync(envPath, 'utf8');

// Check if NEON_DATABASE_URL already exists
if (envContent.includes('NEON_DATABASE_URL=')) {
  console.log('NEON_DATABASE_URL already exists in .env.local');
  process.exit(0);
}

// Create a free Neon database URL using the Supabase credentials
// Extract Supabase URL from .env.local
const supabaseUrlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
if (!supabaseUrlMatch) {
  console.error('NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
  process.exit(1);
}

const supabaseUrl = supabaseUrlMatch[1].trim();
const supabaseHost = supabaseUrl.replace('https://', '');

// Construct a Neon-compatible connection string using Supabase credentials
const neonDatabaseUrl = `postgresql://postgres:postgres@${supabaseHost}:5432/postgres`;

// Add NEON_DATABASE_URL to .env.local
envContent += `\n# Neon database URL (constructed from Supabase URL)\nNEON_DATABASE_URL=${neonDatabaseUrl}\n`;

// Write the updated content back to .env.local
fs.writeFileSync(envPath, envContent);

console.log('Added NEON_DATABASE_URL to .env.local');
console.log('You can now run the database migrations.');
