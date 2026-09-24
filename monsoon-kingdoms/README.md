# Crown of Bharat

An original Indian-themed 3D village strategy game: build a Taj Mahal-inspired capital, improve your economy, research your army, lead permanent heroes, and attack defended bases. Three.js runtime with editable Blender assets.

## Play

For the self-contained package, unzip `release/monsoon-kingdoms.zip` and double-click `Start.command` (Python3 required), or run `python3 server.py` inside that package. A release started on its default port is available at **http://127.0.0.1:5192/** while that server is running.

For a phone on the same Wi-Fi, run `python3 server.py --lan` inside the release folder and open the printed phone URL. Keep the computer and server running. Use `--port 5193` if the default port is occupied. LAN mode is optional; the default launcher stays bound to this computer.

For development, from this directory run `npm start`, then open **http://localhost:5191/monsoon-kingdoms/**. The local server uses the existing Three.js installation in the parent directory. The account gate requires configured Google authentication and Firestore access; see the [root setup guide](../README.md).

**Mobile play is landscape-only.** Rotate a phone or tablet sideways to play; portrait orientation shows a rotation guide. Desktop play uses the available window.

Drag to pan, scroll/pinch or use the camera buttons to zoom, and rotate in quarter-turns. Select a structure for Upgrade, Collect, its related menu or Move. The capital controls level gates. The upgrade action, cost, time and builder availability are pinned above the scrolling details. Stats & requirements and Appearance tabs keep progression information available; the latter contains the fifteen-level gallery. Shared Shop / Army / Heroes / Battle / Kingdom navigation and contextual Back buttons use one landscape interface stylesheet. Start with two builders; earned gems can buy a third or fourth. Finishing work with gems shows a price confirmation and charges once.

**Build:** fifteen building types, levels 1–15 each, with distinct architectural geometry at every tier. The building gallery previews all fifteen appearances before spending resources. For a rampart line, choose Rampart, tap its first and second endpoint, then confirm the cost. The second tap locks the preview. Invalid lines never charge. Wall construction/upgrades are instant but need a free builder. Arrow keys can adjust placement; Enter confirms.

**Army:** add/remove troops instantly for free within camp space, capped at 240 total spaces for mobile performance. Camps retain 24/48/72 spaces at levels 1/2/3, then add two per level through 96 at level 15. Once the total cap is reached, the upgrade panel explicitly labels further camp upgrades as durability-only. Quick Train fills available housing with a balanced unlocked composition. Higher Warrior Akhara levels unlock cavalry, Elephant Riders, healers, Stone Bowlers, Tunnel Miners, Himalayan Yetis and Garuda Riders. Bowlers deal splash damage, miners tunnel through walls, yetis absorb heavy damage, and Garuda fly over structures; watchtowers can hit them while cannons cannot. Troop research and heroes remain capped at level 3. The Royal Workshop researches permanent troop levels; improved HP, damage and healing are used by combat.

**Guided start:** new players receive only a level-one Taj Mahal, Rice Fields and Warrior Akhara, with six Talwar Guards and four Bamboo Archers. Starting supplies are 850 coin, 650 grain, 700 wood and 180 iron. A ten-step guide introduces collection, a Teak Yard, Spice Bazaar and Iron Quarry, then army preparation, the first raid, a Watchtower, Hall of Heroes and the first capital upgrade. The settlement has 24 troop spaces before building a camp; free recruitment lets a depleted army recover. Heroes and research require their buildings. Saved kingdoms keep their existing buildings, armies and resources. Skip guide dismisses it, and Settings → Replay the guided start brings it back. Existing saves from before the guide are treated as experienced players.

**Village camera:** landscape views start closer and center on the occupied village. Zoom-out and pan limits keep the camera near the territory instead of revealing the outer ground plane. Drag to reach expansion plots; Center village restores the closer view. Battles retain their wider deployment overview.

**Heroes:** Veer the Gatekeeper is a permanent melee commander with Battle Cry (self-heal and eight seconds of increased damage). Hall level 2 unlocks Captain Tara, whose Arrowstorm strikes nearby structures. Hall levels 3/4/5/6 unlock Nila (Twin Arc ricochets), Ayaan (Sky Mark amplifies damage against one defense), Ira (shared Monsoon Canopy shield), and Kabir (two disposable shield decoys). The six-choice roster keeps one champion’s selection/upgrade actions in focus. Choose one champion for each attack; deploy from the outer band, then activate the ability using the same hero card. Heroes remain owned after defeat, retreat or refresh. Upgrading heroes uses a builder and temporarily makes them unavailable.

