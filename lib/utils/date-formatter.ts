/**
 * Date formatting utilities
 * Consistent date format: DD/MM/YY (day/month/year)
 */

/**
 * Format date as DD/MM/YY
 * @param dateString - Date string or Date object
 * @returns Formatted date string in DD/MM/YY format
 */
export function formatDateDDMMYY(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return dateString.toString();
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    
    return `${day}/${month}/${year}`;
  } catch {
    return typeof dateString === 'string' ? dateString : dateString.toString();
  }
}

/**
 * Format date as DD/MM/YY with timezone conversion to KST (UTC+9)
 * Useful for dates stored in UTC that need to be displayed in Korean time
 * @param dateString - Date string (assumed to be UTC)
 * @returns Formatted date string in DD/MM/YY format (KST)
 */
export function formatDateDDMMYYKST(dateString: string): string {
  try {
    // Parse as UTC and convert to KST (UTC+9)
    const utcDate = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
    const kstTimestamp = utcDate.getTime() + (9 * 60 * 60 * 1000);
    const kstDate = new Date(kstTimestamp);

    const day = String(kstDate.getUTCDate()).padStart(2, '0');
    const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
    const year = kstDate.getUTCFullYear().toString().slice(-2);
    
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

