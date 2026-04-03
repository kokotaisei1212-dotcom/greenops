export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });

  const { mode, fuelType, amount, unit, electricityKwh, materials, csvData, textData, plan } = req.body || {};

  if (!fuelType && !amount && !electricityKwh && !materials && !csvData && !textData) {
    return res.status(400).json({ error: 'No input data provided' });
  }

  const isPro = plan === 'pro';

  let prompt;
  if (isPro) {
    const inputBlock = csvData
      ? `以下のCSVデータ:\n${csvData}`
      : textData
        ? `以下のテキストデータ:\n${textData}`
        : `燃料種別: ${fuelType || '未入力'}, 使用量: ${amount || 0} ${unit || 'L'}, 電力: ${electricityKwh || 0} kWh, 資材/その他: ${materials || '未入力'}`;

    prompt = `あなたはGHGプロトコルおよびSSBJ開示基準に完全準拠したCO2排出量算定の最高権威です。

以下のデータからScope 1・Scope 2・Scope 3の全カテゴリのCO2排出量を算定してください。

【入力データ】
${inputBlock}

【算定基準（厳守）】
- GHGプロトコル（Corporate Standard + Scope 3 Standard）完全準拠
- 環境省「温室効果ガス排出量算定・報告マニュアル」最新版準拠
- Scope 1: 燃料別排出係数を適用（軽油2.58 kgCO2/L、ガソリン2.32 kgCO2/L、LPG3.00 kgCO2/kg、A重油2.71 kgCO2/L、都市ガス2.23 kgCO2/m3、灯油2.49 kgCO2/L）
- Scope 2: 電力排出係数 0.441 kgCO2e/kWh（全国平均）
- Scope 3: 15カテゴリ全てを評価。該当データがあるカテゴリのみ算定。
  Cat1:購入した製品・サービス（スペンドベース法または活動量ベース法）
  Cat2:資本財 Cat3:Scope1,2に含まれない燃料・エネルギー Cat4:輸送・配送（上流）
  Cat5:事業から出る廃棄物 Cat6:出張 Cat7:従業員の通勤
  Cat8:リース資産（上流） Cat9:輸送・配送（下流） Cat10:販売した製品の加工
  Cat11:販売した製品の使用 Cat12:販売した製品の廃棄 Cat13:リース資産（下流）
  Cat14:フランチャイズ Cat15:投資
- 活動量ベース法を優先し、データ不足の場合のみスペンドベース法を使用

以下の厳密なJSON形式で回答してください（JSON以外のテキストは一切出力しないでください）:
{
  "scope1": { "value": 数値(tCO2e), "breakdown": "燃料別の詳細計算式と結果", "items": [{"name":"項目名","value":数値,"unit":"tCO2e"}] },
  "scope2": { "value": 数値(tCO2e), "breakdown": "電力量×排出係数の計算式", "items": [{"name":"項目名","value":数値,"unit":"tCO2e"}] },
  "scope3": { "value": 数値(tCO2e), "breakdown": "カテゴリ別の算定根拠", "categories": [{"cat":番号,"name":"カテゴリ名","value":数値,"method":"算定手法","detail":"計算詳細"}] },
  "total": 数値(tCO2e),
  "hotspots": [{"source":"排出源名","percentage":数値,"suggestion":"削減提案"}],
  "recommendations": [{"action":"具体的アクション","reduction_tco2":数値,"reduction_pct":数値,"detail":"詳細説明"}],
  "ssbj_disclosure": {
    "governance": "ガバナンス開示文章（取締役会の監視体制、経営者の役割）",
    "strategy": "戦略開示文章（気候関連リスク・機会の影響）",
    "risk_management": "リスク管理開示文章（識別・評価・管理プロセス）",
    "metrics_targets": "指標・目標開示文章（Scope1-3排出量、削減目標、進捗）"
  },
  "summary": "総合評価"
}`;
  } else {
    prompt = `あなたはCO2排出量算定の専門家です。以下のデータからScope 1・Scope 2のCO2排出量を算定してください。

【入力データ】
- 燃料種別: ${fuelType || '未入力'}
- 燃料使用量: ${amount || 0} ${unit || 'L'}
- 電力使用量: ${electricityKwh || 0} kWh
- 補足: ${materials || '未入力'}

【算定基準（厳守）】
- 環境省「温室効果ガス排出量算定・報告マニュアル」準拠
- Scope 1排出係数: 軽油2.58 kgCO2/L、ガソリン2.32 kgCO2/L、LPG3.00 kgCO2/kg、A重油2.71 kgCO2/L、都市ガス2.23 kgCO2/m3、灯油2.49 kgCO2/L
- Scope 2排出係数: 0.441 kgCO2e/kWh（全国平均）

以下の厳密なJSON形式で回答してください（JSON以外のテキストは一切出力しないでください）:
{
  "scope1": { "value": 数値(tCO2e), "breakdown": "計算式と根拠", "items": [{"name":"燃料名","value":数値,"unit":"tCO2e"}] },
  "scope2": { "value": 数値(tCO2e), "breakdown": "計算式と根拠", "items": [{"name":"電力","value":数値,"unit":"tCO2e"}] },
  "total": 数値(tCO2e),
  "intensity": "排出原単位の説明",
  "recommendations": ["削減提案1","削減提案2","削減提案3"],
  "summary": "総合評価"
}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text().catch(() => 'Unknown error');
      console.error(`Anthropic API ${response.status}: ${errBody.slice(0, 500)}`);
      return res.status(502).json({ error: `AI API returned ${response.status}. Please retry.` });
    }

    const data = await response.json();

    if (!data.content || !data.content[0] || !data.content[0].text) {
      return res.status(502).json({ error: 'Unexpected AI response format' });
    }

    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        return res.status(200).json(JSON.parse(jsonMatch[0]));
      } catch (parseErr) {
        console.error('JSON parse failed:', parseErr.message);
        return res.status(200).json({ raw: text });
      }
    }

    return res.status(200).json({ raw: text });
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'AI request timed out. Please retry with less data.' });
    }
    console.error('Handler error:', error);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
}
