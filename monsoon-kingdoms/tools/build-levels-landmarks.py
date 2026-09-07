"""Seventy distinct landmark upgrades, preserving base GLBs and shared manifests.
Blender --background --factory-startup --python tools/build-levels-landmarks.py
Loads original editable Blender source collections; adds cumulative architectural components.
Only writes owned levels/{fort,barracks,archer_tower,market,wall}, own manifest and own .blend.
"""
from pathlib import Path
import json,hashlib,sys,random,math
import numpy as np
script=Path(__file__).with_name('build-landmarks.py').read_text()
exec(compile(script.split('\nBUILDERS=',1)[0],'existing-architecture-helpers','exec'))
DEST=ROOT/'assets/buildings/levels';TYPES=['fort','barracks','archer_tower','market','wall'];SPANS={'fort':7.6,'barracks':5.6,'archer_tower':3.6,'market':5.6,'wall':1.90}
FOOT={'fort':[4,4],'barracks':[3,3],'archer_tower':[2,2],'market':[3,3],'wall':[1,1]}
selected_arg=next((x.split('=',1)[1] for x in sys.argv if x.startswith('--only=')),None)
selected_types={x.split(':')[0] for x in selected_arg.split(',')} if selected_arg else set(TYPES)
for kind in selected_types:(DEST/kind/'ready.json').unlink(missing_ok=True)
SOURCES={'fort':'taj-and-civic.blend','barracks':'landmarks.blend','archer_tower':'landmarks.blend','market':'landmarks.blend','wall':'buildings.blend'}
# Loading from native sources preserves named component meshes in the editable deliverable.
bases={}
for kind in TYPES:
 with bpy.data.libraries.load(str(ROOT/'assets/blender'/SOURCES[kind]),link=False) as (available,loaded):loaded.collections=[kind]
 coll=loaded.collections[0];coll.name='SOURCE '+kind;coll.hide_viewport=False;coll.hide_render=True
 bases[kind]=[o for o in coll.objects if o.type=='MESH']
for c in list(bpy.context.scene.collection.children):bpy.context.scene.collection.children.unlink(c)
P.update({'era_stone':(.68,.47,.30),'era_roof':(.69,.29,.17),'era_metal':(.79,.57,.23)})
base_mesh_fn=mesh

def mesh(col,v,f,metal=False):base_mesh_fn(col,v,f,metal or col=='era_metal')

def compact_arch(x,y,z,w,h,c='era_stone'):
 small_arch(x,y,z,w,h,.095,c,False)

def col(x,y,z,h=.8,r=.055,c='era_stone'):
 cyl(x,y+h/2,z,r,h,c,8);cyl(x,y+.06,z,r*1.6,.12,c,8);cyl(x,y+h-.035,z,r*1.6,.10,c,8)

def kiosk(x,y,z,r=.35,h=.65,roofcol='era_roof'):
 cyl(x,y,z,r*1.12,.12,'era_stone',12)
 for k in range(4):
  a=math.pi/4+k*math.pi/2;col(x+math.cos(a)*r*.80,y+.04,z+math.sin(a)*r*.80,h,.035)
 cyl(x,y+h+.07,z,r*1.22,.09,'era_stone',12);dome(x,y+h+.12,z,r*1.16,r*.8,roofcol,12,4);cyl(x,y+h+.16+r*.85,z,.035,.20,'era_metal',8,0)

def crown(x,y,z,r=.4,n=10):
 cyl(x,y,z,r,.11,'era_metal',16)
 for k in range(n):
  a=k*math.tau/n;cyl(x+math.cos(a)*r*.86,y+.19,z+math.sin(a)*r*.86,.034,.31,'era_metal',6,0)

def rail(x,y,z,w,h=.35,c='era_stone'):
 for dx in [-w/2,0,w/2]:col(x+dx,y,z,h,.025,c)
 box(x,y+h,z,w+.08,.055,.07,c)

