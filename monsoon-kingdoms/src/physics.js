import * as THREE from 'three';

// A small, deterministic rigid-body and cloth solver for visual physics. It never
// feeds back into the battle rules (which stay on their own 30 Hz simulation), so
// collapsing masonry, bouncing cannonballs, tumbling fallen warriors and capes can
// be as lively as the frame budget allows without changing any outcome.
//
//   · Rigid bodies: boxes and spheres with full 3D inertia. Box–ground contact is
//     resolved per corner with sequential impulses, so a tossed block lands on an
//     edge, tips and settles flat. Coulomb friction, restitution, rolling spheres.
//   · Static colliders: axis-aligned boxes for standing buildings and walls.
//   · Body–body: bounding-sphere impulses so rubble piles instead of overlapping.
//   · Sleeping, lifetimes and a sink-into-the-ground fade.
//   · Springs for squash/stretch and knockback; verlet cloth strips for capes.

const UP = new THREE.Vector3(0, 1, 0);
const _r = new THREE.Vector3(), _v = new THREE.Vector3(), _t = new THREE.Vector3(), _n = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
const _m = new THREE.Matrix3(), _mt = new THREE.Matrix3(), _q = new THREE.Quaternion(), _mat4 = new THREE.Matrix4();
const CORNERS = [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => new THREE.Vector3(x, y, z))));

export class RigidBody {
  constructor({ shape = 'box', half = new THREE.Vector3(0.3, 0.3, 0.3), radius = 0.3, mass = 1, position, quaternion, velocity, angularVelocity, restitution = 0.25, friction = 0.6, object = null, life = 6, sink = 1, collide = true, linearDamping = 0.02, angularDamping = 0.06 }) {
    this.shape = shape; this.half = half.clone(); this.radius = shape === 'sphere' ? radius : half.length();
    this.mass = mass; this.invMass = mass > 0 ? 1 / mass : 0;
    this.position = position ? position.clone() : new THREE.Vector3(); this.quaternion = quaternion ? quaternion.clone() : new THREE.Quaternion();
    this.velocity = velocity ? velocity.clone() : new THREE.Vector3(); this.angularVelocity = angularVelocity ? angularVelocity.clone() : new THREE.Vector3();
    this.restitution = restitution; this.friction = friction; this.object = object; this.life = life; this.age = 0; this.sink = sink; this.collide = collide;
    this.linearDamping = linearDamping; this.angularDamping = angularDamping; this.sleeping = false; this.still = 0; this.sunk = 0; this.contact = false;
    // Body-frame inverse inertia (diagonal).
    if (shape === 'sphere') { const i = 0.4 * mass * radius * radius; this.invInertia = new THREE.Vector3(1 / i, 1 / i, 1 / i); }
    else { const x = half.x * 2, y = half.y * 2, z = half.z * 2, k = mass / 12; this.invInertia = new THREE.Vector3(1 / (k * (y * y + z * z)), 1 / (k * (x * x + z * z)), 1 / (k * (x * x + y * y))); }
    this.invInertiaWorld = new THREE.Matrix3(); this.updateInertia();
  }
  updateInertia() {
    _mat4.makeRotationFromQuaternion(this.quaternion); _m.setFromMatrix4(_mat4); _mt.copy(_m).transpose();
    const d = new THREE.Matrix3().set(this.invInertia.x, 0, 0, 0, this.invInertia.y, 0, 0, 0, this.invInertia.z);
    this.invInertiaWorld.multiplyMatrices(_m, d).multiply(_mt);
  }
  // Apply an impulse J at world point p.
  impulse(j, point) {
    this.velocity.addScaledVector(j, this.invMass);
    if (point) { _r.subVectors(point, this.position); _t.crossVectors(_r, j).applyMatrix3(this.invInertiaWorld); this.angularVelocity.add(_t); }
    this.wake();
  }
  wake() { this.sleeping = false; this.still = 0; }
  pointVelocity(point, out) { _r.subVectors(point, this.position); return out.crossVectors(this.angularVelocity, _r).add(this.velocity); }
}

