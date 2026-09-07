"""Original articulated reinforcements. Blender -b --python tools/build-reinforcements.py
Uses current modeling helpers without modifying or executing earlier asset builds.
Animation uses mesh-parent joints, not a skeletal rig. All four GLBs contain Idle loops.
"""
from pathlib import Path
helper=Path(__file__).with_name('build-units.py')
exec(compile(helper.read_text().split('\nsetup_scene()\n')[0],str(helper),'exec'))
M.update({
 'saffron':material('Saffron woven cotton',(.67,.235,.035)),
 'yellow':material('Miner turmeric turban',(.90,.58,.025)),
 'green':material('Miner forest green',(.055,.255,.115)),
 'iron':material('Forged blue iron',(.22,.29,.33),.5,.40),
 'ivory':material('Yeti ivory fur',(.83,.81,.68),0,.84),
 'ice':material('Yeti glacial blue skin',(.08,.34,.46),0,.7),
 'feather':material('Garuda blue black feathers',(.018,.065,.12),.08,.48),
 'featherlight':material('Garuda feather highlights',(.04,.15,.23),.10,.43),
 'crimson':material('Garuda crimson lacquer',(.45,.026,.018),.3,.4),
})
GROUPS={}
def joint(name,objects,pivot,axis,angle):GROUPS[name]={'objects':list(objects),'pivot':Vector(pivot),'axis':axis,'angle':angle}
def remat(o,key):o.data.materials.clear();o.data.materials.append(M[key])
def drop(prefixes):
    for o in PARTS[:]:
        if any(o.name.startswith(p) for p in prefixes):PARTS.remove(o);bpy.data.objects.remove(o,do_unlink=True)
def rock(name,loc,scale,mat='rock',sub=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc)
    o=bpy.context.object;o.scale=scale;return finish(o,name,mat,False)