def balcony_small(y,r):
 cyl(0,y,0,r,.16,'era_stone',24);cyl(0,y-.15,0,r*.78,.17,'era_stone',24,r)
 for i in range(12):
  a=i*math.tau/12;col(math.cos(a)*r*.9,y+.08,math.sin(a)*r*.9,.37,.025)
 cyl(0,y+.48,0,r,.055,'era_metal',24)

def portal(x,y,z,w,h):
 for dx in [-w*.53,w*.53]:col(x+dx,y,z,h,.07)
 compact_arch(x,y+.08,z,w,h,'era_stone');box(x,y+h+.13,z,w*1.24,.13,.39,'era_roof')

def curved_steps(y0,y1,r,n=13):
 for i in range(n):
  a=-math.pi*.55+i/(n-1)*math.pi*1.12;y=y0+(y1-y0)*i/(n-1)
  x=r*math.cos(a);z=r*math.sin(a);box(x,y,z,.27,.09,.30,'era_stone')

def fort_feature(n):
 if n==2:
  for x in [-2.78,2.78]:
   for z in [-1.73,1.73]:col(x,.26,z,1.12,.12);crown(x,1.4,z,.19,6)
 elif n==3:portal(0,.32,2.88,1.50,2.64)
 elif n==4:
  for y,r in [(3.42,1.13),(3.65,1.24)]:cyl(0,y,0,r,.11,'era_roof',32)
  for k in range(12):
   a=k*math.tau/12;col(math.cos(a)*1.12,3.32,math.sin(a)*1.12,.37,.025)
 elif n==5:
  for x in [-2.83,2.83]:kiosk(x,.34,0,.36,1.04)
 elif n==6:
  for x in [-3.11,3.11]:
   for z in [-3.11,3.11]:
    for yy in [2.10,3.73,5.25]:cyl(x,yy,z,.40,.17,'era_metal',16)
 elif n==7:
  for x in [-2.61,2.61]:
   box(x,3.21,0,.90,.12,2.45,'era_roof')
   for z in [-1.06,1.06]:col(x,.45,z,2.7,.055)
 elif n==8:
  for k in range(12):
   a=k*math.tau/12
   path=[(1.42,4.75),(1.02,5.22),(.45,5.55),(.06,5.76)]
   for (r0,y0),(r1,y1) in zip(path,path[1:]):beam((math.cos(a)*r0,y0,math.sin(a)*r0),(math.cos(a)*r1,y1,math.sin(a)*r1),.027,'era_metal')
 elif n==9:
  for x in [-1.9,1.9]:
   for z in [-3.17,3.17]:
    for dx in [-.31,.31]:col(x+dx,.27,z,.78,.04)
    compact_arch(x,.32,z,.53,.76);box(x,1.16,z,.89,.11,.44,'era_roof')
 elif n==10:
  for x in [-.99,.99]:col(x,.42,2.68,3.0,.075)
  box(0,3.43,2.68,2.27,.14,.47,'era_roof');crown(0,3.55,2.68,.23,8)
 elif n==11:
  for x in [-1.69,1.69]:
   for z in [-1.69,1.69]:cyl(x,4.03,z,.70,.12,'era_metal',20)
 elif n==12:
  cyl(0,6.13,0,.14,.35,'era_metal',12);cyl(0,6.42,0,.22,.27,'era_metal',12,.07);cyl(0,6.85,0,.06,.67,'era_metal',8,0)
 elif n==13:
  for x in [-1.65,1.65]:
   rod((x,2.55,2.47),(x,2.55,2.58),.28,'era_metal',16)
   for k in range(8):
    a=k*math.tau/8;beam((x+math.cos(a)*.12,2.55+math.sin(a)*.12,2.60),(x+math.cos(a)*.35,2.55+math.sin(a)*.35,2.60),.025,'era_metal')
 elif n==14:
  for x in [-2.23,2.23]:
   for z in [-1.5,-.75,0,.75,1.5]:col(x,3.20,z,.65,.035)
   box(x,3.95,0,.50,.10,3.38,'era_roof')
 elif n==15:crown(0,3.89,0,1.42,24)


