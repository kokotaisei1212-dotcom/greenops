export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var body = req.body || {};
  var project_id = body.project_id;

  if (!project_id) return res.status(400).json({ error: 'Missing project_id' });

  var ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    var projectData = {
      project_id: project_id,
      project_name: project_id,
      contract_amount: 2500000000,
      start_date: '2024-01-01',
      planned_end_date: '2025-12-31',
      schedule: {
        progress_rate: 85,
        tasks: [
          { name: '杭打ち', progress: 95, status: 'delayed' },
          { name: '鉄骨工事', progress: 70, status: 'in-progress' }
        ]
      },
      reports: [
        { total_cost: 1150000000, hours_worked: 30.5, worker_count: 150 }
      ],
      chat: [
        { content: '杭打ちが遅延。予定より3日遅れ' },
        { content: 'PPE着用率が低下' }
      ]
    };

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
        messages: [{
          role: 'user',
          content: 'プロジェクト「' + projectData.project_name + '」の分析をJSON形式で返してください。\n以下の情報から、赤字化確率、推定赤字額、工期遅延日数、安全スコア、推奨対応3つを分析してください。\n\nプロジェクト情報:\n' + JSON.stringify(projectData, null, 2) + '\n\n必ずこのJSON形式で返してください:\n{\n  "cost": {\n    "loss_probability": 0.45,\n    "estimated_loss_yen": 3750000,\n    "severity": "WARNING"\n  },\n  "schedule": {\n    "predicted_delay_days": 12\n  },\n  "safety": {\n    "overall_score": 48,\n    "risk_level": "HIGH"\n  },\n  "recommendations": ["対応1", "対応2", "対応3"]\n}'
        }],
      }),
    });

    var data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: (data.error && data.error.message) || 'Claude API error' });
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
