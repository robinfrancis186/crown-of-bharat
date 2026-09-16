# Crown of Bharat rules contract

The simulation in `src/rules.js` is independent of Three.js, DOM, network and storage. State contains JSON-compatible data. Action functions mutate only the supplied game objects and return `{ok:true,...}` or `{ok:false,reason}`. `newGame`/`hydrate` return state; query functions return their documented information. Home timestamps use milliseconds; durations and battle deltas use seconds. The renderer must persist successful economic actions immediately.

Run the dependency-free assertions with `node tools/verify-rules.mjs`.

## Content and coordinates

Fifteen structure types: fort, farm, lumber, mine, granary, stepwell, barracks, camp, archer_tower, cannon, wall, market, laboratory, hero_hall and gem_mine. The `fort` is named Taj Mahal. All structures support levels 1 through 15 (`MAX_BUILDING_LEVEL = 15`). Ten troop types: guard, archer, engineer, rider, elephant, healer, bowler, miner, yeti and garuda; elephant is labeled Elephant Rider.

The 24×24 grid uses cells as simulation units. Buildings occupy `[x,x+w) × [z,z+h)`. Render a building at `((x+w/2-12)*2, 0, (z+h/2-12)*2)` and a unit at `((x-12)*2,0,(z-12)*2)`. Unit facing is radians about +Y; zero faces +Z. Home entities are `{id,type,x,z,w,h,level,builtAt,readyAt,upgradingTo,stored}`. Enemy entities add hp, maxHp and attackTimer. New construction has level 0; upgrades keep the old completed level until done.

A new village contains only a level-1 Taj Mahal, Rice Fields and Warrior Akhara, with six guards and four archers in 24 housing spaces. The Hall and new heroes must be earned through construction and upgrades. Existing kingdoms retain their layouts and progress.

`CATALOG[type]`: name, description, w, h, cost, time, hp, maxLevel, limit, unlock (capital level), optional production `{resource,rate,cap}` and defense range/damage/cooldown. `UNITS[type]`: name, description, cost, time, space, hp, damage, range, speed, cooldown, unlock (barracks level), optional heal. All preparation costs and times are zero.

## Runtime art and orientation

Each of the fifteen building types has fifteen distinct runtime model/portrait pairs: level 1 at `assets/buildings/<type>.glb` and levels 2–15 at `assets/buildings/levels/<type>/<level>.glb`, with sibling 512×512 PNGs. The standalone package contains all 225 building tiers plus ten troop, six hero and six environment models, totaling 247 GLBs. The five obsolete fort_2/fort_3/wall_2/wall_3/upgrade_ornament exports are excluded. Runtime loading fetches higher tiers only when needed by the visible village or battle; packaging all tiers does not mean loading every tier at startup.

Phone/tablet play is landscape-only. Portrait mode displays a rotation guide and blocks game interaction. The simulation keeps the 240-space army limit regardless of viewport. `tools/verify-levels.mjs` loads every building through the native GLTFLoader, requires a unique world-space geometry fingerprint for every tier in a family, and validates adjacent differences, footprint/ground alignment, normals, PBR materials, geometry/draw-call budgets and exact portrait dimensions. Its detailed report is `output/verification-levels.json`.

## State and saves

```
{
 version:1, name, resources:{coin,grain,wood,iron}, gems:150, builders:2,
 buildings, army:{guard,archer,engineer,rider,elephant,healer,bowler,miner,yeti,garuda},
 training:[{id,type,readyAt}], lastTick, nextId, totalRaids,
 unitLevels:{guard:1,...}, research:null|{type,level,readyAt},
 heroes:{veer:{level:1,readyAt:0,upgradingTo:0,slots:[null,null]},tara:{level:0,...}},
 activeHero:'veer', achievements:{[id]:true},
 ore:0, equipment:{[itemId]:{level:1..5}},
 tutorial:{acknowledged:[stepId],skipped:false},
 raidStars:{[raidId]:bestStars}, raidWins:{[raidId]:wins},
 ranked:{weekStart,tier,attacksUsed,score,history,lastReward},
 activeRaid:null|{id,raidId,kind,reserve,weekStart,originalArmy?,opponentId?}
}
```

