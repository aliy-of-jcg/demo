import mysql from 'mysql2/promise';

// MySQL connection configuration
const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'appuser',
  password: process.env.MYSQL_PASSWORD || 'apppassword',
  database: process.env.MYSQL_DATABASE || 'appdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
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

