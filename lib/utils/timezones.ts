/**
 * Timezone Utilities
 * Provides comprehensive IANA timezone list similar to Google Analytics
 */

export interface TimezoneOption {
    value: string;
    label: string;
    offset: string;
    region: string;
}

/**
 * Get UTC offset for a timezone
 * Returns format like "GMT+11" or "UTC+9"
 */
function getTimezoneOffset(timezone: string): string {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'shortOffset',
        });

        const parts = formatter.formatToParts(now);
        const offsetPart = parts.find(part => part.type === 'timeZoneName');

        if (offsetPart) {
            // Normalize to GMT format if it's UTC
            return offsetPart.value.replace('UTC', 'GMT');
        }

        // Fallback: calculate offset manually
        const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        const offsetMs = tzDate.getTime() - utcDate.getTime();
        const offsetHours = offsetMs / (1000 * 60 * 60);
        const sign = offsetHours >= 0 ? '+' : '-';
        const hours = Math.abs(Math.floor(offsetHours));
        const minutes = Math.abs(Math.floor((offsetHours % 1) * 60));

        return `GMT${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch {
        return 'GMT+0';
    }
}

/**
 * Get region from timezone (e.g., "America/New_York" -> "America")
 */
function getTimezoneRegion(timezone: string): string {
    const parts = timezone.split('/');
    return parts[0] || 'Other';
}

/**
 * Format timezone label with offset
 */
function formatTimezoneLabel(timezone: string, offset: string): string {
    const region = getTimezoneRegion(timezone);
    const city = timezone.split('/').slice(1).join('/').replace(/_/g, ' ');

    // Format: "Region/City (Offset)"
    return `${timezone} (${offset})`;
}

/**
 * Get all supported IANA timezones
 * Returns comprehensive list similar to Google Analytics
 */
export function getAllTimezones(): TimezoneOption[] {
    try {
        // Use Intl.supportedValuesOf if available (Node.js 20+, modern browsers)
        if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
            const timezones = (Intl as any).supportedValuesOf('timeZone') as string[];

            return timezones
                .map(tz => {
                    const offset = getTimezoneOffset(tz);
                    const region = getTimezoneRegion(tz);
                    return {
                        value: tz,
                        label: formatTimezoneLabel(tz, offset),
                        offset,
                        region,
                    };
                })
                .sort((a, b) => {
                    // Sort by region first, then by timezone name
                    if (a.region !== b.region) {
                        return a.region.localeCompare(b.region);
                    }
                    return a.value.localeCompare(b.value);
                });
        }

        // Fallback: comprehensive list of common timezones
        // This covers all major regions and is more comprehensive than the hardcoded list
        const fallbackTimezones = [
            // UTC
            'UTC',
            // Africa
            'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
            // America
            'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
            'America/Mexico_City', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires',
            'America/Toronto', 'America/Vancouver', 'America/Montreal',
            // Asia
            'Asia/Seoul', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong',
            'Asia/Singapore', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok',
            'Asia/Jakarta', 'Asia/Manila', 'Asia/Kuala_Lumpur', 'Asia/Taipei',
            // Europe
            'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
            'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Moscow',
            'Europe/Istanbul', 'Europe/Athens', 'Europe/Prague', 'Europe/Warsaw',
            // Pacific
            'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane',
            'Pacific/Auckland', 'Pacific/Honolulu', 'Pacific/Fiji',
        ];

        return fallbackTimezones
            .map(tz => {
                const offset = getTimezoneOffset(tz);
                const region = getTimezoneRegion(tz);
                return {
                    value: tz,
                    label: formatTimezoneLabel(tz, offset),
                    offset,
                    region,
                };
            })
            .sort((a, b) => {
                if (a.region !== b.region) {
                    return a.region.localeCompare(b.region);
                }
                return a.value.localeCompare(b.value);
            });
    } catch (error) {
        console.error('Failed to get timezones:', error);
        // Ultimate fallback: return basic list
        return [
            { value: 'UTC', label: 'UTC (UTC+0)', offset: 'UTC+0', region: 'Other' },
            { value: 'Asia/Seoul', label: 'Asia/Seoul (UTC+9)', offset: 'UTC+9', region: 'Asia' },
        ];
    }
}

/**
 * Get timezones grouped by region
 */
export function getTimezonesByRegion(): Record<string, TimezoneOption[]> {
    const timezones = getAllTimezones();
    const grouped: Record<string, TimezoneOption[]> = {};

    timezones.forEach(tz => {
        if (!grouped[tz.region]) {
            grouped[tz.region] = [];
        }
        grouped[tz.region].push(tz);
    });

    return grouped;
}

/**
 * Search/filter timezones by query
 */
/**
 * Format timezone for display
 * Returns a user-friendly timezone label (e.g., "KST (UTC+9)" for "Asia/Seoul")
 * @param timezone IANA timezone string (e.g., "Asia/Seoul")
 * @returns Formatted timezone string for display
 */
export function formatTimezoneForDisplay(timezone: string): string {
    if (!timezone) {
        return 'UTC';
    }

    try {
        const now = new Date();

        // Try to get timezone abbreviation using different methods
        let tzName = '';

        // Method 1: Try 'short' format
        const shortFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'short',
        });
        const shortParts = shortFormatter.formatToParts(now);
        tzName = shortParts.find(part => part.type === 'timeZoneName')?.value || '';

        // Method 2: If we got GMT+11 or similar, try 'long' format to get abbreviation
        if (!tzName || tzName.startsWith('GMT') || tzName.startsWith('UTC') || /^[+-]\d+/.test(tzName)) {
            try {
                const longFormatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: timezone,
                    timeZoneName: 'long',
                });
                const longParts = longFormatter.formatToParts(now);
                const longTzName = longParts.find(part => part.type === 'timeZoneName')?.value || '';
                // Extract abbreviation from long format (e.g., "Srednekolymsk Time" -> "SRET")
                // Or use a mapping for common timezones
                if (longTzName && !longTzName.includes('GMT') && !longTzName.includes('UTC')) {
                    // Try to extract abbreviation from timezone name
                    const tzAbbrMap: Record<string, string> = {
                        'Asia/Srednekolymsk': 'SRET',
                        'Asia/Seoul': 'KST',
                        'Asia/Tokyo': 'JST',
                        'America/New_York': 'EST',
                        'America/Los_Angeles': 'PST',
                    };
                    tzName = tzAbbrMap[timezone] || longTzName.split(' ')[0].substring(0, 4).toUpperCase();
                }
            } catch (e) {
                // Ignore
            }
        }

        // Get UTC offset using existing helper
        const offset = getTimezoneOffset(timezone);

        // Format: "SRET (GMT+11)" or "KST (UTC+9)"
        if (tzName && offset && !tzName.startsWith('GMT') && !tzName.startsWith('UTC') && !/^[+-]\d+/.test(tzName)) {
            // Return abbreviation with offset: "SRET (GMT+11)" or "KST (UTC+9)"
            return `${tzName} (${offset})`;
        } else if (offset) {
            // If no abbreviation, just return offset
            return offset;
        } else {
            // Fallback: return the timezone name itself
            return timezone.split('/').pop() || timezone;
        }
    } catch (error) {
        console.error('Error formatting timezone:', timezone, error);
        // Fallback on error
        return timezone.split('/').pop() || timezone;
    }
}

export function searchTimezones(query: string): TimezoneOption[] {
    const timezones = getAllTimezones();
    const lowerQuery = query.toLowerCase();

    return timezones.filter(tz =>
        tz.value.toLowerCase().includes(lowerQuery) ||
        tz.label.toLowerCase().includes(lowerQuery) ||
        tz.region.toLowerCase().includes(lowerQuery)
    );
}

