"""Original Monsoon Kingdoms architectural kit. Blender --background --factory-startup --python tools/build-buildings.py
Editable component collections; export batches to two vertex-color material meshes.
Coordinates use Three.js X/Y-up/Z, meters. No textures or external assets.
"""
import bpy,bmesh,math,random,json,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'assets/buildings'; OUT.mkdir(parents=True,exist_ok=True)
random.seed(70906)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
 if c.name!='Collection':bpy.data.collections.remove(c)
P={'stone':(.38,.39,.35),'dark':(.20,.25,.24),'sand':(.70,.56,.34),'trim':(.83,.70,.43),'roof':(.68,.30,.15),'roof2':(.83,.40,.20),'wood':(.35,.22,.11),'wood2':(.52,.34,.17),'blue':(.06,.25,.42),'teal':(.07,.40,.43),'gold':(.92,.67,.23),'leaf':(.24,.42,.15),'leaf2':(.46,.60,.21),'grain':(.81,.70,.29),'water':(.10,.50,.55),'black':(.08,.11,.12),'cream':(.88,.79,.58),'red':(.68,.17,.13)}
def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
mats=[]
for name,rough,metal in [('Pigmented mineral, timber and textile',.81,0),('Handworked brass and iron',.38,.58)]:
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';m.node_tree.links.new(vc.outputs['Color'],p.inputs['Base Color']);mats.append(m)
parts={};active='';current=None

def cv(p):return (p[0],-p[2],p[1])
def part(name):
 global active
 active=name

def mesh(col,v,f,metal=False):
 key=(active,1 if metal else 0);pv,pf,pc=parts.setdefault(key,[[],[],[]]);off=len(pv);pv.extend(cv(p) for p in v);pf.extend(tuple(off+i for i in face) for face in f)
 rgb=P[col] if isinstance(col,str) else col
 # Small component-to-component stone/wood pigment variation survives batching.
 shade=random.uniform(.93,1.04);pc.extend([tuple(linear(min(1,c*shade)) for c in rgb)+(1,)]*len(v))
def box(x,y,z,w,h,d,c='stone',bevel=0):
 v=[(x+sx*w/2,y+sy*h/2,z+sz*d/2) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1),(-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)]];f=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
 if bevel:
  bm=bmesh.new();vv=[bm.verts.new(p) for p in v]
  for ff in f:bm.faces.new([vv[i] for i in ff])
  bmesh.ops.bevel(bm,geom=list(bm.edges),offset=min(bevel,w*.18,h*.18,d*.18),segments=1,affect='EDGES');bm.verts.ensure_lookup_table();bm.verts.index_update();v=[tuple(p.co) for p in bm.verts];f=[tuple(p.index for p in q.verts) for q in bm.faces];bm.free()
 mesh(c,v,f,c=='gold')
def rod(a,b,r,c='wood',n=10,r2=None):
 a=Vector(a);b=Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,1,0)))
 if u.length<.01:u=axis.cross(Vector((0,0,1)))
 u.normalize();v=axis.cross(u);r2=r if r2 is None else r2;vv=[tuple(p+rr*(u*math.cos(i*math.tau/n)+v*math.sin(i*math.tau/n))) for p,rr in [(a,r),(b,r2)] for i in range(n)]
 mesh(c,vv,[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]+[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))],c=='gold')
def cyl(x,y,z,r,h,c='stone',n=12,r2=None):rod((x,y-h/2,z),(x,y+h/2,z),r,c,n,r2)
def dome(x,y,z,r,h,c='roof',n=20,rings=6):
 vv=[(x+r*math.cos(j/rings*math.pi/2)*math.cos(i*math.tau/n),y+h*math.sin(j/rings*math.pi/2),z+r*math.cos(j/rings*math.pi/2)*math.sin(i*math.tau/n)) for j in range(rings+1) for i in range(n)]
 mesh(c,vv,[(j*n+i,(j+1)*n+i,(j+1)*n+(i+1)%n,j*n+(i+1)%n) for j in range(rings) for i in range(n)])
def sphere(x,y,z,r,c='leaf',scale=(1,1,1)):
 vv=[];faces=[];n=6 if r<.07 else 8 if r<.2 else 10;rings=3 if r<.07 else 4 if r<.2 else 6
 for j in range(rings+1):
  for i in range(n):
   a=i*math.tau/n;b=j*math.pi/rings;vv.append((x+math.sin(b)*math.cos(a)*r*scale[0],y+math.cos(b)*r*scale[1],z+math.sin(b)*math.sin(a)*r*scale[2]))
 for j in range(rings):
  for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 mesh(c,vv,faces)
