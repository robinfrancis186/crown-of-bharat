# Crown of Bharat — quality rating

**Reviewed 24 September 2026 across two passes on this branch.**

| | Original | Pass 1 · audio & atmosphere | Pass 2 · physics, characters, UI, court |
| --- | ---: | ---: | ---: |
| **Presentation** (categories 1–12) | 3.8 | 7.2 | **7.6** |
| **Whole game** (gameplay counted double) | 5.0 | 6.9 | **7.3** |

These are editorial ratings, not player-survey results or device benchmarks.

## What each pass added

**Pass 1: audio and atmosphere** (`music.js`, `audio.js`, `atmosphere.js`, `postfx.js`)
- A generative raga score: Bhupali at home and Kirwani in battle, with the battle theme layering up as the fight intensifies.
- About 38 synthesised effects and a home ambience.
- Post-processing: bloom and a colour grade.
- An animated river, wind, cloud shade, meadow and wildlife.
- Particles on every battle event, and celebrations for victories and finished buildings.

**Pass 2: physics, characters, UI and the Royal Court**
- **Physics** (`physics.js`):
  - Rigid bodies with box-corner ground contacts, friction, restitution, sleeping and sinking.
  - Standing buildings act as colliders, and bodies push each other apart.
  - Springs for squash-and-stretch and knockback.
  - Verlet cloth for capes.
- **Physics in battle:**
  - Destroyed buildings break into rigid rubble that tumbles and piles up.
  - Spent cannonballs skip and roll, and arrows stay stuck where they land.
  - Fallen warriors are thrown away from the blow that killed them and tip over.
  - Blasts shove nearby troops, troops drop onto the field and bounce, and buildings pop up when built.
- **Characters** (`characters.js`), all 16 rebuilt from scratch:
  - Every troop, hero and mount is a single skinned mesh on an 18 to 28 bone skeleton.
  - Dedicated rigs for the horse and rider, the war elephant (three-bone trunk, flapping ears), the yeti and the winged Garuda.
  - Full-body procedural animation: a stride driven by distance travelled, arm counter-swing, hip bob and torso twist.
  - Attacks for each weapon type: spear thrust, sword slash, bow draw, mallet smash, boulder throw, staff cast, chakram whip, falcon release, yeti pound and Garuda dive. Each is timed to the rules' own attack clock, so the blow lands on the frame the hit event fires.
  - Flinches, victory cheers and limp falls, plus cloth capes for Veer, Tara and Ayaan.
- **UI** (`theme.css`, `ui-fx.js`):
  - A "Royal Jharokha" theme: gilded parchment panels with a jali lattice pattern, peacock-glass HUD, saffron buttons that press down, and tap ripples.
  - A curtain transition when a battle starts and when you return home.
  - Stars fly into the score as they are earned, and collected resources fly into the treasury.
  - A new result screen: a banner unfurls, the stars land one by one with spark bursts, numbers count up, rays turn behind the card, and confetti and petals fall with real physics.
- **Royal Court** (in `rules.js`), a new progression layer:
  - Ten Royal Decrees in three tiers each, paying gems and ore. Progress comes from career stats the rules record: upgrades, collection, battles, victories, stars, three-star wins, structures destroyed, troops deployed, spells cast, hero abilities and days holding court.
  - A seven-day Daily Durbar with streaks, where a missed day resets the ladder.
  - Both are persisted, clamped against hostile values and migration-safe.
  - A HUD badge shows when there's something to claim, and claims burst confetti.

## How it was assessed

- **Automated.** `npm test` passes in full, including the new `verify-audio-atmosphere`, `verify-physics-characters` and `verify-decrees`. `build-release --verify` passes. Vercel's gate (fast tests plus release build) takes about 5 seconds.
- **End to end.** A scripted fresh-player journey covered the guided start, the shop, placing a Teak Yard, quick-fill, the briefing, a battle, retreat, the result screen, returning home and the audio settings. It ran at 1280×720, at 844×390 (phone landscape with touch), and at 844×390 with reduced motion and Low quality. All three runs had zero console errors.
- **Full battles.**
  - A developed kingdom was played through every troop type, a hero, lightning and rage to three stars, capturing the curtain, the star fly-in and the result sequence frame by frame.
  - The Royal Court flow was claimed end to end at phone and desktop sizes. The badge counted correctly, rewards were credited exactly and the badge cleared.
