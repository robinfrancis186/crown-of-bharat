"""Four original concept-led heroes. Blender-native meshes, grounded seven-joint skins.
Run Blender -b --factory-startup --python tools/build-new-heroes.py.
Reuses the established troop shape language, never executes its build entrypoint.
"""
from pathlib import Path
helpers=Path(__file__).with_name('build-units.py')
exec(compile(helpers.read_text().split('\nsetup_scene()\n')[0],str(helpers),'exec'))
from mathutils import Quaternion
import hashlib
M.update(plum=material('Duelist plum silk',(.24,.022,.085)),saffron=material('Saffron silk',(.85,.31,.035)),jade=material('Warden green',(.055,.23,.10)),ivory=material('Ivory cotton',(.80,.72,.52)),teal=material('Rainkeeper teal',(.009,.27,.26)),copper=material('Worked copper',(.64,.23,.09),.65,.32),orange=material('Artisan burnt orange',(.62,.10,.009)),lens=material('Smoked goggle glass',(.045,.17,.21),.5,.2))

M['lip']=material('Matte rose lips',(.32,.072,.05),0,.72)
M['eye_white']=material('Warm ivory eyes',(.80,.76,.64),0,.35)

def remove(prefixes):
 for o in PARTS[:]:
  if o.name.startswith(tuple(prefixes)):PARTS.remove(o);bpy.data.objects.remove(o,do_unlink=True)
def remat(o,key):o.data.materials.clear();o.data.materials.append(M[key])
def costume(key):
 for o in PARTS:
  if o.name.startswith(('Torso','Tunic flared','Turban core')):remat(o,key)
def drape(name,points,key):
 o=mesh(name,points,[tuple(range(len(points)))],key)
 mod=o.modifiers.new('Cloth thickness','SOLIDIFY');mod.thickness=.007;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def arm(side,elbow,hand):
 remove(['upper_arm_'+str(side),'forearm_'+str(side),'Bracer_'+str(side),'hand_'+str(side),'Bracer rivet_'+str(side)])
 tube('Costume upper sleeve',(side*.20,0,1.075),elbow,.071,.052,'skin')
 tube('Costume forearm',elbow,hand,.052,.043,'skin')
 tube('Leather glove cuff',Vector(elbow).lerp(Vector(hand),.60),hand,.057,.048,'dark')
 ell('Grasping hand',hand,(.05,.044,.047),'skin',16,8)
def braid():
 curve('Long swept braid',[(.04,.09,1.43),(.16,.16,1.47),(.27,.20,1.25),(.42,.19,1.04)],.035,'dark')
 for i in range(7):ell('Braided strands',(.21+i*.029,.19,1.41-i*.052),(.041,.037,.043),'dark',12,8)
 ring('Braid gold tip',(.42,.19,1.04),.032,.009,'gold')
def nila():
 human('healer');remove(['Raincaller','Herbal','Herb stem','Potion','Shoulder armor']);costume('plum');braid()
 for side in (-1,1):
  hand=(side*.48,-.19,1.01);arm(side,(side*.34,-.04,1.04),hand)
  center=(side*.61,-.21,1.045)
  ring('Twin chakram outer blade',center,.218,.014,'gold',(math.pi/2,0,0))
  ring('Twin chakram inset',center,.187,.010,'dark',(math.pi/2,0,0))
  for i in range(12):
   a=i*math.tau/12;ell('Chakram engraved studs',(center[0]+.20*math.cos(a),-.228,center[2]+.20*math.sin(a)),(.008,.005,.008),'gold',8,6)
  drape('Saffron divided sash',[(side*.08,-.17,.87),(side*.18,-.12,.81),(side*.34,.03,.45),(side*.20,-.08,.38)],'saffron')
  curve('Sash gilded hem',[(side*.18,-.125,.81),(side*.34,.025,.45),(side*.20,-.085,.38)],.009,'gold')
 curve('Saffron crosswrap',[(-.15,-.09,1.13),(-.04,-.17,.98),(.13,-.14,.84)],.037,'saffron')
 ell('Forehead ruby',(0,-.105,1.388),(.012,.008,.018),'plum',12,8)
