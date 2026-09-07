"""70 original economy-building upgrades using the established editable building geometry.
Blender -b --factory-startup --python tools/build-levels-economy.py
Level one is the existing GLB/PNG. All higher levels keep its placement footprint.
"""
from pathlib import Path
helper=Path(__file__).with_name('build-buildings.py')
exec(compile(helper.read_text().split('BUILDERS=')[0],str(helper),'exec'))
OUT=ROOT/'assets/buildings/levels';OUT.mkdir(parents=True,exist_ok=True)
P.update({'jade':(.10,.74,.46),'emerald':(.035,.44,.31),'quartz':(.53,.89,.77),'iron':(.37,.46,.47)})
SCHEMES={
 'farm':['Original paddy fields','Terraced irrigation beds','Sluice-controlled cross canals','Raised harvest barn','Working waterwheel housing','Wheel drive and pump gantry','Ventilated grain tower','Stone rice mill','Raised irrigation aqueduct','Upper stepped paddy terrace','Second irrigation wheel','Mill roof drying loft','Grain-hulling crusher','Four-sail grain mill','Arcaded reservoir and mill crown'],
 'lumber':['Original teak yard','Seasoning log racks','Frame-saw workbench','Covered log lean-to','Timber lifting crane','Braced hoist with drum','Water-powered saw drive','Raised workshop loft','Gang-saw processing line','Elevated log conveyor','Second handling crane','Ventilated drying chamber','Roof wind-drive system','Timber drying kiln','Upper hoist walkway and roof crown'],
 'mine':['Original iron quarry','Stone-reinforced shaft','Extended trolley rails','Second excavation shaft','Ore lifting headframe','Counterweight and lift cage','Twin roller ore crusher','Upper hoist machinery','Raised sorting gallery','Two-track ore dispatch','Crusher hopper and chute','Ore washer settling tanks','Second headframe lift deck','Twin smelting vents','Crowned hoist and crushing works'],
 'granary':['Original raised granary','Ventilated storage plinth','Front grain bins','Paired grain silos','Covered loading platform','Raised sorting loft','Second storage floor','Side ventilation towers','Four-bin storage system','Tall reinforced silos','Grain elevator and bridge','Roof drying dormers','Pneumatic grain chutes','Domed ventilation caps','Royal multi-tier storehouse'],
 'gem_mine':['Original gem garden','Terraced emerald excavation','Twin arched adits','Gem cutting bench','Primary excavation hoist','Second crystal terrace','Crushing and washing wheel','Upper extraction headframe','Stepped access gallery','Raised arched crystal arcade','Brass sieving machinery','Twin excavation lifts','Covered gem sorting counter','High quartz seam extraction','Crowned crystal gallery and chutes'],
}

def feature(name):part(name)
def frame(x,z,w,d,y,h,c='wood2'):
 for xx in [x-w/2,x+w/2]:
  for zz in [z-d/2,z+d/2]:post(xx,y,zz,h,c)
 for zz in [z-d/2,z+d/2]:box(x,y+h,zz,w+.18,.15,.17,c,.02)
def channel(x,y,z,w,d):
 box(x,y,z,w,.12,d,'sand',.018);box(x,y+.066,z,max(.06,w-.12),.022,max(.06,d-.12),'water')
def crop(x,y,z,h):
 rod((x,y,z),(x,y+h,z),.023,'leaf2',6)
 for sign in [-1,1]:
  mesh('leaf',[(x,y+h*.35,z),(x+sign*.16,y+h*.74,z+.02),(x+sign*.045,y+h*.64,z-.025)],[(0,1,2)])
 cyl(x,y+h,z,.055,.20,'grain',6,.015)
def mill_sails(x,y,z,r=.82):
 rod((x,y,z-.08),(x,y,z+.12),.11,'gold',12)
 for i in range(4):
  a=i*math.pi/2+.35;u=Vector((math.cos(a),math.sin(a),0));v=Vector((-math.sin(a),math.cos(a),0));p=Vector((x,y,z+.10))
  beam(p,p+u*r,.035,'wood2');vv=[p+u*.23-v*.03,p+u*r-v*.04,p+u*r+v*.19,p+u*.35+v*.19]
  mesh('cream',[tuple(q) for q in vv],[(0,1,2,3)])
  beam(p+u*.23-v*.03,p+u*r+v*.19,.015,'wood')
