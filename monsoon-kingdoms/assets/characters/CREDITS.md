# Character asset credits

The realistic troops and heroes are dressed, armed and animated at load time by `src/humans.js`
from these source models.

| File | Source | Author | License |
| --- | --- | --- | --- |
| `human_male.glb`, `human_female.glb` | Universal Base Characters, with clips from the Universal Animation Library | Quaternius (quaternius.com) | CC0 1.0 (public domain) |
| `horse.glb` | Marwari horse mesh, texture and animations from 0 A.D. | Wildfire Games and 0 A.D. contributors (play0ad.com) | CC BY-SA 3.0 |
| `war_elephant.glb` | Armoured Asian war elephant mesh, siege texture and animations from 0 A.D. | Wildfire Games and 0 A.D. contributors (play0ad.com) | CC BY-SA 3.0 |

Changes to the 0 A.D. files:
- Converted from COLLADA to glTF, with the animations retargeted to the mesh skeleton.
- The team-colour mask is filled with the game's royal teal.
- Textures are recompressed to WebP.

These adapted files are shared under the same CC BY-SA 3.0 license
(https://creativecommons.org/licenses/by-sa/3.0/). The Quaternius files have been slimmed, but
their licensing is unchanged.