def barracks_feature(n):
 if n==2:
  for x in [-.45,-.30,-.15,0,.15,.30,.45]:beam((x,.46,2.25),(x,2.22,2.25),.035,'era_metal')
  for y in [.85,1.38,1.91]:box(0,y,2.25,1.06,.05,.06,'era_metal')
 elif n==3:
  for x in [-2.23,2.23]:cyl(x,1.17,2.18,.28,1.7,'era_stone',12);crown(x,2.10,2.18,.33,8)
 elif n==4:
  box(0,4.45,1.50,2.51,.14,1.0,'era_stone')
  for x in [-1.04,-.35,.35,1.04]:col(x,4.52,1.83,.77,.04)
  rail(0,4.54,1.99,2.4,.31);box(0,5.38,1.5,2.64,.11,1.14,'era_stone')
 elif n==5:
  for x in [-2.05,2.05]:cyl(x,1.77,-1.8,.41,2.68,'era_stone',12);kiosk(x,3.16,-1.8,.39,.54)
 elif n==6:
  for x in [-1.66,1.66]:
   cyl(x,2.48,1.26,.83,.17,'era_metal',16)
   for k in range(8):
    a=k*math.tau/8;col(x+math.cos(a)*.765,.55,1.26+math.sin(a)*.765,2.20,.03,'era_metal')
 elif n==7:roof(0,5.47,1.45,2.63,1.25,.43,'era_roof',False)
 elif n==8:
  for x in [-2.41,2.41]:
   for z in [-1.0,.10]:box(x,1.75,z,.55,.13,.77,'era_stone');kiosk(x,1.84,z,.28,.5)
 elif n==9:
  for x in [-.73,.73]:
   for z in [2.20,2.53]:col(x,.30,z,.67,.045)
   beam((x,.93,2.14),(x,.93,2.65),.055,'era_metal')
 elif n==10:
  for x in [-1.66,1.66]:crown(x,4.27,1.26,.76,12)
 elif n==11:
  for x in [-1.25,1.25]:kiosk(x,2.25,-1.09,.35,.76)
 elif n==12:portal(0,.40,2.42,1.36,2.91)
 elif n==13:
  for x in [-2.12,2.12]:
   box(x,2.78,1.99,.91,.17,.76,'era_stone');rail(x,2.88,2.33,.77,.48,'era_metal')
 elif n==14:kiosk(0,5.90,1.44,.43,.76)
 elif n==15:
  dome(0,6.84,1.44,.62,.66,'era_metal',20,6);cyl(0,7.63,1.44,.062,.4,'era_metal',10,0)
  for x in [-2.2,-1.45,-.72,0,.72,1.45,2.2]:crown(x,2.37,-2.12,.12,4)


def tower_feature(n):
 if n==2:
  cyl(0,.45,0,1.47,.14,'era_stone',24)
  for x,z in [(-1.37,-.65),(1.37,-.65)]:col(x,.28,z,.93,.09);crown(x,1.30,z,.16,6)
 elif n==3:curved_steps(.43,1.92,1.28,14)
 elif n==4:portal(0,.31,1.31,1.34,1.68)
 elif n==5:balcony_small(2.59,1.24)
 elif n==6:
  fluted_shaft(8.10,9.04,.34,.29,'era_stone');balcony_small(9.09,.47)
 elif n==7:
  for k in range(12):
   a=k*math.tau/12;beam((math.cos(a)*.95,2.80,math.sin(a)*.95),(math.cos(a)*.82,3.95,math.sin(a)*.82),.037,'era_metal')
 elif n==8:balcony_small(4.06,1.09)
 elif n==9:curved_steps(3.02,4.36,1.10,13)
 elif n==10:fluted_shaft(9.18,10.02,.285,.235,'era_stone');balcony_small(10.07,.43)
 elif n==11:
  for x in [-1.27,1.27]:kiosk(x,.40,-.44,.29,1.12)
 elif n==12:balcony_small(6.40,.91)
 elif n==13:
  for k in range(8):
   a=k*math.tau/8;col(math.cos(a)*.40,10.16,math.sin(a)*.40,.77,.028)
  cyl(0,10.99,0,.54,.12,'era_metal',24)
 elif n==14:
  for k in range(8):
   a=k*math.tau/8;beam((math.cos(a)*.69,5.54,math.sin(a)*.69),(math.cos(a)*.52,7.28,math.sin(a)*.52),.045,'era_metal')
 elif n==15:
  dome(0,11.12,0,.59,.55,'era_metal',20,6);cyl(0,11.88,0,.04,.44,'era_metal',8,0)