def silo(x,z,r,h,y=.28,dome_top=False):
 cyl(x,y+h/2,z,r,h,'sand',16)
 for yy in [y+.12,y+h*.45,y+h-.13]:cyl(x,yy,z,r+.028,.055,'wood2',16)
 if dome_top:dome(x,y+h,z,r*1.08,r*.75,'teal',16,5);finial(x,y+h+r*.72,z,.09)
 else:cyl(x,y+h+.18,z,r*1.16,.36,'roof',16,0)
 for i in range(5):box(x+r+.025,y+.14+i*h/6,z,.045,.045,.23,'wood2')
def gantry(x,z,w,h,y=.28,metal=False):
 c='iron' if metal else 'wood2';frame(x,z,w,.50,y,h,c)
 for side in [-1,1]:beam((x+side*w/2,y,z-.25),(x-side*w/2,y+h,z-.25),.045,c)
 rod((x-w*.4,y+h-.37,z),(x+w*.4,y+h-.37,z),.18,'wood',12)
 beam((x,y+h,z),(x,.8,z+.18),.022,'cream');box(x,.68,z+.18,.52,.55,.48,'dark',.02)
 for yy in [.46,.70,.90]:box(x,yy,z+.43,.55,.04,.025,'gold')
def ore_cart(x,z,kind='iron'):
 box(x,.61,z,.77,.15,.84,'wood2',.02)
 for xx in [x-.43,x+.43]:wheel(xx,.50,z,.26)
 for xx in [x-.40,x+.40]:box(xx,.86,z,.065,.40,.87,'dark',.015)
 for zz in [z-.42,z+.42]:box(x,.86,zz,.83,.40,.065,'dark',.015)
 for dx,dz in [(-.20,-.13),(.15,-.07),(0,.20)]:sphere(x+dx,.96,z+dz,.19,kind,(1,.8,1))
def arch_frame(x,y,z,w,h,c='sand'):
 for xx in [x-w*.52,x+w*.52]:box(xx,y+h*.35,z,.14,h*.70,.20,c,.018)
 for i in range(12):
  a=(i+.5)*math.pi/12;box(x+math.cos(a)*w*.51,y+h*.66+math.sin(a)*h*.34,z,.18,.18,.22,c,.018)
def crystal(x,y,z,r,h,c='jade',lean=0):
 n=6;v=[]
 for yy,rr,shift in [(0,r*.8,0),(.72*h,r,lean*.72),(.9*h,r*.72,lean*.9),(h,0,lean)]:v.extend((x+shift+rr*math.cos(i*math.tau/n),y+yy,z+rr*math.sin(i*math.tau/n)) for i in range(n))
 mesh(c,v,[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(3) for i in range(n)])