Schema remains v1. `hydrate(raw,now)` accepts an object or JSON, migrates missing fields, bounds numbers, rejects unknown or overlapping structures, enforces building and troop limits, validates IDs, preserves legacy training queues and handles unfinished raid losses. It **does not insert new buildings into existing villages**. Old saves can build the Workshop, Hero Hall and Gem Garden normally. Existing lower-level layouts and level-1/2/3 camp capacities are preserved. Recovery hydration clamps a corrupt building level above 15 down to 15; explicit backup imports reject levels above 15. Construction timer validation derives its upper bound from each building’s catalog time multiplied by 15, preserving every legitimate high-level timer. Names are bounded to 28 characters; HTML still must be escaped by the UI. This is local save validation, not server-authoritative anti-cheat.

`tickHome(state,now)` completes construction, research, hero work and legacy queues, and credits at most eight hours of offline production. Stored resource limits apply independently. Gem Garden generates one gem per 30 minutes per completed level, capped at 20 stored gems. `collect` transfers whole units into currency storage; gems are stored separately in `state.gems`. Gem balance is capped at 999999, and ore likewise. The online device key lives in its own `monsoon.online.identity.v1` browser entry, never inside the kingdom save, so exporting or importing a kingdom neither carries nor reveals it.

## Village and army actions

- `capacity(state)` → `{army,used,queued,builders,busy,storage:{coin,grain,wood,iron}}`. Housing is 24 base plus 24/48/72 for each camp at levels 1/2/3, then two more spaces per camp level up to 96 at level 15. Total housing is capped at `MAX_ARMY_SPACE = 240` to keep battles bounded on mobile; each granary level adds 2000 to the base 3000 resource capacity. Hero upgrades occupy builders; research does not.
- `canPlace(state,type,x,z,excludeId?)`, `placeBuilding(state,type,x,z,now?)`, `moveBuilding(state,id,x,z)`, `upgradeBuilding(state,id,now?)`, `collect(state,id)` retain their original contracts.
- `upgradeInfo(state,id)` → `{ok,id,type,level,nextLevel,current,next,cost,duration,requires,canUpgrade,reason,freeBuilders,unlocks,capacityNote,capacityLabel}`. Current/next contain `{hp,damage,production,capacity}`. Duration is seconds; production is units/second. Costs, capital requirements and builder availability use the same calculation as the action. Camp current/next capacity is the actual total army capacity after the global cap, labeled "Total army capacity". When already at 240, both `capacityNote` and `requires` explicitly say the upgrade improves durability only. It remains available so every building can reach level 15 without implying extra troop space. `upgradeCost(building)` remains exported.
- `placeWallLine(state,x1,z1,x2,z2,now?)` places an inclusive horizontal or vertical run of at most 24 segments. Bounds, overlap, total limit and total cost are validated before charging. Walls finish instantly but require one currently free builder. Single-wall placement follows this path. Wall upgrades also finish instantly and require a free builder, without occupying one afterward.
- `train(state,type,count=1,now?)` adds free, immediate troops within unlocked barracks types and available housing. `removeTroop(state,type,count=1)` removes home troops. `quickTrain(state,now?)` fills available space with a rotating unlocked composition. Legacy paid queues still finish after their saved timestamps.

## Fifteen building tiers

All fifteen catalog entries, construction/upgrade gates, practice clones, hydration and backup import share the same level-15 ceiling. Non-capital buildings require the capital to reach their target level; building unlocks remain at their existing capital thresholds. Level 15 is terminal, so an attempted level-16 upgrade cannot charge resources.

