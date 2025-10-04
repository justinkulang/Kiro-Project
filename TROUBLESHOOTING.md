# Troubleshooting Installation Issues

## 🚨 Issue: Batch File Closes After Cleaning Installation

**Symptoms**: When you double-click `fix-and-run.bat`, it removes old installations but then closes the command window without showing errors.

### **Solution 1: Use the Manual Installer**
```bash
# Double-click this file instead:
manual-install.bat
```
This will go step-by-step and pause after each step so you can see what's happening.

### **Solution 2: Use PowerShell (Recommended)**
1. Right-click on `install.ps1`
2. Select "Run with PowerShell"
3. If you get an execution policy error, run this first:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

### **Solution 3: Manual Command Line Installation**
Open PowerShell or Command Prompt **as Administrator** and run these commands one by one:

```bash
# 1. Check Node.js
node --version
npm --version

# 2. Clean installation
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force

# 3. Install dependencies
npm install --legacy-peer-deps

# 4. If npm fails, try yarn
npm install -g yarn
yarn install

# 5. Start the application
npm run dev
```

### **Solution 4: Check for Common Issues**

#### Issue: Node.js Version Problems
```bash
# Check your Node.js version
node --version

# If you have Node.js 22.x, downgrade to 18.x LTS
# Download from: https://nodejs.org/
```

#### Issue: Permission Problems
- Run Command Prompt or PowerShell **as Administrator**
- On Windows, right-click and select "Run as administrator"

#### Issue: Antivirus Blocking Installation
- Temporarily disable antivirus during installation
- Add the project folder to antivirus exclusions

#### Issue: Corporate Network/Proxy
```bash
# Configure npm for corporate networks
npm config set registry https://registry.npmjs.org/
npm config set strict-ssl false
```

### **Solution 5: Alternative Installation Methods**

#### Method A: Use Yarn Instead of npm
```bash
# Install yarn globally
npm install -g yarn

# Install dependencies with yarn
yarn install

# Start with yarn
yarn dev
```

#### Method B: Force Installation
```bash
# Force npm to install despite warnings
npm install --force

# Or with legacy peer deps and force
npm install --legacy-peer-deps --force
```

#### Method C: Install Dependencies Individually
```bash
# Install core dependencies first
npm install express cors sqlite3 bcryptjs jsonwebtoken
npm install react react-dom @mui/material @emotion/react @emotion/styled
npm install -D typescript @types/node @types/react concurrently nodemon vite
```

## 🔍 Debugging Steps

### Step 1: Check What's Failing
Run this command to see detailed error output:
```bash
npm install --legacy-peer-deps --verbose
```

### Step 2: Check for Specific Error Messages
Look for these common errors:
- **"EACCES permission denied"** → Run as Administrator
- **"network timeout"** → Check internet connection
- **"ENOENT: no such file"** → Make sure you're in the right directory
- **"gyp ERR!"** → This should be fixed with our sqlite3/bcryptjs changes

### Step 3: Verify Your Environment
```bash
# Check Node.js and npm versions
node --version  # Should be 18.x
npm --version   # Should be 9.x or higher

# Check if you're in the right directory
dir  # Should show package.json file

# Check npm configuration
npm config list
```

## 🎯 Quick Fixes for Specific Errors

### Error: "better-sqlite3" compilation failed
**Fixed**: We replaced it with `sqlite3`. If you still see this error:
```bash
npm uninstall better-sqlite3
npm install sqlite3
```

### Error: "bcrypt" compilation failed  
**Fixed**: We replaced it with `bcryptjs`. If you still see this error:
```bash
npm uninstall bcrypt
npm install bcryptjs
```

### Error: "concurrently" not found
```bash
npm install concurrently --save-dev
```

### Error: "Cannot find module 'typescript'"
```bash
npm install -g typescript
npm install -D typescript
```

## 📞 Still Need Help?

If none of these solutions work:

1. **Take a screenshot** of the exact error message
2. **Copy the full error text** from the command window
3. **Check your system**:
   - Windows version: `winver`
   - Node.js version: `node --version`
   - npm version: `npm --version`
4. **Try the simplest approach**:
   ```bash
   # Just try to start the app if dependencies are installed
   npm run dev:api    # Start only the backend
   # Then in another window:
   npm run dev:renderer  # Start only the frontend
   ```

## 🚀 Success Indicators

You'll know it's working when you see:
- ✅ "Database connected" message in the console
- ✅ "API server running on port 3001" message
- ✅ "Local: http://localhost:5173" message
- ✅ Login page loads at http://localhost:5173
- ✅ You can login with admin/admin123

## 🔄 Alternative: Use Development Mode

If installation keeps failing, you can try running individual parts:

```bash
# Terminal 1: Start the API server
cd src/api
npx ts-node server.ts

# Terminal 2: Start the React app
cd src/renderer
npx vite

# Then access http://localhost:5173
```