def farm_level(level):
 plinth(5.6);feature('02 Tiered paddy earthworks and crop beds')
 for i,x in enumerate([-1.88,-.76,.36]):
  y=.37+i*.10+(level>=10 and i==0)*.26
  box(x,y-.09,.25,.98,.20,4.0,'dark',.025);channel(x,y,.25,.94,3.94)
  for z in [-1.44,-.78,-.12,.54,1.20,1.86]:
   for dx in [-.24,0,.24]:crop(x+dx,y+.1,z,.48+i*.06)
 feature('03 Canal head and sluice engineering');channel(-.75,.45,-2.35,3.48,.36)
 if level>=3:
  channel(-.75,.48,2.38,3.48,.29)
  for x in [-1.88,-.76,.36]:box(x,.69,-2.16,.36,.44,.09,'wood2');beam((x,.72,-2.19),(x,1.01,-2.19),.023,'gold')
 h=1.45+(level>=8)*.65+(level>=12)*.38
 feature('04 Rice mill and harvest store');box(1.65,.3+h/2,-1.60,1.52,h,1.54,'cream',.035);door(1.65,.30,-.81,.60,min(h*.70,1.36));roof(1.65,.34+h,-1.6,1.93,1.91,.45,'roof')
 if level>=4:
  frame(1.55,1.73,1.47,1.1,.29,.49);box(1.55,.84,1.73,1.63,.14,1.19,'wood2',.025)
  for x in [1.12,1.55,1.96]:sacks(x,.93,1.65,2)
 if level>=5:
  feature('05 Waterwheel and wheel house');wheel(2.41,1.02,.26,.69)
  for i in range(12):a=i*math.tau/12;box(2.42,1.02+.66*math.cos(a),.26+.66*math.sin(a),.27,.12,.22,'wood2')
  channel(2.28,.43,.25,.60,2.03)
 if level>=6:frame(1.96,.26,.66,.85,.3,1.45);rod((1.55,1.05,.26),(2.48,1.05,.26),.095,'gold',10)
 if level>=7:feature('06 Grain tower');silo(1.55,1.74,.41,1.05+(level>=11)*.52,.87,level>=12)
 if level>=8:
  for x in [1.08,2.22]:box(x,1.55,-.79,.11,1.1,.12,'sand',.018)
  cyl(1.55,.62,.85,.48,.25,'stone',20);cyl(1.55,.78,.85,.40,.11,'sand',20)
 if level>=9:
  feature('07 Raised aqueduct');channel(-.77,1.58,-2.34,3.53,.34)
  for x in [-2.29,-1.28,-.24,.65]:post(x,.32,-2.34,1.19,'sand')
  for x in [-1.8,-.79,.24]:arch_frame(x,.35,-2.33,.68,1.05,'sand')
 if level>=10:stairs(-2.25,2.23,.53,3,.14,.18)
 if level>=11:wheel(1.22,1.08,.22,.59);rod((1.17,1.08,.22),(2.48,1.08,.22),.065,'gold',12)
 if level>=12:box(1.65,h+.93,-1.6,.82,.49,.73,'cream',.02);roof(1.65,h+1.22,-1.6,1.06,.99,.30,'teal',False)
 if level>=13:
  feature('08 Grain hulling equipment');frame(1.53,.97,.75,.46,.86,.65);cyl(1.53,1.48,.97,.26,.24,'dark',12,.43);rod((1.53,.96,.97),(1.53,1.43,.97),.065,'gold')
 if level>=14:feature('09 Wind-assisted grain mill');mill_sails(1.65,h+.86,-.61,.94)
 if level>=15:
  feature('10 Arcaded rooftop reservoir');box(-.78,1.77,-2.33,2.72,.27,.56,'sand',.028);channel(-.78,1.93,-2.33,2.57,.50)
  pavilion(1.65,h+1.42,-1.60,.73,.53,'teal')

