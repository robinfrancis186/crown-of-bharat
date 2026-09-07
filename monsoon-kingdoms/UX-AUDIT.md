# Monsoon Kingdoms — product and UX audit

**Baseline and verified usability pass reviewed: 7 September 2026.**

**Overall product: 4.8 → 5.5/10. UI and interaction subset: 5.3 → 7.0/10.** The verified usability pass makes army preparation, reading, scouting and safe battle commitment substantially better. The overall score rises less because campaign variety, equipment, social play, animation and long-term depth remain unchanged. This is a stronger local prototype, not yet a commercial multiplayer equivalent.

The overall figures are equal-weight averages of all 25 categories: **before 119.5 ÷ 25 = 4.78; after 137 ÷ 25 = 5.48**. The separate UI and interaction subset uses exactly categories **3, 4, 5, 6, 9, 11, 14 and 25**: **42.5 ÷ 8 = 5.31 → 56 ÷ 8 = 7.00**. It excludes art, content breadth, online infrastructure and other product categories; it must not be presented as the overall game score. These are editorial assessments, not measured player satisfaction or a percentage of Clash implemented. Missing equipment and social systems still receive zero.

## How this assessment was made

**Directly inspected:** `src/main.js`, `src/ui.js`, `src/style.css`, `src/view.js`, `src/rules.js`, `src/storage.js`, README, rules documentation, previous verification reports, and retained desktop/mobile screenshots. Source findings identify implemented behavior; screenshots establish appearance only at their recorded resolution and state.

**Retained evidence, not a new test by this report author:** `output/VERIFICATION-FINAL.md` records prior progression, import/recovery, desktop/mobile and performance checks. Its claims are attributed below instead of silently being treated as fresh measurements. The retained 320px battle screenshot uses a prepared level-three test kingdom; it is not evidence of a natural first-time player's progression.

**Fresh verification for the after column:** the main task reported `tools/playtest-ux.js` PASS at 1440×1000, 390×844 and 320×844 with zero page errors. A separate UI pass covered 1440×900, 320×740 and 840×390; a renderer pass checked motion preferences, modal input and spell previews. This report author inspected the updated source and before/after screenshots and attributes those live test results to the testing agents. The full `npm test` suite was also reported passing. A final package smoke check measured 60 FPS with 16.7ms median and 17.3ms p95 over 180 frames after 90 warm-up frames at 1440×1000 on this Mac. The performance score stays unchanged because broader hardware and maximum-battle coverage remain missing.

**Reference:** the user's Clash of Clans screenshots and current official Supercell pages rechecked for army preparation, recipes, ranked rules, hero equipment, friendly challenges and the August 2026 UI update. **Clash scores are editorial, reference-based estimates, not a hands-on evaluation of the current app on this Mac.** Performance and accessibility equivalence are marked **N/T** because screenshots and documentation cannot establish them. An apparent visual advantage is not a frame-rate benchmark.

**Score guide:** 0 = absent; 1–3 = rudimentary or strongly obstructive; 4–5 = usable prototype with significant gaps; 6–7 = solid core with visible limitations; 8–9 = mature, consistently polished; 10 = exceptional and extensively validated. No 10 is justified by this evidence.

## Ratings by major part

