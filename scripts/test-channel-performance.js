/**
 * Script to test the channel performance API
 * This verifies the API returns proper channel-grouped campaign data
 */

async function testChannelPerformanceAPI() {
  console.log('🧪 Testing Channel Performance API\n');

  try {
    // Calculate date range (last 30 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`Date Range: ${startDate} to ${endDate}\n`);

    const response = await fetch(`http://localhost:3000/api/analytics/channel-performance?start=${startDate}&end=${endDate}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'API request failed');
    }

    console.log('✅ API Response Successful\n');

    // Display chart data
    if (data.chartData && data.chartData.length > 0) {
      console.log('📊 Chart Data (Channel Comparison):');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('Channel'.padEnd(15), 'Visits'.padEnd(10), 'Conv.'.padEnd(10), 'Ad Cost');
      console.log('───────────────────────────────────────────────────────────────');
      
      data.chartData.forEach((item) => {
        const adCost = item.adCost >= 10000 
          ? `₩${(item.adCost / 10000).toFixed(0)}만`
          : `₩${item.adCost.toLocaleString()}`;
        console.log(
          item.name.padEnd(15),
          String(item.visits).padEnd(10),
          String(item.conversions).padEnd(10),
          adCost
        );
      });
      console.log('\n');
    }

    // Display channel details
    if (data.channels && data.channels.length > 0) {
      console.log('📋 Channel Details:\n');

      data.channels.forEach((channel, idx) => {
        const adCost = channel.total_ad_cost >= 10000 
          ? `₩${(channel.total_ad_cost / 10000).toFixed(0)}만`
          : `₩${channel.total_ad_cost.toLocaleString()}`;

        console.log(`${idx + 1}. ${channel.channel.toUpperCase()} Channel`);
        console.log('   ─────────────────────────────────────────────────────────');
        console.log(`   Total Visits: ${channel.total_visits.toLocaleString()}`);
        console.log(`   Total Conversions: ${channel.total_conversions}`);
        console.log(`   Total Ad Cost: ${adCost}`);
        console.log(`   Average CTR: ${channel.avg_ctr}%`);
        console.log(`   Number of Campaigns: ${channel.campaigns.length}`);
        
        if (channel.campaigns.length > 0) {
          console.log('\n   Campaigns:');
          channel.campaigns.forEach((campaign, cIdx) => {
            const campaignCost = campaign.ad_cost >= 10000 
              ? `₩${(campaign.ad_cost / 10000).toFixed(0)}만`
              : `₩${campaign.ad_cost.toLocaleString()}`;
            console.log(`     ${cIdx + 1}. ${campaign.campaign_name}`);
            console.log(`        Visits: ${campaign.visits}, Conversions: ${campaign.conversions}, Conv Rate: ${campaign.conversion_rate}%`);
            console.log(`        Ad Cost: ${campaignCost}, CTR: ${campaign.ctr}%, Status: ${campaign.status}`);
          });
        }
        console.log('\n');
      });
    } else {
      console.log('ℹ️  No channel data available for this period\n');
      console.log('💡 Tip: Create campaigns with start/end dates within the selected period\n');
    }

    console.log('✅ Test completed successfully!\n');
    console.log('🌐 View the page at: http://localhost:3000/channel-performance\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\n💡 Make sure:');
    console.error('   1. Your development server is running (npm run dev)');
    console.error('   2. ClickHouse database is accessible');
    console.error('   3. MySQL database is accessible');
    console.error('   4. You have campaigns in the database\n');
  }
}

// Run the test
testChannelPerformanceAPI();

