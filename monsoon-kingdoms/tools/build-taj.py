"""Taj-inspired fictional capital and civic buildings. Reuses the existing geometry/export pipeline.
Blender --background --factory-startup --python tools/build-taj.py
Creates only fort tiers, laboratory, hero_hall and gem_mine; preserves other manifest entries.
"""
from pathlib import Path
import json
helper=Path(__file__).with_name('build-buildings.py').read_text()
exec(compile(helper.split('BUILDERS=')[0],str(Path(__file__).with_name('build-buildings.py')),'exec'))
old_manifest=json.loads((OUT/'manifest.json').read_text())
P.update({'marble':(.96,.945,.89),'pearl':(.84,.86,.83),'inlay':(.105,.20,.23),'lapis':(.035,.20,.37),'jade':(.08,.72,.47),'emerald':(.025,.43,.30),'silver':(.76,.83,.83)})
mats[0].node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.59
base_mesh=mesh
angle=0

def mesh(col,v,f,metal=False):
 co=math.cos(angle);si=math.sin(angle)
 base_mesh(col,[(p[0]*co+p[2]*si,p[1],p[2]*co-p[0]*si) for p in v],f,metal)

def lathe(x,y,z,r,h,profile,col='marble',n=32):
 vv=[(x+r*rr*math.cos(i*math.tau/n),y+h*yy,z+r*rr*math.sin(i*math.tau/n)) for yy,rr in profile for i in range(n)]
 faces=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(profile)-1) for i in range(n)]
 faces.extend([tuple(range(n-1,-1,-1)),tuple(range((len(profile)-1)*n,len(profile)*n))]);mesh(col,vv,faces,col=='gold')

def onion(x,y,z,r,h,col='marble',n=32):
 lathe(x,y,z,r,h,[(0,.66),(.075,.76),(.18,.9),(.33,1),(.48,.99),(.63,.87),(.77,.65),(.89,.37),(.97,.12),(1,.02)],col,n)
 # Lotus neck ring and an unmistakable long brass mast.
 cyl(x,y+.015,z,r*.7,.075,'pearl',n);cyl(x,y+h+.09,z,.065,.22,'gold',12);sphere(x,y+h+.22,z,.09,'gold');cyl(x,y+h+.37,z,.043,.28,'gold',12,0)

def arch(x,y,z,w,h,depth=.14,col='marble',shadow=True):
 # Solid pointed arch ring: front/back faces and inner reveal, with a recessed dark opening.
 n=16;r=w/2;spring=h*.58
 path=[(-r,0),(-r,spring)]+[(-r+2*r*i/n,spring+(h-spring)*(1-abs(-1+2*i/n)**1.5)) for i in range(1,n)]+[(r,spring),(r,0)]
 if shadow:
  mesh('inlay',[(x+xx,y+yy,z+.003) for xx,yy in path],[tuple(range(len(path)))])
 thick=w*.07;vv=[]
 for zz in [z,z+depth]:
  for outer in [False,True]:
   vv.extend((x+xx*(1+thick/r) if outer else x+xx,y+yy+(thick if outer else 0),zz) for xx,yy in path)
 nn=len(path);ff=[]
 for i in range(nn-1):ff.extend([(i,i+1,nn+i+1,nn+i),(2*nn+i,3*nn+i,3*nn+i+1,2*nn+i+1),(i,2*nn+i,2*nn+i+1,i+1),(nn+i,nn+i+1,3*nn+i+1,3*nn+i)])
 ff.extend([(0,nn,3*nn,2*nn),(nn-1,3*nn-1,4*nn-1,2*nn-1)]);mesh(col,vv,ff)