Health increases by 35% of base HP per level beyond level 1; defensive damage rises by 30% of base damage. Production rates and ordinary producer storage scale with completed level. Gem Garden storage stays at 20 while its generation rate improves. Granary storage adds 2000 per level. The preserved camp curve and total 240-space cap are described above. Barracks, Workshop and Hero Hall upgrades beyond level 3 explicitly communicate improved building durability: troop availability, troop research and hero levels retain their existing three-tier ceilings.

Upgrade resource costs remain `ceil(baseCost × targetLevel × 0.8)` and duration is `baseTime × targetLevel` seconds; walls remain instant. The longest timer is a level-15 capital upgrade at 525 seconds. That upgrade costs 10,800 coin, 7,200 wood and 1,440 iron, which fits storage supported by contemporaneously upgraded granaries. The validation suite checks storage affordability and timer round-trips at every intermediate level for all fifteen types.

## Gems and research

Gems are earned in this local game; there is no payment system. Initial grant: 150. Each first campaign victory: 25. First completed structure upgrade: 10. First completed troop research: 15. Achievement markers prevent repeat claims. Weekly league rewards and Gem Garden collection are additional sources.

`buyBuilder(state)` purchases builder 3 for 100 gems or builder 4 for 200. Four is the maximum. `finishCost(state,kind,id,now?)` returns `{ok,kind,id,remaining,readyAt,cost}` for an unfinished timer; remaining is seconds and cost is gems. Price is one gem per 12 seconds remaining, rounded up. Kinds: `building`, `research`, `hero`; IDs: building ID, troop type, hero ID respectively. `finishWithGems` uses the same arguments, recomputes the current price, and returns `{ok,spent,cost}`. Already-completed/stale timers cannot charge again. Both helpers return a failure reason if no valid timer exists. Root should show the current price before dispatch and persist after success.

`effectiveUnit(state,type)` returns the current troop spec plus level and effective hp/damage/heal. Each research level adds 20% of base stats; maximum level is 3. `researchInfo(state,type)` returns `{ok,type,level,nextLevel,cost,duration,current,next,canResearch,reason,requires}`. `researchTroop(state,type,now?)` starts one lab job. Workshop level and capital level must both meet the next research level; barracks must unlock that troop. Research costs resources and time but no builder. Battle creation snapshots researched stats, and the combat simulation uses those stats directly.

## Permanent heroes

`HEROES` describes six original fictional heroes:

- Veer the Gatekeeper: melee frontline commander, Hall level 1. Battle Cry heals him for 40% maximum health and gives 1.8× damage for eight seconds.
- Captain Tara: ranged captain, Hall level 2. Arrowstorm hits up to four structures within eight cells for 3.5× her normal damage.
- Nila: Hall 3. Twin Arc begins within seven cells, then chains across up to three unique non-wall structures within four cells per hop: 2.6× damage with0.82 attenuation per bounce.
- Ayaan: Hall 4. Sky Mark targets the nearest defense within eight cells; troop/hero attacks against it gain35% damage for ten seconds.
- Ira: Hall 5. A fixed four-cell canopy shares650 absorption (scaled with hero level/power) across allies for eight seconds. Damage beyond the shield budget still lands.
- Kabir: Hall 6. Two temporary260HP decoys (scaled with level/power) spawn in distinct free nearby cells, seek defenses, draw fire ahead of regular units and expire after ten seconds. They cannot attack or keep an otherwise finished battle alive.

`battle.heroEffects` contains simulation-timed `{id,type,x,z,radius,expiresAt}` fields with `targetId/bonus` for marks or `remaining/maxAbsorb` for shields. Decoys are ordinary units with `decoy:true`, `heroOwner` and `expiresAt`; they never become persistent army inventory. Timed hero badges use `abilityUntil`, cleared on depletion, target destruction or decoy removal.

