export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  var mockReports = [
    { workType: '鉄骨建方', workers: 12, hours: 96, cost: 288000 },
    { workType: '型枠組立', workers: 8, hours: 64, cost: 192000 },
    { workType: 'コンクリート打設', workers: 5, hours: 40, cost: 120000 }
  ];
  var totalCost = mockReports.reduce(function(s, r) { return s + r.cost; }, 0);
  return res.status(200).json({
    synced_count: mockReports.length,
    total_cost: totalCost,
    reports: mockReports,
    message: mockReports.length + '件の日報を自動同期。工事台帳に転記されました',
    timestamp: new Date().toISOString()
  });
}
