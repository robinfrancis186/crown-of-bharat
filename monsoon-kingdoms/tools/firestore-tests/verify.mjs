import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) throw Error('Run through firebase emulators:exec. Real backends are prohibited.');
const projectId = 'demo-monsoon-rules';
const env = await initializeTestEnvironment({ projectId, firestore: { rules: await readFile(new URL('../../../firestore.rules', import.meta.url), 'utf8') } });
const google = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } }).firestore();
const alice = google('alice'), bob = google('bob');
const guest = env.unauthenticatedContext().firestore();
const password = env.authenticatedContext('alice', { firebase: { sign_in_provider: 'password' } }).firestore();
const anonymous = env.authenticatedContext('alice', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const ref = db => doc(db, 'kingdoms', 'alice');
const valid = (revision = 1, extra = {}) => ({ schema: 1, revision, kingdom: '{"version":1}', preferences: '{}', online: '{}', updatedAt: serverTimestamp(), ...extra });
let checks = 0;
const allow = async action => { await assertSucceeds(action); checks++; };
const deny = async action => { await assertFails(action); checks++; };
try {
  await env.clearFirestore();
  await deny(setDoc(ref(guest), valid()));
  await deny(setDoc(ref(bob), valid()));
  await deny(setDoc(ref(password), valid()));
  await deny(setDoc(ref(anonymous), valid()));
  await deny(setDoc(ref(alice), valid(2)));
  await allow(setDoc(ref(alice), valid()));
  await allow(getDoc(ref(alice)));
  for (const db of [guest, bob, password, anonymous]) await deny(getDoc(ref(db)));
  await deny(getDocs(collection(alice, 'kingdoms')));
  await deny(deleteDoc(ref(alice)));
  await deny(setDoc(doc(alice, 'other', 'alice'), valid()));
  await deny(getDoc(doc(alice, 'other', 'alice')));
  await deny(setDoc(ref(alice), valid(1))); // Stale revision cannot overwrite progress.
  await deny(setDoc(ref(alice), valid(3))); // Skipping revisions also fails.
  await allow(setDoc(ref(alice), valid(2)));
  for (const extra of [
    { schema: 2 }, { revision: 3.5 }, { kingdom: '' }, { kingdom: 42 },
    { kingdom: 'a'.repeat(500_001) }, { preferences: {} },
    { preferences: 'a'.repeat(32_001) }, { online: [] }, { online: 'a'.repeat(32_001) },
    { updatedAt: Timestamp.fromMillis(0) }, { extraField: true },
  ]) await deny(setDoc(ref(alice), valid(3, extra)));
  for (const field of ['schema', 'revision', 'kingdom', 'preferences', 'online', 'updatedAt']) {
    const payload = valid(3); delete payload[field]; await deny(setDoc(ref(alice), payload));
  }
  await deny(updateDoc(ref(bob), { revision: 3, updatedAt: serverTimestamp() }));
  await allow(setDoc(ref(alice), valid(3, { kingdom: 'a'.repeat(500_000), preferences: 'b'.repeat(32_000), online: 'c'.repeat(32_000) })));
  console.log(`Firestore emulator: ${checks} checks passed for Google ownership, guest/provider isolation, revision conflicts, schema/types/size/timestamp boundaries, list/delete denial and default denial.`);
} finally { await env.cleanup(); }