**Hero equipment:** winning battles earns Ancient Ore, the only source of it — practice and defeats award none. The Hall of Heroes forge crafts fourteen original pieces: three each for Veer/Tara and two each for Nila/Ayaan/Ira/Kabir, each improvable to level 5. Veer's Sunsteel Talwar, Bulwark of Surajgarh and Campaign War Drum raise damage, health and Battle Cry; Tara's Kalinga Longbow, Monsoon Quiver and Hunting Hawk raise damage and range, health, and Arrowstorm's reach and target count. Equipment changes the ability itself, not only the stat line. Each hero has two slots; the first is open from Hall level 1, the second from Hall level 3. Forging and upgrading are instant, cost only ore and never occupy a builder. A newly forged piece equips itself into a free slot.

**Attack:** Campaign has six roads, each with its own authored base rather than one template with extra pieces. Riverbend is an open river station with no ramparts; Teak Pass is a three-sided pen open to the north; the Salt Road is a closed desert compound with staggered gates and its stores left outside; Lotus Gate is a sealed palace with four corner defenses and outer wings on the southern approach; the Amber Signal is a hill fort inside overlapping tower fire; and the Narmada citadel is a double ring with offset gates and a garrison. Defenses grow stronger along the road. Stars reward destroying the capital, reaching50% destruction and reaching100%. Ground troops navigate around intact buildings and breach walls; ranged units attack over them. Defensive towers and cannons target attackers. A Stepwell unlocks one charge each of Monsoon healing, Lightning, Freeze and Rage. Select a targeted spell, then tap the battlefield. Lightning damages structures in its radius, Freeze stops defenses for six seconds, and Rage strengthens troops in its area for eight seconds. Raids last up to three minutes. Committed regular troops are consumed, while unused reserves return; preparing replacements is free and instant.

**Royal League:** explicitly local AI competition, with six attacks each week and original Copper→Bronze→Silver→Gold→Peacock→Maharaja tiers. Score is stars×100 plus destruction percentage. The top three participants promote and earn30gems; the middle four hold and earn15; the bottom three demote and earn5. Weeks start Monday00:00UTC. Entering a raid uses an attack immediately. Scores and opponents are local; this is not online matchmaking or a global leaderboard.

**Online play:** Attack → Online plays against other real players. Joining registers this device and publishes your village so others can attack the layout you actually built; Find a real opponent returns another player's published village, matched near your trophy count. You scout it, attack it, and trophies move between both kingdoms on an Elo-style curve — three stars against an equal kingdom moves 16. Attacks on your village appear in your defense log with who attacked, their stars and the trophies you lost, and there is a global standings table.

Joining shares only your kingdom name, your Taj level and your village layout. No account, password or email is involved, no save data is uploaded, and this device is identified by a key generated on it. Leave online play forgets that key and stops your village appearing.

**Friends and invites:** every online kingdom has a six-character invite code.
- **Joining.** Share it as a link (`?invite=CODE`), or type it into the Online tab. The first code a new player redeems makes the two of you friends. The new player gets 60 gems, 20 ore, 1,000 coin and 800 grain, and the inviter gets 40 gems and 10 ore to claim. Storage limits apply to both.
- **Friend list.** Shows who is online now (from a 45-second heartbeat), their trophies and Taj level.
- **Challenges.** A friendly challenge attacks a friend's real published base under practice rules, so every troop comes home and nothing is at stake.
- **Online now.** The tab also lists everyone currently online.
- **Server checks.** The server refuses your own code, second redemptions and codes that don't exist. It only shows a friend's base to that player's friends.

Be aware of the honest limit: **battles are simulated on the attacking device, so results are trusted rather than verified.** The server clamps stars to 0–3, destruction to 0–100, derives trophy movement itself, enforces a 15-second gap and a daily cap between attacks, and refuses any request without the device's key — but a determined player could still report a battle they did not really win. Server-authoritative combat would need a replay-verifying backend, which this build does not have. Database tables are unreachable from the browser; every read and write goes through a checked Postgres function.

**Test defenses:** available in Army. Attack your actual completed village layout in a friendly challenge. Your buildings stay intact, all troops return even after refresh, and there are no rewards or ranked changes. This is a direct way to test whether your walls and towers protect the capital.

