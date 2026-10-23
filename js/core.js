/* ============================================================
   AKARI MART / 雨夜 DIORAMA — core toolkit
   Math, procedural geometry, batching, texture atlas, particles.
   Classic script, no dependencies. Attaches window.DIO.
   ============================================================ */
(function (global) {
  'use strict';

  const DIO = global.DIO = global.DIO || {};

  /* ---------------------------------------------------------- *
   * small math helpers
   * ---------------------------------------------------------- */
  const G = DIO.G = {};

  DIO.mat = function (color, opts) { return mat(color, opts); };
  DIO.rgb = function (hex) { return rgb(hex); };

  function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function vscale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function vmul(a, b) { return [a[0] * b[0], a[1] * b[1], a[2] * b[2]]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function vlen(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
  function vnorm(a) { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  G.vadd = vadd; G.vsub = vsub; G.vmul = vmul; G.cross = cross; G.dot = dot;
  G.vlen = vlen; G.norm = vnorm; G.scale = vscale;
  DIO.clamp = clamp; DIO.lerp = lerp; DIO.easeInOut = easeInOut;

  /* deterministic rng (mulberry32) */
  DIO.rng = function (seed) {
    let a = (seed || 1) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------------------------------------------------------- *
   * colour + material
   * ---------------------------------------------------------- */
  const hexCache = {};
  function rgb(hex) {
    if (Array.isArray(hex)) return hex;
    if (hexCache[hex]) return hexCache[hex];
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    const out = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    hexCache[hex] = out;
    return out;
  }

  /**
   * Material description.
   *  color            base albedo (hex or [r,g,b])
   *  emissive         self-illumination colour
   *  emissiveStrength multiplier for emissive
   *  spec             specular amount 0..1
   *  alpha            opacity
   *  additive         additive blending, no depth write
   *  unlit            ignore lighting (pure colour * tex)
   *  radial           alpha falls off toward the quad border (glow cards)
   *  tex              sample the scene atlas texture
   *  texAlpha         multiply alpha by texture alpha
   */
  function mat(color, opts) {
    opts = opts || {};
    return {
      color: rgb(color || '#ffffff'),
      emissive: rgb(opts.emissive || '#000000'),
      emissiveStrength: opts.emissiveStrength === undefined ? 1 : opts.emissiveStrength,
      spec: opts.spec === undefined ? 0.2 : opts.spec,
      alpha: opts.alpha === undefined ? 1 : opts.alpha,
      additive: !!opts.additive,
      unlit: !!opts.unlit,
      radial: !!opts.radial,
      tex: !!opts.tex,
      texAlpha: !!opts.texAlpha,
      billboard: !!opts.billboard
    };
  }
  G.rgb = rgb;
  G.mat = mat;
  G.hex = rgb;

  /* ---------------------------------------------------------- *
   * mat4 (column-major, WebGL layout)
   * ---------------------------------------------------------- */
  const M4 = {};
  M4.identity = function () {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  };
  M4.mul = function (a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      for (let r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b0 + a[4 + r] * b1 + a[8 + r] * b2 + a[12 + r] * b3;
      }
    }
    return o;
  };
  M4.compose = function (t, r, s) {
    t = t || [0, 0, 0]; r = r || [0, 0, 0]; s = s || [1, 1, 1];
    const cx = Math.cos(r[0]), sx = Math.sin(r[0]);
    const cy = Math.cos(r[1]), sy = Math.sin(r[1]);
    const cz = Math.cos(r[2]), sz = Math.sin(r[2]);
    const m = new Float32Array(16);
    const r00 = cz * cy, r01 = cz * sy * sx - sz * cx, r02 = cz * sy * cx + sz * sx;
    const r10 = sz * cy, r11 = sz * sy * sx + cz * cx, r12 = sz * sy * cx - cz * sx;
    const r20 = -sy, r21 = cy * sx, r22 = cy * cx;
    m[0] = r00 * s[0]; m[1] = r10 * s[0]; m[2] = r20 * s[0]; m[3] = 0;
    m[4] = r01 * s[1]; m[5] = r11 * s[1]; m[6] = r21 * s[1]; m[7] = 0;
    m[8] = r02 * s[2]; m[9] = r12 * s[2]; m[10] = r22 * s[2]; m[11] = 0;
    m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; m[15] = 1;
    return m;
  };
  M4.perspective = function (fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    const m = new Float32Array(16);
    m[0] = f / aspect; m[5] = f;
    m[10] = (far + near) * nf; m[11] = -1;
    m[14] = 2 * far * near * nf;
    return m;
  };
  M4.lookAt = function (eye, center, up) {
    let z = vnorm(vsub(eye, center));
    let x = cross(up, z);
    if (vlen(x) < 1e-6) x = [1, 0, 0];
    x = vnorm(x);
    const y = cross(z, x);
    const m = new Float32Array(16);
    m[0] = x[0]; m[1] = y[0]; m[2] = z[0]; m[3] = 0;
    m[4] = x[1]; m[5] = y[1]; m[6] = z[1]; m[7] = 0;
    m[8] = x[2]; m[9] = y[2]; m[10] = z[2]; m[11] = 0;
    m[12] = -dot(x, eye); m[13] = -dot(y, eye); m[14] = -dot(z, eye); m[15] = 1;
    return m;
  };
  M4.normalMat3 = function (m) {
    const a00 = m[0], a01 = m[4], a02 = m[8];
    const a10 = m[1], a11 = m[5], a12 = m[9];
    const a20 = m[2], a21 = m[6], a22 = m[10];
    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;
    let det = a00 * b01 + a01 * b11 + a02 * b21;
    if (!det) det = 1;
    const id = 1 / det;
    const i00 = b01 * id;
    const i01 = (-a22 * a01 + a02 * a21) * id;
    const i02 = (a12 * a01 - a02 * a11) * id;
    const i10 = b11 * id;
    const i11 = (a22 * a00 - a02 * a20) * id;
    const i12 = (-a12 * a00 + a02 * a10) * id;
    const i20 = b21 * id;
    const i21 = (-a21 * a00 + a01 * a20) * id;
    const i22 = (a11 * a00 - a01 * a10) * id;
    return new Float32Array([i00, i01, i02, i10, i11, i12, i20, i21, i22]);
  };
  M4.transformPoint = function (m, p) {
    const x = p[0], y = p[1], z = p[2];
    const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
    return [
      (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
      (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
      (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
    ];
  };
  G.M4 = M4;

  /* ---------------------------------------------------------- *
   * geometry builder
   * ---------------------------------------------------------- */
  function num(v) { return Math.round(v * 1e5) / 1e5; }

  class Builder {
    constructor() { this.reset(); }
    reset() { this.p = []; this.n = []; this.uv = []; this.idx = []; this.vertexCount = 0; return this; }
    _vert(p, n, uv) {
      this.p.push(num(p[0]), num(p[1]), num(p[2]));
      this.n.push(n[0], n[1], n[2]);
      this.uv.push(uv ? uv[0] : 0, uv ? uv[1] : 0);
      return this.vertexCount++;
    }
    _tri(a, b, c, na, nb, nc, ua, ub, uc) {
      const ia = this._vert(a, na, ua), ib = this._vert(b, nb, ub), ic = this._vert(c, nc, uc);
      this.idx.push(ia, ib, ic);
    }
    /* flat triangle, auto-oriented away from `center` */
    tri(a, b, c, center, n, uvs) {
      let A = a, B = b, C = c;
      let nn = n || vnorm(cross(vsub(b, a), vsub(c, a)));
      if (!nn[0] && !nn[1] && !nn[2]) nn = [0, 1, 0];
      if (center) {
        const fc = vscale(vadd(vadd(a, b), c), 1 / 3);
        if (dot(nn, vsub(fc, center)) < 0) { const t = B; B = C; C = t; nn = vscale(nn, -1); }
      }
      this._tri(A, B, C, nn, nn, nn, uvs && uvs[0], uvs && uvs[1], uvs && uvs[2]);
    }
    triSmooth(a, b, c, na, nb, nc, center, uvs) {
      let A = a, B = b, C = c, NA = na, NB = nb, NC = nc;
      if (center) {
        const fc = vscale(vadd(vadd(a, b), c), 1 / 3);
        if (dot(vnorm(cross(vsub(b, a), vsub(c, a))), vsub(fc, center)) < 0) {
          B = c; C = b; NB = nc; NC = nb;
        }
      }
      this._tri(A, B, C, NA, NB, NC, uvs && uvs[0], uvs && uvs[1], uvs && uvs[2]);
    }
    quad(a, b, c, d, center) {
      let nn = vnorm(cross(vsub(b, a), vsub(c, a)));
      if (!nn[0] && !nn[1] && !nn[2]) nn = [0, 1, 0];
      let A = a, B = b, C = c, D = d;
      if (center) {
        const fc = vscale(vadd(vadd(a, b), vadd(c, d)), 1 / 4);
        if (dot(nn, vsub(fc, center)) < 0) { B = d; C = c; D = b; nn = vscale(nn, -1); }
      }
      const ia = this._vert(A, nn), ib = this._vert(B, nn), ic = this._vert(C, nn), id = this._vert(D, nn);
      this.idx.push(ia, ib, ic, ia, ic, id);
    }
    /* quad with explicit normal + uvs (0..1, bottom-left first, ccw) */
    quadN(a, b, c, d, n, uvs) {
      let A = a, B = b, C = c, D = d;
      let U = uvs || [[0, 0], [1, 0], [1, 1], [0, 1]];
      if (dot(vnorm(cross(vsub(b, a), vsub(c, a))), n) < 0) {
        B = d; C = c; D = b; U = [U[0], U[3], U[2], U[1]];
      }
      const ia = this._vert(A, n, U[0]), ib = this._vert(B, n, U[1]);
      const ic = this._vert(C, n, U[2]), id = this._vert(D, n, U[3]);
      this.idx.push(ia, ib, ic, ia, ic, id);
    }
    box(w, h, d, cx, cy, cz) {
      cx = cx || 0; cy = cy || 0; cz = cz || 0;
      const x0 = cx - w / 2, x1 = cx + w / 2;
      const y0 = cy - h / 2, y1 = cy + h / 2;
      const z0 = cz - d / 2, z1 = cz + d / 2;
      const c = [cx, cy, cz];
      const p = [
        [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
        [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]
      ];
      this.quad(p[0], p[1], p[2], p[3], c);
      this.quad(p[5], p[4], p[7], p[6], c);
      this.quad(p[1], p[5], p[6], p[2], c);
      this.quad(p[4], p[0], p[3], p[7], c);
      this.quad(p[3], p[2], p[6], p[7], c);
      this.quad(p[4], p[5], p[1], p[0], c);
    }
    taper(bw, bd, tw, td, h, cx, cy, cz) {
      cx = cx || 0; cy = cy || 0; cz = cz || 0;
      const y0 = cy - h / 2, y1 = cy + h / 2;
      const bx = bw / 2, bz = bd / 2, tx = tw / 2, tz = td / 2;
      const p = [
        [cx - bx, y0, cz + bz], [cx + bx, y0, cz + bz], [cx + tx, y1, cz + tz], [cx - tx, y1, cz + tz],
        [cx - bx, y0, cz - bz], [cx + bx, y0, cz - bz], [cx + tx, y1, cz - tz], [cx - tx, y1, cz - tz]
      ];
      const c = [cx, cy, cz];
      this.quad(p[0], p[1], p[2], p[3], c);
      this.quad(p[5], p[4], p[7], p[6], c);
      this.quad(p[1], p[5], p[6], p[2], c);
      this.quad(p[4], p[0], p[3], p[7], c);
      this.quad(p[3], p[2], p[6], p[7], c);
      this.quad(p[4], p[5], p[1], p[0], c);
    }
    cyl(r0, r1, h, seg, cx, cy, cz) {
      cx = cx || 0; cy = cy || 0; cz = cz || 0;
      seg = seg || 12;
      const y0 = cy - h / 2, y1 = cy + h / 2, c = [cx, cy, cz];
      const ring0 = [], ring1 = [];
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        ring0.push([cx + ca * r0, y0, cz + sa * r0]);
        ring1.push([cx + ca * r1, y1, cz + sa * r1]);
      }
      for (let i = 0; i < seg; i++) {
        const j = (i + 1) % seg;
        this.quad(ring0[i], ring0[j], ring1[j], ring1[i], c);
      }
      if (r0 > 0) for (let i = 0; i < seg; i++) {
        const j = (i + 1) % seg;
        this.tri([cx, y0, cz], ring0[j], ring0[i], c);
      }
      if (r1 > 0) for (let i = 0; i < seg; i++) {
        const j = (i + 1) % seg;
        this.tri([cx, y1, cz], ring1[i], ring1[j], c);
      }
    }
    /* horizontal cylinder / tube along X or Z */
    tube(r, len, seg, axis, cx, cy, cz) {
      cx = cx || 0; cy = cy || 0; cz = cz || 0;
      seg = seg || 10;
      const h = len / 2;
      const c = [cx, cy, cz];
      const rings = [];
      for (let k = 0; k < 2; k++) {
        const off = k === 0 ? -h : h;
        const ring = [];
        for (let i = 0; i < seg; i++) {
          const a = (i / seg) * Math.PI * 2;
          let py = Math.cos(a) * r, pz = Math.sin(a) * r, px = off;
          if (axis === 'x') { const t = py; py = px; px = t; }
          else if (axis === 'z') { const t = py; py = pz; pz = t; }
          ring.push([cx + px, cy + py, cz + pz]);
        }
        rings.push(ring);
      }
      for (let i = 0; i < seg; i++) {
        const j = (i + 1) % seg;
        this.quad(rings[0][i], rings[0][j], rings[1][j], rings[1][i], c);
      }
      for (let k = 0; k < 2; k++) {
        const ring = rings[k];
        const center = k === 0 ? [cx - (axis === 'x' ? h : 0), cy - (axis === 'y' ? h : 0), cz - (axis === 'z' ? h : 0)] : [cx + (axis === 'x' ? h : 0), cy + (axis === 'y' ? h : 0), cz + (axis === 'z' ? h : 0)];
        for (let i = 0; i < seg; i++) {
          const j = (i + 1) % seg;
          this.tri(center, ring[i], ring[j], c);
        }
      }
    }
    sphere(r, su, sv, cx, cy, cz, smooth) {
      cx = cx || 0; cy = cy || 0; cz = cz || 0;
      su = su || 14; sv = sv || 10;
      const rings = [];
      for (let v = 0; v <= sv; v++) {
        const phi = (v / sv) * Math.PI;
        const row = [];
        for (let u = 0; u <= su; u++) {
          const th = (u / su) * Math.PI * 2;
          const x = Math.sin(phi) * Math.cos(th);
          const y = Math.cos(phi);
          const z = Math.sin(phi) * Math.sin(th);
          row.push({ p: [cx + x * r, cy + y * r, cz + z * r], n: [x, y, z] });
        }
        rings.push(row);
      }
      const c = [cx, cy, cz];
      for (let v = 0; v < sv; v++) {
        for (let u = 0; u < su; u++) {
          const a = rings[v][u], b = rings[v][u + 1], d = rings[v + 1][u], e = rings[v + 1][u + 1];
          if (smooth) {
            this.triSmooth(a.p, b.p, d.p, a.n, b.n, d.n, c);
            this.triSmooth(b.p, e.p, d.p, b.n, e.n, d.n, c);
          } else {
            this.tri(a.p, b.p, d.p, c);
            this.tri(b.p, e.p, d.p, c);
          }
        }
      }
    }
    /* low-poly blob: jittered sphere, good for blossom clusters */
    blob(r, su, sv, cx, cy, cz, jitter, seed, flatTop) {
      cx = cx || 0; cy = cy || 0; cz = cz || 0;
      const rnd = DIO.rng(seed || 1);
      const rings = [];
      for (let v = 0; v <= sv; v++) {
        const phi = (v / sv) * Math.PI;
        const row = [];
        for (let u = 0; u <= su; u++) {
          const th = (u / su) * Math.PI * 2;
          const k = 1 + (rnd() - 0.5) * (jitter || 0.35);
          const x = Math.sin(phi) * Math.cos(th) * k;
          let y = Math.cos(phi) * k;
          const z = Math.sin(phi) * Math.sin(th) * k;
          if (flatTop && y > 0) y = Math.pow(y, 2.2);
          row.push({ p: [cx + x * r, cy + y * r * (flatTop ? 0.72 : 1), cz + z * r], n: vnorm([x, y, z]) });
        }
        rings.push(row);
      }
      const c = [cx, cy, cz];
      for (let v = 0; v < sv; v++) {
        for (let u = 0; u < su; u++) {
          const a = rings[v][u], b = rings[v][u + 1], d = rings[v + 1][u], e = rings[v + 1][u + 1];
          this.tri(a.p, b.p, d.p, c);
          this.tri(b.p, e.p, d.p, c);
        }
      }
    }
    hull(points, faces, center) {
      if (!center) {
        center = [0, 0, 0];
        for (const p of points) { center[0] += p[0]; center[1] += p[1]; center[2] += p[2]; }
        center = vscale(center, 1 / points.length);
      }
      for (const f of faces) {
        if (f.length === 3) this.tri(points[f[0]], points[f[1]], points[f[2]], center);
        else if (f.length === 4) this.quad(points[f[0]], points[f[1]], points[f[2]], points[f[3]], center);
        else for (let k = 1; k < f.length - 1; k++) this.tri(points[f[0]], points[f[k]], points[f[k + 1]], center);
      }
    }
    /* horizontal ring on the XZ plane */
    ringY(ri, ro, seg, cx, cy, cz) {
      cx = cx || 0; cy = cy || 0; cz = cz || 0; seg = seg || 40;
      const n = [0, 1, 0];
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        const o0 = [cx + Math.cos(a0) * ro, cy, cz + Math.sin(a0) * ro];
        const o1 = [cx + Math.cos(a1) * ro, cy, cz + Math.sin(a1) * ro];
        const i0 = [cx + Math.cos(a0) * ri, cy, cz + Math.sin(a0) * ri];
        const i1 = [cx + Math.cos(a1) * ri, cy, cz + Math.sin(a1) * ri];
        this.quadN(o0, o1, i1, i0, n);
      }
    }
    /* vertical disc in a plane; axis 'z' (faces +z) or 'x' (faces +x) */
    disc(r, seg, cx, cy, cz, axis) {
      cx = cx || 0; cy = cy || 0; cz = cz || 0; seg = seg || 16;
      axis = axis || 'z';
      const n = axis === 'z' ? [0, 0, 1] : [1, 0, 0];
      const c = [cx, cy, cz];
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        const p0 = axis === 'z' ? [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cz] : [cx, cy + Math.sin(a0) * r, cz + Math.cos(a0) * r];
        const p1 = axis === 'z' ? [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, cz] : [cx, cy + Math.sin(a1) * r, cz + Math.cos(a1) * r];
        this._tri(c, p0, p1, n, n, n);
      }
    }
    /* axis aligned vertical quad, normal +z */
    plane(w, h, cx, cy, cz, n) {
      cx = cx || 0; cy = cy || 0; cz = cz || 0;
      n = n || [0, 0, 1];
      const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
      this.quadN([x0, y0, cz], [x1, y0, cz], [x1, y1, cz], [x0, y1, cz], n);
    }
    line(segments) {
      const n = [0, 0, 0];
      for (const seg of segments) {
        const a = this._vert(seg[0], n), b = this._vert(seg[1], n);
        this.idx.push(a, b);
      }
    }
    lineLoop(points) {
      const segs = [];
      for (let i = 0; i < points.length; i++) segs.push([points[i], points[(i + 1) % points.length]]);
      this.line(segs);
    }
    /* append another builder's geometry, transformed by mat4, uv remapped */
    append(other, m, uvRect, keepNormals) {
      const base = this.vertexCount;
      const nm = m ? M4.normalMat3(m) : null;
      const P = other.p, N = other.n, U = other.uv;
      for (let i = 0, n = P.length / 3; i < n; i++) {
        let px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2];
        let nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2];
        if (m) {
          const wx = m[0] * px + m[4] * py + m[8] * pz + m[12];
          const wy = m[1] * px + m[5] * py + m[9] * pz + m[13];
          const wz = m[2] * px + m[6] * py + m[10] * pz + m[14];
          px = wx; py = wy; pz = wz;
          const tx = nm[0] * nx + nm[3] * ny + nm[6] * nz;
          const ty = nm[1] * nx + nm[4] * ny + nm[7] * nz;
          const tz = nm[2] * nx + nm[5] * ny + nm[8] * nz;
          const l = Math.hypot(tx, ty, tz) || 1;
          nx = tx / l; ny = ty / l; nz = tz / l;
        }
        if (keepNormals) { nx = N[i * 3]; ny = N[i * 3 + 1]; nz = N[i * 3 + 2]; }
        this.p.push(px, py, pz);
        this.n.push(nx, ny, nz);
        let u = U[i * 2], v = U[i * 2 + 1];
        if (uvRect) {
          u = uvRect[0] + u * (uvRect[2] - uvRect[0]);
          v = uvRect[1] + v * (uvRect[3] - uvRect[1]);
        }
        this.uv.push(u, v);
      }
      for (let i = 0; i < other.idx.length; i++) this.idx.push(base + other.idx[i]);
      this.vertexCount += other.vertexCount;
      return this;
    }
    build() {
      const uint = (DIO.useUint32 && this.vertexCount > 65000);
      return {
        positions: new Float32Array(this.p),
        normals: new Float32Array(this.n),
        uvs: new Float32Array(this.uv),
        indices: uint ? new Uint32Array(this.idx) : new Uint16Array(this.idx),
        count: this.idx.length,
        indexType: uint ? 'uint32' : 'uint16',
        mode: 'triangles'
      };
    }
    buildLines() {
      return {
        positions: new Float32Array(this.p),
        normals: new Float32Array(this.n),
        uvs: new Float32Array(this.uv),
        indices: new Uint16Array(this.idx),
        count: this.idx.length,
        indexType: 'uint16',
        mode: 'lines'
      };
    }
  }
  G.Builder = Builder;
  G.mesh = function (geometry, material) { return { geometry: geometry, material: material }; };

  /* ---------------------------------------------------------- *
   * scene node
   * ---------------------------------------------------------- */
  class Node {
    constructor(name) {
      this.name = name || 'node';
      this.position = [0, 0, 0];
      this.rotation = [0, 0, 0];
      this.scale = [1, 1, 1];
      this.children = [];
      this.meshes = [];
      this.world = M4.identity();
      this.visible = true;
      this.excludeReflect = false;
      this.order = 0;
    }
    add(child) { this.children.push(child); return child; }
    attach(mesh) { this.meshes.push(mesh); return mesh; }
    update(parentWorld) {
      const local = M4.compose(this.position, this.rotation, this.scale);
      this.world = parentWorld ? M4.mul(parentWorld, local) : local;
      for (const m of this.meshes) m.world = this.world;
      for (const c of this.children) c.update(this.world);
    }
    traverse(fn) {
      fn(this);
      for (const c of this.children) c.traverse(fn);
    }
  }
  G.Node = Node;
  DIO.node = function (name, pos, rot, scale) {
    const n = new Node(name);
    if (pos) n.position = pos;
    if (rot) n.rotation = rot;
    if (scale) n.scale = scale;
    return n;
  };

  /* ---------------------------------------------------------- *
   * Batch: merge many primitives per material into single meshes
   * ---------------------------------------------------------- */
  class Batch {
    constructor() {
      this.groups = new Map();
      this.lineGroups = new Map();
      this._tb = new Builder();
    }
    group(m, lines) {
      const map = lines ? this.lineGroups : this.groups;
      let b = map.get(m);
      if (!b) { b = new Builder(); map.set(m, b); }
      return b;
    }
    _add(m, fn, t, r, s, uvRect, lines) {
      const tb = this._tb.reset();
      fn(tb);
      if (m.billboard && !lines) {
        // encode this quad's world centre into the normals so the billboard
        // vertex shader can keep every merged card at its own position
        const c = t || [0, 0, 0];
        for (let i = 0; i < tb.vertexCount; i++) {
          tb.n[i * 3] = c[0];
          tb.n[i * 3 + 1] = c[1];
          tb.n[i * 3 + 2] = c[2];
        }
      }
      this.group(m, lines).append(tb, M4.compose(t, r, s), uvRect, !!m.billboard);
      return this;
    }
    box(m, dims, pos, rot, uv) {
      return this._add(m, b => b.box(dims[0], dims[1], dims[2]), pos, rot, null, uv);
    }
    taper(m, bw, bd, tw, td, h, pos, rot) {
      return this._add(m, b => b.taper(bw, bd, tw, td, h), pos, rot);
    }
    cyl(m, r0, r1, h, seg, pos, rot) {
      return this._add(m, b => b.cyl(r0, r1, h, seg), pos, rot);
    }
    tube(m, r, len, seg, axis, pos, rot) {
      return this._add(m, b => b.tube(r, len, seg, axis), pos, rot);
    }
    sphere(m, r, su, sv, pos, rot, smooth) {
      return this._add(m, b => b.sphere(r, su, sv, 0, 0, 0, smooth), pos, rot);
    }
    blob(m, r, su, sv, jitter, seed, pos, rot, flatTop) {
      return this._add(m, b => b.blob(r, su, sv, 0, 0, 0, jitter, seed, flatTop), pos, rot);
    }
    hull(m, pts, faces, pos, rot) {
      return this._add(m, b => b.hull(pts, faces), pos, rot);
    }
    disc(m, r, seg, pos, rot, axis) {
      return this._add(m, b => b.disc(r, seg, 0, 0, 0, axis), pos, rot);
    }
    /* textured / plain quad in the XY plane (normal +z), uv from atlas rect */
    plane(m, w, h, pos, rot, uvRect, normal) {
      return this._add(m, b => b.plane(w, h, 0, 0, 0, normal || [0, 0, 1]), pos, rot, null, uvRect);
    }
    /* quad from 4 world-space corners + optional uv rect */
    quad(m, p0, p1, p2, p3, uvRect) {
      return this._add(m, b => b.quadN(p0, p1, p2, p3, vnorm(cross(vsub(p1, p0), vsub(p2, p0)))), null, null, null, uvRect);
    }
    /* quad that faces the camera-independent given normal */
    quadN(m, p0, p1, p2, p3, n, uvRect) {
      return this._add(m, b => b.quadN(p0, p1, p2, p3, n), null, null, null, uvRect);
    }
    ringY(m, ri, ro, seg, pos) {
      return this._add(m, b => b.ringY(ri, ro, seg, 0, 0, 0), pos);
    }
    raw(m, geo, pos, rot, scale, uvRect) {
      const tb = this._tb.reset();
      tb.p = Array.prototype.slice.call(geo.positions);
      tb.n = geo.normals ? Array.prototype.slice.call(geo.normals) : [];
      tb.uv = geo.uvs ? Array.prototype.slice.call(geo.uvs) : [];
      tb.idx = Array.prototype.slice.call(geo.indices);
      tb.vertexCount = tb.p.length / 3;
      if (!tb.n.length) tb.n = new Array(tb.vertexCount * 3).fill(0);
      if (!tb.uv.length) tb.uv = new Array(tb.vertexCount * 2).fill(0);
      this.group(m).append(tb, M4.compose(pos, rot, scale), uvRect);
      return this;
    }
    lines(m, segments, pos, rot) {
      return this._add(m, b => b.line(segments), pos, rot, null, null, true);
    }
    finish(node) {
      for (const [m, b] of this.groups) node.attach(G.mesh(b.build(), m));
      for (const [m, b] of this.lineGroups) node.attach(G.mesh(b.buildLines(), m));
      this.groups.clear();
      this.lineGroups.clear();
      return node;
    }
  }
  DIO.Batch = Batch;

  /* ---------------------------------------------------------- *
   * texture atlas (canvas 2D -> WebGL texture)
   * ---------------------------------------------------------- */
  class Atlas {
    constructor(w, h) {
      this.width = w || 2048;
      this.height = h || 1024;
      this.regions = new Map();
      this._x = 4;
      this._y = 4;
      this._rowH = 0;
      this.canvas = null;
    }
    define(name, w, h, draw) {
      if (this.regions.has(name)) throw new Error('atlas region exists: ' + name);
      const pad = 4;
      if (this._x + w + pad > this.width) {
        this._x = pad;
        this._y += this._rowH + pad;
        this._rowH = 0;
      }
      if (this._y + h + pad > this.height) {
        throw new Error('atlas overflow at region ' + name);
      }
      const r = { name: name, x: this._x, y: this._y, w: w, h: h, draw: draw };
      this.regions.set(name, r);
      this._x += w + pad;
      this._rowH = Math.max(this._rowH, h);
      return r;
    }
    uv(name) {
      const r = this.regions.get(name);
      if (!r) throw new Error('atlas missing region: ' + name);
      const W = this.width, H = this.height;
      return [
        r.x / W,
        1 - (r.y + r.h) / H,
        (r.x + r.w) / W,
        1 - r.y / H
      ];
    }
    /* uv of a sub-rect inside a region (normalised 0..1 within region) */
    uvSub(name, x, y, w, h) {
      const r = this.regions.get(name);
      if (!r) throw new Error('atlas missing region: ' + name);
      const W = this.width, H = this.height;
      return [
        (r.x + x * r.w) / W,
        1 - (r.y + (y + h) * r.h) / H,
        (r.x + (x + w) * r.w) / W,
        1 - (r.y + y * r.h) / H
      ];
    }
    build() {
      if (this.canvas) return this.canvas;
      const c = document.createElement('canvas');
      c.width = this.width;
      c.height = this.height;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, this.width, this.height);
      for (const r of this.regions.values()) {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.beginPath();
        ctx.rect(0, 0, r.w, r.h);
        ctx.clip();
        try { r.draw(ctx, r.w, r.h); } catch (e) { console.error('atlas draw failed: ' + r.name, e); }
        ctx.restore();
      }
      this.canvas = c;
      return c;
    }
  }
  DIO.Atlas = Atlas;
  DIO.atlas = function (w, h) { return new Atlas(w, h); };

  /* ---------------------------------------------------------- *
   * 2D drawing helpers used by atlas painters
   * ---------------------------------------------------------- */
  const JP_FONT = '"Yu Gothic UI","Yu Gothic","Hiragino Kaku Gothic ProN","Meiryo","Noto Sans JP","Microsoft YaHei",sans-serif';
  const EN_FONT = '"Bahnschrift","DIN Alternate","Segoe UI","Helvetica Neue",Arial,sans-serif';

  DIO.fonts = { jp: JP_FONT, en: EN_FONT };

  DIO.text = function (ctx, str, o) {
    o = o || {};
    ctx.save();
    const size = o.size || 48;
    const weight = o.weight || 500;
    const font = o.font || JP_FONT;
    ctx.font = weight + ' ' + size + 'px ' + font;
    ctx.fillStyle = o.color || '#151515';
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'middle';
    if (o.letterSpacing && 'letterSpacing' in ctx) ctx.letterSpacing = o.letterSpacing + 'px';
    if (o.glow) {
      ctx.shadowColor = o.glow;
      ctx.shadowBlur = o.glowBlur || size * 0.6;
    }
    ctx.fillText(str, o.x || 0, o.y || 0);
    ctx.restore();
  };

  DIO.roundRect = function (ctx, x, y, w, h, r, fill, stroke, lw) {
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    }
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
    ctx.restore();
  };

  DIO.star = function (ctx, cx, cy, outer, inner, points, fill) {
    ctx.save();
    ctx.beginPath();
    const n = points || 5;
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill || '#ffffff';
    ctx.fill();
    ctx.restore();
  };

  /* subtle paper / wall texture inside a region */
  DIO.noiseFill = function (ctx, w, h, base, amount, seed) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const rnd = DIO.rng(seed || 3);
    const n = Math.floor(w * h / 90);
    ctx.save();
    for (let i = 0; i < n; i++) {
      const a = (rnd() - 0.5) * amount;
      ctx.fillStyle = a > 0 ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + (-a) + ')';
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    ctx.restore();
  };

  /* ---------------------------------------------------------- *
   * scene registry
   * ---------------------------------------------------------- */
  DIO.scenes = [];
  DIO.sceneMap = {};
  DIO.registerScene = function (def) {
    if (!def || !def.id) throw new Error('scene needs id');
    DIO.scenes.push(def);
    DIO.sceneMap[def.id] = def;
    return def;
  };

  /* ---------------------------------------------------------- *
   * particles — analytic in time (deterministic, scrubbable)
   * ---------------------------------------------------------- */
  class Rain {
    constructor(o) {
      o = o || {};
      this.count = o.count || 1400;
      this.area = o.area || [38, 26];
      this.height = o.height || 18;
      this.len = o.len || [0.55, 1.5];
      this.speed = o.speed || [17, 27];
      this.wind = o.wind || [1.4, 0.4];
      this.color = o.color || '#b9d2f2';
      this.alpha = o.alpha === undefined ? 0.26 : o.alpha;
      const rnd = DIO.rng(o.seed || 11);
      this.drops = [];
      for (let i = 0; i < this.count; i++) {
        this.drops.push({
          x: (rnd() - 0.5) * this.area[0],
          z: (rnd() - 0.5) * this.area[1],
          y0: rnd() * this.height,
          sp: lerp(this.speed[0], this.speed[1], rnd()),
          ln: lerp(this.len[0], this.len[1], rnd())
        });
      }
      const pos = new Float32Array(this.count * 2 * 3);
      const nrm = new Float32Array(this.count * 2 * 3);
      const uvs = new Float32Array(this.count * 2 * 2);
      const idx = new Uint16Array(this.count * 2);
      for (let i = 0; i < this.count; i++) { idx[i * 2] = i * 2; idx[i * 2 + 1] = i * 2 + 1; }
      this.geometry = {
        positions: pos, normals: nrm, uvs: uvs, indices: idx,
        count: idx.length, indexType: 'uint16', mode: 'lines', dynamic: true
      };
      this.material = mat(this.color, { additive: true, unlit: true, alpha: this.alpha });
      this.mesh = G.mesh(this.geometry, this.material);
      this.node = new Node('rain');
      this.node.excludeReflect = true;
      this.node.attach(this.mesh);
      this.intensity = 1;
      this.update(0);
    }
    update(t) {
      const pos = this.geometry.positions;
      const H = this.height;
      const wx = this.wind[0], wz = this.wind[1];
      for (let i = 0; i < this.count; i++) {
        const d = this.drops[i];
        const travel = (d.y0 + d.sp * t) % (H + 2);
        const y = H - travel;
        const drift = travel / d.sp;
        const x = d.x + wx * drift * 0.55;
        const z = d.z + wz * drift * 0.55;
        const vx = wx, vy = -d.sp, vz = wz;
        const vl = Math.hypot(vx, vy, vz) || 1;
        const k = d.ln / vl;
        pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
        pos[i * 6 + 3] = x - vx * k; pos[i * 6 + 4] = y - vy * k; pos[i * 6 + 5] = z - vz * k;
      }
      this.geometry.dirty = true;
    }
  }
  DIO.Rain = Rain;

  class Flakes {
    constructor(o) {
      o = o || {};
      this.count = o.count || 320;
      this.area = o.area || [26, 20];
      this.height = o.height || 12;
      this.size = o.size || [0.09, 0.2];
      this.speed = o.speed || [0.7, 1.6];
      this.sway = o.sway || [0.5, 1.6];
      this.swayFreq = o.swayFreq || [0.4, 1.1];
      this.spin = o.spin || [-2.4, 2.4];
      this.tint = o.color || '#ffc6dd';
      this.alpha = o.alpha === undefined ? 0.95 : o.alpha;
      this.uvRect = o.uv || null;
      this.material = mat(this.tint, {
        alpha: this.alpha,
        unlit: o.unlit !== false,
        additive: !!o.additive,
        tex: !!this.uvRect,
        texAlpha: !!this.uvRect,
        spec: 0
      });
      const rnd = DIO.rng(o.seed || 23);
      this.items = [];
      for (let i = 0; i < this.count; i++) {
        this.items.push({
          x: (rnd() - 0.5) * this.area[0],
          z: (rnd() - 0.5) * this.area[1],
          y0: rnd() * this.height,
          sp: lerp(this.speed[0], this.speed[1], rnd()),
          sz: lerp(this.size[0], this.size[1], rnd()),
          amp: lerp(this.sway[0], this.sway[1], rnd()),
          frq: lerp(this.swayFreq[0], this.swayFreq[1], rnd()),
          ph: rnd() * 6.283,
          spin: lerp(this.spin[0], this.spin[1], rnd()),
          spin2: rnd() * 6.283
        });
      }
      const pos = new Float32Array(this.count * 4 * 3);
      const nrm = new Float32Array(this.count * 4 * 3);
      const uvs = new Float32Array(this.count * 4 * 2);
      const idx = new Uint16Array(this.count * 6);
      const U = this.uvRect || [0, 0, 1, 1];
      for (let i = 0; i < this.count; i++) {
        const u0 = U[0], v0 = U[1], u1 = U[2], v1 = U[3];
        uvs[i * 8] = u0; uvs[i * 8 + 1] = v0;
        uvs[i * 8 + 2] = u1; uvs[i * 8 + 3] = v0;
        uvs[i * 8 + 4] = u1; uvs[i * 8 + 5] = v1;
        uvs[i * 8 + 6] = u0; uvs[i * 8 + 7] = v1;
        idx[i * 6] = i * 4; idx[i * 6 + 1] = i * 4 + 1; idx[i * 6 + 2] = i * 4 + 2;
        idx[i * 6 + 3] = i * 4; idx[i * 6 + 4] = i * 4 + 2; idx[i * 6 + 5] = i * 4 + 3;
      }
      this.geometry = {
        positions: pos, normals: nrm, uvs: uvs, indices: idx,
        count: idx.length, indexType: 'uint16', mode: 'triangles', dynamic: true
      };
      this.mesh = G.mesh(this.geometry, this.material);
      this.node = new Node('flakes');
      this.node.excludeReflect = true;
      this.node.attach(this.mesh);
      this.update(0);
    }
    update(t) {
      const pos = this.geometry.positions;
      const H = this.height;
      for (let i = 0; i < this.count; i++) {
        const f = this.items[i];
        const p = (f.y0 + f.sp * t) % H;
        const y = H - p;
        const sway = Math.sin(t * f.frq + f.ph) * f.amp;
        const x = f.x + sway;
        const z = f.z + Math.cos(t * f.frq * 0.73 + f.ph) * f.amp * 0.7;
        const a = t * f.spin + f.spin2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const b = t * f.spin * 0.63 + f.ph;
        const cb = Math.cos(b) * 0.75, sb = Math.sin(b) * 0.75;
        const s = f.sz;
        // local quad corners: (u,v) in [-1,1] * s, tilted by two rotations
        const corners = [
          [-1, -1], [1, -1], [1, 1], [-1, 1]
        ];
        for (let k = 0; k < 4; k++) {
          let lx = corners[k][0] * s, ly = corners[k][1] * s;
          // rotate in local xy
          let rx = lx * ca - ly * sa;
          let ry = lx * sa + ly * ca;
          // tilt around x axis using cb/sb
          const wy = ry * cb;
          const wz = ry * sb + cb * 0;
          const o = i * 12 + k * 3;
          pos[o] = x + rx;
          pos[o + 1] = y + wy;
          pos[o + 2] = z + wz * 0.4;
        }
      }
      this.geometry.dirty = true;
    }
  }
  DIO.Flakes = Flakes;

  /* soft additive glow card (camera independent, faces +z or given rotation) */
  DIO.glow = function (batch, color, size, pos, rot, alpha, radial) {
    const m = DIO.glow.material(color, alpha, radial);
    batch.plane(m, size[0], size[1], pos, rot);
    return m;
  };
  const glowCache = {};
  DIO.glow.material = function (color, alpha, radial) {
    const key = color + '|' + alpha + '|' + (radial === false ? 0 : 1);
    if (!glowCache[key]) {
      glowCache[key] = mat(color, {
        additive: true, unlit: true, radial: radial === false ? false : true,
        alpha: alpha === undefined ? 0.5 : alpha, spec: 0
      });
    }
    return glowCache[key];
  };

  /* soft contact-shadow card: dark, radial alpha, normal (non-additive) blend */
  const shadowCache = {};
  DIO.shadow = {};
  DIO.shadow.material = function (alpha) {
    const key = 'a' + (alpha === undefined ? 0.5 : alpha);
    if (!shadowCache[key]) {
      shadowCache[key] = mat('#05070b', {
        unlit: true, radial: true, alpha: alpha === undefined ? 0.5 : alpha, spec: 0
      });
    }
    return shadowCache[key];
  };
})(typeof window !== 'undefined' ? window : globalThis);