- **Render budget.** The steady home scene is 111 draw calls and 537k triangles, compared with 546k triangles before this work. Each character costs one skinned draw per material.
- **Not tested.** Physical phones, GPU frame times and a listening test. Everything visual was rendered by SwiftShader at about 1 FPS, so screenshots show appearance, not smoothness.

**Score guide:** 0 means absent. 1–3 is rudimentary. 4–5 is a usable prototype. 6–7 is solid with visible limits. 8–9 is mature and polished. 10 is exceptional and extensively validated.

## Ratings

| # | Area | Original | Pass 1 | Pass 2 | Evidence · remaining limit |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Lighting and colour | 5.5 | 7.5 | 7.5 | HDR bloom, colour grade and image-based lighting. There is no time-of-day cycle. |
| 2 | Water and landscape | 5 | 7.5 | 7.5 | Flowing river shader, wind, cloud shade and meadow. The ground is still flat. |
| 3 | Living world | 3 | 7 | 7.5 | Villagers are now fully animated rigs, alongside egrets, butterflies and smoke. |
| 4 | Character readability | 4.5 | 7 | 7.5 | New models are chunkier, with rim light and rings. They are built from stylised primitives, not sculpted. |
| 5 | Character animation and presence | 4.5 | 6 | 8 | Full-body rigs with weapon attacks synced to the rules, cheers, falls and cloth capes. Animation is procedural rather than hand-keyed. |
| 6 | Combat VFX and physical impact | 5 | 8 | 8.5 | Rigid rubble, rolling cannonballs, stuck arrows, knockback and tumbling fallen warriors. The physics is visual only and never affects the rules. |
| 7 | Reward and celebration moments | 3.5 | 7.5 | 8.5 | Sequential star reveal, count-ups, physics confetti, star fly-in and resource fly-outs. |
| 8 | Sound effects | 4.5 | 7.5 | 7.5 | 38 synthesised cues. There is no recorded foley or voice. |
| 9 | Music | 0 | 7 | 7 | Adaptive generative raga score. Timbres are synthesised. |
| 10 | Ambience | 0 | 6.5 | 6.5 | River, birds, bells and battle wind. There is no weather cycle. |
| 11 | Audio settings and behaviour | 3.5 | 8 | 8 | On by default, separate switches, volume sliders, quick mute, silent in background tabs. |
| 12 | Motion accessibility | 6 | 6.5 | 7 | All new motion respects reduced motion, and tappable controls glow rather than move. |
| 13 | Core loop | 6.5 | 6.5 | 7 | The Daily Durbar adds a reason to return each day. Combat balance is untouched. |
| 14 | Goals and content breadth | 7 | 7 | 7.5 | Thirty decree tiers sit on top of 15 buildings × 15 tiers, 10 troops, 6 heroes and 6 bases. |
| 15 | UI design and feel | 7 | 7 | 8 | The royal theme and tactile controls are a layer over the existing layouts. |
| 16 | Online and persistence | 6 | 6 | 6 | New save fields are persisted and tested for migration. Online play is unchanged. |
| 17 | Performance confidence | 6.5 | 6 | 6 | The render budget was measured, but not on a device. |

**Arithmetic.**
- Presentation: 45 → 86 → 91 points across the 12 categories. Divided by 12, that is 3.75 → 7.17 → 7.58.
- Gameplay (categories 13–17): 33 → 32.5 → 34.5.
- Whole game with gameplay counted double: (presentation + 2 × gameplay) ÷ 22 gives 5.05 → 6.86 → 7.27.
- With equal weights, the whole game scores 4.6 → 7.0 → 7.4.

## Remaining gaps, in priority order

1. **Device performance.** Profile Balanced on mid-range Android and iPhone hardware during a maximum battle, and move bloom or capes to Ultra if the budget needs it.
2. **Authored animation.** Hand-keyed signature moves for the heroes (for example, Veer's Battle Cry) would lift animation above 8.
3. **Recorded audio.** Licensed tabla, shehnai and battle-cry samples. The music scheduler can already trigger samples instead of synthesised voices.
4. **Server-verified battles.** Online results are still reported by the attacking device, so a real production launch needs replay verification.
5. **Time of day and weather.** A dusk palette with diya lamps, and monsoon showers at home.
