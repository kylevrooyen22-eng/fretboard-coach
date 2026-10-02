// Daily keep-alive (run by the Vercel cron in vercel.json).
// Calls the ping() function in Supabase so the free project never pauses for inactivity.
const SB_URL = 'https://hmmqkpqyxrrsgwoqhayc.supabase.co';
const SB_KEY = 'sb_publishable_hVqQEj1GSy6fvgwpQzxRAw_bI2v6XbL'; // public key, already in index.html

module.exports = async (req, res) => {
  try {
    const r = await fetch(SB_URL + '/rest/v1/rpc/ping', {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: '{}',
    });
    const body = await r.text();
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, supabase: body });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
};
