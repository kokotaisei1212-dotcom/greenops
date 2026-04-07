export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  var body = req.body || {};
  var project_id = body.project_id;

  var apiKey = process.env.ANTHROPIC_API_KEY;

  console.log('API Key exists:', !!apiKey);
  console.log('Project ID:', project_id);

  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY not found in environment',
      debug: { hasKey: false }
    });
  }

  if (!project_id) {
    return res.status(400).json({ error: 'Missing project_id' });
  }

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: 'プロジェクト「' + project_id + '」の分析をJSON形式で返してください。赤字化確率、推定赤字額、工期遅延、安全スコア、推奨対応を含めてください。必ずJSON形式で返してください。'
        }],
      }),
    });

    var data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Claude API error',
        status: response.status,
        message: (data.error && data.error.message) || 'Unknown error'
      });
    }

    var text = (data.content[0] && data.content[0].text) || '';
    var jsonStr = text;
    var match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) jsonStr = match[1];
    var jsonMatch = jsonStr.match(/\{[\s\S]*\}/);

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
