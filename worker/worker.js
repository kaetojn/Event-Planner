// Plan A backend: one Cloudflare Worker, no dependencies.
//
// It does five jobs:
//   1. Accounts: email and password sign-in (/auth/*).
//   2. Stores each plan in Workers KV and controls who can open it (/me, /plan/*, /view).
//   3. Suggestions from Claude, chosen from real places when Google Maps is set up (/suggest).
//   4. Place search and travel times from Google Maps (/places, /route).
//   5. A Claude connector (MCP) with OAuth sign-in, so Claude can read and build plans (/mcp).
//
// Secrets to set on the Worker:
//   AUTH_SECRET        a long random string that signs sign-in tokens. Required.
//   ANTHROPIC_API_KEY  your Claude API key. Without it the app hides its suggestion buttons.
//   GOOGLE_MAPS_KEY    a Google Maps Platform key with Places API (New) and Routes API enabled.
//                      Without it there is no place search or travel time, and suggestions are marked unchecked.
//   AI_DAILY_LIMIT     optional. Suggestion requests a day for each account (default 30).
// Binding: a KV namespace with the variable name DB (set in wrangler.toml).

const ALLOWED_ORIGINS = ['https://kaetojn.github.io', 'http://localhost:5173'];
const MODEL = 'claude-sonnet-5-5';
const DAY = 86400;
const MAX_PLAN_BYTES = 300000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/.well-known/') || ['/authorize', '/token', '/register', '/mcp'].includes(url.pathname)) {
        return await connector(request, env, url);
      }
      return await app(request, env, url);
    } catch (e) {
      if (e instanceof HttpError) return e.response;
      return jsonResponse(500, { error: { message: e.message || 'Something went wrong' } });
    }
  },
};

/* ───────────────────────── Helpers ───────────────────────── */

class HttpError extends Error {
  constructor(status, message, headers = {}) {
    super(message);
    this.response = jsonResponse(status, { error: { message } }, headers);
  }
}

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
}

const enc = new TextEncoder();
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const sha256 = async s => b64url(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const randomId = (bytes = 16) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));
const now = () => Math.floor(Date.now() / 1000);
const stamp = () => new Date().toISOString();

/** Compares by hash so the check takes the same time whatever was sent. */
async function same(a, b) {
  const [x, y] = await Promise.all([a, b].map(v => crypto.subtle.digest('SHA-256', enc.encode(v))));
  const p = new Uint8Array(x), q = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < p.length; i++) diff |= p[i] ^ q[i];
  return diff === 0;
}

async function hmacKey(env) {
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 16) throw new HttpError(500, 'Add an AUTH_SECRET secret (any long random string) to the Worker.');
  return crypto.subtle.importKey('raw', enc.encode(env.AUTH_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** Signed tokens: "pa1.<payload>.<signature>". They carry their own expiry. */
async function sign(env, payload) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(body));
  return `pa1.${body}.${b64url(sig)}`;
}

async function verify(env, token, typ) {
  if (typeof token !== 'string' || !token.startsWith('pa1.')) return null;
  const [, body, sig] = token.split('.');
  if (!body || !sig) return null;
  let ok = false;
  try { ok = await crypto.subtle.verify('HMAC', await hmacKey(env), fromB64url(sig), enc.encode(body)); } catch (e) { if (e instanceof HttpError) throw e; }
  if (!ok) return null;
  const p = JSON.parse(new TextDecoder().decode(fromB64url(body)));
  if (p.typ !== typ || (p.exp && p.exp < now())) return null;
  return p;
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, key, 256);
  return b64url(bits);
}

/** Counts something against a limit for a period, and refuses once the limit is passed. */
async function limit(env, key, max, seconds, message) {
  const count = +(await env.DB.get(key)) || 0;
  if (count >= max) throw new HttpError(429, message);
  await env.DB.put(key, String(count + 1), { expirationTtl: seconds });
}

/** Slows password guessing: ten wrong sign-ins from one address locks it out for 15 minutes. */
async function guard(env, request, ok) {
  const key = `fail:${request.headers.get('cf-connecting-ip') || 'unknown'}`;
  const count = +(await env.DB.get(key)) || 0;
  if (count >= 10) throw new HttpError(429, 'Too many tries. Wait 15 minutes and try again.');
  if (!ok) await env.DB.put(key, String(count + 1), { expirationTtl: 900 });
  return ok;
}

const cleanEmail = e => String(e || '').trim().toLowerCase();
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(e)) && cleanEmail(e).length <= 120;
const getUser = (env, email) => env.DB.get(`user:${cleanEmail(email)}`, 'json');
const putUser = (env, user) => env.DB.put(`user:${user.email}`, JSON.stringify(user));
const getDoc = (env, id) => env.DB.get(`plan:${id}`, 'json');
const putDoc = (env, doc) => env.DB.put(`plan:${doc.plan.id}`, JSON.stringify(doc));
const publicUser = u => ({ email: u.email, name: u.name });
const roleOf = (doc, user) => (doc.owner === user.email ? 'owner' : doc.editors.includes(user.email) ? 'editor' : null);

async function checkPassword(env, request, email, password) {
  const user = validEmail(email) ? await getUser(env, email) : null;
  const ok = !!user && (await same(await hashPassword(String(password || ''), user.salt), user.hash));
  await guard(env, request, ok);
  if (!ok) throw new HttpError(401, 'That email and password do not match.');
  return user;
}

const sessionFor = (env, user) => sign(env, { typ: 'session', em: user.email, v: user.v, exp: now() + 90 * DAY });

async function signedIn(request, env) {
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const p = bearer && (await verify(env, bearer, 'session'));
  const user = p && (await getUser(env, p.em));
  if (!user || user.v !== p.v) throw new HttpError(401, 'Your sign-in has expired. Sign in again.');
  return user;
}

async function readJson(request) {
  try { return (await request.json()) || {}; } catch { throw new HttpError(400, 'The request was not valid JSON'); }
}

/** The plan with the caller's access: their role, who else can edit, and the view link if one is on. */
const withAccess = (doc, user) => ({ plan: doc.plan, role: roleOf(doc, user), owner: doc.owner, editors: doc.editors, view: doc.owner === user.email ? doc.view || null : null });

/** Every plan this account owns or was invited to. Also drops plans that no longer exist from the account. */
async function plansFor(env, user) {
  const docs = await Promise.all((user.plans || []).map(id => getDoc(env, id)));
  const mine = docs.filter(d => d && roleOf(d, user));
  if (mine.length !== (user.plans || []).length) {
    user.plans = mine.map(d => d.plan.id);
    await putUser(env, user);
  }
  return mine;
}