def trim_flower(x,y,z,s=.13):
 # Raised pietra-dura-inspired four-petal inlay, purely geometric and original.
 for dx,dy in [(s,0),(-s,0),(0,s),(0,-s)]:
  mesh('inlay',[(x+dx*.35,y+dy*.35,z),(x+dx-dy*.36,y+dy+dx*.36,z),(x+dx*1.6,y+dy*1.6,z),(x+dx+dy*.36,y+dy-dx*.36,z)],[(0,1,2,3)])
 mesh('gold',[(x-s*.29,y,z+.005),(x,y+s*.29,z+.005),(x+s*.29,y,z+.005),(x,y-s*.29,z+.005)],[(0,1,2,3)],True)

def marble_base(size):
 part('01 Inlaid marble podium and reflecting gardens');box(0,.08,0,size,.16,size,'pearl',.06);box(0,.19,0,size-.14,.10,size-.14,'marble',.025)
 for zz in [-(size-.30)/2,(size-.30)/2]:box(0,.245,zz,size-.4,.015,.065,'inlay')
 for xx in [-(size-.30)/2,(size-.30)/2]:box(xx,.245,0,.065,.015,size-.4,'inlay')

def chhatri(x,y,z,r=.5):
 part('05 Marble chhatris and open arcades');cyl(x,y,z,r*1.12,.14,'marble',16)
 for k in range(8):
  a=k*math.tau/8;xx=x+r*.76*math.cos(a);zz=z+r*.76*math.sin(a);cyl(xx,y+.36,zz,.042,.62,'marble',8)
 cyl(x,y+.69,z,r*1.19,.12,'marble',20);onion(x,y+.76,z,r*1.03,r*1.13,n=24)

def minaret(x,z,tier):
 part('06 Four slender tiered minarets');cyl(x,.41,z,.43,.34,'marble',16)
 for y0,y1,r in [(.55,2.05,.255),(2.15,3.67,.232),(3.77,5.18,.208)]:
  cyl(x,(y0+y1)/2,z,r,y1-y0,'marble',16,r*.92)
  for yy in [y0+.10,y1-.07]:cyl(x,yy,z,r*1.075,.065,'inlay',16)
 for yy,r in [(2.09,.37),(3.72,.34),(5.23,.32)]:
  cyl(x,yy,z,r,.12,'marble',16);cyl(x,yy+.12,z,r*.98,.13,'pearl',16)
  for k in range(8):
   a=k*math.tau/8;cyl(x+r*.9*math.cos(a),yy+.27,z+r*.9*math.sin(a),.023,.23,'marble',6)
  cyl(x,yy+.395,z,r,.06,'gold' if tier>=3 else 'marble',16)
 for k in range(8):
  a=k*math.tau/8;cyl(x+.205*math.cos(a),5.71,z+.205*math.sin(a),.035,.49,'marble',8)
 cyl(x,5.98,z,.31,.11,'marble',16);onion(x,6.05,z,.30,.37,n=20)