def lumber_level(level):
 plinth(5.6);feature('02 Seasoning floor and log racks');box(-.72,.45,-.47,3.65,.30,3.22,'wood',.035)
 for x in [-2.2,-1.7,-1.2,-.7,-.2,.3,.8]:box(x,.63,-.47,.44,.07,3.15,'wood2')
 height=1.82+(level>=8)*.58+(level>=12)*.36
 frame(-.72,-.47,3.04,2.75,.65,height);roof(-.72,.72+height,-.47,3.71,3.39,.66)
 for row in range(2+(level>=4)+(level>=10)):
  for i in range(4-min(row,2)):
   z=.55+i*.38+row*.10;y=.48+row*.32;rod((1.2,y,z),(2.30,y,z),.17,'wood',10);rod((2.3,y,z),(2.33,y,z),.13,'sand',10)
 for z in [.35,1.98]:frame(1.76,z,1.25,.16,.28,1.38,'wood')
 if level>=3:
  feature('03 Frame saw and finishing benches');box(-.64,.96,1.65,2.65,.16,.68,'wood2',.025)
  for x in [-1.8,.50]:post(x,.28,1.65,.61)
  for x in [-1.05,-.25]:post(x,1.04,1.65,.90)
  box(-.65,1.94,1.65,.95,.07,.09,'wood');box(-.65,1.46,1.65,.04,.82,.045,'iron')
 if level>=4:roof(1.79,1.83,1.1,1.5,2.12,.30,'roof',False)
 if level>=5:feature('04 Timber crane');gantry(1.72,-1.72,1.14,2.85+(level>=8)*.6)
 if level>=6:
  beam((1.75,3.27,-1.72),(.37,3.27,-.49),.09,'wood2');beam((1.75,2.32,-1.72),(.37,3.27,-.49),.065);beam((.42,3.27,-.54),(.42,1.60,-.54),.025,'cream')
 if level>=7:feature('05 Powered saw drive');wheel(-2.32,1.09,-.32,.70);rod((-2.42,1.09,-.32),(-1.32,1.09,-.32),.10,'gold',12)
 if level>=8:
  feature('06 Upper workshop loft');box(-.74,2.60,-.46,3.27,.16,2.9,'wood2',.02)
  for x in [-1.95,-.75,.42]:box(x,2.95,.99,.08,.58,.09,'wood2')
  box(-.74,3.20,.99,2.88,.08,.11,'trim')
 if level>=9:
  for x in [-1.25,-.93,-.61,-.29]:box(x,1.46,1.65,.035,.92,.12,'iron');box(x,1.01,1.65,.22,.06,.86,'wood2')
 if level>=10:
  feature('07 Raised log conveyor');frame(1.72,.34,.84,2.55,.30,2.19);box(1.72,2.60,.34,1.08,.14,2.7,'wood2')
  for z in [-.71,-.20,.31,.82,1.33]:rod((1.32,2.74,z),(2.10,2.74,z),.10,'dark',10)
 if level>=11:
  post(-1.88,.3,2.21,2.32);beam((-1.88,2.62,2.21),(-.40,2.87,1.49),.073,'wood2');beam((-.4,2.86,1.49),(-.4,1.81,1.49),.018,'cream')
 if level>=12:feature('08 Drying chamber');box(-.74,3.27,-.77,2.65,.75,1.6,'wood',.025)
 if level>=13:mill_sails(-.75,height+1.11,1.02,.92)
 if level>=14:
  feature('09 Timber seasoning kiln');box(1.72,1.20,-1.74,1.08,1.77,.91,'sand',.035);door(1.72,.32,-1.23,.48,1.18)
  for x in [1.39,2.02]:cyl(x,3.15,-1.72,.14,1.84,'stone',12)
 if level>=15:
  feature('10 Upper crane service deck');box(1.72,3.73,-1.70,1.59,.16,1.22,'wood2',.02);frame(1.72,-1.70,1.34,.97,3.81,.67);roof(1.72,4.56,-1.70,1.66,1.29,.45,'teal',False)
  pavilion(-.75,height+1.2,-.52,.82,.54,'teal')

