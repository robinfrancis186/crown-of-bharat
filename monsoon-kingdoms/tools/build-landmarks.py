"""Original game-scale Indian landmark architecture. No source textures or copied meshes.
Architectural references: UNESCO Red Fort https://whc.unesco.org/en/list/231/
UNESCO Qutb Minar https://whc.unesco.org/en/list/233/
Rajasthan Tourism Hawa Mahal https://www.tourism.rajasthan.gov.in/hawa-mahal.html
Run Blender --background --factory-startup --python tools/build-landmarks.py.
Reuses existing geometry/export helpers; replaces only barracks, archer_tower, market.
"""
from pathlib import Path
import json
source=Path(__file__).with_name('build-taj.py').read_text()
exec(compile(source.split('\nBUILDERS=',1)[0],'existing-architectural-helpers','exec'))
small_arch_source=source[source.index('def arch('):source.index('\ndef trim_flower')].replace('def arch(', 'def small_arch(').replace('n=16;r=', 'n=8;r=')
exec(compile(small_arch_source,'small-window-arch-helper','exec'))
P.update({'redstone':(.66,.29,.18),'redlight':(.80,.39,.24),'redshade':(.47,.20,.14),'rose':(.88,.47,.37),'rose2':(.96,.59,.44),'ivory':(.93,.85,.67),'qutb':(.65,.37,.23),'qutbdark':(.39,.23,.16)})


def merlon(x,y,z,w=.25,d=.23,c='redstone'):
 box(x,y+.10,z,w,.20,d,c,.01)
 mesh(c,[(x-w/2,y+.2,z-d/2),(x+w/2,y+.2,z-d/2),(x+w/2,y+.2,z+d/2),(x-w/2,y+.2,z+d/2),(x-w*.25,y+.36,z-d*.40),(x+w*.25,y+.36,z-d*.40),(x+w*.25,y+.36,z+d*.40),(x-w*.25,y+.36,z+d*.40)],[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)])

def little_pavilion(x,y,z,r=.48,c='marble'):
 part('05 Carved chhatri towers');cyl(x,y,z,r*1.10,.13,'redlight',16)
 for i in range(8):
  a=i*math.tau/8;xx=x+math.cos(a)*r*.8;zz=z+math.sin(a)*r*.8;cyl(xx,y+.36,zz,.035,.63,'redstone',8)
 cyl(x,y+.73,z,r*1.18,.12,'ivory',20);onion(x,y+.8,z,r*1.10,r*1.1,c,24)