def ayaan():
 human('engineer');remove(['Hammer','Siege hammer','Tool','Satchel','Back frame','Rolled','Turban','Trimmed beard']);costume('jade')
 for i in range(8):
  a=i*math.tau/8;ell('Warden wavy hair',(.077*math.cos(a),.018+.060*math.sin(a),1.42),(.047,.04,.049),'dark',12,8)
 ell('Warden short beard',(0,-.057,1.265),(.074,.047,.035),'dark',16,8)
 drape('Ivory falcon mantle',[(.13,.06,1.16),(.27,-.04,1.13),(.41,.10,.89),(.34,.22,.63),(.09,.17,.84)],'ivory')
 curve('Emerald scarf collar',[(-.16,.02,1.17),(-.08,-.14,1.16),(.10,-.15,1.15),(.19,.01,1.19)],.036,'jade')
 drape('Warden coat tail',[(-.15,.05,.88),(.17,.06,.88),(.29,.25,.38),(.02,.31,.45),(-.23,.25,.38)],'jade')
 arm(1,(.35,-.02,1.09),(.56,-.15,1.19))
 tube('Falcon gauntlet',(.40,-.05,1.12),(.56,-.15,1.19),.065,.06,'dark')
 # A perched raptor: hooked beak, talons, layered wing feathers and raised silhouette.
 for x in (.53,.59):
  tube('Falcon leg',(x,-.15,1.20),(x,-.15,1.30),.011,.014,'gold',8)
  for dx in (-.017,0,.017):curve('Falcon talon',[(x,-.15,1.22),(x+dx,-.20,1.195),(x+dx,-.215,1.20)],.005,'gold')
 ell('Falcon breast',(.56,-.11,1.39),(.10,.085,.15),'ivory',18,10)
 ell('Falcon head',(.56,-.145,1.53),(.061,.057,.064),'dark',16,10)
 curve('Hooked falcon beak',[(.56,-.194,1.53),(.56,-.224,1.514),(.56,-.220,1.492)],.013,'gold')
 for side in (-1,1):
  ell('Falcon eye',(.56+side*.053,-.173,1.545),(.008,.010,.008),'gold',8,6)
  for i in range(7):
   a=(.56+side*.045,-.075,1.45-i*.014);b=(.56+side*(.13+i*.016),.02+i*.012,1.30-i*.027)
   tube('Layered falcon flight feather',a,b,.022,.006,'dark',8)
 for i in range(4):tube('Falcon tail',(.53+i*.02,-.02,1.33),(.52+i*.025,.13,1.18),.019,.007,'dark',8)
 curve('Falcon jess',[(.57,-.15,1.22),(.62,-.13,1.12),(.53,-.05,1.00)],.007,'gold')
 tube('Saber grip',(-.32,-.17,.73),(-.32,-.17,.91),.024,.024,'dark')
 curve('Saber knuckle guard',[(-.32,-.17,.91),(-.43,-.17,.84),(-.37,-.17,.73)],.013,'gold')
 drape('Curved short saber',[(-.34,-.18,.73),(-.29,-.18,.73),(-.26,-.18,.48),(-.13,-.18,.26),(-.22,-.18,.29),(-.32,-.18,.49)],'gold')
