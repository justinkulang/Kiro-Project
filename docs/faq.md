# Frequently Asked Questions (FAQ)

## General Questions

### What is MikroTik Hotspot Platform?

MikroTik Hotspot Platform is a comprehensive desktop application for managing MikroTik router hotspot services. It provides user management, billing plans, voucher generation, real-time monitoring, and detailed reporting capabilities.

### What operating systems are supported?

The application supports:
- **Windows**: Windows 10 and 11 (x64, x86)
- **macOS**: macOS 10.14+ (Intel and Apple Silicon)
- **Linux**: Ubuntu 18.04+, Fedora, CentOS, and other distributions

### Do I need an internet connection to use the application?

An internet connection is required for:
- Initial download and installation
- Automatic updates
- Communication with MikroTik router (if not on local network)

The application can work offline for local network management once configured.

### Is my data secure?

Yes, the application implements several security measures:
- Local SQLite database (data stays on your computer)
- Encrypted password storage using bcrypt
- JWT-based authentication
- Role-based access control
- Secure communication with MikroTik routers

## Installation and Setup

### The application won't start on Windows. What should I do?

Try these solutions:
1. **Run as Administrator**: Right-click the application and select "Run as administrator"
2. **Install Visual C++ Redistributable**: Download and install the latest Visual C++ Redistributable from Microsoft
3. **Check Windows Defender**: Add the application to Windows Defender exclusions
4. **Update Windows**: Ensure your Windows is up to date
5. **Check Event Viewer**: Look for error details in Windows Event Viewer

### I get a "App can't be opened" error on macOS. How do I fix this?

This is a macOS security feature. To resolve:
1. **Right-click** the application and select "Open"
2. **Click "Open"** in the security dialog
3. **Or** go to System Preferences → Security & Privacy → General → Click "Open Anyway"

For future launches, you can open the app normally.

### The Linux AppImage won't run. What's wrong?

Common solutions:
1. **Make executable**: `chmod +x MikroTik-Hotspot-Platform-*.AppImage`
2. **Install FUSE**: `sudo apt install fuse` (Ubuntu/Debian)
3. **Check dependencies**: Install required system libraries
4. **Try --no-sandbox**: Run with `./app.AppImage --no-sandbox`

### How do I change the default admin password?

1. **Login** with default credentials (admin/admin123)
2. **Click** your username in the top-right corner
3. **Select** "Change Password"
4. **Enter** current password and new password
5. **Click** "Update Password"

⚠️ **Important**: Change the default password immediately after installation!

## MikroTik Router Configuration

### How do I enable the MikroTik API?

**Via Winbox/WebFig:**
1. Connect to your router
2. Go to IP → Services
3. Enable the "api" service
4. Set port to 8728 (or custom port)

**Via Terminal:**
```bash
/ip service enable api
/ip service set api port=8728
```

### What MikroTik RouterOS versions are supported?

- **Minimum**: RouterOS 6.40
- **Recommended**: RouterOS 7.x (latest stable)
- **API Version**: v1 and v2 are supported

### I can't connect to my MikroTik router. What should I check?

1. **Network Connectivity**: Can you ping the router? `ping 192.168.1.1`
2. **API Service**: Is the API service enabled on the router?
3. **Port Access**: Is port 8728 accessible? `telnet 192.168.1.1 8728`
4. **Credentials**: Are the username and password correct?
5. **Firewall**: Check firewall rules on both router and computer
6. **User Permissions**: Does the user have API access permissions?

### Should I use the admin user or create a dedicated API user?

**Recommended**: Create a dedicated API user for security:

```bash
# Create API user group
/user group add name=api policy=api,read,write,policy,test,password

# Create API user
/user add name=hotspot-api group=api password=secure-password
```

This provides better security and audit trails.

### How do I configure hotspot profiles on MikroTik?

```bash
# Create user profiles
/ip hotspot user profile add name="1hour" session-timeout=1h rate-limit=2M/2M
/ip hotspot user profile add name="1day" session-timeout=1d rate-limit=5M/5M
/ip hotspot user profile add name="unlimited" rate-limit=10M/10M

# Set up hotspot (if not already configured)
/ip hotspot setup
```

## User Management

### How do I create users in bulk?

1. **Navigate** to Users page
2. **Click** "Batch Create Users"
3. **Configure** settings:
   - Prefix for usernames
   - Number of users to create
   - Billing plan
   - Expiration date
4. **Click** "Create Users"

### Can I import users from a CSV file?

Currently, the application supports batch creation with automatic username generation. CSV import is planned for future releases.

### How do I reset a user's password?

1. **Find** the user in the Users list
2. **Click** the "Edit" button (pencil icon)
3. **Click** "Generate New Password" or enter a custom password
4. **Save** changes

The new password will be displayed for you to share with the user.

### Users are created in the application but don't appear in MikroTik. Why?

Check these items:
1. **MikroTik Connection**: Verify the connection status in System Configuration
2. **API Permissions**: Ensure the API user has write permissions
3. **Hotspot Configuration**: Verify hotspot is properly configured on the router
4. **Manual Sync**: Try the "Sync with MikroTik" option in the Users page
5. **Error Logs**: Check the application logs for error messages

## Voucher System

### How do voucher codes work?

Vouchers are pre-generated access codes that users can redeem to create hotspot accounts. Each voucher:
- Has a unique code (e.g., GUEST001, VIP123)
- Is linked to a specific billing plan
- Has an expiration date
- Can only be used once

