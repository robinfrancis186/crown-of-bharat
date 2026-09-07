# Monsoon Kingdoms — Clash of Clans reference and Indian adaptation

Research checked **7 September 2026**. This is a design reference, not a claim that every feature below is implemented. Current Supercell support and dated release notes take precedence over older guides. Exact prices, level ceilings and live balance should come from current game data rather than being copied into our simulation.

## What makes the reference work

The core is a repeating decision loop: **earn resources → improve the village and army → choose an army composition → scout and attack → spend the rewards**. Defensive layout and offensive composition affect one another. A stronger economy supports progression, but capacity, unlocks and construction choices prevent every decision being equivalent. Social clans add cooperation and competition beyond the individual base. [Official game overview](https://supercell.com/en/games/clashofclans/).

Clash is not simply a set of buildings around a central palace. It gives the player understandable choices: upgrade offense or defense, spend now or save, breach a compartment or circle it, commit the hero now or preserve an ability, farm casually or enter competition. Monsoon Kingdoms should reproduce this clarity and consequence using its own architecture, characters, interface artwork and tuning.

## Verified mechanics and important changes

### Buildings, builders and progression

Buildings and research retain upgrade costs and timers. Builders are a scarce construction resource; the Home Village starts with one hut, additional huts use Gems, and an additional builder is earned through Builder Base progression. Builder capacity therefore creates parallel planning decisions. [Builders and huts](https://support.supercell.com/clash-of-clans/en/articles/builders-4.html), [current upgrade and research boosts](https://support.supercell.com/clash-of-clans/en/articles/gold-pass-3.html).

Town Hall progression unlocks buildings and higher upgrade ceilings. It does **not** mean every existing building must always be fully maxed before moving forward: Supercell explicitly describes a warning for weak offense that recommends upgrades without blocking the Town Hall upgrade. Actual prerequisite buildings and special upgrade gates vary with level. In October 2025 the separate Town Hall weapon upgrade steps at TH12–15 were removed. Do not reproduce those obsolete gates. [Progression warning and research UI](https://supercell.com/en/games/clashofclans/blog/release-notes/october-update-full-patch-notes-2/), [October 2025 release](https://supercell.com/en/games/clashofclans/blog/release-notes/get-ready-for-ranked-update/).

**Adaptation:** the Taj Mahal-inspired capital controls construction limits, unit access and tier ceilings. The upgrade panel must show current → next statistics, cost, duration, free builders, prerequisites and the next unlock. A disabled action must explain its exact missing requirement. Timers should use saved completion timestamps so returning to the village correctly finishes work.

### Troops and research

Army training costs were removed in June 2022. In March 2025 troop, spell and siege-machine training times were also removed, along with hero recovery time. Army capacity and composition remain meaningful; waiting for each troop is no longer the modern Clash loop. [Zero-cost training](https://supercell.com/en/games/clashofclans/blog/news/home-village-changes-2/), [March 2025 release](https://supercell.com/en/games/clashofclans/blog/release-notes/welcome-to-clash-anytime-update/).

Research is distinct from preparing an army: troop, spell and siege-machine upgrades still use resources and Laboratory time. The Laboratory offers upgrade suggestions, and an already-running research job is handled explicitly rather than silently accepting another. [Research boosts](https://support.supercell.com/clash-of-clans/en/articles/gold-pass-3.html), [research UI](https://supercell.com/en/games/clashofclans/blog/release-notes/october-update-full-patch-notes-2/).

**Adaptation:** use instant, free army preparation within camp space; put long-term investment into research and building progression. Show housing space, role, target preference, attack range and level on unit cards. Make elephant riders expensive in *space*, with visibly high durability and slower movement. A durable front line, ranged damage, wall breachers and healers should have complementary jobs. Show locked units with their unlock condition, rather than allowing an unexplained starter roster to contradict the barracks gates.

### Walls and fighting

Walls are layout tools: compartments direct ground attackers and protect valuable defenses. A wall is useful when it changes the route or time to reach a target, not merely when it decorates the base. Troop and defense roles must make that difference visible.

Since February 2025, the wall tool can select additional same-level segments in groups of one or ten for a combined upgrade. Gold or Elixir can be used for walls from TH5. The **30 August 2026** release specifically removed the free-builder requirement for **Wall Rings**; that exception should not be generalized to every kind of wall purchase or upgrade. The inspected official pages did not provide a complete current ordinary-wall formula, so no exact formula is asserted here. [Bulk wall tools](https://supercell.com/en/games/clashofclans/blog/news/get-geared-up-for-the-latest-update--3/), [wall currencies](https://supercell.com/en/games/clashofclans/blog/news/home-village-changes-2/), [latest Wall Ring exception](https://supercell.com/en/games/clashofclans/blog/release-notes/august-update-3/).

Home Village scoring awards one star for 50% destruction, one for destroying the Town Hall and one for 100% destruction. This gives meaningful partial success. [Supercell scoring explanation](https://support.supercell.com/clash-of-clans/en/articles/clan-war-results.html).

**Adaptation:** connected sandstone ramparts, continuous wall placement and clear bulk upgrade costs; no charging for invalid or overlapping segments. Breachers must actually open paths, ranged troops must visibly fire across a wall, and surviving defenses must continue posing a threat. Keep the three-star objectives legible during battle. Show exact destruction, remaining time, available troops and ability state without covering deployment space. Building destruction and sounds should confirm a hit; debris and effects must not hide the fight.

### Heroes, equipment and permanence

Current support lists six Home Village heroes: Barbarian King, Archer Queen, Minion Prince, Grand Warden, Royal Champion and Dragon Duke. The Hero Hall now begins at **TH4**, supports up to **four attacking slots**, and its level controls hero level ceilings. Heroes can be defeated in an attack but are permanent, ready again for the next battle. Defending heroes are assigned through banners. [Current heroes and Hero Hall](https://support.supercell.com/clash-of-clans/en/articles/about-heroes-pets-9.html).

The Blacksmith unlocks at TH8. Each hero can equip two items, allowing abilities to support different strategies. Equipment has its own Ore progression, distinct from hero level. Current Ore sources include Star Bonus, Clan Wars, Hero Journey and special events, with source availability differing by Ore type. [Equipment and Ore](https://support.supercell.com/clash-of-clans/en/articles/hero-equipment-ore-5.html).

**Adaptation:** original fictional Indian heroes with permanent ownership, visible levels and deliberate ability timing. Suggested identities: **Captain Tara**, a mobile archer with a precise volley; **Arjun the Gatekeeper**, a shield-bearing frontline commander; **Meera of the Monsoon**, a support commander. These are fictional characters, not claims about historical people. A hero should feel different from a larger regular troop. Ability buttons require ready/active/spent states and feedback when no valid target exists. An elephant and mahout should be a regular heavy unit; do not consume a purchased hero as if it were disposable infantry.

### Regular battles versus Ranked

October 2025 separated unlimited regular Battles, available from TH2, from Ranked, available from TH7. Regular Battles focus on resources and experimentation without trophy loss. Ranked is limited competition with league progression. [Mode split](https://supercell.com/en/games/clashofclans/blog/release-notes/get-ready-for-ranked-update/).

Current Ranked uses weekly sign-up, attack and defense results, and position within a league group to determine promotion or demotion. Limits vary by tier; early Skeleton and Barbarian tiers allow six attacks per week. The selected defensive base is snapshotted at tournament enrollment, so later layout edits do not retroactively change that week's defenses. Inactivity decay begins after four missed tournament weeks. [Current Ranked rules](https://support.supercell.com/clash-of-clans/en/articles/ranked-leagues-4.html).

Legend now has III, II and I tiers. III and II retain weekly competition; Legend I uses four-week tournaments with eight attacks and defenses each day. It has special trophy-loss rules and local/global leaderboards. A generic “win adds trophies, loss subtracts trophies” model is not an exact description of all current Ranked tiers. [Current Legend structure](https://support.supercell.com/clash-of-clans/en/articles/legend-league-4.html), [Legend trophy calculation](https://support.supercell.com/clash-of-clans/en/articles/legend-league-attacking-defending-3.html).

**Adaptation:** separate **Campaign** from **Royal League — AI opponents**. Use original tier names and badges, a visible rating, match history and understandable reward rules. Always label local opponents as AI. Saved local scores are not a global leaderboard; generated opponent names do not represent real players. Real asynchronous PvP needs account identity, server-authoritative economy and battle validation, matchmaking, defensive snapshots, replay storage and service operations. The local game should not pretend those services exist.

### Gems, rewards and spending

Gems are premium currency, but can also be earned through achievements, clearing obstacles, Gem Boxes, relevant events and the Builder Base Gem Mine. [Free Gem sources](https://support.supercell.com/clash-of-clans/en/articles/how-can-i-get-free-gems-and-resources.html).

Gems can buy additional builder huts. Magic Items can accelerate work, fill resources or complete upgrades; the Trader sells offers using different currencies. Unneeded Magic Items can also yield Gems. These systems make Gems an optional convenience and acquisition currency rather than ordinary battlefield ammunition. [Builders](https://support.supercell.com/clash-of-clans/en/articles/builders-4.html), [Magic Items and Trader](https://support.supercell.com/clash-of-clans/en/articles/magic-items-and-the-trader.html).

**Adaptation:** earn local **gems** from clearly defined achievements and first victories. Spend them on an extra builder or finishing a displayed timer, with the price and remaining balance visible before committing. Charge once and persist immediately. No real-money shop, payment button or fictional purchase receipt. Do not give an unlimited free-gem click button that destroys progression.

## Indian art and world direction

| Reference role | Monsoon Kingdoms interpretation | Visual and mechanical purpose |
| --- | --- | --- |
| Town Hall | Taj Mahal-inspired capital | White marble, central onion dome, four slender minarets, arched entrances and a symmetrical garden platform; recognizable at gameplay zoom; upgraded tiers add material and silhouette detail. |
| Army camp | Royal encampment | Indigo canopies, brass lamps, weapon racks and visible troops; capacity is obvious. |
| Heavy troop | Elephant rider and mahout | Large body, readable decorated howdah, cloth harness and distinct movement; absorbs defensive fire. |
| Archer | Bow guard | Original silhouette, regional textile colors and clear bow pose. |
| Wall breaker | Siege artisan | Tools and powder satchel communicate breach role without needing a tooltip. |
| Research | Royal workshop | Architectural instruments, manuscript desks and weapons; clearly separate from troop preparation. |
| Defensive wall | Sandstone rampart | Connected segments and corners; dark joint lines and tier variation keep compartments readable. |
| Resource economy | Coin, grain, timber and iron | Bazaar, granary, timber yard and foundry retain the established local game economy. |
| Ability support | Monsoon healing | Water, rain and teal effects contrast with warm attack flashes. |

This is a fictional Indian-inspired setting, not a chronological reconstruction or a claim that the real Taj Mahal was a military town hall. The capital's requested architectural reference can coexist with the game's fantasy military function. Use varied architecture deliberately; do not treat every Indian region, language or period as interchangeable decoration.

## UI/UX target from the user's screenshots

These observations are visual analysis of the provided images, not statements about current unseen screens:

- The village owns the center. Identity and rank sit upper-left; resources occupy upper-right; construction status sits at the top; Attack anchors lower-left; Shop anchors lower-right.
- Strong silhouettes, saturated resource icons, dimensional button edges and dark text outlines make controls legible over bright terrain. Active actions are visually distinct from scenery.
- A compact horizontal troop deck belongs at the bottom of combat. Selected cards must show selection, remaining count and unavailable state.
- Building-specific actions appear after selection. Upgrade information belongs in that context rather than a permanent dashboard competing with the village.
- The ranked image demonstrates a readable progression ladder with escalating badges and an unmistakable competitive call to action. Our league screen needs that hierarchy with original badges.

Implementation standard: keyboard focus, labeled controls, touch targets at least 44 CSS pixels, intentional mobile landscape and portrait layouts, no clipping of prices, numeric resource caps, cancelable placement, contrast on every terrain color, restrained animation and reduced-motion support. Use our own licensed fonts and Blender-rendered icons rather than extracting Supercell assets. The August 2026 update also emphasizes a refreshed battle result screen with a clearer loot and bonus breakdown; our result screen should distinguish base loot, bonus, rating change and storage overflow. [August update](https://supercell.com/en/games/clashofclans/blog/release-notes/august-update-3/).

## Source limitations

The user's [Wikipedia page](https://en.wikipedia.org/wiki/Clash_of_Clans) was inspected as orientation, but mixes dates and retains an obsolete TH7 Hero Hall statement. Current official support says TH4, so Wikipedia is not used for that implementation rule. The supplied [Fandom wiki](https://clashofclans.fandom.com/wiki/Clash_of_Clans_Wiki) could not be retrieved by the browser tool; its contents are not claimed to have been read. The research does not claim to audit every late-game unit, event, exact upgrade price or matchmaking formula.
