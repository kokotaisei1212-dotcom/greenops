export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json({
    status: 'ready_to_send',
    accounting_system: 'freee',
    project_id: (req.body && req.body.projectId) || 'proj_001',
    month: (req.body && req.body.month) || new Date().toISOString().slice(0,7),
    entries: [
      { account_item: '売上高', amount: 720000, dc: 'debit' },
      { account_item: '工事原価', amount: 600000, dc: 'credit' }
    ],
    total_debit: 720000,
    total_credit: 600000,
    message: '仕訳データ生成完了。freeeに送信可能な状態'
  });
}