def plinth(s):
 part('01 Masonry foundations');box(0,.09,0,s,.18,s,'dark',.07);box(0,.21,0,s-.14,.12,s-.14,'sand',.04)
def stairs(x,z,width,steps,raiseBy=.16,depth=.23):
 for i in range(steps):box(x,.28+(i+1)*raiseBy/2,z-i*depth,width,(i+1)*raiseBy,depth+.02,'sand',.02)
def beam(a,b,r=.075,c='wood'):rod(a,b,r,c,8)
def roof(x,y,z,w,d,h=.8,c='roof',tiles=True):
 part('04 Segmented clay roof and ridge')
 # Four hip roof slopes, individually thick tiles rather than a plane.
 vv=[(x-w/2,y,z-d/2),(x+w/2,y,z-d/2),(x+w/2,y,z+d/2),(x-w/2,y,z+d/2),(x-w*.23,y+h,z),(x+w*.23,y+h,z)]
 mesh(c,vv,[(0,4,5,1),(3,2,5,4),(0,3,4),(1,5,2)])
 if tiles:
  rows=max(3,int(d/.34));cols=max(5,int(w/.32))
  for side in [-1,1]:
   for r in range(rows):
    t=(r+.5)/rows;zz=z+side*d*.5*(1-t);yy=y+h*t+.035;length=w*(1-.52*t)
    for j in range(cols):
     xx=x-length/2+(j+.5)*length/cols;hh=.075;dw=length/cols*.94;dd=d*.5/rows*1.03
     v=[(xx+sx*dw/2,yy+sy*hh/2-h*side*sz*dd/d*2,zz+sz*dd/2) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1),(-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)]]
     mesh(c if (j+r)%3 else 'roof2',v,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)])
  for side in [-1,1]:
   for r in range(5):
    t=(r+.5)/5;xx=x+side*w*(.5-.27*t);yy=y+h*t+.03;length=d*(1-t)
    for j in range(max(1,int(length/.3))):
     count=max(1,int(length/.3));zz=z-length/2+(j+.5)*length/count
     box(xx,yy,zz,w*.27/5*.95,.085,length/count*.94,c if (r+j)%3 else 'roof2')
 beam((x-w*.25,y+h+.09,z),(x+w*.25,y+h+.09,z),.10,'trim')
 for xx in [x-w*.25,x+w*.25]:finial(xx,y+h+.15,z,.13)
def finial(x,y,z,r=.17):
 cyl(x,y+r*.3,z,r,.12,'gold');sphere(x,y+r*1.1,z,r,'gold',(.75,1,.75));cyl(x,y+r*2.1,z,r*.45,r*.9,'gold',10,0)
def post(x,y,z,h,c='wood'):
 box(x,y+h/2,z,.13,h,.13,c,.018)
 for yy in [y+.1,y+h-.1]:box(x,yy,z,.22,.13,.22,'trim',.02)
def door(x,y,z,w=.85,h=1.4):
 part('03 Recessed teak gates and brass hardware');box(x,y+h/2,z,w,h,.09,'black')
 for i in range(5):box(x-w*.44+i*w*.22,y+h*.45,z+.07,w*.19,h*.9,.08,'wood2',.014)
 for dx in [-w*.58,w*.58]:box(x+dx,y+h*.48,z+.09,.15,h*1.08,.18,'sand',.018)
 for yy in [.28,.69]:box(x,y+h*yy,z+.13,w*.94,.06,.05,'gold')
 for i in range(11):
  a=i*math.pi/10;xx=x+math.cos(a)*w*.57;yy=y+h*.98+math.sin(a)*w*.33
  box(xx,yy,z+.11,w*.17,.16,.21,'trim',.012)
def banner(x,y,z,w=.48,h=.9,c='blue'):
 part('06 Indigo banners and brass insignia');box(x,y,z,w,h,.045,c,.01);beam((x-w*.65,y+h*.5,z),(x+w*.65,y+h*.5,z),.035,'gold')
 for dx in [-w*.39,w*.39]:box(x+dx,y,z+.03,.025,h*.94,.025,'gold')
 cyl(x,y,z+.05,.10,.045,'gold',8) if False else None
 # Diamond emblem: raised solid, visible at play distance.
 mesh('gold',[(x,y+.17,z+.034),(x+.1,y,z+.034),(x,y-.17,z+.034),(x-.1,y,z+.034),(x,y,z+.065)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],True)