def bowler():
    # Broad human rock thrower with saffron pagri, practical indigo wraps and sun belt.
    for side in (-1,1):
        x=side*.17
        tube('Bowler trouser thigh',(x,0,.79),(x,-.025,.44),.15,.115,'cloth')
        tube('Bowler lower leg',(x,-.025,.44),(x,.015,.105),.096,.064,'skin')
        ell('Bowler leather sandal',(x,-.065,.065),(.115,.19,.065),'dark',20,10)
        for z in (.115,.16):ring('Ankle binding',(x,.015,z),.073,.015,'gold')
    tube('Bowler wrapped dhoti',(0,0,.63),(0,0,.91),.295,.255,'cloth',28)
    ell('Powerful torso',(0,0,1.15),(.33,.20,.39),'skin',28,18)
    for side in (-1,1):ell('Chest muscle',(side*.135,-.14,1.28),(.17,.094,.15),'skin',20,12)
    ring('Wide woven belt',(0,0,.90),.255,.041,'saffron')
    ell('Sun buckle',(0,-.271,.90),(.08,.028,.075),'gold',20,10)
    for side in (-1,1):
        curve('Dhoti gold border',[(side*.06,-.285,.69),(side*.17,-.245,.69),(side*.245,-.145,.71)],.013,'gold')
    curve('Indigo shoulder wrap',[(-.26,.025,1.48),(-.22,-.19,1.34),(-.08,-.235,1.19),(.20,-.17,.98)],.054,'cloth')
    # Left hand balances; right forearm cradles the boulder at shoulder height.
    start=len(PARTS)
    tube('Left upper arm',(-.31,0,1.36),(-.46,-.04,1.11),.115,.082,'skin')
    tube('Left forearm',(-.46,-.04,1.11),(-.57,-.20,.99),.091,.067,'skin')
    ell('Left fist',(-.58,-.21,.98),(.085,.076,.078),'skin',20,12)
    tube('Left bracer',(-.51,-.11,1.06),(-.57,-.20,.99),.085,.072,'dark')
    joint('Balance_arm',PARTS[start:],(-.30,0,1.36),0,.07)
    start=len(PARTS)
    tube('Raised right upper arm',(.31,0,1.36),(.51,-.015,1.16),.119,.092,'skin')
    tube('Cradling forearm',(.51,-.015,1.16),(.58,-.17,1.45),.095,.073,'skin')
    ell('Boulder grasping hand',(.58,-.18,1.45),(.085,.085,.095),'skin',20,12)
    tube('Right brass wrist cuff',(.565,-.13,1.36),(.58,-.17,1.43),.086,.080,'gold')
    rock('Carried basalt boulder',(.55,-.06,1.76),(.30,.29,.29),'rock',2)
    for i in range(4):ell('Boulder fingers',(.45+i*.045,-.30,1.52),(.025,.035,.066),'skin',12,8)
    joint('Boulder_arm',PARTS[start:],(.30,0,1.36),1,.055)
    tube('Bowler neck',(0,0,1.43),(0,0,1.57),.10,.095,'skin')
    ell('Bowler face',(0,-.025,1.69),(.145,.13,.17),'skin',24,16)
    ell('Bowler beard',(0,-.053,1.57),(.137,.105,.085),'dark',20,12)
    ell('Bowler nose',(0,-.155,1.68),(.039,.047,.048),'skin',16,10)
    for side in (-1,1):
        ell('Bowler ear',(side*.142,-.008,1.68),(.030,.025,.051),'skin',12,8)
        ell('Bowler eye',(side*.052,-.150,1.725),(.015,.014,.011),'dark',12,8)
        curve('Bowler brow',[(side*.025,-.16,1.754),(side*.07,-.15,1.758),(side*.092,-.12,1.745)],.014,'dark')
        ring('Bowler earring',(side*.158,-.028,1.642),.027,.006,'gold',(math.pi/2,0,0))
    ell('Bowler turban',(0,.0,1.828),(.17,.147,.10),'saffron',28,16)
    for z,r in ((1.81,.16),(1.846,.151),(1.878,.125)):ring('Pagri gold woven fold',(0,0,z),r,.012,'gold')
    mesh('Turban trailing cloth',[(-.08,.12,1.85),(.065,.12,1.84),(.09,.21,1.51),(-.045,.24,1.48)],[(0,1,2,3)],'saffron')
    ell('Turban brass brooch',(0,-.151,1.833),(.037,.015,.045),'gold',16,10)

def miner():
    old=M['cloth'];M['cloth']=M['green'];human('engineer');M['cloth']=old
    drop(['Hammer','Siege hammer head','Back frame','Rolled engineering','Tool handle'])
    for o in PARTS:
        if o.name.startswith('Turban core'):remat(o,'yellow')
    # Cloth backpack, excavation lantern and a genuinely held double-ended pickaxe.
    box('Miner reinforced backpack',(0,.205,1.01),(.31,.18,.37),'dark',.045)
    for x in (-.105,.105):box('Backpack golden buckle',(x,.305,1.06),(.035,.017,.075),'gold',.007)
    mesh('Yellow turban tail',[(.085,.08,1.44),(.14,.08,1.43),(.22,.16,1.15),(.13,.17,1.12)],[(0,1,2,3)],'yellow')
    box('Waist ore pouch',(-.20,-.10,.61),(.19,.12,.17),'dark',.035)
    for i in range(3):rock('Exposed ore nugget',(-.23+i*.037,-.10,.716),(.045,.035,.027),'iron',1)
    start=len(PARTS)
    tube('Pickaxe wooden handle',(.36,-.15,.45),(.36,-.15,1.39),.023,.020,'dark')
    tube('Pickaxe head socket',(.36,-.15,1.30),(.36,-.15,1.42),.045,.043,'iron')
    curve('Curved iron pickaxe head',[(.035,-.15,1.26),(.18,-.15,1.38),(.36,-.15,1.40),(.55,-.15,1.34),(.70,-.15,1.22)],.035,'iron')
    tube('Pickaxe left point',(.13,-.15,1.35),(-.01,-.15,1.20),.033,.003,'iron')
    tube('Pickaxe right point',(.59,-.15,1.30),(.76,-.15,1.17),.030,.002,'iron')
    for z in (.87,.93,1.0):ring('Pickaxe grip rings',(.36,-.15,z),.024,.006,'gold')
    tools=PARTS[start:]
    arm=[o for o in PARTS if o.name.startswith(('upper_arm_1','forearm_1','hand_1','Bracer_1','Bracer rivet_1'))]
    joint('Pickaxe_arm',arm+tools,(.20,0,1.075),0,.09)
    for o in PARTS:o.location*=1.10;o.scale*=1.10
    for g in GROUPS.values():g['pivot']*=1.10

