# MikroTik Hotspot Platform - Installation Guide

## Quick Fix for Installation Issues

If you're experiencing installation problems, follow these steps:

### 1. Clean Installation
```bash
# Remove existing installations
rmdir /s /q node_modules
del package-lock.json

# Clear npm cache
npm cache clean --force
```

### 2. Install Dependencies
```bash
# Install dependencies with legacy peer deps flag
npm install --legacy-peer-deps
```

### 3. Alternative: Use Yarn
If npm continues to fail, try using Yarn:
```bash
# Install Yarn globally
npm install -g yarn

# Install dependencies with Yarn
yarn install
```

### 4. Run Setup
```bash
# Run the setup script
npm run setup
```

### 5. Start Development
```bash
# Start both frontend and backend
npm run dev
```

## System Requirements

- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher
- **Windows**: 10 or 11
- **RAM**: Minimum 4GB recommended
- **Storage**: At least 500MB free space

## Troubleshooting

### Issue: Visual Studio Build Tools Error
**Solution**: We've replaced `better-sqlite3` with `sqlite3` and `bcrypt` with `bcryptjs` to avoid native compilation issues.

### Issue: Module Not Found Errors
**Solution**: 
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install --legacy-peer-deps`
3. If still failing, try `yarn install`

### Issue: Permission Errors
**Solution**: Run PowerShell as Administrator and try again.

### Issue: Network/Proxy Issues
**Solution**: 
```bash
# Configure npm for corporate networks
npm config set registry https://registry.npmjs.org/
npm config set strict-ssl false  # Only if behind corporate firewall
```

## Default Credentials

Once the application is running:
- **URL**: http://localhost:5173
- **Username**: admin
- **Password**: admin123

## Application Structure

```
mikrotik-hotspot-platform/
├── src/
│   ├── api/           # Backend Express.js server
│   ├── renderer/      # Frontend React application
│   ├── models/        # Database models and repositories
│   ├── services/      # Business logic services
│   └── utils/         # Utility functions
├── data/              # SQLite database storage
├── logs/              # Application logs
└── dist/              # Built application files
```

## Next Steps

1. **Configure MikroTik Connection**: Update the `.env` file with your router details
2. **Test Connection**: Use the system configuration page to test MikroTik connectivity
3. **Create Users**: Start creating hotspot users and vouchers
4. **Monitor Usage**: Use the dashboard to monitor active users and bandwidth

## Support

If you continue to experience issues:
1. Check the console logs for specific error messages
2. Ensure your MikroTik router is accessible and API is enabled
3. Verify firewall settings allow connections on ports 3001 and 5173