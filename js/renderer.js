/* ============================================================
   AKARI MART / 雨夜 DIORAMA — WebGL renderer
   - custom WebGL1 forward renderer (no dependencies)
   - real-time planar reflection for the wet street
   - bloom post chain + vignette/grain
   - orbit camera, per-scene views, cinematic tour, deterministic film mode
   ============================================================ */
(function (global) {
  'use strict';

  const DIO = global.DIO;
  const G = DIO.G;
  const M4 = G.M4;

  const canvas = document.getElementById('stage');
  const stageWrap = document.getElementById('stageWrap') || document.body;
  const app = DIO.app = {};
  const state = { time: 0, dt: 0 };

  function fail(html) {
    const boot = document.getElementById('boot');
    if (boot) boot.classList.add('is-done');
    const err = document.createElement('div');
    err.className = 'fatal';
    err.innerHTML = html;
    document.body.appendChild(err);
  }

  const gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: true, stencil: false,
    premultipliedAlpha: false, preserveDrawingBuffer: true,
    powerPreference: 'high-performance'
  });
  if (!gl) {
    fail('<b>WEBGL UNAVAILABLE</b><br>当前浏览器未启用 WebGL，请使用新版 Chrome / Edge 并开启硬件加速。');
    return;
  }

  DIO.useUint32 = !!gl.getExtension('OES_element_index_uint');
  const anisoExt = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  const maxAniso = anisoExt ? gl.getParameter(anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1;

  /* ---------------------------------------------------------- *
   * shaders
   * ---------------------------------------------------------- */
  const MESH_VS = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUv;
uniform mat4 uModel;
uniform mat4 uViewProj;
uniform mat3 uNormalMat;
uniform float uBillboard;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  vec4 wp = uModel * vec4(aPosition, 1.0);
  if (uBillboard > 0.5) {
    // aNormal carries the card's world centre for merged billboard batches
    vec3 c = aNormal;
    float sx = length(uModel[0].xyz);
    float sy = length(uModel[1].xyz);
    vec3 off = (aPosition - c) * vec3(sx, sy, 1.0);
    wp = vec4(c + uCamRight * off.x + uCamUp * off.y, 1.0);
  }
  vWorld = wp.xyz;
  vNormal = normalize(uNormalMat * aNormal);
  vUv = aUv;
  gl_Position = uViewProj * wp;
}`;

  const MESH_FS = `
precision highp float;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec2 vUv;
uniform vec3 uColor;
uniform vec3 uEmissive;
uniform vec3 uEye;
uniform vec3 uKeyDir;
uniform vec3 uFillDir;
uniform vec3 uKeyColor;
uniform vec3 uFillColor;
uniform vec3 uAmbient;
uniform vec3 uRimColor;
uniform vec3 uFogColor;
uniform float uAlpha;
uniform float uSpec;
uniform float uEmissiveStrength;
uniform float uUnlit;
uniform float uRadial;
uniform float uHasTex;
uniform float uTexAlpha;
uniform float uRimStrength;
uniform float uFogNear;
uniform float uFogFar;
uniform float uBillboard;
uniform sampler2D uTex;
void main() {
  vec4 tex = vec4(1.0);
  if (uHasTex > 0.5) tex = texture2D(uTex, vUv);
  if (uTexAlpha > 0.5 && tex.a < 0.02) discard;
  vec3 base = uColor * tex.rgb;
  float alpha = uAlpha * (uTexAlpha > 0.5 ? tex.a : 1.0);
  if (uRadial > 0.5) {
    float d = length(vUv * 2.0 - 1.0);
    alpha *= pow(max(1.0 - smoothstep(0.0, 1.0, d), 0.0), 1.6);
  }
  if (alpha < 0.004) discard;
  vec3 N = normalize(vNormal);
  if (uBillboard > 0.5) N = normalize(uEye - vWorld);
  if (uUnlit > 0.5) {
    vec3 ucol = base + uEmissive * uEmissiveStrength;
    ucol = ucol / (ucol + 0.9) * 1.72;
    gl_FragColor = vec4(ucol, alpha);
    return;
  }
  vec3 V = normalize(uEye - vWorld);
  float key = max(dot(N, uKeyDir), 0.0);
  float fill = max(dot(N, uFillDir), 0.0);
  float sky = 0.5 + 0.5 * N.y;
  vec3 amb = uAmbient * (0.6 + 0.4 * sky);
  vec3 H = normalize(uKeyDir + V);
  float spec = pow(max(dot(N, H), 0.0), 44.0) * uSpec;
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * uRimStrength;
  vec3 col = base * (amb + uKeyColor * key + uFillColor * fill);
  col += uRimColor * rim;
  col += vec3(spec) * (uKeyColor + vec3(0.25));
  col += uEmissive * uEmissiveStrength;
  col = col / (col + 0.82) * 1.62;
  float fog = smoothstep(uFogNear, uFogFar, length(uEye - vWorld));
  col = mix(col, uFogColor, fog);
  gl_FragColor = vec4(col, alpha);
}`;

  const SKY_VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  const SKY_FS = `
