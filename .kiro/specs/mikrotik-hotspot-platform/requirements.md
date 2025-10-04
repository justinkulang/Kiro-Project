# Requirements Document

## Introduction

The MikroTik Hotspot Management Platform is a Windows-based application designed to streamline the management of MikroTik router hotspot services. This MVP focuses on providing essential functionality for user authentication, billing management, real-time monitoring, and comprehensive reporting. The platform targets internet service providers, hotels, cafes, and other businesses that need professional hotspot management capabilities with an intuitive interface suitable for both technical and non-technical staff.

## Requirements

### Requirement 1: User Authentication & Management

**User Story:** As a hotspot administrator, I want to manage hotspot users through MikroTik RouterOS integration, so that I can efficiently control network access and user credentials.

#### Acceptance Criteria

1. WHEN the system starts THEN it SHALL establish connection with MikroTik RouterOS via API
2. WHEN an administrator creates a new user THEN the system SHALL allow manual entry of username, password, MAC binding, validity time, and data limits
3. WHEN an administrator requests user modification THEN the system SHALL provide edit functionality for all user parameters
4. WHEN an administrator disables a user THEN the system SHALL immediately revoke network access through the MikroTik API
5. WHEN an administrator deletes a user THEN the system SHALL remove the user from both local database and MikroTik router
6. WHEN the system generates vouchers THEN it SHALL create customizable credentials with auto-generated usernames and passwords

### Requirement 2: Billing & Voucher System

**User Story:** As a business owner, I want flexible billing options and voucher management, so that I can offer various service packages and efficiently distribute access credentials.

#### Acceptance Criteria

1. WHEN creating a billing plan THEN the system SHALL support prepaid time-based options (hourly, daily, weekly, monthly)
2. WHEN creating a billing plan THEN the system SHALL support data quota-based limitations
3. WHEN generating vouchers THEN the system SHALL allow batch creation with specified quantities
4. WHEN printing vouchers THEN the system SHALL export to PDF format with customizable templates
5. WHEN exporting voucher data THEN the system SHALL support Excel format output
6. WHEN a voucher expires THEN the system SHALL automatically disable the associated user account
7. WHEN vouchers are created THEN the system SHALL track creation date, expiry, and usage status

### Requirement 3: Dashboard & Real-time Monitoring

**User Story:** As a network administrator, I want real-time visibility into network usage and user activity, so that I can monitor performance and troubleshoot issues effectively.

#### Acceptance Criteria

1. WHEN accessing the dashboard THEN the system SHALL display currently connected users with username, IP address, MAC address, uptime, and session data usage
2. WHEN viewing usage statistics THEN the system SHALL provide graphs for bandwidth utilization over time
3. WHEN monitoring user activity THEN the system SHALL show real-time count of active users
4. WHEN tracking revenue THEN the system SHALL display generated income from voucher sales
5. WHEN reviewing system activity THEN the system SHALL maintain logs of all login and logout attempts
6. WHEN data refreshes THEN the system SHALL update dashboard information every 30 seconds or less
7. WHEN network issues occur THEN the system SHALL display connection status with MikroTik router

### Requirement 4: Administrative Security & Role Management

**User Story:** As a system administrator, I want secure access control with different permission levels, so that I can maintain system security and delegate appropriate responsibilities.

#### Acceptance Criteria

1. WHEN an admin logs in THEN the system SHALL authenticate using encrypted password storage
2. WHEN assigning roles THEN the system SHALL support Super Admin, Operator, and Viewer permission levels
3. WHEN a Super Admin performs actions THEN they SHALL have full system access including user management, billing, and system configuration
4. WHEN an Operator performs actions THEN they SHALL have access to user management and voucher creation but not system configuration
5. WHEN a Viewer accesses the system THEN they SHALL only have read-only access to dashboard and reports
6. WHEN any admin action occurs THEN the system SHALL log the action with timestamp, user, and details
7. WHEN reviewing admin activity THEN the system SHALL provide searchable activity logs

### Requirement 5: Reporting & Data Export

**User Story:** As a business manager, I want comprehensive reports on system usage and revenue, so that I can analyze business performance and make informed decisions.

#### Acceptance Criteria

1. WHEN generating reports THEN the system SHALL support daily, weekly, and monthly time periods
2. WHEN creating user reports THEN the system SHALL include active user counts, session durations, and data usage
3. WHEN generating revenue reports THEN the system SHALL calculate income from voucher sales and active subscriptions
4. WHEN exporting reports THEN the system SHALL support both Excel and PDF formats
5. WHEN viewing data usage reports THEN the system SHALL show bandwidth consumption patterns and peak usage times
6. WHEN filtering reports THEN the system SHALL allow date range selection and user group filtering
7. WHEN reports are generated THEN the system SHALL complete processing within 30 seconds for standard date ranges

### Requirement 6: System Performance & Compatibility

**User Story:** As an IT administrator, I want a lightweight and efficient application, so that it runs smoothly on Windows systems without impacting performance.

#### Acceptance Criteria

1. WHEN installing the application THEN it SHALL run on Windows 10 and Windows 11 systems
2. WHEN the system operates THEN it SHALL use SQLite database for MVP deployment
3. WHEN making API calls THEN the system SHALL optimize requests to minimize MikroTik router load
4. WHEN processing voucher generation THEN the system SHALL create 100 vouchers within 10 seconds
5. WHEN the application runs THEN it SHALL consume less than 200MB of RAM during normal operation
6. WHEN generating reports THEN the system SHALL complete standard reports within 30 seconds
7. WHEN the database grows THEN the system SHALL maintain performance with up to 10,000 user records
8. WHEN future scaling is needed THEN the codebase SHALL support migration to MySQL or PostgreSQL databases