#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up MikroTik Hotspot Platform...\n');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error('❌ Node.js 18 or higher is required. Current version:', nodeVersion);
  console.log('Please download and install Node.js from: https://nodejs.org/');
  process.exit(1);
}

console.log('✅ Node.js version:', nodeVersion);

// Create necessary directories
const directories = [
  'dist',
  'dist/api',
  'dist/renderer',
  'assets',
  'assets/icons',
  'logs'
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Create a simple tsconfig.json if it doesn't exist
if (!fs.existsSync('tsconfig.json')) {
  const tsconfig = {
    "compilerOptions": {
      "target": "ES2020",
      "module": "CommonJS",
      "lib": ["ES2020"],
      "outDir": "./dist",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "allowSyntheticDefaultImports": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "moduleResolution": "node",
      "resolveJsonModule": true,
      "declaration": false,
      "sourceMap": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "**/*.test.ts"]
  };
  
  fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2));
  console.log('📝 Created tsconfig.json');
}

// Create a simple vite.config.ts if it doesn't exist
if (!fs.existsSync('vite.config.ts')) {
  const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer'
  },
  server: {
    port: 5173
  }
});`;
  
  fs.writeFileSync('vite.config.ts', viteConfig);
  console.log('📝 Created vite.config.ts');
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Run: npm install');
console.log('2. Run: npm run dev');
console.log('3. Login with: admin / admin123');
console.log('\n💡 If you encounter issues, try:');
console.log('- npm run clean');
console.log('- Delete node_modules and package-lock.json');
console.log('- Run npm install again');