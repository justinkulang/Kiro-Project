# User Manual

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [User Management](#user-management)
4. [Voucher System](#voucher-system)
5. [Reports](#reports)
6. [Administration](#administration)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### First Login

When you first launch MikroTik Hotspot Platform, you'll be presented with a login screen.

**Default Credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **Security Notice**: Change the default password immediately after your first login.

### Changing Your Password

1. Click on your username in the top-right corner
2. Select "Change Password"
3. Enter your current password
4. Enter and confirm your new password
5. Click "Update Password"

### Initial Configuration

Before you can start managing users, you need to configure your MikroTik router connection:

1. Navigate to **Admin** → **System Configuration**
2. Fill in your MikroTik router details:
   - **Router IP**: The IP address of your MikroTik router
   - **API Port**: Usually 8728 (default)
   - **Username**: Your MikroTik admin username
   - **Password**: Your MikroTik admin password
3. Click **Test Connection** to verify the settings
4. Click **Save Configuration** if the test is successful

## Dashboard Overview

The dashboard provides a real-time overview of your hotspot system:

### Key Metrics
- **Total Users**: Number of registered users
- **Active Users**: Currently connected users
- **Total Vouchers**: Generated vouchers count
- **Monthly Revenue**: Revenue for the current month

### Active Users Table
Shows currently connected users with:
- Username
- IP Address
- Session Duration
- Data Usage (Upload/Download)
- Actions (Disconnect)

### Bandwidth Chart
Visual representation of network usage over time showing:
- Upload bandwidth
- Download bandwidth
- Total bandwidth utilization

### System Status
Displays:
- MikroTik router connection status
- Database status
- System uptime
- Memory usage

## User Management

### Creating Users

1. Navigate to **Users** page
2. Click **Create User** button
3. Fill in the user details:
   - **Username**: Unique identifier (required)
   - **Password**: User's password (auto-generated if left empty)
   - **Full Name**: User's display name
   - **Email**: Contact email address
   - **Phone**: Contact phone number
   - **Billing Plan**: Select from available plans (required)
   - **Expiration Date**: When the account expires
4. Click **Create User**

### Editing Users

1. Find the user in the users list
2. Click the **Edit** button (pencil icon)
3. Modify the desired fields
4. Click **Save Changes**

### User Actions

For each user, you can:
- **Edit**: Modify user details
- **Delete**: Remove the user (requires confirmation)
- **Reset Password**: Generate a new password
- **Extend Expiration**: Add more time to the account
- **Toggle Status**: Enable/disable the account

### Bulk Operations

Select multiple users using checkboxes to:
- **Bulk Delete**: Remove multiple users
- **Bulk Status Change**: Enable/disable multiple accounts
- **Export Selected**: Export user data to CSV/Excel

### User Search and Filtering

Use the search and filter options to find users:
- **Search**: Enter username, email, or full name
- **Status Filter**: Show active, inactive, or all users
- **Billing Plan Filter**: Filter by specific billing plans
- **Date Range**: Filter by creation or expiration dates

## Voucher System

### Creating Vouchers

1. Navigate to **Vouchers** page
2. Click **Generate Vouchers** button
3. Configure voucher settings:
   - **Prefix**: Text prefix for voucher codes
   - **Quantity**: Number of vouchers to generate
   - **Billing Plan**: Select the plan for these vouchers
   - **Expiration**: When vouchers expire
   - **Length**: Code length (characters)
4. Click **Generate Vouchers**

### Voucher Management

#### Voucher Status
- **Available**: Ready to be used
- **Used**: Already redeemed by a user
- **Expired**: Past expiration date

#### Voucher Actions
- **View Details**: See voucher information
- **Delete**: Remove unused vouchers
- **Export**: Download voucher list

### Printing Vouchers

1. Select vouchers to print
2. Click **Print Vouchers**
3. Choose print format:
   - **Simple List**: Basic text format
   - **Formatted Cards**: Professional voucher cards
   - **QR Codes**: Include QR codes for easy scanning
4. Configure print settings and print

### Voucher Reports

Generate reports showing:
- Voucher usage statistics
- Revenue by voucher type
- Expiration tracking
- Usage patterns

## Reports

### Available Reports

#### User Reports
- **User List**: Complete user database export
- **Active Users**: Currently active users
- **User Activity**: Login/logout history
- **Expired Users**: Users past expiration date

#### Revenue Reports
- **Daily Revenue**: Income by day
- **Monthly Revenue**: Income by month
- **Revenue by Plan**: Income breakdown by billing plan
- **Payment History**: Transaction records

#### Usage Reports
- **Bandwidth Usage**: Data consumption statistics
- **Session Reports**: Connection session details
- **Peak Usage**: High-traffic periods
- **Usage Trends**: Historical usage patterns

#### System Reports
- **System Health**: Performance metrics
- **Error Logs**: System error tracking
- **Admin Activity**: Administrative action logs
- **Backup Status**: Database backup information

### Generating Reports

1. Navigate to **Reports** page
2. Select report type from dropdown
3. Configure parameters:
   - **Date Range**: Start and end dates
   - **Filters**: Additional filtering options
   - **Format**: PDF, Excel, or CSV
4. Click **Generate Report**
5. Download or view the generated report

### Scheduled Reports

Set up automatic report generation:

1. Click **Schedule Report**
2. Configure schedule:
   - **Report Type**: Select report to generate
   - **Frequency**: Daily, weekly, or monthly
   - **Time**: When to generate
   - **Recipients**: Email addresses to send to
   - **Format**: Output format preference
3. Click **Save Schedule**

## Administration

### User Roles

#### Super Admin
- Full system access
- Can create/modify admin users
- System configuration access
- All reporting capabilities

#### Admin
- User and voucher management
- Report generation
- Limited system configuration
- Cannot modify admin users

#### Operator
- View-only access to users and vouchers
- Basic report generation
- No administrative functions

### System Configuration

#### MikroTik Settings
- **Router Connection**: IP, port, credentials
- **API Settings**: Timeout, retry settings
- **Sync Options**: Automatic synchronization preferences

#### Application Settings
- **System Name**: Display name for your system
- **Time Zone**: Local time zone setting
- **Language**: Interface language
- **Theme**: Light or dark mode

#### Security Settings
- **Password Policy**: Minimum requirements
- **Session Timeout**: Automatic logout time
- **Login Attempts**: Failed login limits
- **Two-Factor Authentication**: Enable/disable 2FA

### Billing Plans

Create and manage billing plans:

1. Navigate to **Admin** → **Billing Plans**
2. Click **Create Plan**
3. Configure plan details:
   - **Plan Name**: Descriptive name
   - **Price**: Cost of the plan
   - **Time Limit**: Maximum session time
   - **Data Limit**: Maximum data allowance
   - **Validity Period**: How long the plan lasts
   - **Speed Limits**: Upload/download speeds
4. Click **Save Plan**

### Admin Activity Logs

Monitor administrative actions:
- User creation/modification/deletion
- System configuration changes
- Login/logout events
- Report generation
- Backup/restore operations

### Database Management

#### Backup
1. Navigate to **Admin** → **Database**
2. Click **Create Backup**
3. Choose backup location
4. Click **Backup Now**

#### Restore
1. Navigate to **Admin** → **Database**
2. Click **Restore Database**
3. Select backup file
4. Confirm restoration (⚠️ This will overwrite current data)

#### Maintenance
- **Optimize Database**: Improve performance
- **Clean Old Logs**: Remove old activity logs
- **Vacuum Database**: Reclaim disk space

## Troubleshooting

### Common Issues

#### Cannot Connect to MikroTik Router

**Symptoms**: Connection test fails, users not syncing

**Solutions**:
1. Verify router IP address and port
2. Check MikroTik API service is enabled
3. Confirm username/password are correct
4. Ensure network connectivity between computer and router
5. Check firewall settings

#### Users Not Appearing in MikroTik

**Symptoms**: Users created in platform but not visible in MikroTik

**Solutions**:
1. Check MikroTik connection status
2. Verify API user has sufficient permissions
3. Try manual sync from Users page
4. Check MikroTik user manager configuration

#### Application Won't Start

**Symptoms**: Application crashes on startup or won't launch

**Solutions**:
1. Check system requirements are met
2. Run as administrator (Windows)
3. Check antivirus software isn't blocking
4. Reinstall the application
5. Check system logs for error details

#### Slow Performance

**Symptoms**: Application responds slowly, reports take long to generate

**Solutions**:
1. Close unnecessary applications
2. Increase available RAM
3. Optimize database from Admin panel
4. Clear application cache
5. Check network connection speed

#### Database Errors

**Symptoms**: Error messages about database corruption or access

**Solutions**:
1. Restart the application
2. Run database optimization
3. Restore from recent backup
4. Check disk space availability
5. Contact support if issues persist

### Getting Help

If you continue to experience issues:

1. **Check the FAQ**: Common questions and solutions
2. **Review Logs**: Check application logs for error details
3. **Contact Support**: Email support with:
   - Detailed description of the issue
   - Steps to reproduce the problem
   - Screenshots if applicable
   - System information (OS, version, etc.)
   - Log files if requested

### Log Files Location

Application logs can be found at:
- **Windows**: `%APPDATA%/MikroTik Hotspot Platform/logs/`
- **macOS**: `~/Library/Application Support/MikroTik Hotspot Platform/logs/`
- **Linux**: `~/.config/MikroTik Hotspot Platform/logs/`

### Performance Tips

1. **Regular Maintenance**:
   - Optimize database monthly
   - Clean old logs regularly
   - Keep application updated

2. **System Optimization**:
   - Ensure adequate RAM (8GB+ recommended)
   - Use SSD storage for better performance
   - Maintain stable network connection

3. **Data Management**:
   - Archive old user data
   - Limit report date ranges
   - Use filters to reduce data loading

---

For additional help, please refer to our [FAQ](faq.md) or contact support.