export class PhysicsWorld {
  constructor({ gravity = -24, ground = 0, maxBodies = 160 } = {}) {
    this.gravity = gravity; this.ground = ground; this.bodies = []; this.statics = []; this.maxBodies = maxBodies; this.accumulator = 0; this.step = 1 / 90;
    this.onRemove = null; this.groundAt = null;
  }
  add(body) {
    // Oldest settled bodies make way when the scene is busy.
    while (this.bodies.length >= this.maxBodies) { const index = Math.max(0, this.bodies.findIndex(b => b.sleeping)); this.remove(this.bodies[index]); }
    this.bodies.push(body); return body;
  }
  remove(body) { const i = this.bodies.indexOf(body); if (i < 0) return; this.bodies.splice(i, 1); this.onRemove?.(body); }
  clear() { for (const body of [...this.bodies]) this.remove(body); this.statics = []; }
  setStatics(boxes) { this.statics = boxes.map(b => ({ min: b.min.clone(), max: b.max.clone(), id: b.id })); }
  removeStatic(id) { this.statics = this.statics.filter(s => s.id !== id); }
  groundHeight(x, z) { return this.groundAt ? this.groundAt(x, z) : this.ground; }
  update(dt) {
    this.accumulator = Math.min(this.accumulator + dt, this.step * 5);
    while (this.accumulator >= this.step) { this.integrate(this.step); this.accumulator -= this.step; }
    for (const body of [...this.bodies]) {
      body.age += dt;
      if (body.age > body.life) {
        // Settle into the earth rather than blinking out.
        body.sunk += dt * body.sink; body.sleeping = true;
        if (body.sunk > 1) { this.remove(body); continue; }
      }
      const o = body.object; if (!o) continue;
      o.position.copy(body.position); o.position.y -= body.sunk * body.radius * 1.6; o.quaternion.copy(body.quaternion);
    }
  }
  integrate(h) {
    const bodies = this.bodies;
    for (const b of bodies) {
      if (b.sleeping || b.invMass === 0) continue;
      b.velocity.y += this.gravity * h;
      b.velocity.multiplyScalar(1 - b.linearDamping * h * 10);
      b.angularVelocity.multiplyScalar(1 - b.angularDamping * h * 10);
      b.position.addScaledVector(b.velocity, h);
      const w = b.angularVelocity, angle = w.length() * h;
      if (angle > 1e-7) { _q.setFromAxisAngle(_a.copy(w).normalize(), angle); b.quaternion.premultiply(_q).normalize(); }
      b.updateInertia(); b.contact = false;
      if (b.shape === 'sphere') this.sphereGround(b); else this.boxGround(b);
      if (b.collide) for (const s of this.statics) this.sphereStatic(b, s);
    }
    // Pairwise bounding-sphere contacts (rubble piles up instead of interpenetrating).
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i]; if (!a.collide) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j]; if (!b.collide || (a.sleeping && b.sleeping)) continue;
        const ra = a.shape === 'sphere' ? a.radius : a.radius * 0.72, rb = b.shape === 'sphere' ? b.radius : b.radius * 0.72;
        _n.subVectors(b.position, a.position); const d = _n.length(), overlap = ra + rb - d;
        if (overlap <= 0 || d < 1e-6) continue;
        _n.divideScalar(d); const total = a.invMass + b.invMass; if (!total) continue;
        a.position.addScaledVector(_n, -overlap * a.invMass / total); b.position.addScaledVector(_n, overlap * b.invMass / total);
        const vn = _v.subVectors(b.velocity, a.velocity).dot(_n);
        if (vn < 0) { const jn = -(1 + Math.min(a.restitution, b.restitution)) * vn / total; a.velocity.addScaledVector(_n, -jn * a.invMass); b.velocity.addScaledVector(_n, jn * b.invMass); if (Math.abs(vn) > 0.6) { a.wake(); b.wake(); } }
      }
    }
    for (const b of bodies) {
      if (b.sleeping) continue;
      // Resting contact bleeds energy (rolling resistance, settling) so piles come to rest.
      if (b.contact) { const slow = b.velocity.lengthSq() < 1.5 && b.angularVelocity.lengthSq() < 6; const k = slow ? 0.9 : 0.985; b.velocity.x *= k; b.velocity.z *= k; b.angularVelocity.multiplyScalar(slow ? 0.88 : 0.97); }
      const calm = b.velocity.lengthSq() < 0.03 && b.angularVelocity.lengthSq() < 0.05 && b.contact;
      b.still = calm ? b.still + h : 0;
      if (b.still > 0.35) { b.sleeping = true; b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0); }
    }
  }
  sphereGround(b) {
    const floor = this.groundHeight(b.position.x, b.position.z), pen = floor + b.radius - b.position.y;
    if (pen <= 0) return;
    b.contact = true; b.position.y += pen;
    const point = _b.copy(b.position).addScaledVector(UP, -b.radius);
    this.contactImpulse(b, point, UP);
  }
  boxGround(b) {
    const floor = this.groundHeight(b.position.x, b.position.z); let deepest = 0; const touching = this._touching || (this._touching = []), pool = this._corners || (this._corners = CORNERS.map(() => new THREE.Vector3()));
    touching.length = 0;
    CORNERS.forEach((c, i) => {
      const p = pool[i].set(c.x * b.half.x, c.y * b.half.y, c.z * b.half.z).applyQuaternion(b.quaternion).add(b.position);
      const pen = floor - p.y; if (pen > 0) { touching.push(p); deepest = Math.max(deepest, pen); }
    });
    if (!touching.length) return;
    b.contact = true; b.position.y += deepest;
    for (const p of touching) p.y += deepest;
    // Sequential impulses over the contact manifold, a few sweeps to converge.
    for (let sweep = 0; sweep < 4; sweep++) for (const p of touching) this.contactImpulse(b, p, UP, 1, sweep > 0);
  }
  contactImpulse(b, point, normal, share = 1, inelastic = false) {
    const vp = b.pointVelocity(point, _v), vn = vp.dot(normal);
    if (vn >= 0) return;
    _r.subVectors(point, b.position);
    const k = (rn) => { _t.crossVectors(_r, rn).applyMatrix3(b.invInertiaWorld); _t.cross(_r); return b.invMass + rn.dot(_t); };
    const restitution = inelastic || Math.abs(vn) < 1.2 ? 0 : b.restitution;
    const jn = -(1 + restitution) * vn / k(normal) / share;
    b.velocity.addScaledVector(normal, jn * b.invMass);
    _t.crossVectors(_r, normal).applyMatrix3(b.invInertiaWorld).multiplyScalar(jn); b.angularVelocity.add(_t);
    // Coulomb friction along the sliding direction.
    const slip = _a.copy(b.pointVelocity(point, _v)); slip.addScaledVector(normal, -slip.dot(normal));
    const speed = slip.length(); if (speed < 1e-5) return;
    slip.divideScalar(speed); const jt = Math.min(speed / k(slip) / share, b.friction * jn);
    b.velocity.addScaledVector(slip, -jt * b.invMass);
    _t.crossVectors(_r, slip).applyMatrix3(b.invInertiaWorld).multiplyScalar(-jt); b.angularVelocity.add(_t);
  }
  sphereStatic(b, s) {
    const r = b.shape === 'sphere' ? b.radius : b.radius * 0.7, p = b.position;
    const cx = Math.max(s.min.x, Math.min(p.x, s.max.x)), cy = Math.max(s.min.y, Math.min(p.y, s.max.y)), cz = Math.max(s.min.z, Math.min(p.z, s.max.z));
    _n.set(p.x - cx, p.y - cy, p.z - cz); let d = _n.length();
    if (d >= r) return;
    if (d < 1e-6) { _n.set(0, 1, 0); d = 0; } else _n.divideScalar(d);
    p.addScaledVector(_n, r - d); b.contact = true;
    const vn = b.velocity.dot(_n); if (vn < 0) { b.velocity.addScaledVector(_n, -(1 + b.restitution) * vn); b.angularVelocity.multiplyScalar(0.8); }
  }
}

