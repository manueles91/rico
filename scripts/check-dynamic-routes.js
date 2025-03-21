/**
 * This script checks all API route files to make sure they have 
 * the 'export const dynamic = "force-dynamic";' declaration
 */
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');
const DYNAMIC_EXPORT = /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"];?/;

async function getAllFiles(dir, fileList = []) {
  const files = await readdirAsync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await statAsync(filePath);
    
    if (stat.isDirectory()) {
      fileList = await getAllFiles(filePath, fileList);
    } else if (file === 'route.ts') {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

async function checkDynamicExport(filePath) {
  try {
    const content = await readFileAsync(filePath, 'utf8');
    
    if (!DYNAMIC_EXPORT.test(content)) {
      // Get relative path from API_DIR
      const relativePath = path.relative(API_DIR, filePath);
      return {
        path: relativePath,
        hasDynamic: false
      };
    }
    
    return {
      path: path.relative(API_DIR, filePath),
      hasDynamic: true
    };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return {
      path: filePath,
      error: error.message
    };
  }
}

async function main() {
  try {
    console.log(`Checking API routes in ${API_DIR}...`);
    
    const routeFiles = await getAllFiles(API_DIR);
    console.log(`Found ${routeFiles.length} route files.`);
    
    const results = await Promise.all(routeFiles.map(checkDynamicExport));
    
    const missingDynamic = results.filter(result => !result.hasDynamic);
    
    if (missingDynamic.length === 0) {
      console.log('✅ All route files have dynamic export.');
    } else {
      console.log(`❌ Found ${missingDynamic.length} route files missing dynamic export:`);
      missingDynamic.forEach(file => {
        console.log(`  - ${file.path}`);
      });
    }
    
    console.log('\nAll checks complete!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
