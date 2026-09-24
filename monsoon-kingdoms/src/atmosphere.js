import * as THREE from 'three';

// World atmosphere and character dressing for Crown of Bharat: pooled GPU particles,
// a flowing river shader, wind in the forest, drifting cloud shade on the fields,
// birds and butterflies, rim-lit characters and rangoli hero auras. Everything is
// procedural; nothing here downloads an asset.

const rand = (() => { let seed = 40613; return () => ((seed = Math.imul(1664525, seed) + 1013904223 | 0) >>> 0) / 4294967296; })();
const noiseGLSL = /* glsl */`
float cobHash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float cobNoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(cobHash(i),cobHash(i+vec2(1,0)),u.x),mix(cobHash(i+vec2(0,1)),cobHash(i+vec2(1,1)),u.x),u.y);}
float cobFbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*cobNoise(p);p=p*2.03+vec2(17.1,9.2);a*=0.5;}return v;}
`;

// ------------------------------------------------------------------ particles
// Two pools (additive glow and alpha-blended dust) of CPU-simulated points. A burst
// costs a few array writes; the whole pool is one draw call.
const SHAPES = { glow: 0, petal: 1, dust: 2, streak: 3, spark: 4 };
export class ParticleField {
  constructor(scene, { capacity = 900, additive = false } = {}) {
    this.capacity = capacity; this.count = 0; this.cursor = 0;
    const geometry = new THREE.BufferGeometry();
    this.position = new Float32Array(capacity * 3); this.color = new Float32Array(capacity * 3);
    this.alpha = new Float32Array(capacity); this.size = new Float32Array(capacity); this.shape = new Float32Array(capacity); this.angle = new Float32Array(capacity);
    this.velocity = new Float32Array(capacity * 3); this.life = new Float32Array(capacity); this.maxLife = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity); this.drag = new Float32Array(capacity); this.grow = new Float32Array(capacity);
    this.spin = new Float32Array(capacity); this.baseSize = new Float32Array(capacity); this.baseAlpha = new Float32Array(capacity); this.fadeIn = new Float32Array(capacity);
    this.floor = new Float32Array(capacity).fill(-10); this.wobble = new Float32Array(capacity);
    geometry.setAttribute('position', new THREE.BufferAttribute(this.position, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.color, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('shape', new THREE.BufferAttribute(this.shape, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('angle', new THREE.BufferAttribute(this.angle, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setDrawRange(0, 0);
    this.material = new THREE.ShaderMaterial({
      uniforms: { uPixelScale: { value: 10 } }, transparent: true, depthWrite: false, depthTest: true, toneMapped: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, vertexColors: false,
      vertexShader: /* glsl */`
        attribute float alpha; attribute float size; attribute float shape; attribute float angle; attribute vec3 color;
        uniform float uPixelScale; varying vec3 vColor; varying float vAlpha; varying float vShape; varying float vAngle;
        void main(){ vColor=color; vAlpha=alpha; vShape=shape; vAngle=angle;
          vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv;
          gl_PointSize=clamp(size*uPixelScale,1.0,180.0); }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor; varying float vAlpha; varying float vShape; varying float vAngle;
        void main(){ vec2 p=gl_PointCoord*2.0-1.0; float a=0.0;
          if(vShape<0.5){ a=exp(-dot(p,p)*3.2); }
          else if(vShape<1.5){ float c=cos(vAngle),s=sin(vAngle); vec2 q=vec2(c*p.x-s*p.y,s*p.x+c*p.y); q.x*=1.9; float d=dot(q,q); a=smoothstep(1.0,0.72,d)*(0.78+0.22*(1.0-d)); }
          else if(vShape<2.5){ float d=length(p); a=smoothstep(1.0,0.25,d)*0.85; }
          else if(vShape<3.5){ a=smoothstep(0.16,0.0,abs(p.x))*smoothstep(1.0,0.3,abs(p.y)); }
          else { float d=length(p); a=smoothstep(1.0,0.0,d); a=a*a+smoothstep(0.35,0.0,d); }
          a*=vAlpha; if(a<0.004) discard; gl_FragColor=vec4(vColor*(vShape>3.5?1.6:1.0),min(1.0,a)); }`,
    });
    this.points = new THREE.Points(geometry, this.material); this.points.frustumCulled = false; this.points.renderOrder = additive ? 14 : 13;
    scene.add(this.points);
  }
  emit({ x = 0, y = 0, z = 0, spread = 0, spreadY = 0, vx = 0, vy = 0, vz = 0, velocitySpread = 0, radial = 0, count = 1, life = 1, lifeSpread = 0.3, size = 0.3, sizeSpread = 0.3, color = '#ffffff', colors = null, alpha = 1, gravity = 0, drag = 0, grow = 0, shape = 'glow', spin = 0, fadeIn = 0.1, floor = -10, wobble = 0 }) {
    const tint = new THREE.Color(), palette = (colors || [color]).map(c => new THREE.Color(c));
    for (let n = 0; n < count; n++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % this.capacity; this.count = Math.min(this.capacity, this.count + 1);
      const angle = rand() * Math.PI * 2, r = spread * Math.sqrt(rand());
      this.position[i * 3] = x + Math.cos(angle) * r; this.position[i * 3 + 1] = y + (rand() - 0.5) * 2 * spreadY; this.position[i * 3 + 2] = z + Math.sin(angle) * r;
      const out = radial * (0.6 + rand() * 0.8);
      this.velocity[i * 3] = vx + Math.cos(angle) * out + (rand() - 0.5) * 2 * velocitySpread;
      this.velocity[i * 3 + 1] = vy + (rand() - 0.5) * 2 * velocitySpread;
      this.velocity[i * 3 + 2] = vz + Math.sin(angle) * out + (rand() - 0.5) * 2 * velocitySpread;
      tint.copy(palette[Math.floor(rand() * palette.length)]);
      this.color[i * 3] = tint.r; this.color[i * 3 + 1] = tint.g; this.color[i * 3 + 2] = tint.b;
      this.maxLife[i] = Math.max(0.05, life * (1 + (rand() - 0.5) * 2 * lifeSpread)); this.life[i] = 0;
      this.baseSize[i] = size * (1 + (rand() - 0.5) * 2 * sizeSpread); this.size[i] = 0; this.baseAlpha[i] = alpha; this.alpha[i] = 0;
      this.shape[i] = SHAPES[shape] ?? 0; this.angle[i] = rand() * Math.PI * 2; this.spin[i] = spin * (rand() - 0.5) * 2;
      this.gravity[i] = gravity; this.drag[i] = drag; this.grow[i] = grow; this.fadeIn[i] = fadeIn; this.floor[i] = floor; this.wobble[i] = wobble * (0.5 + rand());
    }
  }
  update(dt, time, pixelScale) {
    this.material.uniforms.uPixelScale.value = pixelScale;
    let highest = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (this.maxLife[i] <= 0) continue;
      this.life[i] += dt; const t = this.life[i] / this.maxLife[i];
      if (t >= 1) { this.maxLife[i] = 0; this.alpha[i] = 0; this.size[i] = 0; continue; }
      highest = i + 1;
      const k = i * 3, damping = Math.exp(-this.drag[i] * dt);
      this.velocity[k + 1] -= this.gravity[i] * dt;
      this.velocity[k] *= damping; this.velocity[k + 1] *= damping; this.velocity[k + 2] *= damping;
      if (this.wobble[i]) { this.velocity[k] += Math.sin(time * 2.3 + i) * this.wobble[i] * dt; this.velocity[k + 2] += Math.cos(time * 1.9 + i * 1.7) * this.wobble[i] * dt; }
      this.position[k] += this.velocity[k] * dt; this.position[k + 1] += this.velocity[k + 1] * dt; this.position[k + 2] += this.velocity[k + 2] * dt;
      if (this.position[k + 1] < this.floor[i]) { this.position[k + 1] = this.floor[i]; this.velocity[k + 1] *= -0.25; this.velocity[k] *= 0.5; this.velocity[k + 2] *= 0.5; this.spin[i] *= 0.3; }
      this.angle[i] += this.spin[i] * dt;
      const fade = this.fadeIn[i] > 0 ? Math.min(1, t / this.fadeIn[i]) : 1;
      this.alpha[i] = this.baseAlpha[i] * fade * (t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4);
      this.size[i] = this.baseSize[i] * (1 + this.grow[i] * t);
    }
    const g = this.points.geometry; g.setDrawRange(0, highest);
    for (const name of ['position', 'color', 'alpha', 'size', 'shape', 'angle']) { const a = g.attributes[name]; a.needsUpdate = true; a.clearUpdateRanges?.(); }
  }
  clear() { this.maxLife.fill(0); this.alpha.fill(0); this.size.fill(0); this.points.geometry.setDrawRange(0, 0); }
  dispose() { this.points.parent?.remove(this.points); this.points.geometry.dispose(); this.material.dispose(); }
}

// ------------------------------------------------------------------ materials
export function waterMaterial(fog) {
  return new THREE.ShaderMaterial({
    fog: true, transparent: false, side: THREE.DoubleSide,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uDeep: { value: new THREE.Color('#2a7f86') }, uShallow: { value: new THREE.Color('#5fb2a6') }, uFoam: { value: new THREE.Color('#e9f7ec') } }]),
    vertexShader: /* glsl */`
      varying vec2 vUv; varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main(){ vUv=uv; vec4 world=modelMatrix*vec4(position,1.0); vWorld=world.xyz; vec4 mvPosition=viewMatrix*world; gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFoam; varying vec2 vUv; varying vec3 vWorld;
      #include <fog_pars_fragment>
      ${noiseGLSL}
      void main(){
        float across=abs(vUv.y-0.5)*2.0; vec2 flow=vec2(vUv.x*150.0-uTime*0.9,vUv.y*6.0);
        float n=cobFbm(flow*vec2(0.55,1.0)+vec2(0.0,uTime*0.05));
        float n2=cobFbm(vWorld.xz*0.35+vec2(uTime*0.22,-uTime*0.16));
        vec3 col=mix(uDeep,uShallow,smoothstep(0.1,1.0,across)*0.7+(n-0.5)*0.3);
        float streak=smoothstep(0.7,0.95,cobNoise(vec2(vUv.x*220.0-uTime*1.6,vUv.y*14.0)))*(1.0-across)*0.16;
        float glint=pow(smoothstep(0.8,1.0,n2*0.55+cobNoise(vWorld.xz*1.6+uTime*0.5)*0.55),4.0)*0.45;
        float foam=smoothstep(0.86,1.0,across+(n-0.5)*0.22);
        col+=streak*vec3(0.5,0.7,0.68)+glint*vec3(1.0,0.97,0.88);
        col=mix(col,uFoam,foam*0.45);
        gl_FragColor=vec4(col,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}
// Forest canopies lean with gusts. Only the colour pass bends; shadows are baked once.
export function addWindSway(material, uniforms, strength = 1) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uWindTime = uniforms.uWindTime;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWindTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 cobBase=vec2(instanceMatrix[3][0],instanceMatrix[3][2]);
      #else
        vec2 cobBase=vec2(modelMatrix[3][0],modelMatrix[3][2]);
      #endif
      float cobH=max(0.0,transformed.y); float cobBend=cobH*cobH*${(0.012 * strength).toFixed(4)};
      float cobGust=sin(uWindTime*1.3+cobBase.x*0.21+cobBase.y*0.17)*0.65+sin(uWindTime*2.9+cobBase.x*0.5)*0.35;
      transformed.x+=cobGust*cobBend; transformed.z+=cos(uWindTime*1.1+cobBase.y*0.23)*cobBend*0.55;`);
  };
  material.customProgramCacheKey = () => `cob-wind-${strength}`;
  material.needsUpdate = true;
}
// Soft cloud shade drifting over the ground planes.
export function addCloudShade(material, uniforms, amount = 0.2) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uCloudTime = uniforms.uCloudTime; shader.uniforms.uCloudAmount = uniforms.uCloudAmount;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vCobWorld;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCobWorld=(modelMatrix*vec4(transformed,1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec2 vCobWorld; uniform float uCloudTime; uniform float uCloudAmount;\n${noiseGLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float cobCloud=cobFbm(vCobWorld*0.028+vec2(uCloudTime*0.018,uCloudTime*0.011));
        diffuseColor.rgb*=1.0-smoothstep(0.5,0.78,cobCloud)*uCloudAmount;
        diffuseColor.rgb*=0.94+0.12*cobNoise(vCobWorld*0.45);`);
  };
  material.customProgramCacheKey = () => `cob-cloud-${amount}`;
  material.needsUpdate = true;
}
// Fresnel rim light so small troops read clearly against grass and sandstone.
export function addRimLight(material, color, strength) {
  if (material.userData.rim) return material;
  const rimColor = { value: new THREE.Color(color) }, rimStrength = { value: strength };
  material.userData.rim = { color: rimColor, strength: rimStrength };
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.uRimColor = rimColor; shader.uniforms.uRimStrength = rimStrength;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRimColor; uniform float uRimStrength;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 cobView=isOrthographic?vec3(0.0,0.0,1.0):normalize(vViewPosition);
        float cobRim=pow(1.0-clamp(dot(normal,cobView),0.0,1.0),2.6);
        totalEmissiveRadiance+=uRimColor*cobRim*uRimStrength;`);
  };
  material.customProgramCacheKey = () => 'cob-rim';
  material.needsUpdate = true;
  return material;
}

// ------------------------------------------------------------------ textures
function canvas(size, draw) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
// A rangoli ring for heroes: petals, dots and a lotus border in marigold and vermilion.
export function rangoliTexture() {
  if (typeof document === 'undefined') return null;
  return canvas(256, (g, s) => {
    const c = s / 2; g.translate(c, c); g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,214,102,.95)'; g.lineWidth = 7; g.beginPath(); g.arc(0, 0, c - 10, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,245,210,.8)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, c - 24, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 16; i++) {
      g.save(); g.rotate(i / 16 * Math.PI * 2);
      g.fillStyle = i % 2 ? 'rgba(236,94,52,.92)' : 'rgba(255,190,60,.95)';
      g.beginPath(); g.ellipse(0, -(c - 42), 9, 18, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,250,230,.95)'; g.beginPath(); g.arc(0, -(c - 17), 4, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    const glow = g.createRadialGradient(0, 0, c * 0.2, 0, 0, c * 0.62); glow.addColorStop(0, 'rgba(255,220,120,0)'); glow.addColorStop(1, 'rgba(255,220,120,.35)');
    g.fillStyle = glow; g.beginPath(); g.arc(0, 0, c * 0.62, 0, Math.PI * 2); g.fill();
  });
}