precision highp float;
varying vec2 vUv;
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uBot;
uniform vec3 uGlowACol;
uniform vec3 uGlowBCol;
uniform vec3 uHazeColor;
uniform vec3 uCloudColor;
uniform vec2 uGlowAPos;
uniform vec2 uGlowBPos;
uniform float uGlowASize;
uniform float uGlowBSize;
uniform float uHaze;
uniform float uStars;
uniform float uClouds;
uniform float uTime;
uniform float uAspect;
uniform float uExposure;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise2(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}
void main() {
  vec2 uv = vUv;
  vec3 col = mix(uBot, uMid, smoothstep(0.0, 0.5, uv.y));
  col = mix(col, uTop, smoothstep(0.32, 1.0, uv.y));

  vec2 pa = (uv - uGlowAPos) * vec2(uAspect, 1.0);
  col += uGlowACol * exp(-dot(pa, pa) / max(uGlowASize * uGlowASize, 0.0001));
  vec2 pb = (uv - uGlowBPos) * vec2(uAspect, 1.0);
  col += uGlowBCol * exp(-dot(pb, pb) / max(uGlowBSize * uGlowBSize, 0.0001));

  float haze = exp(-pow((uv.y - 0.535) * 6.5, 2.0));
  col += uHazeColor * haze * uHaze;

  if (uClouds > 0.001) {
    float n = fbm(vec2(uv.x * 2.4 * uAspect + uTime * 0.006, uv.y * 2.6 - uTime * 0.002));
    float band = smoothstep(0.45, 0.95, n) * (1.0 - smoothstep(0.55, 0.92, uv.y));
    col = mix(col, uCloudColor, band * uClouds);
    float streak = fbm(vec2(uv.x * 6.0 * uAspect - uTime * 0.01, uv.y * 3.4)) ;
    col += vec3(0.05, 0.07, 0.12) * smoothstep(0.55, 0.95, streak) * uClouds * 0.5;
  }

  if (uStars > 0.001) {
    vec2 sp = uv * vec2(240.0 * uAspect, 240.0);
    vec2 cell = floor(sp);
    vec2 f = fract(sp) - 0.5;
    float h = hash12(cell);
    float star = smoothstep(0.055, 0.0, length(f)) * step(0.986, h);
    float tw = 0.65 + 0.35 * sin(uTime * 1.7 + h * 44.0);
    col += vec3(0.75, 0.82, 1.0) * star * uStars * tw * smoothstep(0.52, 0.95, uv.y);
  }

  float vig = 1.0 - smoothstep(0.32, 1.05, length((uv - 0.5) * vec2(uAspect * 0.78, 1.0)));
  col *= mix(0.55, 1.03, vig);
  col *= uExposure;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  const GROUND_VS = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUv;
uniform mat4 uModel;
uniform mat4 uViewProj;
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  vec4 wp = uModel * vec4(aPosition, 1.0);
  vWorld = wp.xyz;
  vUv = aUv;
  gl_Position = uViewProj * wp;
}`;

  const GROUND_FS = `
precision highp float;
varying vec3 vWorld;
varying vec2 vUv;
uniform sampler2D uRefl;
uniform vec3 uBase;
uniform vec3 uPuddle;
uniform vec3 uTint;
uniform vec3 uEye;
uniform vec2 uRes;
uniform float uWet;
uniform float uReflStrength;
uniform float uTime;
uniform float uRain;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise2(p);
    p *= 2.07;
    a *= 0.5;
  }
  return v;
}
vec3 tonemap(vec3 c) {
  return c / (c + 0.82) * 1.62;
}
void main() {
  vec2 w = vWorld.xz;
  vec3 toEye = uEye - vWorld;
  float dist = length(toEye);
  float detailFade = 1.0 - smoothstep(9.0, 44.0, dist) * 0.75;

  float grain = noise2(w * 2.2) * detailFade;
  float broad = fbm(w * 0.17 + 11.3);
  float mid = fbm(w * 0.55 + 3.7);
  float puddleField = broad * 0.72 + mid * 0.28;
  float puddle = smoothstep(0.40, 0.58, puddleField) * uWet;

  // asphalt body, darker and cooler where wet
  vec3 base = uBase * (0.92 + 0.16 * grain);
  base = mix(base, uPuddle, puddle * 0.6);
  float edge = smoothstep(0.40, 0.45, puddleField) * (1.0 - smoothstep(0.52, 0.62, puddleField));
  base *= 1.0 - edge * 0.22 * uWet;

  // puddle ripples: concentric expanding rings, very subtle
  float ripple = 0.5 + 0.5 * sin(length(fract(w * 1.3) - 0.5) * 28.0 - uTime * 7.0);
  vec2 dn = vec2(
    fbm(w * 0.85 + vec2(uTime * 0.16, 3.1)),
    fbm(w * 0.85 + vec2(7.7, -uTime * 0.14))
  ) - 0.5;
  float motion = 1.0 - smoothstep(14.0, 52.0, dist) * 0.55;
  vec2 suv = gl_FragCoord.xy / uRes;
  vec2 distort = dn * (0.0018 + 0.0032 * puddle) * (0.55 + 0.45 * ripple) * motion;
  vec2 ruv = suv + distort;
  // widen the reflection a little: wet asphalt is never a perfect mirror
  vec2 rpx = vec2(1.0 / uRes.x, 1.0 / uRes.y) * (2.0 + 2.5 * puddle);
  vec3 refl = texture2D(uRefl, ruv).rgb * 0.5;
  refl += texture2D(uRefl, ruv + vec2(rpx.x, 0.0)).rgb * 0.167;
  refl += texture2D(uRefl, ruv - vec2(rpx.x, 0.0)).rgb * 0.167;
  refl += texture2D(uRefl, ruv + vec2(0.0, rpx.y)).rgb * 0.166;

  // grazing-angle sheen
  float upness = clamp(toEye.y / max(dist, 0.001), 0.0, 1.0);
  float fres = pow(1.0 - upness, 2.0);
  float gloss = (0.10 + 0.90 * fres) * uWet;
  float wetMix = clamp(puddle * 0.95 + (1.0 - puddle) * gloss * 0.55, 0.0, 1.0) * uReflStrength;
  wetMix *= 1.0 - smoothstep(36.0, 78.0, dist) * 0.45;
  vec3 col = mix(base, refl * uTint, clamp(wetMix, 0.0, 1.0));
  col += uTint * 0.05 * gloss * (0.35 + 0.65 * ripple) * (0.4 + 0.6 * uRain);

  col = tonemap(col);
  gl_FragColor = vec4(col, 1.0);
}`;

  const QUAD_VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  const DEBUG_FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uScale;
void main() {
  gl_FragColor = vec4(texture2D(uTex, vUv * uScale).rgb, 1.0);
}`;

  const BRIGHT_FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uThreshold;
uniform float uKnee;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb;
  float l = max(max(c.r, c.g), c.b);
  float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 0.0001);
  float k = max(soft, l - uThreshold) / max(l, 0.0001);
  gl_FragColor = vec4(c * k, 1.0);
}`;

  const BLUR_FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDir;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb * 0.227027;
  c += texture2D(uTex, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(uTex, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(uTex, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
  c += texture2D(uTex, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}`;

  const COMPOSITE_FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uVignette;
