import assert from 'node:assert/strict';
import { openAccountStore } from '../src/account-store.js';
import { newGame } from '../src/rules.js';
import { SAVE } from '../src/storage.js';

const memory = new Map();
const localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
const documents = new Map();
let writes = 0, active = 0, maxActive = 0, offline = false, gate = null;
const snapshot = ref => ({ exists: () => documents.has(ref), data: () => documents.get(ref) });
const sdk = {
  doc: (_db, collection, uid) => `${collection}/${uid}`,
  getDocFromServer: async ref => { if (offline) throw Error('offline'); return snapshot(ref); },
  serverTimestamp: () => 'server-time',
  runTransaction: async (_db, callback) => {
    active++; maxActive = Math.max(active, maxActive);
    try {
      if (offline) throw Error('offline');
      if (gate) await gate;
      await callback({ get: async ref => snapshot(ref), set: (ref, value) => { documents.set(ref, value); writes++; } });
    } finally { active--; }
  },
};
const raw = name => JSON.stringify({ ...newGame(), name });
const open = (uid, onStatus) => openAccountStore({ db: {}, uid, localStorage, sdk, onStatus });
const accountKey = (uid, key = SAVE) => `monsoon.account.${uid}.${key}`;
localStorage.setItem(SAVE, raw('Guest must not import'));
const a = await open('alice');
assert.equal(a.storage.getItem(SAVE), null);
a.storage.setItem(SAVE, raw('Alice'));
assert.equal(await a.flush(), true);
assert.equal(documents.get('kingdoms/alice').revision, 1);
assert.equal(JSON.parse(documents.get('kingdoms/alice').kingdom).name, 'Alice');
const count = writes;
await a.flush();
a.storage.setItem(SAVE + '.backup', raw('Backup only'));
await a.flush();
assert.equal(writes, count, 'No duplicate/backup sync');
const b = await open('bob');
assert.equal(b.storage.getItem(SAVE), null);
b.storage.setItem(SAVE, raw('Bob'));
await b.flush();
assert.equal(JSON.parse(a.storage.getItem(SAVE)).name, 'Alice');
assert.equal(JSON.parse(localStorage.getItem(SAVE)).name, 'Guest must not import');

let release;
gate = new Promise(resolve => { release = resolve; });
a.storage.setItem(SAVE, raw('First edit'));
const pending = a.flush();
a.storage.setItem(SAVE, raw('Second edit'));
const again = a.flush();
assert.equal(pending, again, 'Concurrent flushes share one request');
release(); gate = null;
await pending;
assert.equal(maxActive, 1);
assert.equal(JSON.parse(documents.get('kingdoms/alice').kingdom).name, 'Second edit');

const events = [];
a.close();
const restored = await open('alice', event => events.push(event));
restored.storage.setItem(SAVE, raw('Offline edit'));
offline = true;
assert.equal(await restored.flush(), false);
assert.equal(JSON.parse(restored.storage.getItem(SAVE)).name, 'Offline edit');
assert.equal(events.at(-1).state, 'error');
await assert.rejects(open('offline-user'), /offline/);
offline = false;
await restored.flush();
assert.equal(JSON.parse(documents.get('kingdoms/alice').kingdom).name, 'Offline edit');

const cloudBefore = documents.get('kingdoms/alice');
documents.set('kingdoms/alice', { ...cloudBefore, revision: cloudBefore.revision + 1, kingdom: raw('Other session') });
restored.storage.setItem(SAVE, raw('Conflicting local edit'));
assert.equal(await restored.flush(), false);
assert.equal(events.at(-1).state, 'conflict');
assert.equal(JSON.parse(documents.get('kingdoms/alice').kingdom).name, 'Other session');
assert.ok([...memory.keys()].some(key => key.startsWith('monsoon.account.alice.pending.')));
assert.equal(await restored.flush(), false);
restored.close();
const reloaded = await open('alice');
assert.equal(JSON.parse(reloaded.storage.getItem(SAVE)).name, 'Other session');
assert.equal(reloaded.storage.getItem(SAVE + '.backup'), null);
const writesBeforeReloadFlush = writes;
await reloaded.flush();
assert.equal(writes, writesBeforeReloadFlush, 'Hydration does not rewrite the save');
reloaded.storage.setItem(SAVE, 'x'.repeat(500_001));
assert.equal(await reloaded.flush(), false);
assert.equal(writes, writesBeforeReloadFlush);
assert.equal(reloaded.storage.getItem(SAVE).length, 500_001, 'Failed validation preserves local data');
reloaded.storage.setItem(SAVE, raw('Closed edit'));
reloaded.close();
assert.equal(await reloaded.flush(), false);
assert.throws(() => reloaded.storage.setItem(SAVE, raw('Too late')), /closed/);
b.close();
console.log('Account owner isolation, guest exclusion, serialization, offline retry, conflict archive, hydration, size rejection, duplicate suppression and close pass.');