// ------------------------------------------------------------------ wildlife
export class Flock {
  constructor(scene, count = 7) {
    this.group = new THREE.Group(); this.birds = []; scene.add(this.group);
    // White egrets, a familiar sight over Indian fields and rivers.
    const material = new THREE.MeshLambertMaterial({ color: '#fbf8ef', emissive: '#6d6a60', side: THREE.DoubleSide });
    const wing = side => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.18, 0, 0, -0.14, side * 0.9, 0, -0.05], 3)); g.computeVertexNormals(); return g; };
    this.geometries = [wing(1), wing(-1), new THREE.ConeGeometry(0.08, 0.5, 4).rotateX(Math.PI / 2)]; this.material = material;
    for (let i = 0; i < count; i++) {
      const bird = new THREE.Group(), left = new THREE.Mesh(this.geometries[0], material), right = new THREE.Mesh(this.geometries[1], material), body = new THREE.Mesh(this.geometries[2], material);
      bird.add(left, right, body); bird.userData = { left, right, offset: new THREE.Vector3((rand() - 0.5) * 6, (rand() - 0.5) * 1.5, (rand() - 0.5) * 6), phase: rand() * 10 };
      bird.scale.setScalar(0.5 + rand() * 0.2); this.group.add(bird); this.birds.push(bird);
    }
  }
  update(time, reduced) {
    const t = time * 0.045, cx = Math.sin(t) * 34, cz = Math.cos(t * 0.8) * 30, heading = Math.atan2(Math.cos(t) * 34, -Math.sin(t * 0.8) * 24);
    for (const bird of this.birds) {
      const { offset, phase, left, right } = bird.userData;
      bird.position.set(cx + offset.x + Math.sin(time * 0.6 + phase) * 1.2, 17 + offset.y + Math.sin(time * 0.9 + phase) * 0.6, cz + offset.z);
      bird.rotation.y = heading;
      const flap = reduced ? 0.2 : Math.sin(time * 9 + phase * 3) * (Math.sin(time * 0.7 + phase) > 0.2 ? 0.7 : 0.08);
      left.rotation.z = flap; right.rotation.z = -flap;
    }
  }
}
export class Butterflies {
  constructor(scene, count = 10) {
    this.group = new THREE.Group(); this.items = []; scene.add(this.group);
    const wing = new THREE.CircleGeometry(0.13, 7).scale(1, 0.8, 1).translate(0.13, 0, 0).rotateX(-Math.PI / 2);
    this.geometry = wing; this.materials = ['#f7a531', '#fff4d6', '#5aa7e8', '#e8573f'].map(color => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    for (let i = 0; i < count; i++) {
      const m = this.materials[i % this.materials.length], fly = new THREE.Group(), l = new THREE.Mesh(wing, m), r = new THREE.Mesh(wing, m); r.scale.x = -1;
      fly.add(l, r); fly.userData = { l, r, home: new THREE.Vector3((rand() - 0.5) * 42, 0, (rand() - 0.5) * 42), phase: rand() * 20, speed: 0.4 + rand() * 0.5 };
      this.group.add(fly); this.items.push(fly);
    }
  }
  update(time, reduced) {
    for (const fly of this.items) {
      const { l, r, home, phase, speed } = fly.userData, t = time * speed + phase;
      fly.position.set(home.x + Math.sin(t) * 3 + Math.sin(t * 2.3) * 0.8, 0.9 + Math.sin(t * 3.1) * 0.35 + Math.sin(t * 0.7) * 0.3, home.z + Math.cos(t * 0.8) * 3);
      fly.rotation.y = Math.atan2(Math.cos(t), -Math.sin(t * 0.8) * 0.8);
      const flap = reduced ? 0.3 : Math.sin(time * 22 + phase) * 0.9;
      l.rotation.z = flap; r.rotation.z = -flap;
    }
  }
}
