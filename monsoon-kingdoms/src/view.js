import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CATALOG, UNITS, HEROES, SPELLS } from './rules.js';
import { cameraLimits, villageFocus } from './camera-framing.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { prepareGroundedModel, stepGroundedMotion } from './grounded-motion.js';

export const TROOP_GROUND_Y=-.055;
export const wallVisualScale={x:.90,y:.58,z:.90};

const cell = v => (v - 12) * 2;
const rand = (() => { let seed=8123; return () => ((seed = Math.imul(1664525,seed)+1013904223|0)>>>0)/4294967296; })();
const mat = (color, extra={}) => new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
export class KingdomView {
  constructor(canvas, onTap) {
    this._inputEnabled=true;this.motionQuery=matchMedia('(prefers-reduced-motion: reduce)');this.reducedMotion=this.motionQuery.matches;this.motionQuery.addEventListener('change',e=>{this.reducedMotion=e.matches;});
    this.canvas=canvas; this.scene=new THREE.Scene(); this.scene.background=new THREE.Color('#b6d5c7');
    this.scene.fog=new THREE.Fog('#b6d5c7',105,185);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6)); this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap; this.renderer.shadowMap.autoUpdate=false;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.12;
    this.camera=new THREE.OrthographicCamera(); this.camera.near=.1;this.camera.far=250;
    this.target=new THREE.Vector3(0,0,0); this.angle=Math.PI/4; this.span=59;
    this.scene.add(new THREE.HemisphereLight('#e9f3ff','#6f8140',1.55));
    this.sun=new THREE.DirectionalLight('#fff0ca',3.1);this.sun.position.set(-24,50,24);
    this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-46,right:46,top:46,bottom:-46,near:1,far:130});this.sun.shadow.bias=-.00035;this.sun.shadow.normalBias=.035; this.scene.add(this.sun);
    this.groundMotion=new Map();this.labelCamera=new THREE.OrthographicCamera();this.quality='balanced';this.animations={};this.modelTops={};this.mixers=new Map();this.spellAreas=new Map();this.textures={};
    this.board=new THREE.Group();this.scene.add(this.board);this.models={};this.modelLoads=new Map();this.modelFailures=new Map();this.variantCache=new Map();this.buildings=new Map();this.troops=new Map();this.unitBars=new Map();this.effects=[];this.lastEvent=0;this.time=0;this.shake=0;this.shaking=false;this.hitShakes=new Map();this.deaths=new Map();this.unitDeaths=new Map();
    this.ray=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    this.selection=new THREE.Group();this.scene.add(this.selection); this.ghost=new THREE.Group();this.scene.add(this.ghost);
    this.spellAim=new THREE.Group();this.spellAim.visible=false;this.scene.add(this.spellAim);
    this.labelHost=document.createElement('div');this.labelHost.className='world-labels';document.body.append(this.labelHost);
    this.labels=new Map();this.resize=()=>{this.renderer.setSize(innerWidth,innerHeight);this.updateCamera();};addEventListener('resize',this.resize);this.resize();
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
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,ratio));this.sun.shadow.mapSize.set(size,size);
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
    const paths=[...Object.keys(CATALOG).map(x=>['buildings',x]),...Object.keys(HEROES).map(x=>['heroes',x]),...Object.keys(UNITS).map(x=>['units',x]),...['banyan','palm','rocks','bush','cart','jars'].map(x=>['environment',x])];let done=0;const loader=new GLTFLoader();
    await Promise.all([this.loadTextures(),...paths.map(async([folder,name])=>{const gltf=await loader.loadAsync(`./assets/${folder}/${name}.glb`);this.models[name]=gltf.scene;this.animations[name]=gltf.animations;this.modelTops[name]=new THREE.Box3().setFromObject(gltf.scene).max.y;progress(++done/paths.length*.85,`Carving the valley · ${done}/${paths.length}`);})]);
    for(const[folder,name]of paths){this.detailModel(this.models[name],name,folder);if(folder==='units'||folder==='heroes')prepareGroundedModel(this.models[name],name);}
    await this.ensureBuildingModels(buildings);this.makeLandscape();progress(.95,'Opening the gates of Surajgarh');
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
    if(this.animations[name]?.length){const mixer=new THREE.AnimationMixer(obj);mixer.clipAction(this.animations[name][0]).play();mixer.setTime(rand()*2);this.mixers.set(obj,mixer);}return obj;
  }
  releaseMixer(obj){
    const mixer=this.mixers.get(obj);if(mixer){mixer.stopAllAction();mixer.uncacheRoot(obj);this.mixers.delete(obj);}
    this.groundMotion?.delete(obj);const skeletons=new Set();obj.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const skeleton of skeletons)skeleton.dispose();
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
    const land=this.mesh(new THREE.PlaneGeometry(49,49),mat('#ffffff',{map:texture,normalMap:this.textures.grass.normal,roughnessMap:this.textures.grass.roughness,normalScale:new THREE.Vector2(.25,.25)}),0,-.06,0);land.rotation.x=-Math.PI/2;
    this.mesh(new THREE.BoxGeometry(180,1,180),mat('#87aa65',{map:this.textures.grass.basecolor,normalMap:this.textures.grass.normal,roughnessMap:this.textures.grass.roughness,normalScale:new THREE.Vector2(.2,.2)}),0,-2.1,0);
    // The valley's river and broad banks frame a clear, square buildable plateau.
    const riverMat=mat('#3f979c',{roughness:.22,metalness:.18,side:THREE.DoubleSide});
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-76,-.95,-61),new THREE.Vector3(-39,-.95,-28),new THREE.Vector3(-32,-.95,4),new THREE.Vector3(-30,-.95,29),new THREE.Vector3(-3,-.95,39),new THREE.Vector3(42,-.95,43),new THREE.Vector3(77,-.95,68)]);
    const ribbon=(width,material,y)=>{const points=curve.getPoints(160),pos=[],uv=[],indices=[];points.forEach((p,i)=>{const tangent=curve.getTangent(i/160),side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();for(const sign of [-1,1]){const v=p.clone().addScaledVector(side,width/2*sign);pos.push(v.x,y,v.z);uv.push(i/160,(sign+1)/2);}if(i<160){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}});const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return this.mesh(geo,material);};
    ribbon(13,mat('#b4ac7f',{side:THREE.DoubleSide}),-1.0);this.water=ribbon(10,riverMat,-.93);
    const ripplePoints=[];for(let i=0;i<180;i++){const t=.08+rand()*.84,p=curve.getPoint(t),tangent=curve.getTangent(t),side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();p.addScaledVector(side,(rand()-.5)*7);const length=.35+rand()*1.2;ripplePoints.push(new THREE.Vector3(p.x-tangent.x*length,-.91,p.z-tangent.z*length),new THREE.Vector3(p.x+tangent.x*length,-.91,p.z+tangent.z*length));}
    this.ripples=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ripplePoints),new THREE.LineBasicMaterial({color:'#b8e6cf',transparent:true,opacity:.2}));this.scene.add(this.ripples);
    // Shared geometry and materials keep a dense forest inexpensive.
    const placement=[];for(let i=0;i<220;i++){const edge=i<110,side=i%4,t=(rand()-.5)*(edge?76:118),distance=28+rand()*11;const x=edge?(side<2?(side===0?-distance:distance):t):(rand()-.5)*118,z=edge?(side>=2?(side===2?-distance:distance):t):(rand()-.5)*118;if(Math.abs(x)<27&&Math.abs(z)<27)continue;if(x < -25&&x>-43&&z<40)continue;if(z>32&&z<49)continue;placement.push({x,z,s:(edge?.75:.85)+rand()*.8,r:rand()*7,type:i%7===0?'palm':'banyan'});}
    for(const type of ['banyan','palm']){const p=placement.filter(p=>p.type===type);this.models[type].updateMatrixWorld(true);this.models[type].traverse(o=>{if(!o.isMesh)return;const inst=new THREE.InstancedMesh(o.geometry,o.material,p.length),m=new THREE.Matrix4(),q=new THREE.Quaternion();p.forEach((p,i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),p.r);m.compose(new THREE.Vector3(p.x,-1.5,p.z),q,new THREE.Vector3(p.s,p.s,p.s)).multiply(o.matrixWorld);inst.setMatrixAt(i,m);});inst.castShadow=true;inst.receiveShadow=true;this.scene.add(inst);});}
    for(let i=0;i<38;i++){const side=i%4,t=rand()*49-24.5,x=side<2?(side===0?-25.4:25.4):t,z=side>=2?(side===2?-25.4:25.4):t;this.clone(i%3===0?'rocks':'bush',this.scene,x,z,.45+rand()*.4);}
    this.clone('cart',this.scene,20,23,.8);this.clone('jars',this.scene,16,23,.85);
    for(let i=0;i<12;i++){const x=(rand()-.5)*145,z=-50-rand()*28;const hill=this.mesh(new THREE.SphereGeometry(9+rand()*10,10,7),mat(i%2?'#7d9a79':'#69886c'),x,-2,z);hill.scale.set(1,.45+rand()*.4,.8);}
    const border=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-24,.02,-24),new THREE.Vector3(24,.02,-24),new THREE.Vector3(24,.02,24),new THREE.Vector3(-24,.02,24)]),new THREE.LineBasicMaterial({color:'#eee4b2',transparent:true,opacity:.35}));this.scene.add(border);
    this.grid=new THREE.GridHelper(48,24,'#e0d9ad','#e0d9ad');this.grid.position.y=.035;this.grid.material.transparent=true;this.grid.material.opacity=.22;this.grid.visible=false;this.scene.add(this.grid);
    this.deployment=new THREE.Group();this.scene.add(this.deployment);const band=mat('#e6ca70',{transparent:true,opacity:.32,depthWrite:false});for(const[x,z,w,h]of [[-21,0,6,48],[21,0,6,48],[0,-21,36,6],[0,21,36,6]]){const m=this.mesh(new THREE.PlaneGeometry(w,h),band,x,.04,z,this.deployment);m.rotation.x=-Math.PI/2;}const deploymentLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-18,.08,-18),new THREE.Vector3(18,.08,-18),new THREE.Vector3(18,.08,18),new THREE.Vector3(-18,.08,18)]),new THREE.LineDashedMaterial({color:'#e8b958',dashSize:1,gapSize:.55}));deploymentLine.computeLineDistances();this.deployment.add(deploymentLine);this.deployment.visible=false;
    this.ambientPeople=[];for(let i=0;i<8;i++){const obj=this.clone(i%3===0?'engineer':'guard',this.scene,0,0,.85),phase=i*.78;obj.position.set(Math.sin(phase)*3.5-1.5,TROOP_GROUND_Y,Math.cos(phase)*16);obj.rotation.y=Math.atan2(Math.cos(phase)*3.5,-Math.sin(phase)*16);obj.traverse(mesh=>{if(mesh.isMesh)mesh.castShadow=false;});this.ambientPeople.push({obj,phase});}
    // One instanced draw adds soft contact beneath every footprint, including walls.
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const shadowContext=shadowCanvas.getContext('2d'),gradient=shadowContext.createRadialGradient(32,32,7,32,32,32);gradient.addColorStop(0,'rgba(28,40,17,.48)');gradient.addColorStop(.55,'rgba(28,40,17,.26)');gradient.addColorStop(1,'rgba(28,40,17,0)');shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,64,64);
    this.contactShadows=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,toneMapped:false}),576);this.contactShadows.count=0;this.contactShadows.frustumCulled=false;this.scene.add(this.contactShadows);
    this.troopContactShadows=new THREE.InstancedMesh(this.contactShadows.geometry,this.contactShadows.material,256);this.troopContactShadows.count=0;this.troopContactShadows.frustumCulled=false;this.scene.add(this.troopContactShadows);
    this.renderer.shadowMap.needsUpdate=true;
  }
  setBoard(buildings,mode){this.mode=mode;this.setSpellAim(null);for(const obj of this.buildings.values())this.board.remove(obj);this.buildings.clear();for(const obj of this.troops.values()){this.releaseMixer(obj);this.scene.remove(obj);}this.troops.clear();for(const area of this.spellAreas.values()){this.scene.remove(area);this.clearOverlay(area);}this.spellAreas.clear();for(const effect of this.effects){this.scene.remove(effect.mesh);this.clearOverlay(effect.mesh);}this.effects=[];for(const bar of this.unitBars.values()){this.scene.remove(bar);this.clearOverlay(bar);}this.unitBars.clear();this.hitShakes.clear();this.deaths.clear();this.unitDeaths.clear();this.shake=0;if(this.homeHero)this.homeHero.visible=mode==='home';for(const el of this.labels.values())el.remove();this.labels.clear();this.lastEvent=0;this.deployment.visible=mode==='battle';this.ambientPeople.forEach(p=>p.obj.visible=mode==='home');this.setSelection(null);this.setGhost(null);this.syncBuildings(buildings);this.cameraAction('reset');}
  syncBuildings(buildings){for(const b of buildings){let obj=this.buildings.get(b.id);const wanted=this.buildingAsset(b.type,b.level);if(!this.models[wanted])this.preloadBuilding(b.type,b.level).catch(()=>{});const asset=this.models[wanted]?wanted:(obj?.userData.asset||b.type);const signature=`${asset}/${b.level}/${b.x}/${b.z}/${!!b.readyAt}`;if(obj?.userData.signature!==signature){if(obj)this.board.remove(obj);obj=new THREE.Group();obj.userData={id:b.id,signature,asset,wanted};this.board.add(obj);const body=this.clone(asset,obj);if(b.type==='wall')body.scale.set(wallVisualScale.x,wallVisualScale.y,wallVisualScale.z);if(!b.level)body.scale.y*=.42;obj.userData.body=body;this.buildings.set(b.id,obj);obj.position.set(cell(b.x+b.w/2),0,cell(b.z+b.h/2));obj.userData.home=obj.position.clone();this.renderer.shadowMap.needsUpdate=true;}
      const dead=b.hp===0;if(dead&&!obj.userData.ruin){obj.userData.body.visible=false;const ruins=this.clone('rocks',obj,0,0,b.w*.6);ruins.scale.y*=.25;obj.userData.ruin=true;this.renderer.shadowMap.needsUpdate=true;}obj.userData.building=b;
      if(!dead&&!this.labels.has(b.id)){const el=document.createElement('button');el.className='building-bubble';el.tabIndex=-1;el.style.pointerEvents='none';this.labelHost.append(el);this.labels.set(b.id,el);}
      const label=this.labels.get(b.id);if(label){let text='';if(this.mode==='battle'&&b.hp<b.maxHp&&!dead)text=`<i style="width:${b.hp/b.maxHp*100}%"></i>`;else if(this.mode==='home'&&b.readyAt)text=`⚒ ${Math.max(0,Math.ceil((b.readyAt-Date.now())/1000))}s`;else if(this.mode==='home'&&b.stored>=1)text=`${{coin:'●',wood:'♣',grain:'❧',iron:'◆',gems:'⬟'}[CATALOG[b.type].production?.resource]||'●'} ${b.stored>=1000?`${(b.stored/1000).toFixed(1)}k`:Math.floor(b.stored)}`;if(label.innerHTML!==text)label.innerHTML=text;label.hidden=!text||dead;label.classList.toggle('health',this.mode==='battle');label.classList.toggle('resource-marker',this.mode==='home'&&!b.readyAt);label.classList.toggle('construction-marker',this.mode==='home'&&!!b.readyAt);label.dataset.resource=CATALOG[b.type].production?.resource||'';}
    }if(this.contactShadows){const matrix=new THREE.Matrix4();this.contactShadows.count=Math.min(buildings.length,576);for(let i=0;i<this.contactShadows.count;i++){const b=buildings[i];matrix.makeScale((b.w*2+.7)*(b.type==='wall'?wallVisualScale.x:1),1,(b.h*2+.7)*(b.type==='wall'?wallVisualScale.z:1)).setPosition(cell(b.x+b.w/2),-.035,cell(b.z+b.h/2));this.contactShadows.setMatrixAt(i,matrix);}this.contactShadows.instanceMatrix.needsUpdate=true;}this.trimModelCache();}
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
      if(!group){group=new THREE.Group();group.position.set(cell(area.x),.095,cell(area.z));const color=area.type==='freeze'?'#8ceeff':'#ee85e0',radius=area.radius*2;
        for(const[geometry,opacity]of [[new THREE.CircleGeometry(radius,64),.15],[new THREE.RingGeometry(radius-.12,radius,64),.8]]){const m=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.userData.opacity=opacity;group.add(m);}this.scene.add(group);this.spellAreas.set(area.id,group);
      }const fade=Math.min(1,(area.expiresAt-battle.elapsed)*2);group.children.forEach(m=>m.material.opacity=m.userData.opacity*fade*(this.reducedMotion?1:.9+Math.sin(this.time*4)*.1));
    }for(const[id,group]of this.spellAreas)if(!active.has(id)){this.scene.remove(group);this.clearOverlay(group);this.spellAreas.delete(id);}
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
  effect(event){
    if(event.type==='freeze'||event.type==='rage')return;
    if(event.type==='lightning'){
      const points=[new THREE.Vector3(0,13,0),new THREE.Vector3(.8,10,.3),new THREE.Vector3(-.6,8,-.2),new THREE.Vector3(.5,5,.4),new THREE.Vector3(-.4,3,0),new THREE.Vector3(0,.2,0)],path=new THREE.CurvePath();for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(points[i-1],points[i]));
      const mesh=this.mesh(new THREE.TubeGeometry(path,32,.12,5,false),new THREE.MeshBasicMaterial({color:'#edfbff',transparent:true,depthTest:false}),cell(event.x),0,cell(event.z));mesh.renderOrder=12;this.addEffect({mesh,age:0,duration:.65,kind:'lightning'});
      const flash=this.overlay(new THREE.RingGeometry(.1,5,48),'#b7e7ff',cell(event.x),.12,cell(event.z),{opacity:.55,side:THREE.DoubleSide});flash.rotation.x=-Math.PI/2;this.addEffect({mesh:flash,age:0,duration:.8,kind:'ring',from:.65,to:1.2,peak:.55});
      this.shakeCamera(.5);return;
    }
    if(event.type==='destroy'){
      this.spawnDebris(event);
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
    this.addEffect({mesh,age:0,duration:Math.max(.16,Math.min(.5,distance*.045)),kind:'shot',heavy,start:from,end:to,arc:heavy?2.4:Math.min(2.2,.5+distance*.14)});
    if(event.targetId)this.jolt(event.targetId,heavy?.17:.075,heavy?.34:.22);
    if(heavy){
      const flash=this.overlay(new THREE.SphereGeometry(.42,8,6),'#ffd79a',from.x,from.y,from.z,{opacity:.8});
      this.addEffect({mesh:flash,age:0,duration:.14,kind:'ring',from:.5,to:1.5,peak:.8});
      this.shakeCamera(.13);
    }
  }
  // A landed shot: sparks plus a flat ring, so hits read even when the model is tall.
  impact(effect){
    const {end,heavy}=effect;
    const ring=this.overlay(new THREE.RingGeometry(.12,heavy?.55:.3,24),heavy?'#ffcf8b':'#ffe9b4',end.x,.14,end.z,{opacity:.75,side:THREE.DoubleSide});
    ring.rotation.x=-Math.PI/2;
    this.addEffect({mesh:ring,age:0,duration:heavy?.42:.26,kind:'ring',from:.6,to:heavy?3:1.7,peak:.75});
    if(this.quality==='low'||this.reducedMotion)return;
    const sparks=heavy?7:3;
    for(let i=0;i<sparks;i++){
      const angle=rand()*Math.PI*2,speed=1.5+rand()*(heavy?4:2.2);
      const spark=this.overlay(new THREE.SphereGeometry(heavy?.1:.065,5,4),heavy?'#ffbe63':'#ffe6a8',end.x,end.y,end.z,{opacity:1});
      this.addEffect({mesh:spark,age:0,duration:.24+rand()*.2,kind:'debris',
        velocity:new THREE.Vector3(Math.sin(angle)*speed,2+rand()*3,Math.cos(angle)*speed),spin:new THREE.Vector3()});
    }
  }
  setHomeHero(id){
    if(this.homeHeroId===id&&this.homeHero){this.homeHero.visible=this.mode==='home';return;}
    if(this.homeHero){this.releaseMixer(this.homeHero);this.scene.remove(this.homeHero);}
    this.homeHero=null;this.homeHeroId=id;if(!id||!this.models[id])return;this.homeHero=this.clone(id);this.homeHero.visible=this.mode==='home';this.homeHero.position.set(-1,TROOP_GROUND_Y,5.5);this.homeHero.rotation.y=Math.PI/4;
    this.homeHero.traverse(o=>{if(o.isMesh)o.castShadow=false;});
  }
  healthBar(unit){
    const width=unit.heroId?1.6:({elephant:2.2,yeti:1.8,garuda:1.6,bowler:1.2}[unit.type]||.85);
    const group=new THREE.Group(),back=new THREE.Mesh(new THREE.PlaneGeometry(width,.12),new THREE.MeshBasicMaterial({color:'#263628',depthTest:false}));
    const fill=new THREE.Mesh(new THREE.PlaneGeometry(width-.05,.075),new THREE.MeshBasicMaterial({color:unit.heroId?'#f8cc52':'#87d53e',depthTest:false}));fill.position.z=.001;group.add(back,fill);group.userData.fill=fill;group.renderOrder=10;this.scene.add(group);this.unitBars.set(unit.id,group);return group;
  }
  updateBattle(battle,dt){
    this.syncBuildings(battle.buildings);
    for(const unit of battle.units){
      let obj=this.troops.get(unit.id);
      if(!obj){obj=this.clone(unit.heroId||unit.type);obj.scale.setScalar(unit.heroId?1.25:1.16);obj.traverse(o=>{if(o.isMesh)o.castShadow=false;});this.troops.set(unit.id,obj);this.healthBar(unit);}
      const flying=!!UNITS[unit.type]?.flying;
      if(unit.hp<=0){
        // Models share materials with every other troop of their type, so a fall is
        // animated with scale and depth rather than by fading a shared material.
        if(!this.unitDeaths.has(unit.id)){this.unitDeaths.set(unit.id,{age:0});const fell=this.unitBars.get(unit.id);if(fell)fell.visible=false;}
        const fall=this.unitDeaths.get(unit.id);fall.age+=dt;const drop=Math.min(1,fall.age/.55);
        obj.visible=drop<1;obj.userData.groundWalking=false;
        if(obj.visible){obj.scale.setScalar((unit.heroId?1.25:1.16)*(1-drop*.55));obj.position.y=-drop*.9;obj.rotation.z=drop*1.35;}
        continue;
      }
      obj.visible=true;obj.userData.groundWalking=unit.action==='walk';
      const x=cell(unit.x),z=cell(unit.z),follow=obj.userData.renderPlaced?1-Math.exp(-dt*25):1;
      obj.position.x+=(x-obj.position.x)*follow;obj.position.z+=(z-obj.position.z)*follow;obj.userData.renderPlaced=true;
      obj.position.y=flying?2.2+(this.reducedMotion?0:Math.sin(this.time*3+unit.id.length)*.12):TROOP_GROUND_Y;
      const mixer=this.mixers.get(obj);if(mixer)mixer.timeScale=unit.action==='attack'?1.2:unit.action==='walk'?1:.7;
      const turn=Math.atan2(Math.sin(unit.facing-obj.rotation.y),Math.cos(unit.facing-obj.rotation.y));obj.rotation.y+=turn*(1-Math.exp(-dt*18));obj.rotation.z=0;
      const bar=this.unitBars.get(unit.id);bar.visible=unit.hp>0&&(unit.hp<unit.maxHp||!!unit.heroId);bar.position.set(obj.position.x,obj.position.y+(this.modelTops[unit.heroId||unit.type]||1.8)*obj.scale.y+.28,obj.position.z);bar.quaternion.copy(this.camera.quaternion);bar.userData.fill.scale.x=unit.hp/unit.maxHp;
    }
    this.syncSpellAreas(battle);
    for(const event of battle.events)if(event.id>this.lastEvent){this.effect(event);this.lastEvent=event.id;}
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
    for(const actor of actors){if(!actor?.visible||count>=256)continue;const spec=actor.userData.groundGait,id=spec?.id||'',radius=(id==='elephant'?1.55:id==='rider'?1.05:id==='yeti'?.9:.65)*actor.scale.x;
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
    this.updateTroopContactShadows();this.stepEffects(dt);this.stepImpacts(dt);
    if(this.shake>0.001||this.shaking){
      this.shake=Math.max(0,this.shake-dt*2.6);this.updateCamera();
      if(this.shake>0.001){const power=this.shake*this.shake*1.7;this.camera.position.x+=Math.sin(this.time*61)*power;this.camera.position.y+=Math.sin(this.time*47+1.7)*power*.7;this.camera.position.z+=Math.cos(this.time*53+.6)*power;this.camera.updateMatrixWorld();this.shaking=true;}else this.shaking=false;
    }
    this.positionWorldLabels();this.renderer.render(this.scene,this.camera);
  }
  stepEffects(dt){
    for(let i=this.effects.length-1;i>=0;i--){
      const f=this.effects[i];f.age+=dt;const t=Math.min(1,f.age/f.duration);
      if(f.age>=f.duration){
        if(f.kind==='shot')this.impact(f);
        this.scene.remove(f.mesh);f.mesh.geometry.dispose();f.mesh.material.dispose();this.effects.splice(i,1);continue;
      }
      if(f.kind==='shot'){
        f.mesh.position.lerpVectors(f.start,f.end,t);
        f.mesh.position.y+=Math.sin(t*Math.PI)*f.arc;
        if(!f.heavy){
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
  stepImpacts(dt){
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
