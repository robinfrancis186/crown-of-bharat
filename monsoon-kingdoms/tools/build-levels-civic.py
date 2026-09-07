"""Fourteen structural civic upgrades per family, preserving existing level1 assets.
Blender -b --factory-startup --python-exit-code 1 --python tools/build-levels-civic.py
Optional --no-render exports geometry/source only. Coordinates use existing Y-up helpers.
"""
from pathlib import Path
import json,hashlib,struct,sys,time
if '--optimize' in sys.argv:
 from concurrent.futures import ThreadPoolExecutor
 import subprocess
 root=Path(__file__).resolve().parents[1];manifest_path=root/'assets/buildings/levels/civic-manifest.json';manifest=json.loads(manifest_path.read_text())
 def optimize(entry):
  if entry['level']==1:return
  path=root/entry['file'];temporary=path.with_suffix('.compact.glb')
  subprocess.run(['npx','--offline','--yes','@gltf-transform/cli@4.5.0','quantize',str(path),str(temporary),'--pattern','{NORMAL,COLOR_*}'],check=True,capture_output=True)
  temporary.replace(path);entry['bytes']=path.stat().st_size
 with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(optimize,manifest['levels']))
 manifest['optimization']='glTF Transform4.5.0; NORMAL and COLOR attributes quantized; exact float32 positions retained; no external decoder'
 manifest_path.write_text(json.dumps(manifest,indent=2)+'\n');print('CIVIC OPTIMIZED70 MODELS',flush=True)
