import assert from 'node:assert/strict';
import * as R from '../src/rules.js';
import { OnlineClient } from '../src/net.js';
import { developedVillage } from './developed-village.mjs';

// ---- Client: every friends/invite call is an authenticated RPC with clean arguments.
const calls = [];
const memory = new Map([['monsoon.online.identity.v1', JSON.stringify({ id: 'p1', secret: 's1', name: 'A' })]]);
const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k) };
globalThis.fetch = async (url, init) => {
  const name = url.split('/rpc/')[1], body = JSON.parse(init.body); calls.push({ name, body });
  const replies = {
    mk_my_profile: [{ player_id: 'p1', name: 'A', trophies: 400, invite_code: 'AB12CD', redeemed: false, pending_rewards: 2, friends: 1, online_now: 3 }],
    mk_redeem_invite: body.p_code === 'ZZZZZZ' ? { __error: 'invite code not found' } : [{ friend_id: 'p2', friend_name: 'B', rewarded: true }],
    mk_claim_invite_rewards: [{ claimed: 2 }], mk_heartbeat: [{ online_now: 4 }],
    mk_friends: [{ friend_id: 'p2', name: 'B', trophies: 410, taj_level: 3, online: true, last_seen: new Date().toISOString(), has_base: true }],
    mk_online_players: [{ player_id: 'p2', name: 'B', trophies: 410, taj_level: 3, online: true }],
    mk_friend_base: [{ player_id: 'p2', name: 'B', trophies: 410, taj_level: 3, layout: [{ type: 'fort', x: 10, z: 9, level: 2 }, { type: 'archer_tower', x: 4, z: 4, level: 1 }] }],
  };
  const reply = replies[name];
  if (reply?.__error) return new Response(JSON.stringify({ message: reply.__error }), { status: 400 });
  return new Response(JSON.stringify(reply ?? []), { status: 200 });
};
const net = new OnlineClient(storage);
const profile = await net.profile(); assert.equal(profile.invite_code, 'AB12CD'); assert.equal(profile.pending_rewards, 2);
assert.deepEqual(calls.at(-1).body, { p_id: 'p1', p_secret: 's1' }, 'profile authenticates with the device identity');
const redeemed = await net.redeemInvite(' ab-12 cd '); assert.ok(redeemed.ok && redeemed.rewarded); assert.equal(calls.at(-1).body.p_code, 'AB12CD', 'codes are normalised before sending');
const before = calls.length; const short = await net.redeemInvite('abc'); assert.equal(short.ok, false); assert.equal(calls.length, before, 'malformed codes never reach the server');
const unknown = await net.redeemInvite('ZZZZZZ'); assert.equal(unknown.ok, false); assert.match(unknown.reason, /does not exist/, 'server errors become friendly messages');
assert.equal((await net.claimInviteRewards()).claimed, 2); assert.equal((await net.heartbeat()).online_now, 4);
const friends = await net.friends(); assert.equal(friends.entries[0].online, true);
assert.equal((await net.onlinePlayers(5)).entries.length, 1); assert.deepEqual(calls.at(-1).body, { p_limit: 5 }, 'the public presence board needs no identity');
const base = await net.friendBase('p2'); assert.ok(base.ok); assert.equal(calls.at(-1).body.p_friend, 'p2');
const offline = new OnlineClient({ getItem: () => null, setItem() {}, removeItem() {} });
assert.equal((await offline.profile()).ok, false, 'unregistered devices are told to join first');

// ---- Rules: invite rewards respect storage and friendly challenges risk nothing.
{
  const s = developedVillage(Date.UTC(2026, 8, 20)), gems = s.gems, ore = s.ore || 0;
  const joined = R.grantInviteReward(s, 'joined'); assert.ok(joined.ok);
  assert.equal(s.gems, gems + R.INVITE_REWARDS.joined.gems); assert.equal(s.ore, ore + R.INVITE_REWARDS.joined.ore);
  const inviter = R.grantInviteReward(s, 'inviter', 3); assert.equal(inviter.received.gems, 3 * R.INVITE_REWARDS.inviter.gems);
  assert.equal(R.grantInviteReward(s, 'inviter', 0).ok, false); assert.equal(R.grantInviteReward(s, 'bogus').ok, false);
  const cap = R.capacity(s); s.resources.coin = cap.storage.coin; const capped = R.grantInviteReward(s, 'joined'); assert.equal(capped.received.coin, 0, 'storage limits apply');
  assert.equal(R.grantInviteReward(s, 'inviter', 1e9).count, 50, 'claims are bounded');
}
{
  const s = developedVillage(Date.UTC(2026, 8, 20)), army = { ...s.army };
  const friendly = R.startFriendly(s, (await net.friendBase('p2')).base); assert.ok(friendly.ok); assert.ok(friendly.battle.friendly);
  assert.equal(friendly.battle.kind, 'practice'); assert.equal(friendly.battle.opponent.name, 'B');
  assert.ok(friendly.battle.buildings.some(b => b.type === 'fort' && b.level === 2), "the friend's real layout is used");
  R.deploy(friendly.battle, 'guard', 0.5, 12.5); R.tickBattle(friendly.battle, 1);
  const result = R.finishRaid(s, friendly.battle); assert.ok(result.ok && result.practice);
  assert.deepEqual(s.army, army, 'every troop returns after a friendly challenge'); assert.equal(s.stats.battles || 0, 0, 'friendly challenges are not career battles');
  assert.equal(R.startFriendly(s, { player_id: 'x', layout: 'bad' }).ok, false, 'hostile layouts are rejected');
}
console.log('PASS: friends/invite/presence RPCs send authenticated, normalised arguments and map server errors; invite rewards honour storage and bounds; friendly challenges use the friend’s real layout under practice rules and return the whole army.');