def parapet(x,y,z,w,d):
 box(x,y,z,w,.22,d,'trim',.022)
 nx=max(2,int(w/.5));nz=max(2,int(d/.5))
 for i in range(nx):
  xx=x-w/2+(i+.5)*w/nx
  for zz in [z-d/2+.12,z+d/2-.12]:box(xx,y+.22,zz,.29,.34,.28,'stone',.025)
 for i in range(1,nz-1):
  zz=z-d/2+(i+.5)*d/nz
  for xx in [x-w/2+.12,x+w/2-.12]:box(xx,y+.22,zz,.28,.34,.29,'stone',.025)
def masonry(x,y,z,w,h,d):
 part('02 Basalt walls and sandstone courses');box(x,y,z,w,h,d,'stone',.055)
 # Raised courses and joints give simple real relief without texture uploads.
 rows=max(2,int(h/.38));cols=max(3,int(w/.5))
 for j in range(rows):
  yy=y-h/2+(j+.5)*h/rows
  for i in range(cols):
   xx=x-w/2+(i+.5)*w/cols
   for zz in [z-d/2-.012,z+d/2+.012]:box(xx,yy,zz,w/cols-.032,h/rows-.037,.06,'stone')
 for j in range(rows):
  yy=y-h/2+(j+.5)*h/rows
  for i in range(max(2,int(d/.6))):
   count=max(2,int(d/.6));zz=z-d/2+(i+.5)*d/count
   for xx in [x-w/2-.012,x+w/2+.012]:box(xx,yy,zz,.06,h/rows-.037,d/count-.032,'stone')
 for yy in [y-h*.44,y+h*.43]:box(x,yy,z,w+.09,.12,d+.09,'sand',.02)
def pavilion(x,y,z,s=1.2,h=1.3,c='roof'):
 part('05 Carved chhatri pavilion');box(x,y,z,s,.16,s,'sand',.025)
 for dx in [-s*.36,s*.36]:
  for dz in [-s*.36,s*.36]:post(x+dx,y+.06,z+dz,h,'sand')
 roof(x,y+h,z,s*1.25,s*1.25,s*.42,c,False);dome(x,y+h+s*.2,z,s*.52,s*.46,c);cyl(x,y+h+.06,z,s*.67,.10,'trim',20);finial(x,y+h+s*.64,z,.15)
def jar(x,y,z,r=.25,c='roof'):
 part('08 Cargo pottery and storage');sphere(x,y+r*.78,z,r,c,(1,1.23,1));cyl(x,y+r*1.78,z,r*.51,r*.34,c,12);cyl(x,y+r*1.96,z,r*.61,.055,'trim',12);cyl(x,y+r*2.0,z,r*.40,.025,'black',12)
def sacks(x,y,z,rows=2):
 for i in range(rows):
  for j in range(3-i):sphere(x+j*.37+i*.15,y+.19+i*.25,z,.23,'grain',(1.05,.75,.85))
def fence(x,z,w):
 part('07 Timber railings and access')
 for dx in [-w/2,0,w/2]:post(x+dx,.28,z,.72)
 for yy in [.58,.87]:box(x,yy,z,w,.09,.085,'wood2',.01)
def wheel(x,y,z,r=.53):
 # wheel oriented YZ with raised rim and eight solid spokes.
 part('08 Cart wheels and cargo');n=16;vs=[]
 for xx in [x-.065,x+.065]:
  for rr in [r*.77,r]:
   vs.extend((xx,y+rr*math.cos(i*math.tau/n),z+rr*math.sin(i*math.tau/n)) for i in range(n))
 fs=[]
 for i in range(n):
  j=(i+1)%n;fs.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(n+i,n+j,3*n+j,3*n+i),(i,2*n+i,2*n+j,j)])
 mesh('wood',vs,fs)
 for i in range(8):
  a=i*math.tau/8;beam((x,y,z),(x,y+r*.85*math.cos(a),z+r*.85*math.sin(a)),.045,'wood2')
 rod((x-.12,y,z),(x+.12,y,z),r*.20,'gold',12)
