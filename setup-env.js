const fs = require('fs');
const path = require('path');

// Path to the .env.local file
const envFilePath = path.join(__dirname, '.env.local');

// Check if the file exists
if (!fs.existsSync(envFilePath)) {
  console.error('.env.local file not found. Please create it first.');
  process.exit(1);
}

// Read the current content
let envContent = fs.readFileSync(envFilePath, 'utf8');

// Check if NEON_DATABASE_URL is already set
if (!envContent.includes('NEON_DATABASE_URL=')) {
  // Add the Neon database URL
  const neonUrl = 'NEON_DATABASE_URL=postgres://neondb_owner:password@localhost:5432/neondb';
  
  // Append to the file
  envContent += '\n' + neonUrl + '\n';
  
  // Write back to the file
  fs.writeFileSync(envFilePath, envContent);
  
  console.log('Added NEON_DATABASE_URL to .env.local');
} else {
  console.log('NEON_DATABASE_URL already exists in .env.local');
}

// Check for Stack Auth variables
const stackVars = [
  'NEXT_PUBLIC_STACK_PROJECT_ID',
  'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
  'STACK_SECRET_SERVER_KEY'
];

let missingStackVars = [];
for (const varName of stackVars) {
  if (!envContent.includes(`${varName}=`)) {
    missingStackVars.push(varName);
  }
}

if (missingStackVars.length > 0) {
  console.log('Missing Stack Auth variables:', missingStackVars.join(', '));
  console.log('Please add these variables to your .env.local file.');
}

console.log('Environment setup complete.');
