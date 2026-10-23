/* ============================================================
   SAKURA STATION / 桜坂駅 — spring railway diorama
   bright cartoon low-poly diorama:
     single track (tunnel left -> crossing right), platform + canopy
     + station house, 2-car commuter train (analytic shuttle loop),
     cherry blossom trees, fields, houses, power poles, clouds.
   scene id: 'sakura'
   ============================================================ */
(function (global) {
  'use strict';

  const DIO = global.DIO;
  const G = DIO.G;
  const mat = G.mat;
  const lerp = DIO.lerp;
  const clamp = DIO.clamp;

  /* ---------------------------------------------------------
     track frame
     u = along the track (left tunnel -> right crossing)
     v = lateral, +v = toward the camera side
     --------------------------------------------------------- */
  const TA = -0.2915;                       // track yaw (rad)
  const CA = Math.cos(TA), SA = Math.sin(TA); // track direction (x, z)
  const E2X = -SA, E2Z = CA;                 // lateral normal (x, z)
  const OX = 0, OZ = -0.1;
  const RY = Math.atan2(-SA, CA);            // rotates +x onto the track dir
  const CROSS_U = 8.2;
  const PORTAL_L = -9.85;                    // facade centre along u
  const PORTAL_R = 11.85;
  const PLAT_U = -1.2, PLAT_V = -2.8;

  const px = (u, v) => OX + CA * u + E2X * v;
  const pz = (u, v) => OZ + SA * u + E2Z * v;
  const tw = (u, v, y) => [px(u, v), y || 0, pz(u, v)];
  const ryDir = (dx, dz) => Math.atan2(-dz, dx);     // yaw whose +x points to (dx,dz)
  const ryNormal = (nx, nz) => Math.atan2(nx, nz);   // yaw whose +z normal is (nx,nz)

  /* world position inside a yawed building frame */
  function fw(bx, bz, a, lx, ly, lz) {
    const c = Math.cos(a), s = Math.sin(a);
    return [bx + c * lx + s * lz, ly, bz - s * lx + c * lz];
  }
  /* yaw of a local frame helper */
  function frameRy(a) { return a; }

  /* =========================================================
     ATLAS
     ========================================================= */
  const atlas = DIO.atlas(2048, 1024);

  /* station name board: 桜坂駅 / SAKURAZAKA */
  atlas.define('sign_station', 768, 187, function (ctx, w, h) {
    ctx.fillStyle = '#f8f4e8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4d8f66';
    ctx.fillRect(0, 0, w, 30);
    DIO.text(ctx, 'SAKURAZAKA  STATION', {
      x: 24, y: 16, size: 18, weight: 600, color: '#f4fbef', letterSpacing: 6.5, font: DIO.fonts.en
    });
    // station number chip
    DIO.roundRect(ctx, w - 126, 44, 96, 36, 8, '#4d8f66');
    DIO.text(ctx, 'S-03', { x: w - 78, y: 62, size: 21, weight: 700, color: '#f4fbef', align: 'center', font: DIO.fonts.en, letterSpacing: 2 });
    // big name
    DIO.text(ctx, '桜坂', { x: 24, y: 96, size: 112, weight: 700, color: '#2e3237' });
    DIO.text(ctx, 'さくらざか', { x: 294, y: 82, size: 33, weight: 500, color: '#565c64' });
    DIO.text(ctx, 'SAKURAZAKA', {
      x: 296, y: 126, size: 24, weight: 600, color: '#787e86', letterSpacing: 4, font: DIO.fonts.en
    });
    // bottom accent
    ctx.fillStyle = '#4d8f66';
    ctx.fillRect(0, h - 14, w, 14);
    DIO.roundRect(ctx, 0, 0, w, h, 6, null, '#d7d1bf', 4);
  });

  /* small kiosk sign */
  atlas.define('sign_kiosk', 480, 150, function (ctx, w, h) {
    ctx.fillStyle = '#f7eed8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b8483f';
    ctx.fillRect(0, 0, w, 26);
    ctx.fillRect(0, h - 18, w, 18);
    DIO.text(ctx, 'さくら茶屋', { x: 26, y: 78, size: 62, weight: 700, color: '#5a3527' });
    DIO.text(ctx, 'SAKURA KIOSK', {
      x: 30, y: 124, size: 18, weight: 600, color: '#9b7a5e', letterSpacing: 5, font: DIO.fonts.en
    });
    DIO.star(ctx, w - 52, 76, 26, 11, 5, '#d98a3c');
  });

  /* vending machine face */
  atlas.define('vend', 240, 380, function (ctx, w, h) {
    DIO.noiseFill(ctx, w, h, '#e9edf2', 0.05, 9);
    ctx.fillStyle = '#cfd7e0';
    ctx.fillRect(10, 12, w - 20, 74);
    DIO.text(ctx, 'つめた〜い', { x: w / 2, y: 50, size: 20, weight: 700, color: '#3f7fc4', align: 'center' });
    const cols = ['#e8443c', '#3fa863', '#3c7fe0', '#f2b13c', '#e8609a', '#efefef'];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = cols[(r * 2 + c) % cols.length];
        DIO.roundRect(ctx, 20 + c * 70, 104 + r * 62, 52, 44, 5, cols[(r * 2 + c) % cols.length]);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(24 + c * 70, 112 + r * 62, 44, 7);
      }
    }
    ctx.fillStyle = '#2a2e36';
    ctx.fillRect(14, h - 74, w - 28, 34);
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(w - 62, h - 52, 34, 8);
    ctx.fillStyle = '#3a3f48';
    ctx.fillRect(14, h - 32, 96, 22);
  });

  /* clock face */
  atlas.define('clock', 160, 160, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f9f6ec';
    ctx.beginPath(); ctx.arc(80, 80, 74, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4a4f57'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(80, 80, 70, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const r0 = i % 3 === 0 ? 50 : 58, r1 = 66;
      ctx.strokeStyle = '#3d424a';
      ctx.lineWidth = i % 3 === 0 ? 6 : 3;
      ctx.beginPath();
      ctx.moveTo(80 + Math.cos(a) * r0, 80 + Math.sin(a) * r0);
      ctx.lineTo(80 + Math.cos(a) * r1, 80 + Math.sin(a) * r1);
      ctx.stroke();
    }
    // 10:10
    ctx.strokeStyle = '#2c3138'; ctx.lineCap = 'round';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(80, 80); ctx.lineTo(80 + Math.cos(-Math.PI * 0.67) * 40, 80 + Math.sin(-Math.PI * 0.67) * 40); ctx.stroke();
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(80, 80); ctx.lineTo(80 + Math.cos(-Math.PI * 0.12) * 56, 80 + Math.sin(-Math.PI * 0.12) * 56); ctx.stroke();
    ctx.fillStyle = '#c0564a';
    ctx.beginPath(); ctx.arc(80, 80, 7, 0, Math.PI * 2); ctx.fill();
  });

  /* petal (flakes) */
  atlas.define('petal', 64, 64, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffc4d9';
    ctx.beginPath();
    ctx.ellipse(32, 32, 15, 21, 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe0ea';
    ctx.beginPath();
    ctx.ellipse(28, 27, 7, 10, 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f79cbe';
    ctx.beginPath();
    ctx.ellipse(38, 38, 3.5, 6, 0.55, 0, Math.PI * 2);
    ctx.fill();
  });

  /* train destination LED */
  atlas.define('train_dest', 300, 92, function (ctx, w, h) {
    ctx.fillStyle = '#1b1d22';
    ctx.fillRect(0, 0, w, h);
    DIO.text(ctx, '桜坂', { x: 22, y: 42, size: 46, weight: 700, color: '#ffcf5e' });
    DIO.text(ctx, 'SAKURAZAKA', {
      x: 118, y: 42, size: 17, weight: 600, color: '#ffd97e', font: DIO.fonts.en, letterSpacing: 2
    });
    DIO.text(ctx, '各停 快速', { x: 22, y: 76, size: 15, weight: 600, color: '#f2c96a' });
  });

  /* spring poster */
  atlas.define('poster', 200, 260, function (ctx, w, h) {
    DIO.noiseFill(ctx, w, h, '#fdf3ea', 0.04, 21);
    ctx.fillStyle = '#f6c9dc';
    ctx.fillRect(12, 12, w - 24, 116);
    // blossom silhouettes
    const rnd = DIO.rng(5);
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 ? '#ffd7e6' : '#ffbcd4';
      ctx.beginPath();
      ctx.arc(24 + rnd() * (w - 48), 26 + rnd() * 88, 7 + rnd() * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#4d8f66';
    ctx.fillRect(12, 142, w - 24, 5);
    DIO.text(ctx, 'さくら', { x: w / 2, y: 180, size: 44, weight: 700, color: '#b8485c', align: 'center' });
    DIO.text(ctx, 'まつり', { x: w / 2, y: 224, size: 30, weight: 700, color: '#5a4048', align: 'center' });
  });

  /* railway crossing sign */
  atlas.define('cross_sign', 220, 220, function (ctx, w, h) {
    DIO.roundRect(ctx, 4, 4, w - 8, h - 8, 16, '#fbf7ea');
    DIO.roundRect(ctx, 4, 4, w - 8, h - 8, 16, null, '#d5473b', 10);
    DIO.text(ctx, '踏切', { x: w / 2, y: 86, size: 62, weight: 700, color: '#33373c', align: 'center' });
    DIO.text(ctx, '注意', { x: w / 2, y: 152, size: 36, weight: 700, color: '#d5473b', align: 'center' });
    DIO.roundRect(ctx, 26, 176, w - 52, 20, 6, '#33373c');
  });

  /* =========================================================
     SCENE
     ========================================================= */
  /* =========================================================
     ENGINE TONE COMPENSATION
     renderer applies  T1(x)=x/(x+0.82)*1.62  (mesh / ground shader)
     and then composite  T2(x)=x/(x+0.92)*1.66.  Materials are
     pre-compensated so the *design* colours survive on screen.
     ========================================================= */
  function invT1(v) {
    const s = Math.max(0, Math.min(0.998, v));
    return s * 0.82 / Math.max(1.62 - s, 1e-3);
  }
  function invT2(v) {
    const s = Math.max(0, Math.min(0.998, v));
    return s * 0.92 / Math.max(1.66 - s, 1e-3);
  }
  function clamp01v(v) { return Math.max(0, Math.min(1, v)); }
  /* power-law pre-darkening: keeps hue, keeps light pastels from clipping */
  const GRADE_GAMMA = 1.7;
  function gradeArr(c) {
    return [
      clamp01v(Math.pow(Math.max(0, c[0]), GRADE_GAMMA)),
      clamp01v(Math.pow(Math.max(0, c[1]), GRADE_GAMMA)),
      clamp01v(Math.pow(Math.max(0, c[2]), GRADE_GAMMA))
    ];
  }
  /* material colour that renders as `hex` on a lit surface */
  function grade(hex) { return gradeArr(G.rgb(hex)); }
  /* sky shader has no internal tonemap: only the composite pass applies */
  function gradeSky(hex) {
    const c = G.rgb(hex);
    return [clamp01v(invT2(c[0])), clamp01v(invT2(c[1])), clamp01v(invT2(c[2]))];
  }
  const SKY_KEYS = ['top', 'mid', 'bot', 'glowACol', 'glowBCol', 'hazeColor', 'cloudColor'];
  function gradeEnv(src) {
    const out = JSON.parse(JSON.stringify(src));
    for (const k of SKY_KEYS) out.sky[k] = gradeSky(src.sky[k]);
    out.ground.color = grade(src.ground.color);
    out.ground.puddle = grade(src.ground.puddle);
    out.ground.tint = grade(src.ground.tint);
    return out;
  }

  /* =========================================================
     SCENE
     ========================================================= */
  const envBase = {
    sky: {
      top: '#dfa8d4', mid: '#fbdde7', bot: '#fff6e6',
      glowAPos: [0.855, 0.875], glowACol: '#ffe0b0', glowASize: 0.1,
      glowBPos: [0.10, 0.55], glowBCol: '#ffc0da', glowBSize: 0.26,
      haze: 0.2, hazeColor: '#ffe6c8', stars: 0.0,
      clouds: 0.18, cloudColor: '#fff8ee', exposure: 1.0
    },
    key: { dir: [0.20, 0.85, 0.48], color: '#f2d6b4' },
    fill: { dir: [-0.60, 0.25, -0.50], color: '#7a5563' },
    ambient: '#4a4457',
    rim: { color: '#ffd9f0', strength: 0.34 },
    fog: { near: 80, far: 190, color: '#f6e4e8' },
    ground: {
      size: [28, 18], center: [0, 0],
      color: '#83c43f', puddle: '#79bd30', tint: '#ffe2ee',
      wet: 0.18, reflect: 0.34
    },
    reflection: 0.28,
    bloom: 0.42,
    bloomThreshold: 0.82,
    vignette: 0.28,
    grain: 0.012,
    exposure: 1.0
  };

  DIO.registerScene({
    id: 'sakura',
    title: '樱花车站',
    subtitle: 'SAKURAZAKA STATION · SPRING DIORAMA',
    atlas: atlas,
    env: gradeEnv(envBase),

      views: [
      { label: '全景', az: 1.05, el: 0.43, radius: 35, target: [1.4, 2.6, -0.2] },
      { label: '站台', az: 1.24, el: 0.25, radius: 22, target: [-3.2, 2.4, -1.0] },
      { label: '道口', az: -0.20, el: 0.33, radius: 17, target: [7.4, 1.6, -2.2] },
      { label: '樱花', az: 0.82, el: 0.20, radius: 17, target: [-6.2, 3.2, 5.2] },
      { label: '俯拍', az: 0.90, el: 0.96, radius: 38, target: [0.4, 1.3, -0.4] }
    ],

    build: function () {
      const root = DIO.node('sakura-root');
      const b = new DIO.Batch();

      /* ---------------- materials ---------------- */
      const M = {
        grassSide: mat('#68a838'),
        dirt: mat('#7d5c3e'),
        dirtDark: mat('#63482f'),
        rock: mat('#63605a'),

        ballast: mat('#ac9d84', { spec: 0.04 }),
        ballast2: mat('#93856c'),
        sleeper: mat('#6b4c35'),
        rail: mat('#c6ccd6', { spec: 0.7 }),
        railDark: mat('#737a84', { spec: 0.35 }),

        deck: mat('#524f4b'),
        deckLine: mat('#f2eddf', { unlit: true }),
        asphalt: mat('#63676e', { spec: 0.08 }),
        roadLine: mat('#f2eddf', { unlit: true }),

        concrete: mat('#bbb4a4'),
        platform: mat('#c8c0af'),
        platformTop: mat('#ded7c5'),
        platformEdge: mat('#efe8d6'),
        yellow: mat('#f0bf35', { unlit: true }),

        stone: mat('#9c9689'),
        stoneDark: mat('#7f7a6e'),
        tunnelDark: mat('#121317', { unlit: true }),

        hill: mat('#5d9d36'),
        hill2: mat('#72b640'),
        hillFar: mat('#9cc77c'),
        bush: mat('#4d8d2e'),
        bush2: mat('#69ab38'),

        trunk: mat('#432c1f'),
        branch: mat('#553826'),
        blossomA: mat('#f29dbe'),
        blossomB: mat('#dd7fa3'),
        blossomC: mat('#f7b3cc'),
        blossomD: mat('#c96a8f'),

        canopyRoof: mat('#9ec3bb'),
        canopyRoofDark: mat('#6d968e'),
        canopyUnder: mat('#e6dfcd'),
        column: mat('#cfc9b8'),

        wall: mat('#eee5d1'),
        wall2: mat('#ddcfb4'),
        plaster: mat('#f6f0e0'),
        wood: mat('#7c5836'),
        woodDark: mat('#5d412c'),
        roofTeal: mat('#40767e'),
        roofTeal2: mat('#315e66'),
        roofBrown: mat('#6d5847'),
        roofGrey: mat('#68747a'),

        glass: mat('#a9c8d8', { alpha: 0.30, spec: 0.6 }),
        winDark: mat('#3a5060'),
        doorGlass: mat('#6c97a6', { spec: 0.5 }),

        metal: mat('#8d939c', { spec: 0.45 }),
        metalDark: mat('#474c53'),
        black: mat('#26272b'),
        white: mat('#f4efe1'),
        red: mat('#c9402f'),
        barrierRed: mat('#d94a38'),
        barrierWhite: mat('#f3eee0'),

        trainBody: mat('#f2efe6', { spec: 0.3 }),
        trainStripe: mat('#d9537f'),
        trainRoof: mat('#a8a69e'),
        trainDark: mat('#33383e'),
        trainSkirt: mat('#41464c'),
        trainWin: mat('#2c4757', { spec: 0.18 }),
        trainLight: mat('#fff3cf', { emissive: '#fff0be', emissiveStrength: 1.5 }),

        fencePost: mat('#ded7c3'),
        fenceRail: mat('#c3baa6'),
        pole: mat('#7d7466'),
        poleDark: mat('#5a544b'),
        wire: mat('#37353c', { unlit: true }),

        soil: mat('#7a5b3e'),
        crop: mat('#83c04c'),
        crop2: mat('#6aa83a'),

        cloud: mat('#fffaf4'),
        flowerW: mat('#fffdf5'),
        flowerY: mat('#ffd75e'),
        rock2: mat('#8e897e'),
        water: mat('#7fb8c8', { spec: 0.72 }),
        pondBank: mat('#b6b0a0'),
        reed: mat('#6f9c3e'),

        tex: mat('#ffffff', { unlit: true, tex: true }),
        lampGlow: mat('#fff1cd', { emissive: '#ffe7b4', emissiveStrength: 1.1 }),
        redLamp: mat('#ff6a55', { emissive: '#ff3222', emissiveStrength: 1.7 }),
        greenLamp: mat('#7fe0a2', { emissive: '#3ad27c', emissiveStrength: 1.3 }),
        amberLamp: mat('#ffd27a', { emissive: '#ff9f2e', emissiveStrength: 1.2 }),

        shadow: mat('#060810', { unlit: true, radial: true, alpha: 0.5 }),
        softShadow: mat('#060810', { unlit: true, radial: true, alpha: 0.38 }),
        cat: mat('#e9dfcd'),
        catPat: mat('#b98a5e'),

        glowWarm: mat('#ffe2b0', { additive: true, unlit: true, radial: true, alpha: 0.42 }),
        glowLamp: mat('#fff0c8', { additive: true, unlit: true, radial: true, alpha: 0.34 }),
        glowRed: mat('#ff6b57', { additive: true, unlit: true, radial: true, alpha: 0.55 }),
        glowHead: mat('#fff4d2', { additive: true, unlit: true, radial: true, alpha: 0.55 })
      };

      /* pre-compensate base/emissive colours for the engine's double tonemap */
      for (const k in M) {
        const m = M[k];
        if (!m || !m.color) continue;
        m.color = gradeArr(m.color);
        if (m.emissive) m.emissive = gradeArr(m.emissive);
      }
      /* gentle self-lift on the brightest surfaces so whites stay bright */
      (function liftWhites() {
        const lift = (name, s) => {
          if (!M[name]) return;
          M[name].emissive = [1, 1, 1];
          M[name].emissiveStrength = s;
        };
        lift('wall', 0.16); lift('plaster', 0.18); lift('trainBody', 0.2);
        lift('white', 0.12); lift('platformTop', 0.12); lift('platformEdge', 0.14);
        lift('concrete', 0.08); lift('column', 0.1); lift('platform', 0.06);
        lift('blossomC', 0.05);
        if (M.tex) { M.tex.emissive = [1, 1, 1]; M.tex.emissiveStrength = 0.34; }
        if (M.lampGlow) { M.lampGlow.emissive = [1, 0.95, 0.8]; M.lampGlow.emissiveStrength = 1.4; }
      })();

      const uv = {
        station: atlas.uv('sign_station'),
        kiosk: atlas.uv('sign_kiosk'),
        vend: atlas.uv('vend'),
        clock: atlas.uv('clock'),
        petal: atlas.uv('petal'),
        dest: atlas.uv('train_dest'),
        poster: atlas.uv('poster'),
        cross: atlas.uv('cross_sign')
      };

      /* =========================================================
         BASE (grass cap + soil + rock cut)
         ========================================================= */
      b.box(M.grassSide, [28, 0.5, 18], [0, -0.27, 0]);
      b.box(M.dirt, [27.9, 1.35, 17.9], [0, -1.19, 0]);
      b.box(M.dirtDark, [27.8, 0.55, 17.8], [0, -2.14, 0]);
      b.box(M.rock, [27.7, 0.42, 17.7], [0, -2.62, 0]);
      // thin grass lip so the cut edge reads as sod
      b.box(M.hill, [28.06, 0.10, 18.06], [0, -0.10, 0]);

      /* =========================================================
         TRACK
         ========================================================= */
      // ballast bed
      b.box(M.ballast, [28.6, 0.36, 2.75], tw(0, 0, 0.18), [0, RY, 0]);
      b.box(M.ballast2, [27.0, 0.06, 2.08], tw(0, 0, 0.375), [0, RY, 0]);
      // sleepers
      for (let u = -13.5; u <= 13.5; u += 0.66) {
        b.box(M.sleeper, [0.22, 0.12, 2.5], tw(u, 0, 0.44), [0, RY, 0]);
      }
      // rails
      for (const v of [-0.72, 0.72]) {
        b.box(M.railDark, [27.6, 0.1, 0.16], tw(0, v, 0.52), [0, RY, 0]);
        b.box(M.rail, [27.6, 0.09, 0.09], tw(0, v, 0.60), [0, RY, 0]);
      }

      /* =========================================================
         CROSSING (road / deck / signals / barriers)
         ========================================================= */
      const ROAD_W = 5.6;
      // road runs across the track along e2
      b.box(M.asphalt, [ROAD_W, 0.05, 16.2], tw(CROSS_U, 2.3, 0.025), [0, RY, 0]);
      // white edge lines
      for (const s of [-1, 1]) {
        b.box(M.roadLine, [0.12, 0.02, 15.9], tw(CROSS_U + s * (ROAD_W / 2 - 0.22), 2.3, 0.062), [0, RY, 0]);
      }
      // dashed centre line
      for (let v = -4.6; v < 9.4; v += 2.2) {
        b.box(M.roadLine, [0.13, 0.02, 1.1], tw(CROSS_U, v, 0.062), [0, RY, 0]);
      }
      // stop lines
      b.box(M.roadLine, [ROAD_W / 2 - 0.2, 0.02, 0.28], tw(CROSS_U - 1.35, 4.1, 0.062), [0, RY, 0]);
      b.box(M.roadLine, [ROAD_W / 2 - 0.2, 0.02, 0.28], tw(CROSS_U + 1.35, -3.1, 0.062), [0, RY, 0]);
      // crossing deck over the rails
      b.box(M.deck, [ROAD_W, 0.16, 3.0], tw(CROSS_U, 0, 0.43), [0, RY, 0]);
      for (let i = 0; i < 4; i++) {
        b.box(M.deckLine, [ROAD_W - 0.5, 0.02, 0.2], tw(CROSS_U, -1.05 + i * 0.72, 0.515), [0, RY, 0]);
      }
      // ramps from road level up to the deck
      for (const s of [-1, 1]) {
        const v0 = s * 1.55, v1 = s * 2.75, y0 = 0.51, y1 = 0.06;
        const p0 = tw(CROSS_U - ROAD_W / 2, v0, y0), p1 = tw(CROSS_U + ROAD_W / 2, v0, y0);
        const p2 = tw(CROSS_U + ROAD_W / 2, v1, y1), p3 = tw(CROSS_U - ROAD_W / 2, v1, y1);
        b.quadN(M.asphalt, p0, p1, p2, p3, [0, 1, 0]);
      }

      /* ------- crossing posts, lights and barrier arms ------- */
      const barNodes = [];
      function crossPost(u, v, armToU, armYaw) {
        const pos = tw(u, v, 0);
        // black / white striped pole
        const segs = 8;
        for (let i = 0; i < segs; i++) {
          b.box(i % 2 ? M.barrierWhite : M.barrierRed,
            [0.19, 0.30, 0.19], [pos[0], 0.16 + i * 0.30, pos[2]], [0, RY, 0]);
        }
        // lamp housing + red lamps
        for (const dy of [0, -0.42]) {
          b.box(M.metalDark, [0.3, 0.26, 0.36], [pos[0], 2.78 + dy, pos[2]], [0, RY, 0]);
          b.disc(M.redLamp, 0.115, 10, tw(u, v + 0.19, 2.78 + dy), [0, RY, 0], 'z');
          b.plane(M.glowRed, 1.15, 1.15, tw(u, v + 0.22, 2.78 + dy));
        }
        // X crossbuck
        b.box(M.white, [0.06, 1.0, 0.1], [pos[0], 2.0, pos[2]], [0, RY, 0.6]);
        b.box(M.white, [0.06, 1.0, 0.1], [pos[0], 2.0, pos[2]], [0, RY, -0.6]);
        // sign board
        b.plane(M.tex, 0.66, 0.66, tw(u, v + 0.26, 1.35), [0, RY, 0], uv.cross);
        // barrier pivot node
        const yawNode = DIO.node('barrier-yaw');
        yawNode.position = tw(u, v, 1.02);
        yawNode.rotation = [0, armYaw, 0];
        const armNode = DIO.node('barrier-arm');
        const ab = new DIO.Batch();
        const armLen = 4.4, n = 8, step = armLen / n;
        for (let i = 0; i < n; i++) {
          ab.box(i % 2 ? M.barrierWhite : M.barrierRed,
            [step - 0.03, 0.1, 0.11], [step * (i + 0.5), 0, 0]);
        }
        ab.box(M.metalDark, [0.14, 0.14, 0.14], [0, 0, 0]);
        ab.finish(armNode);
        yawNode.add(armNode);
        root.add(yawNode);
        barNodes.push({ yaw: yawNode, arm: armNode, dir: armToU });
      }
      // front side barrier (arm along +track), back side (arm along -track)
      crossPost(CROSS_U - 2.75, 2.65, 1, RY);
      crossPost(CROSS_U + 2.75, -2.65, -1, ryDir(-CA, -SA));

      /* =========================================================
         TUNNEL PORTALS + HILLS
         ========================================================= */
      function archRing(m, uF, vc, cy, ri, ro, segs) {
        const u0 = uF + 0.32, u1 = uF + 0.48;
        for (let i = 0; i < segs; i++) {
          const a0 = (i / segs) * Math.PI, a1 = ((i + 1) / segs) * Math.PI;
          const q = (a, r, u) => tw(u, vc + Math.cos(a) * r, cy + Math.sin(a) * r);
          const p = [
            q(a0, ri, u0), q(a1, ri, u0), q(a1, ro, u0), q(a0, ro, u0),
            q(a0, ri, u1), q(a1, ri, u1), q(a1, ro, u1), q(a0, ro, u1)
          ];
          b.hull(m, p, [
            [0, 1, 2, 3], [4, 5, 6, 7],
            [0, 4, 5, 1], [3, 2, 6, 7],
            [0, 3, 7, 4], [1, 5, 6, 2]
          ]);
        }
      }
      function portal(uF, vc, wallW, wallH, openW, cy, ri) {
        const th = 0.5;
        const archTop = cy + ri;
        const sideW = (wallW - openW) / 2;
        // pillars
        b.box(M.stone, [th, wallH, sideW], tw(uF, vc - openW / 2 - sideW / 2, wallH / 2), [0, RY, 0]);
        b.box(M.stone, [th, wallH, sideW], tw(uF, vc + openW / 2 + sideW / 2, wallH / 2), [0, RY, 0]);
        // spandrel above arch
        b.box(M.stone, [th, wallH - archTop, openW], tw(uF, vc, (wallH + archTop) / 2), [0, RY, 0]);
        // wing walls (short, angled back into the hill)
        for (const s of [-1, 1]) {
          b.box(M.stoneDark, [1.5, wallH * 0.72, 0.45],
            tw(uF - 0.75, vc + s * (wallW / 2 + 0.15), wallH * 0.36), [0, RY, 0]);
        }
        archRing(M.stoneDark, uF, vc, cy, ri, ri + 0.34, 11);
        // dark interior
        b.box(M.tunnelDark, [2.6, archTop + 0.02, openW - 0.06],
          tw(uF - 1.5, vc, (archTop + 0.02) / 2), [0, RY, 0]);
        // warm tunnel lamps
        for (const s of [-1, 1]) {
          b.box(M.amberLamp, [0.09, 0.16, 0.09], tw(uF - 1.35, vc + s * (openW / 2 - 0.3), 2.45), [0, RY, 0]);
        }
        b.plane(M.glowWarm, 1.6, 1.6, tw(uF - 1.3, vc, 2.2));
      }

      function hillPrism(uvPts, h, shrink, mTop, seed) {
        const bot = uvPts.map(p => tw(p[0], p[1], 0));
        let cx = 0, cz = 0;
        for (const p of bot) { cx += p[0]; cz += p[2]; }
        cx /= bot.length; cz /= bot.length;
        const top = bot.map(p => [cx + (p[0] - cx) * shrink, h, cz + (p[2] - cz) * shrink]);
        const pts = bot.concat(top);
        const n = bot.length;
        const faces = [top.map((_, i) => n + i)];
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          faces.push([i, j, n + j, n + i]);
        }
        b.hull(M.hill, pts, faces);
        // soft rounded crown
        const rnd = DIO.rng(seed || 3);
        for (let i = 0; i < 3; i++) {
          const rx = (rnd() - 0.5) * (h * 0.45);
          const rz = (rnd() - 0.5) * (h * 0.45);
          const r = h * (0.24 + rnd() * 0.12);
          b.blob(mTop || M.hill2, r, 8, 6, 0.3, seed * 17 + i,
            [cx + rx, h * (0.94 + rnd() * 0.1), cz + rz]);
        }
      }

      // left hill (behind the tunnel portal)
      hillPrism([
        [-10.1, -3.4], [-10.1, 3.4], [-13.4, 3.0],
        [-14.0, 0.2], [-13.3, -2.6], [-11.6, -3.6]
      ], 4.6, 0.45, M.hill2, 7);
      portal(PORTAL_L, 0, 5.8, 4.3, 2.9, 2.3, 1.45);

      // right hill (the track runs behind it and disappears)
      hillPrism([
        [11.5, -3.2], [11.5, 3.4], [14.0, 2.0], [14.1, -2.4]
      ], 4.2, 0.5, M.hill2, 11);
      // greenery on the right hill
      b.blob(M.bush, 0.95, 7, 5, 0.3, 91, [11.3, 1.0, 1.6], null, true);
      b.blob(M.bush2, 0.8, 7, 5, 0.3, 92, [13.1, 1.7, -2.6], null, true);
      b.blob(M.bush, 0.85, 7, 5, 0.3, 93, [11.9, 2.5, -3.4], null, true);
      b.blob(M.bush2, 0.7, 7, 5, 0.3, 94, [12.4, 3.1, 0.6], null, true);
      // trees/bushes hiding the track end
      b.blob(M.bush, 1.0, 7, 5, 0.3, 41, tw(12.6, 3.2, 0.9), null, true);
      b.blob(M.bush2, 0.8, 7, 5, 0.3, 42, tw(13.2, 0.4, 0.8), null, true);

      /* =========================================================
         PLATFORM + CANOPY
         ========================================================= */
      // slab
      b.box(M.platform, [11.2, 0.9, 2.9], tw(PLAT_U, PLAT_V, 0.45), [0, RY, 0]);
      b.box(M.platformTop, [11.0, 0.05, 2.8], tw(PLAT_U, PLAT_V, 0.925), [0, RY, 0]);
      b.box(M.platformEdge, [11.1, 0.1, 0.13], tw(PLAT_U, -1.42, 0.95), [0, RY, 0]);
      // tactile / warning line
      b.box(M.yellow, [10.7, 0.03, 0.16], tw(PLAT_U, -1.66, 0.965), [0, RY, 0]);
      // end caps and steps
      b.box(M.concrete, [0.35, 0.95, 2.9], tw(PLAT_U + 5.55, PLAT_V, 0.47), [0, RY, 0]);
      for (let i = 0; i < 3; i++) {
        b.box(M.concrete, [0.5, 0.28, 2.2], tw(PLAT_U - 5.7 - i * 0.5, PLAT_V, 0.72 - i * 0.24), [0, RY, 0]);
      }

      // canopy: sloped roof (high on the back side)
      const cU0 = -7.2, cU1 = 3.2, cVb = -3.95, cVf = -0.65;
      const cYb = 3.52, cYf = 3.2;
      (function canopy() {
        const pB = (u) => tw(u, cVb, cYb), pF = (u) => tw(u, cVf, cYf);
        const p0 = pB(cU0), p1 = pB(cU1), p2 = pF(cU1), p3 = pF(cU0);
        const nrm = G.norm(G.cross(G.vsub(p1, p0), G.vsub(p2, p0)));
        b.quadN(M.canopyRoof, p0, p1, p2, p3, nrm);
        // underside (facing down)
        const p0b = tw(cU0, cVb, cYb - 0.12), p1b = tw(cU1, cVb, cYb - 0.12);
        const p2b = tw(cU1, cVf, cYf - 0.12), p3b = tw(cU0, cVf, cYf - 0.12);
        b.quadN(M.canopyUnder, p3b, p2b, p1b, p0b, G.norm(G.cross(G.vsub(p2b, p3b), G.vsub(p1b, p3b))));
        // fascia along both long edges
        b.box(M.canopyRoofDark, [cU1 - cU0 + 0.4, 0.16, 0.12], tw((cU0 + cU1) / 2, cVb, cYb - 0.1), [0, RY, 0]);
        b.box(M.canopyRoofDark, [cU1 - cU0 + 0.4, 0.16, 0.12], tw((cU0 + cU1) / 2, cVf, cYf - 0.1), [0, RY, 0]);
        // ridge beam under roof
        b.box(M.wood, [cU1 - cU0, 0.13, 0.13], tw((cU0 + cU1) / 2, cVb + 0.55, cYb - 0.3), [0, RY, 0]);
        // columns
        const cols = [-6.6, -4.3, -2.0, 0.3, 2.6];
        for (const u of cols) {
          b.cyl(M.column, 0.085, 0.075, 2.3, 8, tw(u, -0.95, 2.05), null);
          b.box(M.column, [0.16, 0.16, 0.16], tw(u, -0.95, 3.16), [0, RY, 0]);
          // little bracket
          b.box(M.wood, [0.12, 0.12, 0.8], tw(u, -1.32, 3.08), [0, RY, 0]);
          b.plane(M.softShadow, 0.6, 0.6, tw(u, -0.95, 0.955), [-Math.PI / 2, 0, 0]);
        }
        // lamps under canopy
        for (const u of [-5.4, -2.0, 1.4]) {
          b.box(M.metalDark, [0.5, 0.07, 0.17], tw(u, -2.55, 3.06), [0, RY, 0]);
          b.box(M.lampGlow, [0.42, 0.05, 0.12], tw(u, -2.55, 3.0), [0, RY, 0]);
          b.plane(M.glowLamp, 0.9, 0.9, tw(u, -2.55, 2.9));
        }
      })();

      /* station name board mounted above the canopy fascia */
      (function stationSign() {
        const u = -1.9, v = -0.62, cy = 4.08;
        b.box(M.metal, [6.35, 1.6, 0.12], tw(u, v, cy), [0, RY, 0]);
        b.plane(M.tex, 6.05, 1.473, tw(u, v + 0.17, cy), [0, RY, 0], uv.station);
        b.plane(M.tex, 6.05, 1.473, tw(u, v - 0.17, cy), [0, RY + Math.PI, 0], uv.station);
        for (const s of [-1, 1]) {
          b.box(M.metalDark, [0.08, 0.9, 0.08], tw(u + s * 2.7, v, cy - 1.05), [0, RY, 0]);
        }
      })();

      /* platform clock */
      (function clock() {
        const u = 2.5, v = -3.9;
        b.cyl(M.metal, 0.06, 0.06, 2.1, 6, tw(u, v, 1.95));
        b.disc(M.metal, 0.34, 18, tw(u, v + 0.02, 2.78), [0, RY, 0], 'z');
        b.plane(M.tex, 0.62, 0.62, tw(u, v + 0.07, 2.78), [0, RY, 0], uv.clock);
      })();

      /* platform benches */
      function bench(u, v) {
        b.box(M.wood, [1.7, 0.09, 0.42], tw(u, v, 1.32), [0, RY, 0]);
        b.box(M.wood, [1.7, 0.42, 0.08], tw(u, v - 0.24, 1.58), [0, RY, 0]);
        for (const s of [-1, 1]) {
          b.box(M.metalDark, [0.07, 0.42, 0.4], tw(u + s * 0.7, v, 1.1), [0, RY, 0]);
        }
        b.plane(M.softShadow, 1.95, 0.75, tw(u, v, 0.955), [-Math.PI / 2, 0, RY]);
      }
      bench(-5.6, -3.6);
      bench(-0.5, -3.6);

      /* vending machine on the platform */
      (function vend() {
        const u = -6.85, v = -3.7;
        b.box(M.white, [1.15, 1.86, 0.78], tw(u, v, 1.855), [0, RY, 0]);
        b.plane(M.tex, 1.02, 1.69, tw(u, v + 0.47, 1.87), [0, RY, 0], uv.vend);
        b.box(M.metalDark, [1.2, 0.08, 0.84], tw(u, v, 2.76), [0, RY, 0]);
        b.plane(M.glowLamp, 0.8, 0.8, tw(u, v + 0.55, 1.9));
        b.plane(M.shadow, 1.7, 1.3, tw(u, v, 0.955), [-Math.PI / 2, 0, RY]);
      })();
      (function vend2() {
        const u = 3.7, v = -3.7;
        b.box(M.wall2, [1.0, 1.8, 0.72], tw(u, v, 1.82), [0, RY, 0]);
        b.plane(M.tex, 0.9, 1.62, tw(u, v + 0.45, 1.84), [0, RY, 0], uv.vend);
        b.box(M.metalDark, [1.05, 0.08, 0.78], tw(u, v, 2.68), [0, RY, 0]);
        b.plane(M.glowLamp, 0.7, 0.7, tw(u, v + 0.5, 1.86));
        b.plane(M.shadow, 1.5, 1.2, tw(u, v, 0.955), [-Math.PI / 2, 0, RY]);
      })();

      /* a little cat sitting by the vegetable patch */
      (function cat() {
        const p = [-1.0, 0.02, 4.45];
        b.sphere(M.cat, 0.15, 7, 5, [p[0], p[1] + 0.14, p[2]]);
        b.sphere(M.cat, 0.105, 7, 5, [p[0] + 0.03, p[1] + 0.32, p[2] + 0.07]);
        for (const s of [-1, 1]) {
          b.taper(M.catPat, 0.075, 0.05, 0.012, 0.012, 0.1,
            [p[0] + s * 0.06, p[1] + 0.42, p[2] + 0.07]);
        }
        b.cyl(M.catPat, 0.035, 0.018, 0.44, 5,
          [p[0] - 0.2, p[1] + 0.18, p[2] - 0.1], [0.55, 0, 0.2]);
        b.plane(M.softShadow, 0.55, 0.45, [p[0], 0.035, p[2]], [-Math.PI / 2, 0, 0]);
      })();

      /* small spring pond in the foreground */
      (function pond() {
        const x = -1.75, z = 8.15;
        b.disc(M.water, 0.5, 18, [x, 0.035, z], [-Math.PI / 2, 0, 0]);
        b.ringY(M.pondBank, 0.48, 0.64, 18, [x, 0.045, z]);
        for (let i = 0; i < 5; i++) {
          const a = i * 1.35 + 0.4;
          const rx = x + Math.cos(a) * 0.7, rz = z + Math.sin(a) * 0.46;
          b.cyl(M.reed, 0.016, 0.012, 0.4 + (i % 2) * 0.12, 4, [rx, 0.21, rz]);
        }
        b.blob(M.rock2, 0.14, 6, 4, 0.35, 77, [x + 0.55, 0.09, z + 0.26], null, true);
      })();

      /* =========================================================
         STATION HOUSE (station + kiosk)
         ========================================================= */
      (function stationHouse() {
        const hu = -7.4, hv = -6.8;
        const bx = px(hu, hv), bz = pz(hu, hv), a = RY;
        const LW = 5.6, LD = 4.2, WH = 2.7;
        // plinth + walls
        b.box(M.concrete, [LW + 0.25, 0.3, LD + 0.25], fw(bx, bz, a, 0, 0.15, 0), [0, a, 0]);
        b.box(M.wall, [LW, WH, LD], fw(bx, bz, a, 0, 0.3 + WH / 2, 0), [0, a, 0]);
        // wooden corner posts and beam
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            b.box(M.wood, [0.18, WH, 0.18], fw(bx, bz, a, sx * (LW / 2 - 0.09), 0.3 + WH / 2, sz * (LD / 2 - 0.09)), [0, a, 0]);
          }
        }
        b.box(M.wood, [LW + 0.1, 0.14, 0.12], fw(bx, bz, a, 0, 0.3 + WH - 0.07, LD / 2), [0, a, 0]);
        b.box(M.wood, [LW + 0.1, 0.14, 0.12], fw(bx, bz, a, 0, 0.3 + 0.9, LD / 2), [0, a, 0]);
        // gable roof
        (function roof() {
          const L = LW + 1.1, W = LD + 1.0, H = 1.35;
          const L2 = L / 2, W2 = W / 2;
          const pts = [
            [-L2, 0, -W2], [L2, 0, -W2], [L2, 0, W2], [-L2, 0, W2],
            [-L2, H, 0], [L2, H, 0]
          ];
          const faces = [[3, 2, 5, 4], [1, 0, 4, 5], [0, 3, 4], [2, 1, 5]];
          b.hull(M.roofTeal, pts, faces, fw(bx, bz, a, 0, 0.3 + WH, 0), [0, a, 0]);
          // ridge cap
          b.box(M.roofTeal2, [L + 0.1, 0.12, 0.22], fw(bx, bz, a, 0, 0.3 + WH + H, 0), [0, a, 0]);
        })();
        // front (towards the track) = local +z
        const fz = LD / 2 + 0.035;
        // sliding door
        b.box(M.woodDark, [1.35, 2.0, 0.1], fw(bx, bz, a, 0.3, 1.28, fz), [0, a, 0]);
        b.plane(M.doorGlass, 1.15, 1.8, fw(bx, bz, a, 0.3, 1.3, fz + 0.07), [0, a, 0]);
        // ticket window
        b.box(M.woodDark, [1.5, 1.0, 0.1], fw(bx, bz, a, -1.55, 1.62, fz), [0, a, 0]);
        b.plane(M.winDark, 1.3, 0.8, fw(bx, bz, a, -1.55, 1.62, fz + 0.07), [0, a, 0]);
        b.box(M.wood, [1.1, 0.1, 0.42], fw(bx, bz, a, -1.55, 1.06, fz + 0.2), [0, a, 0]);
        // poster + kiosk sign
        b.plane(M.tex, 0.62, 0.8, fw(bx, bz, a, -0.65, 1.75, fz + 0.04), [0, a, 0], uv.poster);
        b.box(M.woodDark, [2.1, 0.64, 0.09], fw(bx, bz, a, 1.55, 2.32, fz), [0, a, 0]);
        b.plane(M.tex, 1.98, 0.6, fw(bx, bz, a, 1.55, 2.32, fz + 0.07), [0, a, 0], uv.kiosk);
        // awning over the door
        const a0 = fw(bx, bz, a, -0.9, 2.42, LD / 2 + 0.02);
        const a1 = fw(bx, bz, a, 1.7, 2.42, LD / 2 + 0.02);
        const a2 = fw(bx, bz, a, 1.7, 2.18, LD / 2 + 0.95);
        const a3 = fw(bx, bz, a, -0.9, 2.18, LD / 2 + 0.95);
        b.quadN(M.roofTeal2, a0, a1, a2, a3, G.norm(G.cross(G.vsub(a1, a0), G.vsub(a2, a0))));
        // side windows (left wall, toward the tunnel)
        b.box(M.woodDark, [0.1, 1.05, 1.7], fw(bx, bz, a, -LW / 2 - 0.035, 1.72, 0.4), [0, a, 0]);
        b.plane(M.winDark, 1.5, 0.85, fw(bx, bz, a, -LW / 2 - 0.09, 1.72, 0.4), [0, ryNormal(-1, 0), 0]);
        // chimney-ish vent
        b.box(M.metalDark, [0.35, 0.5, 0.35], fw(bx, bz, a, -1.6, 0.3 + WH + 1.3, -0.8), [0, a, 0]);
        // contact shadow
        b.plane(M.shadow, 7.0, 5.0, fw(bx, bz, a, 0, 0.03, 0), [-Math.PI / 2, 0, a]);
      })();

      /* =========================================================
         HOUSES
         ========================================================= */
      function house(bx, bz, a, LW, LD, WH, roofH, wallM, roofM, seed) {
        b.box(M.concrete, [LW + 0.2, 0.22, LD + 0.2], fw(bx, bz, a, 0, 0.11, 0), [0, a, 0]);
        b.box(wallM, [LW, WH, LD], fw(bx, bz, a, 0, 0.22 + WH / 2, 0), [0, a, 0]);
        // roof
        const L = LW + 0.85, W = LD + 0.9, L2 = L / 2, W2 = W / 2;
        const pts = [
          [-L2, 0, -W2], [L2, 0, -W2], [L2, 0, W2], [-L2, 0, W2],
          [-L2, roofH, 0], [L2, roofH, 0]
        ];
        b.hull(roofM, pts, [[3, 2, 5, 4], [1, 0, 4, 5], [0, 3, 4], [2, 1, 5]], fw(bx, bz, a, 0, 0.22 + WH, 0), [0, a, 0]);
        b.box(M.roofGrey, [L + 0.06, 0.1, 0.2], fw(bx, bz, a, 0, 0.22 + WH + roofH, 0), [0, a, 0]);
        // front windows and door
        const fz = LD / 2 + 0.035;
        for (const lx of [-LW * 0.26, LW * 0.26]) {
          b.box(M.woodDark, [1.05, 0.95, 0.08], fw(bx, bz, a, lx, 1.35, fz), [0, a, 0]);
          b.plane(M.winDark, 0.88, 0.78, fw(bx, bz, a, lx, 1.35, fz + 0.06), [0, a, 0]);
        }
        b.box(M.woodDark, [0.95, 1.85, 0.1], fw(bx, bz, a, LW / 2 - 0.75, 1.14, fz), [0, a, 0]);
        b.plane(M.doorGlass, 0.78, 1.65, fw(bx, bz, a, LW / 2 - 0.75, 1.16, fz + 0.07), [0, a, 0]);
        // side window
        b.plane(M.winDark, 0.8, 0.7, fw(bx, bz, a, -LW / 2 - 0.04, 1.4, 0.3), [0, ryNormal(-1, 0), 0]);
        // eave shadow / contact
        b.plane(M.shadow, LW + 1.6, LD + 1.5, fw(bx, bz, a, 0, 0.028, 0), [-Math.PI / 2, 0, a]);
      }
      house(1.6, 6.0, 0.45, 3.6, 3.2, 2.35, 1.2, M.plaster, M.roofTeal, 5);
      house(2.6, -7.4, 0.18, 3.2, 2.8, 2.2, 1.1, M.wall2, M.roofTeal2, 3);

      /* =========================================================
         SAKURA TREES
         ========================================================= */
      function sakura(x, z, s, seed, baseY) {
        const by = baseY || 0;
        const rnd = DIO.rng(seed * 97 + 13);
        // trunk
        const th = 2.15 * s;
        b.cyl(M.trunk, 0.26 * s, 0.17 * s, th, 7, [x, by + th / 2, z]);
        b.cyl(M.trunk, 0.19 * s, 0.23 * s, 0.55 * s, 7, [x, by + th - 0.15 * s, z]);
        // branches
        const nb = 4;
        for (let i = 0; i < nb; i++) {
          const a = (i / nb) * Math.PI * 2 + rnd() * 0.8;
          const len = (1.0 + rnd() * 0.7) * s;
          const bx = x + Math.cos(a) * len * 0.55;
          const bz = z + Math.sin(a) * len * 0.55;
          b.cyl(M.branch, 0.14 * s, 0.06 * s, len * 1.3, 5,
            [bx, by + th + len * 0.38, bz], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]);
        }
        // dark inner mass under the blossoms (depth)
        b.blob(M.blossomD, 0.95 * s, 7, 5, 0.22, seed * 91 + 3,
          [x, by + th + 0.55 * s, z], null, true);
        // blossom clusters: low ones deeper pink, top ones light
        const mats = [M.blossomA, M.blossomC, M.blossomB, M.blossomA, M.blossomC, M.blossomB, M.blossomA];
        const n = 7 + Math.floor(rnd() * 2);
        const cy = by + th + 0.86 * s;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rnd() * 0.6;
          const rad = (0.4 + rnd() * 0.95) * s;
          const rr = (0.6 + rnd() * 0.46) * s;
          const px2 = x + Math.cos(a) * rad;
          const pz2 = z + Math.sin(a) * rad;
          const py = cy + (rnd() - 0.32) * 1.05 * s;
          const low = py < cy - 0.16 * s;
          b.blob(low ? M.blossomB : mats[i % mats.length], rr, 8, 6, 0.2, seed * 31 + i,
            [px2, py, pz2], null, true);
        }
        // lit crown cap
        b.blob(M.blossomA, 0.86 * s, 8, 6, 0.18, seed * 7 + 2,
          [x, cy + 0.3 * s, z], null, true);
        b.blob(M.blossomC, 0.58 * s, 7, 5, 0.2, seed * 13 + 5,
          [x - 0.35 * s, cy + 0.46 * s, z + 0.3 * s], null, true);
        // contact shadow
        b.plane(M.softShadow, 3.6 * s, 3.2 * s, [x, by + 0.025, z], [-Math.PI / 2, 0, 0]);
      }

      sakura(-7.0, 5.4, 1.3, 1);
      sakura(-8.6, -0.8, 1.0, 2);
      sakura(-9.6, 4.6, 1.1, 3, 1.7);
      sakura(12.0, 3.4, 1.2, 4);
      sakura(5.5, -4.5, 1.0, 5);
      sakura(-13.2, -4.2, 1.0, 6);

      /* =========================================================
         FIELD + FENCES + POLES + WIRES
         ========================================================= */
      (function field() {
        const fu = -4.91, fv = 5.21;        // foreground vegetable patch
        const bx = px(fu, fv), bz = pz(fu, fv), a = RY;
        const FW = 3.8, FD = 1.9;
        b.box(M.soil, [FW, 0.1, FD], fw(bx, bz, a, 0, 0.05, 0), [0, a, 0]);
        for (let i = 0; i < 4; i++) {
          const lz = -FD / 2 + 0.3 + i * 0.44;
          b.box(M.soil, [FW - 0.35, 0.13, 0.2], fw(bx, bz, a, 0, 0.12, lz), [0, a, 0]);
          for (let j = 0; j < 8; j++) {
            const lx = -FW / 2 + 0.32 + j * 0.45;
            b.blob((i + j) % 2 ? M.crop : M.crop2, 0.14, 5, 4, 0.3, i * 13 + j,
              fw(bx, bz, a, lx, 0.25, lz), null, true);
          }
        }
        // low fence around the field
        const pts = [
          fw(bx, bz, a, -FW / 2, 0, -FD / 2), fw(bx, bz, a, FW / 2, 0, -FD / 2),
          fw(bx, bz, a, FW / 2, 0, FD / 2), fw(bx, bz, a, -FW / 2, 0, FD / 2)
        ];
        for (let i = 0; i < 4; i++) fenceLine(pts[i], pts[(i + 1) % 4], 0.62, 1.3);
        b.plane(M.softShadow, FW + 0.8, FD + 0.6, fw(bx, bz, a, 0, 0.03, 0), [-Math.PI / 2, 0, a]);
      })();

      /* bicycle parked beside the foreground house */
      (function bicycle() {
        const x = 3.7, z = 7.3, yaw = 0.95;
        const c = Math.cos(yaw), sn = Math.sin(yaw);
        const P = (lx, ly, lz) => [x + c * lx + sn * lz, ly, z - sn * lx + c * lz];
        for (const lx of [-0.55, 0.55]) {
          b.tube(M.metalDark, 0.33, 0.07, 10, 'z', P(lx, 0.34, 0), [0, yaw, 0]);
          b.tube(M.metal, 0.075, 0.075, 8, 'z', P(lx, 0.34, 0), [0, yaw, 0]);
        }
        b.box(M.metal, [1.05, 0.045, 0.045], P(0, 0.62, 0), [0, yaw, 0]);
        b.box(M.metal, [0.045, 0.52, 0.045], P(-0.42, 0.4, 0), [0, yaw, 0.24]);
        b.box(M.metal, [0.045, 0.5, 0.045], P(0.42, 0.42, 0), [0, yaw, -0.2]);
        b.box(M.metal, [0.045, 0.58, 0.045], P(0.5, 0.63, 0), [0, yaw, 0]);
        b.box(M.metalDark, [0.04, 0.04, 0.44], P(0.5, 0.94, 0), [0, yaw, 0]);
        b.box(M.metalDark, [0.26, 0.05, 0.14], P(-0.36, 0.78, 0), [0, yaw, 0]);
        b.box(M.metal, [0.32, 0.24, 0.2], P(0.62, 0.68, 0), [0, yaw, 0]);
        b.plane(M.softShadow, 1.6, 0.9, [x, 0.03, z], [-Math.PI / 2, 0, yaw]);
      })();

      function fenceLine(a, bpt, h, step) {        const dx = bpt[0] - a[0], dz = bpt[2] - a[2];
        const len = Math.hypot(dx, dz);
        const n = Math.max(2, Math.round(len / step));
        const yaw = ryDir(dx, dz);
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          b.box(M.fencePost, [0.085, h, 0.085], [a[0] + dx * t, h / 2, a[2] + dz * t], [0, yaw, 0]);
        }
        for (const y of [h * 0.55, h - 0.1]) {
          b.box(M.fenceRail, [len, 0.07, 0.055],
            [a[0] + dx / 2, y, a[2] + dz / 2], [0, yaw, 0]);
        }
      }
      // trackside fence (front side, between platform end and crossing)
      fenceLine(tw(-8.0, 1.9, 0), tw(-3.4, 1.9, 0), 0.92, 1.6);
      fenceLine(tw(-2.9, 1.9, 0), tw(4.6, 1.9, 0), 0.92, 1.6);
      // fence along the back of the platform area
      fenceLine(tw(-8.6, -4.7, 0), tw(-6.2, -4.7, 0), 0.9, 1.5);
      fenceLine(tw(4.2, -4.7, 0), tw(6.6, -4.7, 0), 0.9, 1.5);

      function pole(x, z, h) {
        b.cyl(M.pole, 0.15, 0.11, h, 8, [x, h / 2, z]);
        // crossarms
        for (let i = 0; i < 2; i++) {
          const y = h - 0.5 - i * 0.55;
          b.box(M.poleDark, [1.7, 0.09, 0.1], [x, y, z]);
          for (const s of [-1, 0.0, 1]) {
            b.cyl(M.white, 0.055, 0.045, 0.16, 6, [x + s * 0.7, y + 0.14, z]);
          }
        }
        b.box(M.metalDark, [0.34, 0.62, 0.34], [x + 0.42, h - 1.7, z]);
        return [x, h, z];
      }
      const p1 = pole(-7.6, -8.25, 6.6);
      const p2 = pole(-1.2, -8.4, 7.2);
      const p3 = pole(5.0, -8.2, 6.8);
      const p4 = pole(11.9, -6.6, 6.2);
      // sagging wires
      function wireSpan(A, B, y, sag) {
        const segs = [];
        let prev = [A[0], y, A[2]];
        for (let i = 1; i <= 8; i++) {
          const t = i / 8;
          const x = lerp(A[0], B[0], t);
          const z = lerp(A[2], B[2], t);
          const yy = y - Math.sin(t * Math.PI) * sag;
          segs.push([prev, [x, yy, z]]);
          prev = [x, yy, z];
        }
        b.lines(M.wire, segs);
      }
      for (const [A, Bp] of [[p1, p2], [p2, p3], [p3, p4]]) {
        for (const [dy, sag] of [[-0.45, 0.32], [-0.95, 0.42], [-1.45, 0.5]]) {
          wireSpan(A, Bp, A[1] + dy, sag);
        }
      }

      /* =========================================================
         TREES / BUSHES / GRASS / FLOWERS / ROCKS
         ========================================================= */
      function bush(x, z, r, m, seed) {
        b.blob(m || M.bush, r, 7, 5, 0.35, seed, [x, r * 0.72, z], null, true);
      }
      bush(-7.4, 2.3, 0.8, M.bush, 21);
      bush(-6.4, 1.4, 0.55, M.bush2, 22);
      bush(-3.9, 4.2, 0.7, M.bush2, 23);
      bush(5.6, 6.8, 0.6, M.bush, 24);
      bush(12.6, 6.6, 0.75, M.bush2, 25);
      bush(-0.4, -5.3, 0.6, M.bush, 26);
      bush(-12.9, -2.4, 0.75, M.bush2, 27);
      bush(9.8, -6.6, 0.8, M.bush, 28);
      bush(-10.6, 7.6, 0.7, M.bush2, 29);
      bush(2.6, 3.4, 0.5, M.bush, 30);
      bush(6.6, 2.2, 0.55, M.bush2, 31);

      // grass tufts
      (function grassTufts() {
        const rnd = DIO.rng(77);
        let placed = 0, guard = 0;
        while (placed < 90 && guard++ < 900) {
          const x = (rnd() - 0.5) * 26.6;
          const z = (rnd() - 0.5) * 16.6;
          const u = (x - OX) * CA + (z - OZ) * SA;
          const v = (x - OX) * E2X + (z - OZ) * E2Z;
          if (Math.abs(v) < 1.9) continue;                              // track
          if (Math.abs(u - CROSS_U) < 3.2 && v > -6 && v < 10.5) continue; // road
          if (u > -8.0 && u < 4.6 && v > -4.6 && v < -1.0) continue;    // platform
          if (u < -8.8 && v > -4.2 && v < 4.2) continue;                // hill
          if (u > 9.6 && v > -3.4 && v < 3.4) continue;                 // right hill
          if (Math.abs(x) > 13.4 || Math.abs(z) > 8.4) continue;
          const s = 0.5 + rnd() * 0.85;
          b.taper(rnd() > 0.55 ? M.bush2 : M.bush, 0.16 * s, 0.16 * s, 0.03, 0.03, 0.3 * s,
            [x, 0.15 * s, z]);
          placed++;
        }
      })();

      // small white / yellow flowers
      (function flowers() {
        const rnd = DIO.rng(41);
        let placed = 0, guard = 0;
        while (placed < 34 && guard++ < 500) {
          const x = (rnd() - 0.5) * 25.5;
          const z = (rnd() - 0.5) * 15.5;
          const u = (x - OX) * CA + (z - OZ) * SA;
          const v = (x - OX) * E2X + (z - OZ) * E2Z;
          if (Math.abs(v) < 1.9) continue;
          if (Math.abs(u - CROSS_U) < 3.2) continue;
          if (u > -8.2 && u < 4.8 && v > -4.8 && v < -1.0) continue;
          if (u < -8.8 && v > -4.2 && v < 4.2) continue;
          if (Math.abs(x) > 13.2 || Math.abs(z) > 8.2) continue;
          const yy = 0.16 + rnd() * 0.1;
          b.cyl(M.bush2, 0.012, 0.012, 0.22, 4, [x, 0.11, z]);
          b.sphere(rnd() > 0.45 ? M.flowerW : M.flowerY, 0.067, 5, 4, [x, yy, z]);
          placed++;
        }
      })();

      // rocks
      (function rocks() {
        const rnd = DIO.rng(63);
        for (let i = 0; i < 7; i++) {
          const x = (rnd() - 0.5) * 24;
          const z = (rnd() - 0.5) * 14;
          if (Math.abs(x) > 12.6 || Math.abs(z) > 7.6) continue;
          const r = 0.12 + rnd() * 0.16;
          b.blob(M.rock2, r, 6, 4, 0.4, i + 3, [x, r * 0.5, z], null, true);
        }
      })();

      /* low far hills at the back edge */
      (function farHills() {
        for (const [x, z, r, h] of [
          [-12.4, 7.4, 1.5, 1.4],
          [11.2, -7.5, 1.6, 1.5],
          [-3.4, -8.6, 1.25, 1.1],
          [-13.3, -5.2, 1.05, 0.95]
        ]) {
          b.cyl(M.hillFar, r, r * 0.28, h, 7, [x, h / 2, z]);
        }
      })();

      /* =========================================================
         CLOUDS  (soft high bands; low-alpha billboards so they never
         read as hard grey blocks at the frame edge)
         ========================================================= */
      const cloudNodes = [];

      /* =========================================================
         TRAIN (2 cars, analytic shuttle)
         ========================================================= */
      const TRAIN = { half: 8.15, carLen: 5.6, capR: 1.2, gap: 0.3 };
      const trainNode = DIO.node('train');
      trainNode.rotation = [0, RY, 0];
      root.add(trainNode);
      (function buildTrain() {
        const tb = new DIO.Batch();
        const carLen = TRAIN.carLen, capR = TRAIN.capR;
        const bodyH = 2.3, floorY = 1.05;
        const cy = floorY + bodyH / 2;
        const total = carLen + capR * 2;
        // two cars, symmetric around the node origin, with a small gap
        const carCenters = [-(total + TRAIN.gap) / 2, (total + TRAIN.gap) / 2];

        function addCar(xc) {
          // body
          tb.box(M.trainBody, [carLen, bodyH, 2.44], [xc, cy, 0]);
          tb.box(M.trainStripe, [carLen + 0.02, 0.2, 2.47], [xc, floorY + 0.62, 0]);
          // rounded ends
          for (const s of [-1, 1]) {
            tb.cyl(M.trainBody, capR, capR, bodyH, 12, [xc + s * carLen / 2, cy, 0]);
            tb.cyl(M.trainBody, capR + 0.01, capR + 0.01, 0.22, 12, [xc + s * carLen / 2, floorY + bodyH, 0]);
          }
          // roof
          const roofY = floorY + bodyH;
          tb.box(M.trainRoof, [carLen + 1.95, 0.14, 2.14], [xc, roofY + 0.07, 0]);
          for (const s of [-1, 1]) {
            tb.box(M.trainRoof, [carLen + 1.95, 0.1, 0.26], [xc, roofY + 0.16, s * 1.0], [s * -0.62, 0, 0]);
          }
          tb.box(M.trainRoof, [1.4, 0.2, 1.05], [xc, roofY + 0.24, 0]);
          // skirt / underframe
          tb.box(M.trainSkirt, [carLen + 1.0, 0.5, 2.2], [xc, floorY - 0.2, 0]);
          // bogies + wheels
          for (const bx of [xc - carLen * 0.32, xc + carLen * 0.32]) {
            tb.box(M.trainDark, [1.85, 0.42, 1.85], [bx, 0.82, 0]);
            for (const s of [-1, 1]) {
              tb.tube(M.metalDark, 0.31, 0.14, 8, 'z', [bx - 0.6, 0.82, s * 1.02]);
              tb.tube(M.metalDark, 0.31, 0.14, 8, 'z', [bx + 0.6, 0.82, s * 1.02]);
            }
          }
          // windows (both sides)
          const winY = floorY + 1.42;
          for (const s of [-1, 1]) {
            // continuous dark window band
            tb.box(M.trainWin, [carLen - 0.5, 0.86, 0.07], [xc, winY, s * 1.235]);
            // body-coloured pillars over the band
            for (const dx of [-1.85, -0.62, 0.62, 1.85]) {
              tb.box(M.trainBody, [0.15, 0.92, 0.1], [xc + dx, winY, s * 1.245]);
            }
            // doors
            for (const dx of [-carLen / 2 + 0.5, carLen / 2 - 0.5]) {
              tb.box(M.trainWin, [0.72, 1.72, 0.08], [xc + dx, floorY + 0.95, s * 1.24]);
              tb.box(M.trainStripe, [0.44, 0.09, 0.1], [xc + dx, floorY + 1.74, s * 1.245]);
            }
          }
          // cab windows + headlights (both ends)
          for (const s of [-1, 1]) {
            const ex = xc + s * carLen / 2;
            // big dark windshield band wrapped around the rounded nose
            for (const a of [-0.52, 0, 0.52]) {
              const nx = s * Math.cos(a), nz = Math.sin(a);
              const R = capR + 0.06;
              tb.plane(M.trainWin, 0.82, 0.92,
                [ex + s * Math.cos(a) * R, floorY + 1.62, Math.sin(a) * R],
                [0, ryNormal(nx, nz), 0]);
            }
            // destination sign
            tb.plane(M.tex, 0.98, 0.3,
              [ex + s * (capR + 0.05), floorY + 2.78, 0], [0, ryNormal(s, 0), 0], uv.dest);
            // headlights + glow
            for (const zz of [-0.66, 0.66]) {
              tb.box(M.trainLight, [0.14, 0.18, 0.24], [ex + s * (capR + 0.03), floorY + 0.38, zz]);
              tb.plane(M.glowHead, 1.0, 1.0,
                [ex + s * (capR + 0.12), floorY + 0.38, zz], [0, ryNormal(s, 0), 0]);
            }
            // front skirt / bumper
            tb.box(M.trainSkirt, [0.5, 0.5, 2.2], [ex + s * 0.55, floorY - 0.2, 0]);
          }
          // contact shadow
          tb.plane(M.softShadow, total * 0.94, 2.7, [xc, 0.9, 0], [-Math.PI / 2, 0, 0]);
        }
        addCar(carCenters[0]);
        addCar(carCenters[1]);
        // pantograph on the leading car
        const pxc = carCenters[0];
        const py0 = floorY + bodyH + 0.24;
        tb.box(M.metalDark, [1.15, 0.06, 1.15], [pxc, py0 + 0.03, 0]);
        for (const s of [-1, 1]) {
          tb.box(M.metal, [0.05, 0.8, 0.05], [pxc + s * 0.3, py0 + 0.4, 0.3], [0.3, 0, s * -0.22]);
          tb.box(M.metal, [0.05, 0.8, 0.05], [pxc + s * 0.3, py0 + 0.4, -0.3], [-0.3, 0, s * -0.22]);
        }
        tb.box(M.metal, [1.0, 0.05, 0.16], [pxc, py0 + 0.78, 0]);
        tb.finish(trainNode);
      })();

      /* =========================================================
         FINISH static geometry
         ========================================================= */
      b.finish(root);

      /* =========================================================
         PARTICLES
         ========================================================= */
      const petals = new DIO.Flakes({
        count: 210, area: [27, 17], height: 8.5,
        size: [0.1, 0.18], speed: [0.45, 1.15], sway: [0.5, 1.5],
        swayFreq: [0.3, 0.9], spin: [-2.2, 2.2],
        uv: uv.petal, color: '#ffb4d0', alpha: 0.95, seed: 31
      });
      root.add(petals.node);

      /* =========================================================
         ANIMATION (analytic, seekable)
         ========================================================= */
      const CYCLE = 28;
      function smoothstep(a, b, x) {
        const t = clamp((x - a) / (b - a), 0, 1);
        return t * t * (3 - 2 * t);
      }
      // train position along u, analytic in t
      function trainU(t) {
        let x = ((t % CYCLE) + CYCLE) % CYCLE;
        const far = -4.5, near = -0.1;
        // phases: 0-3.5 far (in tunnel), 3.5-11.5 arrive, 11.5-19 dwell, 19-27 depart, 27-28 far
        if (x < 3.5) return far;
        if (x < 11.5) {
          const p = (x - 3.5) / 8.0;
          return lerp(far, near, p * p * (3 - 2 * p));
        }
        if (x < 19) return near + Math.sin((x - 11.5) * 0.9) * 0.012;
        if (x < 27) {
          const p = (x - 19) / 8.0;
          return lerp(near, far, p * p * (3 - 2 * p));
        }
        return far;
      }
      // barrier arm: 1 = up, 0 = down
      function barrierDown(t) {
        let x = ((t % CYCLE) + CYCLE) % CYCLE;
        const down = smoothstep(2.2, 4.6, x) * (1 - smoothstep(26.0, 27.6, x));
        return down;
      }

      let blinkPhase = 0;
      function update(t) {
        // train
        const u = trainU(t);
        trainNode.position = [px(u, 0), 0, pz(u, 0)];
        // barriers
        const down = barrierDown(t);
        const upAngle = 1.28;
        for (const bn of barNodes) {
          bn.arm.rotation = [0, 0, (1 - down) * upAngle];
        }
        // crossing lamps blink while the barriers are down
        blinkPhase = Math.sin(t * 7.2);
        const on = down > 0.45 ? (blinkPhase > 0 ? 1 : 0.15) : 0.12;
        M.redLamp.emissiveStrength = 0.5 + on * 2.1;
        M.glowRed.alpha = 0.1 + on * 0.55;
        // clouds drift
        for (const c of cloudNodes) {
          c.node.position = [
            c.base[0] + Math.sin(t * 0.045 + c.ph) * 1.3,
            c.base[1] + Math.sin(t * 0.07 + c.ph) * 0.16,
            c.base[2] + Math.cos(t * 0.035 + c.ph) * 0.8
          ];
        }
        petals.update(t);
      }

      update(0);

      return {
        root: root,
        update: update
      };
    }
  });
})(window);
