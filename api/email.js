// JobPay email sender: Vercel serverless function using Resend.
// Needs the environment variable RESEND_API_KEY (set in Vercel). Never put the key in the app.
// Free plan without a domain: sender must be onboarding@resend.dev and mail only reaches the Resend account owner.
// When you verify a domain in Resend, set EMAIL_FROM in Vercel, e.g. "JobPay <hello@yourdomain.com>".
const FIREBASE_API_KEY = 'AIzaSyBewXRyo8wB3sDHGCCLjwO6Qb_SZMWdt9o'; // public web key, used only to check the user's login
const FROM = process.env.EMAIL_FROM || 'JobPay <onboarding@resend.dev>';


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

async function getUser(idToken) {
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken })
  });
  if (!r.ok) return null;
  const j = await r.json();
  return (j.users && j.users[0]) || null;
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'Email is not set up yet' });

  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const user = auth ? await getUser(auth).catch(() => null) : null;
  if (!user || !user.email) return res.status(401).json({ error: 'Please log in with an email account' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const subject = String((body && body.subject) || '').slice(0, 150);
  const text = String((body && body.text) || '').slice(0, 20000);
  if (!subject || !text) return res.status(400).json({ error: 'Subject and message are needed' });

  if (tooMany('e:' + user.localId, 20, 24 * 3600 * 1000)) return res.status(429).json({ error: 'Daily email limit reached. Try tomorrow.' });
  // Mail only ever goes to the logged-in user's own address, so the endpoint cannot be used to spam others.
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.RESEND_API_KEY },
      body: JSON.stringify({ from: FROM, to: [user.email], subject, text,
        html: '<div style="font-family:Arial,sans-serif;line-height:1.6;white-space:pre-wrap">' + esc(text) + '</div>' })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status === 403 || r.status === 422 ? 403 : 502)
      .json({ error: 'Email could not be sent yet. A verified domain is needed to email users.', detail: j.message || '' });
    return res.status(200).json({ ok: true, id: j.id });
  } catch (e) {
    return res.status(502).json({ error: 'Network problem, try again' });
  }
};
