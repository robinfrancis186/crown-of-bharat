// Interface motion for Crown of Bharat: confetti and petal physics on a 2D canvas,
// the victory star sequence, count-ups, resources flying to the treasury, the
// battle curtain and tactile button ripples. Everything respects reduced motion.
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = t => 1 - Math.pow(1 - t, 3);

// Confetti, marigold petals and gold sparks with gravity, drag, flutter and 3D flip.
export class ConfettiField {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.parts = []; this.running = false; this.rain = 0;
    this.resize(); this.onResize = () => this.resize(); addEventListener('resize', this.onResize);
  }
  resize() { const d = Math.min(2, devicePixelRatio || 1); this.dpr = d; this.canvas.width = innerWidth * d; this.canvas.height = innerHeight * d; }
  burst(x, y, { count = 60, speed = 9, colors = ['#ffd46b', '#ff9d2e', '#fff1c2', '#ff6a8a'], spread = Math.PI * 2, angle = -Math.PI / 2, gravity = 0.32, kinds = ['spark', 'confetti'] } = {}) {
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread, v = speed * (0.35 + Math.random() * 0.8), kind = kinds[i % kinds.length];
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: gravity * (kind === 'spark' ? 0.6 : 1), drag: kind === 'spark' ? 0.965 : 0.975, life: 0, max: 60 + Math.random() * 60, size: kind === 'spark' ? 2 + Math.random() * 3 : 5 + Math.random() * 6, color: colors[i % colors.length], kind, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, flip: Math.random() * 6, vf: 0.15 + Math.random() * 0.2, sway: Math.random() * 6 });
    }
    this.start();
  }
  // Petals and confetti falling from the top edge for `seconds`.
  shower(seconds = 3, colors = ['#ffb000', '#ff8a00', '#ffd23f', '#e8325a', '#fff1c2', '#2fa39a']) { this.rain = seconds * 60; this.rainColors = colors; this.start(); }
  start() { if (this.running || reduced()) return; this.running = true; const tick = () => { if (!this.running) return; this.step(); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
  step() {
    const { ctx, dpr } = this, w = this.canvas.width / dpr, h = this.canvas.height / dpr;
    if (this.rain > 0) { this.rain--; for (let i = 0; i < 3; i++) this.parts.push({ x: Math.random() * w, y: -20, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2, g: 0.05, drag: 0.99, life: 0, max: 400, size: 6 + Math.random() * 7, color: this.rainColors[Math.floor(Math.random() * this.rainColors.length)], kind: Math.random() < 0.5 ? 'petal' : 'confetti', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.12, flip: Math.random() * 6, vf: 0.08 + Math.random() * 0.12, sway: Math.random() * 6 }); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    this.parts = this.parts.filter(p => p.life < p.max && p.y < h + 40);
    for (const p of this.parts) {
      p.life++; p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag;
      if (p.kind !== 'spark') { p.vx += Math.sin(p.life * 0.08 + p.sway) * 0.08; p.vy = Math.min(p.vy, p.kind === 'petal' ? 2.2 : 3.2); }
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.flip += p.vf;
      const fade = Math.min(1, (p.max - p.life) / 25);
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.kind === 'spark') { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2.5); g.addColorStop(0, '#fff'); g.addColorStop(0.3, p.color); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, p.size * 2.5, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.scale(1, Math.cos(p.flip)); ctx.fillStyle = p.color; if (p.kind === 'petal') { ctx.beginPath(); ctx.ellipse(0, 0, p.size * 0.55, p.size, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff33'; ctx.beginPath(); ctx.ellipse(-p.size * 0.15, -p.size * 0.2, p.size * 0.2, p.size * 0.5, 0, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6); }
      ctx.restore();
    }
    if (!this.parts.length && this.rain <= 0) { this.running = false; ctx.clearRect(0, 0, w, h); }
  }
  dispose() { this.running = false; this.parts = []; removeEventListener('resize', this.onResize); }
}

export function countUp(el, to, { duration = 1200, delay = 0, format = n => Math.round(n).toLocaleString('en-IN') } = {}) {
  if (!el) return; if (reduced()) { el.textContent = format(to); return; }
  const start = performance.now() + delay; el.textContent = format(0);
  const tick = now => { const t = Math.max(0, Math.min(1, (now - start) / duration)); el.textContent = format(to * ease(t)); if (t < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

// Reveal earned stars one by one; each lands with a flash and a spark burst.
export function starSequence(root, earned, { confetti, onStar, startDelay = 650, gap = 560 } = {}) {
  const slots = [...root.querySelectorAll('.star-slot')], timers = [];
  slots.forEach((slot, i) => {
    timers.push(setTimeout(() => {
      if (i < earned) {
        slot.classList.add('earned'); onStar?.(i);
        const r = slot.getBoundingClientRect();
        confetti?.burst(r.left + r.width / 2, r.top + r.height / 2, { count: i === 1 ? 70 : 46, speed: i === 1 ? 11 : 8, kinds: ['spark', 'spark', 'confetti'] });
        root.querySelector('.result-card')?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(5px) scale(1.01)' }, { transform: 'translateY(0)' }], { duration: 220, easing: 'ease-out' });
      } else slot.classList.add('missed');
    }, reduced() ? 0 : startDelay + i * gap));
  });
  return () => timers.forEach(clearTimeout);
}

// Coins, grain, timber and ore arc from the building to their treasury chip.
export function flyToHud(from, key, amount, iconHtml) {
  const target = document.querySelector(`.resource-${key}`); if (!target || reduced() || !Number.isFinite(from?.x)) return;
  const to = target.getBoundingClientRect(), tx = to.left + to.width - 22, ty = to.top + to.height / 2, n = Math.min(7, 2 + Math.floor(Math.log2(Math.max(1, amount))));
  for (let i = 0; i < n; i++) {
    const el = document.createElement('span'); el.className = 'cob-flyer'; el.innerHTML = iconHtml || ''; document.body.append(el);
    const sx = from.x + (Math.random() - 0.5) * 40, sy = from.y + (Math.random() - 0.5) * 30, cx = (sx + tx) / 2 + (Math.random() - 0.5) * 160, cy = Math.min(sy, ty) - 80 - Math.random() * 90;
    const frames = []; for (let k = 0; k <= 12; k++) { const t = k / 12, u = 1 - t; frames.push({ transform: `translate(${u * u * sx + 2 * u * t * cx + t * t * tx - 13}px, ${u * u * sy + 2 * u * t * cy + t * t * ty - 13}px) scale(${1.2 - t * 0.5})`, opacity: t > 0.92 ? 0 : 1 }); }
    const anim = el.animate(frames, { duration: 700 + i * 70, delay: i * 55, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'both' });
    anim.onfinish = () => { el.remove(); if (i === n - 1) target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)', filter: 'brightness(1.5)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' }); };
  }
  const label = document.createElement('span'); label.className = 'cob-float-text'; label.textContent = `+${Math.floor(amount).toLocaleString('en-IN')}`; label.style.left = `${from.x}px`; label.style.top = `${from.y - 20}px`; document.body.append(label); setTimeout(() => label.remove(), 1200);
}

// Ornamental jharokha doors part to open a battle or return home.
export function curtain(title, subtitle = '') {
  if (reduced()) return;
  document.querySelector('.cob-curtain')?.remove();
  const el = document.createElement('div'); el.className = 'cob-curtain';
  el.innerHTML = `<div class="half left"></div><div class="half right"></div><div class="title"><small>${subtitle}</small><strong>${title}</strong></div>`;
  document.body.append(el); setTimeout(() => el.remove(), 1500);
}

// A star swoops from the battlefield centre into the score slot.
export function flyStar(index) {
  if (reduced()) return;
  const slot = document.querySelectorAll('.battle-score .stars .icon')[index]; if (!slot) return;
  const r = slot.getBoundingClientRect(), el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', '0 0 24 24'); el.classList.add('cob-flystar');
  el.innerHTML = '<defs><linearGradient id="cobFlyGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4c2"/><stop offset=".5" stop-color="#ffcf4d"/><stop offset="1" stop-color="#e0901e"/></linearGradient></defs><path d="m12 2 3 6.5 7 .9-5.1 5 .9 7-5.8-3.3-5.8 3.3.9-7-5.1-5 7-.9L12 2Z" fill="url(#cobFlyGold)" stroke="#fff6d6" stroke-width=".6"/>';
  document.body.append(el);
  const sx = innerWidth / 2 - 60, sy = innerHeight / 2 - 60, tx = r.left + r.width / 2 - 60, ty = r.top + r.height / 2 - 60;
  el.animate([{ transform: `translate(${sx}px,${sy}px) scale(.2) rotate(-90deg)`, opacity: 0 }, { transform: `translate(${sx}px,${sy - 20}px) scale(1.25) rotate(10deg)`, opacity: 1, offset: 0.3 }, { transform: `translate(${sx}px,${sy - 10}px) scale(1) rotate(0)`, opacity: 1, offset: 0.5 }, { transform: `translate(${tx}px,${ty}px) scale(.18) rotate(180deg)`, opacity: 1 }], { duration: 1150, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).onfinish = () => {
    el.remove(); slot.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.9)', filter: 'drop-shadow(0 0 10px #ffcf4d)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  };
}

// Tactile ripples on every interface button.
export function enableRipples(root) {
  root.addEventListener('pointerdown', event => {
    const target = event.target.closest('.button, .icon-button, .campaign-button, .army-button, .build-button, .troop-card, .spell-button, .panel-nav button, .catalog-tab');
    if (!target || target.disabled || reduced()) return;
    const r = target.getBoundingClientRect(), size = Math.max(r.width, r.height), dot = document.createElement('span');
    dot.className = 'cob-ripple'; dot.style.width = dot.style.height = `${size}px`; dot.style.left = `${event.clientX - r.left - size / 2}px`; dot.style.top = `${event.clientY - r.top - size / 2}px`;
    if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
    target.append(dot); setTimeout(() => dot.remove(), 600);
  }, { passive: true });
}
