export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var project_id = req.body && req.body.project_id;
  if (!project_id) return res.status(400).json({ error: 'Missing project_id' });

  var ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    var prompt = 'ANDPADプロジェクト「' + project_id + '」の分析をJSON形式で返してください。\n'
      + '赤字化確率、推定赤字額、工期遅延日数、安全スコア、推奨対応を含めてください。\n'
      + '必ずJSON形式のみで返してください。';

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      var err = await response.json();
      return res.status(response.status).json({ error: (err.error && err.error.message) || 'Claude API error' });
    }

    var data = await response.json();
    var text = (data.content[0] && data.content[0].text) || '';

    var jsonStr = text;
    var match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) jsonStr = match[1];

    var jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        var analysis = JSON.parse(jsonMatch[0]);
        return res.status(200).json({ status: 'success', project_id: project_id, ai_analysis: analysis });
      } catch (e) {
        return res.status(200).json({ status: 'success', project_id: project_id, ai_analysis: { raw: text } });
      }
    }

    return res.status(200).json({ status: 'success', project_id: project_id, ai_analysis: { raw: text } });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
