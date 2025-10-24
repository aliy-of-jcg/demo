import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build WHERE clause for date filtering (using KST timezone)
    let whereClause = '1=1';

    if (startDate) {
      whereClause += ` AND toDate(toTimeZone(timestamp, 'Asia/Seoul')) >= '${startDate}'`;
    }
    if (endDate) {
      whereClause += ` AND toDate(toTimeZone(timestamp, 'Asia/Seoul')) <= '${endDate}'`;
    }

    // 1. Hourly Distribution (0-23 hours) - KST (UTC+9)
    const hourlyQuery = `
      SELECT 
        toHour(toTimeZone(timestamp, 'Asia/Seoul')) as hour,
        COUNT(DISTINCT user_id) as visitors,
        COUNT(*) as pageviews,
        countIf(event_type = 'conversion') as conversions
      FROM visit_logs
      WHERE ${whereClause}
      GROUP BY hour
      ORDER BY hour ASC
    `;

    const hourlyResult = await clickhouse.query({
      query: hourlyQuery,
      format: 'JSONEachRow',
    });

    const hourlyJson = await hourlyResult.json();
    
    // Fill in missing hours with 0
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const hourData = hourlyJson.find((row: any) => row.hour === i);
      return {
        hour: i,
        visitors: hourData?.visitors || 0,
        pageviews: hourData?.pageviews || 0,
        conversions: hourData?.conversions || 0,
        conversionRate: hourData?.visitors > 0 
          ? ((hourData.conversions / hourData.visitors) * 100).toFixed(2) 
          : '0.00',
      };
    });

    // 2. Day of Week Distribution (1=Monday, 7=Sunday) - KST (UTC+9)
    const dayOfWeekQuery = `
      SELECT 
        toDayOfWeek(toTimeZone(timestamp, 'Asia/Seoul')) as day_of_week,
        COUNT(DISTINCT user_id) as visitors,
        COUNT(*) as pageviews,
        countIf(event_type = 'conversion') as conversions
      FROM visit_logs
      WHERE ${whereClause}
      GROUP BY day_of_week
      ORDER BY day_of_week ASC
    `;

    const dayOfWeekResult = await clickhouse.query({
      query: dayOfWeekQuery,
      format: 'JSONEachRow',
    });

    const dayOfWeekJson = await dayOfWeekResult.json();
    
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Fill in missing days with 0
    const dayOfWeekData = Array.from({ length: 7 }, (_, i) => {
      const dayIndex = i + 1; // ClickHouse: 1=Monday, 7=Sunday
      const dayData = dayOfWeekJson.find((row: any) => row.day_of_week === dayIndex);
      return {
        day: dayNames[i],
        dayOfWeek: dayIndex,
        visitors: dayData?.visitors || 0,
        pageviews: dayData?.pageviews || 0,
        conversions: dayData?.conversions || 0,
        conversionRate: dayData?.visitors > 0 
          ? ((dayData.conversions / dayData.visitors) * 100).toFixed(2) 
          : '0.00',
      };
    });

    // 3. Daily trends over the selected period - KST (UTC+9)
    const dailyTrendQuery = `
      SELECT 
        toDate(toTimeZone(timestamp, 'Asia/Seoul')) as date,
        COUNT(DISTINCT user_id) as visitors,
        COUNT(*) as pageviews,
        countIf(event_type = 'conversion') as conversions
      FROM visit_logs
      WHERE ${whereClause}
      GROUP BY date
      ORDER BY date ASC
    `;

    const dailyTrendResult = await clickhouse.query({
      query: dailyTrendQuery,
      format: 'JSONEachRow',
    });

    const dailyTrendJson = await dailyTrendResult.json();
    const dailyTrendData = dailyTrendJson.map((row: any) => ({
      date: row.date,
      visitors: row.visitors || 0,
      pageviews: row.pageviews || 0,
      conversions: row.conversions || 0,
      conversionRate: row.visitors > 0 
        ? ((row.conversions / row.visitors) * 100).toFixed(2) 
        : '0.00',
    }));

    // 4. Peak hours analysis
    const peakHours = [...hourlyData]
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 3)
      .map(h => ({
        hour: h.hour,
        hourLabel: `${h.hour.toString().padStart(2, '0')}:00`,
        visitors: h.visitors,
      }));

    // 5. Peak days analysis
    const peakDays = [...dayOfWeekData]
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 3)
      .map(d => ({
        day: d.day,
        visitors: d.visitors,
      }));

    return NextResponse.json({
      success: true,
      hourly: hourlyData,
      dayOfWeek: dayOfWeekData,
      dailyTrend: dailyTrendData,
      insights: {
        peakHours,
        peakDays,
      },
    });

  } catch (error) {
    console.error('Time-based analysis API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