def yeti():
    # Broad, ivory-furred mountain guardian; blue muzzle and long ape-like arms.
    for side in (-1,1):
        x=side*.235
        ell('Yeti haunch',(x,.015,.61),(.235,.25,.46),'ivory',24,16)
        ell('Yeti blue foot',(x,-.14,.12),(.215,.30,.12),'ice',24,12)
        for dx in (-.105,0,.105):
            ell('Broad yeti toe',(x+dx,-.36,.10),(.058,.092,.072),'ice',12,8)
            tube('Yeti ivory toenail',(x+dx,-.405,.104),(x+dx,-.49,.08),.035,.005,'ivory',10)
    ell('Yeti massive trunk',(0,.02,1.17),(.53,.34,.62),'ivory',32,20)
    ell('Yeti chest ruff',(0,-.18,1.43),(.43,.23,.40),'ivory',24,16)
    for i in range(15):
        a=i*math.tau/15;tube('Sculpted torso fur',(.43*math.cos(a),.27*math.sin(a),1.17),(.46*math.cos(a),.29*math.sin(a),.86),.075,.008,'ivory',8)
    for side in (-1,1):
        start=len(PARTS)
        shoulder=(side*.43,0,1.54);elbow=(side*.67,-.045,1.14);wrist=(side*.79,-.17,.78)
        ell('Yeti shoulder fur',shoulder,(.255,.24,.28),'ivory',24,14)
        tube('Yeti upper arm',shoulder,elbow,.20,.145,'ivory',20)
        tube('Yeti forearm',elbow,wrist,.18,.135,'ivory',20)
        ell('Yeti blue fist',(side*.80,-.18,.72),(.16,.15,.17),'ice',24,14)
        for i in range(4):ell('Yeti knuckle',(side*.80+(i-1.5)*.065,-.305,.73),(.042,.044,.065),'ice',12,8)
        for i in range(5):
            y=-.13+i*.055;tube('Arm shaggy fur',(side*.79,y,1.01),(side*.87,y,.78),.055,.008,'ivory',8)
        if side==1:
            tube('Stone club wrapped handle',(.79,-.17,.52),(.84,-.16,1.50),.038,.039,'dark')
            for z in (.63,.72,.81):ring('Club grip binding',(.795,-.17,z),.043,.008,'ivory')
            rock('Stone club heavy head',(.85,-.16,1.59),(.24,.20,.30),'rock',2)
            curve('Club head leather lashing',[(.63,-.16,1.62),(.84,-.37,1.65),(1.07,-.16,1.62),(.84,.04,1.57),(.63,-.16,1.62)],.021,'dark')
        joint('Club_arm' if side==1 else 'Yeti_left_arm',PARTS[start:],shoulder,0,.07 if side==1 else -.07)
    ell('Yeti fur head',(0,0,1.94),(.34,.29,.35),'ivory',28,18)
    ell('Yeti blue face',(0,-.238,1.92),(.246,.111,.229),'ice',24,16)
    ell('Yeti muzzle',(0,-.333,1.83),(.174,.082,.108),'ice',20,12)
    ell('Yeti broad nose',(0,-.411,1.884),(.074,.027,.039),'dark',16,10)
    curve('Yeti determined mouth',[(-.12,-.393,1.796),(0,-.422,1.776),(.12,-.393,1.796)],.016,'dark')
    for side in (-1,1):
        ell('Yeti amber eye',(side*.099,-.342,1.984),(.030,.024,.027),'gold',16,10)
        ell('Yeti dark pupil',(side*.099,-.365,1.984),(.012,.009,.016),'dark',12,8)
        tube('Yeti heavy fur brow',(side*.03,-.335,2.04),(side*.196,-.27,2.065),.055,.042,'ivory',12)
        tube('Yeti protruding fang',(side*.083,-.403,1.815),(side*.079,-.404,1.73),.025,.004,'ivory',12)
        for i in range(4):tube('Yeti cheek fur',(side*(.21+i*.024),-.18,1.99-i*.045),(side*(.26+i*.03),-.21,1.80-i*.035),.046,.008,'ivory',8)
    for i in range(7):
        x=(i-3)*.067;tube('Yeti fur crest',(x,0,2.17),(x*1.07,-.035,2.35-abs(i-3)*.025),.07,.008,'ivory',10)

