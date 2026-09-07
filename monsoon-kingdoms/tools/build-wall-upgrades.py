"""Original wall tiers 2/3. Preserves base wall and all other asset entries.
Blender --background --factory-startup --python tools/build-wall-upgrades.py
"""
from pathlib import Path
import json
helper=Path(__file__).with_name('build-buildings.py').read_text()
exec(compile(helper.split('BUILDERS=')[0],'existing-building-geometry','exec'))
old_manifest=json.loads((OUT/'manifest.json').read_text())
P.update({'marble':(.91,.91,.85),'sandstone':(.67,.48,.29),'iron':(.16,.22,.23),'inlay':(.13,.31,.38)})

def wall_tier2():
 plinth(1.90);part('02 Sandstone bastion and buttresses')
 box(0,1.20,0,1.75,1.80,1.20,'sandstone',.06)
 for row in range(5):
  for i in range(4):
   x=-.66+i*.44
   for z in [-.622,.622]:box(x,.50+row*.33,z,.408,.30,.045,'sandstone')
 for x in [-.73,.73]:
  box(x,1.21,0,.25,1.94,1.44,'sand',.035)
  for y in [.48,1.0,1.72]:box(x,y,0,.285,.13,1.48,'iron',.018)
 part('03 Iron reinforced parapet')
 box(0,2.16,0,1.85,.20,1.52,'iron',.025);box(0,2.30,0,1.83,.15,1.5,'sand',.025)
 for x in [-.66,0,.66]:
  for z in [-.56,.56]:box(x,2.52,z,.36,.33,.34,'sandstone',.025)
 for z in [-.66,.66]:
  box(0,1.04,z,1.45,.14,.07,'iron',.008)
  for x in [-.55,0,.55]:rod((x,1.04,z),(x,1.04,z+(.025 if z>0 else -.025)),.042,'gold',8)
 banner(0,1.59,.66,.48,.75)

def wall_tier3():
 plinth(1.90);part('02 Royal marble inlaid rampart')
 box(0,1.35,0,1.76,2.10,1.26,'stone',.05)
 for y in [.41,.76,1.12,1.48,1.84,2.2]:
  for z in [-.652,.652]:box(0,y,z,1.74,.028,.045,'inlay')
 for x in [-.74,.74]:
  box(x,1.40,0,.25,2.23,1.49,'marble',.03)
  for y in [.47,1.19,2.32]:box(x,y,0,.28,.12,1.54,'gold',.016)
 for z in [-.668,.668]:
  for x in [-.43,.43]:box(x,1.43,z,.045,1.69,.035,'marble')
 box(0,2.49,0,1.85,.17,1.59,'marble',.025)
 part('03 Indigo pitched parapet cap');roof(0,2.59,0,1.87,1.60,.41,'blue',False)
 for x in [-.72,.72]:
  for z in [-.57,.57]:
   cyl(x,2.64,z,.085,.22,'gold',8);cyl(x,2.86,z,.071,.27,'gold',8,0)
 part('04 Royal gold crest and geometric inlay')
 banner(0,1.53,.70,.67,1.12,'blue')
 rod((0,2.17,.70),(0,2.17,.76),.16,'gold',12)
 for dx in [-.18,0,.18]:
  cyl(dx,2.30+(.11 if dx==0 else 0),.76,.047,.22,'gold',8,0)
 for x in [-.44,.44]:
  for y in [.70,1.05,1.44,1.84,2.16]:
   mesh('marble',[(x,y+.07,.686),(x+.05,y,.686),(x,y-.07,.686),(x-.05,y,.686)],[(0,1,2,3)])

BUILDERS={'wall_2':wall_tier2,'wall_3':wall_tier3}
exporter='collections={};manifest=[]'+helper.split('collections={};manifest=[]',1)[1]
exporter=exporter.replace('assets/blender/buildings.blend','assets/blender/wall-upgrades.blend').replace("['wall','upgrade_ornament']","['wall','wall_2','wall_3','upgrade_ornament']").replace("key!='fort'","key!='wall_2'").replace('look=Vector((0,0,3.0))','look=Vector((0,0,1.3))').replace('data.ortho_scale=11.6','data.ortho_scale=4.2')
exec(compile(exporter,'reused-building-export-pipeline','exec'))
new_entries={item['id']:item for item in manifest}
old_manifest['assets']=[new_entries.pop(item['id'],item) for item in old_manifest['assets']]+list(new_entries.values())
(OUT/'manifest.json').write_text(json.dumps(old_manifest,indent=2)+'\n')
(OUT/'wall-upgrades-manifest.json').write_text(json.dumps({'assets':manifest,'source':'assets/blender/wall-upgrades.blend'},indent=2)+'\n')
assert all(a['triangles']<5000 and a['meshes']<=2 and max(a['size'][0],a['size'][2])<=1.901 for a in manifest)
