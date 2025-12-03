import mysql from 'mysql2/promise';

// MySQL connection configuration
const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  timezone: '+00:00', // Set connection timezone to UTC for proper TIMESTAMP handling
  waitForConnections: true,
  connectionLimit: 50, // Increased from 10 to 50
  maxIdle: 10, // Maximum idle connections
  idleTimeout: 60000, // Close idle connections after 60 seconds
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// Create connection pool
let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(config);
  }
  return pool;
}

export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T> {
  const connection = await getPool().getConnection();
  try {
    // Set connection timezone to UTC to ensure TIMESTAMP values are retrieved in UTC
    await connection.execute("SET time_zone = '+00:00'");
    const [rows] = await connection.execute(sql, params);
    return rows as T;
  } finally {
    connection.release();
  }
}

export async function queryOne<T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function testConnection(): Promise<boolean> {
  try {
    const connection = await getPool().getConnection();
    connection.release();
    return true;
  } catch (error) {
    console.error('MySQL connection failed:', error);
    return false;
  }
}

/**
 * Initialize MySQL database schema
 * Creates tables if they don't exist (idempotent)
 *
 * Note: This uses inline SQL instead of reading from file to work in standalone builds.
 * The Docker init script handles file-based initialization.
 * Each CREATE TABLE is executed separately to avoid multi-statement issues.
 */
export async function initMySQLSchema(): Promise<void> {
  try {
    const createUsersTable = `
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
    `;

    const createSessionsTable = `
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
    `;

    const createPasswordResetTable = `
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
    `;

    const createCoursesTable = `
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
    `;

    const createCampaignsTable = `
      CREATE TABLE IF NOT EXISTS campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        course_id INT,
        source VARCHAR(100) NOT NULL,
        medium VARCHAR(100) NOT NULL,
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
    `;

    const createUtmCodesTable = `
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
    `;

    // Order matters: courses must be created before campaigns, campaigns before utm_codes
    await query(createUsersTable);
    await query(createSessionsTable);
    await query(createPasswordResetTable);
    await query(createCoursesTable);
    await query(createCampaignsTable);
    await query(createUtmCodesTable);

    console.log('✅ MySQL schema initialized successfully');
  } catch (error) {
    // If initialization fails, log but don't fail
    // Docker init should handle it on first container start
    console.warn(
      '⚠️ MySQL schema initialization warning:',
      error instanceof Error ? error.message : String(error)
    );
    console.log('💡 Note: Tables should be created via Docker init or manually');
  }
}


