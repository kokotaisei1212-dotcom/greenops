export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var body = req.body || {};
  var project_id = body.project_id;
  if (!project_id) return res.status(400).json({ error: 'Missing project_id' });

  var ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  var pd = body.project_data || {
    company: 'テスト企業',
    project_name: project_id,
    contract_amount: 2500000000,
    duration_months: 24,
    progress_rate: 65,
    cost_consumption_rate: 72,
    issues: '杭打ちが3日遅延、PPE着用率が低下'
  };

  try {
    var prompt = '建設プロジェクトの分析を行い、必ず以下のJSON形式のみで返してください。説明文やマークダウンは不要です。\n\n'
      + 'プロジェクト情報:\n'
      + '- 会社名: ' + pd.company + '\n'
      + '- プロジェクト名: ' + pd.project_name + '\n'
      + '- 契約額: ' + pd.contract_amount + '円\n'
      + '- 予定工期: ' + pd.duration_months + 'ヶ月\n'
      + '- 現在の進捗率: ' + pd.progress_rate + '%\n'
      + '- コスト消化率: ' + pd.cost_consumption_rate + '%\n'
      + '- 現場の課題: ' + pd.issues + '\n\n'
      + '進捗率とコスト消化率の乖離、現場の課題を考慮して、リアルな数値で分析してください。\n\n'
      + '{"cost":{"loss_probability":0.0〜1.0の数値,"estimated_loss_yen":円単位の数値,"severity":"SAFE又はWARNING又はCRITICAL"},"schedule":{"predicted_delay_days":日数},"safety":{"overall_score":0〜100の数値,"risk_level":"LOW又はMEDIUM又はHIGH又はCRITICAL"},"recommendations":["日本語の具体的な対応案を3つ"]}';

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    var data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: (data.error && data.error.message) || 'Claude API error' });

    var text = (data.content[0] && data.content[0].text) || '';
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return res.status(200).json({ status: 'success', project_id: project_id, ai_analysis: JSON.parse(jsonMatch[0]) });
      } catch (e) {
        return res.status(200).json({ status: 'success', project_id: project_id, ai_analysis: { raw: text } });
      }
    }
    return res.status(200).json({ status: 'success', project_id: project_id, ai_analysis: { raw: text } });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
