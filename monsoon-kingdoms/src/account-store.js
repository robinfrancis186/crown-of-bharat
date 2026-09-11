import { SAVE, decodeSave } from './storage.js';

const FIELDS = { [SAVE]: 'kingdom', 'monsoon.preferences': 'preferences', 'monsoon.online.identity.v1': 'online' };
const KEYS = [...Object.keys(FIELDS), SAVE + '.backup'];
const EMPTY = { kingdom: '', preferences: '{}', online: '{}' };
const same = (a, b) => Object.keys(EMPTY).every(key => a[key] === b[key]);

function validate(payload) {
  if (typeof payload.kingdom !== 'string' || payload.kingdom.length > 500_000) throw Error('Kingdom save exceeds 500 KB or is invalid.');
  if (payload.kingdom) decodeSave(payload.kingdom);
  for (const key of ['preferences', 'online']) {
    if (typeof payload[key] !== 'string' || payload[key].length > 32_000) throw Error(`Invalid account ${key}.`);
    const value = JSON.parse(payload[key]);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`Invalid account ${key}.`);
  }
  return payload;
}

function readRemote(snapshot) {
  if (!snapshot.exists()) return { revision: 0, payload: { ...EMPTY } };
  const data = snapshot.data();
  if (data.schema !== 1 || !Number.isSafeInteger(data.revision) || data.revision < 1 || !data.kingdom) throw Error('Unsupported account save.');
  return { revision: data.revision, payload: validate({ kingdom: data.kingdom, preferences: data.preferences, online: data.online }) };
}

// sdk is a narrow test seam; production uses the locally bundled Firebase module.
export async function openAccountStore({ db, uid, localStorage, onStatus = () => {}, sdk }) {
  if (typeof uid !== 'string' || !uid || /[/.]/.test(uid)) throw Error('Invalid account owner.');
  sdk ??= await import('./firebase-sdk.js');
  const ref = sdk.doc(db, 'kingdoms', uid);
  const prefix = `monsoon.account.${uid}.`;
  const notify = (state, message) => { try { onStatus({ state, message }); } catch { /* UI cannot interrupt persistence. */ } };
  const readLocal = () => Object.fromEntries(Object.entries(FIELDS).map(([key, field]) => [field, localStorage.getItem(prefix + key) ?? EMPTY[field]]));
  const archive = payload => localStorage.setItem(`${prefix}pending.${Date.now()}.${Math.random().toString(36).slice(2)}`, JSON.stringify({ schema: 1, ...payload }));
  // Never silently fall back to another account or a guest save when offline.
  const remote = readRemote(await sdk.getDocFromServer(ref));
  const initial = readLocal();
  if (remote.revision && !same(initial, remote.payload)) {
    if (Object.values(FIELDS).some(field => initial[field] !== EMPTY[field])) archive(initial);
    // Backup also belongs to this owner and must not resurrect a previous cloud version.
    localStorage.removeItem(prefix + SAVE + '.backup');
    for (const [key, field] of Object.entries(FIELDS)) localStorage.setItem(prefix + key, remote.payload[field]);
  } else if (!remote.revision) {
    validate(initial);
  }
  let revision = remote.revision, committed = remote.payload;
  let timer = null, inFlight = null, closed = false, conflicted = false;
  const schedule = () => {
    if (closed || conflicted) return;
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; void flush(); }, 2000);
  };
  const storage = {
    getItem(key) { return KEYS.includes(key) ? localStorage.getItem(prefix + key) : null; },
    setItem(key, value) {
      if (closed) throw Error('Account storage is closed.');
      if (!KEYS.includes(key)) throw Error('Unsupported account storage key.');
      value = String(value);
      if (localStorage.getItem(prefix + key) === value) return;
      // Local durability comes before validation/network, including on cloud failure.
      localStorage.setItem(prefix + key, value);
      if (FIELDS[key]) schedule();
    },
    removeItem(key) {
      if (closed) throw Error('Account storage is closed.');
      if (!KEYS.includes(key)) throw Error('Unsupported account storage key.');
      localStorage.removeItem(prefix + key);
      if (FIELDS[key]) schedule();
    },
  };
  async function sync() {
    try {
      while (!closed && !conflicted) {
        const payload = validate(readLocal());
        if (same(payload, committed)) return true;
        if (!payload.kingdom) return false; // Wait for the game to create a complete initial save.
        const expected = revision;
        notify('saving', 'Saving your kingdom to your account…');
        await sdk.runTransaction(db, async transaction => {
          const current = readRemote(await transaction.get(ref));
          if (closed) throw Error('Account storage is closed.');
          if (current.revision !== expected) {
            const error = Error('Your kingdom changed on another session. Reload to continue.');
            error.code = 'account/conflict';
            throw error;
          }
          transaction.set(ref, { schema: 1, revision: expected + 1, ...payload, updatedAt: sdk.serverTimestamp() });
        });
        revision = expected + 1;
        committed = payload;
        if (!closed) notify('saved', 'Kingdom saved to your account.');
        // Edits made during a request are serialized into the next transaction.
      }
      return false;
    } catch (error) {
      if (error.code === 'account/conflict') {
        conflicted = true;
        clearTimeout(timer);
        let message = error.message;
        try { archive(readLocal()); } catch { message += ' Local progress remains on this device; the extra recovery archive could not be created.'; }
        if (!closed) notify('conflict', message);
      } else if (!closed) notify('error', `Progress is saved on this device. Cloud save failed: ${error.message}`);
      return false;
    }
  }
  function flush() {
    clearTimeout(timer);
    timer = null;
    if (closed || conflicted) return Promise.resolve(false);
    if (!inFlight) inFlight = sync().finally(() => { inFlight = null; });
    return inFlight;
  }
  function close() { closed = true; clearTimeout(timer); timer = null; }
  if (!same(readLocal(), committed)) schedule();
  else notify('saved', remote.revision ? 'Account kingdom loaded.' : 'Account ready.');
  return { storage, flush, close };
}