async function openPlan(env, user, id, needOwner = false) {
  const doc = typeof id === 'string' ? await getDoc(env, id) : null;
  const role = doc && roleOf(doc, user);
  if (!role) throw new HttpError(404, 'That plan was not found, or you no longer have access to it.');
  if (needOwner && role !== 'owner') throw new HttpError(403, 'Only the person who made this plan can do that.');
  return doc;
}

async function savePlan(env, doc) {
  doc.plan.updatedAt = stamp();
  await putDoc(env, doc);
}

/* ───────────────────────── The app's API ───────────────────────── */

async function app(request, env, url) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin);
  const cors = {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  let res;
  try {
    if (!allowed) throw new HttpError(403, 'This site is not allowed to use the Worker');
    if (request.method !== 'POST') throw new HttpError(405, 'POST only');
    if (!env.DB) throw new HttpError(500, 'The KV binding named DB is not set on the Worker');
    res = await route(request, env, url.pathname);
  } catch (e) {
    res = e instanceof HttpError ? e.response : jsonResponse(500, { error: { message: e.message } });
  }
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}

async function route(request, env, path) {
  const ok = body => jsonResponse(200, { ok: true, ...body });
  const features = { ai: !!env.ANTHROPIC_API_KEY, places: !!env.GOOGLE_MAPS_KEY };

  if (path === '/config') return ok(features);

  if (path === '/auth/login') {
    const { email, password } = await readJson(request);
    const user = await checkPassword(env, request, email, password);
    return ok({ token: await sessionFor(env, user), user: publicUser(user) });
  }

  if (path === '/auth/signup') {
    const { email, password, name } = await readJson(request);
    if (!validEmail(email)) throw new HttpError(400, 'Enter a valid email address.');
    if (String(password || '').length < 8) throw new HttpError(400, 'Use a password of at least 8 characters.');
    if (await getUser(env, email)) throw new HttpError(409, 'An account with that email already exists. Sign in instead.');
    await limit(env, `signup:${request.headers.get('cf-connecting-ip') || 'unknown'}`, 5, DAY, 'Too many new accounts from this connection today. Try again tomorrow.');
    const salt = randomId(12);
    const address = cleanEmail(email);
    // Plans someone shared with this email before the account existed are waiting for it.
    const pending = (await env.DB.get(`pending:${address}`, 'json')) || [];
    const user = { id: randomId(9), email: address, name: String(name || '').trim().slice(0, 40), salt, hash: await hashPassword(password, salt), v: 1, plans: pending, profile: null, created: stamp() };
    await putUser(env, user);
    if (pending.length) await env.DB.delete(`pending:${address}`);
    return ok({ token: await sessionFor(env, user), user: publicUser(user) });
  }

  // A view-only link needs no account.
  if (path === '/view') {
    const { token } = await readJson(request);
    const id = typeof token === 'string' && token.length < 64 ? await env.DB.get(`view:${token}`) : null;
    const doc = id && (await getDoc(env, id));
    if (!doc || doc.view !== token) throw new HttpError(404, 'This link is no longer shared.');
    const owner = await getUser(env, doc.owner);
    return ok({ plan: doc.plan, by: owner?.name || '' });
  }

  const user = await signedIn(request, env);

  if (path === '/me') {
    const docs = await plansFor(env, user);
    return ok({ user: publicUser(user), profile: user.profile, plans: docs.map(d => withAccess(d, user)), ...features });
  }

  if (path === '/profile/save') {
    const { profile } = await readJson(request);
    if (!profile || typeof profile !== 'object' || JSON.stringify(profile).length > 4000) throw new HttpError(400, 'That profile could not be saved.');
    user.profile = profile;
    if (typeof profile.name === 'string' && profile.name.trim()) user.name = profile.name.trim().slice(0, 40);
    await putUser(env, user);
    return ok({});
  }

  if (path === '/account/signout-everywhere') {
    user.v += 1;
    await putUser(env, user);
    return ok({});
  }

  if (path === '/plan/save') {
    const { plan } = await readJson(request);
    if (!plan || typeof plan.id !== 'string' || !/^[\w-]{6,40}$/.test(plan.id) || typeof plan.title !== 'string' || !Array.isArray(plan.days) || !Array.isArray(plan.tasks) || !Array.isArray(plan.costs)) throw new HttpError(400, 'That plan could not be saved.');
    if (JSON.stringify(plan).length > MAX_PLAN_BYTES) throw new HttpError(413, 'This plan is too large to save.');
    let doc = await getDoc(env, plan.id);
    if (doc) {
      if (!roleOf(doc, user)) throw new HttpError(403, 'You no longer have access to this plan.');
      // Someone else saved a newer copy: hand it back instead of overwriting their work.
      if (doc.plan.updatedAt > plan.updatedAt) return ok({ stale: true, ...withAccess(doc, user) });
      doc.plan = plan;
    } else {
      if ((user.plans || []).length >= 200) throw new HttpError(400, 'This account has reached 200 plans. Delete one to add another.');
      doc = { plan, owner: user.email, editors: [], view: null };
      user.plans = [...(user.plans || []), plan.id];
      await putUser(env, user);
    }
    await putDoc(env, doc);
    return ok({ stale: false });
  }

  if (path === '/plan/delete') {
    const { id } = await readJson(request);
    const doc = await openPlan(env, user, id);
    if (doc.owner === user.email) {
      if (doc.view) await env.DB.delete(`view:${doc.view}`);
      await env.DB.delete(`plan:${id}`);
    } else {
      doc.editors = doc.editors.filter(e => e !== user.email);
      await putDoc(env, doc);
    }
    user.plans = (user.plans || []).filter(p => p !== id);
    await putUser(env, user);
    return ok({});
  }

  if (path === '/plan/share') {
    const { id, on } = await readJson(request);
    const doc = await openPlan(env, user, id, true);
    if (doc.view) await env.DB.delete(`view:${doc.view}`);
    doc.view = on ? randomId(12) : null;
    if (doc.view) await env.DB.put(`view:${doc.view}`, id);
    await putDoc(env, doc);
    return ok({ view: doc.view });
  }

  if (path === '/plan/invite' || path === '/plan/uninvite') {
    const { id, email } = await readJson(request);
    const doc = await openPlan(env, user, id, true);
    const address = cleanEmail(email);
    if (!validEmail(address)) throw new HttpError(400, 'Enter a valid email address.');
    if (address === user.email) throw new HttpError(400, 'That is your own email address.');
    const invite = path === '/plan/invite';
    if (invite && doc.editors.length >= 20) throw new HttpError(400, 'A plan can be shared with up to 20 people.');
    doc.editors = invite ? [...new Set([...doc.editors, address])] : doc.editors.filter(e => e !== address);
    await putDoc(env, doc);
    const other = await getUser(env, address);
    if (other) {
      other.plans = invite ? [...new Set([...(other.plans || []), id])] : (other.plans || []).filter(p => p !== id);
      await putUser(env, other);
    } else {
      const waiting = ((await env.DB.get(`pending:${address}`, 'json')) || []).filter(p => p !== id);
      if (invite) waiting.push(id);
      await env.DB.put(`pending:${address}`, JSON.stringify(waiting.slice(-50)), { expirationTtl: 180 * DAY });
    }
    return ok({ editors: doc.editors, hasAccount: !!other });
  }

  if (path === '/autocomplete') {
    // Called on most keystrokes, so it is limited in memory and not in KV, which allows few writes a day.
    const { input, session, near } = await readJson(request);
    if (String(input || '').trim().length < 2) return ok({ matches: [] });
    softLimit(`ac:${user.id}`, 1500, 'You have reached today\'s limit for place lookups.');
    return ok({ matches: await autocomplete(env, String(input), session, near) });
  }

  if (path === '/place') {
    const { id, session } = await readJson(request);
    softLimit(`pd:${user.id}`, 300, 'You have reached today\'s limit for place lookups.');
    return ok(await placeDetails(env, id, session));
  }

  if (path === '/places') {
    const { q, near } = await readJson(request);
    if (!String(q || '').trim()) throw new HttpError(400, 'Type a name or address to look for.');
    await limit(env, `places:${user.id}:${stamp().slice(0, 10)}`, 300, DAY, 'You have reached today\'s limit for place searches.');
    return ok({ places: await searchPlaces(env, [q, near].filter(Boolean).join(', '), 5) });
  }

  if (path === '/route') {
    const { points, mode } = await readJson(request);
    if (!Array.isArray(points) || points.length < 2 || points.length > 12) throw new HttpError(400, 'Send between 2 and 12 points.');
    return ok({ legs: await routeLegs(env, points, mode) });
  }

  if (path === '/suggest') {
    const body = await readJson(request);
    const doc = await openPlan(env, user, body.planId);
    await limit(env, `ai:${user.id}:${stamp().slice(0, 10)}`, +env.AI_DAILY_LIMIT || 30, DAY, 'You have reached today\'s limit for suggestions. It resets tomorrow.');
    return ok(await suggest(env, doc.plan, user.profile || {}, body));
  }

  throw new HttpError(404, 'Unknown path');
}