def red_fort():
 global angle
 plinth(5.6);part('01 Red sandstone parade court');box(0,.32,0,5.22,.15,4.96,'sand',.04)
 # Deep enclosing walls and real open courtyard rather than one solid cube.
 part('02 Massive Red Fort curtain walls')
 for x in [-2.26,2.26]:
  box(x,1.14,-.30,.44,1.66,3.92,'redstone',.045)
  for z in [-2.08,-1.6,-1.12,-.64,-.16,.32,.80,1.28]:merlon(x,1.97,z,.37,.28)
 for z in [-2.12,1.64]:
  box(0,1.16,z,4.84,1.69,.45,'redstone',.04)
  for i in range(12):merlon(-2.17+i*.395,2.01,z,.26,.3)
 for y in [.51,.99,1.54,1.92]:
  for x in [-2.51,2.51]:box(x,y,-.30,.055,.047,3.98,'redlight')
  box(0,y,1.90,4.84,.047,.05,'redlight')
 # Tall gatehouse flanked by octagonal bastions, a deliberate Lahori Gate silhouette.
 part('03 Ceremonial gatehouse and recessed iwans');box(0,1.90,1.31,2.03,3.16,1.41,'redstone',.055)
 arch(0,.37,2.03,1.16,2.30,.19,'redlight')
 for x in [-.72,.72]:box(x,1.84,2.10,.055,2.63,.04,'ivory')
 box(0,3.19,2.10,1.50,.05,.04,'ivory')
 for x in [-1.66,1.66]:
  cyl(x,1.86,1.26,.71,3.05,'redstone',8)
  for yy in [.43,.66,1.28,2.32,3.24]:cyl(x,yy,1.26,.75,.12,'redlight',8)
  for k in range(12):
   a=k*math.tau/12;merlon(x+.65*math.cos(a),3.37,1.26+.65*math.sin(a),.22,.23)
  arch(x,1.10,1.976,.46,.93,.08,'redlight');arch(x,2.16,1.976,.46,.83,.08,'redlight')
  little_pavilion(x,3.48,1.26,.56)
 # The gate gallery carries five light domed kiosks rather than a generic pitched roof.
 part('04 Cusped gallery and roofline');box(0,3.50,1.32,2.20,.15,1.49,'redlight',.025)
 for x in [-.88,-.44,0,.44,.88]:
  for z in [1.03,1.64]:cyl(x,3.89,z,.035,.66,'ivory',8)
 for x in [-.66,-.22,.22,.66]:arch(x,3.55,1.64,.32,.52,.05,'ivory',False)
 box(0,4.25,1.32,2.24,.13,1.51,'ivory',.035)
 for x in [-.86,-.43,0,.43,.86]:
  dome(x,4.33,1.32,.225,.28,'marble',12,4);cyl(x,4.66,1.32,.032,.16,'gold',8,0)
 # Inner reception hall, drill area and weapons establish the gameplay barracks function.
 part('06 Inner army court and reception pavilion');box(0,.72,-1.04,2.77,.73,1.54,'redstone',.045)
 for x in [-1.13,-.56,0,.56,1.13]:arch(x,.86,-.235,.38,.80,.07,'ivory')
 roof(0,1.82,-1.04,3.04,1.95,.58,'roof')
 for x in [-1.28,1.28]:
  for dx in [-.25,0,.25]:beam((x+dx,.40,-.08),(x+dx,1.50,-.10),.026,'wood');cyl(x+dx,1.58,-.1,.065,.18,'silver',6,0)
  box(x,.86,-.04,.75,.065,.12,'wood2')
 for x in [-1.02,1.02]:banner(x,1.27,2.10,.36,.69)
 stairs(0,2.52,1.30,2,.14,.16)


def fluted_shaft(y0,y1,r0,r1,col,angular=False):
 n=64;v=[]
 for y,r in [(y0,r0),(y1,r1)]:
  for i in range(n):
   a=i*math.tau/n;wave=(1 if i%4==0 else .1 if i%4==2 else .55) if angular else (.5+.5*math.cos(a*16))
   rr=r*(1+.067*wave);v.append((rr*math.cos(a),y,rr*math.sin(a)))
 mesh(col,v,[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]+[tuple(range(n,2*n))])

def qutb_band(y,r,col='ivory'):
 cyl(0,y,0,r,.09,col,48)
 for i in range(24):
  a=i*math.tau/24;rr=r+.014;x=rr*math.cos(a);z=rr*math.sin(a)
  # Geometric carved glyph rhythm, not reproductions of sacred text.
  rod((x,y-.07,z),(x,y+.07,z),.012,'qutbdark',4)

def balcony(y,r):
 part('04 Projecting carved balconies and corbel supports')
 cyl(0,y-.14,0,r*.84,.13,'redlight',48,r);cyl(0,y,0,r,.12,'ivory',48);cyl(0,y+.11,0,r*.99,.10,'redlight',48)
 for i in range(20):
  a=i*math.tau/20;x=r*.88*math.cos(a);z=r*.88*math.sin(a)
  rod((x,y+.15,z),(x,y+.44,z),.035,'redstone',8)
  # Radial solid corbels beneath the overhang.
  u=Vector((math.cos(a),0,math.sin(a)));t=Vector((-math.sin(a),0,math.cos(a)));base=Vector((0,y,0));verts=[]
  for side in [-1,1]:
   for rr,dy in [(r*.76,-.42),(r*.96,-.09),(r*.76,-.09)]:verts.append(tuple(base+u*rr+Vector((0,dy,0))+t*.05*side))
  mesh('redstone',verts,[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)])
 cyl(0,y+.47,0,r,.065,'ivory',48)

