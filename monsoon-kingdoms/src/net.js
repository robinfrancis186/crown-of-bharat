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
  if (/invite code not found/i.test(text)) return 'That invite code does not exist. Check the six characters and try again.';
  if (/own invite/i.test(text)) return 'That is your own invite code. Share it with a friend instead.';
  if (/already friends/i.test(text)) return 'You are already friends with that kingdom.';
  if (/friend list is full/i.test(text)) return 'Your friend list is full.';
  if (/not your friend/i.test(text)) return 'Add this kingdom as a friend first.';
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
  // Friends, invites and presence.
  first(result) { return result.ok ? { ok: true, ...(Array.isArray(result.data) ? result.data[0] : result.data) } : result; }
  async profile() { if (!this.registered) return { ok: false, reason: 'Join online play first.' }; return this.first(await this.call('mk_my_profile', this.auth())); }
  async redeemInvite(code) {
    if (!this.registered) return { ok: false, reason: 'Join online play first.' };
    const clean = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length !== 6) return { ok: false, reason: 'Invite codes have six letters and numbers.' };
    return this.first(await this.call('mk_redeem_invite', this.auth({ p_code: clean })));
  }
  async claimInviteRewards() { if (!this.registered) return { ok: false, reason: 'Join online play first.' }; return this.first(await this.call('mk_claim_invite_rewards', this.auth())); }
  async heartbeat() { if (!this.registered) return { ok: false, reason: 'Join online play first.' }; return this.first(await this.call('mk_heartbeat', this.auth())); }
  async friends() {
    if (!this.registered) return { ok: false, reason: 'Join online play first.' };
    const result = await this.call('mk_friends', this.auth());
    return result.ok ? { ok: true, entries: Array.isArray(result.data) ? result.data : [] } : result;
  }
  async onlinePlayers(limit = 20) {
    const result = await this.call('mk_online_players', { p_limit: limit });
    return result.ok ? { ok: true, entries: Array.isArray(result.data) ? result.data : [] } : result;
  }
  async friendBase(friendId) {
    if (!this.registered) return { ok: false, reason: 'Join online play first.' };
    const result = await this.call('mk_friend_base', this.auth({ p_friend: friendId }));
    if (!result.ok) return result;
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    return row ? { ok: true, base: row } : { ok: false, reason: 'Your friend has not published a village yet.' };
  }
  async leaderboard(limit = 20) {
    const result = await this.call('mk_leaderboard', { p_limit: limit });
    return result.ok ? { ok: true, entries: Array.isArray(result.data) ? result.data : [] } : result;
  }
}