`heroInfo(state,id)` returns `{ok,id,level,readyAt,upgradingTo,nextLevel,cost,duration,spec,current:{hp,damage},next:{hp,damage},canUpgrade,reason,unlocked,available}`. `selectHero(state,id)` selects an unlocked hero for the next attack. `upgradeHero(state,id,now?)` starts a resource-paid builder job, capped by Hall level and level 3. Upgrading heroes are unavailable during raids. Hall levels 1–6 unlock Veer/Tara/Nila/Ayaan/Ira/Kabir at hero level 1. Timer completion, gem completion and legacy-save hydration use the same unlock mapping. Each hero level adds 25% of base health/damage.

`battle.hero` is null or `{id,name,level,deployed,abilityUsed,unitId}`. `deployHero(battle,x,z)` follows edge-deployment rules and deploys once. It does not consume army reserve or housing. Hero units use ordinary guard/archer/engineer base types for models/pathfinding plus `heroId` and a `spec` with actual stats. `heroAbility(battle)` validates a living deployed hero and unused charge. Tara, Nila and Ayaan retain their charge when no valid target is in range; Kabir retains his charge without two open spawn cells. Hero units remain permanent when defeated, retreating or refreshing; the next raid has fresh hero health and ability. An undeployed hero keeps an otherwise-spent attack open until the player deploys, retreats or times out.

## Battle lifecycle and combat

`createBattle(state,raidId)` returns `{ok,battle}` for one of six progressively unlocked campaign raids. `startRanked(state,now?)` creates a local AI league raid. Both transfer home army into `state.activeRaid.reserve` and clear the home army. **Persist immediately.** `battle.reserve` references the same reserve object. `deploy(battle,type,x,z)` consumes one troop from that reserve. **Persist every successful deployment.** Only outer-edge tiles are legal. Heroes deploy separately and remain owned.

`tickBattle(battle,dt)` accepts seconds and clamps each call to 0.2. Root should supply fixed steps or a real frame delta. Maximum attack duration is **180 seconds**. Status is active/victory/defeat. Stars: fort destroyed, at least 50% of non-wall structures, all non-wall structures. Battle ends at full destruction, timeout or no live/reserve attackers (including an available hero).

Cardinal BFS blocks all intact footprints. Melee units route to reachable attack cells and breach blocking ramparts when needed. Engineers prioritize ramparts/defenses and deal triple wall damage. Riders target defenses. Archers shoot over walls. Elephants are slow and durable. Healers path toward injured allies and heal periodically. Stone Bowlers splash nearby structures around their impact point. Tunnel Miners pass through ramparts but cannot enter intact buildings. Himalayan Yetis supply 1700 base health with slow melee movement. Garuda Riders fly over all footprints; watchtowers can target them, while cannons cannot damage airborne troops directly or through splash. Bowler/miner unlock at barracks level 2 and use 4/3 spaces; yeti/garuda unlock at level 3 and use 7/4 spaces. The relevant troop specs expose `splashRadius`, `burrow`, `flying` and `targetLabel`. Watchtowers acquire nearby units; cannons splash nearby ground groups. Destroying structures invalidates cached paths. No RNG or frame-dependent damage is used.

`castRain(battle)` is a single 40%-maximum-health heal to living deployed units, unlocked by a completed Stepwell. It rejects use before damage and after consumption.

Battle adds `spells`, `spellAreas`, `kind:'campaign'|'ranked'|'practice'`, `raid`, `hero`, `unitStats` to the original `{id,raidId,buildings,units,reserve,elapsed,duration,status,stars,destruction,events,eventId,deployed,revision,nextUnit,rainUsed,rainAvailable,difficulty,result}` fields. Units have hp/maxHp, spec, targetId, path, pathRevision, facing and action (`walk`,`attack`,`heal`,`idle`). Hero Veer also has rushUntil in elapsed battle seconds.

Events retain the last 128 `{id,type,x,z,fromX,fromZ}` records. Types: hit, arrow, cannon, heal, destroy, lightning, freeze, rage, chakram, sky_mark, canopy, deploy. Coordinates are cell centers; IDs increase monotonically. The renderer may drain the array or track consumed IDs.

