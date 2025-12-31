/**
 * UTM Parameter Normalization Utilities
 * 
 * Ensures consistent handling of NULL vs empty string across MySQL and ClickHouse
 * for reliable attribution matching.
 */

/**
 * Normalize UTM parameter value: Convert NULL/undefined to empty string
 * This ensures consistent matching between MySQL (NULL) and ClickHouse ('')
 * 
 * @param value - UTM parameter value from MySQL (can be string, null, or undefined)
 * @returns Normalized string (empty string if null/undefined)
 */
export function normalizeUtmValue(value: string | null | undefined): string {
    return value || '';
}

/**
 * Normalize all UTM parameters from MySQL row
 * Converts all NULL values to empty strings for consistent attribution matching
 * 
 * @param utmRow - Row from MySQL utm_codes table
 * @returns Normalized UTM parameters object
 */
export function normalizeUtmAttribution(utmRow: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
    landing_url?: string | null;
}) {
    return {
        utm_source: normalizeUtmValue(utmRow.utm_source),
        utm_medium: normalizeUtmValue(utmRow.utm_medium),
        utm_campaign: normalizeUtmValue(utmRow.utm_campaign),
        utm_content: normalizeUtmValue(utmRow.utm_content),
        utm_term: normalizeUtmValue(utmRow.utm_term),
        landing_url: normalizeUtmValue(utmRow.landing_url),
    };
}

/**
 * Build WHERE clause for exact attribution matching
 * Matches events by all UTM parameters + landing_url to prevent inheritance bugs
 * 
 * @param attribution - Normalized attribution parameters
 * @param trackingCode - Optional tracking_code for additional matching
 * @returns WHERE clause string (without WHERE keyword)
 */
export function buildAttributionWhereClause(
    attribution: {
        landing_url: string;
        utm_source: string;
        utm_medium: string;
        utm_campaign: string;
        utm_content: string;
        utm_term: string;
    },
    trackingCode?: string
): string {
    const escape = (str: string) => str.replace(/'/g, "\\'");

    let whereClause = '';

    if (trackingCode) {
        whereClause += `tracking_code = '${escape(trackingCode)}'`;
    } else {
        whereClause += `tracking_code = ''`;
    }

    whereClause += ` AND landing_url = '${escape(attribution.landing_url)}'`;
    whereClause += ` AND utm_source = '${escape(attribution.utm_source)}'`;
    whereClause += ` AND utm_medium = '${escape(attribution.utm_medium)}'`;
    whereClause += ` AND utm_campaign = '${escape(attribution.utm_campaign)}'`;
    whereClause += ` AND utm_content = '${escape(attribution.utm_content)}'`;
    whereClause += ` AND utm_term = '${escape(attribution.utm_term)}'`;

    return whereClause;
}