def capital(tier):
 global angle
 marble_base(7.6)
 # Thin symmetric green beds remain below the monument, avoiding a bulky fortress silhouette.
 for x in [-1.8,1.8]:
  for z in [-2.94,2.94]:box(x,.265,z,1.65,.065,.58,'leaf');box(x,.31,z,1.48,.03,.40,'leaf2')
 for z in [-3.20,3.20]:box(0,.266,z,.55,.035,.69,'water')
 part('02 Chamfered marble mausoleum volume');box(0,.49,0,5.16,.49,5.16,'marble',.13)
 # Octagonal plan with clipped corners is characteristic and exposes side iwans in isometric views.
 shape=[(-1.70,-2.25),(1.70,-2.25),(2.25,-1.70),(2.25,1.70),(1.70,2.25),(-1.70,2.25),(-2.25,1.70),(-2.25,-1.70)]
 vv=[(x,yy,z) for yy in [.73,3.1] for x,z in shape];mesh('marble',vv,[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]+[tuple(range(8,16))])
 for y in [.81,2.91,3.14]:box(0,y,0,4.56,.075,4.56,'pearl',.06)
 for side in range(4):
  angle=side*math.pi/2;part('03 Symmetrical recessed pointed iwans')
  # Tall principal portal plus paired two-storey smaller arches.
  arch(0,.75,2.265,1.18,2.04,.15)
  for x in [-1.63,1.63]:
   for y in [.83,1.91]:arch(x,y,2.265,.57,.83,.07)
  for x in [-.78,.78]:box(x,1.89,2.30,.039,2.20,.03,'inlay')
  box(0,3.02,2.30,1.61,.039,.03,'inlay')
  for x in [-.86,.86]:
   for y in [1.01,1.55,2.12,2.64]:trim_flower(x,y,2.33,.065)
  for x in [-2.10,2.10]:cyl(x,1.94,2.08,.07,2.40,'marble',12);finial(x,3.2,2.08,.1)
  part('04 Geometric marble inlay and balustrades')
  for i in range(13):
   x=-2.13+i*.355;box(x,3.26,2.24,.15,.21,.10,'marble',.015)
   if tier>=2:trim_flower(x,.62,2.60,.065)
  if tier>=3:
   for x in [-1.2,0,1.2]:finial(x,3.37,2.26,.10)
 angle=0
 part('05 Central drum and great onion dome');cyl(0,3.39,0,1.03,.51,'marble',40);cyl(0,3.66,0,1.13,.10,'pearl',40)
 for i in range(24):
  a=i*math.tau/24;xx=1.035*math.cos(a);zz=1.035*math.sin(a);cyl(xx,3.39,zz,.018,.34,'inlay',6)
 onion(0,3.75,0,1.39,1.98,'marble',48)
 if tier>=2:
  # Petal crown and contrasting gold collar identify the upgrade without changing the footprint.
  cyl(0,3.74,0,1.05,.075,'gold',40)
  for i in range(16):
   a=i*math.tau/16;beam((.51*math.cos(a),5.41,.51*math.sin(a)),(.13*math.cos(a),5.68,.13*math.sin(a)),.024,'gold')
 if tier>=3:
  for i in range(16):
   a=i*math.tau/16;finial(1.06*math.cos(a),3.76,1.06*math.sin(a),.062)
 for x in [-1.69,1.69]:
  for z in [-1.69,1.69]:chhatri(x,3.24,z,.47)
 for x in [-3.11,3.11]:
  for z in [-3.11,3.11]:minaret(x,z,tier)
 # A readable ceremonial staircase on the +Z entrance.
 part('01 Inlaid marble podium and reflecting gardens')
 for i in range(3):box(0,.29+i*.10,2.87-i*.16,1.29,.10,.34,'marble',.014)


def ring3(center,r,normal,c='gold',tube=.042):
 p=Vector(center);normal=Vector(normal).normalized();u=normal.cross(Vector((0,1,0)))
 if u.length<.01:u=normal.cross(Vector((1,0,0)))
 u.normalize();v=normal.cross(u);n=48;k=6;vv=[]
 for i in range(n):
  radial=u*math.cos(i*math.tau/n)+v*math.sin(i*math.tau/n)
  for j in range(k):vv.append(tuple(p+radial*(r+tube*math.cos(j*math.tau/k))+normal*tube*math.sin(j*math.tau/k)))
 mesh(c,vv,[(i*k+j,((i+1)%n)*k+j,((i+1)%n)*k+(j+1)%k,i*k+(j+1)%k) for i in range(n) for j in range(k)],c=='gold')