/* ───────────────────────── Google Maps ───────────────────────── */

function needMaps(env) {
  if (!env.GOOGLE_MAPS_KEY) throw new HttpError(501, 'Place search is not set up yet. Add a GOOGLE_MAPS_KEY secret to the Worker.');
}

/** A rough per-day cap kept in this Worker's memory. It resets when Cloudflare restarts the Worker, which is fine for a safety net. */
const counts = new Map();
function softLimit(key, max, message) {
  const k = `${key}:${stamp().slice(0, 10)}`;
  const n = (counts.get(k) || 0) + 1;
  if (counts.size > 5000) counts.clear();
  counts.set(k, n);
  if (n > max) throw new HttpError(429, message);
}

const sessionToken = t => (typeof t === 'string' && /^[\w-]{8,36}$/.test(t) ? t : undefined);

/** Places API (New) autocomplete: names that match what has been typed so far, nearest first when a position is given. */
async function autocomplete(env, input, session, near) {
  needMaps(env);
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_MAPS_KEY },
    body: JSON.stringify({
      input: input.slice(0, 120), sessionToken: sessionToken(session),
      ...(near && Number.isFinite(+near.lat) && Number.isFinite(+near.lng) ? { locationBias: { circle: { center: { latitude: +near.lat, longitude: +near.lng }, radius: 50000 } } } : {}),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(502, `Google Maps did not answer: ${json?.error?.message || res.status}`);
  return (json.suggestions || []).map(x => x.placePrediction).filter(Boolean).slice(0, 5).map(p => ({
    id: p.placeId, name: p.structuredFormat?.mainText?.text || p.text?.text || '', detail: p.structuredFormat?.secondaryText?.text || '',
  })).filter(p => p.id && p.name);
}

/** The address and map position of one place chosen from autocomplete. */
async function placeDetails(env, id, session) {
  needMaps(env);
  if (typeof id !== 'string' || !/^[\w-]{10,300}$/.test(id)) throw new HttpError(400, 'That place could not be looked up.');
  const token = sessionToken(session);
  const res = await fetch(`https://places.googleapis.com/v1/places/${id}${token ? `?sessionToken=${token}` : ''}`, { headers: { 'X-Goog-Api-Key': env.GOOGLE_MAPS_KEY, 'X-Goog-FieldMask': 'formattedAddress,location' } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.location) throw new HttpError(502, `Google Maps did not answer: ${json?.error?.message || res.status}`);
  return { address: json.formattedAddress || '', lat: json.location.latitude, lng: json.location.longitude };
}

/** Places API (New) text search. `rich` adds rating and price level, which Google bills at a higher tier. */
async function searchPlaces(env, textQuery, max = 5, rich = false) {
  needMaps(env);
  const fields = ['places.id', 'places.displayName', 'places.formattedAddress', 'places.location', 'places.primaryTypeDisplayName', ...(rich ? ['places.rating', 'places.userRatingCount', 'places.priceLevel'] : [])];
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_MAPS_KEY, 'X-Goog-FieldMask': fields.join(',') },
    body: JSON.stringify({ textQuery: String(textQuery).slice(0, 200), maxResultCount: max }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(502, `Google Maps did not answer the search: ${json?.error?.message || res.status}`);
  return (json.places || []).map(p => ({
    id: p.id, name: p.displayName?.text || '', address: p.formattedAddress || '', lat: p.location?.latitude, lng: p.location?.longitude,
    type: p.primaryTypeDisplayName?.text || '', ...(rich ? { rating: p.rating ?? null, ratings: p.userRatingCount ?? null, price: p.priceLevel ?? null } : {}),
  })).filter(p => p.name && typeof p.lat === 'number');
}

const TRAVEL = { drive: 'DRIVE', walk: 'WALK', transit: 'TRANSIT' };

/** Minutes of travel between each neighbouring pair of points. Answers are kept for 30 days. */
async function routeLegs(env, points, mode) {
  needMaps(env);
  const travelMode = TRAVEL[mode] || 'DRIVE';
  const at = p => `${(+p.lat).toFixed(4)},${(+p.lng).toFixed(4)}`;
  const legs = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (![a.lat, a.lng, b.lat, b.lng].every(n => Number.isFinite(+n))) { legs.push(null); continue; }
    if (at(a) === at(b)) { legs.push({ mins: 0, km: 0 }); continue; }
    const key = `leg:${travelMode}:${at(a)}:${at(b)}`;
    let leg = await env.DB.get(key, 'json');
    if (!leg) {
      const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_MAPS_KEY, 'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters' },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: +a.lat, longitude: +a.lng } } },
          destination: { location: { latLng: { latitude: +b.lat, longitude: +b.lng } } },
          travelMode,
        }),
      });
      const json = await res.json().catch(() => ({}));
      const r = json.routes?.[0];
      if (!res.ok || !r?.duration) { legs.push(null); continue; }
      leg = { mins: Math.max(1, Math.round(parseInt(r.duration, 10) / 60)), km: Math.round((r.distanceMeters || 0) / 100) / 10 };
      await env.DB.put(key, JSON.stringify(leg), { expirationTtl: 30 * DAY });
    }
    legs.push(leg);
  }
  return legs;
}