def market_feature(n):
 if n==2:
  for x in [-2.15,-.72,.72,2.15]:col(x,.39,1.13,1.29,.055)
  for x in [-1.43,0,1.43]:compact_arch(x,.47,1.13,1.12,1.12)
  box(0,1.89,1.13,4.58,.12,.42,'era_roof')
 elif n==3:
  for x in [-2.34,2.34]:box(x,1.57,.44,.62,.13,.76,'era_stone');rail(x,1.65,.78,.54,.37)
 elif n==4:
  box(0,5.30,-.57,2.05,.75,.95,'era_stone',.025)
  for x in [-.66,0,.66]:jharokha(x,4.99,-.055,.48,.56)
  box(0,5.73,-.57,2.18,.11,1.08,'era_roof')
 elif n==5:
  for x in [-1.96,-.65,.65,1.96]:
   box(x,2.33,.78,.64,.10,.52,'era_stone');rail(x,2.40,.99,.57,.37,'era_metal')
 elif n==6:
  for x in [-2.16,2.16]:kiosk(x,3.05,-.73,.35,.58)
 elif n==7:
  for x in [-1.65,1.65]:
   for dx in [-.55,.55]:col(x+dx,.39,2.02,1.16,.035)
   roof(x,1.60,1.70,1.33,.90,.25,'era_roof',False)
 elif n==8:
  box(0,2.71,.94,4.45,.12,.55,'era_stone')
  for x in [-1.83,-.91,0,.91,1.83]:compact_arch(x,2.78,1.16,.69,.54)
  box(0,3.47,.98,4.63,.10,.65,'era_roof')
 elif n==9:
  box(0,6.12,-.57,1.42,.74,.90,'era_stone',.022)
  for x in [-.37,.37]:jharokha(x,5.83,-.08,.48,.57)
  box(0,6.54,-.57,1.59,.11,1.02,'era_roof')
 elif n==10:
  for x in [-2.63,2.63]:
   box(x,1.70,-.62,.27,.13,1.74,'era_stone');box(x,3.33,-.62,.27,.13,1.74,'era_roof')
   for z in [-1.3,-.62,.06]:col(x,1.77,z,1.48,.027,'era_metal')
 elif n==11:portal(0,.40,2.13,1.29,2.21)
 elif n==12:
  for x in [-1.30,0,1.30]:
   box(x,3.72,.79,.85,.11,.69,'era_stone');rail(x,3.80,1.12,.77,.42);dome(x,4.37,.80,.42,.23,'era_roof',12,4)
 elif n==13:
  for x in [-.71,.71]:kiosk(x,6.57,-.58,.28,.56)
 elif n==14:
  for x in [-2.12,2.12]:
   col(x,3.12,.20,1.31,.055,'era_metal');crown(x,4.49,.2,.22,8)
 elif n==15:
  dome(0,7.17,-.58,.64,.61,'era_metal',20,6);cyl(0,7.99,-.58,.055,.42,'era_metal',8,0)


