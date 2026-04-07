export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    var body = req.body || {};
    var project_id = body.project_id;
    var api_key = body.api_key;
    var api_token = body.api_token;

    if (!project_id || !api_key || !api_token) {
      return res.status(400).json({ error: 'Missing required parameters: project_id, api_key, api_token' });
    }

    var projectData = await fetchANDPADData(project_id, api_key, api_token);
    var analysis = await analyzeWithClaude(projectData);

    return res.status(200).json({
      status: 'success',
      timestamp: new Date().toISOString(),
      project: {
        id: projectData.project_id,
        name: projectData.project_name,
        contract_amount: projectData.contract_amount,
      },
      ai_analysis: analysis,
    });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
}

async function fetchANDPADData(projectId, apiKey, token) {
  var baseUrl = 'https://api.andpad.jp/api/v1';
  var headers = {
    'Authorization': 'Bearer ' + token,
    'X-API-Key': apiKey,
    'Content-Type': 'application/json',
  };

  try {
    var scheduleRes = await fetch(baseUrl + '/projects/' + projectId + '/schedules', { headers: headers });
    var schedule = await scheduleRes.json();

    var startDate = new Date();
    startDate.setDate(startDate.getDate() - 45);
    var reportsRes = await fetch(
      baseUrl + '/projects/' + projectId + '/reports?start_date=' + startDate.toISOString().split('T')[0],
      { headers: headers }
    );
    var reports = await reportsRes.json();

    return {
      project_id: projectId,
      project_name: (schedule && schedule.project_name) || 'Unknown',
      contract_amount: (schedule && schedule.contract_amount) || 0,
      start_date: schedule && schedule.actual_start_date,
      planned_end_date: schedule && schedule.planned_end_date,
      schedule: schedule || {},
      reports: (reports && reports.reports) || [],
    };
  } catch (error) {
    console.error('ANDPAD API error:', error.message);
    throw new Error('ANDPAD API connection failed: ' + error.message);
  }
}

async function analyzeWithClaude(projectData) {
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  var prompt = 'あなたは建設プロジェクトの分析AIです。以下のANDPADプロジェクトデータを分析し、JSON形式で結果を返してください。\n\n'
    + '分析項目:\n'
    + '1. cost_analysis: 原価分析（消化率、予算残、リスクレベル）\n'
    + '2. schedule_analysis: 工期分析（進捗率、遅延日数、完了予測）\n'
    + '3. safety_analysis: 安全分析（リスク要因、推奨対策）\n'
    + '4. recommendations: 優先度付きの推奨アクション（最大5件）\n'
    + '5. summary: 総合評価（1-2文）\n\n'
    + 'JSON以外のテキストは出力しないでください。\n\n'
    + 'プロジェクトデータ:\n' + JSON.stringify(projectData, null, 2);

  var response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    var errText = await response.text();
    throw new Error('Claude API error: ' + response.status);
  }

  var data = await response.json();
  var text = data.content[0].text;
  var jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch (e) { return { raw: text }; }
  }
  return { raw: text };
}