| # | Area | Before /10 | After /10 | Clash reference /10 | Evidence after the usability pass and remaining gap |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Core build–fight–upgrade loop | **6.5** | **6.5** | 9 | Unchanged simulation/content breadth: construction, production, six campaigns and loot settlement function, but the same three-tier ceiling limits sustained progression. Preparation is easier; that does not add campaign depth. |
| 2 | First-session onboarding | **3** | **4.5** | 8 | A dismissible next-objective prompt now opens the relevant action, and Field Guide has a visible shortcut. This improves direction; it is not the skippable, action-verified guided tutorial proposed below. |
| 3 | Home-screen hierarchy | **6** | **7** | 9 | Readable resource presentation, storage popover and clearer modal hierarchy improve scanning. The village remains central. Existing architecture and terrain are unchanged; a natural first-session study is still needed. |
| 4 | Typography and information density | **4** | **7** | 8 | Expanded troop descriptions and spell states now use 12px text in tested phone layouts instead of the previous 7–9px treatment. Larger labels and progressive detail replace the compressed catalog. Full text-enlargement and contrast audits remain outstanding. |
| 5 | Navigation and action discoverability | **5.5** | **7.5** | 8.5 | Build categories, Ready/All/Locked troop filters, visible guide, Tools and a joined battle briefing reduce searching. Preview, Edit army and Review battle now form a coherent loop. More polished transitions and longitudinal usability testing remain. |
| 6 | Mobile controls and playfield protection | **4.5** | **7** | 9 | First troop content moved from approximately y725 to y252 in the UI agent’s 320×740 comparison; all three starter rows are now above the fold. Tested phone/landscape panels scroll without overflow. The battle tray shows brought troops with a swipe cue; maximum mixed armies still merit touch-device testing. |
| 7 | Base placement and layout editing | **6** | **6** | 9 | Unchanged core layout tools: snapped footprints, validated preview/cancel/confirm and keyboard adjustment. Modal camera locking improves safety, but there is still no layout undo, multi-select or saved layout. No score increase for unbuilt tools. |
| 8 | Walls and bulk operations | **4.5** | **5** | 9 | The false three-second wall label is fixed by matching the catalog to instant construction. Straight-line placement remains atomic. Bulk same-level upgrades and line relocation remain absent, so the improvement is limited to clarity. |
| 9 | Building upgrade clarity | **7** | **7** | 9 | Current/next stats, resource costs, builder availability and gates remain functional. General readability helps access them, but tier models and upgrade depth were not expanded. The score stays at 7. |
| 10 | Economy, gems and spending clarity | **6** | **7** | 8 | Collect all, storage details and more legible cost/gate presentation reduce routine friction. Stepwell copy correctly lists four spells. No new economic balance study or expanded resource strategy has occurred. |
| 11 | Army preparation convenience | **5.5** | **7.5** | 9 | One saved army recipe now restores the exact composition, Clear army works, and the saved recipe survives reload. Ready/Locked filters and compact troop controls make the first action immediate. Expanded troop details also offer Add 5. Multiple named recipes, refill-last-army and bulk removal are still future work. |
| 12 | Troop roles and roster coherence | **5.5** | **5.5** | 9 | Ten existing unit roles and stats are unchanged. Better cards expose them, but the tank-role overlap and lack of encounters demanding varied compositions remain. No roster-depth score increase. |
| 13 | Combat AI, tactics and feedback | **5** | **5.5** | 9 | An actual-layout SVG scout preview now supports planning before commitment, and safe retreat pause/resume is verified. Combat AI, formations, impact feel and replay tools are otherwise unchanged. |
| 14 | Spells and battlefield abilities | **6** | **7** | 9 | Prospective spell radius previews now render before casting, with stable reused geometry in the renderer test. Phone spell states are readable. Existing four-spell effects remain; spell loadouts and research are still absent. |
| 15 | Heroes and identity | **5** | **5** | 9 | Veer and Tara remain permanent, upgradeable, three-level heroes with one active slot. Briefing shows the selected/available hero, but no new hero mechanic, defense role or animation was added. |
| 16 | Hero equipment and build customization | **0** | **0** | 9 | Still absent: no equipment ownership, slots, item upgrades or loadout effects. This remains a missing system and scores zero. |
| 17 | Defensive strategy and learning | **4** | **4.5** | 9 | Scouting now exposes the real layout and defense counts before practice or attack, improving planning. Only two firing-defense archetypes remain; no traps, defending heroes, defense log or replay diagnosis was added. |
| 18 | Campaign, story and encounter variety | **4** | **4** | 7.5 | Unchanged six stories and shared enemy layout generator. The six regions still lack distinct maps, objective types and boss behavior. No increase for a redesigned briefing around the same encounters. |
| 19 | Ranked competition and replay value | **4** | **4** | 9 | Ranked commitment is safer and its local-AI status is clear, but competition itself is unchanged: deterministic AI standings, reused encounters, no defensive results or online matchmaking. The competitive-depth score remains 4. |
| 20 | Clans, cooperation and online service | **0** | **0** | 9 | Still absent: accounts, clans, donations, chat, wars, spectator and real-player PvP. Local save/score UI is not an online service. |
| 21 | Art direction and architectural identity | **6** | **6** | 9 | Same original Blender assets, landmarks, stylized trees and terrain. No art rework or new concept-to-game fidelity evidence was delivered in this pass. Score unchanged. |
| 22 | Animation, sound and moment-to-moment feel | **3.5** | **3.5** | 9 | Same joint/root animation and oscillator sound implementation. Reduced decorative motion is an accessibility improvement, not richer animation or audio. Score unchanged. |
| 23 | Local persistence, recovery and release usability | **7.5** | **7.5** | 8.5 | Existing local save/import/recovery foundations remain. Army recipe persistence is now tested, but it is a device preference rather than authenticated cloud continuity. No new distribution or account scope is credited. |
| 24 | Performance and device coverage | **6.5** | **6.5** | **N/T** | Fresh package smoke check: Balanced, 1440×1000, 60 FPS, 16.7ms median and 17.3ms p95 on this Mac (180 samples after 90 warm-up frames; 185 draw calls and 626,410 triangles). Broader device and maximum-battle coverage remain absent, so the score stays unchanged. |
| 25 | Accessibility and recoverable interaction | **4** | **6** | **N/T** | Readable controls, modal canvas lock, safe mid-gesture disabling, paused retreat confirmation and live reduced-motion handling improve recovery and access. Decorative Three.js movement stops while essential combat continues. Fully keyboard-driven world play, text enlargement and assistive-technology testing remain incomplete. |

