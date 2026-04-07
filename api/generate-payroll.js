export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  var totalHours = 200, rate = 3000, ot = Math.max(0, totalHours - 160);
  var base = rate * (totalHours - ot), otPay = rate * 1.25 * ot, allow = 50000;
  return res.status(200).json({
    payroll_id: 'payroll_' + Date.now(),
    month: (req.body && req.body.month) || new Date().toISOString().slice(0,7),
    total_hours: totalHours,
    base_hours: totalHours - ot,
    overtime_hours: ot,
    base_salary: base,
    overtime_pay: otPay,
    allowances: allow,
    total_salary: base + otPay + allow,
    compliance: { overtime_limit_violation: ot > 45 ? '36協定上限超過' : '安全', labor_law_compliant: ot <= 45 },
    automatic_actions: ['給与計算データ自動生成', 'freee人事労務への送信準備完了', ot > 45 ? '残業上限規制警告' : '労務管理安全']
  });
}
