// Simple Node.js script to validate database structure
const fs = require('fs');
const path = require('path');

console.log('🔄 Validating database layer structure...');

// Check if all required files exist
const requiredFiles = [
  'src/models/database.ts',
  'src/models/migrationManager.ts',
  'src/models/types.ts',
  'src/models/index.ts',
  'src/models/migrations/001_initial_schema.sql',
  'src/models/repositories/baseRepository.ts',
  'src/models/repositories/adminUserRepository.ts',
  'src/models/repositories/billingPlanRepository.ts',
  'src/models/repositories/hotspotUserRepository.ts',
  'src/models/__tests__/database.test.ts',
  'src/models/__tests__/setup.ts'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check package.json for required dependencies
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = ['sqlite3', 'sqlite'];
const requiredDevDeps = ['jest', 'ts-jest', '@types/jest'];

console.log('\n🔄 Checking dependencies...');

requiredDeps.forEach(dep => {
  if (packageJson.dependencies && packageJson.dependencies[dep]) {
    console.log(`✅ ${dep} (dependency)`);
  } else {
    console.log(`❌ ${dep} - MISSING from dependencies`);
    allFilesExist = false;
  }
});

requiredDevDeps.forEach(dep => {
  if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
    console.log(`✅ ${dep} (devDependency)`);
  } else {
    console.log(`❌ ${dep} - MISSING from devDependencies`);
    allFilesExist = false;
  }
});

// Check if test scripts are configured
console.log('\n🔄 Checking test configuration...');
if (packageJson.scripts && packageJson.scripts.test) {
  console.log('✅ Test script configured');
} else {
  console.log('❌ Test script not configured');
  allFilesExist = false;
}

if (fs.existsSync('jest.config.js')) {
  console.log('✅ Jest configuration file exists');
} else {
  console.log('❌ Jest configuration file missing');
  allFilesExist = false;
}

console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('🎉 Database layer structure validation PASSED!');
  console.log('All required files and dependencies are in place.');
  console.log('\nNext steps:');
  console.log('1. Run "npm install" to install dependencies');
  console.log('2. Run "npm test" to execute unit tests');
  console.log('3. Run "npm run dev:api" to start the API server with database');
} else {
  console.log('❌ Database layer structure validation FAILED!');
  console.log('Some required files or dependencies are missing.');
}
console.log('='.repeat(50));