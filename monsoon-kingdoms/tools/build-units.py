"""Original Monsoon Kingdoms Blender troops and natural prop kit.
Run: Blender -b --factory-startup --python tools/build-units.py
Blender Z up/-Y forward exports glTF Y up/+Z forward; meters, feet at zero.
Static four-material troops support root bobbing; source retains named components.
"""
import bpy, math, json, random, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
random.seed(14)
bpy.ops.wm.read_factory_settings(use_empty=True)
S=bpy.context.scene
PARTS=[]
COL=None

def material(name, color, metal=0, rough=.6):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    return m
M={
 'skin':material('Warm umber skin',(.40,.205,.11)),
 'dark':material('Dark leather and hair',(.047,.033,.027)),
 'cloth':material('Indigo woven cloth',(.025,.145,.22)),
 'gold':material('Hammered brass',(.72,.43,.115),.72,.32),
 'elephant':material('Elephant warm slate',(.27,.30,.29)),
 'green':material('Banyan jade foliage',(.12,.28,.13)),
 'lightgreen':material('Sunlit new foliage',(.28,.43,.15)),
 'wood':material('Carved teak and bark',(.29,.155,.070)),
 'rock':material('Weathered basalt',(.25,.29,.26)),
 'terracotta':material('Fired terracotta',(.56,.23,.095)),
}
def finish(o,name,mat,smooth=True):
    o.name=name
    for c in list(o.users_collection):c.objects.unlink(o)
    COL.objects.link(o)
    o.data.materials.append(M[mat])
    if hasattr(o.data,'polygons'):
        for p in o.data.polygons:p.use_smooth=smooth
    PARTS.append(o);return o

def ell(name,loc,scale,mat,seg=20,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=loc)
    o=bpy.context.object;o.scale=scale;return finish(o,name,mat)

def box(name,loc,size,mat,bevel=.02):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft carved edges','BEVEL');mod.width=bevel;mod.segments=2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,mat,False)

def tube(name,a,b,r1,r2,mat,n=16):
    a,b=Vector(a),Vector(b);d=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r1,radius2=r2,depth=d.length,location=(a+b)/2)
    o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return finish(o,name,mat)

def curve(name,points,r,mat):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=5;data.bevel_depth=r;data.bevel_resolution=2;data.use_fill_caps=True
    sp=data.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
    for p,co in zip(sp.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,data);COL.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
    bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False)
    return finish(o,name,mat)

def ring(name,loc,major,minor,mat,rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=24,minor_segments=6,location=loc,rotation=rot)
    return finish(bpy.context.object,name,mat)

def mesh(name,verts,faces,mat):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    o=bpy.data.objects.new(name,data);COL.objects.link(o);return finish(o,name,mat,False)

def banner(name,x,y,z,w=.30,h=.55):
    tube(name+' staff',(x,y,.15),(x,y,z+.13),.023,.018,'gold')
    tube(name+' crossbar',(x-w*.1,y,z),(x+w,y,z),.012,.012,'gold')
    mesh(name+' pennant',[(x,y,z),(x+w,y-.025,z),(x+w,y-.01,z-h*.84),(x+w*.5,y-.04,z-h),(x,y,z-h*.84)],[(0,1,2,3,4)],'cloth')
    curve(name+' embroidered border',[(x+.035,y-.025,z-.045),(x+w-.03,y-.045,z-.045),(x+w-.03,y-.03,z-h*.78),(x+w*.5,y-.06,z-h+.035),(x+.035,y-.025,z-h*.78)],.009,'gold')
    ell(name+' sun',(x+w*.5,y-.052,z-h*.4),(.055,.012,.055),'gold',12,8)
    ell(name+' finial',(x,y,z+.13),(.037,.037,.053),'gold',12,8)

