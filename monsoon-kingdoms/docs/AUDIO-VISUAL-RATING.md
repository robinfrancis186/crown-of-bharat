# Crown of Bharat — sound, music, visuals and characters rating

**Reviewed 24 September 2026, before and after the audio-visual pass on this branch.**

**Presentation score: 3.8 → 7.2/10. Whole game: 5.0 → 6.9/10.** The presentation score averages categories 1–12 below. The whole-game score adds the five gameplay and platform categories (13–17), which this pass left unchanged apart from performance confidence, and counts them double. These are editorial ratings, not player-survey results or device benchmarks.

## How it was assessed

- **Source.** I read `src/view.js`, `src/audio.js`, `src/main.js`, `src/ui.js`, `src/grounded-motion.js` and the verification tools before making changes. The new systems are in `src/music.js`, `src/atmosphere.js` and `src/postfx.js`.
- **Rendering.** The before and after screenshots come from the same scripted session: a starter village, then the River Toll raid with ten troops, rendered by headless Chromium with SwiftShader at 1280×720, 960×540 and 640×360. SwiftShader runs at about 1 FPS, so these images show appearance only. They are not a frame-rate result.
- **Audio.** I recorded the synthesised output in headless Chromium: 30 s of the home score, 25 s of the battle score with rising intensity, and a reel of every sound-effect cue. Then I checked the levels and spectrograms. There were no non-finite samples. The median short-term loudness was about −32 dBFS for home and −27 dBFS for battle, and effect peaks sit above the music. The spectrograms show gliding bansuri lines, tanpura harmonics, tabla strokes and the battle layers coming in.
- **Tests.** The full `npm test` run passes, including the new `tools/verify-audio-atmosphere.mjs`. `build-release.mjs` packages the new modules and the Three.js post-processing addons.
- **Not tested.** I did not play on a physical phone or measure GPU frame times, and no one has done a listening test. The ratings below take these gaps into account.

**Score guide:** 0 means absent. 1–3 is rudimentary. 4–5 is a usable prototype. 6–7 is solid with visible limits. 8–9 is mature and polished. 10 is exceptional and extensively validated.

## Ratings

| # | Area | Before | After | What changed · what still limits it |
| --- | --- | ---: | ---: | --- |
| 1 | Lighting and colour | 5.5 | 7.5 | Image-based room light for marble and brass reflections, a warmer sun, an HDR pipeline with soft bloom, a warm grade, contrast and a vignette. Low quality keeps direct rendering. There is no time-of-day cycle. |
| 2 | Water and landscape | 5 | 7.5 | The river is an animated shader with flow, glints and foam instead of a flat plane. Forests and grass sway, cloud shade drifts across the fields, and about 500 grass tufts and 260 wildflowers fill the meadow. The ground is still a flat plane. |
| 3 | Living world (ambient life) | 3 | 7 | Egrets circle overhead, butterflies flit, pollen motes drift, chimneys smoke, and construction throws sparks and dust. The existing walking villagers are kept. |
| 4 | Character readability | 4.5 | 7 | Troops are about 28% larger and heroes about 30% larger. A fresnel rim light (gold for heroes) and a saffron or teal ground ring separate units from grass and sandstone. The meshes and textures are unchanged. |
| 5 | Character animation and presence | 4.5 | 6 | Melee troops lunge and ranged troops recoil in time with their attack cooldown. Heroes get a column of light on deployment and a turning rangoli aura. Elephants and yetis raise dust on each footfall, and fallen warriors leave a dust puff. There are still no authored attack or death clips. |
| 6 | Combat VFX and impact | 5 | 8 | Pooled GPU particles cover every event: destruction dust and embers with ruin smoke afterwards, cannon smoke, impact sparks, frost and rage bursts, lightning with a screen flash, monsoon rain streaks, canopy droplets and spawn dust. The whole pool is two draw calls. |
| 7 | Reward and celebration moments | 3.5 | 7.5 | A victory rains marigold petals and fireworks. Finished buildings raise a column of light and scatter petals. Stars chime, the last ten seconds tick, and victory and defeat each have a musical stinger. |
| 8 | Sound effects | 4.5 | 7.5 | About 38 cues, up from 18. They add a shared reverb, Karplus-Strong plucks and metallic partials, sword clashes, and distinct chakram, falcon and water sounds. Elephants trumpet, cavalry gallop, yetis roar and Garuda wings beat on deployment, and interface actions each have their own sound. Everything is still synthesised: there is no recorded foley or voice. |
| 9 | Music | 0 | 7 | There was no music before. The new score is generative and adaptive. Home plays Raga Bhupali in keherwa on tanpura, bansuri, santoor, tabla and manjira. Battle plays Raga Kirwani with dhol, sitar, nagara and shehnai, adding layers as intensity rises. Motifs repeat with variation and phrases resolve on stable tones. Synthesised timbres cannot match recorded musicians. |
| 10 | Ambience | 0 | 6.5 | The home valley has a river and breeze bed, koel and sparrow calls, and an occasional peacock and temple bells. Battles have open-field wind. There is no crowd and no weather cycle. |
| 11 | Audio settings and behaviour | 3.5 | 8 | Sound is now on by default; before, it was off and a player had to find it in Settings. There are separate sound and music switches, master and music volume, and a quick mute at home and in battle. Background tabs are silent, and preferences persist. |
| 12 | Motion accessibility | 6 | 6.5 | Reduced motion now also stops the ambient particles, celebrations and hero-aura rotation. Essential combat feedback stays. |
| 13 | Core build–fight–upgrade loop | 6.5 | 6.5 | Unchanged by this pass. |
| 14 | Content breadth (buildings, troops, heroes, campaign) | 7 | 7 | Unchanged: 15 building types with 15 tiers each, 10 troops, 6 heroes with equipment, and 6 campaign bases. |
| 15 | Onboarding and UI | 7 | 7 | Unchanged apart from the new audio controls. |
| 16 | Online and persistence | 6 | 6 | Unchanged: Google account save and asynchronous online attacks without verified battles. |
| 17 | Performance confidence | 6.5 | 6 | New GPU work: post-processing on Balanced and Ultra, particle pools and extra instanced meadow meshes. Low quality skips post-processing. None of this has been measured on a device. |

**Arithmetic.** Presentation: 45 ÷ 12 = 3.75 before and 86 ÷ 12 = 7.17 after. Whole game with gameplay counted double: (45 + 2 × 33) ÷ 22 = 5.05 before and (86 + 2 × 32.5) ÷ 22 = 6.86 after. On equal weights the whole-game scores are 4.6 → 7.0. I quote the gameplay-weighted figures so that a presentation pass cannot inflate the overall score on its own.

## Remaining gaps, in priority order

1. **Device performance.** Measure frame time on Balanced on mid-range Android and iPhone hardware during a maximum battle, and move bloom to Ultra only if the budget requires it.
2. **Authored character animation.** Add attack, hit-react and death clips in the Blender sources (`assets/blender/*.blend`) to replace the procedural lunge and fall.
3. **Recorded audio.** Short licensed or commissioned samples (tabla bols, shehnai phrases, battle cries) would move sound effects and music from about 7 to 8 or higher. The generative scheduler can already trigger samples instead of synthesised voices.
4. **Time of day and weather.** Add a dusk palette with diya and torch lights (bloom is already in place) and occasional monsoon showers at home.
5. **Listening test.** Check the mix on phone speakers, which strip most of the tanpura and dhol low end.
