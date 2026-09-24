import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// A warm "monsoon afternoon" grade: gentle saturation, lifted warm shadows, a soft
// vignette and a flash channel used by lightning and victories. Runs in linear HDR
// before tone mapping, so it composes cleanly with ACES in the output pass.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uVignette: { value: 0.32 }, uSaturation: { value: 1.12 }, uContrast: { value: 1.07 }, uWarmth: { value: 0.035 }, uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color('#ffffff') }, uAspect: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uVignette; uniform float uSaturation; uniform float uContrast; uniform float uWarmth; uniform float uFlash; uniform vec3 uFlashColor; uniform float uAspect; varying vec2 vUv;
    void main(){
      vec4 c=texture2D(tDiffuse,vUv);
      float l=dot(c.rgb,vec3(0.2126,0.7152,0.0722));
      c.rgb=mix(vec3(l),c.rgb,uSaturation);
      c.rgb=max(vec3(0.0),(c.rgb-0.18)*uContrast+0.18);
      c.rgb+=vec3(uWarmth,uWarmth*0.45,-uWarmth*0.4)*(1.0-smoothstep(0.0,0.6,l));
      vec2 d=(vUv-0.5)*vec2(uAspect,1.0); float v=smoothstep(0.35,1.05,length(d)*1.05);
      c.rgb*=1.0-v*uVignette;
      c.rgb+=uFlashColor*uFlash;
      gl_FragColor=c;
    }`,
};

export class PostFX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer; this.scene = scene; this.camera = camera; this.enabled = false; this.flash = 0;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, this.target);
    this.renderPass = new RenderPass(scene, camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.32, 0.5, 0.92);
    this.grade = new ShaderPass(GradeShader);
    this.output = new OutputPass();
    for (const pass of [this.renderPass, this.bloom, this.grade, this.output]) this.composer.addPass(pass);
  }
  configure(quality) {
    this.enabled = quality !== 'low';
    this.bloom.enabled = quality !== 'low';
    this.bloom.strength = quality === 'ultra' ? 0.38 : 0.3;
    this.resize();
  }
  resize() {
    const ratio = this.renderer.getPixelRatio();
    this.composer.setPixelRatio(ratio); this.composer.setSize(innerWidth, innerHeight);
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.bloom.setSize(Math.round(size.x / 2), Math.round(size.y / 2));
    this.grade.uniforms.uAspect.value = innerWidth / Math.max(1, innerHeight);
  }
  pulse(amount, color = '#ffffff') { this.flash = Math.min(1.2, this.flash + amount); this.grade.uniforms.uFlashColor.value.set(color); }
  render(dt) {
    this.flash = Math.max(0, this.flash - dt * 3.2);
    if (!this.enabled) { this.renderer.render(this.scene, this.camera); return; }
    this.grade.uniforms.uFlash.value = this.flash * this.flash * 0.6;
    this.composer.render(dt);
  }
  dispose() { this.composer.dispose(); this.target.dispose(); }
}