def cart(x,z):
 box(x,.70,z,1.03,.16,1.45,'wood2',.02)
 for xx in [x-.54,x+.54]:wheel(xx,.61,z,.48)
 for i in range(4):
  for xx in [x-.51,x+.51]:box(xx,.92+i*.15,z,.07,.105,1.48,'wood2',.008)
 for xx in [x-.4,x+.4]:beam((xx,.70,z+.65),(xx,.60,z+1.8),.055)
 sacks(x-.25,.85,z,2)
def canopy(x,y,z,w,d,c='blue'):
 part('05 Woven canopy and timber supports')
 for dx in [-w*.45,w*.45]:
  for dz in [-d*.44,d*.44]:post(x+dx,.3,z+dz,y-.3)
 # Thick curved fabric strips and hanging valance; never camera-facing.
 n=10;v=[]
 for zz in [-d/2,d/2]:
  for i in range(n+1):
   t=i/n;v.append((x-w/2+t*w,y+.32*math.sin(math.pi*t),z+zz))
 mesh(c,v,[(i,i+1,n+2+i,n+1+i) for i in range(n)])
 for i in range(n):
  xx=x-w/2+(i+.5)*w/n
  for zz in [-d/2,d/2]:box(xx,y-.08,z+zz,w/n*.99,.20,.055,c,.015)
 for dx in [-w*.5,0,w*.5]:beam((x+dx,y+.32*(dx==0),z-d*.52),(x+dx,y+.32*(dx==0),z+d*.52),.025,'gold')

def fort(tier=1):
 plinth(7.6);masonry(0,1.22,0,6.85,1.9,6.85);parapet(0,2.25,0,7.02,7.02)
 for x in [-2.82,2.82]:
  for z in [-2.82,2.82]:
   masonry(x,1.45,z,1.35,2.34,1.35);parapet(x,2.72,z,1.5,1.5)
   if tier>=2:pavilion(x,2.94,z,.92,.80,'roof' if tier==2 else 'teal')
 masonry(0,2.88,-.30,4.7,1.25,4.2)
 for x in [-1.8,-.9,0,.9,1.8]:
  post(x,2.3,2.07,1.46,'sand');box(x,3.4,2.07,.50,.22,.30,'sand',.025)
 roof(0,3.74,-.15,5.18,4.7,1.0,'roof')
 pavilion(0,4.65,-.15,1.62,1.04,'roof' if tier<3 else 'teal')
 if tier==3:
  pavilion(0,6.00,-.15,1.04,.84,'teal');finial(0,7.62,-.15,.18)
  for x in [-1.7,1.7]:dome(x,4.03,-1.6,.48,.55,'gold');finial(x,4.58,-1.6,.11)
 door(0,.28,3.48,1.2,1.62);stairs(0,3.65,1.58,2,.14,.17)
 for x in [-2.05,2.05]:banner(x,1.4,3.52,.52,1.24)
 for x in [-1.1,1.1]:banner(x,3.0,2.23,.38,.75)
 for i in range(4):jar(-3.18+i*.35,.28,-1.7,.15)

def farm():
 plinth(5.6);part('02 Irrigated paddy beds')
 for x in [-1.9,-.75,.4]:
  box(x,.30,.55,.99,.13,3.8,'dark',.04);box(x,.38,.55,.89,.035,3.6,'water')
  for zz in [-1.1,-.65,-.2,.25,.7,1.15,1.6,2.05]:
   for dx in [-.27,0,.27]:
    xx=x+dx;hh=random.uniform(.40,.66);beam((xx,.37,zz),(xx,.37+hh,zz),.022,'leaf2')
    for s in [-1,1]:
     beam((xx,.57,zz),(xx+s*.14,.68+hh*.2,zz+.06),.017,'leaf');sphere(xx+s*.05,.38+hh,zz,.055,'grain',(.9,2.3,.9))
 part('03 Farmer tool shed');box(1.78,1.05,-1.6,1.45,1.5,1.52,'cream',.03);door(1.78,.3,-.80,.65,1.05);roof(1.78,1.88,-1.6,1.85,1.9,.45)
 fence(0,-2.53,4.8);fence(0,2.50,4.8)
 for z in [-.1,.65]:jar(1.94,.3,z,.24)
 beam((1.36,.30,.1),(1.36,1.70,.1),.06);box(1.36,1.60,.1,.63,.08,.17,'dark',.02)

