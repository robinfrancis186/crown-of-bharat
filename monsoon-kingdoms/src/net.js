// Online play. Every call is a Postgres function on the backend; the tables themselves
// are unreachable from the browser. A device registers once and keeps an id + secret in
// local storage — there are no accounts, passwords or personal data, and the secret is
// only ever sent to this one endpoint over TLS.
export const ONLINE = {
  url: 'https://wcihordgjxybhndvlnak.supabase.co',
  key: 'sb_publishable_eP30ExStF9TLNERHUMLkqw_NAb-LYke',
};
const IDENTITY = 'monsoon.online.identity.v1';
const TIMEOUT = 12000;

const friendly = message => {
  const text = String(message || '');
  if (/invalid credentials|unknown player/i.test(text)) return 'This device is no longer registered. Rejoin from the Online panel.';
  if (/attacking too quickly/i.test(text)) return 'Wait a few seconds before your next online attack.';
  if (/daily attack limit/i.test(text)) return 'You have reached today’s online attack limit.';
  if (/layout/i.test(text)) return 'Your village could not be published. Rebuild any damaged structures and try again.';
  if (/Failed to fetch|NetworkError|timed out|aborted/i.test(text)) return 'No connection to the online service. Your kingdom is unaffected.';
  return text.slice(0, 140) || 'The online service did not respond.';
};

export class OnlineClient {
  constructor(storage) {
    this.storage = storage; this.identity = null; this.lastError = null;
    try { const raw = storage?.getItem(IDENTITY); if (raw) { const value = JSON.parse(raw); if (value?.id && value?.secret) this.identity = value; } } catch {}
  }
  get registered() { return !!this.identity; }
  get playerId() { return this.identity?.id || null; }
  saveIdentity(identity) {
    this.identity = identity;
    try { this.storage?.setItem(IDENTITY, JSON.stringify(identity)); } catch {}
  }
  forget() { this.identity = null; try { this.storage?.removeItem(IDENTITY); } catch {} }
  async rpc(name, body) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const response = await fetch(`${ONLINE.url}/rest/v1/rpc/${name}`, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', apikey: ONLINE.key, Authorization: `Bearer ${ONLINE.key}` },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      let payload = null; try { payload = text ? JSON.parse(text) : null; } catch {}
      if (!response.ok) throw new Error(payload?.message || payload?.hint || `Request failed (${response.status})`);
      return payload;
    } finally { clearTimeout(timer); }
  }
  async call(name, body) {
    try { return { ok: true, data: await this.rpc(name, body) }; }
    catch (error) { this.lastError = friendly(error?.message); return { ok: false, reason: this.lastError }; }
  }
  auth(extra = {}) { return { p_id: this.identity.id, p_secret: this.identity.secret, ...extra }; }
  async join(name) {
    const result = await this.call('mk_register', { p_name: String(name || '').slice(0, 28) });
    if (!result.ok) return result;
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!row?.id || !row?.secret) return { ok: false, reason: 'The online service returned an unexpected response.' };
    this.saveIdentity({ id: row.id, secret: row.secret, name });
    return { ok: true, id: row.id, trophies: row.trophies ?? 400 };
  }
  async publish(name, layout, tajLevel) {
    if (!this.registered) return { ok: false, reason: 'Join online play first.' };
    const result = await this.call('mk_publish_base', this.auth({ p_name: name, p_layout: layout, p_taj: tajLevel }));
    return result.ok ? { ok: true, ...(Array.isArray(result.data) ? result.data[0] : result.data) } : result;
  }
  async findOpponent() {
    if (!this.registered) return { ok: false, reason: 'Join online play first.' };
    const result = await this.call('mk_find_opponent', this.auth());
    if (!result.ok) return result;
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!row) return { ok: false, reason: 'No other kingdom has published a village yet. Publish yours and try again shortly.' };
    return { ok: true, opponent: row };
  }
  async reportAttack(defenderId, stars, destruction) {
    if (!this.registered) return { ok: false, reason: 'Join online play first.' };
    const result = await this.call('mk_report_attack', this.auth({ p_defender: defenderId, p_stars: stars, p_destruction: destruction }));
    return result.ok ? { ok: true, ...(Array.isArray(result.data) ? result.data[0] : result.data) } : result;
  }
  async defenseLog() {
    if (!this.registered) return { ok: false, reason: 'Join online play first.' };
    const result = await this.call('mk_defense_log', this.auth());
    return result.ok ? { ok: true, entries: Array.isArray(result.data) ? result.data : [] } : result;
  }
  async leaderboard(limit = 20) {
    const result = await this.call('mk_leaderboard', { p_limit: limit });
    return result.ok ? { ok: true, entries: Array.isArray(result.data) ? result.data : [] } : result;
  }
}
