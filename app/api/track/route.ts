import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';
import { nanoid } from 'nanoid';
import { getPool } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

// In-memory cache for domain status (refreshed every 5 minutes)
let domainCache: Map<string, { is_enabled: boolean; last_refresh: number; updated_at: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Helper function to normalize domain
function normalizeDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname.toLowerCase();
    // Remove www. prefix
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    return domain;
  } catch (error) {
    return '';
  }
}

// Check if domain is enabled (with caching and auto-registration)
async function isDomainEnabled(domain: string): Promise<boolean> {
  if (!domain) return true; // Allow if domain can't be extracted
  
  const now = Date.now();
  const cached = domainCache.get(domain);
  
  // Always check database to get the latest updated_at timestamp
  // This ensures immediate effect when a domain is disabled/enabled
  const pool = getPool();
  try {
    const [rows] = await pool.execute(
      'SELECT is_enabled, updated_at FROM tracked_websites WHERE domain = ?',
      [domain]
    );
    const domainRows = rows as any[];
    
    if (domainRows.length > 0) {
      // Domain exists in database
      const isEnabled = domainRows[0].is_enabled === 1;
      const dbUpdatedAt = new Date(domainRows[0].updated_at).getTime();
      
      // If we have a cache entry, check if DB was updated after cache was refreshed
      if (cached) {
        // If DB is newer than cache, or status changed, update cache
        if (dbUpdatedAt > cached.updated_at || cached.is_enabled !== isEnabled) {
          console.log(`🔄 Cache invalidated for ${domain}: DB updated at ${new Date(dbUpdatedAt).toISOString()}, cache from ${new Date(cached.updated_at).toISOString()}`);
          domainCache.set(domain, { is_enabled: isEnabled, last_refresh: now, updated_at: dbUpdatedAt });
          
          // Update last_seen only if enabled
          if (isEnabled) {
            await pool.execute(
              'UPDATE tracked_websites SET last_seen = NOW() WHERE domain = ?',
              [domain]
            );
          }
          
          return isEnabled;
        }
        
        // Cache is still valid (DB hasn't been updated since cache refresh)
        // Return cached value if it's still fresh
        if ((now - cached.last_refresh) < CACHE_TTL) {
          // Update last_seen only if enabled (and cache is still fresh)
          if (cached.is_enabled) {
            await pool.execute(
              'UPDATE tracked_websites SET last_seen = NOW() WHERE domain = ?',
              [domain]
            );
          }
          return cached.is_enabled;
        }
        
        // Cache is stale, refresh it
        domainCache.set(domain, { is_enabled: isEnabled, last_refresh: now, updated_at: dbUpdatedAt });
        
        if (isEnabled) {
          await pool.execute(
            'UPDATE tracked_websites SET last_seen = NOW() WHERE domain = ?',
            [domain]
          );
        }
        
        return isEnabled;
      } else {
        // No cache entry, create one
        domainCache.set(domain, { is_enabled: isEnabled, last_refresh: now, updated_at: dbUpdatedAt });
        
        if (isEnabled) {
          await pool.execute(
            'UPDATE tracked_websites SET last_seen = NOW() WHERE domain = ?',
            [domain]
          );
        }
        
        return isEnabled;
      }
    } else {
      // Domain doesn't exist, auto-register as enabled
      await pool.execute(
        'INSERT INTO tracked_websites (domain, is_enabled, first_seen, last_seen) VALUES (?, TRUE, NOW(), NOW())',
        [domain]
      );
      
      // Add to cache (use current timestamp as updated_at)
      domainCache.set(domain, { is_enabled: true, last_refresh: now, updated_at: now });
      
      console.log(`✅ Auto-registered new domain: ${domain}`);
      return true;
    }
  } catch (error) {
    console.error('Error checking domain status:', error);
    // On error, check if we have cached value, otherwise fail open
    if (cached && (now - cached.last_refresh) < CACHE_TTL) {
      return cached.is_enabled;
    }
    return true; // Fail open if no cache
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const {
      event_type,
      page_url,
      page_title,
      referrer,
      referrer_domain,
      tracking_code,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      session_id,
      user_id,
      visit_count,
      is_new_visitor,
      device_type,
      os,
      browser,
      screen_resolution,
      user_agent,
      time_on_page,
      conversion_type,
      conversion_value,
      conversion_metadata,
      page_sequence,
      is_exit_page,
      session_page_count
    } = data;

    // Validate required fields
    if (!session_id || !user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if domain is enabled (with caching and auto-registration)
    const domain = normalizeDomain(page_url);
    const enabled = await isDomainEnabled(domain);
    
    if (!enabled) {
      console.log(`🚫 Tracking blocked for disabled domain: ${domain}`);
      // Return 200 OK to avoid client errors, but don't track
      return NextResponse.json({ success: true, message: 'Domain disabled' });
    }

    // Insert into ClickHouse visit_logs table
    try {
      await clickhouse.insert({
        table: 'analytics.visit_logs',
        values: [{
          timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
          session_id: session_id || '',
          user_id: user_id || '',
          page_url: page_url || '',
          page_title: page_title || '',
          referrer: referrer || '',
          referrer_domain: referrer_domain || '',
          tracking_code: tracking_code || '',
          utm_source: utm_source || '',
          utm_medium: utm_medium || '',
          utm_campaign: utm_campaign || '',
          utm_term: utm_term || '',
          utm_content: utm_content || '',
          campaign_id: 0, // Will be populated based on UTM mapping later
          course_id: 0, // Will be populated based on UTM mapping later
          user_agent: user_agent || '',
          device_type: device_type || 'Desktop',
          os: os || 'Unknown',
          browser: browser || 'Unknown',
          screen_resolution: screen_resolution || '',
          visit_count: visit_count || 1,
          is_new_visitor: is_new_visitor || 0,
          time_on_page: time_on_page || 0,
          event_type: event_type || 'pageview',
          conversion_type: conversion_type || '',
          conversion_value: conversion_value || 0,
          conversion_metadata: conversion_metadata || '',
          page_sequence: page_sequence || 0,
          is_exit_page: is_exit_page || 0,
          is_landing_page: data.is_landing_page || 0,
          previous_page_url: data.previous_page_url || '',
          session_page_count: session_page_count || 0,
        }],
        format: 'JSONEachRow'
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Failed to insert tracking data:', error);
      // Still return success to avoid blocking the user
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Tracking endpoint error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}