**Gems:** start with150; earn25for each first campaign victory,10for the first completed building upgrade,15for the first troop research, weekly league rewards, and slow Gem Garden production. There is no real-money payment system.

Sound is synthesised at runtime from oscillators, filtered noise and Karplus-Strong plucked strings, so no audio files are downloaded. Sound is on by default (browsers still wait for the first tap); Kingdom settings has separate Sound and Raga score switches, master and music volume, and a quick mute button sits with the camera controls at home and in battle. The **adaptive score** (`src/music.js`) is generative rather than looped: home plays Raga Bhupali in keherwa tala on tanpura, bansuri, santoor, tabla and manjira; battle plays Raga Kirwani over a dhol chaal with sitar ostinato, nagara and shehnai, and gains layers as destruction and the clock rise. Victory and defeat have their own stingers. The home valley has an ambience bed (river, breeze, koel, sparrows, a distant peacock and temple bells). Combat is heard positionally through a shared courtyard reverb: melee thuds and sword clashes, arrows, chakram whirr, falcon cry, water bolts, cannon, collapses, healing and each spell have their own cue, and elephants, cavalry, yetis and Garuda riders each announce themselves on deployment. Stars chime, the last ten seconds tick, finished construction plays a fanfare, and background tabs fall silent. Cues are rate-limited and voice-capped so a large battle stays readable. Structures flinch when hit and sink into rubble when destroyed, shots are oriented along their flight path, hits throw sparks and a ground ring, and heavy blows shake the camera. Reduced-motion preferences suppress the shake, flinching and decorative particles.

Progress saves in this browser at this origin. Settings provides JSON export/import, persistent sound and Low/Balanced/Ultra graphics. An invalid primary save recovers from the previous valid backup; importing downloads your previous kingdom before replacement. The field guide explains controls and progression. Production accrues for up to eight hours offline. Existing saves migrate without replacing the player's layout: older villages can construct the Workshop, Hero Hall and Gem Garden from Build.

**Presentation (`src/atmosphere.js`, `src/postfx.js`):** Balanced and Ultra render through a post-processing chain—MSAA HDR target, soft bloom, a warm colour grade with vignette, and a flash channel for lightning and big collapses; Low keeps direct rendering. Image-based room lighting adds reflections to marble and brass. The river is an animated shader with flow streaks, glints and foam; forests and meadow grass sway in the wind; drifting cloud shade crosses the fields; wildflowers, egrets and butterflies populate the valley. Pooled GPU particles (two draw calls) dress every battle event: destruction dust and embers followed by lingering ruin smoke, cannon smoke, frost and rage bursts, monsoon rain, spawn dust, footfalls under elephants and yetis, and a falling-warrior puff. Troops are drawn larger with a fresnel rim light and a saffron ground ring; heroes get a gold rim, a column of light on deployment and a turning rangoli beneath them. Melee troops lunge into blows and archers recoil. Finished construction raises a column of light and marigold petals, and a victory showers the field with petals and fireworks. `tools/verify-audio-atmosphere.mjs` covers raga pitch maps, phrase resolution, particle pool bounds and shader injection.

**Characters (`src/humans.js`):** troops and heroes are realistic, sculpted human figures, not toy models.
- **Bodies and motion.** Two CC0 Quaternius base bodies (male and female) with 2K skin textures and a 65-bone skeleton, driven by 34 motion-captured clips. Clips cross-fade by role and speed, and every attack clip is timed so the blow lands when the rules' attack clock fires.
- **Dressing.** Each character is dressed when the game loads:
  - Garments are painted into the body texture from its skin weights, with block-print cotton and gold zari seams.
  - Pleated kurtas and dhotis, turbans, helmets, veils, hair and beards are fitted to the sculpted skull.
  - Spears, talwars, shields, bows, mallets, staffs, chakrams, a parasol and a falcon are held in the hand bones.
  - Garuda gets feathered wings and the yeti gets shell fur.
- **Mounts.** Riders sit on the seat bones of an animated horse and an armoured war elephant from 0 A.D. (CC BY-SA 3.0). The elephant carries a mahout and an archer in the howdah.
- **Performance.** Each outfit merges into three skinned draws. Low quality uses the lighter procedural rigs in `src/characters.js`, which are also the fallback if the character files fail to load.
- **Credits.** Licences are listed in `assets/characters/CREDITS.md`.

