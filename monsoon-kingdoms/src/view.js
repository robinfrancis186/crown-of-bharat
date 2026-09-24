import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CATALOG, UNITS, HEROES, SPELLS } from './rules.js';
import { cameraLimits, villageFocus } from './camera-framing.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { prepareGroundedModel, stepGroundedMotion } from './grounded-motion.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ParticleField, waterMaterial, addWindSway, addCloudShade, addRimLight, rangoliTexture, Flock, Butterflies } from './atmosphere.js';
import { PostFX } from './postfx.js';
import { CharacterForge } from './characters.js';
import { PhysicsWorld, RigidBody, Spring, Spring3 } from './physics.js';
// Stone, plaster, timber and tile colours each structure breaks into.
const RUBBLE={fort:['#f1ede4','#e4ddd0','#c9b48a'],wall:['#c9ab7c','#b89868','#a88a5c'],barracks:['#b5533a','#d98b5f','#e9dcc0'],archer_tower:['#c77a4a','#e9dcc0','#b5533a'],cannon:['#6d6a64','#8b5a2b','#4a4540'],farm:['#8b5a2b','#d7b56d','#4c8a3a'],lumber:['#8b5a2b','#6d4a2c','#c8553d'],market:['#e8a0a0','#e9dcc0','#c8553d'],stepwell:['#d9b98a','#c9a877','#3f979c'],hero_hall:['#f1ede4','#d9a93f','#c9b48a']};

export const TROOP_GROUND_Y=-.055;
export const wallVisualScale={x:.90,y:.58,z:.90};