def ira():
 human('healer');remove(['Raincaller','Herbal','Herb stem','Potion','Shoulder armor']);costume('teal')
 # Bell-shaped pleated gown clears the boot soles, with ivory alternating gores.
 for i in range(12):
  a=i*math.tau/12;b=(i+1)*math.tau/12
  drape('Pleated rain silk',[(.16*math.cos(a),.16*math.sin(a),.80),(.16*math.cos(b),.16*math.sin(b),.80),(.29*math.cos(b),.29*math.sin(b),.19),(.29*math.cos(a),.29*math.sin(a),.19)],'ivory' if i%4==0 else 'teal')
  curve('Gown embroidered seam',[(.16*math.cos(a),.16*math.sin(a),.78),(.23*math.cos(a),.23*math.sin(a),.48),(.29*math.cos(a),.29*math.sin(a),.19)],.006,'gold')
 ring('Rain gown border',(0,0,.20),.286,.012,'gold')
 curve('Ivory raincaller shawl',[(-.16,.0,1.17),(-.09,-.155,1.08),(.10,-.151,1.11),(.20,.02,1.16)],.039,'ivory')
 ell('Rainkeeper brass breastplate',(0,-.115,1.03),(.115,.033,.112),'gold',20,12)
 arm(1,(.30,-.07,1.06),(.38,-.15,1.13))
 tube('Parasol teak shaft',(.38,-.15,.55),(.38,-.15,2.025),.018,.015,'gold')
 cx,cy=.30,.06;rim=[];top=(cx,cy,2.10)
 for i in range(12):
  a=i*math.tau/12;rim.append((cx+.59*math.cos(a),cy+.59*math.sin(a),1.91))
 for i in range(12):
  j=(i+1)%12;drape('Parasol scalloped silk',[top,rim[i],rim[j]],'teal')
  tube('Parasol brass rib',top,rim[i],.009,.006,'gold',8)
  a=i*math.tau/12;b=(i+1)*math.tau/12
  curve('Parasol scalloped hem',[rim[i],(cx+.595*math.cos((a+b)/2),cy+.595*math.sin((a+b)/2),1.884),rim[j]],.009,'gold')
  ell('Rain pearl pendant',(rim[i][0],rim[i][1],1.857),(.013,.013,.027),'ivory',10,8)
 ell('Parasol finial',(cx,cy,2.13),(.027,.027,.057),'gold',12,8)
 # Copper lota hangs from left hand by its arched handle.
 ell('Copper water vessel',(-.34,-.20,.56),(.112,.09,.115),'copper',24,14)
 tube('Lota neck',(-.34,-.20,.62),(-.34,-.20,.70),.063,.057,'copper',20)
 ring('Lota lip',(-.34,-.20,.70),.058,.011,'gold')
 curve('Vessel carry handle',[(-.42,-.20,.64),(-.43,-.20,.78),(-.32,-.20,.80),(-.25,-.20,.65)],.012,'gold')
 for z in (.52,.56,.60):ring('Vessel engraved bands',(-.34,-.20,z),.10,.004,'gold')
def kabir():
 human('engineer');costume('orange');remove(['Back frame','Rolled','Siege hammer','Hammer','Turban jewel'])
 for o in PARTS:
  o.location.x*=1.12;o.scale.x*=1.12
 # Distinct goggles, barrel pack with oversized winding key, and cylindrical mallet.
 for side in (-1,1):
  ring('Goggle brass rim',(side*.052,-.098,1.447),.040,.010,'gold',(math.pi/2,0,0))
  ell('Goggle dark lens',(side*.052,-.103,1.447),(.030,.007,.030),'lens',16,8)
 tube('Goggle bridge',(-.012,-.107,1.447),(.012,-.107,1.447),.008,.008,'gold',8)
 curve('Friendly curled moustache', [(-.065,-.106,1.29),(-.025,-.12,1.28),(0,-.12,1.285),(.025,-.12,1.28),(.065,-.106,1.29)],.012,'dark')
 box('Clockwork pack',(0,.225,.99),(.37,.25,.46),'dark',.035)
 for z in (.79,1.02,1.19):box('Pack brass reinforcing band',(0,.228,z),(.395,.267,.027),'gold',.006)
 for x in (-.15,.15):
  box('Pack brass upright',(x,.36,.99),(.021,.02,.42),'gold',.005)
  for z in (.83,.95,1.10,1.17):ell('Pack rivets',(x,.379,z),(.013,.009,.013),'gold',8,6)
 tube('Winding key stem',(0,.28,1.18),(0,.28,1.47),.025,.025,'gold')
 for side in (-1,1):ring('Giant winding key loop',(side*.085,.28,1.47),.072,.022,'gold',(math.pi/2,0,0))
 tube('Winding key bridge',(-.07,.28,1.43),(.07,.28,1.43),.029,.029,'gold')
 tube('Great mallet haft',(.405,-.15,.69),(.405,-.15,1.39),.030,.027,'dark')
 tube('Barrel mallet head',(.25,-.15,1.39),(.57,-.15,1.39),.112,.112,'gold',24)
 for x in (.27,.55):ring('Mallet iron binding',(x,-.15,1.39),.11,.012,'dark',(0,math.pi/2,0))
 for x in (.247,.573):ell('Mallet end cap',(x,-.15,1.39),(.009,.089,.089),'copper',16,10)
 drape('Artisan leather apron',[(-.14,-.148,.83),(.14,-.148,.83),(.17,-.20,.45),(-.17,-.20,.45)],'orange')
 for side in (-1,1):box('Apron tool pocket',(side*.092,-.214,.63),(.13,.04,.14),'dark',.012)