`finishRaid(state,battle,now?)` settles completion or retreat exactly once. It returns undeployed troops, clears activeRaid, preserves heroes and grants earned rewards. **Persist immediately.** Refresh hydration acts as retreat: undeployed troops return, deployed troops stay consumed, no battle loot is awarded. Ranked attempts remain spent.

Results contain `{ok,victory,stars,destruction,reward,loot,overflow,gems,scoreGain,ranked,firstWin,title,story,nextRaid,deployed}`. reward/loot are actual received amounts; overflow records resources lost to full storage. First campaign victory loot is base × stars/3; repeat loot is 30% of that. Defeat has no resource loot. Campaign never awards league score.

## Targeted spells

`SPELLS` exports rain, lightning, freeze and rage, each `{name,description,charges:1,targeted,radius,duration}`; lightning also exposes damage. A completed Sacred Stepwell prepares one charge of **each** per battle. `battle.spells` stores scalar remaining charges by ID. There are no recharge timers or cooldowns. Charges refresh for a new battle; they do not cost gems.

`castSpell(battle,id,x,z)` validates an active battle, known spell, remaining charge and finite target coordinates inside the 24×24 grid. Rain is untargeted and delegates `castRain`, sharing the same rainUsed flag and charge. Lightning deals 350 immediate damage to buildings within 2.5 cells and requires a nearby building. Freeze stops defense attacks within three cells for six seconds and requires a nearby defense. Rage places a three-cell aura for eight seconds; troops standing inside receive 50% more attack damage and 30% more movement speed. Rage can be placed ahead of advancing troops. Invalid targets and repeated spent casts do not consume another charge or apply another effect.

`battle.spellAreas` contains `{id,type,x,z,radius,expiresAt}` for active freeze/rage visual areas; expiry uses elapsed battle seconds. Affected defenses have frozenUntil. The simulation removes expired areas and resumes frozen defense fire normally. Spell events use their ground target coordinates so the renderer can show distinct impacts. Rain remains compatible with the original dedicated button.

New troop counts default to zero and research levels to one when older saves are loaded. Existing practice snapshots with only the original six troop keys still receive the correct bounded full-army refund.

## Test your defenses

`startPractice(state)` returns `{ok,battle}` for a friendly challenge against a copy of the player's own completed village. It validates every copied footprint and uses the exact positions, current levels, wall layout, and `upgradeInfo` health/damage scaling. Buildings still under initial construction are excluded; upgrading buildings use their current completed level. Battle buildings add `sourceId` linking back to the home building and `damage` for their actual defensive damage. Damage during the test never changes the home village.

Practice uses the regular army/hero controls, three-star objectives, pathfinding and 180-second limit. `battle.kind` is `practice`, `battle.raid.id` is `practice`, and its name is `Test your defenses`. It consumes no ranked attempt and awards no resources, gems, campaign progress, raid count or league points. Results include `practice:true` and explain this distinction.

Practice stores a separate `activeRaid.originalArmy` snapshot. Victory, defeat and retreat restore the **entire original composition**, including deployed troops, exactly once. Refresh also restores the full snapshot when the active raid kind/ID, composition bounds, reserve consistency and total camp capacity validate; an invalid snapshot falls back to ordinary bounded reserve recovery. Heroes remain permanent. Preserve the usual immediate save ordering for start, deployment and finish so reloading knows this was a friendly challenge.

## Royal League — local AI only

Original tiers: Copper, Bronze, Silver, Gold, Peacock, Maharaja. Weeks start Monday 00:00 UTC. Each week has six attacks, reserved immediately when an attack starts. The leaderboard contains nine clearly labeled seeded AI opponents and the player. It is local competition with no real accounts, multiplayer matchmaking or simulated claims about actual players. Home defenses are not silently simulated as online PvP.

