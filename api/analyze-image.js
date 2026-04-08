export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var body = req.body || {};
  var image_base64 = body.image_base64;
  var image_type = body.image_type;
  if (!image_base64 || !image_type) return res.status(400).json({ error: 'image_base64 and image_type are required' });

  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image_type, data: image_base64 } },
            { type: 'text', text: 'この画像から日報または作業報告書の内容を抽出してください。日付、工事名、天気、作業内容、進捗率、使用材料、作業人員、安全事項、特記事項などがあれば抽出してください。テキスト形式で返してください。' }
          ]
        }],
      }),
    });

    var data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: (data.error && data.error.message) || 'Vision API error' });

    var text = (data.content[0] && data.content[0].text) || '';
    return res.status(200).json({ status: 'success', extracted_text: text });

  } catch (error) {
    return res.status(500).json({ error: 'Image analysis failed: ' + error.message });
  }
}