def lumber():
 plinth(5.6);part('02 Sawmill raised timber floor');box(-.7,.45,-.55,3.65,.32,3.3,'wood',.04)
 for x in [-2.2,-1.7,-1.2,-.7,-.2,.3,.8]:box(x,.64,-.55,.45,.08,3.25,'wood2',.012)
 for x in [-2.22,.83]:
  for z in [-1.9,.85]:post(x,.65,z,1.95)
 roof(-.7,2.65,-.55,3.75,3.45,.7)
 part('03 Stacked teak logs and chopping block')
 for row in range(3):
  for i in range(4-row):
   z=.75+i*.39+row*.18;y=.50+row*.34;rod((1.18,y,z),(2.28,y,z),.19,'wood',12);rod((2.28,y,z),(2.30,y,z),.15,'sand',12)
 cyl(-1.4,.94,.05,.52,.55,'wood',14);cyl(-1.4,1.225,.05,.48,.025,'sand',14)
 beam((-1.4,1.22,.05),(-1.05,2.0,.05),.055);box(-1.10,1.82,.05,.44,.32,.09,'dark',.04)
 # Vertical frame saw and workbench.
 box(.15,1.03,-1.35,1.3,.16,.62,'wood2',.025)
 for x in [-.35,.65]:post(x,.28,-1.35,.72)
 for y in [1.34,2.0]:box(.2,y,-1.55,.65,.055,.055,'wood')
 for x in [-.12,.52]:box(x,1.67,-1.55,.055,.71,.055,'wood')
 box(.22,1.67,-1.55,.035,.66,.05,'cream');cart(.18,.92)

def mine():
 plinth(5.6);part('02 Ore outcrop and mine mouth')
 for x,z,r,h in [(-1.5,-1.4,1.2,1.4),(-.2,-1.58,1.8,2.3),(1.55,-1.4,1.1,1.8)]:sphere(x,.28+h*.44,z,r,'dark',(.85,h/r,.67))
 box(0,1.10,-.34,1.6,1.66,.15,'black');door(0,.3,-.24,1.52,1.6)
 for x in [-1,1]:box(x,1.22,-.12,.32,1.9,.45,'wood2',.04)
 box(0,2.12,-.12,2.4,.34,.54,'wood2',.04);banner(0,1.96,.18,.46,.31)
 for x in [-.44,.44]:box(x,.34,1.06,.075,.07,2.50,'dark')
 for z in [0,.43,.86,1.29,1.72,2.15]:box(0,.31,z,1.18,.08,.13,'wood')
 cart(0,.92)
 for x,z in [(-1.85,.55),(1.7,.5),(2,1.6),(-1.9,1.8)]:
  sphere(x,.54,z,.39,'stone',(1,.8,1));sphere(x+.12,.73,z,.14,'gold')
 # Windlass gantry and ore basket.
 for x in [1.35,2.2]:post(x,.28,-1.45,2.42)
 beam((1.22,2.62,-1.45),(2.39,2.62,-1.45),.09);rod((1.38,1.76,-1.45),(2.18,1.76,-1.45),.2,'wood2',12);beam((1.76,2.60,-1.45),(1.76,.9,-1.45),.025,'cream');jar(1.76,.3,-1.45,.32)

def granary():
 plinth(5.6);part('02 Raised grain storage platform')
 for x in [-1.8,0,1.8]:
  for z in [-1.65,1.5]:post(x,.28,z,.88)
 box(0,1.10,0,4.25,.22,3.55,'wood2',.035)
 for x in [-1.94,1.94]:
  for z in [-1.52,1.52]:post(x,1.2,z,1.67)
 box(0,1.87,-1.46,3.83,1.36,.13,'wood',.025)
 for x in [-1.86,1.86]:box(x,1.82,0,.13,1.24,2.96,'wood',.025)
 for x in [-1.65,-.5,.65]:sacks(x,1.24,.48,3)
 roof(0,2.95,0,4.85,4.06,.86);stairs(0,2.59,1.13,5,.17,.23)
 for x in [-2.25,2.25]:jar(x,.28,1.6,.33)
 banner(-1.60,2.01,1.64,.39,.76);banner(1.60,2.01,1.64,.39,.76)
 fence(0,-1.67,4.1)