### Can I customize voucher code format?

Yes, you can customize:
- **Prefix**: Text before the number (e.g., "GUEST", "VIP")
- **Length**: Total code length
- **Quantity**: Number of vouchers to generate

### How do I print vouchers?

1. **Generate** vouchers
2. **Select** vouchers to print
3. **Click** "Print Vouchers"
4. **Choose** format:
   - Simple list
   - Formatted cards
   - With QR codes
5. **Print** or save as PDF

### Can users redeem vouchers themselves?

This depends on your hotspot setup. You can:
- Provide voucher codes for manual entry
- Set up a self-service portal (requires additional configuration)
- Manually redeem vouchers for users

## Reports and Monitoring

### How often is the dashboard updated?

The dashboard updates:
- **Active Users**: Every 30 seconds
- **Bandwidth Charts**: Every 1 minute
- **Statistics**: Every 5 minutes

You can also manually refresh using the refresh button.

### Can I schedule automatic reports?

Yes, you can schedule reports to be generated automatically:
1. **Go** to Reports page
2. **Click** "Schedule Report"
3. **Configure** frequency (daily, weekly, monthly)
4. **Set** email recipients
5. **Save** schedule

### What report formats are available?

Reports can be exported in:
- **PDF**: Professional formatted reports
- **Excel**: Spreadsheet format for analysis
- **CSV**: Raw data for import into other systems

### How long is data retained?

By default:
- **User Data**: Retained indefinitely
- **Session Logs**: 1 year
- **Admin Logs**: 6 months
- **Reports**: 3 months

You can configure retention periods in Admin → System Configuration.

## Performance and Troubleshooting

### The application is running slowly. How can I improve performance?

1. **Optimize Database**: Go to Admin → Database → Optimize
2. **Clear Cache**: Admin → System → Clear Cache
3. **Increase Memory**: Ensure your computer has adequate RAM (8GB+ recommended)
4. **Close Other Applications**: Free up system resources
5. **Check Network**: Ensure stable connection to MikroTik router

### How do I backup my data?

**Automatic Backup** (Recommended):
1. **Go** to Admin → Database Management
2. **Enable** automatic backups
3. **Set** backup frequency and location

**Manual Backup**:
1. **Go** to Admin → Database Management
2. **Click** "Create Backup"
3. **Choose** backup location
4. **Click** "Backup Now"

### How do I restore from a backup?

⚠️ **Warning**: This will overwrite your current data!

1. **Go** to Admin → Database Management
2. **Click** "Restore Database"
3. **Select** backup file
4. **Confirm** restoration
5. **Restart** the application

### The application crashed. How do I recover?

1. **Restart** the application
2. **Check** if data is intact
3. **Restore** from recent backup if needed
4. **Check** log files for error details
5. **Contact** support if issues persist

### Where are log files located?

Log files are stored at:
- **Windows**: `%APPDATA%\MikroTik Hotspot Platform\logs\`
- **macOS**: `~/Library/Application Support/MikroTik Hotspot Platform/logs/`
- **Linux**: `~/.config/MikroTik Hotspot Platform/logs/`

## Licensing and Updates

### Is the application free to use?

Yes, MikroTik Hotspot Platform is open-source and free to use under the MIT License.

### How do I update the application?

**Automatic Updates** (Recommended):
- The application checks for updates automatically
- You'll be notified when updates are available
- Choose to download and install updates

**Manual Updates**:
1. **Download** the latest version from GitHub releases
2. **Install** over the existing installation
3. **Your data** will be preserved

### Can I disable automatic updates?

Yes, you can disable automatic updates in:
1. **Go** to Admin → System Configuration
2. **Uncheck** "Enable automatic updates"
3. **Save** configuration

You'll need to manually check for updates.

## Advanced Configuration

### Can I use a custom database location?

Yes, you can specify a custom database location:
1. **Close** the application
2. **Set** environment variable: `DATABASE_PATH=/path/to/database.db`
3. **Restart** the application

### How do I configure email notifications?

1. **Go** to Admin → System Configuration
2. **Configure** SMTP settings:
   - SMTP server
   - Port and security
   - Username and password
3. **Test** email configuration
4. **Save** settings

### Can I run multiple instances?

No, only one instance can run at a time to prevent database conflicts. If you need multiple installations, use different database locations.

### How do I migrate to a new computer?

1. **Backup** data on old computer
2. **Install** application on new computer
3. **Restore** backup on new computer
4. **Update** MikroTik connection settings if IP changed

## Getting Help

### Where can I get additional support?

1. **Documentation**: Check the [User Manual](user-manual.md)
2. **GitHub Issues**: Report bugs or request features
3. **Community**: Join our Discord community
4. **Email Support**: Contact support@mikrotik-hotspot-platform.com

### How do I report a bug?

When reporting bugs, please include:
1. **Operating System** and version
2. **Application version**
3. **Steps to reproduce** the issue
4. **Expected vs actual behavior**
5. **Screenshots** if applicable
6. **Log files** if requested

### How do I request a new feature?

1. **Check** existing feature requests on GitHub
2. **Create** a new issue with "Feature Request" label
3. **Describe** the feature and use case
4. **Explain** why it would be valuable

### Is commercial support available?

Yes, commercial support options include:
- Priority support
- Custom development
- Training and consultation
- On-site installation and setup

Contact us for commercial support pricing and options.

---

**Still have questions?** Check our [User Manual](user-manual.md) or contact support.