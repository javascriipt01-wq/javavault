// JobPay receipt scanner: Vercel serverless function.
// Needs the environment variable GEMINI_API_KEY (set in Vercel). Never put the key in the app.
const FIREBASE_API_KEY = 'AIzaSyBewXRyo8wB3sDHGCCLjwO6Qb_SZMWdt9o'; // public web key, used only to check the user's login
const MODELS = [process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'].filter(Boolean);

const PROMPT = 'You read receipts for a small trades business in Nigeria. Return JSON only with keys: ' +
  'vendor (string or null), date (YYYY-MM-DD or null), total (number, no currency symbol, or null), ' +
  'category (one of Materials, Tools, Fuel, Food, Other), description (short string), ' +
  'items (array of {name, qty, price}). If something is unreadable use null. Do not guess amounts.';


// Simple per-instance rate limit (resets when the server restarts; stops casual abuse).
const HITS = new Map();
function tooMany(key, max, windowMs) {
  const now = Date.now(); const a = (HITS.get(key) || []).filter(t => now - t < windowMs);
  if (a.length >= max) { HITS.set(key, a); return true; }
  a.push(now); HITS.set(key, a);
  if (HITS.size > 5000) { for (const k of HITS.keys()) { if (!(HITS.get(k) || []).some(t => now - t < windowMs)) HITS.delete(k); } }
  return false;
}
const clientIp = req => String((req.headers['x-forwarded-for'] || '')).split(',')[0].trim() || 'unknown';

async function checkLogin(idToken) {
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken })
  });
  if (!r.ok) return null;
  const j = await r.json();
  return (j.users && j.users[0] && j.users[0].localId) || null;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'Scanner is not set up yet' });

  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const uid = auth ? await checkLogin(auth).catch(() => null) : null;
  if (!uid) return res.status(401).json({ error: 'Please log in to scan receipts' });
  if (tooMany('s:' + uid, 40, 24 * 3600 * 1000) || tooMany('i:' + clientIp(req), 120, 24 * 3600 * 1000)) return res.status(429).json({ error: 'Daily scan limit reached. Enter it by hand or try tomorrow.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const data = body && body.image, mime = (body && body.mimeType) || 'image/jpeg';
  if (!data || typeof data !== 'string' || data.length > 4000000) return res.status(400).json({ error: 'Send a smaller photo' });
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(mime)) return res.status(400).json({ error: 'Unsupported image type' });

  let lastErr = 'Scan failed';
  for (const model of MODELS) {
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data } }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' }
        })
      });
      if (r.status === 404 || r.status === 400) { lastErr = 'Model ' + model + ' not available'; continue; }
      if (r.status === 429) return res.status(429).json({ error: 'Scanner is busy. Try again in a minute, or enter it by hand.' });
      if (!r.ok) { lastErr = 'Scanner error ' + r.status; continue; }
      const j = await r.json();
      const text = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts &&
        j.candidates[0].content.parts.map(p => p.text || '').join('');
      const parsed = JSON.parse((text || '').replace(/```json|```/g, '').trim());
      return res.status(200).json({ ok: true, model, data: parsed });
    } catch (e) { lastErr = 'Could not read the receipt'; }
  }
  return res.status(502).json({ error: lastErr });
};