def wall_feature(n):
 if n==2:
  for x in [-.71,.71]:
   box(x,1.17,.10,.23,1.79,1.19,'era_stone',.025)
   for y in [.45,1.25,1.93]:box(x,y,.10,.29,.13,1.26,'era_metal')
 elif n==3:portal(0,.31,.61,.72,1.33)
 elif n==4:
  box(0,2.30,0,1.72,.42,1.08,'era_stone',.025);box(0,2.58,0,1.87,.13,1.31,'era_stone')
 elif n==5:
  for x in [-.70,.70]:
   for z in [-.46,.46]:col(x,2.65,z,.40,.065);crown(x,3.12,z,.11,4)
 elif n==6:box(0,1.42,.72,1.15,.14,.39,'era_stone');rail(0,1.51,.88,1.00,.43)
 elif n==7:roof(0,3.15,0,1.87,1.64,.31,'era_roof',False)
 elif n==8:
  for x in [-.921,.921]:
   for z in [-.51,.51]:beam((x,.49,z),(x,2.27,-z),.028,'era_metal')
 elif n==9:kiosk(0,3.48,0,.30,.43)
 elif n==10:
  for x in [-.65,.65]:
   col(x,.31,.73,2.23,.086);dome(x,2.67,.73,.18,.22,'era_roof',10,4)
 elif n==11:
  for x in [-.35,.35]:compact_arch(x,.41,.84,.53,.94)
 elif n==12:
  for x in [-.62,.62]:col(x,3.44,0,.65,.055);crown(x,4.16,0,.19,6)
 elif n==13:
  for z in [-.60,.60]:
   for x in [-.68,0,.68]:crown(x,3.32,z,.14,6)
 elif n==14:
  rod((0,2.11,.78),(0,2.11,.90),.31,'era_metal',12);rod((0,2.11,.90),(0,2.11,.94),.12,'era_roof',12)
 elif n==15:
  dome(0,4.20,0,.50,.44,'era_metal',16,5);cyl(0,4.84,0,.041,.36,'era_metal',8,0)

FEATURES={
'fort':['Entrance pylons','Grand iwan porch','Inlaid dome drum','Side garden pavilions','Expanded minaret balconies','Side arcaded galleries','Copper dome ribs','Garden pergolas','Lapis portal towers','Chhatri crown eaves','Royal central spire','Sunburst medallion balconies','Upper side colonnades','Imperial lotus crown'],
'barracks':['Working portcullis','Forward bastion pylons','Upper gate gallery','Rear corner bastions','Bastion ribs and armor','Copper gate roof','Side watch kiosks','Raised bridge railings','Twin bastion crowns','Court observation pavilions','Deep outer gateway','Flanking defense balconies','Royal gate watchtower','Imperial command dome'],
'archer_tower':['Expanded base guard posts','Lower spiral stairs','Marble entrance torana','Expanded lower firing gallery','Sixth fluted storey','Copper tower ribs','Second firing terrace','Upper spiral stairs','Seventh fluted storey','Twin entrance pavilions','Third firing balcony','Royal observation crown','Outer upper lattice cage','Imperial summit canopy'],
'market':['Public street arcade','Side balcony bays','Sixth jharokha storey','Deep projecting lattice balconies','Corner roof pavilions','Copper merchant canopies','Upper public balcony arcade','Seventh jharokha storey','Lapis side loggias','Ceremonial bazaar gateway','Covered facade balconies','Twin royal roof pavilions','Gilded corner turrets','Imperial bazaar dome'],
'wall':['Armored buttresses','Arched outer portal','Raised fighting chamber','Four guard pinnacles','Projecting defense balcony','Copper parapet roof','Diagonal side armor','Raised watch kiosk','Lapis forward salients','Double-arched revetment','Twin upper watch spires','Royal crown railing','Imperial embossed shield','Grand gilded watch canopy']}
ADD={'fort':fort_feature,'barracks':barracks_feature,'archer_tower':tower_feature,'market':market_feature,'wall':wall_feature}
ERA=[('sandstone',(.69,.49,.30),(.68,.29,.17),(.80,.58,.25)),('marble',(.91,.89,.80),(.66,.72,.70),(.82,.63,.31)),('copper',(.47,.66,.57),(.20,.49,.43),(.69,.42,.23)),('lapis',(.19,.32,.53),(.065,.23,.43),(.84,.64,.30)),('royal metal',(.82,.70,.42),(.21,.39,.45),(.96,.74,.32))]
allcols={};manifest=[];baseentries=[];original_mats=mats[:]

