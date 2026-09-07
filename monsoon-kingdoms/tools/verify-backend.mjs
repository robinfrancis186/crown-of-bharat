// Read-only health check against the backend configured in the actual game.
import assert from 'node:assert/strict';
import { OnlineClient, ONLINE } from '../src/net.js';
assert.equal(new URL(ONLINE.url).protocol, 'https:');
assert.ok(ONLINE.key.startsWith('sb_publishable_'), 'Browser must only contain a publishable key');
const response = await new OnlineClient(null).leaderboard(1);
assert.ok(response.ok, response.reason);
assert.ok(Array.isArray(response.entries));
console.log(`PASS: ${new URL(ONLINE.url).hostname} accepts the game publishable key and serves mk_leaderboard.`);