def human(role,offset=(0,0,0),scale=1,seated=False):
    start=len(PARTS)
    # Stocky heroic proportions designed to read at a distant isometric camera.
    female=role in ('archer','healer')
    for side in (-1,1):
        x=side*.105
        if seated:
            hip=(side*.11,0,.65);knee=(side*.26,-.05,.40);ankle=(side*.27,.04,.17)
        else:hip=(x,0,.66);knee=(x,-.015,.37);ankle=(x,.015,.095)
        tube('leg_upper_'+str(side),hip,knee,.115,.086,'cloth')
        tube('leg_lower_'+str(side),knee,ankle,.077,.051,'cloth')
        ell('shoe_'+str(side),(ankle[0],ankle[1]-.045,.067),(.076,.133,.067),'dark',16,8)
        for dz in (.11,.16):ring('ankle_wrap',(ankle[0],ankle[1],dz),.057,.009,'gold')
    tube('Tunic flared skirt',(0,0,.51),(0,0,.84),.23,.155,'cloth',24)
    ell('Torso',(0,0,.94),(.21 if not female else .18,.13,.28),'cloth')
    # Gold edging and breast fastening gives readable costume detail.
    ring('Tunic hem',(0,0,.535),.215,.015,'gold')
    ring('Waist belt',(0,0,.82),.159,.025,'dark')
    ell('Belt sun clasp',(0,-.155,.82),(.046,.018,.045),'gold',16,8)
    curve('Crossbody baldric',[(-.155,-.099,1.12),(-.02,-.15,1.01),(.12,-.115,.84)],.032,'gold')
    for side in (-1,1):
        ell('Shoulder armor '+str(side),(side*.204,0,1.091),(.111,.132,.065),'gold',16,8)
        shoulder=(side*.20,0,1.075)
        elbow=(side*.30,-.03,.875)
        hand=(side*.32,-.17,.78)
        if role=='archer' and side==1:elbow=(.32,-.12,1.01);hand=(.44,-.22,1.05)
        if role=='guard' and side==1:elbow=(.32,-.03,.99);hand=(.36,-.15,1.08)
        if role=='engineer' and side==1:elbow=(.30,-.04,.94);hand=(.36,-.15,.94)
        tube('upper_arm_'+str(side),shoulder,elbow,.075,.052,'skin')
        tube('forearm_'+str(side),elbow,hand,.06,.047,'skin')
        mid=Vector(elbow).lerp(Vector(hand),.75)
        tube('Bracer_'+str(side),Vector(elbow).lerp(Vector(hand),.50),hand,.063,.052,'dark')
        ell('hand_'+str(side),hand,(.049,.054,.055),'skin',16,8)
        ell('Bracer rivet_'+str(side),(mid.x,mid.y-.055,mid.z),(.019,.014,.019),'gold',12,8)
    tube('Neck',(0,0,1.15),(0,0,1.27),.069,.069,'skin')
    ell('head',(0,-.012,1.328),(.108,.091,.133),'skin',24,14)
    ell('Nose',(0,-.10,1.31),(.025,.041,.037),'skin',12,8)
    for side in (-1,1):
        ell('Ear',(side*.103,-.002,1.318),(.025,.019,.040),'skin',12,8)
        ell('Eye',(side*.041,-.091,1.34),(.012,.012,.008),'dark',12,8)
        curve('Eyebrow',[(side*.02,-.095,1.363),(side*.042,-.099,1.37),(side*.064,-.084,1.36)],.009,'dark')
    ell('Hair crown',(0,.012,1.411),(.111,.092,.071),'dark',20,10)
    if female:
        ell('Braided hair bun',(0,.090,1.402),(.065,.07,.064),'dark',16,10)
        ring('Bun golden binding',(0,.092,1.42),.047,.008,'gold')
        for side in (-1,1):ring('Earring',(side*.112,-.014,1.286),.019,.005,'gold',(math.pi/2,0,0))
        for i in range(5):ell('Braid',(.065,.11,1.30-i*.058),(.03,.03,.042),'dark',12,8)
    else:
        ell('Turban core',(0,.008,1.43),(.123,.106,.08),'cloth',24,12)
        for z,r in ((1.416,.114),(1.447,.108),(1.473,.082)):ring('Turban wrapped gold braid',(0,.008,z),r,.009,'gold')
        ell('Turban jewel',(0,-.098,1.448),(.026,.014,.038),'gold',16,8)
        if role=='engineer':ell('Trimmed beard',(0,-.04,1.25),(.08,.065,.06),'dark',16,8)
    if role=='guard':
        # Round buckler faces forward and carries a raised solar boss.
        tube('Shield disc',(-.36,-.205,.73),(-.36,-.265,.73),.22,.21,'cloth',32)
        ring('Shield brass rim',(-.36,-.272,.73),.209,.019,'gold',(math.pi/2,0,0))
        ell('Shield central boss',(-.36,-.278,.73),(.07,.035,.07),'gold',20,12)
        for i in range(8):
            a=i*math.tau/8;ell('Shield rivet',(-.36+math.cos(a)*.157,-.282,.73+math.sin(a)*.157),(.014,.008,.014),'gold',8,6)
        tube('Spear shaft',(.36,-.15,.05),(.36,-.15,1.75),.021,.017,'dark')
        tube('Spearhead',(.36,-.15,1.72),(.36,-.15,1.98),.067,0,'gold')
        tube('Spear collar',(.36,-.15,1.63),(.36,-.15,1.74),.03,.03,'gold')
    elif role=='archer':
        curve('Recurve bow',[(.45,-.24,.58),(.53,-.24,.73),(.64,-.24,1.02),(.53,-.24,1.36),(.45,-.24,1.5)],.021,'gold')
        curve('Bowstring',[(.45,-.24,.58),(.43,-.25,1.04),(.45,-.24,1.5)],.003,'dark')
        tube('Nocked arrow',(.20,-.25,1.04),(.84,-.25,1.04),.007,.007,'dark',8)
        tube('Arrowhead',(.83,-.25,1.04),(.91,-.25,1.04),.021,0,'gold',8)
        tube('Quiver',(-.14,.145,.77),(-.20,.17,1.23),.071,.078,'dark')
        for i in range(5):
            x=-.24+i*.023;tube('Stored arrow',(x,.18,1.15),(x-.03,.18,1.43),.006,.006,'gold',8)
            ell('Arrow fletching',(x-.025,.18,1.39),(.011,.020,.050),'cloth',8,6)
    elif role=='engineer':
        tube('Hammer haft',(.36,-.15,.67),(.36,-.15,1.28),.025,.025,'dark')
        box('Siege hammer head',(.36,-.15,1.27),(.30,.13,.13),'gold')
        box('Tool satchel',(-.18,-.09,.68),(.19,.10,.20),'dark')
        box('Satchel buckle',(-.18,-.15,.70),(.057,.019,.043),'gold',.005)
        for i in range(3):tube('Tool handle',(-.24+i*.057,-.10,.76),(-.24+i*.057,-.10,.92),.012,.012,'gold',8)
        # Carried carpenter frame reads as siege equipment from above.
        for x in (-.18,.18):tube('Back frame strut',(x,.20,.72),(x,.20,1.19),.022,.022,'dark')
        tube('Back frame brace',(-.18,.20,1.16),(.18,.20,1.16),.025,.025,'gold')
        tube('Rolled engineering plans',(-.20,.24,.90),(.20,.24,.90),.065,.065,'gold')
    elif role=='healer':
        banner('Raincaller banner',.34,.02,1.81,.33,.53)
        box('Herbalist satchel',(-.22,-.09,.66),(.20,.12,.23),'dark')
        for i in range(3):
            tube('Herb stem',(-.29+i*.06,-.10,.74),(-.29+i*.06,-.10,.94),.007,.004,'gold',8)
            ell('Herbal leaf',(-.30+i*.06,-.10,.89),(.034,.019,.075),'cloth',12,8)
        ell('Potion flask',(-.27,-.17,.69),(.051,.035,.060),'gold',16,10)
    for o in PARTS[start:]:o.location=Vector(offset)+o.location*scale;o.scale*=scale