## What is already worth keeping

The product has an actual simulation rather than a presentation mockup. Placement validation, atomic spending, research effects, wall collisions, spell charges, permanent heroes and recoverable saves are meaningful foundations. Keep these and improve their discoverability. Rewriting the engine would not automatically improve them.

The Indian landmarks give the village a distinctive identity. Keep recognizable silhouettes and original troop art. The goal should be coherent, readable stylized art with convincing material response—not an indiscriminate push toward photorealism that makes a small-screen strategy game harder to read.

The local AI label is correct. Preserve that honesty across every league screen, result and description. A visible leaderboard of invented kingdoms is acceptable when the player understands that it is local simulation.

## Findings, fixes and remaining work

The impact descriptions below record the baseline problem. Each status states what is now verified; proposed work beyond that status remains a recommendation.

### 1. Teach the first ten minutes

**Now:** next-objective prompt and visible guide shortcut delivered; prompt-to-Army navigation passed. A complete tutorial and unassisted first-session study remain outstanding.

**Impact:** new players see many buildings and buttons but receive little direction about what to do or why. The current field guide explains mechanics only after the player discovers it.

**Improvement:** use a short, skippable sequence: collect grain → upgrade one building → prepare an army → scout a simple outpost → deploy guards then archers → use one ability → return and spend loot. Progress should follow actual completed actions and survive reload. Show one current objective, not a full-screen wall of instructions. Give the player a clear path to their first elephant rider.

**Acceptance check:** a first-time tester can finish the first raid without verbal assistance, identify the next unlock, and explain why an upgrade is unavailable.

### 2. Make text readable before adding more panels

**Now:** Army/Build use larger, progressively disclosed information. The UI test measured 12px expanded body and spell-state text; phone and landscape views passed overflow checks. Text enlargement and wider accessibility coverage remain outstanding.

**Impact:** small labels turn familiar controls into guesswork, especially in portrait. Important battlefield information is 6–9px in several rules; price/gate explanations and spell states deserve more space.

**Improvement:** establish a small type scale with body/help text around 12–14px on phone layouts and primary controls around 14px or larger where practical. Shorten labels, move secondary detail into a readable detail sheet, and reduce simultaneous information instead of shrinking it. Keep the current cost and action fully visible. Use a clear swipe cue and selected-unit name above the troop tray.

**Acceptance check:** inspect computed font sizes and screenshots at 320, 390 and short landscape sizes, then test with text enlargement. No cost, gate, ability or retreat control should rely on microscopic captions.

