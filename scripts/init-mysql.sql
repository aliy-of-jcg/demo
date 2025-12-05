-- Simplified users table with UUID and all user types
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  contact_number VARCHAR(50) NOT NULL,
  user_type ENUM('owner', 'admin', 'observer', 'regular') NOT NULL DEFAULT 'regular',
  status ENUM('active', 'pending', 'stopped', 'blocked') DEFAULT 'active',
  last_login_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_uuid (uuid),
  INDEX idx_email (email),
  INDEX idx_user_type (user_type),
  INDEX idx_status (status),
  INDEX idx_company_name (company_name),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table for authentication tokens
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_used (used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Courses tableSE
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL,
  duration VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) DEFAULT 0.00,
  status ENUM('active', 'waiting', 'paused', 'ended', 'hidden') DEFAULT 'active',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_status (status),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Campaigns table
-- Note: source and medium are for ADMIN UI/ORGANIZATION ONLY
-- Channel performance reports use actual UTM data from visit_logs, not these fields
CREATE TABLE IF NOT EXISTS campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  course_id INT,
  source VARCHAR(100) NOT NULL COMMENT 'Primary channel (for admin UI only, not reporting)',
  medium VARCHAR(100) NOT NULL COMMENT 'Primary medium (for admin UI only, not reporting)',
  status ENUM('active', 'waiting', 'paused', 'ended', 'hidden') DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget DECIMAL(10, 2) DEFAULT 0.00,
  spent DECIMAL(10, 2) DEFAULT 0.00,
  auto_pause_on_budget tinyint(1) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  INDEX idx_course_id (course_id),
  INDEX idx_source (source),
  INDEX idx_medium (medium),
  INDEX idx_status (status),
  INDEX idx_start_date (start_date),
  INDEX idx_end_date (end_date),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- UTM codes table (tracking links)
CREATE TABLE IF NOT EXISTS utm_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  campaign_id INT NOT NULL,
  tracking_code VARCHAR(50) NOT NULL UNIQUE,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(255) NOT NULL,
  utm_term VARCHAR(255),
  utm_content VARCHAR(255),
  landing_url text,
  full_url text,
  clicks INT DEFAULT 0,
  status ENUM('active', 'inactive', 'hidden') DEFAULT 'active',
  budget DECIMAL(12, 2) DEFAULT 0.00,
  spent DECIMAL(12, 2) DEFAULT 0.00,
  auto_pause_on_budget tinyint(1) DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  INDEX idx_tracking_code (tracking_code),
  INDEX idx_campaign_id (campaign_id),
  INDEX idx_utm_campaign (utm_campaign),
  INDEX idx_utm_source (utm_source),
  INDEX idx_utm_medium (utm_medium),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tracked websites table (for enable/disable tracking control)
CREATE TABLE IF NOT EXISTS tracked_websites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  domain VARCHAR(255) NOT NULL UNIQUE COMMENT 'Normalized domain (lowercase, no www, no protocol)',
  is_enabled BOOLEAN DEFAULT TRUE COMMENT 'Whether tracking is enabled for this domain',
  first_seen TIMESTAMP NULL DEFAULT NULL COMMENT 'First time this domain was tracked',
  last_seen TIMESTAMP NULL DEFAULT NULL COMMENT 'Most recent tracking event',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_domain (domain),
  INDEX idx_is_enabled (is_enabled),
  INDEX idx_last_seen (last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System settings table (for system-wide defaults and feature flags)
CREATE TABLE IF NOT EXISTS system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique setting identifier',
  setting_value TEXT NOT NULL COMMENT 'Setting value (stored as string)',
  value_type ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string' COMMENT 'Data type of the value',
  category VARCHAR(50) NOT NULL COMMENT 'Setting category (defaults, features, etc)',
  description TEXT COMMENT 'Human-readable description',
  is_editable BOOLEAN DEFAULT TRUE COMMENT 'Whether setting can be modified via UI',
  updated_by INT NULL COMMENT 'User ID who last updated this setting',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_setting_key (setting_key),
  INDEX idx_category (category),
  INDEX idx_is_editable (is_editable)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, value_type, category, description, is_editable) VALUES
('default_date_range', '7', 'number', 'defaults', 'Default date range for analytics in days', TRUE),
('default_timezone', 'Asia/Seoul', 'string', 'defaults', 'Default timezone for the system', TRUE),
('default_campaign_status', 'waiting', 'string', 'defaults', 'Default status for new campaigns', TRUE),
('default_user_role', 'regular', 'string', 'defaults', 'Default role for new user signups', TRUE),
('session_timeout_minutes', '2', 'number', 'defaults', 'Session timeout in minutes', TRUE),
('allow_new_signups', '1', 'boolean', 'features', 'Allow new user registrations', TRUE),
('allow_tracking', '1', 'boolean', 'features', 'Allow analytics tracking', TRUE)
ON DUPLICATE KEY UPDATE setting_key=setting_key;