// Critically-damped-ish spring for squash, stretch and knockback offsets.
export class Spring {
  constructor(value = 0, stiffness = 180, damping = 12) { this.value = value; this.target = value; this.velocity = 0; this.stiffness = stiffness; this.damping = damping; }
  kick(v) { this.velocity += v; return this; }
  update(dt) {
    const steps = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / steps;
    for (let i = 0; i < steps; i++) { const a = (this.target - this.value) * this.stiffness - this.velocity * this.damping; this.velocity += a * h; this.value += this.velocity * h; }
    return this.value;
  }
  get settled() { return Math.abs(this.value - this.target) < 1e-3 && Math.abs(this.velocity) < 1e-3; }
}
export class Spring3 {
  constructor(stiffness = 90, damping = 11) { this.value = new THREE.Vector3(); this.velocity = new THREE.Vector3(); this.stiffness = stiffness; this.damping = damping; }
  kick(v) { this.velocity.add(v); return this; }
  update(dt) {
    const steps = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / steps;
    for (let i = 0; i < steps; i++) { _a.copy(this.value).multiplyScalar(-this.stiffness).addScaledVector(this.velocity, -this.damping); this.velocity.addScaledVector(_a, h); this.value.addScaledVector(this.velocity, h); }
    return this.value;
  }
}