def qutub_tower():
 plinth(3.6);part('01 Octagonal tower platform');cyl(0,.42,0,1.32,.31,'qutbdark',16);cyl(0,.62,0,1.21,.13,'ivory',32)
 levels=[(.69,2.57,1.035,.875,'qutb',False),(2.75,4.03,.852,.728,'redstone',False),(4.23,5.29,.705,.590,'qutb',True),(5.50,6.38,.575,.479,'marble',False),(6.59,7.37,.465,.365,'redlight',False)]
 for index,(y0,y1,r0,r1,col,angular) in enumerate(levels):
  part('02 Fluted tapering storey '+str(index+1));fluted_shaft(y0,y1,r0,r1,col,angular)
  for yy in [y0+.13,y0+(y1-y0)*.64,y1-.1]:
   rr=r0+(r1-r0)*(yy-y0)/(y1-y0);qutb_band(yy,rr*1.07,'ivory' if index>=3 else 'redlight')
  balcony(y1,r1+.19)
 part('05 Crown platform and archer fittings');cyl(0,7.95,0,.57,.14,'ivory',32)
 for i in range(12):
  a=i*math.tau/12;merlon(.43*math.cos(a),8.02,.43*math.sin(a),.14,.14,'redstone')
 arch(0,.69,1.091,.50,1.06,.10,'ivory')
 # Arrow quiver and bows sit on the open upper firing gallery.
 for z in [-.20,.20]:
  for i in range(4):beam((-.22+i*.07,7.52,z),(-.22+i*.07,8.16,z),.015,'wood')
 beam((.25,7.75,.25),(.25,8.63,.25),.026,'gold');banner(.43,8.37,.27,.32,.33)
 part('06 Adjacent carved gateway remains');arch(1.14,.32,.81,.45,1.18,.14,'redlight',False)
 for x in [-1.34,-.88]:post(x,.29,.89,1.12,'sand')
 box(-1.11,1.43,.89,.79,.12,.29,'redlight',.02)


def jharokha(x,y,z,w=.52,h=.62):
 part('03 Projecting jharokha bay windows and jali')
 # A faceted solid projecting bay, its deep arch and modeled ivory lattice.
 box(x,y+h*.51,z-.06,w*.94,h*1.05,.20,'rose2')
 small_arch(x,y+.08,z+.045,w*.58,h*.73,.045,'ivory')
 for dx in [-.11,0,.11]:box(x+dx*w/.52,y+h*.39,z+.10,.016,h*.46,.021,'ivory')
 for yy in [y+h*.22,y+h*.40,y+h*.56]:box(x,yy,z+.107,w*.57,.017,.022,'ivory')
 box(x,y+.035,z+.035,w*1.14,.075,.37,'ivory')
 for dx in [-w*.45,w*.45]:box(x+dx,y+h*.25,z+.19,.034,h*.34,.05,'ivory')
 box(x,y+h*.43,z+.19,w*.97,.035,.05,'ivory')
 # Each bay has a rounded Bengali-style hood and a tiny pointed apex.
 dome(x,y+h*1.07,z-.015,w*.64,h*.21,'rose2',8,3);cyl(x,y+h*1.32,z-.015,.025,.12,'ivory',6,0)