def refine_face(id):
 remove(['Eye','Eyebrow','Nose'])
 for side in (-1,1):
  x=side*.040
  ell('Readable sclera',(x,-.096,1.343),(.020,.012,.012),'eye_white',16,10)
  ell('Directed iris',(x+.002,-.107,1.344),(.008,.003,.008),'dark',12,8)
  ell('Eye catchlight',(x-.001,-.110,1.348),(.0023,.0013,.0023),'eye_white',8,6)
  curve('Sculpted upper eyelid',[(side*.023,-.098,1.341),(side*.034,-.107,1.352),(side*.046,-.105,1.353),(side*.057,-.095,1.346)],.0029,'skin')
  curve('Sculpted lower eyelid',[(side*.023,-.098,1.341),(side*.04,-.107,1.334),(side*.057,-.095,1.346)],.0021,'skin')
  curve('Expressive eyebrow',[(side*.021,-.098,1.368),(side*.038,-.104,1.375),(side*.056,-.097,1.371),(side*.067,-.085,1.365)],.0041,'dark')
  ell('Nose ala',(side*.011,-.111,1.311),(.010,.010,.007),'skin',12,8)
 ell('Slender nose bridge',(0,-.103,1.329),(.012,.018,.025),'skin',16,10)
 ell('Rounded nose tip',(0,-.122,1.314),(.013,.011,.011),'skin',12,8)
 if id in ('nila','ira'):
  curve('Upper lip cupid bow',[(-.025,-.092,1.282),(-.012,-.102,1.286),(0,-.105,1.283),(.012,-.102,1.286),(.025,-.092,1.282)],.0028,'lip')
  curve('Lower lip smile',[(-.023,-.093,1.280),(0,-.106,1.275),(.023,-.093,1.280)],.0033,'lip')
 else:
  curve('Confident mouth',[(-.024,-.108,1.28),(0,-.116,1.276),(.025,-.108,1.281)],.0028,'skin')
 for i in range(6):
  x=(i-2.5)*.024
  curve('Sculpted swept hair groove',[(x,-.061,1.444),(x*.88,-.020,1.478),(x*.73,.032,1.470),(x*.66,.079,1.438)],.0028,'dark')
 if id=='kabir':
  for side in (-1,1):
   for i in range(4):curve('Beard carved strand',[(side*(.01+i*.013),-.103,1.27),(side*(.012+i*.011),-.103,1.24),(side*(.009+i*.010),-.082,1.22)],.003,'dark')