// A verlet cloth strip (capes, pennants). Top row is pinned to anchors supplied each
// frame in world space; the rest hangs under gravity and wind and is kept outside a
// set of collision spheres (the wearer's torso and legs).
export class ClothStrip {
  constructor({ columns = 4, rows = 6, width = 0.6, length = 0.9, color = '#a33b2b', trim = '#e0b24a', iterations = 4, stiffness = 1 } = {}) {
    this.columns = columns; this.rows = rows; this.width = width; this.length = length; this.iterations = iterations; this.stiffness = stiffness;
    const count = columns * rows; this.pos = new Float32Array(count * 3); this.prev = new Float32Array(count * 3); this.ready = false;
    this.constraints = [];
    const idx = (c, r) => r * columns + c, sx = width / (columns - 1), sy = length / (rows - 1);
    for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
      if (c < columns - 1) this.constraints.push([idx(c, r), idx(c + 1, r), sx]);
      if (r < rows - 1) this.constraints.push([idx(c, r), idx(c, r + 1), sy]);
      if (c < columns - 1 && r < rows - 1) { const d = Math.hypot(sx, sy); this.constraints.push([idx(c, r), idx(c + 1, r + 1), d], [idx(c + 1, r), idx(c, r + 1), d]); }
    }
    const geometry = new THREE.BufferGeometry(), colors = new Float32Array(count * 3), base = new THREE.Color(color), edge = new THREE.Color(trim), uv = new Float32Array(count * 2), indices = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
      const i = idx(c, r), col = r === rows - 1 ? edge : base; colors.set([col.r, col.g, col.b], i * 3); uv.set([c / (columns - 1), r / (rows - 1)], i * 2);
      if (r < rows - 1 && c < columns - 1) indices.push(i, idx(c + 1, r), idx(c, r + 1), idx(c + 1, r), idx(c + 1, r + 1), idx(c, r + 1));
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage)); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geometry.setIndex(indices);
    this.mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.receiveShadow = true;
  }
  // anchorA/anchorB: world positions of the top corners. down: hang direction hint.
  update(dt, anchorA, anchorB, { spheres = [], wind = null, gravity = -9.8, down = null } = {}) {
    const { columns, rows, pos, prev } = this;
    if (!this.ready) {
      for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
        const t = c / (columns - 1), i = (r * columns + c) * 3; _a.lerpVectors(anchorA, anchorB, t); _a.y -= r * this.length / (rows - 1);
        if (down) _a.addScaledVector(down, r * 0.02);
        pos[i] = prev[i] = _a.x; pos[i + 1] = prev[i + 1] = _a.y; pos[i + 2] = prev[i + 2] = _a.z;
      }
      this.ready = true;
    }
    const h = Math.min(dt, 1 / 30), gy = gravity * h * h, drag = 0.985;
    for (let i = columns; i < columns * rows; i++) {
      const k = i * 3;
      for (let axis = 0; axis < 3; axis++) { const x = pos[k + axis], v = (x - prev[k + axis]) * drag; prev[k + axis] = x; pos[k + axis] = x + v + (axis === 1 ? gy : 0) + (wind ? wind.getComponent(axis) * h * h * (0.6 + 0.4 * Math.sin(i * 1.7 + performance.now() * 0.003)) : 0); }
    }
    for (let c = 0; c < columns; c++) { const t = c / (columns - 1), k = c * 3; _a.lerpVectors(anchorA, anchorB, t); pos[k] = prev[k] = _a.x; pos[k + 1] = prev[k + 1] = _a.y; pos[k + 2] = prev[k + 2] = _a.z; }
    for (let it = 0; it < this.iterations; it++) {
      for (const [ia, ib, rest] of this.constraints) {
        const a = ia * 3, b = ib * 3, dx = pos[b] - pos[a], dy = pos[b + 1] - pos[a + 1], dz = pos[b + 2] - pos[a + 2], d = Math.hypot(dx, dy, dz) || 1e-6;
        const diff = (d - rest) / d * 0.5 * this.stiffness, wa = ia < columns ? 0 : 1, wb = ib < columns ? 0 : 1, total = wa + wb; if (!total) continue;
        const fa = diff * 2 * wa / total, fb = diff * 2 * wb / total;
        pos[a] += dx * fa; pos[a + 1] += dy * fa; pos[a + 2] += dz * fa; pos[b] -= dx * fb; pos[b + 1] -= dy * fb; pos[b + 2] -= dz * fb;
      }
      for (const s of spheres) for (let i = columns; i < columns * rows; i++) {
        const k = i * 3, dx = pos[k] - s.center.x, dy = pos[k + 1] - s.center.y, dz = pos[k + 2] - s.center.z, d = Math.hypot(dx, dy, dz);
        if (d < s.radius && d > 1e-6) { const push = s.radius / d; pos[k] = s.center.x + dx * push; pos[k + 1] = s.center.y + dy * push; pos[k + 2] = s.center.z + dz * push; }
      }
      for (let i = columns; i < columns * rows; i++) { const k = i * 3 + 1; if (pos[k] < 0.02) pos[k] = 0.02; }
    }
    const g = this.mesh.geometry; g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
  }
  dispose() { this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.mesh.parent?.remove(this.mesh); }
}