def horse():
    ell('Horse barrel',(0,0,.95),(.31,.60,.36),'dark',24,14)
    for side in (-1,1):
        for y in (-.34,.36):
            x=side*.22;tube('Horse upper leg',(x,y,.88),(x,y+.03,.45),.10,.064,'dark')
            tube('Horse lower leg',(x,y+.03,.45),(x,y-.02,.10),.052,.041,'dark')
            box('Horse hoof',(x,y-.04,.065),(.13,.17,.13),'gold',.025)
    ell('Horse chest',(0,-.41,1.10),(.265,.27,.35),'dark')
    tube('Horse neck',(0,-.43,1.05),(0,-.63,1.55),.21,.13,'dark',20)
    ell('Horse head',(0,-.73,1.55),(.143,.27,.18),'dark',20,12)
    ell('Horse muzzle',(0,-.93,1.46),(.14,.13,.105),'dark',20,10)
    for side in (-1,1):
        tube('Horse ear',(side*.085,-.64,1.65),(side*.10,-.66,1.87),.054,.005,'dark')
        ell('Horse eye',(side*.131,-.77,1.59),(.014,.024,.024),'gold',12,8)
        curve('Bridle cheek',[(side*.145,-.69,1.67),(side*.15,-.81,1.54),(side*.12,-.95,1.48)],.017,'gold')
        curve('Rein',[(side*.14,-.89,1.49),(side*.28,-.48,1.3),(side*.25,-.16,1.63)],.013,'gold')
        box('Saddlecloth',(side*.285,0,1.0),(.027,.57,.42),'cloth')
        for y in (-.23,.23):tube('Saddlecloth fringe',(side*.30,y,.81),(side*.30,y,.95),.025,.025,'gold')
    ell('Saddle',(0,0,1.27),(.32,.28,.055),'gold',20,10)
    curve('Horse tail',[(0,.53,1.08),(0,.75,.80),(.06,.82,.46)],.066,'dark')
    for i in range(5):ell('Mane',(0,-.43-i*.035,1.24+i*.08),(.075,.09,.07),'gold',12,8)
    human('rider',(0,.03,.76),.85,True)
    tube('Rider lance',(.38,-.02,.63),(.38,-.02,2.44),.022,.018,'dark')
    tube('Rider lance tip',(.38,-.02,2.44),(.38,-.02,2.64),.059,0,'gold')
    mesh('Lance pennant',[(.38,-.02,2.38),(.70,.015,2.26),(.38,-.02,2.17)],[(0,1,2)],'cloth')

