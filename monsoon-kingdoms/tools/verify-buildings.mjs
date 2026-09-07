import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await fs.readFile(path.join(root,'assets/buildings/manifest.json'),'utf8'));
const reports=[];
for(const item of manifest.assets){
 const bytes=await fs.readFile(path.join(root,item.file));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 let triangles=0,meshes=0,materials=new Set();
 gltf.scene.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert(o.geometry.attributes.color,`${item.id}: vertex color missing`);materials.add(o.material);});
 gltf.scene.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(gltf.scene),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 assert(Math.abs(center.x)<1e-4&&Math.abs(center.z)<1e-4,`${item.id}: horizontal origin`);
 assert(Math.abs(box.min.y)<1e-4,`${item.id}: floor must be zero`);
 assert(size.x<=item.footprint[0]*2+.001&&size.z<=item.footprint[1]*2+.001,`${item.id}: footprint overflow ${size.toArray()}`);
 assert(triangles===item.triangles,`${item.id}: manifest triangle mismatch`);
 assert(meshes<=5&&materials.size<=5,`${item.id}: draw-call budget`);
 assert(triangles<(item.id.startsWith('fort')?30000:18000),`${item.id}: triangle ceiling ${triangles}`);
 assert(size.y>.8,`${item.id}: not a solid architectural asset`);
 reports.push({id:item.id,triangles,meshes,materials:materials.size,bytes:bytes.length,size:size.toArray().map(v=>+v.toFixed(3)),floor:+box.min.y.toFixed(5),result:'PASS'});
 console.log(`${item.id}: ${triangles} triangles, ${meshes} meshes, ${(bytes.length/1024).toFixed(0)} KB, PASS`);
}
await fs.writeFile(path.join(root,'assets/buildings/verification.json'),JSON.stringify(reports,null,2)+'\n');
