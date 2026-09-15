import * as THREE from 'three';

// The Blender exports retain disconnected costume/limb components, but most were
// merged for draw-call efficiency. Add a shared GPU skin once per source asset;
// cloned actors receive independent bones without multiplying geometry/materials.
const profiles={guard:[.66,.37,.095],archer:[.66,.37,.095],engineer:[.66,.37,.095],healer:[.66,.37,.095],miner:[.726,.407,.1045],bowler:[.79,.44,.105],veer:[.792,.444,.114],tara:[.7788,.4366,.1121],rider:[.88,.45,.10],elephant:[1.218,.64,.1131],yeti:[.96,.52,.12]};
const rigs=new WeakMap();
function components(geometry){
  const p=geometry.attributes.position,n=p.count,parent=Int32Array.from({length:n},(_,i)=>i);
  const find=a=>{while(parent[a]!==a){parent[a]=parent[parent[a]];a=parent[a];}return a;};
  const join=(a,b)=>{parent[find(b)]=find(a);};
  const welded=new Map();
  for(let i=0;i<n;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*100000)).join(',');if(welded.has(key))join(i,welded.get(key));else welded.set(key,i);}
  const ix=geometry.index?.array||Array.from({length:n},(_,i)=>i);
  for(let i=0;i<ix.length;i+=3){join(ix[i],ix[i+1]);join(ix[i],ix[i+2]);}
  const result=new Map(),point=new THREE.Vector3();
  for(let i=0;i<n;i++){const key=find(i);if(!result.has(key))result.set(key,{indices:[],bounds:new THREE.Box3()});const c=result.get(key);c.indices.push(i);c.bounds.expandByPoint(point.fromBufferAttribute(p,i));}
  return [...result.values()];
}
export function prepareGroundedModel(root,id){
  if(!profiles[id]||root.userData.groundGait)return false;
  root.updateMatrixWorld(true);
  const meshes=[];root.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh&&o.matrixWorld.equals(new THREE.Matrix4()))meshes.push({mesh:o,parts:components(o.geometry)});});
  const [hip,knee,ankle]=profiles[id],quadruped=id==='rider'||id==='elephant',count=quadruped?4:2;
  const feet=meshes.flatMap(m=>m.parts).filter(c=>c.bounds.min.y<.008&&c.bounds.max.y<ankle*2.8&&c.bounds.getSize(new THREE.Vector3()).x>.06).sort((a,b)=>{
    const volume=c=>{const s=c.bounds.getSize(new THREE.Vector3());return s.x*s.y*s.z;};return volume(b)-volume(a);
  }).slice(0,count).map(c=>c.bounds.getCenter(new THREE.Vector3())).sort((a,b)=>a.x-b.x||a.z-b.z);
  if(feet.length!==count)return false;
  const articulated=[];root.traverse(o=>{if(!o.isMesh&&!o.isBone&&o!==root&&o.position.lengthSq()>0&&o.children.length)articulated.push(o);});
  const body=new THREE.Bone();body.name='GroundBody';root.add(body);for(const joint of articulated)body.attach(joint);const bones=[body],legSpecs=[];
  for(let i=0;i<count;i++){
    // Boots/toes project ahead of the ankle; leave the original flat sole intact.
    const foot=feet[i],offset=id==='bowler'?.05:id==='yeti'?.12:id==='rider'?.04:id==='elephant'?.0348:.045*(id==='miner'?1.1:id==='veer'?1.2:id==='tara'?1.18:1);
    const hipPosition=new THREE.Vector3(foot.x,hip,foot.z-offset),kneePosition=new THREE.Vector3(foot.x,knee,foot.z-offset+.02),anklePosition=new THREE.Vector3(foot.x,ankle,foot.z-offset);
    const upper=new THREE.Bone(),lower=new THREE.Bone(),sole=new THREE.Bone();upper.name=`GroundHip${i}`;lower.name=`GroundKnee${i}`;sole.name=`GroundFoot${i}`;
    upper.position.copy(hipPosition);lower.position.copy(kneePosition).sub(hipPosition);sole.position.copy(anklePosition).sub(kneePosition);body.add(upper);upper.add(lower);lower.add(sole);bones.push(upper,lower,sole);
    legSpecs.push({hip:hipPosition.toArray(),knee:kneePosition.toArray(),ankle:anklePosition.toArray(),phase:quadruped?(id==='elephant'?[0,.5,.75,.25][i]:[0,.5,.5,0][i]):i*.5});
  }
  root.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(bones);let assigned=0;
  for(const {mesh,parts}of meshes){
    const geo=mesh.geometry.clone(),p=geo.attributes.position,indices=new Uint16Array(p.count*4),weights=new Float32Array(p.count*4);for(let i=0;i<p.count;i++)weights[i*4]=1;
    for(const c of parts){
      const size=c.bounds.getSize(new THREE.Vector3());
      // Long weapons, capes, robes and the mounted crew remain attached to the body.
      if(c.bounds.min.y>hip*.67||c.bounds.max.y>hip+(id==='yeti'?.16:.05)||size.z>hip*1.35)continue;
      if(!quadruped&&id!=='yeti'&&size.x>Math.abs(feet.at(-1).x-feet[0].x)*1.25)continue;
      for(const index of c.indices){
        const x=p.getX(index),y=p.getY(index),z=p.getZ(index);let nearest=0,distance=Infinity;
        for(let i=0;i<count;i++){const f=feet[i],d=(x-f.x)**2+(quadruped?(z-f.z)**2:0);if(d<distance){nearest=i;distance=d;}}
        const slot=index*4,base=1+nearest*3;
        if(c.bounds.max.y<ankle*2.9){indices[slot]=base+2;}
        else{
          const blend=THREE.MathUtils.smoothstep(y,knee-.045,knee+.045);
          indices[slot]=base;indices[slot+1]=base+1;weights[slot]=blend;weights[slot+1]=1-blend;
          // Furry joined haunches transition back into the stationary pelvis.
          if(id==='yeti'&&y>hip*.77){const bodyWeight=THREE.MathUtils.smoothstep(y,hip*.77,hip);weights[slot]*=1-bodyWeight;weights[slot+1]*=1-bodyWeight;indices[slot+2]=0;weights[slot+2]=bodyWeight;}
        }
        assigned++;
      }
    }
    geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
    const skin=new THREE.SkinnedMesh(geo,mesh.material);skin.name=mesh.name;skin.castShadow=mesh.castShadow;skin.receiveShadow=mesh.receiveShadow;skin.userData={...mesh.userData};
    mesh.parent.add(skin);mesh.parent.remove(mesh);skin.bind(skeleton,new THREE.Matrix4());
    skin.computeBoundingSphere();skin.boundingSphere.radius+=hip*.8; // Include every stride while retaining offscreen culling.
  }
  root.userData.groundGait={id,hip,quadruped,legs:legSpecs,assigned};return true;
}
function actorRig(root){
  if(rigs.has(root))return rigs.get(root);const spec=root.userData.groundGait;if(!spec)return null;
  const rig={spec,body:root.getObjectByName('GroundBody'),phase:0,weight:0,idleAge:1,legs:spec.legs.map((l,i)=>({upper:root.getObjectByName(`GroundHip${i}`),lower:root.getObjectByName(`GroundKnee${i}`),sole:root.getObjectByName(`GroundFoot${i}`),hip:new THREE.Vector3(...l.hip),knee:new THREE.Vector3(...l.knee),ankle:new THREE.Vector3(...l.ankle),phase:l.phase}))};rigs.set(root,rig);return rig;
}
export function footCycle(phase,stride,lift){
  const p=((phase%1)+1)%1,stance=.6;
  if(p<stance)return {z:stride*(.5-p/stance),y:0,planted:true};
  const t=(p-stance)/(1-stance);return {z:stride*(-.5+t),y:Math.sin(t*Math.PI)**2*lift,planted:false};
}
// Distances are in local model units. A stance foot travels backwards at precisely
// the actor's forward speed, keeping its sole planted while the swing foot clears it.
export function stepGroundedMotion(root,distance,dt,walking=true){
  const rig=actorRig(root);if(!rig)return false;const {spec}=rig;
  const travelled=distance>1e-5&&distance<spec.hip*4;
  rig.idleAge=travelled?0:rig.idleAge+dt;
  // Simulation runs at 30 Hz while rendering may run at 60/120 Hz. A frame
  // between simulation steps must not blend the legs back toward idle.
  const moving=walking&&(travelled||rig.idleAge<.12),stride=spec.hip*(spec.quadruped?.72:1.10),cycleDistance=stride/.6;
  if(walking&&travelled)rig.phase=(rig.phase+distance/cycleDistance)%1;
  rig.weight=THREE.MathUtils.damp(rig.weight,moving?1:0,moving?16:20,Math.min(dt,.1));
  const weight=rig.weight;rig.body.position.y=-spec.hip*(spec.quadruped?.09:.23)*weight;
  for(const leg of rig.legs){
    const cycle=footCycle(rig.phase+leg.phase,stride,spec.hip*.22),foot=leg.ankle.clone();foot.z+=cycle.z*weight;foot.y+=cycle.y*weight;
    const hip=leg.hip.clone();hip.y+=rig.body.position.y;
    const a=leg.hip.distanceTo(leg.knee),b=leg.knee.distanceTo(leg.ankle),direction=foot.clone().sub(hip),length=Math.min(direction.length(),a+b-.0001);direction.normalize();
    const along=(a*a-b*b+length*length)/(2*length),bend=Math.sqrt(Math.max(0,a*a-along*along));
    const pole=new THREE.Vector3(0,-direction.z,direction.y).normalize().negate();
    const knee=hip.clone().addScaledVector(direction,along).addScaledVector(pole,bend);
    // Keep the original rest pose exactly when stopped, then blend in the gait.
    leg.upper.position.copy(leg.hip);leg.upper.quaternion.setFromUnitVectors(leg.knee.clone().sub(leg.hip).normalize(),knee.clone().sub(hip).normalize());
    const upperWorld=leg.upper.quaternion.clone(),lowerWorld=new THREE.Quaternion().setFromUnitVectors(leg.ankle.clone().sub(leg.knee).normalize(),foot.clone().sub(knee).normalize());
    leg.lower.quaternion.copy(upperWorld).invert().multiply(lowerWorld);leg.sole.quaternion.copy(lowerWorld).invert();
    if(weight<.001){leg.upper.quaternion.identity();leg.lower.quaternion.identity();leg.sole.quaternion.identity();rig.body.position.y=0;}
  }
  root.updateMatrixWorld(true);return true;
}
export function groundGaitSnapshot(root){const rig=actorRig(root);if(!rig)return null;return {phase:rig.phase,weight:rig.weight,legs:rig.legs.map(l=>({foot:l.sole.getWorldPosition(new THREE.Vector3()).toArray(),planted:footCycle(rig.phase+l.phase,rig.spec.hip*(rig.spec.quadruped?.72:1.10),rig.spec.hip*.22).planted}))};}
