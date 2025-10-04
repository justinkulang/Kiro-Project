# MikroTik Hotspot Platform

## 🚨 INSTALLATION FIX - READ THIS FIRST!

**Having trouble with installation? Try these options in order:**

### Option 1: Manual Step-by-Step (Recommended)
```bash
# Double-click this file to see exactly what's failing:
manual-install.bat
```

### Option 2: PowerShell Installer
```bash
# Right-click and "Run with PowerShell":
install.ps1
```

### Option 3: Manual Commands (Run as Administrator)
```bash
# Clean and reinstall
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
npm run dev
```

### Option 4: If All Else Fails
See `TROUBLESHOOTING.md` for detailed solutions to specific errors.

### Key Changes Made:
- ✅ Replaced `better-sqlite3` with `sqlite3` (no Visual Studio Build Tools needed)
- ✅ Replaced `bcrypt` with `bcryptjs` (pure JavaScript, no compilation)
- ✅ Fixed Node.js 22.x compatibility issues
- ✅ Added automated installation scripts

**Default Login**: `admin` / `admin123`  
**Access**: http://localhost:5173 (Frontend) | http://localhost:3001 (API)

---

<div align="center">

**A comprehensive hotspot management solution for MikroTik routers**

[![Build Status](https://github.com/your-username/mikrotik-hotspot-platform/workflows/CI/badge.svg)](https://github.com/your-username/mikrotik-hotspot-platform/actions)
[![Release](https://img.shields.io/github/release/your-username/mikrotik-hotspot-platform.svg)](https://github.com/your-username/mikrotik-hotspot-platform/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/your-username/mikrotik-hotspot-platform/releases)

</div>

## 🚀 Features

### 👥 User Management
- **Comprehensive User Profiles**: Full name, email, phone, address management
- **Billing Plan Integration**: Time-based, data-based, and hybrid billing plans
- **Batch Operations**: Create, update, and manage users in bulk
- **Real-time Synchronization**: Automatic sync with MikroTik RouterOS
- **User Status Tracking**: Active/inactive status with expiration management

### 🎫 Voucher System
- **Flexible Voucher Generation**: Customizable prefixes, quantities, and expiration
- **Multiple Export Formats**: PDF and Excel export with custom templates
- **Batch Processing**: Generate thousands of vouchers efficiently
- **Usage Tracking**: Monitor voucher redemption and usage statistics
- **QR Code Integration**: Generate QR codes for easy voucher distribution

### 📊 Real-time Monitoring
- **Live Dashboard**: Real-time active users, bandwidth usage, and system statistics
- **Session Tracking**: Detailed session logs with connection history
- **Bandwidth Analytics**: Upload/download statistics with visual charts
- **System Health**: Router resource monitoring and connection status
- **Alert System**: Configurable alerts for system events and thresholds

### 📈 Advanced Reporting
- **Comprehensive Reports**: Users, revenue, usage, and system reports
- **Flexible Date Ranges**: Custom date filtering and period selection
- **Multiple Export Formats**: PDF, Excel, and CSV export options
- **Scheduled Reports**: Automated report generation and email delivery
- **Visual Analytics**: Charts and graphs for data visualization

### 🔐 Security & Administration
- **Role-based Access Control**: Super Admin, Admin, and Operator roles
- **Audit Logging**: Complete activity tracking and security monitoring
- **Secure Authentication**: JWT-based authentication with session management
- **Data Encryption**: Secure password hashing and sensitive data protection
- **Backup & Restore**: Database backup and restoration capabilities

### ⚡ Performance & Reliability
- **Optimized Performance**: Advanced caching and database optimization
- **Scalable Architecture**: Handle thousands of users and sessions
- **Error Handling**: Comprehensive error handling and recovery
- **Auto-updates**: Automatic application updates with user control
- **Cross-platform**: Native desktop applications for Windows, macOS, and Linux

## 🛠️ Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Desktop App** | Electron 25+ | Cross-platform desktop application |
| **Frontend** | React 18 + TypeScript | Modern, type-safe user interface |
| **UI Framework** | Material-UI 5 | Professional, accessible components |
| **Backend** | Node.js + Express | RESTful API server |
| **Database** | SQLite | Embedded, serverless database |
| **Authentication** | JWT + bcrypt | Secure token-based authentication |
| **Testing** | Jest + Playwright | Unit and end-to-end testing |
| **Build System** | Vite + electron-builder | Fast builds and packaging |

## 📋 System Requirements

### Minimum Requirements
- **OS**: Windows 10, macOS 10.14, or Ubuntu 18.04+
- **RAM**: 4 GB
- **Storage**: 500 MB free space
- **Network**: Internet connection for updates and MikroTik communication

### Recommended Requirements
- **OS**: Windows 11, macOS 12+, or Ubuntu 20.04+
- **RAM**: 8 GB or more
- **Storage**: 2 GB free space
- **Network**: Stable network connection

### MikroTik Router Requirements
- **RouterOS**: Version 6.40 or higher
- **API Access**: API service enabled
- **User Permissions**: Admin or API user account
- **Network**: Accessible via IP address from the management computer

## 🚀 Quick Start

### 1. Download and Install

#### Windows
1. Download the latest `.exe` installer from [Releases](https://github.com/your-username/mikrotik-hotspot-platform/releases)
2. Run the installer and follow the setup wizard
3. Launch the application from the Start Menu or Desktop shortcut

#### macOS
1. Download the latest `.dmg` file from [Releases](https://github.com/your-username/mikrotik-hotspot-platform/releases)
2. Open the DMG and drag the app to Applications folder
3. Launch from Applications (you may need to allow the app in Security & Privacy settings)

#### Linux
1. Download the appropriate package (`.AppImage`, `.deb`, or `.rpm`) from [Releases](https://github.com/your-username/mikrotik-hotspot-platform/releases)
2. Install using your package manager or run the AppImage directly
3. Launch from the applications menu or command line

### 2. Initial Setup

1. **Launch the Application**
   - Start MikroTik Hotspot Platform
   - The application will create a local database on first run

2. **Login with Default Credentials**
   ```
   Username: admin
   Password: admin123
   ```
   ⚠️ **Important**: Change the default password immediately after first login

3. **Configure MikroTik Connection**
   - Navigate to Admin → System Configuration
   - Enter your MikroTik router details:
     - **Host**: Router IP address (e.g., 192.168.1.1)
     - **Port**: API port (default: 8728)
     - **Username**: MikroTik admin username
     - **Password**: MikroTik admin password
   - Test the connection to verify settings

4. **Create Billing Plans**
   - Go to Admin → Billing Plans
   - Create your first billing plan with appropriate limits
   - Set pricing, time limits, and data allowances

5. **Start Managing Users**
   - Navigate to Users section
   - Create your first hotspot user
   - Generate vouchers for guest access

## 🧪 Development

### Prerequisites
- Node.js 18 or higher
- npm 9 or higher
- Git

### Setup Development Environment

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/mikrotik-hotspot-platform.git
   cd mikrotik-hotspot-platform
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Servers**
   ```bash
   npm run dev
   ```
   This starts:
   - API server on http://localhost:3001
   - React development server on http://localhost:5173
   - Electron application with hot reload

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start all development servers |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:coverage` | Generate test coverage report |
| `npm run lint` | Run ESLint |
| `npm run package` | Package the application |
| `npm run dist` | Build and create distributables |

### Project Structure

```
mikrotik-hotspot-platform/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts          # Main application entry
│   │   ├── preload.ts       # Preload script for security
│   │   └── updater.ts       # Auto-updater service
│   ├── renderer/            # React frontend application
│   │   ├── src/
│   │   │   ├── components/  # React components
│   │   │   ├── pages/       # Application pages
│   │   │   ├── services/    # API services
│   │   │   ├── contexts/    # React contexts
│   │   │   └── hooks/       # Custom React hooks
│   │   └── public/          # Static assets
│   ├── api/                 # Express.js backend
│   │   ├── routes/          # API route handlers
│   │   └── server.ts        # API server entry
│   ├── services/            # Business logic services
│   │   ├── authService.ts   # Authentication service
│   │   ├── userManagementService.ts # User management
│   │   ├── mikrotikService.ts # MikroTik integration
│   │   └── reportingService.ts # Report generation
│   ├── models/              # Database models and repositories
│   │   ├── repositories/    # Data access layer
│   │   ├── migrations/      # Database migrations
│   │   └── types.ts         # TypeScript type definitions
│   ├── middleware/          # Express middleware
│   │   ├── authMiddleware.ts # Authentication middleware
│   │   └── errorHandler.ts  # Error handling middleware
│   └── utils/               # Utility functions
├── docs/                    # Documentation
├── build/                   # Build configuration files
├── assets/                  # Application assets (icons, etc.)
├── tests/                   # Test files
└── dist/                    # Built application files
```

## 📖 Documentation

- [📘 User Manual](docs/user-manual.md) - Complete user guide with screenshots
- [⚙️ Installation Guide](docs/installation.md) - Detailed installation instructions
- [🔧 Configuration Guide](docs/configuration.md) - System and MikroTik configuration
- [🏗️ Development Setup](docs/development.md) - Setting up the development environment
- [📚 API Documentation](docs/api.md) - Complete API reference
- [🧪 Testing Guide](docs/testing.md) - Running and writing tests
- [❓ FAQ](docs/faq.md) - Frequently asked questions and troubleshooting

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 Check the [User Manual](docs/user-manual.md)
- ❓ Read the [FAQ](docs/faq.md)
- 🐛 Report bugs on [GitHub Issues](https://github.com/your-username/mikrotik-hotspot-platform/issues)

---

<div align="center">

**Made with ❤️ for the MikroTik community**

[Documentation](docs/) • [Releases](https://github.com/your-username/mikrotik-hotspot-platform/releases) • [Issues](https://github.com/your-username/mikrotik-hotspot-platform/issues)

</div>