def elephant():
    ell('Elephant body',(0,.13,1.49),(.73,.98,.73),'elephant',32,20)
    for x in (-.48,.48):
        for y in (-.47,.67):
            tube('Elephant pillar leg',(x,y,.14),(x,y,1.40),.20,.25,'elephant',20)
            ell('Elephant foot',(x,y-.04,.13),(.225,.245,.13),'elephant',20,12)
            ring('Ankle cuff',(x,y,.30),.202,.035,'gold')
            for dx in (-.10,0,.10):ell('Toe nail',(x+dx,y-.25,.11),(.045,.025,.055),'gold',12,8)
    ell('Elephant head',(0,-.80,1.70),(.48,.47,.56),'elephant',28,18)
    for side in (-1,1):
        ell('Elephant ear',(side*.48,-.69,1.55),(.34,.15,.50),'elephant',24,16)
        curve('Ear edge ornament',[(side*.45,-.84,1.98),(side*.69,-.80,1.83),(side*.72,-.82,1.4),(side*.51,-.85,1.14)],.021,'gold')
        ell('Elephant eye',(side*.30,-1.152,1.83),(.037,.020,.038),'dark',16,8)
        # Curved ivory-like brass tusks are stylized armor, not material imports.
        points=[(side*.29,-1.14,1.39),(side*.40,-1.41,1.19),(side*.46,-1.70,1.30),(side*.43,-1.85,1.45)]
        for i in range(3):tube('Guardian tusk',points[i],points[i+1],.08-i*.023,.057-i*.025,'gold',16)
        box('Embroidered caparison',(side*.718,.16,1.40),(.025,1.3,.79),'cloth',.014)
        for y in (-.42,.02,.46,.75):
            curve('Caparison gold seam',[(side*.74,y,1.80),(side*.74,y,1.10)],.021,'gold')
            ell('Caparison solar ornament',(side*.745,y,1.44),(.015,.095,.095),'gold',12,8)
            tube('Caparison tassel',(side*.735,y,1.10),(side*.735,y,.96),.034,.019,'gold',12)
    curve('Elephant trunk',[(0,-1.14,1.67),(0,-1.36,1.2),(0,-1.45,.72),(.08,-1.47,.32),(.19,-1.54,.43)],.155,'elephant')
    for i in range(6):
        z=1.38-i*.14;curve('Trunk fold',[(-.12,-1.44,z),(0,-1.49,z-.035),(.12,-1.44,z)],.008,'dark')
    ell('Forehead shield',(0,-1.19,1.99),(.24,.045,.30),'gold',24,16)
    ell('Forehead indigo inset',(0,-1.241,2.00),(.135,.018,.17),'cloth',20,12)
    ell('Guardian solar jewel',(0,-1.265,2.02),(.056,.012,.06),'gold',16,10)
    box('Howdah platform',(0,.20,2.16),(1.04,1.16,.12),'gold')
    box('Howdah floor',(0,.20,2.25),(.96,1.05,.10),'cloth')
    for x in (-.43,.43):
        for y in (-.26,.65):
            tube('Howdah column',(x,y,2.26),(x,y,2.87),.035,.03,'gold')
            ell('Column finial',(x,y,2.89),(.059,.059,.063),'gold',12,8)
        for z in (2.40,2.53):tube('Howdah side rail',(x,-.26,z),(x,.65,z),.024,.024,'gold')
    for y in (-.26,.65):tube('Howdah end rail',(-.43,y,2.43),(.43,y,2.43),.025,.025,'gold')
    # Tented canopy with sculpted curved edges.
    mesh('Howdah indigo canopy',[(-.55,-.37,2.85),(.55,-.37,2.85),(.55,.76,2.85),(-.55,.76,2.85),(0,.20,3.10)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],'cloth')
    for p in [(-.55,-.37,2.85),(.55,-.37,2.85),(.55,.76,2.85),(-.55,.76,2.85)]:tube('Canopy golden ribs',p,(0,.20,3.10),.019,.016,'gold')
    ell('Canopy finial',(0,.20,3.14),(.055,.055,.085),'gold',16,8)
    curve('Elephant tail',[(0,1.04,1.65),(0,1.26,1.11),(.08,1.29,.67)],.04,'elephant')
    ell('Tail tuft',(.08,1.29,.64),(.06,.06,.12),'dark',12,8)
    # Includes 2.8 m canopy: entire guardian fits the agreed gameplay height.
    for o in PARTS:o.location*=.87;o.scale*=.87