def laboratory():
 global angle
 plinth(5.6);part('02 Royal observatory arcades');box(-.76,.57,-.43,3.58,.6,3.71,'sand',.05)
 for x in [-2.20,.64]:
  for z in [-1.95,1.05]:post(x,.88,z,1.88,'sand')
 for z in [-1.95,1.05]:arch(-.78,.94,z,2.6,1.75,.14,'sand',False)
 box(-.78,2.86,-.43,3.24,.15,3.39,'trim',.03)
 part('03 Brass armillary celestial sphere');cyl(-.78,3.09,-.43,.55,.30,'sand',20);cyl(-.78,3.48,-.43,.09,.6,'gold',12)
 center=(-.78,4.22,-.43)
 for normal,r in [((0,1,0),1.00),((1,.32,0),1.03),((0,.47,1),1.06)]:ring3(center,r,normal,tube=.042)
 sphere(*center,.26,'blue');beam((-.78,3.22,-.43),(-.78,5.26,-.43),.035,'gold');finial(-.78,5.3,-.43,.12)
 for i in range(12):
  a=i*math.tau/12;beam((-.78+.91*math.cos(a),4.22,-.43+.91*math.sin(a)),(-.78+1.09*math.cos(a),4.22,-.43+1.09*math.sin(a)),.022,'gold')
 part('04 Manuscript desks and measuring instruments');box(1.72,.72,.58,1.27,.12,1.10,'wood2',.035)
 for x in [1.22,2.22]:
  for z in [.16,1.0]:post(x,.27,z,.41)
 box(1.7,.80,.6,.81,.035,.72,'cream')
 for zz in [.27,.92]:rod((1.24,.84,zz),(2.14,.84,zz),.072,'cream',12)
 for i in range(5):box(1.68,.825,.40+i*.08,.56,.008,.012,'inlay')
 cyl(1.75,.75,-1.38,.65,.84,'sand',16);cyl(1.75,1.19,-1.38,.71,.07,'trim',20);beam((1.75,1.24,-1.38),(1.75,1.80,-1.38),.04,'gold')
 for i in range(12):
  a=i*math.tau/12;sphere(1.75+.52*math.cos(a),1.25,-1.38+.52*math.sin(a),.028,'gold')
 stairs(-.75,2.22,1.22,4,.15,.24);banner(-.78,2.54,1.17,.57,.57)
 jar(2.1,.28,1.88,.24)

def hero_hall():
 plinth(5.6);part('02 Royal hero pavilion');box(0,.53,-.25,4.60,.51,3.58,'sand',.07)
 for x in [-1.96,-.67,.67,1.96]:
  for z in [-1.66,1.17]:post(x,.80,z,2.04,'sand')
 for x in [-1.34,0,1.34]:arch(x,.9,1.17,1.11,1.82,.13,'sand',False)
 roof(0,2.98,-.25,5.06,4.02,.90)
 pavilion(0,3.81,-.25,1.35,.72,'teal')
 part('03 Commander shield and crossed blades');cyl(0,.91,-.15,.57,.25,'stone',16);cyl(0,1.19,-.15,.43,.36,'gold',16)
 # Original armoured commander effigy: three-dimensional figure, shield and spear.
 for x in [-.14,.14]:rod((x,1.35,-.15),(x,1.85,-.12),.11,'dark',10)
 rod((0,1.77,-.12),(0,2.22,-.12),.26,'gold',12,.20);sphere(0,2.43,-.12,.21,'gold');cyl(0,2.56,-.12,.24,.12,'gold',12)
 rod((-.19,2.13,-.12),(-.38,1.91,.16),.08,'gold',8);rod((.2,2.12,-.12),(.45,2.11,.02),.08,'gold',8)
 rod((-.38,1.97,.13),(-.38,1.97,.23),.32,'blue',16);rod((-.38,1.97,.23),(-.38,1.97,.28),.10,'gold',12)
 beam((.47,1.31,.04),(.47,2.93,.04),.035,'gold');cyl(.47,3.02,.04,.083,.23,'silver',6,0)
 part('04 Ceremonial standards and warrior emblems')
 for x in [-2.31,2.31]:
  beam((x,.28,1.97),(x,3.2,1.97),.045,'gold');finial(x,3.22,1.97,.12);banner(x,2.45,2.0,.55,1.01,'blue')
 stairs(0,2.56,1.70,4,.13,.23)
 for x in [-1.7,1.7]:jar(x,.28,2.05,.25)

