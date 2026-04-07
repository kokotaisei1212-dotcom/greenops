import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'POST') {
    const { email, name, andpad_api_key } = req.body;
    const { data, error } = await supabase.from('users').insert([{ email, name, andpad_api_key, created_at: new Date().toISOString() }]).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ user: data[0], message: '登録完了' });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