### 3. Separate preparation, scouting and commitment

**Now:** real-layout scouting, readiness briefing, Edit army/Review battle and explicit confirmation are delivered. Preview/cancel/edit spend no army, gems or league attempt; confirmed start uses one attempt. Retreat opens a paused confirmation; cancel resumes and confirm settles once. These flows passed the fresh browser test.

**Impact:** `startRanked()` consumes one of six weekly attacks as soon as the player enters the battle; the baseline UI did not offer a joined review of army, hero, spell readiness and the opponent before that commitment. Retreat also acted immediately at baseline.

**Improvement:** show army occupancy, missing troops, selected/upgrade-unavailable hero, available spells and the exact league-attempt consequence before starting. Add a clear scout phase or explicitly label when an attack becomes committed. Provide a quick path to adjust the army. Protect scarce-attempt retirement with an appropriate contextual confirmation, while avoiding confirmation spam for harmless actions.

**Acceptance check:** opening/canceling preparation changes no army, score or attempt count. One confirmed start consumes exactly one attempt. Reloading does not duplicate or refund a committed ranked attack.

### 4. Reduce repetitive army and wall work

**Now:** save/load one army composition, Clear army, availability filters and Collect all are delivered. Exact recipe restoration and reload persistence passed. Multiple recipes, bulk troop counts, batch wall upgrades and layout undo remain recommendations.

**Impact:** preparing a familiar composition or upgrading a defensive line takes repeated individual actions. Quick Train fills space but does not preserve a player's intended composition.

**Improvement:** save and apply a small number of named army recipes; support refill-last-army, clear army and add/remove multiples. For walls, select same-level connected segments, preview total cost, and upgrade atomically. Add one-step undo for layout moves without undoing paid upgrades.

**Acceptance check:** loading a recipe respects unlocks and capacity and reports substitutions or missing space. A rejected batch wall upgrade spends nothing. Undo restores the exact prior valid placement.

### 5. Make the six roads six different tactical problems

**Now:** not implemented in this pass. New scouting reveals the existing layouts; it does not make them more varied.

**Impact:** current region names promise a wider world than the shared base layout delivers. Repetition appears before the roster's special roles have time to matter.

**Improvement:** retain six campaigns but author distinct layouts: exposed river outpost, narrow mountain approach, separated desert storages, multiple city compartments, overlapping hill defenses and a citadel with a deliberate final objective. Make each introduce or reward one learned tactic. Do not add arbitrary stat multipliers as the main source of difficulty.

**Acceptance check:** each encounter has a different recognizable layout and at least two viable army approaches. Record win rate, star distribution and completion time across multiple compositions and deployment patterns. Automated victory alone does not establish good balance.

### 6. Give combat a readable physical rhythm

**Now:** prospective spell previews and renderer reduced motion are delivered and tested. Core animation, weapon sound, terrain and impact systems are unchanged.

**Impact:** root bobbing, generic projectiles and short beeps communicate that numbers are changing but not the identity or weight of a fight. The elephant should feel heavy and the archer's release should align with its projectile.

**Improvement:** start with guard, archer, elephant and hero idle/walk/attack/hit/death actions; synchronize attack events to those actions without making damage frame-dependent. Add distinctive bow, stone, cannon, elephant and ability sounds. Build prospective spell-radius previews and clearly distinguish frozen, raged and healed states. Cap and pool effects only where profiling shows a need.

**Acceptance check:** a muted screenshot explains targets/status; audio alone differentiates major weapons; animation changes do not change battle outcomes at different frame rates. Reduced-motion mode removes nonessential motion in the renderer as well as CSS.

### 7. Add strategic systems deliberately

**Now:** not implemented in this pass. Equipment, new defense archetypes and defending heroes remain absent.

**Impact:** equipment, defending heroes and richer defense roles are absent, so many upgrades increase numbers without creating new choices.

**Improvement:** introduce a small, complete equipment system: two slots per hero, a few items with genuinely different effects and clear ownership/equip/upgrade flows. Add one anti-air and one area-control defense before expanding the roster further. Give practice a result breakdown showing which defense caused damage and where the breach occurred.