def mine_level(level):
 plinth(5.6);feature('02 Reinforced quarry and shaft outcrops')
 for x,z,r,h in [(-1.55,-1.4,.95,1.25),(-.38,-1.6,1.23,1.75),(1.14,-1.40,.88,1.43)]:sphere(x,.28+h,z,r,'dark',(.95,h/r,.88))
 box(-.67,1.14,-.27,1.47,1.72,.13,'black');arch_frame(-.67,.3,-.15,1.60,1.89,'sand');box(-.67,2.1,-.16,1.93,.24,.32,'wood2',.03)
 feature('03 Mine rails and dispatch trolley')
 for x in [-1.05,-.31]:box(x,.36,1.10,.075,.07,2.52,'iron')
 for z in [-.01,.41,.83,1.25,1.67,2.09,2.40]:box(-.68,.31,z,1.03,.065,.13,'wood2')
 ore_cart(-.68,1.53)
 if level>=3:
  for x in [-2.08,-1.6]:box(x,.35,.97,.06,.06,2.69,'iron')
  for z in [-.16,.4,.97,1.54,2.11]:box(-1.84,.3,z,.69,.065,.10,'wood')
 if level>=4:feature('04 Auxiliary excavation shaft');box(1.55,1.04,-.30,.95,1.46,.1,'black');arch_frame(1.55,.3,-.19,.91,1.55,'wood2')
 if level>=5:feature('05 Ore-lifting headframe');gantry(1.62,-1.49,1.33,3.20+(level>=8)*.74+(level>=13)*.62,.28,level>=13)
 if level>=6:
  box(1.62,2.32,-1.21,.75,.12,.71,'wood2');box(2.11,1.94,-1.62,.27,1.09,.31,'stone');beam((2.11,3.55,-1.62),(2.11,1.91,-1.62),.021,'cream')
 if level>=7:
  feature('06 Twin-roller ore crusher');box(1.51,.64,1.13,1.6,.65,1.76,'stone',.035)
  for x in [1.20,1.83]:cyl(x,1.39,1.16,.29,.86,'iron',16)
  frame(1.51,1.16,1.27,1.28,.3,1.68,'iron')
 if level>=8:box(1.62,3.41,-1.49,1.80,.18,1.02,'wood2',.02);wheel(1.62,3.89,-1.48,.34)
 if level>=9:
  feature('07 Raised ore sorting gallery');box(-.84,2.52,-1.48,2.64,.17,1.1,'wood2',.02);frame(-.84,-1.48,2.4,.86,2.62,.56);roof(-.84,3.28,-1.48,2.82,1.27,.43,'roof')
 if level>=10:ore_cart(-1.84,.98);box(-1.85,.58,2.39,.88,.32,.10,'wood2')
 if level>=11:
  feature('08 Crusher hopper and ore chute');cyl(1.51,2.12,1.16,.54,.56,'dark',8,.73);box(1.51,1.22,2.03,.72,.13,.60,'iron')
 if level>=12:
  for z in [.25,.85]:channel(-2.27,.55,z,.55,.53);post(-2.45,.3,z,.85,'wood2')
 if level>=13:
  feature('09 Second hoist service deck');box(1.62,4.19,-1.49,1.83,.18,1.11,'iron',.02);frame(1.62,-1.49,1.51,.90,4.3,.45,'iron')
 if level>=14:
  feature('10 Ore furnace vents')
  for x in [-1.72,-1.11]:box(x,3.70,-1.47,.30,1.15,.39,'stone',.025);box(x,4.31,-1.47,.42,.11,.49,'dark')
 if level>=15:
  roof(1.62,4.86,-1.49,1.97,1.4,.53,'teal',False);pavilion(1.51,2.80,1.16,.91,.6,'teal');frame(-.84,-1.48,2.3,.85,3.56,.49,'sand')

