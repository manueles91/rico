// This script updates the NEON_DATABASE_URL in the .env.local file
const fs = require('fs');
const path = require('path');

// Path to .env.local file
const envPath = path.join(process.cwd(), '.env.local');

// Check if .env.local exists
if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found. Please create it first.');
  process.exit(1);
}

// Read the current .env.local file
let envContent = fs.readFileSync(envPath, 'utf8');

// The new Neon database URL
const neonDatabaseUrl = "postgresql://neondb_owner:npg_2Il4NLgFuiWf@ep-square-hall-a55qqe24-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";

// Check if NEON_DATABASE_URL already exists
if (envContent.includes('NEON_DATABASE_URL=')) {
  // Replace the existing NEON_DATABASE_URL
  envContent = envContent.replace(
    /NEON_DATABASE_URL=.*/,
    `NEON_DATABASE_URL=${neonDatabaseUrl}`
  );
} else {
  // Add NEON_DATABASE_URL to .env.local
  envContent += `\n# Neon database URL\nNEON_DATABASE_URL=${neonDatabaseUrl}\n`;
}

// Write the updated content back to .env.local
fs.writeFileSync(envPath, envContent);

console.log('Updated NEON_DATABASE_URL in .env.local');
console.log('You can now run the database migrations.');
