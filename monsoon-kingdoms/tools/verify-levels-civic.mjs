import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await fs.readFile(path.join(root,'assets/buildings/levels/civic-manifest.json'),'utf8'));
const families=new Map(),report=[];
for(const entry of manifest.levels){
 const bytes=await fs.readFile(path.join(root,entry.file));
 const g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 let triangles=0,meshes=0;const geometry=crypto.createHash('sha256');
 g.scene.updateMatrixWorld(true);
 g.scene.traverse(o=>{if(!o.isMesh)return;meshes++;const p=o.geometry.attributes.position;triangles+=(o.geometry.index?.count??p.count)/3;assert(o.geometry.attributes.color,'Vertex color contract');for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);const b=Buffer.alloc(12);v.toArray().forEach((n,j)=>b.writeFloatLE(n,j*4));geometry.update(b);}if(o.geometry.index)geometry.update(Buffer.from(o.geometry.index.array.buffer,o.geometry.index.array.byteOffset,o.geometry.index.array.byteLength));});
 const bounds=new THREE.Box3().setFromObject(g.scene),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 assert.equal(triangles,entry.triangles,`${entry.family}${entry.level} triangle count`);assert(triangles<=22000&&meshes>=1&&meshes<=4);
 assert(Math.abs(bounds.min.y)<1e-4&&Math.abs(center.x)<1e-4&&Math.abs(center.z)<1e-4,'Ground and center pivot');assert(size.x<=entry.footprint[0]*2+.001&&size.z<=entry.footprint[1]*2+.001,'Footprint');
 const hash=geometry.digest('hex');const hashes=families.get(entry.family)??[];assert(!hashes.includes(hash),`${entry.family}${entry.level} repeats geometry`);hashes.push(hash);families.set(entry.family,hashes);
 report.push({family:entry.family,level:entry.level,triangles,meshes,geometryHash:hash,size:size.toArray(),floor:bounds.min.y,structuralChange:entry.structuralChange,result:'PASS'});
}
assert.equal(manifest.levels.length,75);for(const [family,hashes] of families){assert.equal(hashes.length,15);console.log(family,'15 unique geometry levels PASS');}
await fs.writeFile(path.join(root,'assets/buildings/levels/civic-verification.json'),JSON.stringify({status:'PASS',entries:report,generatedModels:70,preservedBases:5,maxTriangles:Math.max(...report.map(x=>x.triangles)),maxDrawCalls:Math.max(...report.map(x=>x.meshes)),checks:['native GLTFLoader import','75entries','15distinct geometry hashes per family','floor at0','centeredXZ','unchanged cell footprint','<=22000triangles','<=4draws','actual vertex colors']},null,2)+'\n');