def feather(name,a,b,width,mat):
    a,b=Vector(a),Vector(b);axis=(b-a).normalized();cross=Vector((0,1,0)).cross(axis).normalized();middle=a.lerp(b,.55)
    # Raised central shaft and six bevel-like facets are fully modeled, with no alpha cards.
    verts=[a,middle+cross*width,b,middle-cross*width,middle+Vector((0,-.038,0)),middle+Vector((0,.025,0))]
    return mesh(name,verts,[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(1,0,5),(2,1,5),(3,2,5),(0,3,5)],mat)

def garuda():
    for side in (-1,1):
        hip=(side*.135,0,.89);knee=(side*.19,-.025,.50);ankle=(side*.155,.035,.19)
        tube('Garuda armored thigh',hip,knee,.12,.089,'feather')
        tube('Garuda shin',knee,ankle,.079,.056,'feather')
        ell('Crimson knee guard',(side*.19,-.09,.52),(.093,.06,.12),'crimson',20,12)
        for i in range(3):
            x=side*.155+(i-1)*.06
            curve('Golden raptor talon',[(side*.155,0,.13),(x,-.15,.065),(x,-.285,.035)],.025,'gold')
        ell('Raptor foot',(side*.155,-.05,.115),(.10,.14,.09),'feather',16,10)
    tube('Garuda flared war skirt',(0,0,.66),(0,0,.94),.245,.17,'crimson',24)
    ell('Garuda breastplate',(0,-.02,1.20),(.27,.165,.35),'crimson',28,16)
    for side in (-1,1):
        curve('Breastplate golden wing motif',[(0,-.19,1.23),(side*.10,-.19,1.31),(side*.21,-.12,1.39)],.027,'gold')
        for i in range(4):tube('Breastplate feather ornament',(side*.045,-.187,1.245+i*.027),(side*(.12+i*.032),-.17,1.24+i*.023),.014,.007,'gold',10)
        ell('Gold shoulder armor',(side*.277,0,1.40),(.14,.17,.074),'gold',20,12)
        tube('Garuda upper arm',(side*.27,0,1.37),(side*.39,-.045,1.15),.084,.061,'feather')
        tube('Garuda forearm',(side*.39,-.045,1.15),(side*.36,-.18,.99),.074,.052,'feather')
        tube('Crimson vambrace',(side*.40,-.063,1.13),(side*.365,-.168,1.005),.077,.058,'crimson')
        ell('Garuda hand',(side*.36,-.19,.975),(.064,.066,.067),'feather',16,10)
        for i in range(3):tube('Hand gold claw',(side*.36+(i-1)*.03,-.22,.96),(side*.36+(i-1)*.03,-.24,.88),.012,.002,'gold',8)
    ring('Gold girdle',(0,0,.92),.175,.027,'gold')
    ell('Garuda belt sun',(0,-.185,.93),(.055,.018,.059),'gold',16,10)
    tube('Garuda neck',(0,0,1.46),(0,0,1.63),.079,.075,'feather')
    ell('Garuda bird mask',(0,-.025,1.75),(.148,.14,.192),'feather',24,16)
    # Angular gilded beak, eyebrow crests and modeled red crown feathers.
    mesh('Garuda golden hooked beak',[(-.063,-.145,1.76),(.063,-.145,1.76),(.044,-.25,1.69),(0,-.31,1.60),(-.044,-.25,1.69),(0,-.175,1.81)],[(0,1,5),(1,2,3,5),(3,4,0,5),(0,4,3,2,1)],'gold')
    for side in (-1,1):
        ell('Garuda crimson eye',(side*.077,-.141,1.80),(.037,.022,.027),'crimson',16,10)
        ell('Garuda eye glint',(side*.077,-.162,1.807),(.012,.006,.012),'gold',12,8)
        curve('Garuda mask brow',[(side*.025,-.162,1.83),(side*.085,-.15,1.864),(side*.151,-.07,1.86)],.019,'gold')
        feather('Garuda ear feather',(side*.11,.01,1.76),(side*.23,.13,1.92),.055,'gold')
    for i in range(5):feather('Crimson feather crown',((i-2)*.028,.02,1.88),((i-2)*.068,.055,2.15-abs(i-2)*.025),.047,'crimson')
    for side in (-1,1):
        start=len(PARTS);pivot=(side*.22,.13,1.44)
        tube('Wing leading upper arm',pivot,(side*.73,.18,1.80),.11,.085,'feather')
        tube('Wing leading forearm',(side*.73,.18,1.80),(side*1.22,.24,1.93),.084,.044,'feather')
        # Layered primary and secondary feathers: wide silhouette and distinct feather tips.
        for i in range(13):
            t=i/12;a=(side*(.53+t*.68),.205,1.65+t*.26)
            b=(side*(.79+t*1.07),.27,.47+t*.69)
            feather('Long primary flight feather',a,b,.073,'feather' if i%2 else 'featherlight')
            if i%3==0:feather('Gold primary feather tip',Vector(a).lerp(Vector(b),.89),b,.039,'gold')
        for i in range(10):
            t=i/9;a=(side*(.32+t*.86),.16,1.48+t*.44);b=(side*(.57+t*.86),.11,1.07+t*.42)
            feather('Layered secondary wing feather',a,b,.074,'featherlight' if i%2 else 'feather')
        for i in range(8):
            t=i/7;feather('Crimson wing covert',(side*(.29+t*.77),.09,1.50+t*.35),(side*(.49+t*.78),.07,1.26+t*.37),.055,'crimson')
        curve('Golden wing leading edge',[pivot,(side*.73,.12,1.81),(side*1.22,.18,1.93)],.016,'gold')
        joint('Wing_L' if side==-1 else 'Wing_R',PARTS[start:],pivot,1,side*.12)
    for i in range(5):
        x=(i-2)*.074;feather('Garuda tail plume',(x,.13,.83),(x*1.9,.42,.25),.07,'featherlight' if i%2 else 'feather')