def granary_level(level):
 plinth(5.6);feature('02 Raised ventilated storehouse');platform=.87+(level>=6)*.16
 frame(0,-.20,3.36,2.94,.28,platform-.28);box(0,platform,-.2,3.80,.20,3.25,'wood2',.035)
 height=1.41+(level>=7)*.62
 for x in [-1.68,1.68]:box(x,platform+height/2,-.20,.14,height,2.98,'wood',.025)
 box(0,platform+height/2,-1.64,3.48,height,.15,'wood',.025)
 frame(0,-.20,3.38,2.93,platform+.12,height)
 roof(0,platform+height+.20,-.20,4.09,3.52,.72)
 for x in [-1.26,-.35,.61]:sacks(x,platform+.15,.66,3)
 stairs(0,2.52,1.15,4,.17,.25)
 if level>=3:
  feature('03 Loading bins')
  for x in [-1.87,1.87]:box(x,.72,1.90,.89,.80,.82,'wood2',.02);sphere(x,1.16,1.90,.34,'grain',(1,.45,1))
 if level>=4:
  feature('04 Grain silos');sh=1.5+(level>=10)*1.12
  for x in [-2.20,2.20]:silo(x,-1.35,.43,sh,.28,level>=14)
 if level>=5:
  frame(0,1.58,2.71,1.10,platform,.91);roof(0,platform+1.03,1.59,3.03,1.23,.31,'roof',False)
 if level>=6:box(0,1.45,-.2,3.30,.12,2.80,'wood2')
 if level>=7:
  feature('05 Second grain storage floor');box(0,2.47,-.2,3.6,.15,3.07,'wood2');door(0,2.54,1.36,.71,.88)
 if level>=8:
  for x in [-2.19,2.19]:box(x,1.20,.0,.66,1.6,.67,'cream',.025);roof(x,2.09,0,.82,.83,.35,'teal',False)
 if level>=9:
  for x in [-2.14,2.14]:silo(x,.93,.34,1.30,.3,False)
 if level>=10:
  for x in [-2.19,2.19]:box(x,2.17,-1.35,.88,.13,.91,'wood2');beam((x,2.19,-1.0),(x,3.1,-1.0),.025,'gold')
 if level>=11:
  feature('06 Grain elevator and loading bridge');gantry(0,-1.67,.74,3.76,.28);box(0,3.4,-1.11,.63,.12,1.52,'wood2')
 if level>=12:
  feature('07 Drying loft dormers')
  for x in [-.94,.94]:box(x,3.68,-.10,.74,.59,.65,'cream',.02);roof(x,4.02,-.10,.92,.88,.28,'teal',False)
 if level>=13:
  feature('08 Gravity grain chutes')
  for side in [-1,1]:rod((side*1.02,3.43,-.2),(side*2.10,1.36,.91),.105,'gold',10)
 if level>=14:
  for x in [-2.19,2.19]:dome(x,2.11,0,.44,.39,'teal',16,4);finial(x,2.48,0,.09)
 if level>=15:
  feature('09 Upper royal storehouse');box(0,4.22,-.35,1.25,.57,1.15,'cream',.025);pavilion(0,4.57,-.35,.96,.50,'teal')

def gem_level(level):
 plinth(3.6);feature('02 Crystal terraces and emerald seams')
 for x,z,r,h in [(-.92,-.71,.67,.79),(.25,-.72,.87,1.10),(1.01,-.55,.57,.70)]:sphere(x,.3+h,z,r,'dark',(.92,h/r,.88))
 terrace=.35+(level>=6)*.26
 box(-.65,terrace,-.90,1.40,.16,1.01,'stone',.035)
 for x,z,r,h,lean in [(-1.04,-.89,.19,1.53,-.10),(-.47,-1.15,.27,1.90+(level>=14)*.85,.05),(.37,-.92,.24,1.65,.13),(1.05,-.61,.19,1.21,.05),(-1.26,.14,.14,.76,-.05)]:crystal(x,terrace+.08,z,r,h,'jade' if x<0 else 'emerald',lean)
 feature('03 Arched excavation mouth and rails');box(0,.82,.33,.85,1.08,.10,'black');arch_frame(0,.31,.42,.97,1.45,'wood2');box(0,1.81,.40,1.23,.20,.28,'wood2',.02)
 for x in [-.25,.25]:box(x,.32,1.02,.055,.06,1.31,'iron')
 for z in [.47,.83,1.19,1.56]:box(0,.29,z,.78,.06,.10,'wood')
 ore_cart(0,1.06,'jade')
 if level>=3:arch_frame(-1.05,.31,.37,.61,1.11,'sand')
 if level>=4:
  feature('04 Gem cutting counter');box(-1.11,.76,1.07,.69,.12,.74,'wood2',.02);frame(-1.11,1.07,.47,.52,.28,.4)
  for x,z in [(-1.3,.92),(-.93,.99),(-1.12,1.27)]:crystal(x,.84,z,.095,.28,'quartz',.02)
 if level>=5:feature('05 Excavation headframe');gantry(1.16,-.22,.68,2.26+(level>=8)*.49+(level>=12)*.38,.28)
 if level>=6:box(-.87,.72,-1.23,1.18,.14,.69,'sand',.025);crystal(-1.2,.81,-1.17,.16,1.24,'quartz',.05)
 if level>=7:wheel(-1.24,.91,.37,.42);box(-1.05,.53,.38,.70,.35,.53,'stone',.025)
 if level>=8:box(1.16,2.76,-.22,.95,.13,.77,'wood2',.02);wheel(1.16,3.05,-.22,.24)
 if level>=9:stairs(-1.52,1.36,.39,4,.18,.19)
 if level>=10:
  feature('06 Upper crystal gallery');box(-.33,1.92,-1.23,1.89,.15,.61,'sand',.025)
  for x in [-.84,.18]:arch_frame(x,1.99,-1.12,.66,.90,'sand')
 if level>=11:rod((.69,1.17,1.22),(1.44,1.17,1.22),.26,'gold',12);frame(1.08,1.22,.70,.38,.3,.74)
 if level>=12:
  feature('07 Second extraction lift');beam((1.16,3.41,-.22),(.26,3.41,.11),.075,'iron');beam((.26,3.4,.11),(.26,1.88,.11),.018,'cream');box(.26,1.80,.11,.42,.35,.38,'dark',.018)
 if level>=13:roof(-1.05,1.41,1.03,.95,.98,.29,'teal',False)
 if level>=14:crystal(.28,2.01,-1.27,.18,1.82,'quartz',-.08)
 if level>=15:
  feature('08 Crowned gem gallery');roof(-.34,3.03,-1.21,1.97,.96,.43,'teal',False);roof(1.16,3.65,-.22,1.03,.91,.31,'teal',False)
  for x in [-.57,.02]:rod((x,2.4,-.96),(x,1.0,.19),.077,'gold',10)

