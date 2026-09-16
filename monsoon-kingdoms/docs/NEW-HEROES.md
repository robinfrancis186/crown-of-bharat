# Four new champions · 16 September 2026

Nila, Ayaan, Ira and Kabir join Veer and Tara in the Hall of Heroes. Each is a permanent champion: choose one for a battle, deploy on the outer edge, then tap the same hero card to use its ability once. They return after victory, defeat or retreat.

| Champion | Hall level | Ability | Equipment |
|---|---:|---|---|
| Nila · Chakram Duelist | 3 | Twin Arc ricochets across three unique nearby structures, losing some damage each bounce. | Sunedge Chakrams, Silkstep Bracers |
| Ayaan · Falcon Warden | 4 | Sky Mark gives the army 35% extra damage against one nearby defense for ten seconds. | Falcon Crest, Amber Scout Lens |
| Ira · Rainkeeper | 5 | Monsoon Canopy creates an eight-second protective area with a shared absorption budget. | Copper Rain Vessel, Monsoon Silk |
| Kabir · Siege Artisan | 6 | Two wheeled shield decoys draw defense fire, deal no damage, and expire after ten seconds. | Master Winding Key, Siege Mallet |

Hero levels remain capped at three; equipment can be forged and improved to level five with earned Ancient Ore. Existing villages automatically recruit only the champions permitted by their completed Hall level. New kingdoms still start with three buildings and ten troops.

## Interface and art

The Hall now has six compact persistent selectors and one focused champion panel. Selection and upgrade actions precede the expandable stats and equipment. A separate marker distinguishes the inspected hero from the champion selected for battle. Locked champions show their Hall requirement and a direct Hall upgrade action.

The original concept boards are in `concepts/next-heroes/`. The four playable meshes were individually authored in Blender and retain their signature chakrams, falcon, parasol and winding-key pack. `assets/blender/new-heroes.blend` contains their editable source. Each GLB includes a seven-bone skin with Idle and Walk clips; the game drives planted feet from traveled distance. Runtime models are under 20,000 triangles each. The portrait pipeline renders native 4096×4096 transparent masters and derives 768×768 runtime images. These are stylized game models, not a claim of exact concept-art fidelity.

## Verification

- `verify-new-heroes.mjs`: Hall/timer/gem unlocks, old-save migration, upgrades, equipment, deployment stats, ability range/failure/retry, once-only use, mark bonus/expiry, shared shielding, and decoy targeting/expiry.
- `verify-new-hero-assets.mjs`: actual GLTFLoader imports, independent skeletons, native animation tracks, planted sole checks, geometry budgets, runtime portrait dimensions/hashes and source hashes. Add `--masters` to verify locally retained 4K master files.
- `verify-hero-view.mjs`: native-rig integration, locomotion/mixer ownership, projectile motion/cleanup, persistent marks/canopies and grounded wheeled decoys.
- `playtest-new-heroes.js`: actual Chrome UI at 568×320, 667×375, 844×390 and 1280×440; all four hero selectors and upgrade buttons visible, portrait loading, Nila upgrade/forge, four touch deployments/abilities, retreat and test-account reload. No game JavaScript errors were reported. Browser screenshots are in the repository’s ignored `output/playwright/` folder.

The browser flow uses the disposable localhost Firebase adapter. It does not modify a real player’s kingdom or prove physical-phone performance or cross-device cloud synchronization. Production Google authentication remains required.