# Match existing runtime GroundBody / GroundHip / GroundKnee / GroundFoot contract.
def rig_asset(id,objects):
 data=bpy.data.armatures.new(id+' grounded skeleton');rig=bpy.data.objects.new(id+'Rig',data);COL.objects.link(rig)
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
 body=data.edit_bones.new('GroundBody');body.head=(0,0,0);body.tail=(0,0,.1)
 legs=[]
 for i,side in enumerate((-1,1)):
  x=side*.105*(1.12 if id=='kabir' else 1);points=[(x,0,.66),(x,-.015,.37),(x,.015,.095)];parent=body
  for label,point in zip(('Hip','Knee','Foot'),points):
   b=data.edit_bones.new('Ground'+label+str(i));b.head=point;b.tail=Vector(point)+Vector((0,0,.08));b.parent=parent;parent=b
  legs.append({'hip':[x,.66,0],'knee':[x,.37,.015],'ankle':[x,.095,-.015],'phase':i*.5})
 bpy.ops.object.mode_set(mode='OBJECT')
 for o in objects:
  name=o.name;bone='GroundBody'
  if name.startswith(('leg_upper_','leg_lower_','shoe_')):
   side=-1 if '-1' in name else 1;idx=0 if side<0 else 1
   bone='Ground'+('Hip' if name.startswith('leg_upper') else 'Knee' if name.startswith('leg_lower') else 'Foot')+str(idx)
  elif name.startswith('ankle_wrap'):bone='GroundFoot'+str(0 if o.location.x<0 else 1)
  group=o.vertex_groups.new(name=bone);group.add(list(range(len(o.data.vertices))),1,'REPLACE')
 # One consolidated mesh, material primitives retained; decimation preserves weights.
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();obj=bpy.context.object;obj.name=id+' costume'
 S.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 obj.data.calc_loop_triangles();count=len(obj.data.loop_triangles)
 if count>19500:
  mod=obj.modifiers.new('Hero triangle budget','DECIMATE');mod.ratio=19000/count;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=obj.modifiers.new('Grounded skin','ARMATURE');mod.object=rig;obj.parent=rig
 obj.data.calc_loop_triangles();count=len(obj.data.loop_triangles)
 spec={'id':id,'hip':.66,'quadruped':False,'legs':legs,'assigned':len(obj.data.vertices)}
 rig['groundGait']=spec
 # Bake the same two-link foot-target IK used by the runtime, in Blender Z-up space.
 rig.animation_data_create()
 for clip in ('Idle','Walk'):
  action=bpy.data.actions.new(id+'_'+clip);rig.animation_data.action=action
  for frame in range(31):
   t=frame/30;moving=clip=='Walk';height=-.66*.23 if moving else 0
   rig.pose.bones['GroundBody'].location=(0,height,0)
   for i,leg in enumerate(legs):
    phase=(t+i*.5)%1;stride=.66*1.10
    if phase<.6:z=stride*(.5-phase/.6);lift=0
    else:u=(phase-.6)/.4;z=stride*(-.5+u);lift=math.sin(u*math.pi)**2*.66*.22
    hip=Vector((leg['hip'][0],0,.66+height));restk=Vector((leg['knee'][0],-.015,.37));resth=Vector((leg['hip'][0],0,.66));restf=Vector((leg['ankle'][0],.015,.095))
    foot=restf+Vector((0,-z,lift)) if moving else restf
    direction=foot-hip;a=(restk-resth).length;b=(restf-restk).length;length=min(direction.length,a+b-.0001);direction.normalize()
    along=(a*a-b*b+length*length)/(2*length);bend=math.sqrt(max(0,a*a-along*along));pole=Vector((0,-direction.z,direction.y)).normalized()
    knee=hip+direction*along+pole*bend
    q1=(restk-resth).rotation_difference(knee-hip) if moving else Quaternion()
    q2=(restf-restk).rotation_difference(foot-knee) if moving else Quaternion()
    for label,q in [('Hip',q1),('Knee',q1.inverted()@q2),('Foot',q2.inverted())]:
     p=rig.pose.bones['Ground'+label+str(i)];basis=p.bone.matrix_local.to_quaternion();p.rotation_mode='QUATERNION';p.rotation_quaternion=basis.inverted()@q@basis;p.keyframe_insert(data_path='rotation_quaternion',frame=frame+1)
   rig.pose.bones['GroundBody'].keyframe_insert(data_path='location',frame=frame+1)
  action.use_fake_user=True
  track=rig.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action);track.mute=True;rig.animation_data.action=None
 for p in rig.pose.bones:p.location=(0,0,0);p.rotation_quaternion=Quaternion()
 return rig,obj,count,spec

