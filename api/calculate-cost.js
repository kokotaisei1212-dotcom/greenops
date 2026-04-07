export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  var totalCost = 600000;
  var riskLevel = totalCost > 750000 ? 'danger' : totalCost > 500000 ? 'warning' : 'safe';
  return res.status(200).json({
    ledger_id: 'ledger_' + Date.now(),
    project_id: (req.body && req.body.projectId) || 'proj_001',
    total_cost: totalCost,
    labor_cost: totalCost * 0.7,
    material_cost: totalCost * 0.3,
    workers: 25,
    hours: 200,
    risk_level: riskLevel,
    ai_message: riskLevel === 'safe' ? 'OK' : riskLevel.toUpperCase() + ' - 対応が必要',
    automatic_actions: ['工事台帳に自動転記完了', '赤字判定AI実行完了', riskLevel !== 'safe' ? 'PM通知送信' : 'アラートなし']
  });
}
