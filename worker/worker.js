/* NEXT TRAIN — Cloudflare Worker.
   Some transit APIs can't be called straight from a web page (no CORS) or need a private key.
   This small Worker fetches them on the page's behalf, keeps the key secret, and caches
   each answer for 20 seconds so the upstream rate limits are never at risk.

   Secrets (Settings → Variables and Secrets in the Cloudflare dashboard):
     CTA_KEY   your CTA Train Tracker API key

   Routes:
     GET /cta/arrivals?mapid=40380   CTA Train Tracker arrivals for one 'L' station */

const ALLOWED_ORIGINS = [/^https:\/\/nickcarbone\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const TTL = 20; /* seconds */

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.some(re => re.test(origin));
    const cors = {
      'Access-Control-Allow-Origin': allowed ? origin : 'https://nickcarbone.github.io',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Vary': 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return reply({ error: 'method not allowed' }, 405, cors);

    const url = new URL(request.url);
    if (url.pathname === '/cta/arrivals') {
      const mapid = url.searchParams.get('mapid') || '';
      if (!/^4\d{4}$/.test(mapid)) return reply({ error: 'mapid must be a 5-digit CTA station ID' }, 400, cors);
      if (!env.CTA_KEY) return reply({ error: 'CTA_KEY secret is not set on this Worker' }, 500, cors);
      const upstream = `https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=${encodeURIComponent(env.CTA_KEY)}&mapid=${mapid}&outputType=JSON`;
      return cached(`https://next-train.cache/cta/${mapid}`, upstream, cors, ctx);
    }
    if (url.pathname === '/' || url.pathname === '/health') return reply({ ok: true, routes: ['/cta/arrivals?mapid='] }, 200, cors);
    return reply({ error: 'not found' }, 404, cors);
  }
};

/* Cache by a key that never contains the secret. */
async function cached(cacheKey, upstream, cors, ctx) {
  const cache = caches.default;
  const keyReq = new Request(cacheKey);
  let res = await cache.match(keyReq);
  if (!res) {
    let up;
    try { up = await fetch(upstream, { headers: { 'User-Agent': 'next-train (github.com/nickcarbone/next-train)' } }); }
    catch (e) { return reply({ error: 'upstream unreachable' }, 502, cors); }
    if (!up.ok) return reply({ error: 'upstream HTTP ' + up.status }, 502, cors);
    res = new Response(await up.text(), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${TTL}` } });
    ctx.waitUntil(cache.put(keyReq, res.clone()));
  }
  const out = new Response(res.body, res);
  Object.entries(cors).forEach(([k, v]) => out.headers.set(k, v));
  return out;
}

function reply(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors) });
}