`getRanked(state,now?)` returns `{ok,league,tier,attacksUsed,attacksTotal:6,score,position,entries,endsAt,weekStart,history,lastReward,label}`. Entries are `{id,name,ai,isPlayer,score,position}`. `tier` is a zero-based number; league is its display name. History records score, stars, destruction, at and opponent. This query may perform weekly rollover, so root must persist the state when weeks change.

`startRanked` rejects a seventh attempt, scales enemy difficulty by tier/attempt and creates an AI base. Score is `stars*100 + destruction`, up to 400 per attack. Settlement is once-only. A battle started in an older week cannot award points in a newer week. End-of-week participants in the top three promote one tier; bottom three demote one tier; others hold. Top three earn 30 gems, middle four 15 and bottom three 5, once for the ended week. No attack means no reward or rank change. Skipping multiple weeks does not multiply rewards. `lastReward` contains `{weekStart,position,gems,previousTier,tier,promoted,demoted}`.

## Guided onboarding

- `TUTORIAL` is eight ordered steps. `tutorialState(state)` returns the first step whose completion test fails, plus `number`/`total`, so the current step is derived from the kingdom rather than stored as a cursor.
- Acknowledgement steps (`welcome`, `collect`, `hero`) complete when the player uses the step's call to action, recorded in `state.tutorial.acknowledged`. Goal steps (`build`, `capital`, `army`, `attack`, `defend`) complete only when the kingdom actually satisfies the predicate; using the call to action merely opens the right screen.
- `acknowledgeTutorial(state, id)` rejects any id that is not the current step. `skipTutorial(state)` sets `state.tutorial.skipped` and ends the guide permanently until the player replays it from Settings.
- Hydration keeps only recognised acknowledgements. A save written before onboarding existed is treated as an experienced player — skipped when it records any completed raid or a Taj above level 1 — so existing kingdoms are never dragged back to step one.

## Hero equipment and ore

- `state.ore` is a fifth, battle-only currency, capped at 999,999. `finishRaid` awards `stars × (2 + difficulty)`, doubled on a first campaign victory and multiplied by 1.5 online. Practice and defeats award none. Ore is never bought, produced or granted by achievements.
- `EQUIPMENT` holds fourteen pieces: three each for Veer/Tara and two each for Nila/Ayaan/Ira/Kabir, each with a Hall of Heroes unlock level, a forge price and per-level effects. `MAX_EQUIPMENT_LEVEL` is 5. Forging and upgrading are instant, cost only ore and never consume a builder.
- Each hero has two slots. Slot 1 needs Hall level 1, slot 2 needs Hall level 3. `heroSlots(state, id)` returns the effective contents, treating equipment that is unowned, locked or belonging to the other hero as empty.
- `heroBonus(state, id)` sums the equipped effects: `hp`, `damage` and `range` multipliers plus `abilityPower`, `abilityDuration`, `abilityTargets` and `abilityRange`. `heroInfo` exposes `base` (without equipment) and `current` (with it); `beginBattle` freezes the bonus onto `battle.hero.bonus`, and `deployHero` builds the unit from that same bonus, so the panel and the fielded hero can never disagree.
- Equipment changes abilities, not only statistics: the War Drum raises Battle Cry's healing and extends its duration, and the Hunting Hawk widens Arrowstorm's reach and target count.
- `equipItem` refuses locked slots, unowned equipment and the other hero's equipment, and moves a piece rather than duplicating it across both slots. Hydration caps ore and levels, drops unknown equipment and empties invalid slots.

## Online play

