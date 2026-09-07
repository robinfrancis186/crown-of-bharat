# Original Monsoon Kingdoms architectural kit

Fifteen original geometry assets: twelve gameplay buildings, two additional fort tiers, and a small upgrade standard. Each GLB has a centered X/Z origin, ground at Y=0, +Y up, and meter units. Doors and cannon face +Z. Footprints match the game grid: forts 7.6m square, village buildings 5.6m square, tower/cannon 3.6m square, wall 1.86m square.

The editable source is `../blender/buildings.blend`. Its collection names match asset IDs, with separate named component meshes for masonry, segmented roofs, gates, decoration and cargo. The fort is initially visible; enable another asset collection in the Outliner to edit it. Runtime exports batch components into only two shared vertex-color material meshes. No image textures or external artwork are embedded. PNG previews are 512×512 with transparent backgrounds.

Rebuild from the monsoon-kingdoms folder:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python tools/build-buildings.py
python3 tools/optimize-buildings.py
node tools/verify-buildings.mjs
python3 tools/build-building-contact-sheet.py
```

The optimizer uses glTF Transform 4.5.0 to quantize normal/color attributes while preserving exact position buffers. Three.js GLTFLoader handles this without a separate decoder. `manifest.json` lists sizes and triangle counts; `verification.json` is the native-loader check. The wall, cannon and canvas camp intentionally use fewer triangles than the larger buildings because their silhouettes need less geometry.
