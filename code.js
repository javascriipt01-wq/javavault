// Java Vault email codes: sign-up verification and forgot-password.
// Vercel serverless function, no extra packages. Needs these Vercel environment variables:
//   BREVO_API_KEY, FB_CLIENT_EMAIL, FB_PRIVATE_KEY, FB_PROJECT_ID  (and optional EMAIL_PROVIDER=resend + RESEND_API_KEY + EMAIL_FROM)
// Codes are stored only as a hash in Firestore (collection authCodes), expire in 10 minutes and allow 5 wrong tries.
const crypto = require('crypto');
const FIREBASE_API_KEY = 'AIzaSyBewXRyo8wB3sDHGCCLjwO6Qb_SZMWdt9o'; // public web key, used only to check a logged-in user
const PROJECT = process.env.FB_PROJECT_ID || 'javavault-29cbb';
const SENDER = { name: 'Java Vault', email: process.env.BREVO_SENDER || 'javascriipt01@gmail.com' };
const TTL = 10 * 60 * 1000, WAIT = 60 * 1000, MAX_TRIES = 5;

const b64u = b => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
let tokenCache = { t: '', exp: 0 };
async function adminToken() {
  if (tokenCache.t && Date.now() < tokenCache.exp - 60000) return tokenCache.t;
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({ iss: process.env.FB_CLIENT_EMAIL, scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const key = (process.env.FB_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const sig = crypto.createSign('RSA-SHA256').update(head + '.' + claim).sign(key);
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + head + '.' + claim + '.' + b64u(sig) });
  const j = await r.json();
  if (!j.access_token) throw new Error('admin token failed');
  tokenCache = { t: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return j.access_token;
}

const IT = 'https://identitytoolkit.googleapis.com/v1/projects/' + PROJECT;
async function itCall(path, body) {
  const r = await fetch(IT + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await adminToken() }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || 'identity call failed');
  return j;
}
async function userByEmail(email) { const j = await itCall('/accounts:lookup', { email: [email] }); return (j.users && j.users[0]) || null; }
async function userByToken(idToken) {
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
  if (!r.ok) return null; const j = await r.json(); return (j.users && j.users[0]) || null;
}

const FS = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents/authCodes/';
const docId = (purpose, email) => crypto.createHash('sha256').update(purpose + ':' + email).digest('hex').slice(0, 40);
const hashCode = (code, id) => crypto.createHmac('sha256', process.env.FB_PRIVATE_KEY || 'x').update(code + ':' + id).digest('hex');
async function getDoc(id) {
  const r = await fetch(FS + id, { headers: { Authorization: 'Bearer ' + await adminToken() } });
  if (r.status === 404) return null; if (!r.ok) throw new Error('db read failed');
  const f = (await r.json()).fields || {};
  return { h: f.h && f.h.stringValue, exp: +(f.exp && f.exp.integerValue || 0), tries: +(f.tries && f.tries.integerValue || 0), sent: +(f.sent && f.sent.integerValue || 0) };
}
async function setDoc(id, d) {
  const r = await fetch(FS + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await adminToken() },
    body: JSON.stringify({ fields: { h: { stringValue: d.h }, exp: { integerValue: String(d.exp) }, tries: { integerValue: String(d.tries) }, sent: { integerValue: String(d.sent) } } }) });
  if (!r.ok) throw new Error('db write failed');
}
async function delDoc(id) { await fetch(FS + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + await adminToken() } }).catch(() => {}); }

async function sendMail(to, subject, text, html) {
  if (process.env.EMAIL_PROVIDER === 'resend' && process.env.RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.RESEND_API_KEY },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'Java Vault <onboarding@resend.dev>', to: [to], subject, text, html }) });
    if (!r.ok) throw new Error('email failed'); return;
  }
  const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
    body: JSON.stringify({ sender: SENDER, to: [{ email: to }], subject, textContent: text, htmlContent: html }) });
  if (!r.ok) throw new Error('email failed');
}
function mailBody(code, purpose) {
  const what = purpose === 'reset' ? 'reset your password' : 'verify your email';
  const text = 'Your Java Vault code is ' + code + '. Use it to ' + what + '. It expires in 10 minutes. If you did not ask for this, ignore this email.';
  const html = '<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px"><h2 style="margin:0 0 8px">Java Vault</h2>' +
    '<p style="color:#444">Use this code to ' + what + ':</p><div style="font-size:34px;font-weight:700;letter-spacing:8px;margin:16px 0">' + code + '</div>' +
    '<p style="color:#777;font-size:13px">It expires in 10 minutes. If you did not ask for this, you can ignore this email.</p></div>';
  return { text, html };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.BREVO_API_KEY && !process.env.RESEND_API_KEY) return res.status(503).json({ error: 'Email is not set up yet' });
  if (!process.env.FB_PRIVATE_KEY || !process.env.FB_CLIENT_EMAIL) return res.status(503).json({ error: 'Server is not set up yet' });
  let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } } body = body || {};
  const action = body.action, purpose = body.purpose === 'reset' ? 'reset' : 'signup';
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try {
    let email, user = null;
    if (purpose === 'signup') {
      user = bearer ? await userByToken(bearer) : null;
      if (!user || !user.email) return res.status(401).json({ error: 'Please sign in again' });
      email = user.email.toLowerCase();
    } else {
      email = String(body.email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return res.status(400).json({ error: 'That email address does not look right.' });
    }
    const id = docId(purpose, email), cur = await getDoc(id), now = Date.now();

    if (action === 'send') {
      if (cur && now - cur.sent < WAIT) return res.status(429).json({ error: 'Wait a minute before asking for another code.', wait: Math.ceil((WAIT - (now - cur.sent)) / 1000) });
      if (purpose === 'reset') { user = await userByEmail(email); if (!user) return res.status(200).json({ ok: true }); } // same answer whether or not the account exists
      else if (user.emailVerified) return res.status(200).json({ ok: true, verified: true });
      const code = String(crypto.randomInt(100000, 1000000));
      await setDoc(id, { h: hashCode(code, id), exp: now + TTL, tries: 0, sent: now });
      const m = mailBody(code, purpose);
      await sendMail(email, 'Your Java Vault code: ' + code, m.text, m.html);
      return res.status(200).json({ ok: true });
    }

    if (action === 'verify') {
      const code = String(body.code || '').replace(/\D/g, '');
      if (!cur || now > cur.exp) return res.status(400).json({ error: 'That code has expired. Ask for a new one.' });
      if (cur.tries >= MAX_TRIES) { await delDoc(id); return res.status(429).json({ error: 'Too many wrong tries. Ask for a new code.' }); }
      const ok = code.length === 6 && crypto.timingSafeEqual(Buffer.from(hashCode(code, id)), Buffer.from(cur.h));
      if (!ok) { await setDoc(id, { ...cur, tries: cur.tries + 1 }); return res.status(400).json({ error: 'Wrong code. Check it and try again.', left: MAX_TRIES - cur.tries - 1 }); }
      if (purpose === 'signup') { await itCall('/accounts:update', { localId: user.localId, emailVerified: true }); }
      else {
        const pw = String(body.newPassword || '');
        if (pw.length < 8 || pw.length > 64) return res.status(400).json({ error: 'Password must be 8 to 64 characters.' });
        const u = await userByEmail(email); if (!u) return res.status(400).json({ error: 'No account for that email.' });
        await itCall('/accounts:update', { localId: u.localId, password: pw, emailVerified: true });
      }
      await delDoc(id);
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(502).json({ error: 'Something went wrong. Try again in a moment.' });
  }
};
