"""Original fictional heroes and a crewed guardian elephant, authored in Blender.
Run: Blender -b --factory-startup --python tools/build-heroes.py
Reuses existing primitive/costume helpers without running or modifying the old build.
"""
from pathlib import Path
helpers=Path(__file__).with_name('build-units.py')
exec(compile(helpers.read_text().split('\nsetup_scene()\n')[0],str(helpers),'exec'))
M['saffron']=material('Royal saffron silk',(.66,.18,.028),0,.56)
M['jade']=material('Ranger emerald textile',(.016,.235,.16),0,.6)
M['sea']=material('Monsoon teal scarf',(.025,.38,.40),0,.65)

def remove_named(prefixes):
    for o in PARTS[:]:
        if any(o.name.startswith(p) for p in prefixes):PARTS.remove(o);bpy.data.objects.remove(o,do_unlink=True)

def remat(o,key):o.data.materials.clear();o.data.materials.append(M[key])

def scale_parts(start,factor):
    for o in PARTS[start:]:o.location*=factor;o.scale*=factor

def veer():
    human('guard')
    remove_named(['Spear','Shield'])
    for o in PARTS:
        if o.name.startswith(('Turban core','Tunic flared')):remat(o,'saffron')
    # Saffron cape, split silk tails, sun cuirass and curled moustache.
    mesh('Veer royal cape',[(-.18,.12,1.14),(.18,.12,1.14),(.31,.32,.43),(0,.43,.36),(-.31,.32,.43)],[(0,1,2,3,4)],'saffron')
    for side in (-1,1):
        curve('Cape gold piping',[(side*.18,.128,1.14),(side*.26,.30,.66),(side*.31,.33,.43)],.012,'gold')
        curve('Commander moustache',[(0,-.114,1.285),(side*.04,-.117,1.282),(side*.065,-.102,1.30)],.013,'dark')
        for z in (.64,.69,.74):curve('Skirt gold border',[(side*.015,-.208,z),(side*.095,-.197,z),(side*.18,-.125,z)],.008,'gold')
    ell('Sun breastplate',(0,-.126,1.043),(.142,.035,.152),'gold',24,14)
    ell('Breastplate indigo inset',(0,-.166,1.043),(.092,.012,.099),'cloth',20,12)
    ell('Breastplate solar seal',(0,-.182,1.043),(.043,.009,.046),'gold',16,10)
    curve('Saffron turban fan',[(.028,.01,1.477),(.08,.012,1.60),(.06,.018,1.64)],.032,'saffron')
    curve('Gold turban aigrette',[(0,-.095,1.44),(.025,-.058,1.55),(.045,-.013,1.61)],.012,'gold')
    # Large embossed shield with twelve raised sun rays.
    sx,sy,sz=-.36,-.28,.82
    tube('Veer indigo sun shield',(sx,sy+.07,sz),(sx,sy,sz),.28,.27,'cloth',40)
    ring('Veer gilded shield rim',(sx,sy-.006,sz),.267,.017,'gold',(math.pi/2,0,0))
    ell('Veer raised solar boss',(sx,sy-.018,sz),(.085,.045,.085),'gold',24,12)
    for i in range(12):
        a=math.tau*i/12;v=[(sx+math.cos(a-.12)*.115,sy-.015,sz+math.sin(a-.12)*.115),(sx+math.cos(a)*.225,sy-.015,sz+math.sin(a)*.225),(sx+math.cos(a+.12)*.115,sy-.015,sz+math.sin(a+.12)*.115)]
        mesh('Embossed shield sun ray',v,[(0,1,2)],'gold')
    # Downward curved talwar: clear sword silhouette within the hero height.
    tube('Talwar wrapped grip',(.36,-.15,.92),(.36,-.15,1.12),.025,.025,'dark')
    ell('Talwar pommel',(.36,-.15,1.13),(.038,.032,.029),'gold',16,8)
    curve('Talwar crossguard',[(.24,-.15,.94),(.36,-.15,.91),(.47,-.15,.95)],.019,'gold')
    pts=[(.33,.90),(.38,.90),(.42,.65),(.47,.42),(.60,.20),(.50,.25),(.39,.42),(.35,.65)]
    verts=[(x,y,z) for y in (-.165,-.14) for x,z in pts];n=len(pts)
    mesh('Commander curved talwar blade',verts,[tuple(range(n)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],'gold')
    for i in range(3):ring('Sword grip binding',(.36,-.15,.97+i*.046),.026,.006,'gold')
    scale_parts(0,1.20)

def bow_pose(handx=.68):
    remove_named(['upper_arm_', 'forearm_', 'Bracer_', 'Bracer rivet_', 'hand_', 'Nocked arrow', 'Bowstring'])
    for side,elbow,hand in [(-1,(-.30,-.07,1.03),(-.02,-.29,1.04)),(1,(.43,-.13,1.055),(handx,-.24,1.04))]:
        shoulder=(side*.20,0,1.075)
        tube('Drawn bow upper arm',shoulder,elbow,.073,.052,'skin')
        tube('Drawn bow forearm',elbow,hand,.06,.047,'skin')
        tube('Ranger leather bracer',Vector(elbow).lerp(Vector(hand),.50),hand,.062,.052,'dark')
        ell('Ranger grasping hand',hand,(.044,.047,.052),'skin',16,8)
    tube('Drawn arrow shaft',(-.02,-.29,1.04),(.84,-.25,1.04),.007,.007,'dark',8)

def tara():
    original=M['cloth'];M['cloth']=M['jade'];human('archer');M['cloth']=original
    remove_named(['Recurve bow','Bowstring','Shoulder armor']);bow_pose()
    for o in PARTS:
        if o.name.startswith('Crossbody baldric'):remat(o,'dark')
    # Asymmetric green shoulder guard and distinct long, curved bow.
    ell('Tara left leaf pauldron',(-.215,.01,1.10),(.13,.12,.056),'jade',20,12)
    curve('Leaf pauldron gilding',[(-.31,-.025,1.105),(-.22,-.10,1.13),(-.115,-.025,1.105)],.013,'gold')
    curve('Monsoon longbow',[(.43,-.24,.23),(.53,-.24,.40),(.67,-.24,.70),(.71,-.24,1.04),(.62,-.24,1.39),(.48,-.24,1.66),(.43,-.24,1.62)],.024,'dark')
    curve('Longbow gold inlay',[(.52,-.256,.41),(.656,-.256,.72),(.69,-.256,1.04),(.60,-.256,1.38),(.48,-.256,1.63)],.008,'gold')
    for tip in ((.43,-.24,.23),(.43,-.24,1.62)):tube('Taut longbow string',(-.02,-.29,1.04),tip,.0035,.0035,'gold',6)
    for z in (.98,1.02,1.06,1.10):tube('Bow grip binding',(.70,-.265,z),(.70,-.215,z),.015,.015,'gold',8)
    # Folded scarf collar and two wind-swept tails give a recognizable ranger outline.
    curve('Teal scarf collar',[(-.14,-.06,1.17),(-.07,-.155,1.125),(.08,-.15,1.125),(.16,-.02,1.18)],.041,'sea')
    mesh('Tara scarf long tail',[(.10,.065,1.17),(.19,.08,1.15),(.37,.34,.86),(.60,.35,.86),(.44,.34,.70),(.24,.26,.79)],[(0,1,2,3,4,5)],'sea')
    mesh('Tara scarf short tail',[(.12,.075,1.16),(.19,.09,1.14),(.45,.26,1.11),(.53,.23,1.05),(.35,.25,1.00)],[(0,1,2,3,4)],'sea')
    curve('Scarf gold edging',[(.19,.078,1.15),(.37,.337,.86),(.60,.347,.86)],.010,'gold')
    curve('Tara long swept braid',[(.02,.12,1.40),(.11,.20,1.27),(.14,.28,1.02),(.25,.32,.91)],.038,'dark')
    for i in range(4):ell('Braid clasp',(.12+i*.012,.23+i*.023,1.2-i*.055),(.044,.037,.011),'gold',12,8)
    for side in (-1,1):
        mesh('Split ranger coat panel',[(side*.07,-.142,.82),(side*.18,-.10,.81),(side*.24,-.11,.40),(side*.13,-.18,.37)],[(0,1,2,3)],'jade')
        curve('Ranger coat piping',[(side*.18,-.109,.80),(side*.235,-.119,.41),(side*.135,-.189,.38)],.009,'gold')
    ell('Ranger forehead moon jewel',(0,-.099,1.388),(.017,.012,.022),'sea',12,8)
    scale_parts(0,1.18)

def crewed_elephant():
    elephant()
    # Open-front howdah: rear parasol shelters the archer without concealing the crew.
    remove_named(['Howdah indigo canopy','Canopy golden ribs','Canopy finial','Howdah column','Column finial'])
    tube('Rear parasol mast',(-.30,.57,1.98),(-.30,.57,3.25),.029,.023,'gold')
    c=(-.30,.57,3.30)
    rim=[]
    for i in range(8):
        a=i*math.tau/8;rim.append((c[0]+.43*math.cos(a),c[1]+.43*math.sin(a),3.16))
    mesh('Crews rear royal parasol',rim+[c],[(i,(i+1)%8,8) for i in range(8)],'cloth')
    for p in rim:tube('Parasol raised gold rib',p,c,.014,.012,'gold',10)
    ell('Rear parasol finial',(-.30,.57,3.34),(.036,.036,.075),'gold',12,8)
    # Add complete named crew rather than decorative tokens.
    start=len(PARTS);human('rider',(0,-.70,1.58),.65,True)
    for o in PARTS[start:]:o.name='Mahout | '+o.name
    remove_named(['Mahout | leg_', 'Mahout | shoe_', 'Mahout | ankle_wrap'])
    ell('Mahout riding cushion',(0,-.70,1.99),(.23,.20,.065),'cloth',16,8)
    for side in (-1,1):
        tube('Mahout visible thigh',(side*.08,-.70,2.0),(side*.34,-.73,1.82),.07,.058,'cloth')
        tube('Mahout visible shin',(side*.34,-.73,1.82),(side*.40,-.90,1.59),.053,.037,'cloth')
        ell('Mahout visible boot',(side*.40,-.95,1.57),(.048,.09,.050),'dark',12,8)
    curve('Mahout guiding reins',[(-.208,-.8105,2.087),(-.32,-1.02,1.82),(-.23,-1.16,1.59)],.013,'gold')
    curve('Mahout guiding reins',[(.208,-.8105,2.087),(.32,-1.02,1.82),(.23,-1.16,1.59)],.013,'gold')
    start=len(PARTS);human('archer');bow_pose(.63)
    for tip in ((.45,-.24,.58),(.45,-.24,1.5)):tube('Taut crew bow string',(-.02,-.29,1.04),tip,.003,.003,'dark',6)
    for o in PARTS[start:]:
        o.location=Vector((.12,.24,1.995))+o.location*.78;o.scale*=.78;o.name='Howdah archer | '+o.name
    # Bells, chest harness and sun details remain readable at normal game scale.
    for side in (-1,1):
        curve('Elephant chest harness',[(side*.54,-.49,1.61),(side*.44,-.72,1.21),(side*.20,-.80,1.05)],.033,'gold')
        for y in (-.27,.12,.50):
            ell('Guardian harness bell',(side*.66,y,.91),(.050,.049,.063),'gold',12,8)
            ell('Bell clapper',(side*.66,y,.85),(.017,.018,.020),'dark',8,6)


def export_asset(id,kind,build,limit=18000):
    global PARTS,COL
    PARTS=[];COL=bpy.data.collections.new(id);S.collection.children.link(COL);build()
    bpy.context.view_layer.update()
    points=[o.matrix_world@v.co for o in PARTS for v in o.data.vertices]
    lo=Vector(tuple(min(v[i] for v in points) for i in range(3)));hi=Vector(tuple(max(v[i] for v in points) for i in range(3)))
    for o in PARTS:o.location-=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
    bpy.ops.object.select_all(action='DESELECT');copies=[]
    for o in PARTS:
        c=o.copy();c.data=o.data.copy();S.collection.objects.link(c);c.select_set(True);copies.append(c)
    bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();obj=bpy.context.object;obj.name=id
    S.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    obj.data.calc_loop_triangles();tris=len(obj.data.loop_triangles)
    if tris>limit:
        mod=obj.modifiers.new('Crew and hero geometry budget','DECIMATE');mod.ratio=limit/tris*.97;bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.data.calc_loop_triangles();tris=len(obj.data.loop_triangles)
    obj['identity']={'veer':'Veer the Lion Commander','tara':'Tara the Monsoon Ranger','elephant':'Guardian elephant with mahout and howdah archer'}[id]
    obj['animation']='static; runtime root motion'
    out=ROOT/'assets'/kind;out.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(out/(id+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False)
    bpy.data.objects.remove(obj,do_unlink=True)
    height=hi.z-lo.z;width=max(hi.x-lo.x,hi.y-lo.y)
    target=Vector((0,0,height*.5));S.camera.location=target+Vector((4,-6,3.1))*max(height,width)/3
    S.camera.rotation_euler=(target-S.camera.location).to_track_quat('-Z','Y').to_euler();S.camera.data.ortho_scale=max(height*1.24,width*1.2)
    S.render.filepath=str(out/(id+'.png'));bpy.ops.render.render(write_still=True)
    for o in PARTS:o.hide_render=True
    entry={'id':id,'file':id+'.glb','portrait':id+'.png','triangles':tris,'materials':sorted({o.data.materials[0].name for o in PARTS}),'height':round(height,3),'width':round(hi.x-lo.x,3),'depth':round(hi.y-lo.y,3),'root':'feet at origin, +Z forward, +Y up','animation':'static root bobbing'}
    assert tris<=limit and len(entry['materials'])<=6
    print('ASSET_RESULT '+json.dumps(entry),flush=True);return entry

setup_scene();S.cycles.samples=24
hero_entries=[export_asset('veer','heroes',veer),export_asset('tara','heroes',tara)]
elephant_entry=export_asset('elephant','units',crewed_elephant,25000)
elephant_entry.update(crew=['mahout','howdah archer'],source='assets/blender/heroes.blend',triangle_budget_reason='Two complete crew figures and an open rear parasol; elephant body scale preserved.')
manifest=ROOT/'assets/units/manifest.json';data=json.loads(manifest.read_text())
for i,entry in enumerate(data['units']):
    if entry['id']=='elephant':data['units'][i]=elephant_entry
manifest.write_text(json.dumps(data,indent=2))
(ROOT/'assets/heroes/manifest.json').write_text(json.dumps({'authoring':'Original fictional Blender heroes; no likeness or imported character assets','heroes':hero_entries,'elephant':'New crewed elephant retained in this Blender source; 25000-triangle ceiling includes two complete crew figures.'},indent=2))
for i,id in enumerate(('veer','tara','elephant')):
    for o in bpy.data.collections[id].objects:o.hide_render=False;o.location.x+=(i-1)*3.5
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/heroes.blend'))
print('HERO_BUILD_COMPLETE',flush=True)