/* ───────────────────────── Suggestions ───────────────────────── */

const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const validTime = t => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const PRICE = { PRICE_LEVEL_FREE: 'free', PRICE_LEVEL_INEXPENSIVE: '$', PRICE_LEVEL_MODERATE: '$$', PRICE_LEVEL_EXPENSIVE: '$$$', PRICE_LEVEL_VERY_EXPENSIVE: '$$$$' };

/** What to look for in a window of the day: a meal if it spans a mealtime, then the person's own interests. */
function themesFor(from, to, profile) {
  const a = toMin(from), b = toMin(to);
  const spans = (s, e) => a < e * 60 && b > s * 60;
  const themes = [];
  if (spans(7.5, 10.5)) themes.push('breakfast and brunch');
  if (spans(12, 14)) themes.push('lunch restaurants');
  if (spans(18.5, 21)) themes.push('dinner restaurants');
  for (const i of profile.interests || []) if (!/food/i.test(i)) themes.push(String(i).toLowerCase());
  if (themes.length < 2) themes.push('things to do', 'cafes');
  return themes.slice(0, 4);
}

async function askClaude(env, system, prompt) {
  if (!env.ANTHROPIC_API_KEY) throw new HttpError(501, 'Suggestions are not set up yet. Add an ANTHROPIC_API_KEY secret to the Worker.');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, system, messages: [{ role: 'user', content: prompt }] }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(502, `Claude did not answer: ${json?.error?.message || res.status}`);
  const text = (json.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  const start = text.indexOf('['), end = text.lastIndexOf(']');
  try { return JSON.parse(text.slice(start, end + 1)); } catch { throw new HttpError(502, 'Claude answered in a form the app could not read. Try again.'); }
}

/**
 * Ideas for a stretch of one day. With Google Maps set up, Claude may only choose from places Google returned,
 * so names and addresses are real. Without it, ideas come from Claude's own knowledge and are marked unchecked.
 */
async function suggest(env, plan, profile, { date, from, to, wish }) {
  const day = plan.days.find(d => d.date === date);
  if (!day) throw new HttpError(400, 'That day is not in this plan.');
  if (!validTime(from) || !validTime(to) || toMin(to) - toMin(from) < 30) throw new HttpError(400, 'There is not enough open time to suggest anything.');
  const where = [plan.destination, plan.area].map(x => String(x || '').trim()).filter(Boolean).join(', ');
  if (!where) throw new HttpError(400, 'Add where this plan takes place, so suggestions can be nearby.');
  const ask = String(wish || '').trim().slice(0, 200);

  let candidates = [];
  if (env.GOOGLE_MAPS_KEY) {
    const themes = ask ? [ask] : themesFor(from, to, profile);
    const found = await Promise.all(themes.map(t => searchPlaces(env, `${t} in ${where}`, 6, true).catch(() => [])));
    const seen = new Set();
    for (const p of found.flat()) if (!seen.has(p.id)) { seen.add(p.id); candidates.push(p); }
    candidates = candidates.slice(0, 20);
  }
  const grounded = candidates.length > 0;
  const hours = (toMin(to) - toMin(from)) / 60;
  const count = hours >= 8 ? 5 : hours >= 4 ? 3 : 2;

  const system = `You help a careful planner fill open time in an itinerary. Reply with a JSON array only, no other text.
Each element: {"title": short name of the activity, "start": "HH:MM", "end": "HH:MM", ${grounded ? '"candidate": the number of the place chosen from the list,' : '"place": name of the place, "address": its address if you are sure of it or null,'} "cost": estimated total cost in dollars for the whole group as a number or null if unknown, "why": one plain sentence on why it suits them}.
Rules: every suggestion fits inside the open window with realistic time for travel and for the activity itself. Suggestions must not overlap each other. Offer ${count} at most, fewer if the window is short.
${grounded ? 'Choose only from the numbered places. Never invent a place.' : 'Suggest only places you are confident exist. Do not state opening hours or prices as fact.'}
Respect the person's pace, spending style and things to avoid. Do not repeat anything already on the day. Use sentence case and no exclamation marks.`;

  const already = day.items.filter(i => i.status !== 'skipped').map(i => `${i.start || i.part || ''} ${i.title}${i.place ? ` at ${i.place}` : ''}`.trim());
  const prompt = `Plan: ${plan.title} (${plan.kind}) in ${where}, for ${plan.people} ${plan.people === 1 ? 'person' : 'people'}.
Date: ${date}. Open window: ${from} to ${to}.
${ask ? `They asked for: ${ask}\n` : ''}Already on this day: ${already.length ? already.join('; ') : 'nothing'}.
About them: interests: ${(profile.interests || []).join(', ') || 'not given'}; pace: ${profile.pace || 'balanced'}; spending: ${profile.spend || 'mid'}; avoid: ${profile.avoid || 'nothing listed'}.
${plan.budget ? `Whole-plan budget: $${plan.budget}.\n` : ''}${grounded ? `Places to choose from:\n${candidates.map((c, n) => `${n + 1}. ${c.name} (${c.type || 'place'})${c.rating ? `, rated ${c.rating} from ${c.ratings} reviews` : ''}${PRICE[c.price] ? `, price ${PRICE[c.price]}` : ''}, ${c.address}`).join('\n')}` : ''}`;

  const raw = await askClaude(env, system, prompt);
  const suggestions = (Array.isArray(raw) ? raw : []).map(s => {
    const c = grounded ? candidates[+s.candidate - 1] : null;
    if (grounded && !c) return null;
    if (!s || typeof s.title !== 'string' || !validTime(s.start) || toMin(s.start) < toMin(from) || toMin(s.start) >= toMin(to)) return null;
    return {
      title: s.title.slice(0, 80), start: s.start, end: validTime(s.end) && toMin(s.end) > toMin(s.start) ? s.end : undefined,
      place: c ? c.name : typeof s.place === 'string' ? s.place.slice(0, 80) : undefined,
      address: c ? c.address : typeof s.address === 'string' ? s.address.slice(0, 160) : undefined,
      lat: c?.lat, lng: c?.lng, placeId: c?.id, rating: c?.rating ?? undefined,
      cost: Number.isFinite(+s.cost) && +s.cost > 0 ? Math.round(+s.cost) : undefined,
      why: typeof s.why === 'string' ? s.why.slice(0, 240) : '',
    };
  }).filter(Boolean).slice(0, count);
  return { suggestions, grounded };
}