BUILDERS={'farm':farm_level,'lumber':lumber_level,'mine':mine_level,'granary':granary_level,'gem_mine':gem_level}
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=8;scene.cycles.use_denoising=True
scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.world.color=(.35,.35,.35);scene.view_settings.view_transform='AgX'
for name,location,energy,size in [('Key',(4,-6,10),1300,7),('Fill',(-6,-1,6),900,8),('Rim',(1,6,9),1200,5)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=location;ob.rotation_euler=(Vector((0,0,1.5))-ob.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('Economy level portrait camera');camera=bpy.data.objects.new('Economy level portrait camera',data);scene.collection.objects.link(camera);scene.camera=camera;data.type='ORTHO'
manifest=[];collections=[]
for kind,builder in BUILDERS.items():
 for level in range(2,16):
  random.seed(804+level);parts={};builder(level);coll=bpy.data.collections.new(f'{kind}_{level:02d}');scene.collection.children.link(coll);collections.append(coll)
  for (name,mi),(v,f,colors) in parts.items():
   me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();attr=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');attr.data.foreach_set('color',[c for rgba in colors for c in rgba]);me.materials.append(mats[mi]);ob=bpy.data.objects.new(name,me);coll.objects.link(ob)
  verts=[v.co for ob in coll.objects for v in ob.data.vertices];lo=Vector([min(v[i] for v in verts) for i in range(3)]);hi=Vector([max(v[i] for v in verts) for i in range(3)])
  span=3.6 if kind=='gem_mine' else 5.6;horizontal=max(hi.x-lo.x,hi.y-lo.y);factor=min(1,span/horizontal)
  offset=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
  for ob in coll.objects:
   for v in ob.data.vertices:v.co=(v.co-offset)*factor
  coll['upgrade']=SCHEMES[kind][level-1];coll['level']=level;coll['building_type']=kind;coll['source']='Original component geometry derived from established Monsoon Kingdoms architectural helpers.'
  exports=[]
  for mi in range(2):
   bpy.ops.object.select_all(action='DESELECT');copies=[]
   for o in coll.objects:
    if o.data.materials[0]!=mats[mi]:continue
    cp=o.copy();cp.data=o.data.copy();scene.collection.objects.link(cp);cp.select_set(True);copies.append(cp)
   if not copies:continue
   bpy.context.view_layer.objects.active=copies[0]
   if len(copies)>1:bpy.ops.object.join()
   ob=bpy.context.object;ob.name=f'{kind}_{level}'+('_metal' if mi else '_structure');exports.append(ob)
  total=0
  for ob in exports:ob.data.calc_loop_triangles();total+=len(ob.data.loop_triangles)
  if total>20000:
   for ob in exports:
    bpy.context.view_layer.objects.active=ob;dec=ob.modifiers.new('Mobile level geometry budget','DECIMATE');dec.ratio=19400/total;bpy.ops.object.modifier_apply(modifier=dec.name)
  total=0
  for ob in exports:ob.data.calc_loop_triangles();total+=len(ob.data.loop_triangles)
  bpy.ops.object.select_all(action='DESELECT')
  for ob in exports:ob.select_set(True)
  folder=OUT/kind;folder.mkdir(parents=True,exist_ok=True);target=folder/f'{level}.glb'
  temporary=target.with_name('.'+target.name);bpy.ops.export_scene.gltf(filepath=str(temporary),export_format='GLB',use_selection=True,export_materials='EXPORT',export_yup=True,export_apply=True,export_extras=True,export_cameras=False,export_lights=False)
  temporary.replace(target)
  for ob in exports:bpy.data.objects.remove(ob,do_unlink=True)
  height=(hi.z-lo.z)*factor;look=Vector((0,0,height*.40));camera.location=look+Vector((10,-13,12));camera.rotation_euler=(look-camera.location).to_track_quat('-Z','Y').to_euler();axes=[camera.rotation_euler.to_quaternion()@Vector(v) for v in [(1,0,0),(0,1,0)]];extent=max(abs((v.co-look).dot(axis)) for ob in coll.objects for v in ob.data.vertices for axis in axes);data.ortho_scale=max(span*1.48,height*1.3,extent*2.12,2.8);scene.render.filepath=str(folder/f'{level}.png')
  bpy.ops.render.render(write_still=True);coll.hide_render=True
  row={'id':kind,'level':level,'file':f'assets/buildings/levels/{kind}/{level}.glb','preview':f'assets/buildings/levels/{kind}/{level}.png','new_structure':SCHEMES[kind][level-1],'triangles':total,'materials':len(exports),'bytes':target.stat().st_size,'size':[round((hi.x-lo.x)*factor,4),round(height,4),round((hi.y-lo.y)*factor,4)],'footprint':[2,2] if kind=='gem_mine' else [3,3]};manifest.append(row)
  assert total<=20000 and row['materials']<=4
  print('LEVEL_READY '+json.dumps(row),flush=True)
for coll in collections:coll.hide_render=coll.name!='farm_15';coll.hide_viewport=coll.name!='farm_15'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/levels-economy.blend'))
(OUT/'economy-manifest.json').write_text(json.dumps({'source':'assets/blender/levels-economy.blend','coordinates':'meters; centered XZ; +Y up; feet0','level1':'Existing assets/buildings/{type}.glb and .png preserved unchanged','schemes':SCHEMES,'assets':manifest},indent=2))
lines=['# Economy building levels','', 'Levels 2–15 use original editable solid geometry and two shared vertex-color materials. Level 1 continues to use each existing base GLB and PNG. The placement grid never expands: the four ordinary buildings fit 3×3 cells and Gem Garden fits 2×2. Gold trim accompanies new working structures; no upgrade is only a recolor or banner.','', 'Run `Blender -b --factory-startup --python tools/build-levels-economy.py`. Source collections are named `farm_02` through `gem_mine_15`; only `farm_15` starts visible. Source preserves individual functional component groups, while exports merge them to two material batches. Mobile export ceiling: 20,000 triangles. Runtime portraits are transparent 512×512 CPU Cycles renders.','']
for kind,steps in SCHEMES.items():
 lines.extend(['## '+kind.replace('_',' ').title(),'','| Level | Structural progression |','|---|---|']+[f'| {i+1} | {step} |' for i,step in enumerate(steps)]+[''])
(OUT/'ECONOMY-LEVELS.md').write_text('\n'.join(lines))
print('ECONOMY_LEVELS_COMPLETE',flush=True)