**Physics (`src/physics.js`):** a visual-only rigid-body solver; the battle rules never read it.
- Falling structures throw real rubble, and spent cannonballs skip across the ground.
- Fallen warriors slide away from the blow while their death clip plays.
- Blasts shove troops, and new buildings pop up on springs.
- Heroes wear verlet cloth capes.

**Royal Court:** ten Royal Decrees in three tiers (gems and Ancient Ore) track career stats recorded by the rules — upgrades, collection, battles, victories, stars, three-star wins, destruction, deployments, spells, hero abilities and days at court — and a seven-day Daily Durbar ladder rewards consecutive UTC days, resetting on a missed day. Both persist, clamp hostile values and migrate older saves (`tools/verify-decrees.mjs`). The Court button shows a badge whenever something can be claimed.

**Interface:** `src/theme.css` layers a "Royal Jharokha" design over the base stylesheet: gilded parchment panels with jali lattice, and saffron buttons with a physical press and ripples.

`src/hud.css` is the game HUD:
- The kingdom crest has an XP ring showing how many buildings match the Taj level.
- Resource gauges have illustrated coin, grain-sack, log, ingot and gem emblems and coloured fill bars that turn orange when storage is full.
- Next Step is a quest scroll with a wax seal and a go button.
- Collect All is a glowing coin-stack button.
- Army, Heroes and Shop are chunky 3D tiles that press down, and the Army tile has a housing meter.
- The camera controls are glossy orb buttons.
- Messages appear in a ribbon banner.
- Settings use real toggle switches.

`src/ui-fx.js` adds the battle curtain, the star fly-in, resources flying to the treasury, and the victory sequence: an unfurling banner, stars landing one by one with bursts, count-ups, rays and physics confetti.

[docs/AUDIO-VISUAL-RATING.md](docs/AUDIO-VISUAL-RATING.md) rates each pass.

## Research and art

[DESIGN-RESEARCH.md](DESIGN-RESEARCH.md) documents the verified current Clash of Clans systems, official sources, screenshot UI analysis and our adaptations. The reference game's modern free/instant army preparation is deliberately distinguished from upgrade/research timers. This is a fictional Indian-inspired setting, not a historical reconstruction.

There are **247 runtime GLB assets** with matching transparent portraits (512×512 for existing assets; 768×768 for the four new heroes): 225 building models (15 families × 15 levels), ten troops, six heroes and six environment props. Level-1 buildings retain their base paths; levels 2–15 live at `assets/buildings/levels/<type>/<level>.glb` with matching PNGs. Higher tiers load on demand for the visible village or battle instead of downloading all 225 buildings at startup. The Taj capital has a marble dome, four minarets, arched façades and dark inlay. The barracks, watchtower and bazaar are inspired by Red Fort, Qutb Minar and Hawa Mahal, with modeled arches, fluted storeys, balconies and lattice windows. Elephant Riders have a visible mahout and archer. The UI uses compact identity/rank, a resource stack, construction/research status, an Attack button, contextual actions and a combat troop tray.

Editable sources live in `assets/blender/`: buildings.blend, units.blend, environment.blend, taj-and-civic.blend, heroes.blend, wall-upgrades.blend, landmarks.blend, reinforcements.blend, levels-civic.blend, levels-economy.blend and levels-landmarks.blend. Full generation order:

1. `tools/build-buildings.py`, then `tools/build-taj.py`, then `tools/build-wall-upgrades.py`, then `tools/build-landmarks.py`.
2. `tools/build-units.py`, then `tools/build-heroes.py`, then `tools/build-reinforcements.py`, then `tools/build-new-heroes.py` (four additional heroes and native 4K portrait masters).
3. `tools/build-levels-civic.py`, `tools/build-levels-economy.py` and `tools/build-levels-landmarks.py` produce the 210 higher-tier building models and portraits.

Run these with Blender in background mode. Later scripts replace older capital/elephant exports with the current variants. The four reinforcements have actual two-second joint animation clips played by Three.js mixers. At load time, eleven grounded troop/hero models receive shared GPU skin geometry with independent hip, knee and foot bones. Distance-driven gait and foot planting replace whole-body bouncing; visual smoothing bridges the 30 Hz simulation to the render loop. Moving units use dynamic contact shadows. Garuda keeps its authored flight animation. The four new heroes ship native seven-bone skins and baked Idle/Walk clips; the same distance-driven solver takes control of their legs in play. Their Blender source is `assets/blender/new-heroes.blend`. Lighting uses PBR materials, soft shadows, ACES tone mapping, instanced forests and capped pixel ratio.

