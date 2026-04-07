export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  var reportCount = 15, totalCost = 9000000;
  var savedHours = reportCount * 1.5, savedYen = savedHours * 3000;
  return res.status(200).json({
    dashboard: {
      metrics: { synced_reports: reportCount, total_cost: totalCost, saved_time_hours: savedHours, saved_money_yen: savedYen },
      alerts: [{ id: 'alert_1', type: 'cost_warning', message: '渋谷再開発A棟が予算超過 (103%)', severity: 'high' }],
      summary: {
        reports_synced: reportCount + '件の日報を自動同期',
        cost_calculated: (totalCost / 10000).toFixed(1) + '万円の原価を計算',
        time_saved: savedHours.toFixed(1) + '時間を削減',
        money_saved: (savedYen / 10000).toFixed(1) + '万円節約'
      }
    }
  });
}