def recolor(me,era,kind):
 if kind=='fort' or era==0:return
 attr=me.color_attributes.get('Color')
 if not attr:return
 a=np.empty(len(attr.data)*4,dtype=np.float32);attr.data.foreach_get('color',a);a=a.reshape(-1,4)
 rgb=np.where(a[:,:3]<=.0031308,a[:,:3]*12.92,1.055*np.maximum(a[:,:3],0)**(1/2.4)-.055)
 mask=(rgb[:,0]>rgb[:,1]*1.075)&(rgb[:,0]>rgb[:,2]*1.12)&(rgb[:,0]>.30)
 target=np.array([linear(v) for v in ERA[era][1]]);strength=[0,.68,.52,.66,.61][era];a[mask,:3]=a[mask,:3]*(1-strength)+target*strength;attr.data.foreach_set('color',a.ravel())

for kind in TYPES:
 for level in range(1,16):
  random.seed(1000+TYPES.index(kind)*31) # stable component shading across adjacent levels
  era=min(4,(level-1)//3);P['era_stone'],P['era_roof'],P['era_metal']=ERA[era][1:]
  coll=bpy.data.collections.new(f'{kind}_level_{level:02}');bpy.context.scene.collection.children.link(coll);allcols[(kind,level)]=coll
  levelmats=[]
  for mi,m in enumerate(original_mats):
   mat=m.copy();mat.name=f'{kind} {level} '+('metal' if mi else 'architecture');p=mat.node_tree.nodes.get('Principled BSDF')
   if mi==0 and era==4 and kind!='fort':p.inputs['Metallic'].default_value=.22;p.inputs['Roughness'].default_value=.49
   levelmats.append(mat)
  for original in bases[kind]:
   ob=original.copy();ob.data=original.data.copy();ob.name=f'L01 {original.name}';coll.objects.link(ob);ob.hide_render=False;ob.hide_viewport=False
   mi=1 if original.data.materials[0].node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value>.3 else 0
   ob.data.materials.clear();ob.data.materials.append(levelmats[mi]);recolor(ob.data,era,kind)
  parts={};angle=0
  for step in range(2,level+1):part(f'L{step:02} {FEATURES[kind][step-2]}');ADD[kind](step)
  for (name,mi),(v,f,colors) in parts.items():
   me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();attr=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');attr.data.foreach_set('color',[c for rgba in colors for c in rgba]);me.materials.append(levelmats[mi]);ob=bpy.data.objects.new(name,me);coll.objects.link(ob)
  coords=[v.co for ob in coll.objects for v in ob.data.vertices];mn=Vector(tuple(min(v[i] for v in coords) for i in range(3)));mx=Vector(tuple(max(v[i] for v in coords) for i in range(3)));off=Vector(((mn.x+mx.x)/2,(mn.y+mx.y)/2,mn.z))
  for ob in coll.objects:
   for v in ob.data.vertices:v.co-=off
  size=mx-mn;triangles=0
  for ob in coll.objects:ob.data.calc_loop_triangles();triangles+=len(ob.data.loop_triangles)
  assert size.x<=SPANS[kind]+.005 and size.y<=SPANS[kind]+.005,(kind,level,list(size))
  assert triangles<=(12000 if kind=='wall' else 35000),(kind,level,triangles)
  coll['type']=kind;coll['level']=level;coll['era']=ERA[era][0];coll['feature']='Original base architecture' if level==1 else FEATURES[kind][level-2];coll.hide_render=True
  item={'type':kind,'level':level,'file':f'assets/buildings/{kind}.glb' if level==1 else f'assets/buildings/levels/{kind}/{level}.glb','preview':f'assets/buildings/levels/{kind}/{level}.png','triangles':triangles,'meshes':2,'size':[round(size.x,5),round(size.z,5),round(size.y,5)],'footprint':FOOT[kind],'era':ERA[era][0],'addedFeature':coll['feature'],'sourceCollection':coll.name}
  (baseentries if level==1 else manifest).append(item)
  print('BUILT',kind,level,triangles,flush=True)

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.world.color=(.35,.35,.35);scene.view_settings.view_transform='AgX'
for name,pos,power,radius in [('Warm key',(4,-6,11),1400,7),('Sky fill',(-6,-1,7),950,8),('Rim',(1,6,12),1500,6)]:
 ld=bpy.data.lights.new(name,'AREA');ld.energy=power;ld.shape='DISK';ld.size=radius;ob=bpy.data.objects.new(name,ld);scene.collection.objects.link(ob);ob.location=pos;ob.rotation_euler=(Vector((0,0,2))-ob.location).to_track_quat('-Z','Y').to_euler()
cd=bpy.data.cameras.new('512 runtime portrait');camera=bpy.data.objects.new('512 runtime portrait',cd);scene.collection.objects.link(camera);scene.camera=camera;cd.type='ORTHO';camera.location=(10,-13,13);look=Vector((0,0,3.4));camera.rotation_euler=(look-camera.location).to_track_quat('-Z','Y').to_euler();cd.ortho_scale=12.5
for key,coll in allcols.items():coll.hide_viewport=key!=('fort',15);coll.hide_render=key!=('fort',15)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/levels-landmarks.blend'),compress=True)
for coll in allcols.values():coll.hide_viewport=False;coll.hide_render=True
previous=json.loads((DEST/'landmarks-manifest.json').read_text()) if (DEST/'landmarks-manifest.json').exists() else {}
previous_items={(x['type'],x['level']):x for x in previous.get('assets',[])+previous.get('baseAssets',[])}
only_arg=next((x.split('=',1)[1] for x in sys.argv if x.startswith('--only=')),None)
only={k:int(v) for k,v in (x.split(':') for x in only_arg.split(','))} if only_arg else None
for item in baseentries+manifest:
 kind=item['type'];level=item['level'];coll=allcols[(kind,level)];folder=DEST/kind;folder.mkdir(parents=True,exist_ok=True)
 if only is not None and (kind not in only or level<only[kind]):
  item.update(previous_items[(kind,level)])
  continue
 if level>1:
  bpy.ops.object.select_all(action='DESELECT');copies=[]
  for original in coll.objects:
   ob=original.copy();ob.data=original.data.copy();scene.collection.objects.link(ob);copies.append(ob)
  groups={}
  for ob in copies:groups.setdefault(ob.data.materials[0],[]).append(ob)
  merged=[]
  for mat,objects in groups.items():
   bpy.ops.object.select_all(action='DESELECT')
   for ob in objects:ob.select_set(True)
   bpy.context.view_layer.objects.active=objects[0]
   if len(objects)>1:bpy.ops.object.join()
   ob=bpy.context.object;ob.name=f'{kind}_L{level}_{len(merged)}';merged.append(ob)
  bpy.ops.object.select_all(action='DESELECT')
  for ob in merged:ob.select_set(True)
  target=ROOT/item['file'];temporary=target.with_name('.'+target.stem+'.export.glb');bpy.ops.export_scene.gltf(filepath=str(temporary),export_format='GLB',use_selection=True,export_materials='EXPORT',export_yup=True,export_apply=True,export_cameras=False,export_lights=False)
  temporary.replace(target)
  item['meshes']=len(merged);item['bytes']=target.stat().st_size;item['sha256']=hashlib.sha256(target.read_bytes()).hexdigest()
  for ob in merged:bpy.data.objects.remove(ob,do_unlink=True)
 else:item['bytes']=(ROOT/item['file']).stat().st_size
 coll.hide_render=False;h=item['size'][1];look=Vector((0,0,h*.44));camera.location=look+Vector((10,-13,12));camera.rotation_euler=(look-camera.location).to_track_quat('-Z','Y').to_euler();cd.ortho_scale=max(item['size'][0]*1.7,item['size'][2]*1.7,h*1.48,2.8);scene.render.filepath=str(ROOT/item['preview'])
 if '--no-render' not in sys.argv:bpy.ops.render.render(write_still=True)
 coll.hide_render=True;print('EXPORTED',kind,level,item['triangles'],flush=True)
(DEST/'landmarks-manifest.json').write_text(json.dumps({'source':'assets/blender/levels-landmarks.blend','generator':'tools/build-levels-landmarks.py','coordinates':'meters +Y up, centered XZ, floor 0','baseAssets':baseentries,'assets':manifest},indent=2)+'\n')
print('LANDMARK LEVELS COMPLETE',len(manifest),flush=True)