def hawa_market():
 global angle
 plinth(5.6);part('01 Bazaar terrace and marble borders');box(0,.31,0,5.32,.12,4.90,'sand',.035)
 rows=[7,7,7,5,3];pitch=.65;storey=.88
 for row,count in enumerate(rows):
  y=.41+row*storey;width=count*pitch+.20;part('02 Five-storey stepped pink sandstone facade')
  box(0,y+storey*.48,-.57,width,storey,1.98,'rose',.04)
  for yy in [y+.02,y+storey-.04]:box(0,yy,-.57,width+.13,.065,2.05,'ivory',.015)
  for i in range(count):
   x=(i-(count-1)/2)*pitch;front=.445+.085*(1-abs(x)/2.3);jharokha(x,y+.10,front,.52,.64)
  # Side elevations are modeled too, so the landmark survives camera rotation.
  for side in [-1,1]:
   angle=side*math.pi/2
   for xx in [side*.03,side*.60,side*1.19]:
    small_arch(xx,y+.18,width/2+.009,.28,.49,.045,'ivory')
    for dx in [-.065,.065]:box(xx+dx,y+.35,width/2+.068,.017,.29,.022,'ivory')
   angle=0
 part('04 Crown-like scalloped roofline')
 for x,y in [(-2.03,3.12),(2.03,3.12),(-1.38,4.00),(1.38,4.00),(-.69,4.88),(0,4.98),(.69,4.88)]:
  cyl(x,y,-.57,.23,.26,'rose2',12);dome(x,y+.15,-.57,.31,.24,'rose2',16,4);finial(x,y+.40,-.57,.065)
 # Ground-floor shop counters make the fantasy-market function visible at zoom.
 part('05 Merchant counters pottery and produce')
 for x in [-1.65,1.65]:
  box(x,.67,1.65,1.18,.60,.72,'wood',.03);box(x,1.01,1.65,1.31,.08,.83,'wood2',.025)
  for dx in [-.42,-.21,0,.21,.42]:
   for z in [1.45,1.73]:sphere(x+dx,1.10,z,.08,'grain' if x<0 else 'red')
  for dx in [-.52,.52]:jar(x+dx,.37,2.16,.17)
 arch(0,.40,.598,.54,.80,.08,'ivory');banner(0,1.82,.62,.34,.43,'blue')
 for z in [1.10,1.42,1.74,2.06]:box(0,.39,z,.65,.04,.21,'ivory')

BUILDERS={'barracks':red_fort,'archer_tower':qutub_tower,'market':hawa_market}
exporter='collections={};manifest=[]'+helper.split('collections={};manifest=[]',1)[1]
exporter=exporter.replace('assets/blender/buildings.blend','assets/blender/landmarks.blend').replace("key!='fort'","key!='barracks'").replace('max(size[0]*1.5,size[1]*1.5,h*1.45,2.1)','max(size[0]*1.65,size[1]*1.65,h*1.44,2.1)')
exec(compile(exporter,'existing-export-pipeline','exec'))
new_entries={a['id']:a for a in manifest}
old_manifest['assets']=[new_entries.pop(a['id'],a) for a in old_manifest['assets']]+list(new_entries.values())
landmarks={'barracks':{'inspiration':'Red Fort, Delhi','source':'https://whc.unesco.org/en/list/231/','features':['red sandstone curtain walls','octagonal bastions','deep pointed iwans','crenellations','five-domed gate gallery','open parade court']},'archer_tower':{'inspiration':'Qutb Minar, Delhi','source':'https://whc.unesco.org/en/list/233/','features':['five tapering fluted storeys','projecting carved balconies','radial corbels','contrasting sandstone and marble bands'],'projectileOrigin':[0,7.8,0]},'market':{'inspiration':'Hawa Mahal, Jaipur','source':'https://www.tourism.rajasthan.gov.in/hawa-mahal.html','features':['five-storey stepped facade','29 projecting jharokhas','modeled lattice screens','scalloped pink crown','merchant counters']}}
for a in old_manifest['assets']:
 if a['id'] in landmarks:a.update(landmarks[a['id']]);a['blendSource']='assets/blender/landmarks.blend'
(OUT/'manifest.json').write_text(json.dumps(old_manifest,indent=2)+'\n')
(OUT/'landmarks-manifest.json').write_text(json.dumps({'source':'assets/blender/landmarks.blend','interpretation':'Original fictional strategy-game scale interpretations, not surveys or accurate reconstructions','assets':[a for a in old_manifest['assets'] if a['id'] in landmarks]},indent=2)+'\n')
assert all(a['triangles']<=25000 and a['meshes']<=4 for a in manifest)
