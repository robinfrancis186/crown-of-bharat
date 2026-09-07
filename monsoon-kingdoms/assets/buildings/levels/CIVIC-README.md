# Civic structural levels

Five families, each with 15 distinct architectural states. Level 1 references the existing base GLB and portrait unchanged; levels 2–15 are 70 new Blender-authored models. Runtime paths are `assets/buildings/levels/{family}/{level}.glb` and matching `.png` previews.

Families: `stepwell`, `camp`, `cannon`, `laboratory`, `hero_hall`.

| Family | Progression |
|---|---|
| Stepwell | Four successive perimeter arcades, axial channels, lotus fountain, upper pavilions, covered galleries, aqueduct, cascade and ceremonial crossing. |
| Camp | Additional company tents, parade equipment, permanent command pavilion, stockade, two watchposts, balconies, covered parade court and war-council tower. |
| Cannon | Recoil axle, cheek armor, outriggers, twin/triple/five-barrel batteries, geared gun mount, conveyor, rotating mantlet, recoil actuators, breech casing, canopy and ranging optics. |
| Laboratory | Telescope, distillation bench, lenses, two observatories, instrument bridge, planetary orbits, collector instruments, clock facade, high dome, second orrery and projection gallery. |
| Hero hall | Victory trophies, front and side galleries, domed wings, second roof tier, relic displays, rear gallery, elephant guardians, upper pavilions, pediment, buttresses and supported lotus crown. |

`civic-manifest.json` lists each exact structural addition. These are cumulative modeled parts or deliberate structural replacements, not color swaps or uniform scaling. The final review added physical piers, pedestals, gallery columns and carriage supports under upper structures.

## Rebuild and verify

Run from the Monsoon Kingdoms root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python tools/build-levels-civic.py
python3 tools/build-levels-civic.py --optimize --sheets
node tools/verify-levels-civic.mjs
```

For geometry/source only, append `-- --no-render` to the Blender command. Optimization reuses the cached glTF Transform 4.5.0 CLI offline, quantizing normal and color buffers while retaining exact float32 positions. No external runtime decoder is required.

The editable source is `assets/blender/levels-civic.blend`: 70 named level collections, each retaining named structural milestone meshes. Export copies merge to two material draws; the editable source remains separate. Existing shared helper scripts and base manifests are read but never edited.

## Runtime contract and evidence

- Meters, +Y up, centered XZ and ground at Y=0.
- Unchanged footprints: 3×3 cells (6×6m envelope), or 2×2 cells (4×4m envelope) for the cannon.
- Every upgraded model uses two draw calls and stays below 22,000 triangles. Maximum per family: well 19,296; camp 9,710; cannon 7,602; laboratory 14,508; hall 19,082.
- 70 optimized GLBs total 35,092,648 bytes.
- `civic-verification.json` records native Three.js GLTFLoader import checks, geometry hashes that exclude color, distinct geometry for all 15 levels, exact triangle counts, floor/center and footprint checks.
- Each family directory includes a visually reviewed `contact-sheet.png` with all 15 tiers. All 75 referenced previews are genuine 512×512 RGBA renders; existing level-1 previews remain unchanged.
- Native 4K portrait generation is a separate master pipeline; this builder does not upscale previews or claim its 512px files are 4K.
