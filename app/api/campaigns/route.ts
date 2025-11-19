import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import clickhouse from '@/lib/clickhouse';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  
  console.log(`📋 Campaigns API - Page: ${page}, Limit: ${limit}, Search: ${searchParams.get('search') || 'none'}`);
  
  try {
    const search = searchParams.get('search') || '';
    const source = searchParams.get('source') || '';
    const medium = searchParams.get('medium') || '';
    const status = searchParams.get('status') || '';
    const courseId = searchParams.get('course_id') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'DESC';

    const offset = (page - 1) * limit;
    
    // Whitelist valid sort columns to prevent SQL injection
    const validSortColumns = ['id', 'name', 'source', 'medium', 'status', 'start_date', 'end_date', 'budget', 'spent', 'created_at', 'updated_at'];
    const validSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    const pool = getPool();

    try {
      // Build WHERE conditions dynamically
      let whereConditions = ' AND campaigns.status != \'hidden\''; // Exclude hidden campaigns (soft deleted)
      const countParams: any[] = [];
      const queryParams: any[] = [];

    if (search) {
      whereConditions += ' AND (campaigns.name LIKE ? OR courses.name LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (source) {
      whereConditions += ' AND campaigns.source = ?';
      countParams.push(source);
      queryParams.push(source);
    }

    if (medium) {
      whereConditions += ' AND campaigns.medium = ?';
      countParams.push(medium);
      queryParams.push(medium);
    }

    if (status) {
      whereConditions += ' AND campaigns.status = ?';
      countParams.push(status);
      queryParams.push(status);
    }

    if (courseId) {
      whereConditions += ' AND campaigns.course_id = ?';
      countParams.push(parseInt(courseId));
      queryParams.push(parseInt(courseId));
    }

    if (startDate) {
      whereConditions += ' AND campaigns.start_date >= ?';
      countParams.push(startDate);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions += ' AND campaigns.end_date <= ?';
      countParams.push(endDate);
      queryParams.push(endDate);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM campaigns
      LEFT JOIN courses ON campaigns.course_id = courses.id
      WHERE 1=1${whereConditions}
    `;
    
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = (countResult as any)[0].total;

    // Get campaigns with course info (without duplicates from tracking links)
    // Build the complete query without string interpolation in ORDER BY
    const baseQuery = `
      SELECT DISTINCT
        campaigns.id,
        campaigns.name,
        campaigns.course_id,
        campaigns.source,
        campaigns.medium,
        campaigns.status,
        campaigns.start_date,
        campaigns.end_date,
        campaigns.budget,
        campaigns.spent,
        campaigns.description,
        campaigns.created_at,
        campaigns.updated_at,
        courses.name as course_name,
        courses.code as course_code
      FROM campaigns
      LEFT JOIN courses ON campaigns.course_id = courses.id
      WHERE 1=1${whereConditions}
    `;
    
    // Manually construct ORDER BY and LIMIT (safe because validSortBy and validSortOrder are whitelisted)
    const fullQuery = baseQuery + ` ORDER BY campaigns.${validSortBy} ${validSortOrder} LIMIT ${limit} OFFSET ${offset}`;

    const [campaigns] = await pool.execute(fullQuery, queryParams);

    // Get all tracking links for these campaigns in a single query (more efficient)
    const campaignIds = (campaigns as any[]).map(c => c.id);
    
    let platformsMap = new Map();
    let trackingCodesMap = new Map(); // Map: campaign_id -> array of tracking codes
    
    if (campaignIds.length > 0) {
      const placeholders = campaignIds.map(() => '?').join(',');
      
      // Fetch platforms (unique source/medium combinations)
      const [allPlatforms] = await pool.execute(
        `SELECT campaign_id, utm_source, utm_medium 
         FROM utm_codes 
         WHERE campaign_id IN (${placeholders}) AND status != 'hidden'
         GROUP BY campaign_id, utm_source, utm_medium
         ORDER BY campaign_id, utm_source`,
        campaignIds
      );
      
      // Fetch ALL tracking codes for each campaign (not just the first one)
      const [allTrackingCodes] = await pool.execute(
        `SELECT campaign_id, tracking_code 
         FROM utm_codes
         WHERE campaign_id IN (${placeholders}) AND status != 'hidden'
         ORDER BY campaign_id`,
        campaignIds
      );
      
      // Group platforms by campaign_id
      (allPlatforms as any[]).forEach(platform => {
        if (!platformsMap.has(platform.campaign_id)) {
          platformsMap.set(platform.campaign_id, []);
        }
        platformsMap.get(platform.campaign_id).push({
          utm_source: platform.utm_source,
          utm_medium: platform.utm_medium
        });
      });
      
      // Group tracking codes by campaign_id
      (allTrackingCodes as any[]).forEach(tc => {
        if (!trackingCodesMap.has(tc.campaign_id)) {
          trackingCodesMap.set(tc.campaign_id, []);
        }
        trackingCodesMap.get(tc.campaign_id).push(tc.tracking_code);
      });
    }

    // Get analytics data from ClickHouse for these campaigns
    let analyticsMap = new Map();
    
    if (campaignIds.length > 0) {
      try {
        // Query 1: Get CLICKS from tracking_events (redirect clicks)
        const clicksQuery = await clickhouse.query({
          query: `
            SELECT 
              tracking_code,
              COUNT(*) as total_clicks
            FROM analytics.tracking_events
            WHERE tracking_code != ''
            GROUP BY tracking_code
          `,
          format: 'JSONEachRow'
        });
        
        const clicksResults = await clicksQuery.json() as any[];
        const trackingCodeClicks = new Map();
        clicksResults.forEach((result: any) => {
          trackingCodeClicks.set(result.tracking_code, parseInt(result.total_clicks));
        });
        
        // Query 2: Get UNIQUE VISITORS from visit_logs (UUID-based tracking)
        // Include both tracking codes AND legacy data with empty tracking codes
        // This matches channel-performance API approach
        const visitorsQuery = await clickhouse.query({
          query: `
            SELECT 
              tracking_code,
              utm_campaign,
              COUNT(DISTINCT user_id) as unique_visitors
            FROM analytics.visit_logs
            WHERE utm_source != '' AND utm_source != '(direct)'
            GROUP BY tracking_code, utm_campaign
          `,
          format: 'JSONEachRow'
        });
        
        const visitorsResults = await visitorsQuery.json() as any[];
        const trackingCodeVisitors = new Map();
        const legacyCampaignVisitors = new Map(); // For empty tracking codes matched by campaign name
        
        visitorsResults.forEach((result: any) => {
          const code = result.tracking_code?.trim() || result.tracking_code;
          const visitors = parseInt(result.unique_visitors) || 0;
          
          if (code && code !== '') {
            // Valid tracking code
            trackingCodeVisitors.set(code, visitors);
          } else if (result.utm_campaign) {
            // Legacy data - match by campaign name
            const campaignName = result.utm_campaign;
            if (!legacyCampaignVisitors.has(campaignName)) {
              legacyCampaignVisitors.set(campaignName, 0);
            }
            legacyCampaignVisitors.set(campaignName, legacyCampaignVisitors.get(campaignName) + visitors);
          }
        });
        
        // Aggregate analytics for ALL tracking codes per campaign
        (campaigns as any[]).forEach(campaign => {
          const trackingCodes = trackingCodesMap.get(campaign.id) || [];
          let totalClicks = 0;
          let totalVisitors = 0;
          
          // Sum clicks and visitors from all tracking codes
          trackingCodes.forEach((trackingCode: string) => {
            const code = trackingCode?.trim() || trackingCode;
            
            // Try exact match first (trimmed)
            if (trackingCodeClicks.has(code)) {
              totalClicks += trackingCodeClicks.get(code);
            }
            if (trackingCodeVisitors.has(code)) {
              totalVisitors += trackingCodeVisitors.get(code);
            }
            
            // Also try original (untrimmed) if different
            if (code !== trackingCode && trackingCodeClicks.has(trackingCode)) {
              totalClicks += trackingCodeClicks.get(trackingCode);
            }
            if (code !== trackingCode && trackingCodeVisitors.has(trackingCode)) {
              totalVisitors += trackingCodeVisitors.get(trackingCode);
            }
          });
          
          // Also check for legacy data by campaign name (matches channel-performance approach)
          if (legacyCampaignVisitors.has(campaign.name)) {
            totalVisitors += legacyCampaignVisitors.get(campaign.name);
          }
          
          // Always set analytics, even if 0, so campaigns show up
          analyticsMap.set(campaign.id, {
            clicks: totalClicks,
            visitors: totalVisitors
          });
        });
        
        // Fallback: If visitors are still 0 but we have clicks, try matching by UTM parameters
        // This handles edge cases where visit_logs might not match by campaign name
        // (Note: Most legacy data is now handled in the main query above)
        if ((trackingCodeVisitors.size === 0 && legacyCampaignVisitors.size === 0) || 
            Array.from(analyticsMap.values()).every(a => a.visitors === 0)) {
          try {
            // Get all campaign IDs from the campaigns we're processing
            const allCampaignIds = (campaigns as any[]).map(c => c.id);
            
            if (allCampaignIds.length > 0) {
              // Get UTM parameters for campaigns
              const placeholders = allCampaignIds.map(() => '?').join(',');
              const [utmData] = await pool.execute(
                `SELECT campaign_id, utm_campaign, utm_source, utm_medium 
                 FROM utm_codes 
                 WHERE campaign_id IN (${placeholders}) AND status != 'hidden'`,
                allCampaignIds
              ) as [Array<{ campaign_id: number; utm_campaign: string; utm_source: string; utm_medium: string }>, any];
              
              if (utmData.length > 0) {
                // Query visitors by UTM parameters
                const utmVisitorsQuery = await clickhouse.query({
                  query: `
                    SELECT 
                      utm_campaign,
                      utm_source,
                      utm_medium,
                      COUNT(DISTINCT user_id) as unique_visitors
                    FROM analytics.visit_logs
                    WHERE utm_campaign != '' AND (tracking_code = '' OR tracking_code IS NULL)
                    GROUP BY utm_campaign, utm_source, utm_medium
                  `,
                  format: 'JSONEachRow'
                });
                
                const utmVisitorsResults = await utmVisitorsQuery.json() as any[];
                
                // Match UTM visitors to campaigns
                utmVisitorsResults.forEach((result: any) => {
                  const matchingUtm = utmData.find(utm => 
                    utm.utm_campaign === result.utm_campaign &&
                    utm.utm_source === result.utm_source &&
                    utm.utm_medium === result.utm_medium
                  );
                  
                  if (matchingUtm) {
                    const existing = analyticsMap.get(matchingUtm.campaign_id) || { clicks: 0, visitors: 0 };
                    analyticsMap.set(matchingUtm.campaign_id, {
                      clicks: existing.clicks,
                      visitors: existing.visitors + parseInt(result.unique_visitors)
                    });
                  }
                });
              }
            }
          } catch (utmError) {
            console.warn('⚠️ UTM parameter fallback for visitors failed:', utmError);
          }
        }
        
        // Debug logging in development
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 Campaign analytics mapping:', {
            totalTrackingCodes: trackingCodesMap.size,
            totalClicksData: trackingCodeClicks.size,
            totalVisitorsData: trackingCodeVisitors.size,
            sampleTrackingCodes: Array.from(trackingCodesMap.entries()).slice(0, 3),
            sampleClicks: Array.from(trackingCodeClicks.entries()).slice(0, 3),
            sampleVisitors: Array.from(trackingCodeVisitors.entries()).slice(0, 3),
            finalAnalytics: Array.from(analyticsMap.entries()).slice(0, 3)
          });
        }
      } catch (error) {
        console.error('Error fetching campaign analytics from ClickHouse:', error);
        // Continue without analytics data
      }
    }

    // Add platforms, tracking_code, and analytics to each campaign
    const campaignsWithPlatforms = (campaigns as any[]).map(campaign => {
      const analytics = analyticsMap.get(campaign.id) || { clicks: 0, visitors: 0 };
      const ctr = analytics.clicks > 0 && analytics.visitors > 0
        ? ((analytics.visitors / analytics.clicks) * 100).toFixed(1)
        : '0.0';
      const conversionRate = analytics.clicks > 0 && analytics.visitors > 0
        ? ((analytics.visitors / analytics.clicks) * 100).toFixed(1) 
        : '0.0';
      
      // 🎭 DEMO FEATURE: Auto-calculate spent based on clicks ($0.50 per click)
      // TODO: Remove this in production - spent should come from actual ad platform data
      const DEMO_COST_PER_CLICK = 0.50;
      const calculatedSpent = analytics.clicks * DEMO_COST_PER_CLICK;
      
      // Get first tracking code for display
      const trackingCodes = trackingCodesMap.get(campaign.id) || [];
      const firstTrackingCode = trackingCodes.length > 0 ? trackingCodes[0] : null;
      
      return {
        ...campaign,
        platforms: platformsMap.get(campaign.id) || [],
        tracking_code: firstTrackingCode, // First tracking code for display
        tracking_codes: trackingCodes, // ALL tracking codes
        clicks: analytics.clicks,
        visitors: analytics.visitors,
        ctr: ctr,
        conversion_rate: conversionRate,
        spent: calculatedSpent // Override spent with calculated value
      };
    });

    // Calculate summary stats (exclude hidden campaigns - soft deleted)
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_campaigns,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_campaigns,
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(AVG(spent / NULLIF(budget, 0)) * 100, 0) as avg_spent_percentage
      FROM campaigns
      WHERE status != 'hidden'
    `;
    
    const [summaryResult] = await pool.execute(summaryQuery);
    const summary = (summaryResult as any)[0];

    // Calculate total clicks, visitors, and spent from analytics
    let total_clicks = 0;
    let total_visitors = 0;

    campaignsWithPlatforms.forEach(campaign => {
      total_clicks += campaign.clicks || 0;
      total_visitors += campaign.visitors || 0;
    });

    // Calculate total spent based on actual clicks (demo calculation)
    const DEMO_COST_PER_CLICK = 0.50;
    const total_spent = total_clicks * DEMO_COST_PER_CLICK;
    
    let total_visitors_all_channels = 0;
    try {
      const allChannelVisitorsQuery = await clickhouse.query({
      query: `
        SELECT COUNT(DISTINCT user_id) as unique_visitors
        FROM analytics.visit_logs
        `,
        format: 'JSONEachRow'
      });

      const allChannelData = await allChannelVisitorsQuery.json() as any[];
      if(allChannelData.length > 0) {
        total_visitors_all_channels = parseInt(allChannelData[0].unique_visitors || "0");
      } 
    } catch (error) {
      console.warn('Failed to fetch all-channel visitors:', error);
    }

    return NextResponse.json({
      success: true,
      campaigns: campaignsWithPlatforms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      summary: {
        total_campaigns: summary.total_campaigns,
        active_campaigns: summary.active_campaigns,
        total_budget: parseFloat(summary.total_budget),
        total_spent: total_spent,
        total_clicks: total_clicks,
        total_visitors: total_visitors,
        total_visitors_all_channels: total_visitors_all_channels,
        avg_conversion_rate: total_clicks > 0 && total_visitors > 0
          ? parseFloat(((total_visitors / total_clicks) * 100).toFixed(1))
          : 0
      }
    });
    } catch (dbError: any) {
      // Check if table doesn't exist
      if (dbError.code === 'ER_NO_SUCH_TABLE' && 
         (dbError.sqlMessage?.includes('campaigns') || dbError.sqlMessage?.includes('courses'))) {
        console.warn('⚠️ Campaigns or courses table does not exist yet');
        return NextResponse.json({
          success: true,
          campaigns: [],
          pagination: {
            page,
            limit,
            total: 0,
            total_pages: 0
          },
          summary: {
            total_campaigns: 0,
            active_campaigns: 0,
            total_budget: 0,
            total_spent: 0,
            total_clicks: 0,
            total_visitors: 0,
            total_visitors_all_channels: 0,
            avg_conversion_rate: 0
          },
          message: 'No campaigns data available yet. Database tables will be created automatically.'
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { 
        success: true,
        campaigns: [],
        pagination: {
          page,
          limit,
          total: 0,
          total_pages: 0
        },
        summary: {
          total_campaigns: 0,
          active_campaigns: 0,
          total_budget: 0,
          total_spent: 0,
          total_clicks: 0,
          total_visitors: 0,
          total_visitors_all_channels: 0,
          avg_conversion_rate: 0
        },
        message: 'Unable to fetch campaigns data. Please try again later.'
      },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      utm_name,  // Added: Name for the tracking link
      course_id,
      source,
      medium,
      status,
      start_date,
      end_date,
      budget,
      auto_pause_on_budget,
      description,
      landing_url,
      utm_campaign,
      utm_source,
      utm_medium,
      utm_term,
      utm_content
    } = body;

    // Validation
    if (!name || !course_id || !source || !medium || !start_date || !end_date || !budget) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate and sanitize status value
    const validStatuses = ['active', 'waiting', 'ended', 'paused', 'hidden'];
    const sanitizedStatus = status && validStatuses.includes(status) ? status : 'active';

    const pool = getPool();
    const query = `
      INSERT INTO campaigns (name, course_id, source, medium, status, start_date, end_date, budget, auto_pause_on_budget, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      name,
      course_id,
      source,
      medium,
      sanitizedStatus,
      start_date,
      end_date,
      budget,
      auto_pause_on_budget ? 1 : 0,
      description || null
    ]);

    const insertId = (result as any).insertId;

    // Auto-generate tracking link if landing_url is provided
    // Use campaign name as utm_campaign if not provided, and use source/medium from form
    let trackingLink = null;
    if (landing_url) {
      try {
        // Use campaign name as utm_campaign if not explicitly provided
        const finalUtmCampaign = utm_campaign || name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        // Use form source/medium if provided and not 'select', otherwise use campaign defaults
        const finalUtmSource = (utm_source && utm_source !== 'select') ? utm_source : source;
        const finalUtmMedium = (utm_medium && utm_medium !== 'select') ? utm_medium : medium;
        
        // Only generate if we have valid source and medium
        if (finalUtmSource && finalUtmSource !== 'select' && finalUtmMedium && finalUtmMedium !== 'select') {
          // Auto-generate UTM name if not provided
          const finalUtmName = utm_name || `${name}_${finalUtmSource}_${finalUtmMedium}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const trackingResponse = await fetch(`${appUrl}/api/tracking/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: finalUtmName,  // Pass the UTM name
              campaignName: name,
              campaignId: insertId,
              targetUrl: landing_url,
              utmSource: finalUtmSource,
              utmMedium: finalUtmMedium,
              utmCampaign: finalUtmCampaign,
              utmContent: utm_content || '',
              utmTerm: utm_term || ''
            })
          });

          const trackingData = await trackingResponse.json();
          if (trackingData.success) {
            trackingLink = trackingData.trackingLink;
            console.log('✅ Tracking link generated:', trackingLink.trackingCode);
          }
        }
      } catch (error) {
        console.error('Failed to generate tracking link:', error);
        // Don't fail the campaign creation if tracking link generation fails
      }
    }

    // Fetch the created campaign
    const [campaigns] = await pool.execute(
      'SELECT campaigns.*, courses.name as course_name FROM campaigns LEFT JOIN courses ON campaigns.course_id = courses.id WHERE campaigns.id = ?',
      [insertId]
    );

    return NextResponse.json({
      success: true,
      campaign: (campaigns as any)[0],
      trackingLink: trackingLink
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}