**Acceptance check:** at least two hero loadouts change successful tactics; equipment effects are proven by simulation tests and visibly communicated. New defenses create a counterplay decision, not only higher damage.

### 8. Treat online play as a product milestone

**Now:** not implemented in this pass. League preparation is safer, but opponents and scores remain local AI.

**Impact:** Royal League offers a useful local goal but cannot supply the unpredictability, fairness or social retention of player competition. Local balances and the device clock are editable; that is acceptable for an offline game but unsuitable as competitive authority.

**Improvement:** first make local combat and replay deterministic and reproducible. Only then add accounts, authoritative resources/timers, validated battle inputs, defensive snapshots, matchmaking and leaderboards. Clans, donations and wars require moderation, recovery and operational support as well as screens. A clan interface with no working service would be a regression in trust.

**Acceptance check:** two real accounts on different devices can attack a saved opposing layout, obtain server-validated results, recover sessions and see consistent scores. Test abuse and reconciliation before describing the mode as PvP.

## Prioritized work and release gates

| Priority | Work | Why this order | Evidence required before calling it done |
| --- | --- | --- | --- |
| **Delivered — usability pass** | Readable Army/Build, accurate wall/Stepwell copy, brought-troop tray, visible guide and readiness/scout review | Removes avoidable confusion without changing content scope | Fresh browser flows passed; device/text-enlargement breadth still needs expansion |
| **P1 — first-session quality** | Complete guided opening; next-objective prompt is delivered | Establishes whether the game is understandable without developer help | Unassisted first-session test; tutorial skip/reload behavior |
| **Part delivered / P1 remaining** | One army recipe and Clear delivered; refill, multiple recipes, multi-count controls and batch wall upgrade remain | Removes repeated-action friction | Existing recipe/atomic validation passed; extend checks for each remaining feature |
| **P2 — strategy and content** | Six distinct campaign layouts, balance matrix, new defense roles | Makes the existing roster worth learning | Multiple compositions and deployment plans; failure and recovery cases; recorded balance results |
| **P2 — presentation** | Core character animation, weapon-specific audio, terrain integration, visible construction/tier progression | Raises perceived quality where the player actually looks | Side-by-side captures against art targets plus combat frame-time measurement |
| **P2 — depth** | Hero equipment, defensive hero behavior, replay/learning tools | Creates long-term strategic choices | Persisted equipment state and replay equivalence tests; clear effect visualization |
| **P3 — network product** | Accounts, authoritative economy, PvP, clans and wars | Depends on trustworthy combat and a supportable service | Multi-device integration, abuse/recovery tests and monitored deployment |

P1 indicates high user-impact work, not a claim of a security emergency. No new critical security failure was established by this document-only review.

## Verification that would justify higher scores

- **Usability:** observe several first-time players, including phone users, instead of relying only on developer familiarity. Record time to first upgrade and first raid, abandoned actions and misunderstood labels.
- **Gameplay:** benchmark different compositions against every encounter. A scripted full-army win proves reachability, not balanced strategy or fun.
- **Performance:** test maximum supported building count, full camp armies, simultaneous area spells and a long session. Report median and p95/p99 frame time, input responsiveness, memory and thermal/battery behavior on named devices.
- **Accessibility:** test keyboard flow through the actual village, reduced motion in the renderer, readable text enlargement and non-color selected/disabled indicators. A 44px rectangle is necessary but not sufficient.
- **Persistence:** retain the existing recovery checks and add any new recipe, tutorial and equipment data to export/import migration tests.
- **Visual quality:** compare gameplay-sized crops, not just 4K asset portraits. A beautiful master render is not proof that a tiny in-game silhouette reads or that the village feels alive.

## Changes delivered and verified during this audit

The main task and specialist agents supplied the following evidence. This report author inspected updated code and screenshots; the live test execution is attributed to those agents.

