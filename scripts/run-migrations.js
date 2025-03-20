// This script runs the database migrations
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting database migration process...');

// First, make sure we have the database URL set up
try {
  console.log('Setting up Neon database URL...');
  execSync('node scripts/setup-neon.js', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to set up Neon database URL:', error);
  process.exit(1);
}

// Now, run the migrations by calling the API endpoint
console.log('Running database migrations...');
console.log('Starting Next.js development server...');

// Start the Next.js server in the background
const serverProcess = require('child_process').spawn(
  'npm',
  ['run', 'dev'],
  {
    stdio: 'pipe',
    shell: true,
    detached: true
  }
);

// Buffer to store server output
let serverOutput = '';

// Collect server output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  serverOutput += output;
  process.stdout.write(output);
  
  // If the server is ready, call the migration API
  if (output.includes('ready') && output.includes('started server')) {
    console.log('\nServer is ready. Calling migration API...');
    
    // Wait a bit to make sure the server is fully ready
    setTimeout(() => {
      try {
        // Call the migration API
        const result = execSync('curl http://localhost:3000/api/db-init', { encoding: 'utf8' });
        console.log('Migration API response:', result);
        
        console.log('\nDatabase migrations completed successfully.');
        console.log('You can now stop the server with Ctrl+C if needed.');
      } catch (error) {
        console.error('Failed to run migrations:', error);
      }
    }, 2000);
  }
});

// Handle server errors
serverProcess.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

// Keep the process running
process.stdin.resume();

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('Stopping server...');
  
  // On Windows, we need to kill the process tree
  if (process.platform === 'win32') {
    execSync(`taskkill /pid ${serverProcess.pid} /T /F`);
  } else {
    process.kill(-serverProcess.pid);
  }
  
  process.exit(0);
});