def stepwell():
 plinth(5.6);part('02 Descending stone terraces and water');box(0,.30,0,3.75,.05,3.75,'water')
 # Terraces rise outward, leaving the center genuinely open.
 for i in range(6):
  size=2.25+i*.43;hh=.16;yy=.39+i*.16
  for z in [-size/2,size/2]:box(0,yy,z,size+.27,hh,.29,'sand',.012)
  for x in [-size/2,size/2]:box(x,yy,0,.29,hh,size-.25,'sand',.012)
 for x in [-2.3,2.3]:
  for z in [-2.3,2.3]:pavilion(x,1.31,z,.68,.80)
 for z in [-2.49,2.49]:
  for x in [-1.40,-.75,0,.75,1.4]:post(x,1.19,z,.38,'sand')
  box(0,1.62,z,3.9,.1,.16,'trim',.02)
 for x in [-2.49,2.49]:
  for z in [-1.4,-.75,0,.75,1.4]:post(x,1.19,z,.38,'sand')
  box(x,1.62,0,.16,.1,3.9,'trim',.02)
 for x,z in [(1.6,1.6),(-1.6,-1.6)]:jar(x,1.23,z,.19)

def barracks():
 plinth(5.6);masonry(0,1.28,-.6,4.1,1.9,3.17);roof(0,2.35,-.6,4.65,3.76,.75);door(0,.28,1.02,1.0,1.62)
 for x in [-1.51,1.51]:banner(x,1.5,1.07,.43,.90)
 part('07 Weapon racks and training shields')
 for x in [-1.95,1.75]:
  for dx in [-.5,.5]:post(x+dx,.28,1.8,.90)
  for y in [.6,1.08]:box(x,y,1.8,1.2,.075,.12,'wood2')
  for dx in [-.36,0,.36]:
   beam((x+dx,.30,1.8),(x+dx,1.8,1.72),.033,'wood');cyl(x+dx,1.89,1.715,.085,.24,'cream',6,0)
 for x in [-1.95,1.95]:
  rod((x,.88,2.03),(x,.88,2.12),.31,'blue',16);rod((x,.88,2.12),(x,.88,2.16),.09,'gold',12)
 jar(-2.2,.28,-2.05,.26)

def camp():
 plinth(5.6);part('02 Command tent thick canvas panels')
 # Teal ridge tent, open entry and raised gold ropes.
 mesh('teal',[(-2,.3,-1.85),(2,.3,-1.85),(-2,.3,1.4),(2,.3,1.4),(0,2.66,-1.85),(0,2.66,1.4)],[(0,4,5,2),(1,3,5,4),(0,1,4)])
 for x in [-1,1]:mesh('blue',[(x*2,.3,1.4),(0,2.66,1.4),(x*.56,.3,1.4)],[(0,1,2)])
 for z in [-1.85,1.4]:post(0,.3,z,2.49);finial(0,2.8,z,.13)
 for x in [-2.38,2.38]:
  for z in [-2.14,1.73]:beam((x,.28,z),(x*.83,1.03,z*.8),.024,'cream');cyl(x,.39,z,.065,.28,'wood')
 banner(0,2.01,1.46,.5,.58);box(0,.32,.6,1.1,.06,1.25,'red')
 part('07 Campfire and provision crates')
 for i in range(8):
  a=i*math.tau/8;sphere(math.cos(a)*.40,.36,2.02+math.sin(a)*.4,.14,'stone',(.95,.7,.8))
 for i in [-1,1]:beam((-.27,.39,2.02+i*.2),(.27,.39,2.02-i*.2),.07,'wood')
 for x,z in [(-1.8,1.95),(1.8,1.95)]:jar(x,.28,z,.22)

def archer_tower():
 plinth(3.6);masonry(0,1.60,0,2.20,2.64,2.2);parapet(0,2.99,0,2.68,2.68)
 for x in [-1.15,1.15]:
  for z in [-1.15,1.15]:post(x,3.1,z,1.32)
 canopy(0,4.48,0,2.88,2.8,'blue')
 # Remove full-length canopy support to retain stone silhouette; shared supports are slender.
 part('07 Ladder and bow rack')
 for x in [-.38,.38]:beam((x,.29,1.53),(x,3.14,1.22),.055,'wood2')
 for i in range(10):
  y=.45+i*.27;z=1.53-(y-.29)/2.85*.31;beam((-.4,y,z),(.4,y,z),.045,'wood2')
 banner(-.75,1.95,1.14,.48,1.2);beam((0,4.73,0),(0,5.5,0),.035,'gold');banner(.28,5.25,.03,.5,.35)
 for x in [-.75,.75]:
  for i in range(9):
   a=-math.pi*.40+i*math.pi*.8/9;b=-math.pi*.40+(i+1)*math.pi*.8/9;beam((x+.2*math.cos(a),3.55+.42*math.sin(a),.8),(x+.2*math.cos(b),3.55+.42*math.sin(b),.8),.025,'gold')
  beam((x+.06,3.15,.8),(x+.06,3.95,.8),.012,'cream')