| Delivered change | Fresh verification | Limit of the result |
| --- | --- | --- |
| Army/Build redesign with filters and progressive details | Three Ready and seven Locked troops; Defense category contains three items; first troop controls reachable at 320/390px; all three starter rows above fold in 320×740 UI pass | A larger roster still needs scrolling; this is not new gameplay content |
| Readable mobile information and proper panel sizing | Expanded descriptions and spell states measured at 12px; desktop briefing fits; 840×390 landscape panel scrolls; zero page overflow at tested sizes | No general accessibility-conformance or physical-device claim |
| Saved army recipe, clear and exact load | Browser saved composition, cleared it, restored exact counts, reloaded and confirmed recipe availability; rule checks cover invalid/atomic application | One local recipe, not a full named recipe library or cloud sync |
| Next objective, visible guide and bulk collection | Objective opens Army; Collect all exercised; storage popover checked by UI agent | Not a guided tutorial or an economy balance study |
| Real-layout scouting and joined readiness | SVG preview derives from the actual encounter; cancel and Edit army/Review battle preserve army, gems and attempts | Same underlying campaign layouts and AI |
| Deliberate ranked commitment | Confirmation consumes exactly one weekly attack; retreat does not duplicate it | No new PvP, ranking or opponent simulation |
| Recoverable retreat | Prompt pauses battle simulation; Keep fighting resumes; confirmed retreat settles | Does not provide battle replay or rewind |
| Modal input protection | Wheel over canvas behind modal leaves camera unchanged; disabling input mid-gesture was tested safely | Keyboard-only world interaction remains incomplete |
| Prospective spell preview and reduced motion | Renderer agent verified stable preview geometry and live preference changes; decorative motion stops while combat continues | Does not add higher-fidelity animation; no FPS gain is claimed |
| Regression checks | Main task reported `npm test` and `tools/playtest-ux.js` PASS, zero page errors at 1440×1000, 390×844 and 320×844 | Not a substitute for representative hardware or player studies |

**Not delivered by this pass:** complete onboarding, equipment, clans/PvP, new campaign layouts, richer defenses, new character animation, layered audio, batch wall upgrades, layout undo, or additional progression tiers.

> **Follow-up delivered after this audit (7 September 2026).** Five of the gaps above were closed in a later pass and are documented in [README.md](README.md) and [RULES.md](RULES.md): six authored campaign layouts replacing the shared template; an eight-step guided start; hero equipment with an ore economy; a synthesised layered audio engine plus debris, oriented projectiles, impact effects, structure flinch and camera shake; and asynchronous online play against other real players' published villages. New regression suites `verify-layouts.mjs`, `verify-progression.mjs` and `verify-online.mjs` cover them. Still not delivered: clans, live synchronous PvP, server-verified battles, batch wall upgrades, layout undo, additional troop or hero tiers, and new character animation clips — combat feel improved through effects and audio, not through new rigged animation. Existing loading/context-recovery fixes remain prior work, not new credit.

## Evidence index

Source references are relative to this game folder so they remain useful in a local checkout. Line numbers can move as fixes are applied; function names are the stable anchors.

