export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  try {
    const { fuelType, amount, unit, electricityKwh, materials } = req.body;

    const prompt = `あなたは建設業のCO2排出量算定の専門家です。以下のデータからScope 1・Scope 2・Scope 3のCO2排出量を算定してください。

【入力データ】
- 燃料種別: ${fuelType || '未入力'}
- 燃料使用量: ${amount || 0} ${unit || 'L'}
- 電力使用量: ${electricityKwh || 0} kWh
- 資材情報: ${materials || '未入力'}

【算定基準】
- 環境省 温室効果ガス排出量算定・報告マニュアル準拠
- 排出係数は最新の環境省公表値を使用

以下のJSON形式で回答してください:
{
  "scope1": { "value": 数値(tCO2), "breakdown": "計算根拠の説明" },
  "scope2": { "value": 数値(tCO2), "breakdown": "計算根拠の説明" },
  "scope3": { "value": 数値(tCO2), "breakdown": "計算根拠の説明" },
  "total": 数値(tCO2),
  "recommendations": ["削減提案1", "削減提案2", "削減提案3"],
  "summary": "総合評価コメント"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Anthropic API error: ${errorText}` });
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        return res.status(200).json(result);
      } catch {
        return res.status(200).json({ raw: text });
      }
    }

    return res.status(200).json({ raw: text });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