const cell = v => (v - 12) * 2;
const rand = (() => { let seed=8123; return () => ((seed = Math.imul(1664525,seed)+1013904223|0)>>>0)/4294967296; })();
const mat = (color, extra={}) => new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
const HEAVY_UNITS=new Set(['elephant','yeti','rider']);
const RANGED_UNITS=new Set(['archer','bowler','garuda','healer']);
// Troops and heroes render a little larger than their footprint so silhouettes read on phones.
export const unitScale=unit=>unit.decoy?1.16:unit.heroId?1.62:HEAVY_UNITS.has(unit.type)?1.26:1.48;
const SMOKE_BUILDINGS=new Set(['laboratory','barracks','market']);
export class KingdomView {
  constructor(canvas, onTap) {
    this._inputEnabled=true;this.motionQuery=matchMedia('(prefers-reduced-motion: reduce)');this.reducedMotion=this.motionQuery.matches;this.motionQuery.addEventListener('change',e=>{this.reducedMotion=e.matches;});
    this.canvas=canvas; this.scene=new THREE.Scene(); this.scene.background=new THREE.Color('#b6d5c7');
    this.scene.fog=new THREE.Fog('#b6d5c7',105,185);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6)); this.renderer.shadowMap.enabled=true;this.renderer.info.autoReset=false;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap; this.renderer.shadowMap.autoUpdate=false;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.08;
    // Soft image-based light gives marble, brass and water believable reflections.
    try{const pmrem=new THREE.PMREMGenerator(this.renderer);this.scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;this.scene.environmentIntensity=.32;pmrem.dispose();}catch{}
    this.worldUniforms={uWindTime:{value:0},uCloudTime:{value:0},uCloudAmount:{value:.2}};
    this.camera=new THREE.OrthographicCamera(); this.camera.near=.1;this.camera.far=250;
    this.target=new THREE.Vector3(0,0,0); this.angle=Math.PI/4; this.span=59;
    this.scene.add(new THREE.HemisphereLight('#e6f0ff','#6f8140',1.3));
    this.sun=new THREE.DirectionalLight('#ffe9c2',3.2);this.sun.position.set(-24,50,24);
    this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-46,right:46,top:46,bottom:-46,near:1,far:130});this.sun.shadow.bias=-.00035;this.sun.shadow.normalBias=.035; this.scene.add(this.sun);
    this.groundMotion=new Map();this.labelCamera=new THREE.OrthographicCamera();this.quality='balanced';this.animations={};this.modelTops={};this.mixers=new Map();this.spellAreas=new Map();this.heroEffects=new Map();this.textures={};
    this.board=new THREE.Group();this.scene.add(this.board);this.models={};this.modelLoads=new Map();this.modelFailures=new Map();this.variantCache=new Map();this.buildings=new Map();this.troops=new Map();this.unitBars=new Map();this.effects=[];this.lastEvent=0;this.time=0;this.shake=0;this.shaking=false;this.hitShakes=new Map();this.deaths=new Map();this.unitDeaths=new Map();
    this.ray=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    this.selection=new THREE.Group();this.scene.add(this.selection); this.ghost=new THREE.Group();this.scene.add(this.ghost);
    this.spellAim=new THREE.Group();this.spellAim.visible=false;this.scene.add(this.spellAim);
    this.labelHost=document.createElement('div');this.labelHost.className='world-labels';document.body.append(this.labelHost);
    this.postfx=new PostFX(this.renderer,this.scene,this.camera);this.postfx.configure(this.quality);
    // Procedurally modelled, fully rigged characters and a visual physics world.
    this.forge=new CharacterForge();this.actors=new Set();this.corpses=new Set();this.lastHit=new Map();
    this.physics=new PhysicsWorld({maxBodies:170});this.physics.onRemove=body=>{if(body.object){this.scene.remove(body.object);if(body.object.userData.actor){this.actors.delete(body.object.userData.actor);body.object.userData.actor.dispose();}if(body.object.userData.ownMaterial)body.object.material.dispose?.();}if(body.corpse)this.corpses.delete(body);};
    this.rubbleGeometry=new THREE.BoxGeometry(1,1,1);this.rubbleMaterials=new Map();this.ballGeometry=new THREE.SphereGeometry(.26,12,9);this.ballMaterial=new THREE.MeshStandardMaterial({color:'#3f3d39',roughness:.55,metalness:.4});this.heroAuras=new Map();this.ruinSmoke=new Map();this.emitClock=0;this.celebration=null;this.footfalls=new Map();
    this.labels=new Map();this.resize=()=>{this.renderer.setSize(innerWidth,innerHeight);this.postfx?.resize();this.updateCamera();};addEventListener('resize',this.resize);this.resize();
    const pointers=new Map();let drag=null,pinch=0;
    const release=id=>{if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);};
    this.cancelGesture=()=>{const ids=[...pointers.keys()];pointers.clear();drag=null;pinch=0;for(const id of ids)release(id);};
    canvas.addEventListener('pointerdown',e=>{
      if(!this.inputEnabled)return;
      canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={total:pointers.size>1?100:0};
      if(pointers.size>=2){const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}
    });
    canvas.addEventListener('pointermove',e=>{
      if(!this.inputEnabled){this.cancelGesture();return;}if(!pointers.has(e.pointerId))return;
      const prev=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size>=2){const p=[...pointers.values()],dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);this.span*=pinch/Math.max(10,dist);pinch=dist;drag.total=100;this.updateCamera();return;}
      if(!drag)return;const dx=e.clientX-prev.x,dy=e.clientY-prev.y;drag.total+=Math.abs(dx)+Math.abs(dy);const scale=this.span/innerHeight;
      this.target.x+=(-dx*Math.cos(this.angle)-dy*Math.sin(this.angle)*1.3)*scale;this.target.z+=(dx*Math.sin(this.angle)-dy*Math.cos(this.angle)*1.3)*scale;
      this.updateCamera();
    });
    canvas.addEventListener('pointerup',e=>{
      if(!this.inputEnabled){this.cancelGesture();return;}
      const tap=pointers.has(e.pointerId)&&pointers.size===1&&drag&&drag.total<8;
      pointers.delete(e.pointerId);release(e.pointerId);drag=pointers.size?{total:100}:null;pinch=0;
      if(tap)onTap(this.pick(e.clientX,e.clientY));
    });
    canvas.addEventListener('pointercancel',this.cancelGesture);
    canvas.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))this.cancelGesture();});
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('wheel',e=>{if(!this.inputEnabled)return;e.preventDefault();this.span*=Math.exp(e.deltaY*.001);this.updateCamera();},{passive:false});
  }
  get inputEnabled(){return this._inputEnabled;}
  set inputEnabled(enabled){this._inputEnabled=!!enabled;if(!this._inputEnabled)this.cancelGesture?.();}
  updateCamera(){
    const aspect=innerWidth/innerHeight,limits=cameraLimits(this.mode,aspect);
    this.span=THREE.MathUtils.clamp(this.span,limits.min,limits.max);
    this.target.x=THREE.MathUtils.clamp(this.target.x,-limits.pan,limits.pan);this.target.z=THREE.MathUtils.clamp(this.target.z,-limits.pan,limits.pan);
    const span=this.span,offset=aspect>1?Math.min(3,span*.065):0;
    this.camera.left=-span*aspect/2+offset;this.camera.right=span*aspect/2+offset;this.camera.top=span/2;this.camera.bottom=-span/2;
    this.camera.position.copy(this.target).add(new THREE.Vector3(Math.sin(this.angle)*62,78,Math.cos(this.angle)*62));this.camera.lookAt(this.target);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();if(this.labelCamera)this.labelCamera.copy(this.camera);
  }
  cameraAction(action){
    if(action==='zoomIn')this.span*=.83;if(action==='zoomOut')this.span*=1.2;
    if(action==='rotate')this.angle+=Math.PI/2;
    if(action==='reset'){
      this.span=cameraLimits(this.mode,innerWidth/innerHeight).start;this.angle=Math.PI/4;
      const focus=this.mode==='home'?villageFocus([...this.buildings.values()].map(o=>o.userData.building)):{x:0,z:0};
      this.target.set(focus.x,0,focus.z);
    }
    this.updateCamera();
  }
  mesh(geometry,material,x=0,y=0,z=0,parent=this.scene){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m;}
  setQuality(value){
    const quality=['low','balanced','ultra'].includes(value)?value:'balanced';if(this.quality===quality)return;
    this.quality=quality;const ratio={low:1,balanced:1.6,ultra:2}[quality],size={low:1024,balanced:2048,ultra:4096}[quality];
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,ratio));this.sun.shadow.mapSize.set(size,size);this.postfx?.configure(quality);
    this.sun.shadow.map?.dispose();this.sun.shadow.map=null;this.renderer.shadowMap.needsUpdate=true;this.resize();
  }
  async loadTextures(){
    const loader=new THREE.TextureLoader();await Promise.all(['marble','sandstone','cloth','grass'].map(async name=>{
      const maps={};await Promise.all(['basecolor','normal','roughness'].map(async channel=>{
        const t=await loader.loadAsync(`./assets/textures/${name}/${channel}-1024.png`);t.colorSpace=channel==='basecolor'?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());t.repeat.setScalar(name==='grass'?12:1);maps[channel]=t;
      }));this.textures[name]=maps;
    }));
  }
  detailModel(root,name,folder){
    const architecture=['fort','fort_2','fort_3','hero_hall','stepwell','laboratory','granary','barracks','archer_tower','market','wall','wall_2','wall_3'].includes(name);
    root.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
      const detail=m=>{if(folder==='environment'&&/foliage/i.test(m.name)){m.color.set(/Sunlit/i.test(m.name)?'#5f8e29':'#356b24');m.roughness=.96;}const textile=/cloth|woven|cotton|silk/i.test(m.name),stone=folder==='buildings'&&architecture&&m.metalness<.4;if(!textile&&!stone)return m;
        let uv=o.geometry.getAttribute('uv');if(!uv){const pos=o.geometry.getAttribute('position'),normal=o.geometry.getAttribute('normal'),data=new Float32Array(pos.count*2);for(let i=0;i<pos.count;i++){const ax=Math.abs(normal?.getX(i)||0),ay=normal?Math.abs(normal.getY(i)):1,az=Math.abs(normal?.getZ(i)||0);data[i*2]=(ax>ay&&ax>az?pos.getZ(i):pos.getX(i))*.5;data[i*2+1]=(ay>=ax&&ay>=az?pos.getZ(i):pos.getY(i))*.5;}o.geometry.setAttribute('uv',new THREE.BufferAttribute(data,2));}
        const maps=this.textures[textile?'cloth':['fort','fort_2','fort_3','hero_hall'].includes(name)?'marble':'sandstone'];
        m.map=maps.basecolor;m.normalMap=maps.normal;m.roughnessMap=maps.roughness;m.normalScale.setScalar(textile?.18:.22);m.roughness=textile?.92:.9;m.needsUpdate=true;return m;
      };o.material=Array.isArray(o.material)?o.material.map(detail):detail(o.material);
    });
  }
  async load(progress,buildings=[]){
    const people=this.forge?[]:[...Object.keys(HEROES).map(x=>['heroes',x]),...Object.keys(UNITS).map(x=>['units',x])];
    const paths=[...Object.keys(CATALOG).map(x=>['buildings',x]),...people,...['banyan','palm','rocks','bush','cart','jars'].map(x=>['environment',x])];let done=0;const loader=new GLTFLoader();
    await Promise.all([this.loadTextures(),...paths.map(async([folder,name])=>{const gltf=await loader.loadAsync(`./assets/${folder}/${name}.glb`);this.models[name]=gltf.scene;this.animations[name]=gltf.animations;this.modelTops[name]=new THREE.Box3().setFromObject(gltf.scene).max.y;progress(++done/paths.length*.85,`Carving the valley · ${done}/${paths.length}`);})]);
    for(const[folder,name]of paths){this.detailModel(this.models[name],name,folder);if(folder==='units'||folder==='heroes')this.prepareCharacterModel(this.models[name],name);}
    if(this.forge){for(const id of [...Object.keys(UNITS),...Object.keys(HEROES)])if(this.forge.has(id)){this.forge.blueprint(id);this.modelTops[id]=this.forge.blueprint(id).height;}progress(.9,'Dressing the royal army');}
    await this.ensureBuildingModels(buildings);this.makeLandscape();progress(.95,'Opening the gates of Surajgarh');
  }
  prepareCharacterModel(root,name){
    // New Blender heroes ship real skins and this solver's neutral bone layout.
    // Keep that rig; only legacy merged models need a generated runtime skin.
    if(!root.userData.groundGait)root.traverse(node=>{if(node.userData.groundGait)root.userData.groundGait=node.userData.groundGait;});
    // Rim light: gold for heroes, warm ivory for troops, so silhouettes separate from grass.
    const hero=Object.hasOwn(HEROES,name);root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.isMeshStandardMaterial)addRimLight(m,hero?'#ffcf6b':'#fff1d0',hero?.55:.32);});
    if(!root.userData.groundGait)prepareGroundedModel(root,name);
    else if(!root.userData.gaitBoundsPrepared){root.updateMatrixWorld(true);root.traverse(mesh=>{if(mesh.isSkinnedMesh){mesh.computeBoundingSphere();mesh.boundingSphere.radius+=root.userData.groundGait.hip*.8;}});root.userData.gaitBoundsPrepared=true;}
  }
  buildingAsset(type,level){return level>1?`${type}_${level}`:type;}
  async preloadBuilding(type,level){
    if(!CATALOG[type]||level<=1||level>CATALOG[type].maxLevel)return;
    const key=this.buildingAsset(type,level);
    if(this.models[key]){this.variantCache.delete(key);this.variantCache.set(key,true);return;}
    if(this.modelLoads.has(key))return this.modelLoads.get(key);
    if(Date.now()-(this.modelFailures.get(key)||0)<30000)return;
    const promise=new GLTFLoader().loadAsync(`./assets/buildings/levels/${type}/${level}.glb`).then(gltf=>{
      this.detailModel(gltf.scene,type,'buildings');this.models[key]=gltf.scene;this.animations[key]=gltf.animations;
      this.modelTops[key]=new THREE.Box3().setFromObject(gltf.scene).max.y;this.variantCache.set(key,true);this.modelFailures.delete(key);
    }).catch(error=>{this.modelFailures.set(key,Date.now());dispatchEvent(new CustomEvent('kingdom-asset-error',{detail:{type,level}}));throw error;}).finally(()=>this.modelLoads.delete(key));
    this.modelLoads.set(key,promise);return promise;
  }
  ensureBuildingModels(buildings){return Promise.all([...new Map(buildings.map(b=>[this.buildingAsset(b.type,b.level),b])).values()].map(b=>this.preloadBuilding(b.type,b.level)));}
  trimModelCache(){
    if(this.variantCache.size<=16)return;
    // Keep displayed geometry alive; retain at most16 additional tier models for revisits.
    const used=new Set([...this.buildings.values()].flatMap(o=>[o.userData.asset,o.userData.wanted]));let spare=0;
    for(const key of [...this.variantCache.keys()].reverse())if(!used.has(key)&&++spare>16){
      this.models[key].traverse(o=>{o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])m.dispose();});
      delete this.models[key];delete this.animations[key];delete this.modelTops[key];this.variantCache.delete(key);
    }
  }
  clone(name,parent=this.scene,x=0,z=0,scale=1){
    const source=this.models[name],obj=source.userData.groundGait?cloneSkeleton(source):source.clone(true);
    obj.position.set(x,source.userData.groundGait?TROOP_GROUND_Y:0,z);obj.scale.setScalar(scale);parent.add(obj);
    if(source.userData.groundGait){
      // SkeletonUtils clones each skinned material primitive separately. They all
      // reference the same actor bones, so share one palette/texture within it.
      let skeleton;obj.traverse(mesh=>{if(mesh.isSkinnedMesh){if(!skeleton)skeleton=mesh.skeleton;else mesh.skeleton=skeleton;}});
      this.groundMotion.set(obj,{x,z});
    }
    if(this.animations[name]?.length){
      const authored=this.animations[name].find(clip=>/idle/i.test(clip.name))||this.animations[name][0];
      // Native export clips remain available to other engines. Runtime locomotion
      // owns these leg bones, so an idle clip must never overwrite planted feet.
      const tracks=authored.tracks.filter(track=>!source.userData.groundGait||!/(?:^|[/.])Ground(?:Body|Hip\d+|Knee\d+|Foot\d+)\./.test(track.name));
      if(tracks.length){const clip=new THREE.AnimationClip(authored.name,authored.duration,tracks,authored.blendMode),mixer=new THREE.AnimationMixer(obj);mixer.clipAction(clip).play();mixer.setTime(rand()*2);this.mixers.set(obj,mixer);}
    }return obj;
  }
  // A rigged character from the forge (or the legacy Blender clone when no forge exists).
  makeActor(id,{hero=false,scale=1}={}){
    if(!this.forge?.has(id))return this.clone(id,this.scene,0,0,scale);
    const actor=this.forge.spawn(id,{hero});actor.root.scale.setScalar(scale);this.scene.add(actor.root);this.actors.add(actor);
    if(actor.cape)this.scene.add(actor.cape.mesh);
    return actor.root;
  }
  releaseMixer(obj){
    const actor=obj.userData?.actor;if(actor){this.actors.delete(actor);actor.dispose();return;}
    const mixer=this.mixers.get(obj);if(mixer){mixer.stopAllAction();mixer.uncacheRoot(obj);this.mixers.delete(obj);}
    this.groundMotion?.delete(obj);const skeletons=new Set();obj.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const skeleton of skeletons)skeleton.dispose();if(obj.userData.decoy)this.clearOverlay(obj);
  }
  makeLandscape(){
    const grassCanvas=document.createElement('canvas');grassCanvas.width=grassCanvas.height=1024;const ctx=grassCanvas.getContext('2d');ctx.fillStyle='#82ac49';ctx.fillRect(0,0,1024,1024);
    for(let i=0;i<26000;i++){const x=rand()*1024,y=rand()*1024;ctx.fillStyle=`rgba(${rand()>.5?'210,201,123':'50,88,40'},${.04+rand()*.1})`;ctx.beginPath();ctx.ellipse(x,y,1+rand()*3,1+rand()*2,rand()*3,0,7);ctx.fill();}
    ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.28;for(let z=0;z<4;z++)for(let x=0;x<4;x++)ctx.drawImage(this.textures.grass.basecolor.image,x*256,z*256,256,256);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    // Every square is one build cell; gentle contrast keeps roofs easy to read.
    const plot=1024*2/49,inset=1024*.5/49;for(let z=0;z<24;z++)for(let x=0;x<24;x++){ctx.fillStyle=(x+z)%2?'rgba(238,245,160,.045)':'rgba(43,93,31,.035)';ctx.fillRect(inset+x*plot,inset+z*plot,plot,plot);}
    // Worn paths remain understated beneath the editable village.
    ctx.strokeStyle='rgba(224,205,133,.24)';ctx.lineWidth=11;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(480,100);ctx.lineTo(480,870);ctx.moveTo(150,555);ctx.lineTo(830,555);ctx.stroke();
    const texture=new THREE.CanvasTexture(grassCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    this.mesh(new THREE.BoxGeometry(49,.9,49),mat('#806e49'),0,-.55,0);
    const landMaterial=mat('#ffffff',{map:texture,normalMap:this.textures.grass.normal,roughnessMap:this.textures.grass.roughness,normalScale:new THREE.Vector2(.25,.25),envMapIntensity:.4});addCloudShade(landMaterial,this.worldUniforms);
    const land=this.mesh(new THREE.PlaneGeometry(49,49),landMaterial,0,-.06,0);land.rotation.x=-Math.PI/2;
    const meadow=mat('#87aa65',{map:this.textures.grass.basecolor,normalMap:this.textures.grass.normal,roughnessMap:this.textures.grass.roughness,normalScale:new THREE.Vector2(.2,.2),envMapIntensity:.4});addCloudShade(meadow,this.worldUniforms);
    this.mesh(new THREE.BoxGeometry(180,1,180),meadow,0,-2.1,0);
    // The valley's river and broad banks frame a clear, square buildable plateau.
    const riverMat=waterMaterial();this.waterMaterial=riverMat;
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-76,-.95,-61),new THREE.Vector3(-39,-.95,-28),new THREE.Vector3(-32,-.95,4),new THREE.Vector3(-30,-.95,29),new THREE.Vector3(-3,-.95,39),new THREE.Vector3(42,-.95,43),new THREE.Vector3(77,-.95,68)]);
    const ribbon=(width,material,y)=>{const points=curve.getPoints(160),pos=[],uv=[],indices=[];points.forEach((p,i)=>{const tangent=curve.getTangent(i/160),side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();for(const sign of [-1,1]){const v=p.clone().addScaledVector(side,width/2*sign);pos.push(v.x,y,v.z);uv.push(i/160,(sign+1)/2);}if(i<160){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}});const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return this.mesh(geo,material);};
    const bank=mat('#b4ac7f',{side:THREE.DoubleSide});addCloudShade(bank,this.worldUniforms);ribbon(13,bank,-1.0);this.water=ribbon(10,riverMat,-.93);this.water.receiveShadow=false;
    const ripplePoints=[];for(let i=0;i<180;i++){const t=.08+rand()*.84,p=curve.getPoint(t),tangent=curve.getTangent(t),side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();p.addScaledVector(side,(rand()-.5)*7);const length=.35+rand()*1.2;ripplePoints.push(new THREE.Vector3(p.x-tangent.x*length,-.91,p.z-tangent.z*length),new THREE.Vector3(p.x+tangent.x*length,-.91,p.z+tangent.z*length));}
    this.ripples=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ripplePoints),new THREE.LineBasicMaterial({color:'#b8e6cf',transparent:true,opacity:.2}));this.ripples.visible=false;this.scene.add(this.ripples);
    // Shared geometry and materials keep a dense forest inexpensive.
    const placement=[];for(let i=0;i<220;i++){const edge=i<110,side=i%4,t=(rand()-.5)*(edge?76:118),distance=28+rand()*11;const x=edge?(side<2?(side===0?-distance:distance):t):(rand()-.5)*118,z=edge?(side>=2?(side===2?-distance:distance):t):(rand()-.5)*118;if(Math.abs(x)<27&&Math.abs(z)<27)continue;if(x < -25&&x>-43&&z<40)continue;if(z>32&&z<49)continue;placement.push({x,z,s:(edge?.75:.85)+rand()*.8,r:rand()*7,type:i%7===0?'palm':'banyan'});}
    for(const type of ['banyan','palm']){const p=placement.filter(p=>p.type===type);this.models[type].updateMatrixWorld(true);this.models[type].traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material])addWindSway(m,this.worldUniforms,type==='palm'?1.4:1);const inst=new THREE.InstancedMesh(o.geometry,o.material,p.length),m=new THREE.Matrix4(),q=new THREE.Quaternion();p.forEach((p,i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),p.r);m.compose(new THREE.Vector3(p.x,-1.5,p.z),q,new THREE.Vector3(p.s,p.s,p.s)).multiply(o.matrixWorld);inst.setMatrixAt(i,m);});inst.castShadow=true;inst.receiveShadow=true;this.scene.add(inst);});}
    this.makeMeadow(curve);
    for(let i=0;i<38;i++){const side=i%4,t=rand()*49-24.5,x=side<2?(side===0?-25.4:25.4):t,z=side>=2?(side===2?-25.4:25.4):t;this.clone(i%3===0?'rocks':'bush',this.scene,x,z,.45+rand()*.4);}
    this.clone('cart',this.scene,20,23,.8);this.clone('jars',this.scene,16,23,.85);
    for(let i=0;i<12;i++){const x=(rand()-.5)*145,z=-50-rand()*28;const hill=this.mesh(new THREE.SphereGeometry(9+rand()*10,10,7),mat(i%2?'#7d9a79':'#69886c'),x,-2,z);hill.scale.set(1,.45+rand()*.4,.8);}
    const border=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-24,.02,-24),new THREE.Vector3(24,.02,-24),new THREE.Vector3(24,.02,24),new THREE.Vector3(-24,.02,24)]),new THREE.LineBasicMaterial({color:'#eee4b2',transparent:true,opacity:.35}));this.scene.add(border);
    this.grid=new THREE.GridHelper(48,24,'#e0d9ad','#e0d9ad');this.grid.position.y=.035;this.grid.material.transparent=true;this.grid.material.opacity=.22;this.grid.visible=false;this.scene.add(this.grid);
    this.deployment=new THREE.Group();this.scene.add(this.deployment);const band=mat('#e6ca70',{transparent:true,opacity:.32,depthWrite:false});for(const[x,z,w,h]of [[-21,0,6,48],[21,0,6,48],[0,-21,36,6],[0,21,36,6]]){const m=this.mesh(new THREE.PlaneGeometry(w,h),band,x,.04,z,this.deployment);m.rotation.x=-Math.PI/2;}const deploymentLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-18,.08,-18),new THREE.Vector3(18,.08,-18),new THREE.Vector3(18,.08,18),new THREE.Vector3(-18,.08,18)]),new THREE.LineDashedMaterial({color:'#e8b958',dashSize:1,gapSize:.55}));deploymentLine.computeLineDistances();this.deployment.add(deploymentLine);this.deployment.visible=false;
    this.ambientPeople=[];for(let i=0;i<8;i++){const obj=this.makeActor(['guard','engineer','archer','healer'][i%4],{scale:1.05}),phase=i*.78;obj.userData.actor?.setAction('walk');obj.position.set(Math.sin(phase)*3.5-1.5,TROOP_GROUND_Y,Math.cos(phase)*16);obj.rotation.y=Math.atan2(Math.cos(phase)*3.5,-Math.sin(phase)*16);obj.traverse(mesh=>{if(mesh.isMesh)mesh.castShadow=false;});this.ambientPeople.push({obj,phase});}
    // One instanced draw adds soft contact beneath every footprint, including walls.
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const shadowContext=shadowCanvas.getContext('2d'),gradient=shadowContext.createRadialGradient(32,32,7,32,32,32);gradient.addColorStop(0,'rgba(28,40,17,.48)');gradient.addColorStop(.55,'rgba(28,40,17,.26)');gradient.addColorStop(1,'rgba(28,40,17,0)');shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,64,64);
    this.contactShadows=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,toneMapped:false}),576);this.contactShadows.count=0;this.contactShadows.frustumCulled=false;this.scene.add(this.contactShadows);
    this.troopContactShadows=new THREE.InstancedMesh(this.contactShadows.geometry,this.contactShadows.material,256);this.troopContactShadows.count=0;this.troopContactShadows.frustumCulled=false;this.scene.add(this.troopContactShadows);
    // Attackers stand on a faint saffron ring so a crowded battle stays legible.
    this.troopRings=new THREE.InstancedMesh(new THREE.RingGeometry(.36,.5,28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.55,depthWrite:false,toneMapped:false}),256);this.troopRings.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(256*3),3);this.troopRings.count=0;this.troopRings.frustumCulled=false;this.troopRings.renderOrder=3;this.scene.add(this.troopRings);
    const rangoli=rangoliTexture();if(rangoli){this.auraGeometry=new THREE.PlaneGeometry(3.4,3.4).rotateX(-Math.PI/2);this.auraMaterial=new THREE.MeshBasicMaterial({map:rangoli,transparent:true,opacity:.9,depthWrite:false,toneMapped:false});}
    const capacity=this.quality==='low'?500:1100;this.glow=new ParticleField(this.scene,{capacity,additive:true});this.dust=new ParticleField(this.scene,{capacity});
    this.flock=new Flock(this.scene,7);this.butterflies=new Butterflies(this.scene,10);
    this.renderer.shadowMap.needsUpdate=true;
  }
  // Wildflowers and grass tufts on the meadow around the plateau (never on build cells).
  makeMeadow(curve){
    const river=curve.getPoints(120),clear=(x,z)=>river.every(p=>Math.hypot(p.x-x,p.z-z)>8.5),tufts=[],flowers=[];
    for(let i=0;i<1400&&(tufts.length<520||flowers.length<260);i++){
      const x=(rand()-.5)*130,z=(rand()-.5)*130;if(Math.abs(x)<26.5&&Math.abs(z)<26.5)continue;if(!clear(x,z))continue;
      if(tufts.length<520)tufts.push({x,z,s:.7+rand()*.8,r:rand()*7});
      if(rand()<.55&&flowers.length<260)flowers.push({x:x+(rand()-.5)*2,z:z+(rand()-.5)*2,s:.8+rand()*.6,c:rand()});
    }
    const place=(mesh,list,y,colors)=>{const m=new THREE.Matrix4(),q=new THREE.Quaternion(),color=new THREE.Color();list.forEach((p,i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),p.r||0);m.compose(new THREE.Vector3(p.x,y,p.z),q,new THREE.Vector3(p.s,p.s,p.s));mesh.setMatrixAt(i,m);if(colors)mesh.setColorAt(i,color.set(colors[Math.floor(p.c*colors.length)]));});mesh.receiveShadow=true;this.scene.add(mesh);return mesh;};
    const bladeMaterial=new THREE.MeshStandardMaterial({color:'#6f9a3a',roughness:.95,flatShading:true});addWindSway(bladeMaterial,this.worldUniforms,6);
    const blade=new THREE.ConeGeometry(.22,.8,4,1).translate(0,.4,0),tuftGeo=new THREE.BufferGeometry();
    {const parts=[0,1,2].map(i=>blade.clone().rotateZ((i-1)*.35).rotateY(i*2.1).translate((i-1)*.12,0,(i%2)*.1));const pos=[];for(const g of parts){const a=g.toNonIndexed().getAttribute('position');for(let k=0;k<a.count;k++)pos.push(a.getX(k),a.getY(k),a.getZ(k));}tuftGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));tuftGeo.computeVertexNormals();}
    place(new THREE.InstancedMesh(tuftGeo,bladeMaterial,tufts.length),tufts,-1.62);
    const bloomMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.7,emissive:'#3a2a10',emissiveIntensity:.25});
    const bloom=new THREE.IcosahedronGeometry(.16,0).translate(0,.55,0);
    place(new THREE.InstancedMesh(bloom,bloomMaterial,flowers.length),flowers,-1.62,['#ffb000','#ff8a00','#f6f0e0','#e8577a','#ffd23f']);
  }
  setBoard(buildings,mode){this.mode=mode;this.setSpellAim(null);this.physics?.clear();this.fallen?.clear();this.lastHit?.clear();this._staticKey=null;this.settingBoard=true;this.glow?.clear();this.dust?.clear();this.ruinSmoke?.clear();this.celebration=null;this.rainUntil=0;if(this.troopRings)this.troopRings.count=0;for(const[id,aura]of this.heroAuras||[])if(id!=='home'){this.scene.remove(aura);this.heroAuras.delete(id);}for(const obj of this.buildings.values())this.board.remove(obj);this.buildings.clear();for(const obj of this.troops.values()){this.releaseMixer(obj);this.scene.remove(obj);}this.troops.clear();for(const area of this.spellAreas.values()){this.scene.remove(area);this.clearOverlay(area);}this.spellAreas.clear();for(const field of this.heroEffects.values()){this.scene.remove(field);this.clearOverlay(field);}this.heroEffects.clear();for(const effect of this.effects){this.scene.remove(effect.mesh);this.clearOverlay(effect.mesh);}this.effects=[];for(const bar of this.unitBars.values()){this.scene.remove(bar);this.clearOverlay(bar);}this.unitBars.clear();this.hitShakes.clear();this.deaths.clear();this.unitDeaths.clear();this.shake=0;if(this.homeHero)this.homeHero.visible=mode==='home';for(const el of this.labels.values())el.remove();this.labels.clear();this.lastEvent=0;this.deployment.visible=mode==='battle';this.ambientPeople.forEach(p=>p.obj.visible=mode==='home');this.setSelection(null);this.setGhost(null);this.syncBuildings(buildings);this.settingBoard=false;this.cameraAction('reset');}
  syncBuildings(buildings){for(const b of buildings){let obj=this.buildings.get(b.id);const wanted=this.buildingAsset(b.type,b.level);if(!this.models[wanted])this.preloadBuilding(b.type,b.level).catch(()=>{});const asset=this.models[wanted]?wanted:(obj?.userData.asset||b.type);const signature=`${asset}/${b.level}/${b.x}/${b.z}/${!!b.readyAt}`;if(obj?.userData.signature!==signature){if(obj)this.board.remove(obj);obj=new THREE.Group();obj.userData={id:b.id,signature,asset,wanted};this.board.add(obj);const body=this.clone(asset,obj);if(b.type==='wall')body.scale.set(wallVisualScale.x,wallVisualScale.y,wallVisualScale.z);if(!b.level)body.scale.y*=.42;obj.userData.body=body;obj.userData.bodyScale=body.scale.clone();if(!this.settingBoard&&this.mode==='home'&&!this.reducedMotion&&this.physics)obj.userData.pop=new Spring(.45,150,9);this.buildings.set(b.id,obj);obj.position.set(cell(b.x+b.w/2),0,cell(b.z+b.h/2));obj.userData.home=obj.position.clone();this.renderer.shadowMap.needsUpdate=true;}
      const dead=b.hp===0;if(dead&&!obj.userData.ruin){obj.userData.body.visible=false;const ruins=this.clone('rocks',obj,0,0,b.w*.6);ruins.scale.y*=.25;obj.userData.ruin=true;this.renderer.shadowMap.needsUpdate=true;}obj.userData.building=b;
      if(!dead&&!this.labels.has(b.id)){const el=document.createElement('button');el.className='building-bubble';el.tabIndex=-1;el.style.pointerEvents='none';this.labelHost.append(el);this.labels.set(b.id,el);}
      const label=this.labels.get(b.id);if(label){let text='';if(this.mode==='battle'&&b.hp<b.maxHp&&!dead)text=`<i style="width:${b.hp/b.maxHp*100}%"></i>`;else if(this.mode==='home'&&b.readyAt)text=`⚒ ${Math.max(0,Math.ceil((b.readyAt-Date.now())/1000))}s`;else if(this.mode==='home'&&b.stored>=1)text=`${{coin:'●',wood:'♣',grain:'❧',iron:'◆',gems:'⬟'}[CATALOG[b.type].production?.resource]||'●'} ${b.stored>=1000?`${(b.stored/1000).toFixed(1)}k`:Math.floor(b.stored)}`;if(label.innerHTML!==text)label.innerHTML=text;label.hidden=!text||dead;label.classList.toggle('health',this.mode==='battle');label.classList.toggle('resource-marker',this.mode==='home'&&!b.readyAt);label.classList.toggle('construction-marker',this.mode==='home'&&!!b.readyAt);label.dataset.resource=CATALOG[b.type].production?.resource||'';}
    }if(this.contactShadows){const matrix=new THREE.Matrix4();this.contactShadows.count=Math.min(buildings.length,576);for(let i=0;i<this.contactShadows.count;i++){const b=buildings[i];matrix.makeScale((b.w*2+.7)*(b.type==='wall'?wallVisualScale.x:1),1,(b.h*2+.7)*(b.type==='wall'?wallVisualScale.z:1)).setPosition(cell(b.x+b.w/2),-.035,cell(b.z+b.h/2));this.contactShadows.setMatrixAt(i,matrix);}this.contactShadows.instanceMatrix.needsUpdate=true;}this.syncStatics?.(buildings);this.trimModelCache();}
  outline(w,h,color,group){const geometry=new THREE.PlaneGeometry(w*2,h*2),m=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.25,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.055;group.add(m);const pts=[[-w,-h],[w,-h],[w,h],[-w,h]].map(([x,z])=>new THREE.Vector3(x,.08,z));group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color})));}
  clearOverlay(group){group.traverse(o=>{if(!o.userData.borrowedGeometry)o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});group.clear();}
  setSelection(b){this.clearOverlay(this.selection);if(!b)return;this.selection.position.set(cell(b.x+b.w/2),0,cell(b.z+b.h/2));this.outline(b.w,b.h,'#fff0a3',this.selection);const range=CATALOG[b.type].range;if(range){const ring=this.mesh(new THREE.RingGeometry(range*2-.08,range*2,80),new THREE.MeshBasicMaterial({color:'#fff0a3',transparent:true,opacity:.75,side:THREE.DoubleSide}),0,.075,0,this.selection);ring.rotation.x=-Math.PI/2;}}
  setSpellAim(spell,x,z){
    let id=typeof spell==='string'?spell:spell?.id;
    if(!id&&spell)for(const key in SPELLS)if(SPELLS[key]===spell||SPELLS[key].name===spell.name){id=key;break;}
    const definition=typeof spell==='string'?SPELLS[spell]:spell;
    if(!definition?.targeted||!Number.isFinite(definition.radius)||definition.radius<=0){this.spellAim.visible=false;this.spellAimId=null;return false;}
    const changed=id!==this.spellAimId,radius=definition.radius*2;
    if(this.spellAimRadius!==radius){
      this.clearOverlay(this.spellAim);this.spellAimRadius=radius;
      const fill=this.mesh(new THREE.CircleGeometry(radius,80),new THREE.MeshBasicMaterial({transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide}),0,.08,0,this.spellAim);fill.rotation.x=-Math.PI/2;
      const ring=this.mesh(new THREE.RingGeometry(Math.max(0,radius-.12),radius,80),new THREE.MeshBasicMaterial({transparent:true,opacity:.95,depthWrite:false,depthTest:false,side:THREE.DoubleSide}),0,.10,0,this.spellAim);ring.rotation.x=-Math.PI/2;ring.renderOrder=8;
    }
    const color=id==='freeze'?'#8ceeff':id==='rage'?'#ee85e0':'#ffe27a';
    for(const mesh of this.spellAim.children)mesh.material.color.set(color);
    this.spellAimX=x===undefined?(changed?12:this.spellAimX):x;this.spellAimZ=z===undefined?(changed?12:this.spellAimZ):z;this.spellAimId=id;
    const valid=Number.isFinite(this.spellAimX)&&Number.isFinite(this.spellAimZ)&&this.spellAimX>=0&&this.spellAimX<24&&this.spellAimZ>=0&&this.spellAimZ<24;
    this.spellAim.visible=valid;if(valid)this.spellAim.position.set(cell(this.spellAimX),0,cell(this.spellAimZ));return valid;
  }
  setGhost(placing,valid=true){
    this.clearOverlay(this.ghost);this.grid.visible=!!placing;if(!placing)return;
    const c=CATALOG[placing.type],color=valid?'#85ee8b':'#ff635b';
    this.ghost.position.set(0,0,0);
    const cells=placing.line?.cells||[{x:placing.x,z:placing.z}];
    for(const point of cells.slice(0,24)){
      const group=new THREE.Group();group.position.set(cell(point.x+c.w/2),0,cell(point.z+c.h/2));this.ghost.add(group);
      this.outline(c.w,c.h,color,group);
      const model=this.models[placing.type].clone(true);if(placing.type==='wall')model.scale.set(wallVisualScale.x,wallVisualScale.y,wallVisualScale.z);
      model.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;o.userData.borrowedGeometry=true;const tint=m=>{const copy=m.clone();copy.transparent=true;copy.opacity=.6;copy.depthWrite=false;copy.color.lerp(new THREE.Color(color),.3);return copy;};o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material);});group.add(model);
    }
  }
  pick(clientX,clientY){const rect=this.canvas.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),this.camera);const hit=this.ray.intersectObjects(this.board.children,true)[0];let obj=hit?.object;while(obj&&!obj.userData.id)obj=obj.parent;const p=new THREE.Vector3();this.ray.ray.intersectPlane(this.plane,p);const x=Math.floor(p.x/2+12),z=Math.floor(p.z/2+12);const footprint=[...this.buildings.values()].find(o=>{const b=o.userData.building;return b.hp!==0&&x>=b.x&&x<b.x+b.w&&z>=b.z&&z<b.z+b.h;});return {id:obj?.userData.id||footprint?.userData.id,x,z,world:p};}
  syncSpellAreas(battle){
    const active=new Set();for(const area of battle.spellAreas||[]){if(area.expiresAt<=battle.elapsed)continue;active.add(area.id);let group=this.spellAreas.get(area.id);
      if(!group){group=new THREE.Group();group.userData={type:area.type,radius:area.radius*2};group.position.set(cell(area.x),.095,cell(area.z));const color=area.type==='freeze'?'#8ceeff':'#ee85e0',radius=area.radius*2;
        for(const[geometry,opacity]of [[new THREE.CircleGeometry(radius,64),.15],[new THREE.RingGeometry(radius-.12,radius,64),.8]]){const m=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.userData.opacity=opacity;group.add(m);}this.scene.add(group);this.spellAreas.set(area.id,group);
      }const fade=Math.min(1,(area.expiresAt-battle.elapsed)*2);group.children.forEach(m=>m.material.opacity=m.userData.opacity*fade*(this.reducedMotion?1:.9+Math.sin(this.time*4)*.1));
    }for(const[id,group]of this.spellAreas)if(!active.has(id)){this.scene.remove(group);this.clearOverlay(group);this.spellAreas.delete(id);}
  }
  makeHeroField(effect){
    const group=new THREE.Group(),canopy=effect.type==='canopy',radius=Math.max(.5,Math.min(8,effect.radius||1.5))*2,color=canopy?'#72dfcf':'#f8ca69';
    group.userData={type:effect.type,radius};
    const material=opacity=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
    const rim=new THREE.Mesh(new THREE.RingGeometry(radius-.10,radius,48),material(.72));rim.rotation.x=-Math.PI/2;rim.position.y=.13;rim.userData.baseOpacity=.72;group.add(rim);
    if(canopy){
      const dome=new THREE.Mesh(new THREE.SphereGeometry(1,this.quality==='low'?16:24,8,0,Math.PI*2,0,Math.PI/2),material(.065));dome.scale.set(radius,2.6,radius);dome.position.y=.06;dome.userData.baseOpacity=.065;group.add(dome);
      const points=[];for(let arm=0;arm<4;arm++)for(let i=0;i<24;i++)for(const t of [i/24,(i+1)/24]){const angle=arm*Math.PI/4,across=Math.cos(t*Math.PI)*radius;points.push(new THREE.Vector3(across*Math.cos(angle),.06+Math.sin(t*Math.PI)*2.6,across*Math.sin(angle)));}
      const ribs=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity:.35,depthWrite:false}));ribs.userData.baseOpacity=.35;group.add(ribs);
      const center=new THREE.Mesh(new THREE.RingGeometry(.27,.34,6),material(.8));center.rotation.x=-Math.PI/2;center.position.y=.15;center.userData.baseOpacity=.8;group.add(center);
    }else{
      const falcon=new THREE.Group(),gold=material(.98),body=new THREE.Mesh(new THREE.ConeGeometry(.10,.46,5),gold);body.rotation.x=Math.PI/2;falcon.add(body);
      for(const side of [-1,1]){const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(side*.04,0,.04),new THREE.Vector3(side*.85,0,-.18),new THREE.Vector3(side*.42,0,.23)]);geometry.setIndex([0,1,2]);geometry.computeVertexNormals();const wing=new THREE.Mesh(geometry,gold);wing.userData.wing=side;falcon.add(wing);}
      falcon.userData.falcon=true;group.add(falcon);group.userData.falcon=falcon;
      const points=[];for(let i=0;i<4;i++){const angle=i*Math.PI/2;points.push(new THREE.Vector3(Math.sin(angle)*radius,.16,Math.cos(angle)*radius),new THREE.Vector3(Math.sin(angle)*radius,.9,Math.cos(angle)*radius));}
      const reticle=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false}));reticle.userData.baseOpacity=.85;group.add(reticle);
    }
    this.scene.add(group);return group;
  }
  syncHeroEffects(battle){
    const active=new Set();for(const effect of battle.heroEffects||[]){
      if(!['sky_mark','canopy'].includes(effect.type)||effect.expiresAt<=battle.elapsed||effect.remaining===0)continue;
      const target=effect.targetId?battle.buildings.find(b=>b.id===effect.targetId):null;if(effect.type==='sky_mark'&&(!target||target.hp<=0))continue;
      active.add(effect.id);let group=this.heroEffects.get(effect.id);if(!group){group=this.makeHeroField(effect);this.heroEffects.set(effect.id,group);}
      group.position.set(cell(effect.x),0,cell(effect.z));
      const fade=Math.min(1,(effect.expiresAt-battle.elapsed)/.6),strength=effect.maxAbsorb>0&&Number.isFinite(effect.remaining)?THREE.MathUtils.clamp(effect.remaining/effect.maxAbsorb,0,1):1;
      group.traverse(mesh=>{if(mesh.material){const base=mesh.userData.baseOpacity??.98;mesh.material.opacity=base*fade*(effect.type==='canopy'?.55+.45*strength:1);}});
      group.userData.falconHeight=target?(this.modelTops[this.buildingAsset(target.type,target.level)]||3)+1.2:3;
    }
    for(const[id,group]of this.heroEffects)if(!active.has(id)){this.scene.remove(group);this.clearOverlay(group);this.heroEffects.delete(id);}
  }
  stepHeroFields(){
    for(const group of this.heroEffects.values()){
      const falcon=group.userData.falcon;if(!falcon)continue;
      const phase=this.reducedMotion?0:this.time*1.6,radius=Math.min(group.userData.radius*.58,1.4);
      falcon.position.set(Math.cos(phase)*radius,group.userData.falconHeight,Math.sin(phase)*radius);falcon.rotation.y=-phase;
      for(const wing of falcon.children)if(wing.userData.wing)wing.rotation.z=this.reducedMotion?0:wing.userData.wing*Math.sin(this.time*9)*.28;
    }
  }
  makeShieldDecoy(){
    const group=new THREE.Group(),wood=mat('#5e3e2a'),brass=mat('#c59642',{metalness:.65,roughness:.4}),indigo=mat('#294c67'),rubber=mat('#29302f');
    group.userData={decoy:true,visualHeight:1.13,wheels:[]};
    this.mesh(new THREE.BoxGeometry(.70,.12,.61),wood,0,.31,0,group);
    const shield=this.mesh(new THREE.CylinderGeometry(.43,.40,.13,12),indigo,0,.70,.20,group);shield.rotation.x=Math.PI/2;
    this.mesh(new THREE.TorusGeometry(.415,.027,6,20),brass,0,.70,.28,group);
    const boss=this.mesh(new THREE.SphereGeometry(.12,10,6),brass,0,.70,.30,group);boss.scale.z=.45;
    for(const x of [-.37,.37])for(const z of [-.23,.23]){
      const wheel=new THREE.Group();wheel.position.set(x,.16,z);group.add(wheel);group.userData.wheels.push(wheel);
      const tire=this.mesh(new THREE.CylinderGeometry(.16,.16,.075,12),rubber,0,0,0,wheel);tire.rotation.z=Math.PI/2;
      this.mesh(new THREE.BoxGeometry(.09,.22,.025),brass,0,0,0,wheel);this.mesh(new THREE.BoxGeometry(.09,.025,.22),brass,0,0,0,wheel);
    }
    group.traverse(mesh=>{if(mesh.isMesh){mesh.castShadow=false;mesh.receiveShadow=true;}});this.scene.add(group);return group;
  }
  // A short, decaying shake. Buildings shake individually; the camera only for heavy blows.
  jolt(id,amount,duration){
    if(this.reducedMotion)return;
    const existing=this.hitShakes.get(id);
    if(existing&&existing.amount>amount&&existing.age<existing.duration*.5)return;
    this.hitShakes.set(id,{amount,duration,age:0});
  }
  addEffect(effect){
    const budget=this.quality==='low'?42:this.quality==='ultra'?150:96;
    while(this.effects.length>=budget){
      const oldest=this.effects.shift();
      this.scene.remove(oldest.mesh);oldest.mesh.geometry.dispose();oldest.mesh.material.dispose();
    }
    this.effects.push(effect);
  }
  collectionFeedback(building,amounts){
    if(this.mode!=='home'||!building||!Number.isFinite(building.x)||!Number.isFinite(building.z))return;
    if(building.id&&Object.values(amounts||{}).some(n=>n>0))this.bounceBuilding?.(building.id,.14);
    const colors={coin:'#ffcf42',wood:'#94d957',grain:'#ffe797',iron:'#c9e5ef',gems:'#86efd8'},top=this.modelTops[this.buildingAsset(building.type,building.level)]||3;
    for(const [resource,amount]of Object.entries(amounts||{})){
      if(!colors[resource]||!Number.isFinite(amount)||amount<=0)continue;
      const count=this.reducedMotion?1:this.quality==='low'?3:6;
      for(let i=0;i<count;i++){
        const angle=i/count*Math.PI*2,mesh=this.overlay(new THREE.CircleGeometry(.17,resource==='coin'?24:6),colors[resource],cell(building.x+building.w/2)+Math.cos(angle)*.6,top+.4,cell(building.z+building.h/2)+Math.sin(angle)*.6,{opacity:1});
        this.addEffect({mesh,age:0,duration:1,kind:'collection',start:mesh.position.clone(),angle,stationary:this.reducedMotion});
      }
    }
  }
  shakeCamera(amount){if(!this.reducedMotion)this.shake=Math.min(.9,this.shake+amount);}
  overlay(geometry,color,x,y,z,options={}){
    const mesh=this.mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,depthWrite:false,...options}),x,y,z);
    mesh.renderOrder=11;mesh.receiveShadow=false;return mesh;
  }
  // Rubble thrown outward from a destroyed structure, with gravity and a ground bounce.
  spawnDebris(event){
    const size=Math.max(1,(event.w||2)),count=this.quality==='low'?4:Math.min(11,4+size*2);
    for(let i=0;i<count;i++){
      const angle=rand()*Math.PI*2,speed=2.6+rand()*5.4,scale=.16+rand()*.34*Math.sqrt(size);
      const mesh=this.mesh(new THREE.IcosahedronGeometry(scale,0),new THREE.MeshStandardMaterial({color:i%3?'#c3ab7f':'#8d7a58',roughness:.95,transparent:true}),cell(event.x),.7+rand()*size*.5,cell(event.z));
      mesh.castShadow=false;
      this.addEffect({mesh,age:0,duration:1.1+rand()*.5,kind:'debris',
        velocity:new THREE.Vector3(Math.sin(angle)*speed,4.5+rand()*4.5,Math.cos(angle)*speed),
        spin:new THREE.Vector3(rand()*7-3.5,rand()*7-3.5,rand()*7-3.5)});
    }
  }
  // Particle dressing for each battle event. Absent in headless tests (no pools).
  eventParticles(event){
    if(!this.glow)return;const x=cell(event.x),z=cell(event.z),fromX=cell(event.fromX??event.x),fromZ=cell(event.fromZ??event.z);
    switch(event.type){
      case 'freeze':this.glow.emit({x,y:.4,z,count:46,spread:1.2,radial:5,vy:2.5,velocitySpread:1,life:1.1,size:.24,colors:['#bff6ff','#8ceeff','#ffffff'],gravity:3,drag:1.6,shape:'spark'});this.dust.emit({x,y:.3,z,count:14,spread:2.5,radial:2,vy:.3,life:1.4,size:1.4,grow:1.5,color:'#e2fbff',alpha:.35,drag:1.6,shape:'dust'});this.postfx?.pulse(.35,'#bfefff');break;
      case 'rage':this.glow.emit({x,y:.3,z,count:50,spread:1.5,radial:4,vy:3.5,velocitySpread:1.2,life:1.2,size:.22,colors:['#f38be6','#ff5fb0','#ffd1f6'],gravity:1.5,drag:1.2,shape:'spark'});this.postfx?.pulse(.3,'#ff9fe8');break;
      case 'lightning':this.glow.emit({x,y:.4,z,count:60,spread:.8,radial:7,vy:4,velocitySpread:2,life:.8,size:.2,colors:['#ffffff','#cdeeff','#9fd8ff'],gravity:8,drag:1,shape:'spark',floor:.1});this.dust.emit({x,y:.3,z,count:16,spread:1.4,radial:3,vy:.8,life:1.6,size:1.3,grow:2,color:'#8d8a86',alpha:.45,drag:1.8,shape:'dust'});this.postfx?.pulse(.9,'#d7ecff');break;
      case 'destroy':{const big=(event.w||2)>=3;
        this.dust.emit({x,y:.6,z,count:big?30:18,spread:(event.w||2)*.7,radial:2.8,vy:1.4,velocitySpread:.8,life:1.8,size:big?2.2:1.6,grow:1.8,colors:['#d9c8a2','#bda983','#e9dcc0'],alpha:.55,drag:1.4,shape:'dust'});
        this.glow.emit({x,y:1,z,count:big?40:22,spread:(event.w||2)*.5,radial:4.5,vy:5,velocitySpread:1.5,life:1.2,size:.17,colors:['#ffcf6e','#ff9a3c','#ffe7b0'],gravity:9,drag:.6,shape:'spark',floor:.08});
        if(event.targetId)this.ruinSmoke?.set(event.targetId,{x,z,age:0,clock:0,size:event.w||2});
        if(big)this.postfx?.pulse(.45,'#ffe3b0');break;}
      case 'heal':this.glow.emit({x,y:.5,z,count:8,spread:.5,vy:1.8,velocitySpread:.3,life:.9,size:.18,colors:['#9dfbd8','#e2fff3'],drag:.8,wobble:.8,shape:'glow'});break;
      case 'deploy':this.dust.emit({x,y:.2,z,count:14,spread:.8,radial:2.4,vy:.6,life:1,size:1,grow:1.5,color:'#d5c7a6',alpha:.5,drag:2,shape:'dust'});this.glow.emit({x,y:.4,z,count:16,spread:.6,radial:2,vy:2,life:.7,size:.16,colors:['#ffd27a','#c7e6ff'],gravity:4,shape:'spark'});break;
      case 'cannon':this.dust.emit({x:fromX,y:1.3,z:fromZ,count:6,spread:.25,radial:.9,vy:.9,life:1.3,size:.9,grow:2,color:'#cfcac2',alpha:.45,drag:1.8,shape:'dust'});this.glow.emit({x:fromX,y:1.3,z:fromZ,count:8,spread:.15,radial:2,vy:1,life:.25,size:.3,color:'#ffcf7a',shape:'glow'});break;
      case 'canopy':this.glow.emit({x,y:.3,z,count:30,spread:3,vy:2.2,velocitySpread:.4,life:1.4,size:.2,colors:['#8ff5e2','#d6fff6'],drag:.9,wobble:1,shape:'glow'});break;
      case 'sky_mark':this.glow.emit({x,y:2.5,z,count:18,spread:.8,radial:2,vy:1,life:.9,size:.2,colors:['#ffd87a','#fff1c6'],gravity:2,shape:'spark'});break;
    }
  }
  effect(event){
    // Remember who struck each warrior so a fall is thrown the right way; flinch on hits.
    if(event.targetId&&this.troops?.has(event.targetId)){this.lastHit?.set(event.targetId,{x:cell(event.fromX??event.x),z:cell(event.fromZ??event.z),heavy:event.type==='cannon'});this.troops.get(event.targetId).userData.actor?.hit(event.type==='cannon'?1.6:.8);}
    if(event.type==='lightning')this.knockback?.(cell(event.x),cell(event.z),6,7);
    this.eventParticles(event);
    if(event.type==='freeze'||event.type==='rage'||(event.type==='deploy'&&this.glow))return;
    if(event.type==='canopy'||event.type==='sky_mark'){
      const mesh=this.overlay(new THREE.RingGeometry(.35,.47,32),event.type==='canopy'?'#91f1d8':'#ffda85',cell(event.x),.17,cell(event.z),{opacity:.8,side:THREE.DoubleSide});mesh.rotation.x=-Math.PI/2;
      this.addEffect({mesh,age:0,duration:this.reducedMotion?.3:.65,kind:'ring',from:1,to:this.reducedMotion?1:3.5,peak:.8});return;
    }
    if(event.type==='chakram'){
      const start=new THREE.Vector3(cell(event.fromX??event.x),1.3,cell(event.fromZ??event.z)),end=new THREE.Vector3(cell(event.x),.95,cell(event.z));
      const mesh=this.mesh(new THREE.TorusGeometry(.25,.035,6,20),new THREE.MeshStandardMaterial({color:'#f6d46e',metalness:.7,roughness:.28,emissive:'#2a7582',emissiveIntensity:.5,transparent:true}),start.x,start.y,start.z);mesh.castShadow=false;
      this.addEffect({mesh,age:0,duration:Math.max(.18,Math.min(.5,start.distanceTo(end)*.035)),kind:'chakram',start,end,arc:.65,heavy:false});if(event.targetId)this.jolt(event.targetId,.09,.2);return;
    }
    if(event.type==='falcon_strike'||event.type==='water_bolt'){
      const water=event.type==='water_bolt',start=new THREE.Vector3(cell(event.fromX??event.x),1.3,cell(event.fromZ??event.z)),end=new THREE.Vector3(cell(event.x),.95,cell(event.z));
      let geometry;
      if(water){
        geometry=new THREE.LatheGeometry([[0,-.38],[.15,-.3],[.22,-.13],[.2,.05],[.12,.27],[0,.55]].map(([x,y])=>new THREE.Vector2(x,y)),10);
      }else{
        // One low-poly bird silhouette, with warm wing tips and a gold centre.
        geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.Float32BufferAttribute([
          0,.55,0,-.13,-.23,.1,.13,-.23,.1,
          0,-.12,.06,-.16,-.45,0,.16,-.45,0,
          0,.15,.03,-.6,-.08,-.06,-.2,-.3,.06,
          0,.15,.03,.2,-.3,.06,.6,-.08,-.06
        ],3));
        const colors=[],gold=new THREE.Color('#f4cf6b'),brown=new THREE.Color('#80502d');
        for(let i=0;i<12;i++){const color=[7,11].includes(i)?brown:gold;colors.push(color.r,color.g,color.b);}
        geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
      }
      const mesh=this.mesh(geometry,new THREE.MeshStandardMaterial({color:water?'#65eadb':'#ffffff',vertexColors:!water,roughness:water?.23:.5,metalness:water?0:.35,emissive:water?'#147d80':'#6b4414',emissiveIntensity:.35,side:THREE.DoubleSide,transparent:true}),start.x,start.y,start.z);mesh.castShadow=false;
      this.addEffect({mesh,age:0,duration:Math.max(.2,Math.min(.55,start.distanceTo(end)*.04)),kind:'shot',heavy:false,start,end,arc:water?.5:1.1,impactColor:water?'#8bf5e6':'#f3d285'});
      if(event.targetId)this.jolt(event.targetId,.075,.22);return;
    }
    if(event.type==='lightning'){
      const points=[new THREE.Vector3(0,13,0),new THREE.Vector3(.8,10,.3),new THREE.Vector3(-.6,8,-.2),new THREE.Vector3(.5,5,.4),new THREE.Vector3(-.4,3,0),new THREE.Vector3(0,.2,0)],path=new THREE.CurvePath();for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(points[i-1],points[i]));
      const mesh=this.mesh(new THREE.TubeGeometry(path,32,.12,5,false),new THREE.MeshBasicMaterial({color:'#edfbff',transparent:true,depthTest:false}),cell(event.x),0,cell(event.z));mesh.renderOrder=12;this.addEffect({mesh,age:0,duration:.65,kind:'lightning'});
      const flash=this.overlay(new THREE.RingGeometry(.1,5,48),'#b7e7ff',cell(event.x),.12,cell(event.z),{opacity:.55,side:THREE.DoubleSide});flash.rotation.x=-Math.PI/2;this.addEffect({mesh:flash,age:0,duration:.8,kind:'ring',from:.65,to:1.2,peak:.55});
      this.shakeCamera(.5);return;
    }
    if(event.type==='destroy'){
      if(!this.spawnRubble?.(event))this.spawnDebris(event);
      const dust=this.overlay(new THREE.RingGeometry(.3,1.1,36),'#e2d3b0',cell(event.x),.13,cell(event.z),{opacity:.6,side:THREE.DoubleSide});
      dust.rotation.x=-Math.PI/2;this.addEffect({mesh:dust,age:0,duration:.95,kind:'ring',from:.5,to:2.4+(event.w||1)*.6,peak:.6});
      if(event.targetId){this.jolt(event.targetId,.32,.5);this.deaths.set(event.targetId,{age:0});}
      this.shakeCamera(event.w>=3?.42:.2);return;
    }
    if(event.type==='heal'){
      const mesh=this.overlay(new THREE.SphereGeometry(.34,10,7),'#81ecca',cell(event.x),1.1,cell(event.z),{opacity:.9});
      this.addEffect({mesh,age:0,duration:.75,kind:'heal',start:mesh.position.clone()});return;
    }
    // Everything else is a shot: an oriented projectile that lands on the target.
    const from=new THREE.Vector3(cell(event.fromX??event.x),1.25,cell(event.fromZ??event.z));
    const to=new THREE.Vector3(cell(event.x),.85,cell(event.z));
    const heavy=event.type==='cannon',distance=from.distanceTo(to);
    const mesh=heavy
      ? this.mesh(new THREE.SphereGeometry(.26,10,8),new THREE.MeshStandardMaterial({color:'#43413c',roughness:.6,transparent:true}),from.x,from.y,from.z)
      : this.mesh(new THREE.CylinderGeometry(.045,.02,Math.min(1.5,.5+distance*.06),5),new THREE.MeshStandardMaterial({color:'#f4dfa4',roughness:.7,transparent:true,emissive:'#8a6a25',emissiveIntensity:.35}),from.x,from.y,from.z);
    mesh.castShadow=false;
    this.addEffect({mesh,age:0,duration:Math.max(.16,Math.min(.5,distance*.045)),kind:'shot',type:event.type,heavy,start:from,end:to,arc:heavy?2.4:Math.min(2.2,.5+distance*.14)});
    if(event.targetId)this.jolt(event.targetId,heavy?.17:.075,heavy?.34:.22);
    if(heavy){
      const flash=this.overlay(new THREE.SphereGeometry(.42,8,6),'#ffd79a',from.x,from.y,from.z,{opacity:.8});
      this.addEffect({mesh:flash,age:0,duration:.14,kind:'ring',from:.5,to:1.5,peak:.8});
      this.shakeCamera(.13);
    }
  }
  // A landed shot: sparks plus a flat ring, so hits read even when the model is tall.
  impact(effect){
    const {end,heavy,impactColor}=effect;
    const ring=this.overlay(new THREE.RingGeometry(.12,heavy?.55:.3,24),impactColor||(heavy?'#ffcf8b':'#ffe9b4'),end.x,.14,end.z,{opacity:.75,side:THREE.DoubleSide});
    ring.rotation.x=-Math.PI/2;
    this.addEffect({mesh:ring,age:0,duration:heavy?.42:.26,kind:'ring',from:.6,to:heavy?3:1.7,peak:.75});
    if(heavy)this.dust?.emit({x:end.x,y:.4,z:end.z,count:8,spread:.4,radial:1.8,vy:.9,life:1.1,size:1.1,grow:1.6,color:'#cbb991',alpha:.5,drag:2,shape:'dust'});
    this.glow?.emit({x:end.x,y:end.y,z:end.z,count:heavy?10:3,radial:heavy?3:1.6,vy:2,velocitySpread:.6,life:.35,size:.14,color:impactColor||(heavy?'#ffbe63':'#ffe6a8'),gravity:9,shape:'spark'});
    if(this.quality==='low'||this.reducedMotion)return;
    const sparks=heavy?7:3;
    for(let i=0;i<sparks;i++){
      const angle=rand()*Math.PI*2,speed=1.5+rand()*(heavy?4:2.2);
      const spark=this.overlay(new THREE.SphereGeometry(heavy?.1:.065,5,4),impactColor||(heavy?'#ffbe63':'#ffe6a8'),end.x,end.y,end.z,{opacity:1});
      this.addEffect({mesh:spark,age:0,duration:.24+rand()*.2,kind:'debris',
        velocity:new THREE.Vector3(Math.sin(angle)*speed,2+rand()*3,Math.cos(angle)*speed),spin:new THREE.Vector3()});
    }
  }
  setHomeHero(id){
    if(this.homeHeroId===id&&this.homeHero){this.homeHero.visible=this.mode==='home';return;}
    if(this.homeHero){this.releaseMixer(this.homeHero);this.scene.remove(this.homeHero);}
    this.homeHero=null;this.homeHeroId=id;if(!id||(!this.models[id]&&!this.forge?.has(id)))return;this.homeHero=this.forge?.has(id)?this.makeActor(id,{hero:true}):this.clone(id);this.homeHero.visible=this.mode==='home';this.homeHero.position.set(-1,TROOP_GROUND_Y,5.5);this.homeHero.scale.setScalar(1.35);this.homeHero.rotation.y=Math.PI/4;
    this.homeHero.traverse(o=>{if(o.isMesh)o.castShadow=false;});
  }
  healthBar(unit){
    const width=unit.heroId?1.6:({elephant:2.2,yeti:1.8,garuda:1.6,bowler:1.2}[unit.type]||.85);
    const group=new THREE.Group(),back=new THREE.Mesh(new THREE.PlaneGeometry(width,.12),new THREE.MeshBasicMaterial({color:'#263628',depthTest:false}));
    const fill=new THREE.Mesh(new THREE.PlaneGeometry(width-.05,.075),new THREE.MeshBasicMaterial({color:unit.heroId?'#f8cc52':'#87d53e',depthTest:false}));fill.position.z=.001;group.add(back,fill);group.userData.fill=fill;group.renderOrder=10;this.scene.add(group);this.unitBars.set(unit.id,group);return group;
  }
  updateBattle(battle,dt){
    this.syncBuildings(battle.buildings);
    const alive=[];
    for(const unit of battle.units){
      if(this.fallen?.has(unit.id))continue;
      let obj=this.troops.get(unit.id);const scale=unitScale(unit);
      if(!obj){obj=unit.decoy?this.makeShieldDecoy():this.makeActor(unit.heroId||unit.type,{hero:!!unit.heroId});obj.scale.setScalar(scale);obj.userData.seed=rand();if(obj.userData.actor&&!this.reducedMotion)obj.userData.drop={y:unit.heroId?3.2:2.2,v:0};obj.traverse(o=>{if(o.isMesh)o.castShadow=false;});this.troops.set(unit.id,obj);this.healthBar(unit);this.spawnEffect(unit);}
      const flying=!!UNITS[unit.type]?.flying;
      if(unit.hp<=0){
        // Models share materials with every other troop of their type, so a fall is
        // animated with scale and depth rather than by fading a shared material.
        if(obj.userData.actor&&this.physics){this.fallEffect(unit,obj);this.ragdoll(unit,obj);continue;}
        if(!this.unitDeaths.has(unit.id)){this.unitDeaths.set(unit.id,{age:0});const fell=this.unitBars.get(unit.id);if(fell)fell.visible=false;this.fallEffect(unit,obj);}
        const fall=this.unitDeaths.get(unit.id);fall.age+=dt;const drop=Math.min(1,fall.age/.55);
        obj.visible=drop<1;obj.userData.groundWalking=false;
        if(obj.visible){obj.scale.setScalar(scale*(1-drop*.55));obj.position.y=-drop*.9;obj.rotation.z=drop*1.35;}
        continue;
      }
      obj.visible=true;obj.userData.groundWalking=unit.action==='walk';
      const x=cell(unit.x),z=cell(unit.z),placed=obj.userData.renderPlaced,follow=placed?1-Math.exp(-dt*25):1;
      const smooth=obj.userData.smooth||(obj.userData.smooth=new THREE.Vector3(x,0,z));
      const travel=placed?Math.hypot(x-smooth.x,z-smooth.z)*follow:0;
      smooth.x+=(x-smooth.x)*follow;smooth.z+=(z-smooth.z)*follow;obj.userData.renderPlaced=true;
      // Melee troops lunge into each blow; archers and bowlers recoil from the shot.
      let lunge=0;
      const actor=obj.userData.actor;
      if(actor){const cooldown=unit.spec?.cooldown||1,progress=unit.action==='attack'||unit.action==='heal'?1-Math.max(0,Math.min(1,(unit.attackTimer||0)/cooldown)):null;actor.setAction(unit.action,progress);}
      if(unit.action==='attack'&&!this.reducedMotion&&!unit.decoy&&!actor){const period=Math.max(.35,unit.spec?.cooldown||1),phase=(this.time/period+obj.userData.seed)%1,pulse=phase<.18?phase/.18:1-(phase-.18)/.82;lunge=pulse*pulse*(RANGED_UNITS.has(unit.type)&&!unit.heroId?-.12:.34);}
      obj.position.x=smooth.x+Math.sin(obj.rotation.y)*lunge;obj.position.z=smooth.z+Math.cos(obj.rotation.y)*lunge;
      if(unit.decoy)for(const wheel of obj.userData.wheels)wheel.rotation.x+=travel/(.16*obj.scale.x);
      obj.position.y=flying?2.2+(this.reducedMotion?0:Math.sin(this.time*3+unit.id.length)*.12):TROOP_GROUND_Y;
      // Troops drop onto the field and bounce; blasts shove them on a damped spring.
      const drop=obj.userData.drop;if(drop){drop.v-=34*dt;drop.y+=drop.v*dt;if(drop.y<=0){drop.y=0;if(drop.v<-3){drop.v*=-.28;this.landEffect(obj);}else obj.userData.drop=null;}obj.position.y+=drop.y;}
      const push=obj.userData.push;if(push){const offset=push.update(dt);obj.position.x+=offset.x;obj.position.z+=offset.z;}
      const mixer=this.mixers.get(obj);if(mixer)mixer.timeScale=unit.action==='attack'?1.2:unit.action==='walk'?1:.7;
      const turn=Math.atan2(Math.sin(unit.facing-obj.rotation.y),Math.cos(unit.facing-obj.rotation.y));obj.rotation.y+=turn*(1-Math.exp(-dt*18));obj.rotation.z=0;
      const bar=this.unitBars.get(unit.id);bar.visible=unit.hp>0&&(unit.hp<unit.maxHp||!!unit.heroId);bar.position.set(obj.position.x,obj.position.y+(obj.userData.visualHeight??this.modelTops[unit.heroId||unit.type]??1.8)*obj.scale.y+.28,obj.position.z);bar.quaternion.copy(this.camera.quaternion);bar.userData.fill.scale.x=unit.hp/unit.maxHp;
      if(!flying&&HEAVY_UNITS.has(unit.type)&&unit.action==='walk'&&travel>0)this.footfall(unit,obj,dt);
      alive.push({unit,obj,flying});
    }
    const aliveIds=new Set(battle.units.map(unit=>unit.id));for(const[id,obj]of this.troops)if(!aliveIds.has(id)){
      this.releaseMixer(obj);this.scene.remove(obj);this.troops.delete(id);const bar=this.unitBars.get(id);if(bar){this.scene.remove(bar);this.clearOverlay(bar);this.unitBars.delete(id);}this.unitDeaths.delete(id);this.footfalls?.delete(id);
    }
    this.syncUnitDressing(alive);
    this.syncSpellAreas(battle);this.syncHeroEffects(battle);
    for(const event of battle.events)if(event.id>this.lastEvent){this.effect(event);this.lastEvent=event.id;}
  }
  // Rings under troops and a turning rangoli beneath each hero.
  syncUnitDressing(alive){
    if(this.troopRings){
      const matrix=new THREE.Matrix4(),color=new THREE.Color();let count=0;
      for(const {unit,obj}of alive){if(unit.heroId||unit.decoy||count>=256)continue;const size=(HEAVY_UNITS.has(unit.type)?1.9:1.1)*obj.scale.x;matrix.makeScale(size,1,size).setPosition(obj.position.x,.045,obj.position.z);this.troopRings.setMatrixAt(count,matrix);this.troopRings.setColorAt(count,color.set(unit.type==='healer'?'#8ff0c8':'#ffc451'));count++;}
      this.troopRings.count=count;this.troopRings.instanceMatrix.needsUpdate=true;if(this.troopRings.instanceColor)this.troopRings.instanceColor.needsUpdate=true;
    }
    if(!this.auraMaterial||!this.heroAuras)return;
    const heroes=new Set();
    for(const {unit,obj}of alive){if(!unit.heroId)continue;heroes.add(unit.id);let aura=this.heroAuras.get(unit.id);if(!aura){aura=new THREE.Mesh(this.auraGeometry,this.auraMaterial);aura.renderOrder=4;this.scene.add(aura);this.heroAuras.set(unit.id,aura);}aura.position.set(obj.position.x,.07,obj.position.z);aura.rotation.y=this.reducedMotion?0:this.time*.5;}
    for(const[id,aura]of this.heroAuras)if(id!=='home'&&!heroes.has(id)){this.scene.remove(aura);this.heroAuras.delete(id);}
  }
  // ---------------------------------------------------------------- physics dressing
  stepActors(dt){
    if(!this.actors?.size)return;const a=this._capeA||(this._capeA=new THREE.Vector3()),b=this._capeB||(this._capeB=new THREE.Vector3()),wind=this._wind||(this._wind=new THREE.Vector3());
    wind.set(Math.sin(this.time*.7)*2.2+1.2,0,Math.cos(this.time*.5)*1.4);
    for(const actor of this.actors){
      let visible=true;for(let o=actor.root;o;o=o.parent)if(!o.visible){visible=false;break;}
      if(!visible){if(actor.cape)actor.cape.mesh.visible=false;continue;}
      actor.update(dt,this.time,this.reducedMotion);
      if(actor.cape){actor.cape.mesh.visible=true;if(actor.capeAnchors(a,b))actor.cape.update(dt,a,b,{spheres:actor.capeSpheres(),wind:this.reducedMotion?null:wind});}
    }
  }
  // A fallen warrior becomes a tumbling rigid body: knocked away from the last blow,
  // tipping over on its own inertia and coming to rest before sinking into the field.
  ragdoll(unit,obj){
    (this.fallen??=new Set()).add(unit.id);this.troops.delete(unit.id);
    const bar=this.unitBars.get(unit.id);if(bar){this.scene.remove(bar);this.clearOverlay(bar);this.unitBars.delete(unit.id);}
    const actor=obj.userData.actor,height=(actor.bp.height||1.8)*obj.scale.x,kind=actor.bp.kind,heavy=kind==='elephant'||kind==='horse';
    const half=new THREE.Vector3((heavy?.55:.24)*obj.scale.x,height*.42,(heavy?1:.18)*obj.scale.x);
    const corpse=new THREE.Group();corpse.position.set(obj.position.x,Math.max(obj.position.y,0)+half.y,obj.position.z);corpse.quaternion.copy(obj.quaternion);this.scene.add(corpse);
    this.scene.remove(obj);corpse.add(obj);obj.position.set(0,-half.y,0);obj.quaternion.identity();
    const from=this.lastHit.get(unit.id),away=from?new THREE.Vector3(corpse.position.x-from.x,0,corpse.position.z-from.z):new THREE.Vector3(-Math.sin(unit.facing||0),0,-Math.cos(unit.facing||0));
    if(away.lengthSq()<1e-4)away.set(rand()-.5,0,rand()-.5);away.normalize();
    const shove=(heavy?1.4:2.6)*(from?.heavy?1.6:1),side=new THREE.Vector3(-away.z,0,away.x);
    const body=new RigidBody({half,mass:heavy?6:1,position:corpse.position,quaternion:corpse.quaternion,velocity:away.clone().multiplyScalar(shove).setY(heavy?1:2.4+rand()),angularVelocity:side.multiplyScalar((heavy?2:5)*(.8+rand()*.4)),restitution:.1,friction:.8,object:corpse,life:3.2,sink:.8,collide:false});
    body.corpse=true;actor.die();this.physics.add(body);this.corpses.add(body);this.lastHit.delete(unit.id);
  }
  landEffect(obj){
    this.dust?.emit({x:obj.position.x,y:.1,z:obj.position.z,count:6,spread:.4,radial:1.4,vy:.3,life:.7,size:.7,grow:1.4,color:'#d8c9a4',alpha:.4,drag:2.4,shape:'dust'});
  }
  // Blast waves shove nearby troops on springs (visual only; the rules keep positions).
  knockback(x,z,radius,strength){
    for(const obj of this.troops.values()){
      const dx=obj.position.x-x,dz=obj.position.z-z,d=Math.hypot(dx,dz);if(d>radius||d<1e-3)continue;
      const k=strength*(1-d/radius);(obj.userData.push??=new Spring3(70,9)).kick(new THREE.Vector3(dx/d*k,0,dz/d*k));obj.userData.actor?.hit(Math.min(2,k*.4));
    }
  }
  rubbleMaterial(color){let m=this.rubbleMaterials.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.9,metalness:.02});this.rubbleMaterials.set(color,m);}return m;}
  // Collapsing masonry: real rigid blocks that tumble, bounce, pile and settle.
  spawnRubble(event){
    if(!this.physics)return false;const size=Math.max(1,event.w||2),b=this.buildings.get(event.targetId)?.userData.building,type=b?.type||'wall',palette=RUBBLE[type]||['#d9b98a','#b88e5e','#c8553d'];
    const top=Math.min(6,(this.modelTops[this.buildingAsset(type,b?.level||1)]||3)*(type==='wall'?wallVisualScale.y:1)),x=cell(event.x),z=cell(event.z),count=this.quality==='low'?Math.min(6,3+size):Math.min(22,6+size*size*1.6);
    const from=new THREE.Vector3(x-cell(event.fromX??event.x),0,z-cell(event.fromZ??event.z));if(from.lengthSq()>1e-4)from.normalize();
    for(let i=0;i<count;i++){
      const s=(.1+rand()*.17)*Math.sqrt(size)*(type==='wall'?.9:1),half=new THREE.Vector3(s*(.8+rand()*.5),s*(.6+rand()*.5),s*(.8+rand()*.5));
      const p=new THREE.Vector3(x+(rand()-.5)*size*1.6,.3+rand()*top*.75,z+(rand()-.5)*size*1.6),out=new THREE.Vector3(p.x-x,0,p.z-z);if(out.lengthSq()<1e-3)out.set(rand()-.5,0,rand()-.5);out.normalize();
      const mesh=new THREE.Mesh(this.rubbleGeometry,this.rubbleMaterial(palette[i%palette.length]));mesh.scale.copy(half).multiplyScalar(2);mesh.castShadow=false;mesh.receiveShadow=true;this.scene.add(mesh);
      const velocity=out.multiplyScalar(.8+rand()*2.2).addScaledVector(from,.6+rand()*1.2).setY(2+rand()*3.8);
      this.physics.add(new RigidBody({half,mass:half.x*half.y*half.z*8,position:p,quaternion:new THREE.Quaternion().setFromEuler(new THREE.Euler(rand()*3,rand()*3,rand()*3)),velocity,angularVelocity:new THREE.Vector3(rand()-.5,rand()-.5,rand()-.5).multiplyScalar(10),restitution:.2,friction:.7,object:mesh,life:6+rand()*3,sink:.6}));
    }
    this.physics.removeStatic(event.targetId);this.knockback(x,z,size*2.2,5);return true;
  }
  // A spent cannonball keeps its momentum: it skips, rolls and knocks troops aside.
  spawnCannonball(effect){
    if(!this.physics||this.quality==='low')return;const dir=new THREE.Vector3().subVectors(effect.end,effect.start).setY(0);const speed=dir.length()/Math.max(.1,effect.duration);if(dir.lengthSq()>1e-4)dir.normalize();
    const mesh=new THREE.Mesh(this.ballGeometry,this.ballMaterial);mesh.castShadow=false;this.scene.add(mesh);
    this.physics.add(new RigidBody({shape:'sphere',radius:.26,mass:3,position:effect.end.clone().setY(.5),velocity:dir.multiplyScalar(Math.min(9,speed*.45)).setY(3.2),restitution:.45,friction:.5,object:mesh,life:3,sink:1.2}));
    this.knockback(effect.end.x,effect.end.z,2.6,4);
  }
  // Arrows stay where they land for a moment, shafts angled along their flight.
  stickArrow(effect){
    if(!this.physics||this.quality==='low'||!effect.mesh)return;const mesh=effect.mesh.clone();mesh.geometry=effect.mesh.geometry.clone();mesh.material=effect.mesh.material.clone();mesh.material.transparent=true;mesh.position.copy(effect.end).setY(Math.max(.15,effect.end.y*.35));
    this.scene.add(mesh);this.addEffect({mesh,age:0,duration:2.4,kind:'stuck'});
  }
  // Standing structures are static colliders for rubble and cannonballs.
  syncStatics(buildings){
    if(!this.physics||this.mode!=='battle')return;const live=buildings.filter(b=>b.hp>0),key=live.map(b=>b.id).join();if(key===this._staticKey)return;this._staticKey=key;
    this.physics.setStatics(live.map(b=>{const top=Math.min(5,(this.modelTops[this.buildingAsset(b.type,b.level)]||2)*(b.type==='wall'?wallVisualScale.y:1)*.8),x=cell(b.x+b.w/2),z=cell(b.z+b.h/2),hw=b.w*(b.type==='wall'?wallVisualScale.x:.85),hh=b.h*(b.type==='wall'?wallVisualScale.z:.85);return {id:b.id,min:new THREE.Vector3(x-hw,0,z-hh),max:new THREE.Vector3(x+hw,top,z+hh)};}));
  }
  spawnEffect(unit){
    if(!this.glow)return;const x=cell(unit.x),z=cell(unit.z),hero=!!unit.heroId;
    this.dust.emit({x,y:.15,z,count:hero?16:7,spread:.3,radial:hero?2.6:1.6,vy:.4,life:.8,size:.7,grow:1.6,color:'#d8c9a4',alpha:.45,drag:2.5,shape:'dust'});
    this.glow.emit({x,y:.3,z,count:hero?40:10,spread:.4,radial:hero?2.2:1.2,vy:hero?4.5:2.2,velocitySpread:.5,life:hero?1.1:.6,size:hero?.26:.18,colors:hero?['#ffd76a','#ffb13b','#fff1c2']:['#ffe6a0','#ffc45c'],alpha:.9,gravity:hero?2:3,drag:1.2,shape:'spark'});
    if(hero){const beam=this.overlay(new THREE.CylinderGeometry(.55,.9,14,20,1,true),'#ffd982',x,7,z,{opacity:.5,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});this.addEffect({mesh:beam,age:0,duration:.9,kind:'beam'});
      const ring=this.overlay(new THREE.RingGeometry(.3,.6,40),'#ffe29a',x,.12,z,{opacity:.9,side:THREE.DoubleSide});ring.rotation.x=-Math.PI/2;this.addEffect({mesh:ring,age:0,duration:.7,kind:'ring',from:1,to:9,peak:.9});this.shakeCamera(.18);}
  }
  fallEffect(unit,obj){
    if(!this.glow)return;const x=obj.position.x,z=obj.position.z;
    this.dust.emit({x,y:.2,z,count:6,spread:.35,radial:1.1,vy:.5,life:.9,size:.8,grow:1.4,color:'#cdbd97',alpha:.4,drag:2,shape:'dust'});
    this.glow.emit({x,y:.8,z,count:4,spread:.2,vy:1.6,velocitySpread:.2,life:1.2,size:.16,color:unit.heroId?'#ffd76a':'#dff6ff',alpha:.8,drag:.6,wobble:.6,shape:'glow'});
  }
  footfall(unit,obj,dt){
    this.footfalls??=new Map();const clock=(this.footfalls.get(unit.id)||0)+dt;if(clock<.36){this.footfalls.set(unit.id,clock);return;}this.footfalls.set(unit.id,0);
    this.dust?.emit({x:obj.position.x,y:.1,z:obj.position.z,count:3,spread:.6,radial:.9,vy:.25,life:.7,size:.55,grow:1.3,color:'#d9caa2',alpha:.32,drag:2.2,shape:'dust'});
  }
  positionWorldLabels(){
    const camera=this.labelCamera||this.camera,rect=this.canvas.getBoundingClientRect(),density=Math.max(1,devicePixelRatio||1);
    for(const[id,el]of this.labels){
      if(el.hidden)continue;const obj=this.buildings.get(id);if(!obj)continue;const b=obj.userData.building;
      // Map rotation changes only the anchor's screen position, never the DOM icon's
      // orientation. Building impact motion and camera shake cannot wobble labels.
      const top=(this.modelTops[obj.userData.asset]||3)*(b.type==='wall'?wallVisualScale.y:1),v=new THREE.Vector3(cell(b.x+b.w/2),top+.35,cell(b.z+b.h/2)).project(camera);
      el.style.visibility=Math.abs(v.x)>1.12||Math.abs(v.y)>1.15||Math.abs(v.z)>1?'hidden':'visible';
      const x=Math.round((rect.left+(v.x*.5+.5)*rect.width)*density)/density,y=Math.round((rect.top+(-v.y*.5+.5)*rect.height)*density)/density;
      el.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-100%)`;
    }
    for(const bar of this.unitBars.values())bar.quaternion.copy(this.camera.quaternion);
  }
  updateTroopContactShadows(){
    if(!this.troopContactShadows)return;const actors=this.mode==='home'?[...this.ambientPeople.map(p=>p.obj),this.homeHero]:[...this.troops.values()],matrix=new THREE.Matrix4();let count=0;
    for(const actor of actors){if(!actor?.visible||count>=256)continue;const spec=actor.userData.groundGait||(actor.userData.actor&&{id:actor.userData.actor.id,quadruped:['horse','elephant'].includes(actor.userData.actor.bp.kind)}),id=spec?.id||'',radius=(id==='elephant'?1.55:id==='rider'?1.05:id==='yeti'?.9:.65)*actor.scale.x;
      matrix.makeScale(radius,1,radius*(spec?.quadruped?1.45:.8)).setPosition(actor.position.x,-.039,actor.position.z);this.troopContactShadows.setMatrixAt(count++,matrix);
    }
    this.troopContactShadows.count=count;this.troopContactShadows.instanceMatrix.needsUpdate=true;
  }
  render(dt){
    this.time+=dt;
    if(this.ripples)this.ripples.material.opacity=this.reducedMotion?.18:.15+Math.sin(this.time*.7)*.06;
    if(this.mode==='home'&&!this.reducedMotion)for(const p of this.ambientPeople){const t=this.time*.09+p.phase;p.obj.position.set(Math.sin(t)*3.5-1.5,TROOP_GROUND_Y,Math.cos(t)*16);p.obj.rotation.y=Math.atan2(Math.cos(t)*3.5,-Math.sin(t)*16);}
    for(const[obj,motion]of this.groundMotion){
      const distance=Math.hypot(obj.position.x-motion.x,obj.position.z-motion.z)/obj.scale.x;motion.x=obj.position.x;motion.z=obj.position.z;
      if(obj.visible)stepGroundedMotion(obj,distance,dt,obj.userData.groundWalking!==false);
    }
    for(const[obj,mixer]of this.mixers)if(obj.visible&&(!this.reducedMotion||this.mode==='battle'))mixer.update(dt);
    this.stepActors(dt);this.physics?.update(dt);
    this.updateTroopContactShadows();this.stepEffects(dt);this.stepHeroFields();this.stepImpacts(dt);
    if(this.shake>0.001||this.shaking){
      this.shake=Math.max(0,this.shake-dt*2.6);this.updateCamera();
      if(this.shake>0.001){const power=this.shake*this.shake*1.7;this.camera.position.x+=Math.sin(this.time*61)*power;this.camera.position.y+=Math.sin(this.time*47+1.7)*power*.7;this.camera.position.z+=Math.cos(this.time*53+.6)*power;this.camera.updateMatrixWorld();this.shaking=true;}else this.shaking=false;
    }
    this.stepAtmosphere(dt);this.renderer.info.reset();
    this.positionWorldLabels();if(this.postfx)this.postfx.render(dt);else this.renderer.render(this.scene,this.camera);
  }
  // Wind, water, wildlife and ambient particles: the valley keeps breathing between taps.
  stepAtmosphere(dt){
    const u=this.worldUniforms,calm=this.reducedMotion?0:1;
    if(u){u.uWindTime.value+=dt*calm;u.uCloudTime.value+=dt*(calm||.15);}
    if(this.waterMaterial)this.waterMaterial.uniforms.uTime.value+=dt*(this.reducedMotion?.2:1);
    this.flock?.update(this.time,this.reducedMotion);
    if(this.butterflies){this.butterflies.group.visible=this.mode==='home';if(this.mode==='home')this.butterflies.update(this.time,this.reducedMotion);}
    if(this.auraMaterial){
      let aura=this.heroAuras.get('home');const show=this.mode==='home'&&!!this.homeHero?.visible;
      if(show&&!aura){aura=new THREE.Mesh(this.auraGeometry,this.auraMaterial);aura.renderOrder=4;this.scene.add(aura);this.heroAuras.set('home',aura);}
      if(aura){aura.visible=show;if(show){aura.position.set(this.homeHero.position.x,.07,this.homeHero.position.z);aura.rotation.y=this.reducedMotion?0:this.time*.35;}}
    }
    if(!this.glow)return;
    for(const[id,smoke]of this.ruinSmoke){smoke.age+=dt;if(smoke.age>8||this.mode!=='battle')this.ruinSmoke.delete(id);}
    this.emitClock+=dt;
    if(this.emitClock>=.12){this.emitClock=0;if(!this.reducedMotion)this.ambientEmit();}
    this.stepCelebration(dt);
    const px=this.renderer?this.renderer.getDrawingBufferSize(this._bufferSize||(this._bufferSize=new THREE.Vector2())).y/Math.max(1,this.camera.top-this.camera.bottom):10;
    this.glow.update(dt,this.time,px);this.dust.update(dt,this.time,px);
  }
  ambientEmit(){
    const home=this.mode==='home',span=this.span||40,cx=this.target?.x||0,cz=this.target?.z||0,low=this.quality==='low';
    if(home){
      // Pollen and sunlit motes drifting across the fields.
      if(Math.random()<(low?.35:.8))this.glow.emit({x:cx+(Math.random()-.5)*span*1.3,y:.6+Math.random()*3,z:cz+(Math.random()-.5)*span*1.3,count:1,life:5,size:.13,colors:['#fff3b8','#ffe08a','#ffffff'],alpha:.55,wobble:.5,vy:.05,fadeIn:.3,shape:'glow'});
      for(const obj of this.buildings.values()){
        const b=obj.userData.building;if(!b||b.type==='wall')continue;const x=obj.position.x,z=obj.position.z,top=(this.modelTops[obj.userData.asset]||3)*(b.level?1:.42);
        if(b.readyAt&&Math.random()<.4){
          // Construction: hammer sparks and settling dust.
          this.glow.emit({x:x+(Math.random()-.5)*b.w*1.4,y:top*.8,z:z+(Math.random()-.5)*b.h*1.4,count:5,radial:1.4,vy:2.6,velocitySpread:.5,life:.45,size:.12,colors:['#ffcf6e','#ffae3c'],gravity:9,shape:'spark'});
          if(Math.random()<.4)this.dust.emit({x:x+(Math.random()-.5)*b.w*2,y:.2,z:z+(Math.random()-.5)*b.h*2,count:2,radial:.5,vy:.35,life:1.4,size:.9,grow:1.3,color:'#d7c7a2',alpha:.3,drag:1.5,shape:'dust'});
        }else if(!low&&SMOKE_BUILDINGS.has(b.type)&&b.level>0&&Math.random()<.28){
          this.dust.emit({x:x+b.w*.35,y:top*.92,z:z-b.h*.3,count:1,vx:.35,vy:.8,velocitySpread:.1,life:3.6,size:.8,grow:2.6,color:'#e4dfd6',alpha:.28,drag:.25,shape:'dust',fadeIn:.25});
        }
      }
    }else{
      for(const smoke of this.ruinSmoke.values()){
        const strength=1-smoke.age/8;if(Math.random()>.35+strength*.5)continue;
        this.dust.emit({x:smoke.x+(Math.random()-.5)*smoke.size,y:.5,z:smoke.z+(Math.random()-.5)*smoke.size,count:1,vx:.3,vy:1,velocitySpread:.15,life:3,size:1.1*smoke.size*.6,grow:2.2,colors:['#6f6a64','#8a847b'],alpha:.35*strength,drag:.3,shape:'dust',fadeIn:.2});
        if(smoke.age<4&&Math.random()<.5)this.glow.emit({x:smoke.x,y:.4,z:smoke.z,count:2,spread:smoke.size*.5,vy:1.6,velocitySpread:.5,life:1,size:.1,colors:['#ffb347','#ff7b2e'],drag:.5,wobble:.6,shape:'glow'});
      }
      for(const group of this.spellAreas.values()){
        const {type,radius}=group.userData||{};if(!type)continue;const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*radius;
        this.glow.emit({x:group.position.x+Math.cos(a)*r,y:.2,z:group.position.z+Math.sin(a)*r,count:type==='freeze'?3:4,spread:radius*.4,vy:type==='freeze'?.5:1.8,velocitySpread:.3,life:1.1,size:type==='freeze'?.16:.14,colors:type==='freeze'?['#d7fbff','#8ceeff']:['#ff8fe9','#ff5fb0'],drag:.6,wobble:.8,shape:type==='freeze'?'spark':'glow'});
      }
      for(const group of this.heroEffects.values())if(group.userData.type==='canopy'&&Math.random()<.7){const r=group.userData.radius,a=Math.random()*Math.PI*2,d=Math.sqrt(Math.random())*r;this.dust.emit({x:group.position.x+Math.cos(a)*d,y:2.6,z:group.position.z+Math.sin(a)*d,count:2,spread:r*.3,vy:-7,life:.35,size:.4,color:'#bff3ec',alpha:.5,shape:'streak',floor:.05});}
    }
    if(this.rainUntil>this.time){
      for(let i=0;i<(low?18:40);i++)this.dust.emit({x:cx+(Math.random()-.5)*span*1.5,y:9+Math.random()*5,z:cz+(Math.random()-.5)*span*1.5,count:1,vx:-1.5,vy:-26,life:.5,lifeSpread:.2,size:.55,color:'#d6ebf7',alpha:.55,shape:'streak',floor:.02});
    }
  }
  // Monsoon spell: a downpour sweeps the whole battlefield.
  monsoon(){if(this.reducedMotion)return;this.rainUntil=this.time+2.6;this.postfx?.pulse(.35,'#bcd9ff');this.shakeCamera(.12);}
  // Victory: marigold petals and fireworks over the field.
  celebrate(victory){if(victory)for(const obj of this.troops?.values()||[])obj.userData.actor?.celebrate();if(!this.glow||this.reducedMotion||!victory)return;this.celebration={age:0,next:.1};}
  stepCelebration(dt){
    const c=this.celebration;if(!c)return;c.age+=dt;if(c.age>5.5){this.celebration=null;return;}
    const span=this.span||40,cx=this.target?.x||0,cz=this.target?.z||0;
    if(c.age<4.2)this.dust.emit({x:cx+(Math.random()-.5)*span*1.2,y:12+Math.random()*3,z:cz+(Math.random()-.5)*span*1.2,count:Math.ceil(dt*70),spread:span*.4,vx:.4,vy:-1.4,life:4.2,size:.34,colors:['#ffb000','#ff8a00','#ffd23f','#ff6a1a','#e8325a'],alpha:.95,gravity:.6,drag:1.4,wobble:2.4,spin:5,shape:'petal',floor:.05});
    if(c.age>=c.next&&c.age<3.8){
      c.next=c.age+.35+Math.random()*.4;const x=cx+(Math.random()-.5)*span*.8,z=cz+(Math.random()-.5)*span*.6,y=8+Math.random()*5;
      const palette=[['#ffd76a','#fff1c2'],['#ff6a8a','#ffd0dc'],['#7fe0ff','#e0f8ff'],['#b9ff7a','#f1ffd9']][Math.floor(Math.random()*4)];
      this.glow.emit({x,y,z,count:70,radial:7,velocitySpread:1,vy:1.5,life:1.4,size:.22,colors:palette,gravity:3.5,drag:1.3,shape:'spark'});
      this.glow.emit({x,y,z,count:1,life:.3,size:2.4,color:palette[0],alpha:.7,shape:'glow'});
    }
  }
  // A finished construction or upgrade: a column of light and a ring of sparks.
  celebrateBuilding(b){
    if(!b||this.mode!=='home'||!this.glow)return;const x=cell(b.x+b.w/2),z=cell(b.z+b.h/2),top=this.modelTops[this.buildingAsset(b.type,b.level)]||3;
    const beam=this.overlay(new THREE.CylinderGeometry(b.w*.8,b.w*1.1,16,24,1,true),'#ffe3a0',x,8,z,{opacity:.5,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});this.addEffect({mesh:beam,age:0,duration:1.2,kind:'beam'});
    const ring=this.overlay(new THREE.RingGeometry(.4,.8,48),'#ffe7a8',x,.14,z,{opacity:.9,side:THREE.DoubleSide});ring.rotation.x=-Math.PI/2;this.addEffect({mesh:ring,age:0,duration:.9,kind:'ring',from:1,to:b.w*3.4,peak:.9});
    if(this.reducedMotion)return;
    this.glow.emit({x,y:top*.6,z,count:60,spread:b.w*.6,radial:3.4,vy:5,velocitySpread:1.2,life:1.3,size:.2,colors:['#ffd76a','#fff1c2','#ffb13b'],gravity:5,drag:.9,shape:'spark'});
    this.dust.emit({x,y:top+1.5,z,count:40,spread:b.w*1.2,vy:1.2,velocitySpread:1,life:2.6,size:.3,colors:['#ffb000','#ff8a00','#ffd23f','#e8325a'],gravity:1.2,drag:1.4,wobble:2,spin:5,shape:'petal',floor:.05});
    this.postfx?.pulse(.2,'#fff0c8');
  }
  stepEffects(dt){
    for(let i=this.effects.length-1;i>=0;i--){
      const f=this.effects[i];f.age+=dt;const t=Math.min(1,f.age/f.duration);
      if(f.age>=f.duration){
        if(f.kind==='shot'||f.kind==='chakram')this.impact(f);
        if(f.kind==='shot'&&f.heavy)this.spawnCannonball?.(f);else if(f.kind==='shot'&&f.type==='arrow')this.stickArrow?.(f);
        this.scene.remove(f.mesh);f.mesh.geometry.dispose();f.mesh.material.dispose();this.effects.splice(i,1);continue;
      }
      if(f.kind==='shot'||f.kind==='chakram'){
        f.mesh.position.lerpVectors(f.start,f.end,t);
        f.mesh.position.y+=Math.sin(t*Math.PI)*f.arc;
        if(f.kind==='chakram'){f.mesh.rotation.set(Math.PI*.35,this.reducedMotion?0:t*Math.PI*8,0);}
        else if(!f.heavy){
          // Point the shaft along its own flight path rather than spinning freely.
          const ahead=Math.min(1,t+.06),next=new THREE.Vector3().lerpVectors(f.start,f.end,ahead);
          next.y+=Math.sin(ahead*Math.PI)*f.arc;
          const direction=next.sub(f.mesh.position);
          if(direction.lengthSq()>1e-6)f.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
        }else f.mesh.rotation.set(f.age*9,f.age*6,0);
      }else if(f.kind==='debris'){
        f.velocity.y-=15*dt;
        f.mesh.position.addScaledVector(f.velocity,dt);
        if(f.mesh.position.y<.12){f.mesh.position.y=.12;f.velocity.y*=-.32;f.velocity.x*=.62;f.velocity.z*=.62;}
        f.mesh.rotation.x+=f.spin.x*dt;f.mesh.rotation.y+=f.spin.y*dt;f.mesh.rotation.z+=f.spin.z*dt;
        f.mesh.material.opacity=t<.65?1:1-(t-.65)/.35;
      }else if(f.kind==='ring'){
        f.mesh.scale.setScalar(f.from+(f.to-f.from)*t);
        f.mesh.material.opacity=f.peak*(1-t);
      }else if(f.kind==='collection'){
        if(this.camera)f.mesh.quaternion.copy(this.camera.quaternion);
        if(!f.stationary&&!this.reducedMotion){f.mesh.position.y=f.start.y+t*2.4;f.mesh.position.x=f.start.x+Math.cos(f.angle)*t*.7;f.mesh.position.z=f.start.z+Math.sin(f.angle)*t*.7;}
        f.mesh.material.opacity=1-t;
      }else if(f.kind==='stuck'){
        f.mesh.material.opacity=t<.7?1:1-(t-.7)/.3;
      }else if(f.kind==='beam'){
        f.mesh.scale.set(1-t*.6,1,1-t*.6);f.mesh.material.opacity=.55*(1-t)*(t<.1?t/.1:1);
      }else if(f.kind==='lightning'){
        f.mesh.material.opacity=1-t;
      }else if(f.kind==='heal'){
        f.mesh.position.y=f.start.y+t*1.9;
        f.mesh.scale.setScalar(1+t*.7);
        f.mesh.material.opacity=.9*(1-t);
      }
    }
  }
  // Structures flinch when hit and sink into their own rubble when destroyed.
  // Squash-and-stretch springs: new and upgraded buildings pop up, taps make them bounce.
  bounceBuilding(id,amount=.18){const obj=this.buildings?.get(id);if(!obj||this.reducedMotion||!this.physics)return;(obj.userData.pop??=new Spring(1,150,9)).kick(-amount*9);}
  stepImpacts(dt){
    for(const obj of this.buildings?.values()||[]){
      const pop=obj.userData.pop,body=obj.userData.body,base=obj.userData.bodyScale;if(!pop||!body||!base)continue;
      pop.target=1;const v=pop.update(dt);body.scale.set(base.x/Math.sqrt(Math.max(.3,v)),base.y*v,base.z/Math.sqrt(Math.max(.3,v)));
      if(pop.settled){body.scale.copy(base);obj.userData.pop=null;this.renderer&&(this.renderer.shadowMap.needsUpdate=true);}
    }
    for(const[id,hit]of this.hitShakes){
      const obj=this.buildings.get(id);
      hit.age+=dt;
      if(!obj?.userData.home||hit.age>=hit.duration){if(obj?.userData.home)obj.position.copy(obj.userData.home);this.hitShakes.delete(id);continue;}
      const power=hit.amount*(1-hit.age/hit.duration);
      obj.position.set(obj.userData.home.x+Math.sin(hit.age*94)*power,obj.userData.home.y,obj.userData.home.z+Math.cos(hit.age*79)*power);
    }
    for(const[id,death]of this.deaths){
      const obj=this.buildings.get(id);
      death.age+=dt;
      if(!obj||death.age>=.6){this.deaths.delete(id);continue;}
      const body=obj.userData.body;
      if(body?.visible){const drop=death.age/.6;body.position.y=-drop*1.4;body.rotation.z=drop*.09;}
    }
  }
  screenForCell(x,z){const p=new THREE.Vector3(cell(x),0,cell(z)).project(this.camera);return {x:(p.x*.5+.5)*innerWidth,y:(-p.y*.5+.5)*innerHeight};}
}
