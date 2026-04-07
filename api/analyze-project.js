export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var body = req.body || {};
  var project_id = body.project_id;
  var apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not found' });
  if (!project_id) return res.status(400).json({ error: 'Missing project_id' });

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: 'Return a JSON object with these fields for project "' + project_id + '": deficit_probability (0-100), estimated_deficit_yen (number), delay_days (number), safety_score (0-100), recommendations (array of strings). Return ONLY valid JSON.'
        }],
      }),
    });

    var rawText = await response.text();

    if (!response.ok) {
      return res.status(200).json({
        error: 'Claude API returned ' + response.status,
        raw_response: rawText.substring(0, 500),
        api_key_prefix: apiKey.substring(0, 10) + '...',
        api_key_length: apiKey.length
      });
    }

    var data = JSON.parse(rawText);
    var text = (data.content[0] && data.content[0].text) || '';
    var jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        return res.status(200).json({ status: 'success', project_id: project_id, ai_analysis: JSON.parse(jsonMatch[0]) });
      } catch (e) {}
    }
    return res.status(200).json({ status: 'success', project_id: project_id, ai_analysis: { raw: text } });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
