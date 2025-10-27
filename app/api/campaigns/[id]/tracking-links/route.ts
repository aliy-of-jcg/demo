import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { nanoid } from 'nanoid';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    const pool = getPool();
    
    const [links] = await pool.execute(
      `SELECT 
        utm_codes.id,
        utm_codes.name,
        utm_codes.tracking_code,
        utm_codes.utm_campaign,
        utm_codes.utm_source,
        utm_codes.utm_medium,
        utm_codes.utm_term,
        utm_codes.utm_content,
        utm_codes.landing_url,
        utm_codes.full_url,
        utm_codes.budget,
        utm_codes.spent,
        utm_codes.auto_pause_on_budget,
        utm_codes.status,
        utm_codes.created_at
      FROM utm_codes
      WHERE utm_codes.campaign_id = ?
      ORDER BY utm_codes.created_at DESC`,
      [campaignId]
    );

    // Fetch real click data from ClickHouse for each tracking code
    const trackingCodes = (links as any[]).map(link => link.tracking_code);
    let clicksMap = new Map();

    if (trackingCodes.length > 0) {
      try {
        const analyticsQuery = await clickhouse.query({
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

        const analyticsData = await analyticsQuery.json() as any[];
        analyticsData.forEach((result: any) => {
          clicksMap.set(result.tracking_code, parseInt(result.total_clicks));
        });
      } catch (error) {
        console.error('Error fetching clicks from ClickHouse:', error);
        // Continue without click data
      }
    }

    // 🎭 DEMO FEATURE: Auto-calculate spent based on clicks ($0.50 per click)
    const DEMO_COST_PER_CLICK = 0.50;

    // Add real click data and calculated spent to each link
    const linksWithAnalytics = (links as any[]).map(link => {
      const realClicks = clicksMap.get(link.tracking_code) || 0;
      const calculatedSpent = realClicks * DEMO_COST_PER_CLICK;
      
      return {
        ...link,
        clicks: realClicks, // Override with real clicks from ClickHouse
        spent: calculatedSpent // Override with calculated spent
      };
    });

    return NextResponse.json({
      success: true,
      links: linksWithAnalytics
    });
  } catch (error) {
    console.error('Error fetching tracking links:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tracking links' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    const body = await request.json();
    const {
      name,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      landing_url,
      budget,
      auto_pause_on_budget,
      auto_update_campaign_budget
    } = body;

    // Validation
    if (!name || !utm_source || !utm_medium || !utm_campaign || !landing_url) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Get current campaign details
    const [campaigns] = await pool.execute(
      'SELECT id, name, budget FROM campaigns WHERE id = ?',
      [campaignId]
    );

    if ((campaigns as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaign = (campaigns as any)[0];

    // If budget is provided, calculate budget impact
    let budgetWarning = null;
    let needsBudgetIncrease = false;
    let suggestedCampaignBudget = campaign.budget;

    if (budget && budget > 0) {
      // Get sum of existing link budgets
      const [budgetSum] = await pool.execute(
        `SELECT COALESCE(SUM(budget), 0) as total_allocated FROM utm_codes WHERE campaign_id = ? AND budget IS NOT NULL`,
        [campaignId]
      );
      
      const currentAllocated = parseFloat((budgetSum as any)[0].total_allocated) || 0;
      const newTotalAllocated = currentAllocated + parseFloat(budget);

      if (newTotalAllocated > campaign.budget) {
        needsBudgetIncrease = true;
        suggestedCampaignBudget = newTotalAllocated;
        budgetWarning = `Total allocated budget (${newTotalAllocated.toFixed(2)}) exceeds campaign budget (${campaign.budget}). ${auto_update_campaign_budget ? 'Campaign budget will be automatically increased.' : 'Please increase campaign budget or reduce link budget.'}`;
      }
    }

    // Check for duplicate tracking link with same parameters
    const [existing] = await pool.execute(
      `SELECT id FROM utm_codes 
       WHERE campaign_id = ? 
       AND utm_source = ? 
       AND utm_medium = ? 
       AND utm_campaign = ?
       AND utm_term = ?
       AND utm_content = ?
       AND landing_url = ?`,
      [
        campaignId,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term || '',
        utm_content || '',
        landing_url
      ]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'A tracking link with these exact parameters already exists for this campaign',
          duplicate: true
        },
        { status: 409 }
      );
    }

    // Generate tracking code
    const trackingCode = nanoid(10);
    const id = nanoid();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const trackingUrl = `${appUrl}/t/${trackingCode}`;
    
    // Build full URL with UTM parameters
    const urlObj = new URL(landing_url);
    urlObj.searchParams.set('utm_source', utm_source);
    urlObj.searchParams.set('utm_medium', utm_medium);
    urlObj.searchParams.set('utm_campaign', utm_campaign);
    if (utm_content) urlObj.searchParams.set('utm_content', utm_content);
    if (utm_term) urlObj.searchParams.set('utm_term', utm_term);
    const fullUrlWithUtm = urlObj.toString();

    // Store in MySQL utm_codes table
    await pool.execute(
      `INSERT INTO utm_codes 
       (name, campaign_id, tracking_code, utm_campaign, utm_source, utm_medium, utm_term, utm_content, landing_url, full_url, budget, spent, auto_pause_on_budget, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'active')`,
      [
        name,
        campaignId,
        trackingCode,
        utm_campaign,
        utm_source,
        utm_medium,
        utm_term || '',
        utm_content || '',
        landing_url,
        fullUrlWithUtm,
        budget || null,
        auto_pause_on_budget || false
      ]
    );

    // Auto-update campaign budget if requested and needed
    if (auto_update_campaign_budget && needsBudgetIncrease) {
      await pool.execute(
        'UPDATE campaigns SET budget = ? WHERE id = ?',
        [suggestedCampaignBudget, campaignId]
      );
      console.log(`✅ Campaign budget auto-updated from ${campaign.budget} to ${suggestedCampaignBudget}`);
    }

    // Fetch the created tracking link
    const [links] = await pool.execute(
      `SELECT * FROM utm_codes WHERE tracking_code = ?`,
      [trackingCode]
    );

    return NextResponse.json({
      success: true,
      trackingLink: {
        ...(links as any)[0],
        shortUrl: trackingUrl
      },
      budgetWarning,
      campaignBudgetUpdated: auto_update_campaign_budget && needsBudgetIncrease,
      newCampaignBudget: auto_update_campaign_budget && needsBudgetIncrease ? suggestedCampaignBudget : null
    });
  } catch (error) {
    console.error('Error creating tracking link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create tracking link' },
      { status: 500 }
    );
  }
}