def cannon():
 plinth(3.6);part('02 Fortified artillery platform');cyl(0,.39,0,1.42,.27,'stone',16);cyl(0,.55,0,1.28,.08,'sand',16)
 box(0,.88,0,1.5,.24,1.56,'wood2',.05)
 for x in [-.74,.74]:wheel(x,.93,-.05,.62)
 part('03 Cast bronze cannon and reinforcing bands');a=(0,1.26,-.92);b=(0,1.7,1.17);rod(a,b,.30,'dark',20,.24)
 axis=(Vector(b)-Vector(a)).normalized()
 for t in [.06,.23,.68,.94]:
  p=Vector(a).lerp(Vector(b),t);rod(p-axis*.065,p+axis*.065,.33 if t<.5 else .28,'gold',20)
 rod(Vector(b),Vector(b)+axis*.018,.197,'black',20);rod(Vector(a)-axis*.14,Vector(a),.19,'gold',16)
 for x in [-1.2,1.2]:
  for z in [-1.13,-.70]:sphere(x,.42,z,.17,'dark')
 banner(0,.84,1.53,.70,.38)

def wall():
 plinth(1.86);masonry(0,1.04,0,1.78,1.58,.92);parapet(0,1.92,0,1.85,1.1)
 for x in [-.71,.71]:box(x,1.12,.50,.22,1.63,.24,'sand',.025)
 banner(0,1.19,.50,.41,.78)

def market():
 plinth(5.6);part('02 Bazaar raised sandstone terrace');box(0,.34,0,4.8,.16,4.8,'sand',.04)
 canopy(-1.26,2.30,-.6,2.19,3.02,'blue');canopy(1.25,2.03,-.4,2.12,2.65,'teal')
 part('07 Counters baskets and produce')
 for x in [-1.25,1.25]:
  box(x,.79,.31,1.72,.77,.68,'wood',.04);box(x,1.23,.30,1.88,.10,.82,'wood2',.025)
  for dx in [-.6,-.3,0,.3,.6]:
   for zz in [.1,.38]:sphere(x+dx,1.35,zz,.10,'grain' if x<0 else 'red')
  for dx in [-.50,0,.5]:jar(x+dx,.43,-1.1,.20)
 for x in [-2.2,-1.65,1.65,2.2]:jar(x,.43,1.70,.26)
 banner(-1.26,1.94,1.0,.50,.52);banner(1.25,1.66,1.0,.5,.40)
 sacks(-.48,.43,1.9,2)

def ornament():
 part('01 Brass royal upgrade standard');cyl(0,.06,0,.28,.12,'sand',12);cyl(0,.67,0,.045,1.3,'gold');finial(0,1.36,0,.17);banner(.32,1.06,.015,.55,.55)

BUILDERS={'fort':lambda:fort(1),'fort_2':lambda:fort(2),'fort_3':lambda:fort(3),'farm':farm,'lumber':lumber,'mine':mine,'granary':granary,'stepwell':stepwell,'barracks':barracks,'camp':camp,'archer_tower':archer_tower,'cannon':cannon,'wall':wall,'market':market,'upgrade_ornament':ornament}
collections={};manifest=[]
for asset,build in BUILDERS.items():
 parts={};build();coll=bpy.data.collections.new(asset);bpy.context.scene.collection.children.link(coll);collections[asset]=coll
 for (name,mi),(v,f,colors) in parts.items():
  me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();attr=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');attr.data.foreach_set('color',[c for rgba in colors for c in rgba]);me.materials.append(mats[mi]);ob=bpy.data.objects.new(name,me);coll.objects.link(ob)
 # Normalize XZ center and ground once before source and export; building remains within contract footprint.
 verts=[ob.matrix_world@v.co for ob in coll.objects for v in ob.data.vertices];mn=Vector(tuple(min(v[i] for v in verts) for i in range(3)));mx=Vector(tuple(max(v[i] for v in verts) for i in range(3)));offset=Vector(((mn.x+mx.x)/2,(mn.y+mx.y)/2,mn.z))
 for ob in coll.objects:
  for v in ob.data.vertices:v.co-=offset
 coll['description']='Original editable Monsoon Kingdoms '+asset.replace('_',' ');coll['world_units']='meters; export +Y up';coll.hide_render=True
 print('BUILT',asset,len(coll.objects),flush=True)
