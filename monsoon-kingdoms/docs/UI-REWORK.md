# Crown of Bharat interface rework · 15 September 2026

The landscape game now uses one interface system: emerald frames, warm ivory content, gold primary actions, consistent typography and spacing, shared menu navigation, and contextual Back controls. The three previous game stylesheets have been replaced by `src/interface.css`; account screens retain their separate stylesheet.

## Six-screen review

These ratings describe the tested flow against this request, not parity with the full Clash of Clans product. Before screens were captured in an isolated developed village at 844×390. After screens use the same renderer and either a developed or starter test village; account/network behavior was mocked.

| Screen | Before finding | After / health |
|---|---|---|
| Village | Scattered control sizes and alignment competed with the map. | **Improved:** aligned safe-area groups, clear Attack and Army/Heroes/Shop dock, matching resource controls. [View](ui-rework/village.png) |
| Upgrade | Large preview pushed Upgrade below the fold. | **Pass:** action, cost, time, builder availability and blocking reason are pinned directly below the header. Stats and Appearance are separate keyboard-accessible tabs. [Before](ui-rework/upgrade-before.png) · [After](ui-rework/upgrade-after.png) |
| Shop | Horizontal cards were cut off; navigation differed from other menus. | **Pass:** shared navigation and categories, two or three compact card columns on phones, first-row Build controls visible. [View](ui-rework/shop.png) |
| Army | Troop portraits and controls were too small; preparation tools lacked hierarchy. | **Pass:** larger portrait crops, capacity and Quick fill together, 44px +/- controls, optional recipes/research tools. [568px view](ui-rework/army-568.png) |
| Heroes | Introduction, preview and detailed stats preceded every action. | **Pass:** compact Hall status, hero costs/actions first, persistent expandable Stats & equipment. [View](ui-rework/heroes.png) |
| Battle | A separate navigation style and crowded combat controls. | **Improved:** shared Campaign/League/Online navigation; coordinated combat HUD/deck and a visible return action on results. Campaign descriptions and briefing details remain scrollable. [Battle](ui-rework/battle.png) · [Results](ui-rework/result-568.png) |

## Movement, walls and world icons

- Building labels project fixed map anchors through an unshaken camera. Their screen transform contains translation only, so map rotation, building flinches and camera shake cannot rotate or wobble the icons. Collection tokens and health bars face the screen.
- Walls render at 58% of their previous height and 90% of their width/depth across levels and placement previews. Grid footprints, targeting, collision and upgrade rules are unchanged.
- Eleven ground troop/hero models receive hip, knee and foot bones from their existing Blender mesh components at load time. Each actor has independent bones and shared geometry. Distance-driven stance/swing cycles keep soles planted, bridge simulation/render frame rates and settle when stationary. Dynamic contact shadows replace detached static patrol shadows. Garuda retains intentional flight.

## Verified behavior

- Browser layout checks at **568×320, 667×375, 844×390 and 1280×440**. Upgrade stays on screen before and after details scrolling; critical actions and menu controls have at least 44px touch targets.
- Shop, Army, Heroes, Battle and Kingdom panels remain within the viewport without unintended horizontal body overflow. Hero actions fit the initial 568/844 view; expanded details survive render ticks.
- Affordable upgrade charges the displayed costs once and starts its builder timer. Construction, insufficient resources and maximum level 15 all show the correct action/state. Back works through builder/finish and army/research flows; starting or leaving battle clears stale navigation history.
- A real running practice battle accepted eight synthetic **touch** deployments, advanced the troops, supported cancel/confirm retreat, returned to the village and restored the full army. Result return was visible at 568×320.
- Four camera rotations retained upright world-label transforms. The renderer regression inspects actual skinned sole vertices for eleven GLBs, independent skeletons, shared geometry, swing/stance motion, idle settling, frame-rate handoff, Garuda animation, wall sizes and shake-stable labels.
- Packaged release verified 535 files and its complete Three.js dependency closure, including SkeletonUtils. A separate browser smoke loaded that package, signed in with the isolated adapter, confirmed three starting buildings and opened the pinned upgrade screen without JavaScript errors.
- Full `npm test` and `verify-account-store.mjs` passed. The full suite includes all 225 building models, 210 upgrades, campaign/layout/progression, heroes, units, storage, starter behavior and camera boundaries. Browser checks reported no game JavaScript exceptions; test-harness selector/deployment-edge mistakes were corrected separately.

## Repeating the browser checks

From the parent repository directory, start a localhost server and open `/monsoon-kingdoms/` in a **disposable named Playwright browser**. Create `output/playwright/`, then run these files using Playwright CLI `run-code`:

1. `tools/setup-interface-qa.js` installs a session-only Firebase adapter and signs in a test player. It clears only QA-prefixed storage and is restricted to localhost.
2. `tools/playtest-interface.js` creates an isolated developed village and checks layout, upgrades, navigation and icon orientation.
3. `tools/playtest-interface-battle.js` exercises touch deployment and practice return.
4. `tools/playtest-upgrade-states.js` checks busy, maximum and unaffordable states.

All paths above are relative to `monsoon-kingdoms/`. These adapters are outside the runtime package; production still requires Google sign-in. No live player's save was used or reset.

## Design grounding and limits

The hierarchy and touch controls apply [Apple's game interface guidance](https://developer.apple.com/design/human-interface-guidelines/designing-for-games) and [game control guidance](https://developer.apple.com/design/human-interface-guidelines/game-controls). Explicit builder/resource/time feedback follows the upgrade information needs illustrated by [Supercell's builder documentation](https://supercell.com/en/games/clashofclans/blog/news/meet-goblin-builder/). Crown of Bharat retains its own artwork, colors and typefaces.

Tests used desktop Chrome with landscape viewport emulation and a local account adapter. Physical iPhone/Android frame rate, thermal behavior, Safari compatibility and a complete accessibility audit are not established. Ground locomotion targets the game's flat terrain; it is not an uneven-terrain animation system. This release does not change the game's existing online competition or server-verification scope.