def foliage(name,loc,scale,light=False):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=loc);o=bpy.context.object;o.scale=scale
    return finish(o,name,'lightgreen' if light else 'green',False)

def banyan():
    tube('Banyan trunk',(0,0,0),(.12,0,2.4),.36,.20,'wood',14)
    for i in range(9):
        a=i*math.tau/9;r=1.25+random.random()*.45;x,y=math.cos(a)*r,math.sin(a)*r
        curve('Banyan branch',[(0,0,1.3),(.5*x,.5*y,2.25),(x,y,2.65)],.085,'wood')
        foliage('Broad banyan crown',(x,y,2.65+random.random()*.3),(.98,.86,.57),i%3==0)
        if i%2==0:
            tube('Aerial root',(x*.8,y*.8,.02),(x*.8,y*.8,2.48),.038,.025,'wood',8)
            tube('Root buttress',(x*.8,y*.8,.27),(x*.95,y*.95,0),.07,.04,'wood',8)
    foliage('Banyan upper crown',(0,0,3.13),(1.45,1.30,.72),True)
    for i in range(7):
        a=i*math.tau/7;tube('Surface root',(0,0,.18),(math.cos(a)*.85,math.sin(a)*.85,.045),.13,.02,'wood',10)

def palm():
    curve('Palm bent trunk',[(0,0,.02),(.05,0,1.1),(.25,.08,2.3),(.35,.10,3.1)],.14,'wood')
    for i in range(12):ring('Palm bark collar',(.35*(i/12)**1.3,.10*i/12,.20+i*.24),.145,.012,'wood')
    center=Vector((.35,.10,3.1))
    for i in range(10):
        a=i*math.tau/10;direction=Vector((math.cos(a),math.sin(a),0));cross=Vector((-math.sin(a),math.cos(a),0))
        end=center+direction*1.7+Vector((0,0,-.7));mid=center+direction*.8+Vector((0,0,.17))
        curve('Palm leaf midrib',[center,mid,end],.018,'wood')
        for j in range(7):
            t=.12+j*.12;p=center+direction*(t*1.7)+Vector((0,0,math.sin(t*math.pi)*.22-t*t*.70))
            width=.29*math.sin(t*math.pi)
            for side in (-1,1):
                v=[p,p+direction*.27+cross*width*side+Vector((0,0,-.12)),p+direction*.32]
                mesh('Palm frond leaflet',v,[(0,1,2)],'lightgreen' if i%3==0 else 'green')
    for i in range(4):ell('Coconut',(.35+.12*math.cos(i*1.7),.10+.12*math.sin(i*1.7),2.91),(.12,.12,.15),'wood',12,8)