# Render setup: CPU Cycles avoids first-time Metal shader compilation.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.world.color=(.35,.35,.35)
scene.view_settings.view_transform='AgX'
def area(name,location,energy,size):
 data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=location;ob.rotation_euler=(Vector((0,0,1.5))-ob.location).to_track_quat('-Z','Y').to_euler()
area('Key softbox',(4,-6,10),1300,7);area('Cool sky fill',(-6,-1,6),900,8);area('Rim sunlight',(1,6,9),1200,5)
data=bpy.data.cameras.new('Isometric asset camera');camera=bpy.data.objects.new('Isometric asset camera',data);scene.collection.objects.link(camera);scene.camera=camera;data.type='ORTHO';data.lens=48
look=Vector((0,0,3.0));camera.location=look+Vector((10,-13,12));camera.rotation_euler=(look-camera.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=11.6
for screen in bpy.data.screens:
 for area_item in screen.areas:
  if area_item.type=='VIEW_3D':
   area_item.spaces.active.region_3d.view_distance=16;area_item.spaces.active.region_3d.view_location=look;area_item.spaces.active.region_3d.view_rotation=camera.rotation_euler.to_quaternion()
for key,c in collections.items():c.hide_viewport=(key!='fort');c.hide_render=(key!='fort')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/buildings.blend'))
for c in collections.values():c.hide_viewport=False;c.hide_render=True
for asset,coll in collections.items():
 bpy.ops.object.select_all(action='DESELECT');export_objs=[]
 for ob in coll.objects:
  cp=ob.copy();cp.data=ob.data.copy();scene.collection.objects.link(cp);export_objs.append(cp)
 # Two GPU draw calls at most while source keeps individually editable components.
 merged=[]
 batches=[[o for o in export_objs if o.data.materials[0]==mats[mi]] for mi in range(2)]
 for mi,obs in enumerate(batches):
  if not obs:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in obs:o.select_set(True)
  bpy.context.view_layer.objects.active=obs[0]
  if len(obs)>1:bpy.ops.object.join()
  ob=bpy.context.object;ob.name=asset+('_brass' if mi else '_structure');merged.append(ob)
 bpy.ops.object.select_all(action='DESELECT')
 for ob in merged:ob.select_set(True)
 target=OUT/(asset+'.glb');bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_materials='EXPORT',export_yup=True,export_apply=True,export_cameras=False,export_lights=False)
 tris=0
 for ob in merged:ob.data.calc_loop_triangles();tris+=len(ob.data.loop_triangles)
 vv=[v.co for ob in merged for v in ob.data.vertices];size=[max(v[i] for v in vv)-min(v[i] for v in vv) for i in range(3)]
 manifest.append({'id':asset,'file':'assets/buildings/'+asset+'.glb','preview':'assets/buildings/'+asset+'.png','triangles':tris,'meshes':len(merged),'bytes':target.stat().st_size,'size':[round(size[0],4),round(size[2],4),round(size[1],4)],'footprint':[4,4] if asset.startswith('fort') else [2,2] if asset in ['cannon','archer_tower'] else [1,1] if asset in ['wall','upgrade_ornament'] else [3,3]})
 for ob in merged:bpy.data.objects.remove(ob,do_unlink=True)
 coll.hide_render=False;h=size[2];look=Vector((0,0,h*.42));camera.location=look+Vector((10,-13,12));camera.rotation_euler=(look-camera.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=max(size[0]*1.5,size[1]*1.5,h*1.45,2.1);scene.render.filepath=str(OUT/(asset+'.png'))
 if '--no-render' not in sys.argv:bpy.ops.render.render(write_still=True)
 coll.hide_render=True;print('EXPORTED',asset,tris,flush=True)
(OUT/'manifest.json').write_text(json.dumps({'format':'GLB 2.0','authoring':'Original procedural solid geometry, Blender','coordinates':'meters, +Y up, centered XZ, ground Y=0','materials':'Shared vertex colors: mineral/timber/textile + metal; no texture payload','assets':manifest},indent=2)+'\n')
print('BUILDINGS COMPLETE',flush=True)
