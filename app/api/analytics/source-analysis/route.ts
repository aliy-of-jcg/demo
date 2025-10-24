import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';
import { getPool } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get date range from query parameters (default: last 30 days)
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];
    const startDate = searchParams.get('start') || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().split('T')[0];
    })();

    console.log(`📊 Source & Media Analysis API - Date Range: ${startDate} to ${endDate}`);

    // Query: Get data grouped by source and medium
    const sourceMediaQuery = `
      SELECT 
        CASE 
          WHEN utm_source = '' THEN 'Direct'
          ELSE utm_source
        END as source,
        CASE 
          WHEN utm_medium = '' THEN '(not set)'
          ELSE utm_medium
        END as medium,
        COUNT(DISTINCT user_id) as visitors,
        SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as conversions,
        SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT user_id) as conversion_rate
      FROM analytics.visit_logs
      WHERE toDate(timestamp) BETWEEN toDate('${startDate}') AND toDate('${endDate}')
      GROUP BY source, medium
      ORDER BY visitors DESC
    `;

    const result = await clickhouse.query({
      query: sourceMediaQuery,
      format: 'JSONEachRow'
    });
    const rawData = await result.json() as any[];

    // Get revenue data from MySQL for each source/medium combination
    const pool = getPool();
    
    const dataWithRevenue = await Promise.all(
      rawData.map(async (item: any) => {
        const [revenueResult] = await pool.execute(`
          SELECT COALESCE(SUM(spent), 0) as total_spent
          FROM campaigns
          WHERE source = ?
          AND medium = ?
          AND start_date >= ? AND end_date <= ?
        `, [
          item.source === 'Direct' ? '' : item.source,
          item.medium === '(not set)' ? '' : item.medium,
          startDate,
          endDate
        ]);
        
        const revenue = (revenueResult as any[])[0]?.total_spent || 0;
        const conversions = parseInt(item.conversions);
        const cpa = conversions > 0 ? revenue / conversions : 0;

        return {
          source: item.source,
          medium: item.medium,
          visitors: parseInt(item.visitors),
          conversions: conversions,
          conversionRate: parseFloat(item.conversion_rate || '0').toFixed(2),
          revenue: parseFloat(revenue),
          cpa: Math.round(cpa)
        };
      })
    );

    // Group data by source
    const groupedBySource: Record<string, any[]> = {};
    
    dataWithRevenue.forEach(item => {
      if (!groupedBySource[item.source]) {
        groupedBySource[item.source] = [];
      }
      groupedBySource[item.source].push({
        medium: item.medium,
        visitors: item.visitors,
        conversions: item.conversions,
        conversionRate: item.conversionRate,
        revenue: item.revenue,
        cpa: item.cpa
      });
    });

    // Calculate totals for each source
    const sources = Object.keys(groupedBySource).map(sourceName => {
      const mediums = groupedBySource[sourceName];
      const totals = mediums.reduce((acc, item) => ({
        visitors: acc.visitors + item.visitors,
        conversions: acc.conversions + item.conversions,
        revenue: acc.revenue + item.revenue
      }), { visitors: 0, conversions: 0, revenue: 0 });

      const avgConversionRate = totals.visitors > 0
        ? ((totals.conversions / totals.visitors) * 100).toFixed(2)
        : '0.00';

      return {
        source: sourceName,
        mediums: mediums,
        totals: {
          ...totals,
          conversionRate: avgConversionRate
        }
      };
    });

    // Prepare chart data (aggregate by medium across all sources)
    const mediumAggregates: Record<string, { visitors: number; conversions: number }> = {};
    
    dataWithRevenue.forEach(item => {
      if (!mediumAggregates[item.medium]) {
        mediumAggregates[item.medium] = { visitors: 0, conversions: 0 };
      }
      mediumAggregates[item.medium].visitors += item.visitors;
      mediumAggregates[item.medium].conversions += item.conversions;
    });

    const chartData = Object.keys(mediumAggregates)
      .map(medium => ({
        name: medium,
        visitors: mediumAggregates[medium].visitors,
        conversions: mediumAggregates[medium].conversions
      }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 10); // Top 10 mediums

    const response = {
      success: true,
      dateRange: {
        start: startDate,
        end: endDate
      },
      sources: sources,
      chartData: chartData
    };

    console.log(`✅ Source & Media data fetched: ${sources.length} sources, ${dataWithRevenue.length} source/medium combinations`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Source & Media Analysis API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch source & media data',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