| Evidence | What it establishes |
| --- | --- |
| `src/rules.js`: `newGame`, `CATALOG`, `UNITS`, `RAIDS` | Starting complexity, three-tier ceiling, roster, economy and campaign breadth |
| `src/rules.js`: `enemyBuildings`, `beginBattle`, `startRanked`, `rankedEntries` | Shared encounter template, immediate battle start, league attempt consumption and generated AI standings |
| `src/rules.js`: `placeWallLine`, `upgradeBuilding`, `researchInfo`, `heroInfo`, `castSpell` | Atomic walls, single-building upgrades, unlock checks, hero limits and actual spell mechanics |
| `src/ui.js`: `panel`, `systemPanel`, `showResult` | Current army/build/league/guide flows, contextual cost panels and result breakdown |
| `src/main.js`: `actions`, `enterBattle`, `sound`, `frame` | UI action integration, missing preparation phase, oscillator audio and timing |
| `src/view.js`: `syncBuildings`, `updateBattle`, `render` | Tier model selection, root motion, reused animation clip, rendered effects and ongoing non-CSS motion |
| `src/style.css`: phone media queries and reduced-motion rule | Small text declarations, responsive layout and CSS-only motion reduction |
| `src/storage.js`: `decodeSave`, `loadSave`, `storeSave` | Validation, fallback backup, local save scope |
| `output/playwright/final-release-home.png` | Retained 1440×1000 home appearance |
| `output/playwright/final-release-battle.png` | Retained 1440×1000 combat appearance |
| `output/playwright/final-release-battle-320.png` | Retained 320×844 portrait combat appearance; small labels and restricted playfield |
| `output/VERIFICATION-FINAL.md` | Prior test scope, device-specific performance numbers and explicit product limits |
| `tools/playtest-ux.js` | Fresh regression flow: objective, modal lock, filters, recipe/clear/persistence, collection, scout cancellation/edit, one ranked attempt and retreat pause/resume |
| `output/playwright/ux-before-army-320.png` → `ux-after-army-320.png` | Direct phone comparison: baseline toolbar displaces troop controls; current view exposes three starter troop rows |
| `output/playwright/ux-before-army-1440.png` → `ux-after-army-1440.png` | Desktop army hierarchy and spacing comparison |
| `output/playwright/ux-before-build-320.png` → `ux-after-build-320.png` | Phone build catalog/categories comparison |
| `output/playwright/ux-after-briefing-1440.png`, `ux-after-briefing-390.png`, `ux-after-briefing-320.png` | Actual-layout scouting and readiness at desktop/phone sizes |
| `output/playwright/ux-before-battle-320.png` → `ux-after-battle-320.png` | Readable spell states and brought-troop tray; different battle states, not an art-fidelity comparison |
| `output/playwright/ux-after-army-landscape.png` | Short landscape panel behavior |
| `output/playwright/ux-after-storage-320.png`, `ux-after-retreat-320.png` | Storage detail and recoverable retreat surfaces |

## Official reference checks

- **Army preparation and saved compositions:** training waits were removed and Army Recipes added in March 2025. The June Cookbook update added suggested armies and reordering of troop/spell lineups. These are concrete usability benchmarks for our army workflow, not a reason to restore old training queues. [March release](https://supercell.com/en/games/clashofclans/blog/release-notes/welcome-to-clash-anytime-update/), [Cookbook and lineup controls](https://supercell.com/en/games/clashofclans/blog/release-notes/welcome-to-lets-get-crafty-update/).
- **Ranked:** current rules describe limited tournament attacks, attack/defense standings, league-dependent promotion, separate saved armies and defensive snapshots. Our simple local score table deliberately covers only part of that experience. [Ranked Leagues](https://support.supercell.com/clash-of-clans/en/articles/ranked-leagues-4.html).
- **Heroes and equipment:** heroes are permanent and the Hero Hall manages active slots; equipment has two slots and a separate Ore-based progression. These support distinct scores for hero ownership and equipment depth. [Heroes](https://support.supercell.com/clash-of-clans/en/articles/about-heroes-pets-9.html), [Equipment](https://support.supercell.com/clash-of-clans/en/articles/hero-equipment-ore-5.html).
- **Practice, social and replay:** official friendly challenges allow scouting and replay; clan wars add cooperation, preparation and shared results. Our defense practice is useful but does not provide those network features. [Friendly Challenges](https://support.supercell.com/clash-of-clans/en/articles/friendly-challenges-3.html), [Clan Wars](https://support.supercell.com/clash-of-clans/en/articles/about-clan-wars-2.html).
- **Latest relevant UI changes:** the 30 August 2026 release describes a clearer battle-result layout and loot/bonus breakdown, plus Wall Rings no longer needing a free builder. This is a Wall Ring exception, not evidence that all ordinary wall upgrades became builder-free. [August 2026 update](https://supercell.com/en/games/clashofclans/blog/release-notes/august-update-3/).
- **Cross-device continuity:** Supercell's support documents linking progress to Supercell ID and loading it on a supported device. Our export/import is a manual local alternative, not equivalent account continuity. [Account transfer guidance](https://support.supercell.com/clash-of-clans/en/articles/ending-support-for-amazon-and-older-android-apple-devices.html).

The right next goal is a consistently understandable and enjoyable local game: clear decisions, varied battles, responsive controls and convincing feedback. Matching the reference's network and live-service breadth is a later, substantially larger milestone.
