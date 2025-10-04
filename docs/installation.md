# Installation Guide

## System Requirements

### Minimum Requirements
- **Operating System**: Windows 10, macOS 10.14, or Ubuntu 18.04+
- **RAM**: 4 GB
- **Storage**: 500 MB free space
- **Network**: Internet connection for updates and MikroTik communication
- **Display**: 1024x768 resolution

### Recommended Requirements
- **Operating System**: Windows 11, macOS 12+, or Ubuntu 20.04+
- **RAM**: 8 GB or more
- **Storage**: 2 GB free space
- **Network**: Stable broadband connection
- **Display**: 1920x1080 resolution or higher

### MikroTik Router Requirements
- **RouterOS**: Version 6.40 or higher (7.x recommended)
- **Hardware**: Any MikroTik router with sufficient resources
- **API Service**: Must be enabled
- **User Account**: Admin privileges or dedicated API user
- **Network Access**: Router must be accessible from management computer

## Download

### Official Releases

Download the latest version from our official releases page:
[https://github.com/your-username/mikrotik-hotspot-platform/releases](https://github.com/your-username/mikrotik-hotspot-platform/releases)

### Version Selection

Choose the appropriate version for your operating system:

| Platform | File Extension | Architecture |
|----------|----------------|--------------|
| Windows | `.exe` | x64, x86 |
| macOS | `.dmg` | x64, ARM64 (Apple Silicon) |
| Linux | `.AppImage`, `.deb`, `.rpm` | x64 |

## Installation Instructions

### Windows Installation

#### Method 1: NSIS Installer (Recommended)

1. **Download** the `.exe` installer file
2. **Run** the installer as Administrator (right-click → "Run as administrator")
3. **Follow** the installation wizard:
   - Accept the license agreement
   - Choose installation directory (default: `C:\Program Files\MikroTik Hotspot Platform`)
   - Select additional tasks (desktop shortcut, start menu entry)
   - Click "Install"
4. **Launch** the application from:
   - Desktop shortcut
   - Start Menu → MikroTik Hotspot Platform
   - Windows Search → "MikroTik Hotspot Platform"

#### Method 2: Portable Version

1. **Download** the portable `.exe` file
2. **Create** a folder for the application (e.g., `C:\MikroTikHotspot`)
3. **Move** the executable to this folder
4. **Run** the executable directly (no installation required)
5. **Note**: Portable version stores data in the same folder

#### Windows-Specific Notes

- **Windows Defender**: May show a warning for unsigned executables. Click "More info" → "Run anyway"
- **Firewall**: Allow the application through Windows Firewall when prompted
- **Updates**: Automatic updates require administrator privileges

### macOS Installation

#### Method 1: DMG Installer (Recommended)

1. **Download** the `.dmg` file
2. **Open** the DMG file (double-click)
3. **Drag** the application to the Applications folder
4. **Eject** the DMG file
5. **Launch** from Applications folder or Spotlight search

#### Method 2: ZIP Archive

1. **Download** the `.zip` file
2. **Extract** the archive
3. **Move** the application to Applications folder
4. **Launch** the application

#### macOS-Specific Notes

- **Gatekeeper**: First launch may show "App can't be opened" warning:
  - Go to System Preferences → Security & Privacy
  - Click "Open Anyway" next to the blocked app message
  - Or right-click the app → Open → Open
- **Notarization**: Official releases are notarized for security
- **Permissions**: Grant necessary permissions when prompted (network access, file access)

### Linux Installation

#### Method 1: AppImage (Universal)

1. **Download** the `.AppImage` file
2. **Make executable**: `chmod +x MikroTik-Hotspot-Platform-*.AppImage`
3. **Run**: `./MikroTik-Hotspot-Platform-*.AppImage`
4. **Optional**: Integrate with desktop environment using AppImageLauncher

#### Method 2: Debian/Ubuntu (.deb)

```bash
# Download the .deb file
wget https://github.com/your-username/mikrotik-hotspot-platform/releases/download/v1.0.0/mikrotik-hotspot-platform_1.0.0_amd64.deb

# Install
sudo dpkg -i mikrotik-hotspot-platform_1.0.0_amd64.deb

# Fix dependencies if needed
sudo apt-get install -f

# Launch
mikrotik-hotspot-platform
```

#### Method 3: Red Hat/Fedora (.rpm)

```bash
# Download the .rpm file
wget https://github.com/your-username/mikrotik-hotspot-platform/releases/download/v1.0.0/mikrotik-hotspot-platform-1.0.0.x86_64.rpm

# Install (Fedora)
sudo dnf install mikrotik-hotspot-platform-1.0.0.x86_64.rpm

# Install (CentOS/RHEL)
sudo yum install mikrotik-hotspot-platform-1.0.0.x86_64.rpm

# Launch
mikrotik-hotspot-platform
```

#### Linux-Specific Notes

- **Dependencies**: Most dependencies are bundled, but some system libraries may be required
- **Desktop Integration**: Package installations create desktop entries automatically
- **Permissions**: No special permissions required for normal operation

## First Launch Setup

### Initial Configuration

1. **Launch** the application
2. **Database Initialization**: The application will create a local SQLite database on first run
3. **Login Screen**: You'll see the login interface

### Default Credentials

```
Username: admin
Password: admin123
```

⚠️ **Security Warning**: Change the default password immediately after first login!

### Change Default Password

1. **Login** with default credentials
2. **Click** on your username in the top-right corner
3. **Select** "Change Password"
4. **Enter** current password: `admin123`
5. **Enter** new secure password
6. **Confirm** new password
7. **Click** "Update Password"

### MikroTik Router Configuration

Before using the system, configure your MikroTik router connection:

1. **Navigate** to Admin → System Configuration
2. **Enter** MikroTik details:
   - **Router IP**: Your router's IP address (e.g., 192.168.1.1)
   - **API Port**: Usually 8728 (default)
   - **Username**: MikroTik admin username
   - **Password**: MikroTik admin password
3. **Test Connection** to verify settings
4. **Save Configuration**

## MikroTik Router Setup

### Enable API Service

Connect to your MikroTik router and enable the API service:

#### Via Winbox/WebFig
1. **Connect** to your router using Winbox or WebFig
2. **Navigate** to IP → Services
3. **Enable** the "api" service
4. **Set** port to 8728 (default) or custom port
5. **Apply** changes

#### Via Terminal/SSH
```bash
/ip service enable api
/ip service set api port=8728
```

### Create API User (Recommended)

For security, create a dedicated API user instead of using admin:

#### Via Terminal/SSH
```bash
# Create user group with API permissions
/user group add name=api policy=api,read,write,policy,test,password,sensitive

# Create API user
/user add name=hotspot-api group=api password=your-secure-password

# Verify user creation
/user print
```

#### Via Winbox/WebFig
1. **Navigate** to System → Users
2. **Add** new user:
   - **Name**: hotspot-api
   - **Group**: Create new group with API permissions
   - **Password**: Secure password
3. **Apply** changes

### Firewall Configuration

Ensure the API port is accessible:

```bash
# Allow API access from management computer
/ip firewall filter add chain=input protocol=tcp dst-port=8728 src-address=192.168.1.100 action=accept comment="Hotspot Platform API"

# Replace 192.168.1.100 with your management computer's IP
```

### Hotspot Configuration

Configure basic hotspot settings on your MikroTik router:

```bash
# Set up hotspot interface (example for wlan1)
/interface wireless security-profiles set [ find default=yes ] supplicant-identity=MikroTik

# Create hotspot
/ip hotspot setup
# Follow the setup wizard or configure manually

# Create user profiles
/ip hotspot user profile add name="1hour" session-timeout=1h rate-limit=2M/2M
/ip hotspot user profile add name="1day" session-timeout=1d rate-limit=5M/5M
```

## Verification

### Test Installation

1. **Launch** the application
2. **Login** successfully
3. **Navigate** to Admin → System Configuration
4. **Test** MikroTik connection
5. **Verify** connection success message

### Test Basic Functionality

1. **Create** a test billing plan
2. **Create** a test user
3. **Verify** user appears in MikroTik user list
4. **Generate** a test voucher
5. **Check** dashboard statistics

## Troubleshooting Installation

### Windows Issues

#### "Windows protected your PC" message
- Click "More info" → "Run anyway"
- Or disable Windows SmartScreen temporarily

#### Installation fails with permission error
- Run installer as Administrator
- Disable antivirus temporarily during installation

#### Application won't start
- Install Visual C++ Redistributable 2019 or later
- Check Windows Event Viewer for error details

### macOS Issues

#### "App can't be opened because it is from an unidentified developer"
- Right-click app → Open → Open
- Or go to System Preferences → Security & Privacy → Open Anyway

#### Application crashes on startup
- Check Console app for crash logs
- Ensure macOS version meets requirements

### Linux Issues

#### AppImage won't run
```bash
# Make executable
chmod +x MikroTik-Hotspot-Platform-*.AppImage

# Install FUSE if needed (Ubuntu/Debian)
sudo apt install fuse

# Run with verbose output
./MikroTik-Hotspot-Platform-*.AppImage --verbose
```

#### Missing dependencies
```bash
# Ubuntu/Debian
sudo apt install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxkbcommon0 libxkbfile1

# Fedora
sudo dnf install gtk3 libnotify nss libXScrnSaver libXtst xdg-utils at-spi2-atk libdrm libXcomposite libXdamage libXrandr mesa-libgbm libxkbcommon libxkbfile
```

### Network Issues

#### Cannot connect to MikroTik router
1. **Verify** router IP address and port
2. **Check** network connectivity: `ping router-ip`
3. **Test** API port: `telnet router-ip 8728`
4. **Verify** API service is enabled on router
5. **Check** firewall rules on router and computer

#### Connection timeout
1. **Increase** timeout in system configuration
2. **Check** network latency to router
3. **Verify** router is not overloaded

## Uninstallation

### Windows
1. **Use** Windows "Add or Remove Programs"
2. **Or** run uninstaller from installation directory
3. **Optional**: Remove user data from `%APPDATA%\MikroTik Hotspot Platform`

### macOS
1. **Drag** application to Trash
2. **Optional**: Remove user data from `~/Library/Application Support/MikroTik Hotspot Platform`

### Linux
```bash
# For .deb packages
sudo apt remove mikrotik-hotspot-platform

# For .rpm packages
sudo dnf remove mikrotik-hotspot-platform
# or
sudo yum remove mikrotik-hotspot-platform

# For AppImage
rm MikroTik-Hotspot-Platform-*.AppImage

# Remove user data (optional)
rm -rf ~/.config/MikroTik\ Hotspot\ Platform
```

## Data Backup Before Uninstall

**Important**: Backup your data before uninstalling:

1. **Navigate** to Admin → Database Management
2. **Create Backup** and save to safe location
3. **Export** important reports if needed
4. **Note** system configuration settings

## Getting Help

If you encounter issues during installation:

1. **Check** this guide for common solutions
2. **Review** system requirements
3. **Check** our [FAQ](faq.md)
4. **Report** issues on [GitHub](https://github.com/your-username/mikrotik-hotspot-platform/issues)
5. **Contact** support with:
   - Operating system and version
   - Installation method used
   - Error messages or screenshots
   - System specifications

---

Next: [Configuration Guide](configuration.md)