def build_export(id,build):
    global PARTS,COL,GROUPS
    PARTS=[];GROUPS={};COL=bpy.data.collections.new(id);S.collection.children.link(COL);build()
    bpy.context.view_layer.update()
    points=[o.matrix_world@v.co for o in PARTS for v in o.data.vertices]
    low=Vector([min(v[i] for v in points) for i in range(3)]);high=Vector([max(v[i] for v in points) for i in range(3)])
    shift=Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z))
    for o in PARTS:o.location-=shift
    for g in GROUPS.values():g['pivot']-=shift
    root=bpy.data.objects.new(id,None);COL.objects.link(root);root['identity']=id;root['animation']='Looping articulated mesh joints; no skeleton'
    used={o for g in GROUPS.values() for o in g['objects']};buckets={'Body':{'objects':[o for o in PARTS if o not in used],'pivot':Vector((0,0,0))},**GROUPS}
    joints={};joined=[];total=0
    for name,g in buckets.items():
        if name=='Body':parent=root
        else:
            parent=bpy.data.objects.new(name,None);COL.objects.link(parent);parent.parent=root;parent.location=g['pivot'];joints[name]=parent
        bpy.ops.object.select_all(action='DESELECT');copies=[]
        for o in g['objects']:
            c=o.copy();c.data=o.data.copy();COL.objects.link(c);c.select_set(True);copies.append(c)
        bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();obj=bpy.context.object;obj.name=id+'_'+name
        S.cursor.location=g['pivot'];bpy.ops.object.origin_set(type='ORIGIN_CURSOR');bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
        bpy.context.view_layer.update();world=obj.matrix_world.copy();obj.parent=parent;obj.matrix_world=world
        obj.data.calc_loop_triangles();total+=len(obj.data.loop_triangles);joined.append(obj)
    if total>22000:
        for o in joined:
            bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Reinforcement triangle budget','DECIMATE');mod.ratio=21500/total;bpy.ops.object.modifier_apply(modifier=mod.name)
    total=0
    for o in joined:o.data.calc_loop_triangles();total+=len(o.data.loop_triangles)
    # Real per-joint keys exported as one merged action; both ends return to rest.
    S.render.fps=24;S.frame_start=0;S.frame_end=48
    for name,obj in joints.items():
        g=GROUPS[name]
        for frame,value in ((0,0),(12,g['angle']),(24,0),(36,-g['angle']),(48,0)):
            obj.rotation_euler[g['axis']]=value;obj.keyframe_insert(data_path='rotation_euler',frame=frame)
        obj.animation_data.action.name=id+'_'+name+'_Idle'
    S.frame_set(0);bpy.ops.object.select_all(action='DESELECT')
    for o in [root,*joints.values(),*joined]:o.select_set(True)
    out=ROOT/'assets/units';out.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(out/(id+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_nla_strips_merged_animation_name='Idle')
    for o in joined:bpy.data.objects.remove(o,do_unlink=True)
    # Keep all original editable parts under the same animated source joints.
    for name,g in buckets.items():
        parent=root if name=='Body' else joints[name]
        for o in g['objects']:
            bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=parent;o.matrix_world=world
    height=high.z-low.z;width=max(high.x-low.x,high.y-low.y);target=Vector((0,0,height*.52))
    S.camera.location=target+Vector((4,-6,3.1))*max(height,width)/3
    S.camera.rotation_euler=(target-S.camera.location).to_track_quat('-Z','Y').to_euler();S.camera.data.ortho_scale=max(height*1.24,width*1.02)
    S.render.filepath=str(out/(id+'.png'));bpy.ops.render.render(write_still=True)
    for o in PARTS:o.hide_render=True
    mats=sorted({o.data.materials[0].name for o in PARTS});assert total<=22000 and len(mats)<=6
    entry={'id':id,'file':id+'.glb','portrait':id+'.png','triangles':total,'materials':mats,'height':round(height,3),'width':round(high.x-low.x,3),'depth':round(high.y-low.y,3),'root':'feet at origin, +Z forward, +Y up','animation':'Idle: 2-second looping mesh-joint animation','joints':list(joints),'source':'assets/blender/reinforcements.blend'}
    print('ASSET_RESULT '+json.dumps(entry),flush=True);return entry

setup_scene();S.cycles.samples=24
entries=[build_export(id,build) for id,build in [('bowler',bowler),('miner',miner),('yeti',yeti),('garuda',garuda)]]
path=ROOT/'assets/units/manifest.json';data=json.loads(path.read_text());ids={e['id'] for e in entries}
data['units']=[e for e in data['units'] if e['id'] not in ids]+entries;path.write_text(json.dumps(data,indent=2))
for i,id in enumerate(('bowler','miner','yeti','garuda')):
    for o in bpy.data.collections[id].objects:
        o.hide_render=False
        if o.name==id:o.location.x+=(i-1.5)*4.5
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/reinforcements.blend'))
print('REINFORCEMENTS_COMPLETE',flush=True)