if '--sheets' in sys.argv:
 from PIL import Image,ImageDraw,ImageFont
 import textwrap
 root=Path(__file__).resolve().parents[1]
 manifest=json.loads((root/'assets/buildings/levels/civic-manifest.json').read_text())
 font=ImageFont.truetype(str(root/'assets/fonts/Manrope-Variable.ttf'),16)
 title=ImageFont.truetype(str(root/'assets/fonts/SpaceGrotesk-Variable.ttf'),22)
 for family in manifest['families']:
  entries=[x for x in manifest['levels'] if x['family']==family]
  assert [x['level'] for x in entries]==list(range(1,16))
  board=Image.new('RGB',(1600,1236),'#152320');draw=ImageDraw.Draw(board)
  for index,entry in enumerate(entries):
   x=(index%5)*320;y=(index//5)*412
   draw.rounded_rectangle((x+5,y+5,x+315,y+405),12,fill='#20332e',outline='#526454')
   draw.text((x+15,y+13),f"LEVEL {entry['level']:02d}",font=title,fill='#efc879')
   image=Image.open(root/entry['preview']).convert('RGBA');assert image.size==(512,512)
   image.thumbnail((300,290),Image.Resampling.LANCZOS);board.paste(image,(x+(320-image.width)//2,y+45+(290-image.height)//2),image)
   for line,text in enumerate(textwrap.wrap(entry['structuralChange'],32)[:3]):draw.text((x+14,y+346+line*20),text,font=font,fill='#f4f4e9')
  path=root/f'assets/buildings/levels/{family}/contact-sheet.png';board.save(path)
  print('CIVIC CONTACT',family,'15 levels',flush=True)
 sys.exit(0)
if '--optimize' in sys.argv:sys.exit(0)
source=Path(__file__).with_name('build-taj.py').read_text()
exec(compile(source.split('\nBUILDERS=',1)[0],'existing-civic-geometry-helpers','exec'))
OUT=ROOT/'assets/buildings/levels';OUT.mkdir(parents=True,exist_ok=True)
base_part=part;milestone='Core civic architecture'
def part(name):base_part(milestone+' | '+name)
def stage(level,label):
 global milestone
 milestone=f'{level:02d} {label}';part(label)
def ring(center,r,normal=(0,1,0),c='gold',tube=.035,n=24):
 p=Vector(center);normal=Vector(normal).normalized();u=normal.cross(Vector((0,1,0)))
 if u.length<.01:u=normal.cross(Vector((1,0,0)))
 u.normalize();v=normal.cross(u);k=5;vv=[]
 for i in range(n):
  radial=u*math.cos(i*math.tau/n)+v*math.sin(i*math.tau/n)
  for j in range(k):vv.append(tuple(p+radial*(r+tube*math.cos(j*math.tau/k))+normal*tube*math.sin(j*math.tau/k)))
 mesh(c,vv,[(i*k+j,((i+1)%n)*k+j,((i+1)%n)*k+(j+1)%k,i*k+(j+1)%k) for i in range(n) for j in range(k)],c=='gold')
def rotate_build(a,fn):
 global angle
 old=angle;angle=a;fn();angle=old

def arcade(y,z,w=3.5,h=.78,n=4):
 for i in range(n):arch(-w/2+(i+.5)*w/n,y,z,w/n*.87,h,.12,'sand',False)
 box(0,y+h+.08,z,w+.15,.16,.25,'trim',.02)
def kiosk(x,y,z,s=.65,h=.75):
 box(x,y,z,s,.14,s,'sand',.02)
 for dx in [-s*.36,s*.36]:
  for dz in [-s*.36,s*.36]:cyl(x+dx,y+h/2,z+dz,.045,h,'sand',8)
 box(x,y+h,z,s*1.18,.12,s*1.18,'trim',.02);dome(x,y+h+.06,z,s*.62,s*.45,'teal',16,4);finial(x,y+h+s*.55,z,.09)
def canal(x,z,w,d,y=.48):
 box(x,y-.07,z,w,.14,d,'sand');box(x,y,z,w,.09,d,'water')
 if w>d:
  for zz in [z-d/2,z+d/2]:box(x,y+.05,zz,w,.12,.075,'marble')
 else:
  for xx in [x-w/2,x+w/2]:box(xx,y+.05,z,.075,.12,d,'marble')

def upgraded_well(level):
 stage(1,'Stepped bathing court');stepwell()
 for k,a in [(2,0),(3,math.pi),(4,-math.pi/2),(5,math.pi/2)]:
  if level>=k:stage(k,['','','Front colonnade','Rear colonnade','West arcade','East arcade'][k]);rotate_build(a,lambda:arcade(1.66,2.43,3.65,.85,4))
 if level>=6:
  stage(6,'Four axial water channels');canal(0,0,3.25,.22,.46);canal(0,0,.22,3.25,.46)
 if level>=7:
  stage(7,'Octagonal lotus fountain');cyl(0,.58,0,.51,.20,'sand',8);cyl(0,.72,0,.43,.10,'water',16);cyl(0,1.02,0,.12,.58,'marble',12);cyl(0,1.29,0,.38,.12,'trim',12);cyl(0,1.36,0,.30,.04,'water',16)
 if level>=8:
  stage(8,'Gatekeeper pavilion');kiosk(0,2.70,2.37,.82,.88)
 if level>=9:
  stage(9,'Twin front gallery kiosks')
  for x in [-2.28,2.28]:cyl(x,2.67,2.28,.19,.66,'sand',8);kiosk(x,3.03,2.28,.61,.66)
 if level>=10:
  stage(10,'Twin rear gallery kiosks')
  for x in [-2.28,2.28]:cyl(x,2.67,-2.28,.19,.66,'sand',8);kiosk(x,3.03,-2.28,.61,.66)
 if level>=11:
  stage(11,'Canopied side walkways')
  for x in [-2.43,2.43]:roof(x,2.70,0,.59,3.20,.32,'teal',False)
 if level>=12:
  stage(12,'Elevated rear aqueduct');arcade(2.71,-2.42,3.55,.64,5);canal(0,-2.42,3.45,.22,3.47)
 if level>=13:
  stage(13,'Crowned fountain and cascade');cyl(0,1.66,0,.095,.6,'marble',10);cyl(0,1.96,0,.29,.11,'trim',12);cyl(0,2.03,0,.23,.035,'water',12);finial(0,2.10,0,.13)
  for a in range(6):
   t=a*math.tau/6;rod((.22*math.cos(t),1.93,.22*math.sin(t)),(.34*math.cos(t),1.40,.34*math.sin(t)),.025,'water',6)
 if level>=14:
  stage(14,'Terrace resting galleries')
  for z in [-1.78,1.78]:
   for x in [-1.36,1.36]:cyl(x,1.87,z,.06,1.14,'sand',8)
   roof(0,2.47,z,2.96,.55,.30,'roof',False)
 if level>=15:
  stage(15,'Ceremonial arched crossing')
  for z in [-.93,-.43]:
   for x in [-1.55,-.52,.52,1.55]:cyl(x,.45,z,.075,.30,'sand',8)
   arcade(.56,z,3.10,.73,3)
  box(0,1.39,-.68,3.20,.13,.66,'marble',.025)
  for z in [-1.0,-.36]:
   for x in [-1.38,-.69,0,.69,1.38]:cyl(x,1.70,z,.035,.55,'trim',8)
   box(0,1.98,z,3.17,.07,.08,'trim')

def tent(x,z,w,d,h,c='teal'):
 y=.3;part('Canvas ridge tent')
 mesh(c,[(x-w/2,y,z-d/2),(x+w/2,y,z-d/2),(x-w/2,y,z+d/2),(x+w/2,y,z+d/2),(x,y+h,z-d/2),(x,y+h,z+d/2)],[(0,4,5,2),(1,3,5,4),(0,1,4)])
 for sign in [-1,1]:mesh('blue',[(x+sign*w/2,y,z+d/2),(x,y+h,z+d/2),(x+sign*w*.18,y,z+d/2)],[(0,1,2)])
 for zz in [z-d/2,z+d/2]:cyl(x,y+h/2,zz,.035,h,'wood',8);finial(x,y+h,zz,.06)
 for xx in [x-w*.58,x+w*.58]:
  for zz in [z-d*.57,z+d*.57]:beam((xx,.3,zz),(x+(xx-x)*.80,y+h*.45,z+(zz-z)*.8),.018,'cream');cyl(xx,.36,zz,.028,.14,'wood',6)
def watchpost(x,z):
 for dx in [-.27,.27]:
  for dz in [-.27,.27]:post(x+dx,.3,z+dz,2.50,'wood')
 box(x,2.73,z,.80,.14,.80,'wood2');
 for zz in [z-.34,z+.34]:box(x,3.0,zz,.72,.45,.07,'blue')
 roof(x,3.46,z,.89,.89,.40,'teal',False)
 for i in range(7):beam((x-.25,.44+i*.32,z+.29),(x+.25,.44+i*.32,z+.29),.027,'wood2')
def palisade(side):
 for i in range(11):
  z=-2.45+i*.47;x=side*2.58;box(x,.92,z,.14,1.28,.13,'wood',.015);cyl(x,1.62,z,.105,.18,'trim',6,0)
 for y in [.62,1.21]:box(side*2.57,y,0,.085,.09,5.02,'wood2')

def upgraded_camp(level):
 stage(1,'Command compound');plinth(5.6)
 if level<7:tent(-.70,-1.15,2.62,2.12,2.42)
 else:
  stage(7,'Permanent command pavilion');box(-.70,.44,-1.10,2.76,.32,2.24,'sand',.04)
  for x in [-1.88,.48]:
   for z in [-1.99,-.20]:post(x,.60,z,2.34,'sand')
  roof(-.70,2.96,-1.10,2.90,2.39,.74,'teal',False);arch(-.70,.70,.0,1.58,2.07,.14,'trim',False)
 stage(2,'Second company tent');tent(-1.75,1.25,1.22,1.34,1.15)
 if level>=3:stage(3,'Third company tent');tent(0,1.25,1.23,1.34,1.21)
 if level>=4:stage(4,'Quartermaster tent');tent(1.73,-.96,1.21,1.55,1.37)
 if level>=5:stage(5,'Vanguard company tent');tent(1.75,1.27,1.20,1.32,1.18)
 if level>=6:
  stage(6,'Parade weapon stands')
  for x in [-1.0,.8]:
   for dx in [-.32,.32]:post(x+dx,.28,.46,.82)
   box(x,.91,.46,.84,.07,.08,'wood2')
   for dx in [-.24,0,.24]:beam((x+dx,.3,.46),(x+dx,1.3,.46),.022,'wood');cyl(x+dx,1.36,.46,.06,.15,'silver',6,0)
 if level>=8:stage(8,'West defensive palisade');palisade(-1)
 if level>=9:stage(9,'Eastern watchpost');watchpost(2.22,-2.16)
 if level>=10:stage(10,'Western watchpost');watchpost(-2.22,-2.16)
 if level>=11:
  stage(11,'Command balcony');box(-.70,2.77,.09,2.97,.17,.66,'wood2',.02)
  for x in [-2.06,-1.38,-.7,-.02,.66]:cyl(x,3.04,.40,.04,.54,'trim',8)
  box(-.70,3.34,.40,2.86,.07,.08,'trim')
 if level>=12:
  stage(12,'Enclosed stockade');palisade(1)
  for i in range(11):box(-2.4+i*.48,.86,-2.60,.15,1.17,.13,'wood',.01)
 if level>=13:
  stage(13,'Covered parade canopy')
  for x in [-2.37,2.37]:post(x,.28,1.48,2.20,'wood')
  roof(0,2.48,1.48,5.10,.77,.52,'cream',False)
 if level>=14:
  stage(14,'Raised rear command gallery');box(0,3.12,-2.15,4.56,.14,.57,'wood2');roof(0,3.86,-2.15,4.81,.78,.46,'teal',False)
 if level>=15:
  stage(15,'War council tower');cyl(-.70,3.76,-1.10,.35,.20,'sand',12);kiosk(-.70,3.88,-1.10,1.02,1.14)
  for x in [-1.20,-.20]:cyl(x,3.51,-.74,.04,.81,'gold',8)

def gear(x,y,z,r=.24):
 ring((x,y,z),r,(1,0,0),'gold',.038,20)
 for i in range(12):
  a=i*math.tau/12;box(x,y+r*math.cos(a),z+r*math.sin(a),.08,.075,.075,'gold')
 rod((x-.07,y,z),(x+.07,y,z),r*.28,'gold',10)
def cannon_barrel(x,y,r):
 a=Vector((x,y,-.91));b=Vector((x,y+.40,1.20));axis=(b-a).normalized();rod(a,b,r,'dark',16,r*.83)
 for t in [.06,.26,.69,.95]:
  p=a.lerp(b,t);rod(p-axis*.055,p+axis*.055,r*(1.10 if t<.5 else .97),'gold',16)
 rod(b,b+axis*.025,r*.70,'black',16)

def upgraded_cannon(level):
 stage(1,'Artillery carriage');plinth(3.6);cyl(0,.41,0,1.44,.28,'stone',16);cyl(0,.59,0,1.3,.08,'sand',16);box(0,.83,0,1.5,.26,1.55,'wood2',.04)
 for x in [-.82,.82]:wheel(x,.87,.12,.58)
 stage(2,'Rear recoil axle')
 for x in [-.93,.93]:wheel(x,.72,-.92,.40)
 stage(1,'Cast barrel battery')
 count=1 if level<5 else 2 if level<9 else 3 if level<13 else 5
 for i in range(count):cannon_barrel((i-(count-1)/2)*(.48 if count<5 else .35),1.30,.28 if count==1 else .225 if count<5 else .16)
 if level>=3:
  stage(3,'Carriage cheek armor')
  for x in [-.67,.67]:box(x,1.15,-.15,.18,.73,1.35,'stone',.05);box(x,1.49,-.15,.24,.10,1.39,'gold',.015)
 if level>=4:
  stage(4,'Four siege outriggers')
  for x in [-1.48,1.48]:
   for z in [-1.17,1.17]:beam((x,.39,z),(x*.60,1.09,z*.40),.10,'dark');box(x,.34,z,.35,.14,.37,'gold',.02)
 if level>=6:
  stage(6,'Elevating gun frame')
  for x in [-1.01,1.01]:beam((x,.75,.43),(x,2.14,.20),.11,'dark');gear(x,1.47,.26,.22)
  beam((-1.05,2.14,.20),(1.05,2.14,.20),.075,'gold')
 if level>=7:
  stage(7,'Geared traverse mechanism')
  for x in [-1.22,1.22]:gear(x,1.10,-.42,.31);beam((x,1.10,-.42),(x,1.36,-.69),.045,'gold')
 if level>=8:
  stage(8,'Rear loading conveyor');box(0,1.03,-1.26,1.21,.13,.51,'wood2',.02)
  for x in [-.46,.46]:beam((x,.87,-.65),(x,.96,-1.50),.07,'wood2')
  for i in range(4):rod((-.49+i*.32,1.10,-1.50),(-.49+i*.32,1.10,-1.01),.045,'dark',8)
  for x in [-.31,0,.31]:sphere(x,1.24,-1.30,.12,'dark')
 if level>=10:
  stage(10,'Segmented rotating mantlet')
  for side in [-1,1]:
   for i in range(4):box(side*1.30,.95,-.94+i*.48,.16,.74,.40,'stone',.045)
 if level>=11:
  stage(11,'Twin recoil actuators')
  for x in [-1.21,1.21]:rod((x,.90,-.84),(x,1.35,.65),.095,'gold',12);rod((x,1.27,.42),(x,1.49,.98),.045,'silver',10)
 if level>=12:
  stage(12,'Armored breech housing');box(0,1.56,-1.05,1.32,.67,.32,'stone',.055)
  for i in range(6):box(-.52+i*.208,1.58,-1.24,.085,.49,.04,'gold',.008)
 if level>=14:
  stage(14,'Overhead siege canopy')
  for x in [-.67,.67]:box(x,1.89,-.71,.12,.88,.12,'dark')
  roof(0,2.34,-.55,2.0,1.24,.30,'blue',False)
 if level>=15:
  stage(15,'Ranging optic and port armor');cyl(0,2.70,-.50,.06,.25,'gold',8);rod((0,2.70,-.77),(0,2.85,.16),.115,'gold',12);rod((0,2.85,.16),(0,2.86,.20),.079,'water',12)
  for x in [-.90,.90]:box(x,.95,1.01,.10,.80,.10,'dark');box(x,1.71,1.01,.16,.77,.20,'gold',.025)
  box(0,2.09,1.01,1.91,.12,.20,'gold',.02)

def telescope(x,y,z):
 cyl(x,y-.36,z,.10,.68,'gold',10);a=Vector((x,y,z-.34));b=Vector((x,y+.27,z+.51));rod(a,b,.14,'gold',12);rod(b,b+Vector((0,.01,.04)),.117,'water',12);ring(tuple(b),.16,(0,.3,1),'gold',.026)
def upgraded_lab(level):
 stage(1,'Astronomical pavilion');laboratory()
 stage(2,'Survey telescope');telescope(1.75,1.82,-1.33)
 if level>=3:
  stage(3,'Alchemy distillation bench')
  for x in [1.32,1.74,2.16]:cyl(x,1.22,.64,.13,.79,'silver',12);sphere(x,1.70,.64,.17,'water');rod((x,1.70,.64),(x,2.05,.64),.045,'gold',8)
 if level>=4:
  stage(4,'Paired declination lenses')
  for z in [-1.80,.98]:cyl(-2.05,3.13,z,.08,.52,'gold',10);ring((-2.05,3.42,z),.38,(0,1,0),'gold',.04)
 if level>=5:
  stage(5,'Rear observing dome');cyl(1.69,1.38,-1.41,.64,.73,'sand',16);dome(1.69,1.78,-1.41,.72,.70,'teal',20,5);finial(1.69,2.56,-1.41,.12)
 if level>=6:
  stage(6,'Manuscript observatory');cyl(1.70,1.49,1.17,.65,1.08,'sand',16);dome(1.70,2.08,1.17,.74,.72,'teal',20,5);finial(1.70,2.87,1.17,.12)
 if level>=7:
  stage(7,'Instrument bridge');arch(.79,2.88,.55,1.23,.72,.20,'trim',False);box(.79,3.68,.55,1.42,.13,.60,'sand',.025)
 if level>=8:
  stage(8,'Six-planet lower orbit');ring((-.78,3.88,-.43),1.17,(0,1,0),'gold',.042)
  for i in range(6):
   a=i*math.tau/6;sphere(-.78+1.17*math.cos(a),3.88,-.43+1.17*math.sin(a),.12,'water')
 if level>=9:
  stage(9,'Great azimuth lens');ring((-.78,5.16,-.43),1.12,(0,1,0),'gold',.060);cyl(-.78,5.16,-.43,.87,.035,'water',24)
 if level>=10:
  stage(10,'Twin celestial collectors');cyl(1.70,2.70,-1.45,.12,.54,'gold',10)
  for z in [-1.45,1.2]:cyl(1.70,3.24,z,.063,.86,'gold',10);ring((1.70,3.75,z),.42,(1,0,0),'gold',.045);sphere(1.70,3.75,z,.18,'water')
 if level>=11:
  stage(11,'Clockwork teaching facade');ring((-.78,2.14,1.22),.62,(0,0,1),'gold',.05)
  for a in range(12):
   t=a*math.tau/12;box(-.78+.51*math.cos(t),2.14+.51*math.sin(t),1.24,.045,.08,.045,'gold')
  beam((-.78,2.14,1.28),(-1.03,2.46,1.28),.024,'dark');beam((-.78,2.14,1.28),(-.42,2.03,1.28),.022,'dark')
 if level>=12:
  stage(12,'High observatory canopy')
  for x in [-1.95,.39]:
   for z in [-1.59,.73]:cyl(x,4.35,z,.055,2.86,'sand',8)
  dome(-.78,5.78,-.43,1.30,.68,'teal',24,5);ring((-.78,5.80,-.43),1.30,(0,1,0),'gold',.06)
 if level>=13:
  stage(13,'Secondary planetary apparatus');box(1.55,3.65,.10,.60,.14,1.0,'sand',.02)
  for x in [1.42,1.92]:
   for z in [-.20,.40]:cyl(x,1.93,z,.055,3.30,'sand',8)
  cyl(1.72,4.43,.10,.06,1.45,'gold',10)
  for n in [(0,1,0),(1,.3,0),(0,.4,1)]:ring((1.72,5.21,.10),.65,n,'gold',.035)
  sphere(1.72,5.21,.10,.19,'blue')
 if level>=14:
  stage(14,'Projection gallery');box(0,3.03,1.44,3.85,.14,.80,'sand',.025)
  for x in [-1.80,0,1.80]:cyl(x,1.66,1.8,.06,2.75,'sand',8)
  arcade(3.06,1.60,3.62,1.02,4);box(0,4.18,1.60,3.85,.15,.59,'sand',.025)
  for x in [-1.33,0,1.33]:telescope(x,4.56,1.60)
 if level>=15:
  stage(15,'Royal celestial crown');kiosk(-.78,6.46,-.43,1.30,.99)
  for x,z in [(-1.97,-1.56),(.4,-1.56),(-1.97,.7),(.4,.7)]:finial(x,5.90,z,.20)

def trophy(x,y,z):
 cyl(x,y+.11,z,.25,.22,'stone',12);cyl(x,y+.31,z,.18,.19,'gold',12);rod((x,y+.4,z),(x,y+.85,z),.15,'gold',12,.22);ring((x,y+.74,z),.30,(0,1,0),'gold',.027);finial(x,y+.98,z,.10)
def guardian(x,z):
 box(x,.46,z,.70,.27,.88,'stone',.04)
 for dx in [-.19,.19]:
  for dz in [-.23,.23]:cyl(x+dx,.83,z+dz,.095,.58,'sand',8)
 sphere(x,1.15,z,.35,'sand',(1,1,1.20));sphere(x,1.37,z+.29,.23,'trim')
 for dx in [-.20,.20]:sphere(x+dx,1.36,z+.27,.14,'sand',(.35,1.10,1))
 rod((x,1.28,z+.44),(x,1.0,z+.55),.09,'sand',8);rod((x,1.,z+.55),(x,.87,z+.49),.07,'sand',8)
def upgraded_hall(level):
 stage(1,'Hero pavilion');hero_hall()
 stage(2,'Twin victory trophies')
 for x in [-1.49,1.49]:trophy(x,.34,2.15)
 if level>=3:
  stage(3,'Ceremonial front portico');arcade(.76,1.73,3.97,2.13,3);box(0,3.02,1.76,4.17,.14,.56,'trim',.025)
 if level>=4:
  stage(4,'West covered gallery')
  for z in [-1.5,-.25,1.0]:cyl(-2.40,1.80,z,.10,2.07,'sand',10)
  roof(-2.30,2.89,-.25,.85,3.37,.46,'roof',False)
 if level>=5:
  stage(5,'East covered gallery')
  for z in [-1.5,-.25,1.0]:cyl(2.40,1.80,z,.10,2.07,'sand',10)
  roof(2.30,2.89,-.25,.85,3.37,.46,'roof',False)
 if level>=6:
  stage(6,'Paired domed galleries')
  for x in [-2.16,2.16]:kiosk(x,3.34,-.55,.72,.72)
 if level>=7:
  stage(7,'Second royal roof tier');box(0,4.43,-.25,2.94,.18,2.52,'sand',.03)
  for x in [-1.22,1.22]:
   for z in [-1.24,.74]:cyl(x,5.11,z,.085,1.18,'sand',10)
  roof(0,5.75,-.25,3.08,2.64,.74,'teal',False)
 if level>=8:
  stage(8,'Forecourt relic displays')
  for x in [-.71,.71]:
   cyl(x,.65,2.28,.24,.70,'stone',12);rod((x,1.08,2.24),(x,1.08,2.34),.27,'blue',16);beam((x-.2,.77,2.30),(x+.2,1.57,2.30),.035,'silver')
 if level>=9:
  stage(9,'Rear honor gallery')
  for x in [-1.92,-.96,0,.96,1.92]:cyl(x,2.37,-1.98,.09,3.20,'sand',10)
  roof(0,4.07,-1.95,4.30,.70,.54,'roof',False)
 if level>=10:
  stage(10,'Elephant gate guardians')
  for x in [-2.2,2.2]:guardian(x,2.01)
 if level>=11:
  stage(11,'Upper champion pavilions')
  for x in [-1.12,1.12]:box(x,6.22,-.25,.61,.40,.60,'sand',.02);kiosk(x,6.48,-.25,.78,.76)
 if level>=12:
  stage(12,'Upper ceremonial balcony');arcade(4.51,1.20,2.50,1.0,3);box(0,4.46,1.20,2.71,.14,.69,'sand',.025)
 if level>=13:
  stage(13,'Grand upper pediment')
  for x in [-1.12,1.12]:box(x,5.87,1.20,.16,.48,.20,'sand',.015)
  box(0,5.96,1.20,2.5,.16,.23,'trim',.015)
  arch(0,6.04,1.20,2.15,1.24,.16,'marble',False);roof(0,7.39,1.07,2.55,.68,.33,'teal',False)
 if level>=14:
  stage(14,'Four monumental buttresses')
  for x in [-2.52,2.52]:
   for z in [-1.65,1.64]:box(x,2.13,z,.29,3.71,.32,'sand',.025);box(x,4.07,z,.43,.17,.46,'trim',.02)
 if level>=15:
  stage(15,'Imperial lotus crown')
  for x in [-.45,.45]:
   for z in [-.70,.20]:cyl(x,6.96,z,.06,1.52,'sand',8)
  cyl(0,7.72,-.25,.73,.10,'trim',16);onion(0,7.75,-.25,.82,1.25,'marble',24)

CHANGES={
 'stepwell':['Stepped bathing court','Front colonnade','Rear colonnade','West arcade','East arcade','Four axial water channels','Octagonal lotus fountain','Gatekeeper pavilion','Twin front gallery kiosks','Twin rear gallery kiosks','Canopied side walkways','Elevated rear aqueduct','Crowned fountain cascade','Terrace resting galleries','Ceremonial arched crossing'],
 'camp':['Single command tent','Second company tent','Third company tent','Quartermaster tent','Vanguard company tent','Parade weapon stands','Permanent command pavilion','West defensive palisade','Eastern watchpost','Western watchpost','Command balcony','Enclosed stockade','Covered parade canopy','Raised rear command gallery','War council tower'],
 'cannon':['Single gun carriage','Rear recoil axle','Carriage cheek armor','Four siege outriggers','Twin barrel battery','Elevating gun frame','Geared traverse mechanism','Rear loading conveyor','Triple barrel battery','Segmented rotating mantlet','Twin recoil actuators','Armored breech housing','Five barrel battery','Overhead siege canopy','Ranging optic and port armor'],
 'laboratory':['Astronomical pavilion','Survey telescope','Alchemy distillation bench','Paired declination lenses','Rear observing dome','Manuscript observatory','Instrument bridge','Six-planet lower orbit','Great azimuth lens','Twin celestial collectors','Clockwork teaching facade','High observatory canopy','Secondary planetary apparatus','Projection gallery','Royal celestial crown'],
 'hero_hall':['Hero pavilion','Twin victory trophies','Ceremonial front portico','West covered gallery','East covered gallery','Paired domed galleries','Second royal roof tier','Forecourt relic displays','Rear honor gallery','Elephant gate guardians','Upper champion pavilions','Upper ceremonial balcony','Grand upper pediment','Four monumental buttresses','Imperial lotus crown']}
BUILDERS={'stepwell':upgraded_well,'camp':upgraded_camp,'cannon':upgraded_cannon,'laboratory':upgraded_lab,'hero_hall':upgraded_hall}
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=12;scene.render.resolution_x=scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='AgX'
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.29,.35,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
rig=bpy.data.collections.new('Civic portrait studio');scene.collection.children.link(rig)
def area(name,loc,energy,size,shadow):
 data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.size=size;data.use_shadow=shadow;ob=bpy.data.objects.new(name,data);rig.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,0,2.5))-ob.location).to_track_quat('-Z','Y').to_euler()