- `publishableLayout(state)` returns only completed buildings as `{type, x, z, level}`, plus the Taj level. Resources, army, gems, ore, heroes, equipment, achievements, league standing and save data never leave the device. A village without a completed capital cannot be published.
- `validateLayout(raw)` treats a downloaded base as untrusted input written by another player. It rebuilds every structure from scratch and rejects — never repairs — anything that is not an array of 1–150 entries of known type, integer level 1–15, integer in-bounds position, within the building's limit and not overlapping, and containing a capital. Smuggled fields such as `hp`, `damage` or `id` are discarded in favour of the real derived values.
- `startOnlineRaid(state, opponent)` validates the layout first, then begins a `kind: 'online'` battle carrying `battle.opponent` (id, truncated name, trophies, Taj level). The battle consumes deployed troops and returns unused troops and the hero exactly like a campaign raid.
- An online result pays no campaign loot, no gems and no campaign stars; it pays ore and trophies. `finishRaid` returns `online`, `opponentId` and `opponent` so the client can report the outcome.
- Combat runs on the attacking device, so results are trusted rather than verified. The server derives trophy movement itself from clamped stars and destruction, rejects self-attacks, requires the device key issued at registration, enforces a 15-second gap and an 80-attack daily cap, and exposes no table directly — every read and write is a checked Postgres function.

## Verification

The Node script covers catalog counts, starter overlap/gates/IDs, timed buildings, instant wall construction and upgrades, wall-line atomicity, free training and capacity, legacy migrations/queues, eight-hour Gem Garden bounds, builder prices, stale/double gem spending, effective researched combat damage, permanent hero upgrades/deployment/abilities, actual Battle Cry and Arrowstorm damage, first/repeat campaign rewards, all six campaign victories, every-step collision assertions, defeat/timeout, refresh and retreat troop losses, six-attack ranked limits, persisted attempt reservations, once-only settlements, promotion/demotion, rollover rewards cross-week settlement isolation, exact own-village practice layouts and scaled defensive damage, real practice victory, collision checks against the player's walls, full practice refunds on retreat/victory/refresh, and invalid practice snapshot rejection, new troop migration and preparation, bowler splash damage, miner wall bypass without building penetration, Garuda wall flight and air/ground targeting, yeti durability, spell charge validation, actual lightning/rage damage, freeze interruption/expiry, and shared rain charges.

`verify-layouts.mjs` asserts one authored layout per road, in-bounds and non-overlapping footprints, exactly one capital, ramparts from difficulty two, at least 200 free deployment tiles, a layout signature distinct from every other road, a victory for a standard campaign army on all six, and a citadel that resists at least 1.6× longer than the first outpost. `verify-progression.mjs` walks all eight onboarding steps in order, checks out-of-order acknowledgement rejection, skipping, veteran and newcomer migration, and covers equipment hall gates, slot gates, cross-hero rejection, rising costs charged exactly once, the level ceiling, panel/unit stat agreement, ability changes, ore award and practice exclusion, and tampered-save clamping. `verify-online.mjs` asserts published layouts carry only type/x/z/level and no secret substring, exclude unfinished construction, require a capital, and that sixteen malformed or hostile bases are each rejected with a reason while a valid base with smuggled fields loads with those fields discarded; it then runs a full online raid and confirms campaign stars, gems and resources are untouched.

## UX convenience queries and transactions

- `collectAll(state)` calls the validated collection path for all producers and returns actual transferred `amounts`, including gems. Full storage retains uncollected production; no transferable amount returns `ok:false`.
- `armyRecipe(state)` returns a sanitized map of the ten troop counts. `applyArmyRecipe(state, recipe)` replaces the army atomically and for free after strict key/count/unlock/capacity checks, including legacy queued housing. Active battles reject replacement.
- `previewAttack(state, kind, id, now)` accepts campaign/ranked/practice and calls the existing battle creator on a cloned, time-updated state. It cannot spend the player's army or league attempt. The UI revalidates and starts on the real state at confirmation; it never commits the preview object.

Building-tier verification executes all 210 upgrades from level 1 to 15 across fifteen building types, validates every pending timer and completed hydration/import, checks level-16 rejection/clamping behavior, confirms level-15 practice HP/damage, retains old full level-three armies, and enforces the 240-space ceiling with explicit capped-camp messaging.
