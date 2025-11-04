import mysql from 'mysql2/promise';

// MySQL connection configuration
const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'appuser',
  password: process.env.MYSQL_PASSWORD || 'apppassword',
  database: process.env.MYSQL_DATABASE || 'appdb',
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
    // Execute each CREATE TABLE statement separately
    // This avoids issues with multi-statement queries
    
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) NOT NULL UNIQUE,
        company_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        contact_number VARCHAR(50) NOT NULL,
        user_type ENUM('owner', 'admin', 'observer', 'regular') NOT NULL DEFAULT 'regular',
        status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_uuid (uuid),
        INDEX idx_email (email),
        INDEX idx_user_type (user_type),
        INDEX idx_status (status),
        INDEX idx_company_name (company_name)
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

    // Execute each statement separately
    await query(createUsersTable);
    await query(createSessionsTable);
    await query(createPasswordResetTable);
    
    console.log('✅ MySQL schema initialized successfully');
  } catch (error) {
    // If initialization fails, log but don't fail
    // Docker init should handle it on first container start
    console.warn('⚠️ MySQL schema initialization warning:', error instanceof Error ? error.message : String(error));
    console.log('💡 Note: Tables should be created via Docker init or manually');
  }
}