def rocks():
    for i in range(6):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=((i%3-1)*.42,(i//3-.5)*.45,.20+(i%2)*.15))
        o=bpy.context.object;o.scale=(.40,.38,.24+(i%2)*.20);o.rotation_euler.z=i*.74;finish(o,'Basalt boulder','rock',False)

def bush():
    for i in range(5):
        a=i*math.tau/5;foliage('River shrub',(math.cos(a)*.24,math.sin(a)*.24,.22),(.31,.30,.30),i%2==0)

def jar(name,x,y,size):
    ell(name+' earthen body',(x,y,size*.34),(size*.25,size*.25,size*.34),'terracotta',20,12)
    tube(name+' neck',(x,y,size*.52),(x,y,size*.74),size*.13,size*.12,'terracotta')
    ring(name+' mouth',(x,y,size*.74),size*.12,size*.025,'terracotta')
    tube(name+' dark opening',(x,y,size*.721),(x,y,size*.723),size*.102,size*.102,'dark')
    ring(name+' neck decoration',(x,y,size*.62),size*.13,size*.015,'wood')

def jars():
    jar('Large storage jar',-.23,0,.90);jar('Small water jar',.28,-.14,.60);jar('Rear vessel',.16,.27,.73)

def cart():
    box('Cart bed',(0,0,.46),(1.13,1.47,.14),'wood')
    for x in (-.51,.51):
        for y in (-.62,.62):tube('Cart corner post',(x,y,.48),(x,y,1.04),.045,.045,'wood')
        for z in (.68,.91):box('Cart sideboard',(x,0,z),(.07,1.45,.16),'wood')
        for y in (-.46,.46):
            ring('Cart wheel rim',(x*1.35,y,.35),.31,.044,'wood',(0,math.pi/2,0))
            tube('Cart wheel hub',(x*1.2,y,.35),(x*1.5,y,.35),.075,.075,'wood')
            for i in range(8):
                a=i*math.tau/8;tube('Cart wheel spoke',(x*1.35,y,.35),(x*1.35,y+.29*math.cos(a),.35+.29*math.sin(a)),.018,.018,'wood',8)
    for x in (-.36,.36):tube('Cart pull shaft',(x,-.45,.44),(x,-1.65,.33),.035,.03,'wood')
    jar('Cargo vessel',-.17,.20,.74)
    for x,y,z in ((.26,-.12,.73),(.24,.35,.73),(-.22,-.35,.76)):ell('Grain sack',(x,y,z),(.20,.22,.27),'lightgreen',16,10)

def setup_scene():
    S.render.engine='CYCLES';S.cycles.device='CPU';S.cycles.samples=16
    S.render.resolution_x=512;S.render.resolution_y=512;S.render.resolution_percentage=100
    S.render.film_transparent=True;S.render.image_settings.file_format='PNG';S.render.image_settings.color_mode='RGBA'
    S.world=bpy.data.worlds.new('Soft studio');S.world.use_nodes=True
    S.world.node_tree.nodes['Background'].inputs[0].default_value=(.35,.43,.52,1)
    S.world.node_tree.nodes['Background'].inputs[1].default_value=.65
    S.view_settings.view_transform='AgX'
    for name,loc,energy,size in [('Key',(-3,-4,7),500,4),('Fill',(4,-1,4),280,3),('Rim',(1,4,5),600,3)]:
        d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size
        o=bpy.data.objects.new(name,d);S.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
    d=bpy.data.cameras.new('Portrait camera');o=bpy.data.objects.new('Portrait camera',d);S.collection.objects.link(o);S.camera=o;d.type='ORTHO'

def process(id,kind,build):
    global PARTS,COL
    PARTS=[];COL=bpy.data.collections.new(id);S.collection.children.link(COL);build()
    # Anchor actual lowest vertex to ground; retain all source components.
    bpy.context.view_layer.update()
    points=[o.matrix_world@v.co for o in PARTS for v in o.data.vertices]
    bottom=min(p.z for p in points)
    for o in PARTS:o.location.z-=bottom
    bpy.context.view_layer.update()
    points=[o.matrix_world@v.co for o in PARTS for v in o.data.vertices]
    lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    # Recenter X/Y envelope so runtime bounding/picking is predictable.
    dx=(lo.x+hi.x)/2;dy=(lo.y+hi.y)/2
    for o in PARTS:o.location.x-=dx;o.location.y-=dy
    # Export joined copy while keeping editable source components.
    bpy.ops.object.select_all(action='DESELECT')
    copies=[]
    for o in PARTS:
        c=o.copy();c.data=o.data.copy();S.collection.objects.link(c);c.select_set(True);copies.append(c)
    bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();joined=bpy.context.object;joined.name=id
    S.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    # Geometry ceiling is enforced instead of relying on a target estimate.
    joined.data.calc_loop_triangles();triangles=len(joined.data.loop_triangles)
    limit=20000 if id=='elephant' else (12000 if kind=='units' else 18000)
    if triangles>limit:
        mod=joined.modifiers.new('Runtime triangle budget','DECIMATE');mod.ratio=limit/triangles*.97;bpy.ops.object.modifier_apply(modifier=mod.name)
    joined.data.calc_loop_triangles();triangles=len(joined.data.loop_triangles)
    out=ROOT/'assets'/kind;out.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(out/(id+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT',export_animations=False)
    bpy.data.objects.remove(joined,do_unlink=True)
    height=hi.z-lo.z;width=max(hi.x-lo.x,hi.y-lo.y)
    S.camera.location=(4,-6,3.5);target=Vector((0,0,height*.50));S.camera.location=target+Vector((4,-6,3.1))*max(height,width)/3
    S.camera.rotation_euler=(target-S.camera.location).to_track_quat('-Z','Y').to_euler();S.camera.data.ortho_scale=max(height*1.28,width*1.2)
    S.render.filepath=str(out/(id+'.png'));bpy.ops.render.render(write_still=True)
    for o in PARTS:o.hide_render=True
    entry={'id':id,'file':id+'.glb','portrait':id+'.png','triangles':triangles,'materials':sorted(set(o.data.materials[0].name for o in PARTS)),'height':round(height,3),'width':round(hi.x-lo.x,3),'depth':round(hi.y-lo.y,3),'root':'feet at origin, +Z forward, +Y up','animation':'static root bobbing' if kind=='units' else 'static'}
    assert triangles<=limit and len(entry['materials'])<=(4 if kind=='units' else 6),entry
    print('ASSET_RESULT '+json.dumps(entry),flush=True)
    return entry

setup_scene()
units=[]
for id in ('guard','archer','engineer','rider','elephant','healer'):
    build=horse if id=='rider' else elephant if id=='elephant' else lambda id=id:human(id)
    units.append(process(id,'units',build))
# Save troops as a usable source lineup with collection/component naming.
for i,id in enumerate(('guard','archer','engineer','rider','elephant','healer')):
    for o in bpy.data.collections[id].objects:o.hide_render=False;o.location.x+=(i-2.5)*3.5
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/units.blend'))
(ROOT/'assets/units/manifest.json').write_text(json.dumps({'authoring':'Original procedural Blender geometry; concept-guided costumes','units':units},indent=2))
for c in list(bpy.data.collections):
    for o in list(c.objects):bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.collections.remove(c)
props=[]
for id,build in [('banyan',banyan),('palm',palm),('rocks',rocks),('bush',bush),('cart',cart),('jars',jars)]:props.append(process(id,'environment',build))
for i,id in enumerate(('banyan','palm','rocks','bush','cart','jars')):
    for o in bpy.data.collections[id].objects:o.hide_render=False;o.location.x+=(i-2.5)*4.5
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/environment.blend'))
(ROOT/'assets/environment/manifest.json').write_text(json.dumps({'authoring':'Original Blender prop kit','props':props},indent=2))
print('BUILD_COMPLETE',flush=True)