setup_scene();S.cycles.samples=40;S.view_settings.look='AgX - Medium High Contrast';S.world.node_tree.nodes['Background'].inputs[1].default_value=.32;S.view_settings.exposure=-.15;
S.render.resolution_x=4096;S.render.resolution_y=4096;S.render.resolution_percentage=100
entries=[];built=[]
for id,build in [('nila',nila),('ayaan',ayaan),('ira',ira),('kabir',kabir)]:
 PARTS=[];COL=bpy.data.collections.new(id);S.collection.children.link(COL);build();remove(['Bracer rivet_']);refine_face(id)
 for o in PARTS:
  if o.name.startswith('leg_upper_'):o.scale.x*=.84;o.scale.y*=.84
 bpy.context.view_layer.update()
 # All base soles sit at z=0; accessories are deliberately above ground.
 pts=[o.matrix_world@v.co for o in PARTS for v in o.data.vertices];lo=Vector(tuple(min(v[i] for v in pts) for i in range(3)));hi=Vector(tuple(max(v[i] for v in pts) for i in range(3)))
 rig,obj,tris,spec=rig_asset(id,PARTS[:]);bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);obj.select_set(True)
 out=ROOT/'assets/heroes';out.mkdir(parents=True,exist_ok=True)
 bpy.ops.export_scene.gltf(filepath=str(out/(id+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=False)
 height=hi.z;target=Vector((0,0,height*.51));S.camera.location=target+Vector((3.0,-7,2.6))*height/3
 S.camera.rotation_euler=(target-S.camera.location).to_track_quat('-Z','Y').to_euler();S.camera.data.ortho_scale=max(height*1.20,(hi.x-lo.x)*1.35)
 master=ROOT/'assets/masters/heroes'/(id+'-4096.png');master.parent.mkdir(parents=True,exist_ok=True)
 S.render.filepath=str(master);bpy.ops.render.render(write_still=True)
 portrait=bpy.data.images.load(str(master));portrait.scale(768,768);portrait.filepath_raw=str(out/(id+'.png'));portrait.file_format='PNG';portrait.save();bpy.data.images.remove(portrait);obj.hide_render=True
 entry={'id':id,'file':id+'.glb','portrait':id+'.png','triangles':tris,'materials':sorted({m.name for m in obj.data.materials}),'height':round(height,3),'width':round(hi.x-lo.x,3),'depth':round(hi.y-lo.y,3),'root':'feet at origin, +Z forward, +Y up','animation':'7-bone grounded skin; baked Idle and Walk; runtime distance-driven groundGait','clips':[id+'_Idle',id+'_Walk'],'bones':7,'source':'assets/blender/new-heroes.blend','groundGait':spec,'portraitDimensions':[768,768],'master':str(master.relative_to(ROOT)),'masterDimensions':[4096,4096],'masterSha256':hashlib.sha256(master.read_bytes()).hexdigest(),'portraitSha256':hashlib.sha256((out/(id+'.png')).read_bytes()).hexdigest()}
 assert tris<=20000 and len(entry['materials'])<=9;entries.append(entry);built.append((rig,obj));print('HERO_RESULT '+json.dumps(entry),flush=True)
manifest=ROOT/'assets/heroes/manifest.json';data=json.loads(manifest.read_text());ids={e['id'] for e in entries};data['heroes']=[e for e in data['heroes'] if e['id'] not in ids]+entries;manifest.write_text(json.dumps(data,indent=2)+'\n')
for i,(rig,obj) in enumerate(built):obj.hide_render=False;rig.location.x=(i-1.5)*2.1
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/new-heroes.blend'))

source_hash=hashlib.sha256((ROOT/'assets/blender/new-heroes.blend').read_bytes()).hexdigest()
for entry in entries:entry['sourceSha256']=source_hash
manifest.write_text(json.dumps(data,indent=2)+'\n')