def crystal(x,y,z,r,h,c='jade',lean=.0):
 n=6;v=[]
 for yy,rr,shift in [(0,r*.8,0),(.72*h,r,lean*.72),(.9*h,r*.72,lean*.9),(h,0,lean)]:
  v.extend((x+shift+rr*math.cos(i*math.tau/n),y+yy,z+rr*math.sin(i*math.tau/n)) for i in range(n))
 mesh(c,v,[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(3) for i in range(n)])

def gem_mine():
 plinth(3.6);part('02 Quartz outcrop and emerald veins')
 for x,z,r,h in [(-.98,-.79,.76,1.23),(.2,-.65,1.03,1.67),(1.08,-.52,.58,.95)]:sphere(x,.56,z,r,'dark',(1,h/r,.86))
 for x,z,r,h,l in [(-.96,-.83,.25,1.66,-.15),(-.41,-1.10,.32,2.44,.1),(.36,-.87,.29,2.00,.27),(1.05,-.58,.25,1.74,.10),(.96,.47,.18,1.15,.1),(-1.24,.38,.19,1.12,-.13)]:crystal(x,.28,z,r,h,'jade' if x<0 else 'emerald',l)
 part('03 Timber adit and ore hoist');arch(0,.29,.39,.85,1.24,.12,'wood2')
 for x in [-.60,.60]:box(x,1.04,.38,.19,1.58,.22,'wood2',.025)
 box(0,1.76,.38,1.52,.22,.31,'wood2',.025);beam((-.67,1.8,.38),(.73,1.8,.38),.07,'gold')
 for x in [-.24,.24]:box(x,.31,.89,.065,.06,1.56,'dark')
 for z in [.36,.73,1.1,1.47]:box(0,.295,z,.79,.07,.10,'wood')
 part('04 Mine trolley with cut gemstones');box(0,.61,1.02,.77,.15,.76,'wood2',.03)
 for x in [-.43,.43]:wheel(x,.52,1.02,.26)
 for x in [-.40,.40]:box(x,.85,1.02,.07,.45,.77,'dark')
 for z in [.64,1.4]:box(0,.85,z,.8,.45,.06,'dark')
 for x,z in [(-.20,.91),(.17,1.04),(0,1.20)]:crystal(x,.81,z,.13,.46,'jade',.04)
 beam((1.27,.3,.36),(1.27,2.08,.36),.085,'wood2');beam((1.27,2.08,.36),(.66,2.08,.75),.09,'wood2');beam((.74,2.05,.70),(.74,1.05,.70),.022,'cream');jar(.74,.70,.70,.18)

BUILDERS={'fort':lambda:capital(1),'fort_2':lambda:capital(2),'fort_3':lambda:capital(3),'laboratory':laboratory,'hero_hall':hero_hall,'gem_mine':gem_mine}
# Use the established two-material exporter and CPU render setup without changing the original generator.
exporter='collections={};manifest=[]'+helper.split('collections={};manifest=[]',1)[1]
exporter=exporter.replace("assets/blender/buildings.blend","assets/blender/taj-and-civic.blend").replace("['cannon','archer_tower']","['cannon','archer_tower','gem_mine']")
exporter=exporter.replace('max(size[0]*1.5,size[1]*1.5,h*1.45,2.1)','max(size[0]*1.70,size[1]*1.70,h*1.50,2.1)')
exec(compile(exporter,'reused-building-export-pipeline','exec'))
new_entries={item['id']:item for item in manifest}
merged=[new_entries.pop(item['id'],item) for item in old_manifest['assets']]+list(new_entries.values())
old_manifest['assets']=merged;old_manifest['capital']='Original Taj Mahal-inspired fantasy capital; editable source assets/blender/taj-and-civic.blend'
(OUT/'manifest.json').write_text(json.dumps(old_manifest,indent=2)+'\n')
(OUT/'taj-and-civic-manifest.json').write_text(json.dumps({'assets':manifest,'source':'assets/blender/taj-and-civic.blend'},indent=2)+'\n')