/* ───────────────────────── Claude connector: OAuth ───────────────────────── */

const openCors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization, mcp-protocol-version, mcp-session-id', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

async function connector(request, env, url) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: openCors });
  const base = url.origin;
  const path = url.pathname;
  if (path.startsWith('/.well-known/oauth-protected-resource')) {
    return jsonResponse(200, { resource: `${base}/mcp`, authorization_servers: [base], bearer_methods_supported: ['header'], resource_name: 'Plan A' }, openCors);
  }
  if (path.startsWith('/.well-known/oauth-authorization-server') || path.startsWith('/.well-known/openid-configuration')) {
    return jsonResponse(200, {
      issuer: base, authorization_endpoint: `${base}/authorize`, token_endpoint: `${base}/token`, registration_endpoint: `${base}/register`,
      response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'], code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'], scopes_supported: ['plans'],
    }, openCors);
  }
  if (path === '/register') return register(request, env);
  if (path === '/authorize') return authorize(request, env, url);
  if (path === '/token') return token(request, env);
  if (path === '/mcp') return mcp(request, env, base);
  return jsonResponse(404, { error: 'not_found' });
}

const allowedRedirect = u => {
  try { const x = new URL(u); return x.protocol === 'https:' || x.hostname === 'localhost' || x.hostname === '127.0.0.1'; } catch { return false; }
};

/** Dynamic client registration. The client id is signed and carries its own redirect addresses, so nothing is stored. */
async function register(request, env) {
  if (request.method !== 'POST') return jsonResponse(405, { error: 'invalid_request' }, openCors);
  const body = await request.json().catch(() => ({}));
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter(u => typeof u === 'string') : [];
  if (!uris.length || !uris.every(allowedRedirect)) return jsonResponse(400, { error: 'invalid_redirect_uri', error_description: 'Redirect addresses must use https.' }, openCors);
  const name = String(body.client_name || 'Claude').slice(0, 60);
  const client_id = await sign(env, { typ: 'client', ru: uris, n: name });
  return jsonResponse(201, { client_id, client_name: name, redirect_uris: uris, client_id_issued_at: now(), token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] }, openCors);
}

