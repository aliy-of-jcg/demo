/**
 * KST (Korea Standard Time) Date Utilities
 * 
 * Critical for analytics queries to avoid UTC/KST boundary issues.
 * The ClickHouse visit_logs table is partitioned by created_date_kst.
 */

/**
 * Get current date in KST timezone (YYYY-MM-DD format)
 * This is critical for analytics queries to avoid UTC/KST boundary issues
 */
export function getCurrentDateKST(): string {
  // Create date in KST timezone
  const now = new Date();
  const kstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  
  // Format as YYYY-MM-DD
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get date range in KST timezone
 * @param days Number of days to go back from today (KST)
 * @returns Object with startDate and endDate in KST
 */
export function getDateRangeKST(days: number): { startDate: string; endDate: string } {
  const endDate = getCurrentDateKST();
  
  const start = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  start.setDate(start.getDate() - days);
  
  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, '0');
  const day = String(start.getDate()).padStart(2, '0');
  const startDate = `${year}-${month}-${day}`;
  
  return { startDate, endDate };
}

/**
 * Convert a Date object to KST date string (YYYY-MM-DD)
 */
export function toKSTDateString(date: Date): string {
  const kstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

