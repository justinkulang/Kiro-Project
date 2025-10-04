-- Initial database schema for MikroTik Hotspot Platform

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Billing plans table
CREATE TABLE IF NOT EXISTS billing_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    time_limit INTEGER, -- in minutes, NULL for unlimited
    data_limit BIGINT, -- in bytes, NULL for unlimited
    speed_limit_up INTEGER, -- in kbps, NULL for unlimited
    speed_limit_down INTEGER, -- in kbps, NULL for unlimited
    validity_period INTEGER NOT NULL, -- in days
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Hotspot users table
CREATE TABLE IF NOT EXISTS hotspot_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(50) NOT NULL,
    billing_plan_id INTEGER,
    email VARCHAR(100),
    phone VARCHAR(20),
    full_name VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    data_used BIGINT DEFAULT 0,
    time_used INTEGER DEFAULT 0, -- in minutes
    last_login DATETIME,
    FOREIGN KEY (billing_plan_id) REFERENCES billing_plans(id)
);

-- Vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL,
    billing_plan_id INTEGER NOT NULL,
    batch_id VARCHAR(50),
    is_used BOOLEAN DEFAULT 0,
    used_by_user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME,
    expires_at DATETIME,
    FOREIGN KEY (billing_plan_id) REFERENCES billing_plans(id),
    FOREIGN KEY (used_by_user_id) REFERENCES hotspot_users(id)
);

-- User sessions table for tracking active connections
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES hotspot_users(id)
);

-- Admin activity logs
CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id INTEGER NOT NULL,
    admin_username VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) CHECK(target_type IN ('user', 'voucher', 'billing_plan', 'admin', 'system', 'report')),
    target_id VARCHAR(50),
    target_name VARCHAR(100),
    details TEXT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT 1,
    error_message TEXT,
    timestamp DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hotspot_users_username ON hotspot_users(username);
CREATE INDEX IF NOT EXISTS idx_hotspot_users_billing_plan ON hotspot_users(billing_plan_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_users_active ON hotspot_users(is_active);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_batch ON vouchers(batch_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_used ON vouchers(is_used);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp ON admin_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_type ON admin_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_success ON admin_logs(success);

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO admin_users (username, email, password_hash, role) 
VALUES ('admin', 'admin@localhost', '$2b$10$rQZ8kHWKtGY5uFJ5uFJ5uOJ5uFJ5uFJ5uFJ5uFJ5uFJ5uFJ5uFJ5u', 'super_admin');

-- Insert default system settings
INSERT OR IGNORE INTO system_settings (key, value, description) VALUES
('mikrotik_host', '192.168.1.1', 'MikroTik router IP address'),
('mikrotik_port', '8728', 'MikroTik API port'),
('mikrotik_username', 'admin', 'MikroTik admin username'),
('mikrotik_password', '', 'MikroTik admin password'),
('session_timeout', '30', 'Session timeout in minutes'),
('max_concurrent_sessions', '1', 'Maximum concurrent sessions per user'),
('voucher_prefix', 'HSP', 'Voucher code prefix'),
('voucher_length', '8', 'Voucher code length (excluding prefix)');

-- Insert sample billing plans
INSERT OR IGNORE INTO billing_plans (name, description, price, time_limit, data_limit, speed_limit_up, speed_limit_down, validity_period) VALUES
('1 Hour Plan', '1 hour internet access', 5.00, 60, NULL, 1024, 2048, 1),
('1 Day Plan', '24 hours internet access', 15.00, 1440, NULL, 2048, 4096, 1),
('Weekly Plan', '7 days internet access', 50.00, NULL, NULL, 4096, 8192, 7),
('Monthly Plan', '30 days internet access', 150.00, NULL, NULL, 8192, 16384, 30),
('Data 1GB', '1GB data allowance', 10.00, NULL, 1073741824, 2048, 4096, 30);