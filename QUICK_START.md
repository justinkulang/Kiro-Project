# 🚀 Quick Start Guide

## Step 1: Prerequisites

Make sure you have Node.js installed:
```bash
# Check Node.js version (should be 18 or higher)
node --version

# Check npm version
npm --version
```

If you don't have Node.js, download it from: https://nodejs.org/

## Step 2: Setup Project

```bash
# Run the setup script
node setup.js

# Install dependencies (this might take a few minutes)
npm install
```

If you get package version errors, try:
```bash
# Clear npm cache
npm cache clean --force

# Delete package-lock.json and node_modules
rm -rf node_modules package-lock.json

# Install again
npm install
```

## Step 3: Start Development Environment

```bash
# Start the development servers
npm run dev
```

This will start:
- **API Server** on http://localhost:3001
- **React Frontend** on http://localhost:5173

## Step 4: Access the Application

Open your web browser and go to:
```
http://localhost:5173
```

**Login Credentials:**
- Username: `admin`
- Password: `admin123`

## Step 5: Test Basic Functionality

### Create a Billing Plan
1. Go to **Admin** → **Billing Plans**
2. Click **"Create Plan"**
3. Fill in:
   - Name: "Test Plan"
   - Price: 10.00
   - Time Limit: 3600 (1 hour)
   - Validity: 30 days
4. Click **"Save"**

### Create a User
1. Go to **Users** page
2. Click **"Create User"**
3. Fill in:
   - Username: "testuser1"
   - Password: "password123"
   - Email: "test@example.com"
   - Select the billing plan you created
4. Click **"Create User"**

### Generate Vouchers
1. Go to **Vouchers** page
2. Click **"Generate Vouchers"**
3. Fill in:
   - Prefix: "TEST"
   - Quantity: 5
   - Select billing plan
4. Click **"Generate"**

### View Dashboard
1. Go to **Dashboard**
2. You should see:
   - Total users count
   - Statistics
   - Empty charts (will populate with real data)

## Alternative: Simplified Testing

If you want to test just the backend API without the full Electron setup:

```bash
# Start only the API server
npm run dev:api
```

Then test the API using a tool like Postman or curl:

```bash
# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test health check
curl http://localhost:3001/api/health
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Windows - Kill process on port 3001
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# macOS/Linux - Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

#### Database Errors
```bash
# Delete database and restart
rm -f database.db
npm run dev
```

#### Module Not Found Errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Errors
```bash
# Build TypeScript files
npx tsc --build

# Or ignore TypeScript errors temporarily
npm run dev:api -- --transpile-only
```

## Success Indicators

✅ You should see these in your terminal:
```
[API] Database initialized successfully
[API] Server running on port 3001
[Renderer] Local: http://localhost:5173/
```

✅ In your browser at http://localhost:5173:
- Login page loads
- Can login with admin/admin123
- Dashboard shows after login
- Can navigate between pages

## Need Help?

If you encounter issues:

1. **Check the terminal** for error messages
2. **Check browser console** (F12) for frontend errors
3. **Try the troubleshooting steps** above
4. **Create a GitHub issue** with:
   - Your operating system
   - Node.js version
   - Error messages
   - Steps you tried

Happy testing! 🎉