uniform float uGrain;
uniform float uTime;
uniform float uAspect;
uniform float uExposure;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  vec2 uv = vUv;
  // very slight chromatic fringe toward the frame edges
  vec2 dir = (uv - 0.5);
  float fringe = dot(dir, dir) * 0.0035;
  vec3 col;
  col.r = texture2D(uScene, uv + dir * fringe).r;
  col.g = texture2D(uScene, uv).g;
  col.b = texture2D(uScene, uv - dir * fringe).b;

  vec3 bloom = texture2D(uBloom, uv).rgb;
  col += bloom * uBloomStrength;
  col *= uExposure;

  // filmic shoulder
  col = col / (col + 0.92) * 1.66;

  // gentle grade: a touch of contrast and saturation so the neon reads
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, 1.07);
  col = clamp((col - 0.5) * 1.035 + 0.5, 0.0, 1.0);

  float vig = smoothstep(1.16, 0.28, length((uv - 0.5) * vec2(uAspect * 0.62, 1.0)) * 1.45);
  col *= mix(1.0, vig, uVignette);

  float g = hash12(uv * vec2(1920.0, 1080.0) + fract(uTime) * 91.7);
  col += (g - 0.5) * uGrain;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error('shader: ' + gl.getShaderInfoLog(sh));
    }
    return sh;
  }
  function program(vsSrc, fsSrc) {
    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      const name = info.name.replace(/\[0\]$/, '');
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p: p, u: u };
  }

  let prog = null;
  try {
    prog = {
      mesh: program(MESH_VS, MESH_FS),
      sky: program(SKY_VS, SKY_FS),
      ground: program(GROUND_VS, GROUND_FS),
      bright: program(QUAD_VS, BRIGHT_FS),
      blur: program(QUAD_VS, BLUR_FS),
      composite: program(QUAD_VS, COMPOSITE_FS),
      debug: program(QUAD_VS, DEBUG_FS)
    };
  } catch (err) {
    fail('<b>RENDERER ERROR</b><br>' + String(err.message || err).replace(/</g, '&lt;'));
    console.error(err);
    return;
  }

  /* ---------------------------------------------------------- *
   * fullscreen quad
   * ---------------------------------------------------------- */
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  function drawQuad(p) {
    gl.useProgram(p.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    const loc = gl.getAttribLocation(p.p, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(loc);
  }

  /* ---------------------------------------------------------- *
   * render targets
   * ---------------------------------------------------------- */
  function makeTexture(w, h, filter) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }
  function makeTarget(w, h, filter, withDepth) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    const tex = makeTexture(w, h, filter);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    let depth = null;
    if (withDepth) {
      // prefer a 24-bit depth buffer when the driver accepts it (less z-fighting on decals)
      depth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, null);
        gl.deleteRenderbuffer(depth);
        depth = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
      }
    }
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb: fb, tex: tex, depth: depth, w: w, h: h, ok: ok };
  }
  function freeTarget(t) {
    if (!t) return;
    gl.deleteFramebuffer(t.fb);
    gl.deleteTexture(t.tex);
    if (t.depth) gl.deleteRenderbuffer(t.depth);
  }

  const targets = { scene: null, refl: null, bloomA: null, bloomB: null };
  let viewW = 1, viewH = 1, dpr = 1, renderScale = 1;

  /* ---------------------------------------------------------- *
   * scene preparation
   * ---------------------------------------------------------- */
  const DEG = Math.PI / 180;

  function envDefaults() {
    return {
      sky: {
        top: '#070b16', mid: '#111a30', bot: '#243049',
        glowAPos: [0.5, 0.42], glowACol: '#16233c', glowASize: 0.52,
        glowBPos: [0.78, 0.18], glowBCol: '#1d1410', glowBSize: 0.34,
        haze: 0.45, hazeColor: '#2b3a58', stars: 0.0, clouds: 0.0,
        cloudColor: '#0d1220', exposure: 1.0
      },
      key: { dir: [0.42, 0.82, 0.38], color: '#4f6a9c' },
      fill: { dir: [-0.6, 0.25, 0.75], color: '#8a5a3a' },
      ambient: '#1b2438',
      rim: { color: '#7d9ad0', strength: 0.45 },
      fog: { near: 45, far: 130, color: '#0b1220' },
      ground: {
        size: [46, 34], center: [0, 0], y: 0,
        color: '#1a1d26', puddle: '#0a0e16', tint: '#c9d4e8',
        wet: 0.85, reflect: 0.8
      },
      reflection: 0.9,
      bloom: 0.85,
      bloomThreshold: 0.66,
      exposure: 1.0,
      grain: 0.028,
      vignette: 0.9
    };
  }
  function mergeEnv(e) {
    const d = envDefaults();
    e = e || {};
    const out = {};
    for (const k of Object.keys(d)) {
      if (k === 'sky' || k === 'key' || k === 'fill' || k === 'fog' || k === 'ground' || k === 'rim') {
        out[k] = Object.assign({}, d[k], e[k] || {});
      } else {
        out[k] = e[k] === undefined ? d[k] : e[k];
      }
    }
    return out;
  }

  function vec3(v) { return G.rgb(v || '#000000'); }

  /* deep-merge two partial env objects (registration env + build-returned env) */
  function mergeEnvSources(a, b) {
    a = a || {}; b = b || {};
    const out = {};
    const keys = {};
    for (const k in a) keys[k] = 1;
    for (const k in b) keys[k] = 1;
    for (const k in keys) {
      const va = a[k], vb = b[k];
      if (va && vb && typeof va === 'object' && typeof vb === 'object' && !Array.isArray(va)) {
        out[k] = Object.assign({}, va, vb);
      } else {
        out[k] = vb === undefined ? va : vb;
      }
    }
    return out;
  }

  function uploadAtlas(canvasEl) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvasEl);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (anisoExt && maxAniso > 1) gl.texParameterf(gl.TEXTURE_2D, anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, maxAniso));
    return tex;
  }

  function uploadGeometry(geo) {
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.DYNAMIC_DRAW);
    const nbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
    gl.bufferData(gl.ARRAY_BUFFER, geo.normals, gl.STATIC_DRAW);
    const ubo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ubo);
    gl.bufferData(gl.ARRAY_BUFFER, geo.uvs || new Float32Array(geo.positions.length / 3 * 2), gl.STATIC_DRAW);
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);
    return {
      vbo: vbo, nbo: nbo, ubo: ubo, ibo: ibo,
      count: geo.count,
      mode: geo.mode === 'lines' ? gl.LINES : gl.TRIANGLES,
      indexType: geo.indexType === 'uint32' ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
      dynamic: !!geo.dynamic,
      source: geo
    };
  }

  function boundsOf(geo) {
    const p = geo.positions;
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < p.length; i += 3) {
      if (p[i] < minX) minX = p[i];
      if (p[i] > maxX) maxX = p[i];
      if (p[i + 1] < minY) minY = p[i + 1];
      if (p[i + 1] > maxY) maxY = p[i + 1];
      if (p[i + 2] < minZ) minZ = p[i + 2];
      if (p[i + 2] > maxZ) maxZ = p[i + 2];
    }
    return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
  }

  function prepareScene(def) {
    const atlas = def.atlas || null;
    let canvasEl = null;
    if (atlas) {
      try { canvasEl = atlas.build(); } catch (e) { console.error('atlas build failed for ' + def.id, e); }
    }
    const atlasTex = canvasEl ? uploadAtlas(canvasEl) : null;
    const api = {
      G: G, DIO: DIO, Atlas: DIO.Atlas, Batch: DIO.Batch,
      mat: DIO.mat, rgb: DIO.rgb || G.rgb, node: DIO.node,
      atlas: atlas, tex: atlasTex,
      scene: def
    };
    let built;
    try {
      built = def.build(api) || {};
    } catch (e) {
      console.error('scene build failed: ' + def.id, e);
      built = { root: DIO.node('empty') };
    }
    const root = built.root || DIO.node('root');
    const meshes = [];
    const lists = { opaque: [], trans: [], additive: [] };
    (function walk(node, excluded) {
      const ex = excluded || !!node.excludeReflect;
      for (const m of node.meshes) {
        m.gpu = uploadGeometry(m.geometry);
        m.bounds = boundsOf(m.geometry);
        m.sceneId = def.id;
        m.texScene = atlasTex;
        m.noReflect = ex;
        meshes.push(m);
        const mt = m.material;
        if (mt.additive) lists.additive.push(m);
        else if (mt.alpha < 0.995) lists.trans.push(m);
        else lists.opaque.push(m);
      }
      for (const c of node.children) walk(c, ex);
    })(root, false);
    const env = mergeEnv(mergeEnvSources(def.env, built.env));
    let ground = null;
    if (env.ground && built.ground !== false) {
      const g = env.ground;
      const w = g.size[0], d = g.size[1];
      const cx = g.center ? g.center[0] : 0;
      const cz = g.center ? g.center[1] : 0;
      const y = g.y || 0;
      const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
      const b = new G.Builder();
      b.quadN([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0]);
      const geo = b.build();
      ground = { gpu: uploadGeometry(geo), geo: geo, env: g };
    }
    return {
      def: def, id: def.id, root: root, meshes: meshes, lists: lists,
      env: env, atlas: atlas, atlasTex: atlasTex, ground: ground,
      update: typeof built.update === 'function' ? built.update : function () {},
      onParam: typeof built.onParam === 'function' ? built.onParam : null,
      views: built.views || def.views || [],
      title: def.title || def.id,
      subtitle: def.subtitle || '',
      params: def.params || []
    };
  }

  const scenes = [];
  const sceneMap = {};
  function buildAllScenes() {
    for (const def of DIO.scenes) {
      const s = prepareScene(def);
      scenes.push(s);
      sceneMap[s.id] = s;
    }
    if (!scenes.length) throw new Error('no scenes registered');
  }
  try {
    buildAllScenes();
  } catch (e) {
    fail('<b>SCENE ERROR</b><br>' + String(e.message || e).replace(/</g, '&lt;'));
    console.error(e);
    return;
  }

  function totalTris() {
    let n = 0;
    for (const s of scenes) for (const m of s.meshes) n += m.geometry.count / 3;
    return Math.round(n);
  }
  app.stats = { triangles: totalTris(), scenes: scenes.map(s => s.id) };

  /* ---------------------------------------------------------- *
   * camera / state
   * ---------------------------------------------------------- */
  const cam = {
    az: 0.9, el: 0.42, radius: 42,
    azT: 0.9, elT: 0.42, radiusT: 42,
    target: [0, 3.0, 0], targetT: [0, 3.0, 0]
  };
  function viewOf(scene, index) {
    const v = scene.views[index] || scene.views[0] || { az: 0.9, el: 0.42, radius: 42, target: [0, 3, 0] };
    return v;
  }
  function applyView(v, instant) {
    cam.azT = v.az; cam.elT = v.el; cam.radiusT = v.radius;
    if (v.target) cam.targetT = v.target.slice();
    if (instant) {
      cam.az = cam.azT; cam.el = cam.elT; cam.radius = cam.radiusT;
      cam.target = cam.targetT.slice();
    }
  }

  const S = {
    time: 0,
    sceneId: null,
    viewIndex: 0,
    autoRotate: false,
    tour: false,
    tourTime: 0,
    ui: true,
    film: false,
    paused: false,
    onlyScene: null,
    rainAmount: 1,
    reflDebug: false
  };
  app.state = S;

  function activeScene() { return sceneMap[S.sceneId] || scenes[0]; }

  /* orbit controls */
  let drag = null, lastX = 0, lastY = 0, pinch = 0;
  const pointers = new Map();

  function isUiTarget(e) {
    return e.target && e.target.closest && e.target.closest('.panel, .topbar, .viewbar, .hint');
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (S.film) return;
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      drag = e.pointerId; lastX = e.clientX; lastY = e.clientY;
      canvas.classList.add('is-dragging');
      if (S.tour) stopTour(true);
    } else if (pointers.size === 2) {
      const p = Array.from(pointers.values());
      pinch = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const p = Array.from(pointers.values());
      const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (pinch > 0) cam.radiusT = DIO.clamp(cam.radiusT * (pinch / d), 12, 78);
      pinch = d;
      return;
    }
    if (drag !== e.pointerId) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    cam.azT -= dx * 0.0055;
    cam.elT = DIO.clamp(cam.elT + dy * 0.0032, 0.06, 1.15);
    S.viewIndex = -1;
    emit('view');
  });
  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = 0;
    if (drag === e.pointerId) {
      drag = null;
      canvas.classList.remove('is-dragging');
    }
    if (pointers.size === 1) {
      const k = Array.from(pointers.keys())[0];
      const v = pointers.get(k);
      drag = k; lastX = v.x; lastY = v.y;
    }
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) {
    canvas.addEventListener(ev, endPointer);
  });
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    if (S.film) return;
    cam.radiusT = DIO.clamp(cam.radiusT * (1 + e.deltaY * 0.0011), 12, 78);
  }, { passive: false });
  canvas.addEventListener('dblclick', function () {
    if (S.film) return;
    setView(0);
  });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* ---------------------------------------------------------- *
   * UI events out
   * ---------------------------------------------------------- */
  function emit(name, detail) {
    global.dispatchEvent(new CustomEvent('dio:' + name, { detail: detail || {} }));
  }

  /* ---------------------------------------------------------- *
   * tour timeline
   * ---------------------------------------------------------- */
  let tour = null;
  function buildTour() {
    const shots = [];
    const list = S.onlyScene ? scenes.filter(function (s) { return s.id === S.onlyScene; }) : scenes;
    for (const s of (list.length ? list : scenes)) {
      const views = s.views.length ? s.views.slice(0, 4) : [{ az: 0.9, el: 0.42, radius: 42, target: [0, 3, 0] }];
      for (let i = 0; i < views.length; i++) {
        const v = views[i];
        const dur = s.tourDur || 7.2;
        const drift = (i % 2 === 0 ? 0.16 : -0.16);
        shots.push({
          scene: s.id,
          from: { az: v.az - drift, el: v.el - 0.015, radius: v.radius * 1.02, target: v.target },
          to: { az: v.az + drift, el: v.el + 0.02, radius: v.radius * 0.955, target: v.target },
          dur: dur
        });
      }
    }
    let t0 = 0;
    for (const sh of shots) { sh.t0 = t0; t0 += sh.dur; }
    tour = { shots: shots, total: t0 };
  }

  function tourAt(t) {
    if (!tour || !tour.shots.length) return null;
    const tt = ((t % tour.total) + tour.total) % tour.total;
    let shot = tour.shots[0];
    for (const sh of tour.shots) { if (tt >= sh.t0 && tt < sh.t0 + sh.dur) { shot = sh; break; } }
    const p = DIO.easeInOut(DIO.clamp((tt - shot.t0) / shot.dur, 0, 1));
    const f = shot.from, to = shot.to;
    return {
      scene: shot.scene,
      az: DIO.lerp(f.az, to.az, p),
      el: DIO.lerp(f.el, to.el, p),
      radius: DIO.lerp(f.radius, to.radius, p),
      target: [DIO.lerp(f.target[0], to.target[0], p), DIO.lerp(f.target[1], to.target[1], p), DIO.lerp(f.target[2], to.target[2], p)]
    };
  }

  /* ---------------------------------------------------------- *
   * scene switching / views
   * ---------------------------------------------------------- */
  function setScene(id, opts) {
    opts = opts || {};
    if (!sceneMap[id]) return;
    S.sceneId = id;
    S.viewIndex = 0;
    const s = activeScene();
    applyView(viewOf(s, 0), !!opts.instant || S.film);
    emit('scene', { id: id, scene: s.def, views: s.views, params: s.params });
  }
  function setView(i) {
    const s = activeScene();
    if (!s.views.length) return;
    S.viewIndex = i;
    applyView(viewOf(s, i), !!S.film);
    emit('view', { index: i });
  }
  function setAutoRotate(on) {
    S.autoRotate = !!on;
    emit('autorotate', { on: S.autoRotate });
  }
  function startTour(fromTime) {
    S.tour = true;
    S.tourTime = fromTime || 0;
    emit('tour', { on: true });
  }
  function stopTour(silent) {
    S.tour = false;
    if (!silent) emit('tour', { on: false });
  }
  function setParam(id, value) {
    S.params = S.params || {};
    S.params[id] = value;
    const s = activeScene();
    if (s.onParam) { try { s.onParam(id, value, s); } catch (e) { console.error(e); } }
    emit('param', { id: id, value: value });
  }
  function setUiVisible(on) {
    S.ui = !!on;
    document.body.classList.toggle('ui-hidden', !S.ui);
    emit('ui', { on: S.ui });
  }

  /* ---------------------------------------------------------- *
   * rendering
   * ---------------------------------------------------------- */
  const IDENTITY = M4.identity();
  const IDENTITY3 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  const MIRROR = (function () {
    const m = M4.identity();
    m[5] = -1;
    return m;
  })();

  function cameraEye() {
    const ce = Math.cos(cam.el);
    // portrait screens need a wider framing so the diorama stays in frame
    const aspect = (viewW > 1 && viewH > 1) ? (viewW / viewH) : 1.78;
    const fit = Math.max(1, Math.min(1.85, Math.sqrt(1.15 / Math.max(aspect, 0.4))));
    const R = cam.radius * fit;
    return [
      cam.target[0] + Math.sin(cam.az) * ce * R,
      cam.target[1] + Math.sin(cam.el) * R,
      cam.target[2] + Math.cos(cam.az) * ce * R
    ];
  }

  function resize() {
    dpr = Math.min(global.devicePixelRatio || 1, 2);
    const cssW = Math.max(2, canvas.clientWidth || global.innerWidth);
    const cssH = Math.max(2, canvas.clientHeight || global.innerHeight);
    renderScale = dpr < 1.5 ? 1.6 : dpr;
    const w = Math.max(2, Math.round(cssW * renderScale));
    const h = Math.max(2, Math.round(cssH * renderScale));
    if (w === viewW && h === viewH && targets.scene) return;
    viewW = w; viewH = h;
    canvas.width = w; canvas.height = h;
    freeTarget(targets.scene); freeTarget(targets.refl); freeTarget(targets.bloomA); freeTarget(targets.bloomB);
    targets.scene = makeTarget(w, h, gl.LINEAR, true);
    const rw = Math.max(2, Math.round(w / 2)), rh = Math.max(2, Math.round(h / 2));
    targets.refl = makeTarget(rw, rh, gl.LINEAR, true);
    const bw = Math.max(2, Math.round(w / 4)), bh = Math.max(2, Math.round(h / 4));
    targets.bloomA = makeTarget(bw, bh, gl.LINEAR, false);
    targets.bloomB = makeTarget(bw, bh, gl.LINEAR, false);
    if (!targets.scene.ok || !targets.refl.ok || !targets.bloomA.ok) {
      fail('<b>FRAMEBUFFER ERROR</b><br>无法创建离屏渲染目标。');
    }
  }

  function bindMeshAttributes(p) {
    const posLoc = gl.getAttribLocation(p.p, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    const nrmLoc = gl.getAttribLocation(p.p, 'aNormal');
    if (nrmLoc >= 0) {
      gl.enableVertexAttribArray(nrmLoc);
      gl.vertexAttribPointer(nrmLoc, 3, gl.FLOAT, false, 0, 0);
    }
    const uvLoc = gl.getAttribLocation(p.p, 'aUv');
    if (uvLoc >= 0) {
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
    }
    return { pos: posLoc, nrm: nrmLoc, uv: uvLoc };
  }

  function bindGeometry(gpu, p, locations) {
    gl.bindBuffer(gl.ARRAY_BUFFER, gpu.vbo);
    gl.vertexAttribPointer(locations.pos, 3, gl.FLOAT, false, 0, 0);
    if (locations.nrm >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, gpu.nbo);
      gl.vertexAttribPointer(locations.nrm, 3, gl.FLOAT, false, 0, 0);
    }
    if (locations.uv >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, gpu.ubo);
      gl.vertexAttribPointer(locations.uv, 2, gl.FLOAT, false, 0, 0);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gpu.ibo);
    if (gpu.dynamic && gpu.source && gpu.source.dirty) {
      gl.bindBuffer(gl.ARRAY_BUFFER, gpu.vbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, gpu.source.positions);
      gpu.source.dirty = false;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gpu.ibo);
    }
  }

  let sceneUniformLocs = null;
  function setupMeshProgram(scene, eye, target) {
    const p = prog.mesh;
    gl.useProgram(p.p);
    sceneUniformLocs = bindMeshAttributes(p);
    const e = scene.env;
    const u = p.u;
    const tgt = target || cam.target;
    const fwd = G.norm(G.vsub(tgt, eye));
    let right = G.cross(fwd, [0, 1, 0]);
    if (G.vlen(right) < 1e-4) right = [1, 0, 0];
    right = G.norm(right);
    const up = G.cross(right, fwd);
    gl.uniform3fv(u.uCamRight, right);
    gl.uniform3fv(u.uCamUp, up);
    gl.uniform1f(u.uBillboard, 0);
    gl.uniform3fv(u.uEye, eye);
    gl.uniform3fv(u.uKeyDir, G.norm(e.key.dir));
    gl.uniform3fv(u.uFillDir, G.norm(e.fill.dir));
    gl.uniform3fv(u.uKeyColor, vec3(e.key.color));
    gl.uniform3fv(u.uFillColor, vec3(e.fill.color));
    gl.uniform3fv(u.uAmbient, vec3(e.ambient));
    gl.uniform3fv(u.uRimColor, vec3(e.rim.color));
    gl.uniform1f(u.uRimStrength, e.rim.strength);
    gl.uniform3fv(u.uFogColor, vec3(e.fog.color));
    gl.uniform1f(u.uFogNear, e.fog.near);
    gl.uniform1f(u.uFogFar, e.fog.far);
    gl.uniform1i(u.uTex, 0);
    if (scene.atlasTex) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, scene.atlasTex);
    }
  }

  function drawMeshes(scene, list, vp) {
    const p = prog.mesh;
    const loc = sceneUniformLocs;
    for (let i = 0; i < list.length; i++) {
      const mesh = list[i];
      const mt = mesh.material;
      gl.uniformMatrix4fv(p.u.uModel, false, mesh.world);
      gl.uniformMatrix4fv(p.u.uViewProj, false, vp);
      gl.uniformMatrix3fv(p.u.uNormalMat, false, M4.normalMat3(mesh.world));
      gl.uniform3fv(p.u.uColor, mt.color);
      gl.uniform3fv(p.u.uEmissive, mt.emissive);
      gl.uniform1f(p.u.uAlpha, mt.alpha);
      gl.uniform1f(p.u.uSpec, mt.spec);
      gl.uniform1f(p.u.uEmissiveStrength, mt.emissiveStrength);
      gl.uniform1f(p.u.uUnlit, mt.unlit ? 1 : 0);
      gl.uniform1f(p.u.uRadial, mt.radial ? 1 : 0);
      gl.uniform1f(p.u.uHasTex, mt.tex && scene.atlasTex ? 1 : 0);
      gl.uniform1f(p.u.uTexAlpha, mt.texAlpha ? 1 : 0);
      gl.uniform1f(p.u.uBillboard, mt.billboard ? 1 : 0);
      bindGeometry(mesh.gpu, p, loc);
      gl.drawElements(mesh.gpu.mode, mesh.gpu.count, mesh.gpu.indexType, 0);
    }
  }

  function drawSky(scene, vp) {
    const e = scene.env.sky;
    const p = prog.sky;
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.disable(gl.BLEND);
    const u = p.u;
    gl.useProgram(p.p);
    gl.uniform3fv(u.uTop, vec3(e.top));
    gl.uniform3fv(u.uMid, vec3(e.mid));
    gl.uniform3fv(u.uBot, vec3(e.bot));
    gl.uniform3fv(u.uGlowACol, vec3(e.glowACol));
    gl.uniform3fv(u.uGlowBCol, vec3(e.glowBCol));
    gl.uniform3fv(u.uHazeColor, vec3(e.hazeColor));
    gl.uniform3fv(u.uCloudColor, vec3(e.cloudColor));
    gl.uniform2fv(u.uGlowAPos, e.glowAPos);
    gl.uniform2fv(u.uGlowBPos, e.glowBPos);
    gl.uniform1f(u.uGlowASize, e.glowASize);
    gl.uniform1f(u.uGlowBSize, e.glowBSize);
    gl.uniform1f(u.uHaze, e.haze);
    gl.uniform1f(u.uStars, e.stars);
    gl.uniform1f(u.uClouds, e.clouds);
    gl.uniform1f(u.uTime, S.time);
    gl.uniform1f(u.uAspect, viewW / viewH);
    gl.uniform1f(u.uExposure, e.exposure);
    drawQuad(p);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
  }

  function drawGround(scene, vp, eye) {
    if (!scene.ground) return;
    const p = prog.ground;
    const u = p.u;
    gl.useProgram(p.p);
    const loc = bindMeshAttributes(p);
    gl.uniformMatrix4fv(u.uModel, false, IDENTITY);
    gl.uniformMatrix4fv(u.uViewProj, false, vp);
    gl.uniform3fv(u.uBase, vec3(scene.ground.env.color));
    gl.uniform3fv(u.uPuddle, vec3(scene.ground.env.puddle));
    gl.uniform3fv(u.uTint, vec3(scene.ground.env.tint));
    gl.uniform3fv(u.uEye, eye);
    gl.uniform2f(u.uRes, viewW, viewH);
    gl.uniform1f(u.uWet, scene.ground.env.wet);
    gl.uniform1f(u.uReflStrength, scene.ground.env.reflect * scene.env.reflection);
    gl.uniform1f(u.uTime, S.time);
    gl.uniform1f(u.uRain, S.rainAmount === undefined ? 1 : S.rainAmount);
    gl.uniform1i(u.uRefl, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, targets.refl.tex);
    bindGeometry(scene.ground.gpu, p, loc);
    gl.drawElements(gl.TRIANGLES, scene.ground.gpu.count, scene.ground.gpu.indexType, 0);
  }

  /* render one scene's meshes for the reflection pass (above ground only) */
  function drawReflectionPass(scene, proj, view) {
    const viewRefl = M4.mul(view, MIRROR);
    const vp = M4.mul(proj, viewRefl);
    const eye = cameraEye();
    const eyeRefl = [eye[0], -eye[1], eye[2]];
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets.refl.fb);
    gl.viewport(0, 0, targets.refl.w, targets.refl.h);
    const c = G.rgb(scene.env.sky.bot);
    gl.clearColor(c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    setupMeshProgram(scene, eyeRefl, [cam.target[0], -cam.target[1], cam.target[2]]);
    const list = scene.lists.opaque;
    for (let i = 0; i < list.length; i++) {
      if (list[i].noReflect) continue;
      // geometry buried under the ground plane (diorama base, soil) must not be mirrored
      if (list[i].bounds.min[1] < -0.4) continue;
      drawMeshes(scene, [list[i]], vp);
    }
    // alpha-blended surfaces (glass / windows) also reflect
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    drawMeshes(scene, scene.lists.trans.filter(function (m) { return !m.noReflect && m.bounds.min[1] >= -0.4; }), vp);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function renderFrame() {
    resize();
    const scene = activeScene();
    const eye = cameraEye();
    const view = M4.lookAt(eye, cam.target, [0, 1, 0]);
    const proj = M4.perspective(30 * DEG, viewW / viewH, 0.5, 260);
    const vp = M4.mul(proj, view);

    // reflection (skip if scene disables it)
    if (scene.env.reflection > 0.01) {
      drawReflectionPass(scene, proj, view);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, targets.refl.fb);
      gl.viewport(0, 0, targets.refl.w, targets.refl.h);
      gl.clearColor(0.02, 0.025, 0.04, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // main scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets.scene.fb);
    gl.viewport(0, 0, viewW, viewH);
    gl.clearColor(0.02, 0.02, 0.03, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawSky(scene, vp);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    drawGround(scene, vp, eye);

    setupMeshProgram(scene, eye);
    drawMeshes(scene, scene.lists.opaque, vp);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    drawMeshes(scene, scene.lists.trans, vp);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    drawMeshes(scene, scene.lists.additive, vp);
    gl.depthMask(true);
    gl.disable(gl.BLEND);

    // bloom
    const bp = prog.bright;
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets.bloomA.fb);
    gl.viewport(0, 0, targets.bloomA.w, targets.bloomA.h);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.disable(gl.BLEND);
    gl.useProgram(bp.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, targets.scene.tex);
    gl.uniform1i(bp.u.uTex, 0);
    gl.uniform1f(bp.u.uThreshold, scene.env.bloomThreshold);
    gl.uniform1f(bp.u.uKnee, 0.28);
    drawQuad(bp);

    const bl = prog.blur;
    gl.useProgram(bl.p);
    gl.uniform1i(bl.u.uTex, 0);
    for (let i = 0; i < 3; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, targets.bloomB.fb);
      gl.viewport(0, 0, targets.bloomB.w, targets.bloomB.h);
      gl.bindTexture(gl.TEXTURE_2D, targets.bloomA.tex);
      gl.uniform2f(bl.u.uDir, (1.0 + i * 1.8) / targets.bloomA.w, 0);
      drawQuad(bl);
      gl.bindFramebuffer(gl.FRAMEBUFFER, targets.bloomA.fb);
      gl.viewport(0, 0, targets.bloomA.w, targets.bloomA.h);
      gl.bindTexture(gl.TEXTURE_2D, targets.bloomB.tex);
      gl.uniform2f(bl.u.uDir, 0, (1.0 + i * 1.8) / targets.bloomA.h);
      drawQuad(bl);
    }

    // composite to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, viewW, viewH);
    const cp = prog.composite;
    gl.useProgram(cp.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, targets.scene.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, targets.bloomA.tex);
    gl.uniform1i(cp.u.uScene, 0);
    gl.uniform1i(cp.u.uBloom, 1);
    gl.uniform1f(cp.u.uBloomStrength, scene.env.bloom * 1.05);
    gl.uniform1f(cp.u.uVignette, scene.env.vignette);
    gl.uniform1f(cp.u.uGrain, scene.env.grain);
    gl.uniform1f(cp.u.uTime, S.time);
    gl.uniform1f(cp.u.uAspect, viewW / viewH);
    gl.uniform1f(cp.u.uExposure, scene.env.exposure);
    drawQuad(cp);
    gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);

    if (S.reflDebug) {
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(prog.debug.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, targets.refl.tex);
      gl.uniform1i(prog.debug.u.uTex, 0);
      gl.uniform2f(prog.debug.u.uScale, 1, 1);
      drawQuad(prog.debug);
      gl.enable(gl.DEPTH_TEST);
      gl.activeTexture(gl.TEXTURE0);
    }
  }

  /* ---------------------------------------------------------- *
   * per-frame update
   * ---------------------------------------------------------- */
  function updateCamera(dt) {
    const k = 1 - Math.exp(-dt * 7.5);
    if (S.tour) {
      const shot = tourAt(S.tourTime);
      if (shot) {
        if (shot.scene !== S.sceneId) setScene(shot.scene, { instant: true });
        cam.az = shot.az; cam.el = shot.el; cam.radius = shot.radius; cam.target = shot.target;
        cam.azT = shot.az; cam.elT = shot.el; cam.radiusT = shot.radius; cam.targetT = shot.target.slice();
      }
    } else {
      if (S.autoRotate && drag === null && pointers.size === 0) {
        cam.azT += dt * 0.075;
        cam.az += dt * 0.075;
      }
      cam.az += (cam.azT - cam.az) * k;
      cam.el += (cam.elT - cam.el) * k;
      cam.radius += (cam.radiusT - cam.radius) * k;
      for (let i = 0; i < 3; i++) cam.target[i] += (cam.targetT[i] - cam.target[i]) * k;
    }
  }

  function tickScenes(t, dt) {
    for (const s of scenes) {
      try { s.update(t, dt, s); } catch (e) { if (!s._warned) { console.error('update failed ' + s.id, e); s._warned = true; } }
      s.root.update(null);
    }
  }

  /* ---------------------------------------------------------- *
   * boot / loop / film
   * ---------------------------------------------------------- */
  let last = performance.now();
  let booted = false;

  function frame(now) {
    if (S.film) return;
    const dt = Math.min(0.05, Math.max(0.0001, (now - last) / 1000));
    last = now;
    if (!S.paused) {
      S.time += dt;
    }
    if (S.tour) S.tourTime += dt;
    updateCamera(dt);
    tickScenes(S.time, dt);
    renderFrame();
    if (!booted) { booted = true; emit('ready', { app: app }); }
    requestAnimationFrame(frame);
  }

  function readHash() {
    let h = {};
    try { h = new URLSearchParams(String(global.location.hash || '').replace(/^#/, '')); } catch (e) { h = {}; }
    const num = function (k) { const v = parseFloat(h.get(k)); return isFinite(v) ? v : null; };
    return {
      scene: h.get('scene'),
      view: num('view'),
      az: num('az'), el: num('el'), r: num('r'),
      tx: num('tx'), ty: num('ty'), tz: num('tz'),
      ui: h.get('ui'),
      tour: h.get('tour'),
      film: h.get('film'),
      only: h.get('only'),
      reflDebug: h.get('reflDebug'),
      t: num('t'),
      rain: num('rain')
    };
  }

  function start() {
    const q = readHash();
    S.film = q.film === '1';
    S.onlyScene = (q.only && sceneMap[q.only]) ? q.only : null;
    S.reflDebug = q.reflDebug === '1';
    buildTour();
    const firstScene = (q.scene && sceneMap[q.scene]) ? q.scene : (S.onlyScene || scenes[0].id);
    setScene(firstScene, { instant: true });
    if (q.view !== null) setView(q.view);
    if (q.rain !== null) setParam('rain', q.rain);
    if (q.ui === '0') setUiVisible(false);
    if (S.film) {
      document.documentElement.classList.add('film');
      S.tour = q.tour !== '0';
      S.ui = false;
      document.body.classList.add('ui-hidden');
    } else if (q.tour === '1') {
      startTour(0);
    }
    if (q.az !== null) { cam.az = cam.azT = q.az; }
    if (q.el !== null) { cam.el = cam.elT = q.el; }
    if (q.r !== null) { cam.radius = cam.radiusT = q.r; }
    if (q.tx !== null) cam.target[0] = cam.targetT[0] = q.tx;
    if (q.ty !== null) cam.target[1] = cam.targetT[1] = q.ty;
    if (q.tz !== null) cam.target[2] = cam.targetT[2] = q.tz;

    if (S.film) {
      const t = q.t || 0;
      S.time = t;
      S.tourTime = t;
      if (S.tour) {
        const shot = tourAt(S.tourTime);
        if (shot) { setScene(shot.scene, { instant: true }); cam.az = shot.az; cam.el = shot.el; cam.radius = shot.radius; cam.target = shot.target; }
      }
      tickScenes(S.time, 0.016);
      cam.az = cam.azT; cam.el = cam.elT; cam.radius = cam.radiusT; cam.target = cam.targetT.slice();
      renderFrame();
      booted = true;
      emit('ready', { app: app });
      return;
    }
    last = performance.now();
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------- *
   * public app api
   * ---------------------------------------------------------- */
  app.setScene = setScene;
  app.setView = setView;
  app.setAutoRotate = function (on) { setAutoRotate(on); };
  app.setTour = function (on) { if (on) startTour(0); else stopTour(); };
  app.toggleTour = function () { if (S.tour) stopTour(); else startTour(0); };
  app.setUiVisible = setUiVisible;
  app.setParam = setParam;
  app.state = S;
  app.cam = cam;
  app.scenes = function () { return scenes.map(function (s) { return { id: s.id, title: s.title, subtitle: s.subtitle, views: s.views, params: s.params }; }); };
  app.activeScene = function () { return activeScene().def; };
  app.tourInfo = function () { return tour ? { total: tour.total, shots: tour.shots.map(function (s) { return { scene: s.scene, t0: s.t0, dur: s.dur }; }) } : null; };
  app.seek = function (t) {
    S.time = t;
    S.tourTime = t;
    if (S.tour) {
      const shot = tourAt(t);
      if (shot) {
        if (shot.scene !== S.sceneId) setScene(shot.scene, { instant: true });
        cam.az = cam.azT = shot.az;
        cam.el = cam.elT = shot.el;
        cam.radius = cam.radiusT = shot.radius;
        cam.target = cam.targetT = shot.target.slice();
      }
    }
    tickScenes(S.time, 1 / 24);
    renderFrame();
  };
  app.renderNow = function (dt) { tickScenes(S.time, dt || 0.016); renderFrame(); };
  app.capture = function () {
    renderFrame();
    try { return canvas.toDataURL('image/png'); } catch (e) { return null; }
  };
  app.download = function (name) {
    const url = app.capture();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'akari-mart.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  start();
  emit('boot', {});
})(typeof window !== 'undefined' ? window : globalThis);