async function readClient(env, clientId) {
  // Clients that publish a metadata document use an https URL as their id.
  if (/^https:\/\//.test(clientId || '')) {
    try {
      const doc = await (await fetch(clientId, { headers: { accept: 'application/json' } })).json();
      if (doc.client_id === clientId && Array.isArray(doc.redirect_uris)) return { ru: doc.redirect_uris, n: doc.client_name || 'Claude' };
    } catch { /* fall through */ }
    return null;
  }
  return verify(env, clientId, 'client');
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function signInPage({ params, client, error }) {
  const hidden = ['response_type', 'client_id', 'redirect_uri', 'code_challenge', 'code_challenge_method', 'state', 'scope', 'resource']
    .map(k => `<input type="hidden" name="${k}" value="${esc(params.get(k))}">`).join('');
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connect ${esc(client.n)} to Plan A</title>
<style>
  *{box-sizing:border-box} body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f7f5;color:#15181b;font:16px/1.5 Inter,system-ui,-apple-system,sans-serif;padding:20px}
  main{width:100%;max-width:400px;display:grid;gap:18px}
  .logo{font:500 26px/1 "Cormorant Garamond",Georgia,serif} .logo i{font-style:italic}
  h1{margin:0;font:600 38px/1.05 "Cormorant Garamond",Georgia,serif} p{margin:0;color:#5b6066;font-size:15px} label{display:grid;gap:6px;font-weight:600;font-size:14px}
  input[type=email],input[type=password]{height:48px;border:1px solid #d9d9d4;border-radius:12px;padding:0 12px;font:inherit;background:#fff}
  input:focus{outline:2px solid #1e4a3d;outline-offset:1px} button{height:52px;border:0;border-radius:26px;background:#1e4a3d;color:#fff;font:inherit;font-weight:600;cursor:pointer}
  .err{color:#a8322b;font-weight:600;font-size:14px}
</style></head><body><main>
<div class="logo">Plan <i>A</i></div>
<div style="display:grid;gap:8px"><h1>Connect ${esc(client.n)}</h1><p>${esc(client.n)} will be able to read your plans and profile, and add or change plans, items, tasks and costs.</p></div>
<form method="post" style="display:grid;gap:14px">${hidden}
<label>Email<input type="email" name="email" autocomplete="username" required autofocus></label>
<label>Password<input type="password" name="password" autocomplete="current-password" required></label>
${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}
<button type="submit">Allow access</button></form>
<p>You can disconnect at any time in Claude's connector settings. Your password is never shared with ${esc(client.n)}.</p>
</main></body></html>`, { status: error ? 401 : 200, headers: { 'content-type': 'text/html;charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https:; frame-ancestors 'none'" } });
}

async function authorize(request, env, url) {
  const params = request.method === 'POST' ? new URLSearchParams(await request.text()) : url.searchParams;
  const clientId = params.get('client_id');
  const redirect = params.get('redirect_uri');
  const client = await readClient(env, clientId);
  if (!client) return new Response('This connection request is not valid. Remove the connector in Claude and add it again.', { status: 400 });
  if (!redirect || !client.ru.includes(redirect)) return new Response('The redirect address does not match this connector.', { status: 400 });
  const back = q => {
    const to = new URL(redirect);
    for (const [k, v] of Object.entries(q)) to.searchParams.set(k, v);
    if (params.get('state')) to.searchParams.set('state', params.get('state'));
    return Response.redirect(to.toString(), 302);
  };
  if (params.get('response_type') !== 'code') return back({ error: 'unsupported_response_type' });
  if (!params.get('code_challenge') || params.get('code_challenge_method') !== 'S256') return back({ error: 'invalid_request', error_description: 'PKCE with S256 is required' });
  if (request.method !== 'POST') return signInPage({ params, client });
  let user;
  try { user = await checkPassword(env, request, params.get('email'), params.get('password')); }
  catch (e) { return signInPage({ params, client, error: e.message }); }
  const code = await sign(env, { typ: 'code', em: user.email, v: user.v, cid: await sha256(clientId), ru: redirect, cc: params.get('code_challenge'), exp: now() + 600 });
  return back({ code });
}

/** A grant is good while the account exists and has not signed out everywhere. */
async function grantUser(env, g) {
  const user = g?.em ? await getUser(env, g.em) : null;
  return user && user.v === g.v ? user : null;
}

async function issueTokens(env, g) {
  const grant = { em: g.em, v: g.v };
  return {
    access_token: await sign(env, { typ: 'access', ...grant, exp: now() + 3600 }), token_type: 'Bearer', expires_in: 3600,
    refresh_token: await sign(env, { typ: 'refresh', ...grant, jti: randomId(6), exp: now() + 60 * DAY }), scope: 'plans',
  };
}

async function token(request, env) {
  const fail = (error, error_description) => jsonResponse(400, { error, error_description }, openCors);
  if (request.method !== 'POST') return fail('invalid_request', 'POST only');
  const type = request.headers.get('content-type') || '';
  const p = type.includes('application/json') ? new URLSearchParams(await request.json()) : new URLSearchParams(await request.text());
  if (p.get('grant_type') === 'authorization_code') {
    const code = await verify(env, p.get('code'), 'code');
    if (!code) return fail('invalid_grant', 'The code is not valid or has expired');
    if (code.cid !== (await sha256(p.get('client_id') || ''))) return fail('invalid_grant', 'The code was issued to another client');
    if (code.ru !== p.get('redirect_uri')) return fail('invalid_grant', 'The redirect address does not match');
    if ((await sha256(p.get('code_verifier') || '')) !== code.cc) return fail('invalid_grant', 'The code verifier does not match');
    if (!(await grantUser(env, code))) return fail('invalid_grant', 'Sign in again');
    return jsonResponse(200, await issueTokens(env, code), openCors);
  }
  if (p.get('grant_type') === 'refresh_token') {
    const r = await verify(env, p.get('refresh_token'), 'refresh');
    if (!r || !(await grantUser(env, r))) return fail('invalid_grant', 'Sign in again');
    return jsonResponse(200, await issueTokens(env, r), openCors);
  }
  return fail('unsupported_grant_type', 'Use authorization_code or refresh_token');
}

/* ───────────────────────── Claude connector: MCP ───────────────────────── */

const INSTRUCTIONS = `Plan A holds the user's plans: weekends away, trips, birthdays, wedding days and other events.
A plan has days. Each day has items in time order. An item has either a start time (24-hour "HH:MM", with an optional end) or a part of the day (morning, afternoon or evening), plus an optional place, address, cost in dollars and note.
A plan also has a checklist of tasks, fixed costs such as flights and hotels, and an optional budget.
Call get_profile before suggesting anything, and follow the user's interests, pace, spending style and things to avoid.
When you propose places, check them with your own search or maps tools first. Never invent a place, an address, opening hours or a price; leave a field out when you are not sure.
Leave realistic travel time between items, do not overlap items, and keep to the plan's level of detail: "half" means plan by the half hour, "fixed" means only fixed points such as bookings, "loose" means morning, afternoon and evening.
Show the user a draft in the chat and get their agreement before adding many items. Costs are estimates for the whole group unless the user says otherwise.`;

const idArg = { type: 'string', description: 'The plan id from list_plans' };
const itemFields = {
  title: { type: 'string' },
  start: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', description: 'Start time, 24-hour HH:MM. Leave out when using part.' },
  end: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', description: 'End time, 24-hour HH:MM. Optional.' },
  part: { type: 'string', enum: ['morning', 'afternoon', 'evening'], description: 'Part of the day, for items with no set time' },
  place: { type: 'string', description: 'Name of the place' },
  address: { type: 'string' },
  cost: { type: 'number', minimum: 0, description: 'Cost in dollars for the whole group' },
  note: { type: 'string' },
};

const TOOLS = [
  { name: 'get_profile', description: 'The user\'s name, home city, interests, pace, spending style and things to avoid. Read this before suggesting anything.', inputSchema: { type: 'object', properties: {} }, annotations: { title: 'Profile', readOnlyHint: true } },
  { name: 'list_plans', description: 'Every plan the user can open, with its id, kind, place, dates and how much is on it. Start here.', inputSchema: { type: 'object', properties: {} }, annotations: { title: 'List plans', readOnlyHint: true } },
  { name: 'get_plan', description: 'One whole plan: each day\'s items in order with ids, the checklist, fixed costs, budget and total.', inputSchema: { type: 'object', required: ['plan_id'], properties: { plan_id: idArg } }, annotations: { title: 'Get a plan', readOnlyHint: true } },
  {
    name: 'create_plan',
    description: 'Creates a new, empty plan with one day for each date from start_date to end_date.',
    inputSchema: {
      type: 'object', required: ['title', 'kind', 'destination', 'start_date', 'end_date'],
      properties: {
        title: { type: 'string' }, kind: { type: 'string', enum: ['weekend', 'trip', 'birthday', 'wedding', 'event'] },
        destination: { type: 'string', description: 'City, hotel or venue' },
        start_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, end_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        detail: { type: 'string', enum: ['half', 'fixed', 'loose'], description: 'How tightly the user plans. Defaults to fixed.' },
        people: { type: 'integer', minimum: 1, default: 2 }, budget: { type: 'number', minimum: 0 },
      },
    },
    annotations: { title: 'Create a plan', readOnlyHint: false, destructiveHint: false },
  },
  {
    name: 'add_items',
    description: 'Adds items to days of a plan. Each item needs a date that is in the plan, a title, and either start or part.',
    inputSchema: {
      type: 'object', required: ['plan_id', 'items'],
      properties: { plan_id: idArg, items: { type: 'array', minItems: 1, maxItems: 60, items: { type: 'object', required: ['date', 'title'], properties: { date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, ...itemFields } } } },
    },
    annotations: { title: 'Add items', readOnlyHint: false, destructiveHint: false },
  },
  {
    name: 'update_item',
    description: 'Changes one item, marks it done or skipped, or removes it. Get item ids from get_plan.',
    inputSchema: {
      type: 'object', required: ['plan_id', 'item_id'],
      properties: { plan_id: idArg, item_id: { type: 'string' }, ...itemFields, status: { type: 'string', enum: ['todo', 'done', 'skipped'] }, remove: { type: 'boolean', description: 'true to delete the item' } },
    },
    annotations: { title: 'Update an item', readOnlyHint: false, destructiveHint: true },
  },
  { name: 'add_tasks', description: 'Adds tasks to a plan\'s checklist.', inputSchema: { type: 'object', required: ['plan_id', 'tasks'], properties: { plan_id: idArg, tasks: { type: 'array', minItems: 1, maxItems: 40, items: { type: 'string' } } } }, annotations: { title: 'Add tasks', readOnlyHint: false, destructiveHint: false } },
  { name: 'add_cost', description: 'Adds a fixed cost that is not tied to a time of day, such as flights or a hotel.', inputSchema: { type: 'object', required: ['plan_id', 'label', 'amount'], properties: { plan_id: idArg, label: { type: 'string' }, amount: { type: 'number', minimum: 0 } } }, annotations: { title: 'Add a cost', readOnlyHint: false, destructiveHint: false } },
  { name: 'set_budget', description: 'Sets or clears the plan\'s budget in dollars.', inputSchema: { type: 'object', required: ['plan_id'], properties: { plan_id: idArg, budget: { type: 'number', minimum: 0, description: 'Leave out to clear the budget' } } }, annotations: { title: 'Set the budget', readOnlyHint: false, destructiveHint: false } },
];

async function mcp(request, env, base) {
  const challenge = { 'WWW-Authenticate': `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`, ...openCors };
  if (request.method === 'GET') return new Response('This connector does not stream; use POST.', { status: 405, headers: { allow: 'POST', ...openCors } });
  if (request.method === 'DELETE') return new Response(null, { status: 204, headers: openCors });
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: openCors });
  const auth = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const user = await grantUser(env, auth && (await verify(env, auth, 'access')));
  if (!user) return jsonResponse(401, { error: 'invalid_token', error_description: 'Sign in to Plan A' }, challenge);
  let msg;
  try { msg = await request.json(); } catch { return jsonResponse(400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, openCors); }
  const batch = Array.isArray(msg);
  const results = [];
  for (const m of batch ? msg : [msg]) {
    const r = await handleRpc(m, env, user);
    if (r) results.push(r);
  }
  if (!results.length) return new Response(null, { status: 202, headers: openCors });
  return jsonResponse(200, batch ? results : results[0], openCors);
}

async function handleRpc(m, env, user) {
  if (!m || m.jsonrpc !== '2.0' || typeof m.method !== 'string') return { jsonrpc: '2.0', id: m?.id ?? null, error: { code: -32600, message: 'Invalid request' } };
  if (m.id === undefined) return null; // a notification
  const reply = result => ({ jsonrpc: '2.0', id: m.id, result });
  switch (m.method) {
    case 'initialize':
      return reply({ protocolVersion: m.params?.protocolVersion || '2025-06-18', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'plan-a', title: 'Plan A', version: '1.0.0' }, instructions: INSTRUCTIONS });
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: TOOLS });
    case 'tools/call': {
      const name = m.params?.name;
      if (!TOOLS.some(t => t.name === name)) return { jsonrpc: '2.0', id: m.id, error: { code: -32602, message: `Unknown tool: ${name}` } };
      try {
        const out = await runTool(name, m.params?.arguments || {}, env, user);
        return reply({ content: [{ type: 'text', text: JSON.stringify(out, null, 1) }], structuredContent: out });
      } catch (e) {
        return reply({ content: [{ type: 'text', text: e.message }], isError: true });
      }
    }
    default:
      return { jsonrpc: '2.0', id: m.id, error: { code: -32601, message: `Method not found: ${m.method}` } };
  }
}

/* ───────────────────────── Connector tools ───────────────────────── */

const r2 = n => Math.round(n * 100) / 100;
const sortKey = i => (i.start ? toMin(i.start) : { morning: 479.5, afternoon: 779.5, evening: 1079.5 }[i.part] ?? 479.5);
const totalOf = plan => r2(plan.costs.reduce((t, c) => t + c.amount, 0) + plan.days.reduce((t, d) => t + d.items.reduce((s, i) => s + (i.status === 'skipped' ? 0 : i.cost || 0), 0), 0));
const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d)) && !Number.isNaN(Date.parse(`${d}T12:00:00Z`));

/** Reads the item fields out of a tool call, refusing times that are not real times. */
function itemFrom(a, base = {}) {
  const item = { ...base };
  if (a.title !== undefined) item.title = String(a.title).trim().slice(0, 140);
  if (a.start !== undefined) {
    if (!validTime(a.start)) throw new Error(`"${a.start}" is not a time. Use 24-hour HH:MM, such as 19:30.`);
    item.start = a.start; delete item.part;
  }
  if (a.end !== undefined) {
    if (!validTime(a.end)) throw new Error(`"${a.end}" is not a time. Use 24-hour HH:MM.`);
    item.end = a.end;
  }
  if (a.part !== undefined) {
    if (!['morning', 'afternoon', 'evening'].includes(a.part)) throw new Error('part must be morning, afternoon or evening.');
    item.part = a.part; delete item.start; delete item.end;
  }
  if (item.start && item.end && toMin(item.end) <= toMin(item.start)) throw new Error(`"${item.title}" ends before it starts.`);
  if (!item.start) delete item.end;
  if (!item.start && !item.part) item.part = 'morning';
  if (a.place !== undefined) item.place = String(a.place).trim().slice(0, 80) || undefined;
  if (a.address !== undefined) item.address = String(a.address).trim().slice(0, 160) || undefined;
  if (a.cost !== undefined) item.cost = +a.cost > 0 ? r2(+a.cost) : undefined;
  if (a.note !== undefined) item.note = String(a.note).trim().slice(0, 300) || undefined;
  if (!item.title) throw new Error('Every item needs a title.');
  return item;
}

const describe = plan => ({
  id: plan.id, title: plan.title, kind: plan.kind, destination: plan.destination, detail: plan.detail, people: plan.people,
  budget: plan.budget ?? null, planned_total: totalOf(plan),
  days: plan.days.map(d => ({ date: d.date, items: [...d.items].sort((a, b) => sortKey(a) - sortKey(b)).map(i => ({ id: i.id, title: i.title, ...(i.start ? { start: i.start } : { part: i.part }), ...(i.end ? { end: i.end } : {}), ...(i.place ? { place: i.place } : {}), ...(i.address ? { address: i.address } : {}), ...(i.cost ? { cost: i.cost } : {}), ...(i.note ? { note: i.note } : {}), status: i.status })) })),
  tasks: plan.tasks.map(t => ({ text: t.text, done: t.done })),
  fixed_costs: plan.costs.map(c => ({ label: c.label, amount: c.amount })),
});

async function runTool(name, a, env, user) {
  if (name === 'get_profile') {
    const p = user.profile || {};
    return { name: user.name || p.name || '', home_city: p.home || '', interests: p.interests || [], pace: p.pace || 'balanced', spending: p.spend || 'mid', avoid: p.avoid || '' };
  }

  if (name === 'list_plans') {
    const docs = await plansFor(env, user);
    return { plans: docs.map(d => ({ id: d.plan.id, title: d.plan.title, kind: d.plan.kind, destination: d.plan.destination, from: d.plan.days[0]?.date, to: d.plan.days[d.plan.days.length - 1]?.date, items: d.plan.days.reduce((t, x) => t + x.items.length, 0), your_role: roleOf(d, user) })) };
  }

  if (name === 'create_plan') {
    if (!validDate(a.start_date) || !validDate(a.end_date) || a.end_date < a.start_date) throw new Error('Use dates like 2027-05-21, with the end on or after the start.');
    const days = [];
    for (let t = Date.parse(`${a.start_date}T12:00:00Z`); t <= Date.parse(`${a.end_date}T12:00:00Z`) && days.length < 60; t += DAY * 1000) days.push({ date: new Date(t).toISOString().slice(0, 10), items: [] });
    const at = stamp();
    const plan = {
      id: randomId(9), title: String(a.title || '').trim().slice(0, 80) || 'New plan', kind: ['weekend', 'trip', 'birthday', 'wedding', 'event'].includes(a.kind) ? a.kind : 'event',
      destination: String(a.destination || '').trim().slice(0, 120), detail: ['half', 'fixed', 'loose'].includes(a.detail) ? a.detail : 'fixed',
      people: Math.max(1, Math.round(+a.people || 2)), ...(+a.budget > 0 ? { budget: r2(+a.budget) } : {}), days, tasks: [], costs: [], createdAt: at, updatedAt: at,
    };
    if ((user.plans || []).length >= 200) throw new Error('This account has reached 200 plans.');
    await putDoc(env, { plan, owner: user.email, editors: [], view: null });
    user.plans = [...(user.plans || []), plan.id];
    await putUser(env, user);
    return { created: describe(plan) };
  }

  const doc = await openPlan(env, user, a.plan_id).catch(() => { throw new Error('No plan with that id. Use list_plans.'); });
  const plan = doc.plan;

  if (name === 'get_plan') return describe(plan);

  if (name === 'add_items') {
    if (!Array.isArray(a.items) || !a.items.length) throw new Error('Send at least one item.');
    const added = [];
    for (const x of a.items) {
      const day = plan.days.find(d => d.date === x.date);
      if (!day) throw new Error(`${x.date} is not a day in this plan. Its days run from ${plan.days[0].date} to ${plan.days[plan.days.length - 1].date}.`);
      const item = itemFrom(x, { id: randomId(8), status: 'todo' });
      day.items.push(item);
      added.push({ date: x.date, id: item.id, title: item.title });
    }
    await savePlan(env, doc);
    return { added, planned_total: totalOf(plan) };
  }

  if (name === 'update_item') {
    for (const day of plan.days) {
      const n = day.items.findIndex(i => i.id === a.item_id);
      if (n < 0) continue;
      if (a.remove) {
        const [gone] = day.items.splice(n, 1);
        await savePlan(env, doc);
        return { removed: gone.title };
      }
      const item = itemFrom(a, day.items[n]);
      if (a.status !== undefined) {
        if (!['todo', 'done', 'skipped'].includes(a.status)) throw new Error('status must be todo, done or skipped.');
        item.status = a.status;
      }
      day.items[n] = item;
      await savePlan(env, doc);
      return { updated: { date: day.date, ...item } };
    }
    throw new Error('No item with that id in this plan. Use get_plan to find it.');
  }

  if (name === 'add_tasks') {
    const tasks = (Array.isArray(a.tasks) ? a.tasks : []).map(t => String(t).trim().slice(0, 200)).filter(Boolean);
    if (!tasks.length) throw new Error('Send at least one task.');
    plan.tasks.push(...tasks.map(text => ({ id: randomId(8), text, done: false })));
    await savePlan(env, doc);
    return { added: tasks.length, tasks_total: plan.tasks.length };
  }

  if (name === 'add_cost') {
    if (!String(a.label || '').trim() || !(+a.amount > 0)) throw new Error('A cost needs a label and an amount above zero.');
    plan.costs.push({ id: randomId(8), label: String(a.label).trim().slice(0, 80), amount: r2(+a.amount) });
    await savePlan(env, doc);
    return { planned_total: totalOf(plan), budget: plan.budget ?? null };
  }

  if (name === 'set_budget') {
    if (a.budget === undefined || a.budget === null) delete plan.budget;
    else if (+a.budget >= 0) plan.budget = r2(+a.budget);
    else throw new Error('The budget must be zero or more.');
    await savePlan(env, doc);
    return { budget: plan.budget ?? null, planned_total: totalOf(plan) };
  }

  throw new Error(`Unknown tool ${name}`);
}
