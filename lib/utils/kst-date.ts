/**
 * KST (Korea Standard Time) Date Utilities
 * 
 * Critical for analytics queries to avoid UTC/KST boundary issues.
 * The ClickHouse visit_logs table is partitioned by created_date_kst.
 */

export function getCurrentDateKST(): string {
  const now = new Date();
  const kstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

export function addDaysKST(dateStr: string, days: number): string {
  const base = new Date(
    new Date(`${dateStr}T00:00:00`).toLocaleString('en-US', {
      timeZone: 'Asia/Seoul',
    })
  );

  base.setDate(base.getDate() + days);

  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  
  return `${y}-${m}-${d}`;
}

export function getDateRangeKST(days: number): { startDate: string; endDate: string } {
  const endDate = getCurrentDateKST();
  const startDate = addDaysKST(endDate, -days);
  
  return { startDate, endDate };
}

export function toKSTDateString(date: Date): string {
  const kstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

function dateDiffDaysKST(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00+09:00`);
  const end = new Date(`${endDate}T00:00:00+09:00`);
  
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export interface AnalyticsDateOptions {
  endParam?: string;
  startParam?: string;
  defaultRangeDays?: number;
  maxRangeDays?: number;
}

export function resolveAnalyticsDates(
  searchParams: URLSearchParams,
  options?: AnalyticsDateOptions
): { startDate: string; endDate: string } {
  const endParam = options?.endParam ?? 'end_date';
  const startParam = options?.startParam ?? 'start_date';
  
  const endDate = searchParams.get(endParam) ?? getCurrentDateKST();
  let startDate = searchParams.get(startParam);
  
  if (!startDate && options?.defaultRangeDays) {
    startDate = addDaysKST(endDate, -options.defaultRangeDays);
  }
  
  if (!startDate) {
    startDate = endDate;
  }
  
  if (options?.maxRangeDays) {
    const diffDays = dateDiffDaysKST(startDate, endDate);
    
    if (diffDays > options.maxRangeDays) {
      startDate = addDaysKST(endDate, -options.maxRangeDays);
    }
  }
  
  return { startDate, endDate };
}