area('Warm key',(-5,-8,12),1800,8,True);area('Broad fill',(7,-2,8),1100,9,False);area('Skylight rim',(2,7,11),1700,7,False)
data=bpy.data.cameras.new('Civic progression camera');camera=bpy.data.objects.new('Civic progression camera',data);rig.objects.link(camera);scene.camera=camera;data.type='ORTHO'
manifest={'coordinates':'meters; +Y up; centeredXZ; groundY=0','source':'assets/blender/levels-civic.blend','families':list(BUILDERS),'levels':[]};collections=[];started=time.monotonic()
base_manifest=json.loads((ROOT/'assets/buildings/manifest.json').read_text())
for family,builder in BUILDERS.items():
 base=next(x for x in base_manifest['assets'] if x['id']==family)
 manifest['levels'].append(dict(family=family,level=1,file=base['file'],preview=base['preview'],triangles=base['triangles'],meshes=base['meshes'],footprint=base['footprint'],structuralChange=CHANGES[family][0],existingBase=True))
 folder=OUT/family;folder.mkdir(parents=True,exist_ok=True)
 for level in range(2,16):
  random.seed(420+list(BUILDERS).index(family));parts={};angle=0;builder(level)
  col=bpy.data.collections.new(f'{family}__level_{level:02d}');scene.collection.children.link(col);collections.append(col)
  for (name,mi),(verts,faces,colors) in parts.items():
   me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();attr=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');attr.data.foreach_set('color',[c for rgba in colors for c in rgba]);me.materials.append(mats[mi]);ob=bpy.data.objects.new(name,me);col.objects.link(ob)
  vertices=[v.co for ob in col.objects for v in ob.data.vertices];lo=Vector([min(v[i] for v in vertices) for i in range(3)]);hi=Vector([max(v[i] for v in vertices) for i in range(3)]);offset=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
  for ob in col.objects:
   for v in ob.data.vertices:v.co-=offset
  col.hide_render=True;col['family']=family;col['level']=level;col['newStructuralFeature']=CHANGES[family][level-1]
  merged=[]
  for mi in range(2):
   copies=[]
   for ob in col.objects:
    if ob.data.materials[0]!=mats[mi]:continue
    cp=ob.copy();cp.data=ob.data.copy();scene.collection.objects.link(cp);copies.append(cp)
   if not copies:continue
   bpy.ops.object.select_all(action='DESELECT')
   for ob in copies:ob.select_set(True)
   bpy.context.view_layer.objects.active=copies[0]
   if len(copies)>1:bpy.ops.object.join()
   ob=bpy.context.object;ob.name=f'{family}_level{level}_'+('metal' if mi else 'structure');merged.append(ob)
  tris=0;geom=hashlib.sha256()
  for ob in merged:
   ob.data.calc_loop_triangles();tris+=len(ob.data.loop_triangles)
   for v in ob.data.vertices:geom.update(struct.pack('<3f',*v.co))
   for tri in ob.data.loop_triangles:geom.update(struct.pack('<3I',*tri.vertices))
  size=hi-lo;footprint=[2,2] if family=='cannon' else [3,3]
  assert tris<=22000,(family,level,tris)
  assert size.x<=footprint[0]*2+.001 and size.y<=footprint[1]*2+.001,(family,level,'footprint',tuple(size))
  bpy.ops.object.select_all(action='DESELECT')
  for ob in merged:ob.select_set(True)
  bpy.ops.export_scene.gltf(filepath=str(folder/f'{level}.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_cameras=False,export_lights=False)
  entry=dict(family=family,level=level,file=f'assets/buildings/levels/{family}/{level}.glb',preview=f'assets/buildings/levels/{family}/{level}.png',triangles=tris,meshes=len(merged),footprint=footprint,size=[round(size.x,4),round(size.z,4),round(size.y,4)],structuralChange=CHANGES[family][level-1],geometryHash=geom.hexdigest(),sourceCollection=col.name,sourceParts=len(col.objects),bytes=(folder/f'{level}.glb').stat().st_size)
  manifest['levels'].append(entry)
  if '--no-render' not in sys.argv:
   look=Vector((0,0,size.z*.5));camera.location=look+Vector((10,-13,11));camera.rotation_euler=(look-camera.location).to_track_quat('-Z','Y').to_euler();inv=camera.rotation_euler.to_matrix().transposed();points=[inv@(v.co-look) for ob in merged for v in ob.data.vertices];span=max(max(v[i] for v in points)-min(v[i] for v in points) for i in (0,1));data.ortho_scale=span*1.15;mid=Vector(((max(v.x for v in points)+min(v.x for v in points))/2,(max(v.y for v in points)+min(v.y for v in points))/2,0));camera.location+=camera.rotation_euler.to_matrix()@mid;scene.render.filepath=str(folder/f'{level}.png');bpy.ops.render.render(write_still=True)
  for ob in merged:bpy.data.objects.remove(ob,do_unlink=True)
  print('CIVIC',family,level,tris,'triangles',flush=True)
  (OUT/'civic-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for col in collections:col.hide_viewport=True;col.hide_render=True
collections[-1].hide_viewport=False;collections[-1].hide_render=False
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/levels-civic.blend'))
manifest['elapsedSeconds']=round(time.monotonic()-started,3);(OUT/'civic-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('CIVIC LEVELS COMPLETE',len(manifest['levels']),'entries',flush=True)