The authoring workspace retains native **4096×4096** transparent Blender master portraits for all **247 active assets**. The building-level manifest covers225 buildings:210 new renders plus15 preserved level-one masters. Existing masters cover ten troops, six heroes and six environment props. The complete building series is in `assets/masters/building-levels/`, with source/output SHA256, native-resolution, transparency and framing verification. Its225-entry contact sheet shows every tier. Four tileable materials—marble, sandstone, cloth and grass—each have4096basecolor/normal/roughness masters plus1024runtime derivatives in `assets/textures/`. New hero masters live in `assets/masters/heroes/` and are recorded with hashes in `assets/heroes/manifest.json`. The game loads512/768portrait thumbnails and1024maps for phone performance. “4K” describes raster resolution; models are separately validated geometry. Verify the building masters with `python3 tools/build-level-masters.py --verify`; the original asset/material batch uses `python3 tools/build-masters.py --verify`. Masters are authored renders/procedural materials, not image-generation outputs.

Build a standalone package with `npm run build`; verify with `node tools/build-release.mjs --verify`. Source Blender files and 4K masters remain outside the optimized game package. The five obsolete root-level fort_2, fort_3, wall_2, wall_3 and upgrade_ornament models are excluded; the complete fifteen-tier series replaces them.

The [September interface rework](docs/UI-REWORK.md) records before/after screens, mobile interaction checks, grounded animation validation and remaining device-testing limits.

## Validation and scope

`npm test` runs rule/storage assertions, including all 210 building upgrades and levels 1–15 save imports, plus native GLTFLoader checks for all 225 building variants, troops and heroes. `npm run test:fast` runs the logic suites without the asset checks. `tools/verify-layouts.mjs` proves the six campaign bases are distinct, in bounds, non-overlapping, deployable and winnable with rising clear times; `tools/verify-progression.mjs` walks all ten onboarding steps and covers equipment gates, costs, ability effects, the ore economy and save migration; `tools/verify-online.mjs` asserts a published layout leaks nothing but type/x/z/level and rejects sixteen kinds of malformed or hostile downloaded base. `npm run test:levels` specifically checks every building tier: unique world-space geometry, adjacent-tier differences, footprints, floor alignment, normals, PBR materials, mesh/triangle budgets and exact 512×512 portraits. Its report is `output/verification-levels.json`. `RULES.md` documents the complete state/API and transactional rules. `output/VERIFICATION-FINAL.md` records current browser evidence and performance; earlier verification reports remain for history. Screenshots are in `output/playwright/`.

`tools/playtest-landscape.js` is the current Playwright CLI run-code function for a disposable named browser session. It resets the test browser's kingdom; do not run it against a save you want to keep. Run it from the parent repository directory while the server is active.

This delivery has local campaign, practice and AI league play, plus asynchronous online play against other real players' published villages, and hero equipment. It does not include a clan service, live synchronous PvP, verified or replayed battles, server-validated battle outcomes, paid gems or a Unity build. Buildings have fifteen progression tiers; troop research and heroes retain three tiers; it does not reproduce every live-service feature or level in Clash of Clans.

## UX refresh and audit

[UX-AUDIT.md](UX-AUDIT.md) compares 25 product areas with Clash of Clans, separates baseline/current ratings, and records remaining gaps. These are editorial scores, not player-survey results.

Build groups Economy, Defense and Army structures and shows resource shortfalls before placement. Army opens on available troops; tap a portrait for details or Add 5. Tools contains Save army, Load saved army, Clear army, Research and Test defenses. The saved composition is a device preference; loading it replaces the current army only if unlocks and housing allow the entire composition.

All battle modes open a briefing with the actual enemy layout, your army, hero and spells. Previewing or canceling spends nothing. Edit army and Review battle return to that briefing. Only Attack now or Start practice commits the battle. Retreat opens a confirmation and pauses this local simulation until you decide.

Home offers the next objective and bulk resource collection. Resource buttons reveal storage information. Menus block world/camera input; spell aiming previews its radius. Reduced-motion preferences suppress decorative renderer motion while preserving combat simulation.

`tools/playtest-ux.js` exercises the new flows in a disposable Playwright CLI browser. It resets that test browser's local kingdom. Earlier playtest scripts describe older UI flows and need the new briefing confirmation when replayed.
