/* ============================================================
   AKARI MART — 雨夜便利店 / rainy-night diorama
   scene id: 'night'
   Classic script, no dependencies. Registers itself on window.DIO.
   ============================================================ */
(function (global) {
  'use strict';
  const DIO = global.DIO;
  const G = DIO.G;
  const PI = Math.PI;

  /* ---------------------------------------------------------- *
   * texture atlas — all painted signs / machine fronts
   * ---------------------------------------------------------- */
  const atlas = DIO.atlas(2048, 1024);

  /* main lightbox: 960x180 maps 1:1 onto 9.6m x 1.8m */
  atlas.define('sign_main', 960, 180, function (ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f0e8d6');
    g.addColorStop(0.55, '#e8dfca');
    g.addColorStop(1, '#d8cdb4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const rg = ctx.createRadialGradient(w * 0.42, h * 0.52, 20, w * 0.42, h * 0.52, w * 0.62);
    rg.addColorStop(0, 'rgba(255,252,240,0.45)');
    rg.addColorStop(1, 'rgba(255,252,240,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);

    DIO.star(ctx, 56, 88, 30, 13, 5, '#dd9426');
    DIO.text(ctx, 'アカリマート', { x: 104, y: 76, size: 80, weight: 900, color: '#125a34' });
    DIO.text(ctx, 'AKARI MART', { x: 110, y: 140, size: 24, weight: 700, color: '#5d6b60', letterSpacing: 13, font: DIO.fonts.en });
    DIO.text(ctx, '24', { x: 700, y: 74, size: 80, weight: 900, color: '#c0741c', font: DIO.fonts.en });
    DIO.text(ctx, '時間営業', { x: 808, y: 82, size: 40, weight: 800, color: '#22301f' });
    DIO.text(ctx, 'OPEN 24 HOURS', { x: 706, y: 142, size: 19, weight: 700, color: '#5d6b60', letterSpacing: 3, font: DIO.fonts.en });
  });

  /* small side lightbox */
  atlas.define('sign_side', 320, 120, function (ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f7f4e9');
    g.addColorStop(1, '#ddd6c4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    DIO.star(ctx, 34, 60, 19, 8, 5, '#f0a53a');
    DIO.text(ctx, 'AKARI MART', { x: 62, y: 54, size: 30, weight: 800, color: '#1b7449', letterSpacing: 2, font: DIO.fonts.en });
    DIO.text(ctx, '24H OPEN', { x: 64, y: 88, size: 19, weight: 600, color: '#8d998f', letterSpacing: 5, font: DIO.fonts.en });
  });

  /* blue street name plate */
  atlas.define('street_sign', 360, 128, function (ctx, w, h) {
    ctx.fillStyle = '#1d3f78';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2a5292';
    ctx.fillRect(0, 0, w, h * 0.5);
    ctx.strokeStyle = '#e6ecf6';
    ctx.lineWidth = 5;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    DIO.text(ctx, '港町 二丁目', { x: w / 2, y: 52, size: 44, weight: 700, color: '#f2f6ff', align: 'center' });
    DIO.text(ctx, 'MINATOMACHI 2', { x: w / 2, y: 97, size: 19, weight: 600, color: '#bcd0ea', align: 'center', letterSpacing: 4, font: DIO.fonts.en });
  });

  /* recycling bin label */
  atlas.define('bin_label', 112, 112, function (ctx, w, h) {
    ctx.fillStyle = '#2f6b5a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d7ece2';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.44, 30, 0, PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d7ece2';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 16, h * 0.44 - 8);
    ctx.lineTo(w / 2 + 16, h * 0.44 - 8);
    ctx.lineTo(w / 2, h * 0.44 + 16);
    ctx.closePath();
    ctx.fill();
    DIO.text(ctx, 'かん・びん', { x: w / 2, y: h * 0.82, size: 17, weight: 700, color: '#e8f4ee', align: 'center' });
  });

  /* falling petal */
  atlas.define('petal', 64, 64, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffc4d9';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.33, h * 0.46, 0.5, 0, PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe0ec';
    ctx.beginPath();
    ctx.ellipse(w / 2 - 5, h / 2 - 6, w * 0.15, h * 0.2, 0.5, 0, PI * 2);
    ctx.fill();
  });

  /* small storefront poster */
  atlas.define('poster', 140, 190, function (ctx, w, h) {
    ctx.fillStyle = '#f2ecdc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c8463c';
    ctx.fillRect(0, 0, w, 56);
    DIO.text(ctx, 'つめたい', { x: w / 2, y: 28, size: 22, weight: 800, color: '#fff6e8', align: 'center' });
    DIO.roundRect(ctx, 34, 74, 72, 96, 12, '#3f7fd0');
    ctx.fillStyle = '#9fc6f0';
    ctx.fillRect(42, 84, 20, 70);
    DIO.text(ctx, 'COLD', { x: w / 2, y: 178, size: 16, weight: 700, color: '#5a6a72', align: 'center', font: DIO.fonts.en });
  });

  /* ramen shop sign */
  atlas.define('ramen_sign', 360, 160, function (ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#c8322a');
    g.addColorStop(1, '#8e1d18');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e8d9b6';
    ctx.fillRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#a8231f';
    ctx.fillRect(16, 16, w - 32, h - 32);
    DIO.text(ctx, 'ラーメン', { x: w / 2, y: 68, size: 62, weight: 800, color: '#f6ead0', align: 'center' });
    DIO.text(ctx, '港町 中華そば', { x: w / 2, y: 122, size: 23, weight: 600, color: '#e8b07a', align: 'center' });
  });

  /* pavement tile decal (semi transparent, blended over wet ground) */
  atlas.define('pavement', 384, 384, function (ctx, w, h) {
    const rnd = DIO.rng(31);
    ctx.fillStyle = '#3c4456';
    ctx.fillRect(0, 0, w, h);
    const n = 8, s = w / n;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const k = 0.9 + rnd() * 0.26;
        ctx.fillStyle = 'rgb(' + Math.round(62 * k) + ',' + Math.round(72 * k) + ',' + Math.round(90 * k) + ')';
        ctx.fillRect(c * s + 1.5, r * s + 1.5, s - 3, s - 3);
      }
    }
    ctx.strokeStyle = 'rgba(168,184,210,0.3)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(w, i * s); ctx.stroke();
    }
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = 'rgba(206,220,244,' + (0.03 + rnd() * 0.05) + ')';
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }
  });

  /* warm interior: shelving with colourful products */
  atlas.define('shelfback', 720, 360, function (ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#e2cfa4');
    g.addColorStop(0.5, '#d6c092');
    g.addColorStop(1, '#c2ac7c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const rnd = DIO.rng(17);
    const cols = ['#d9553f', '#e8a33c', '#4a8fd0', '#4fa86a', '#d97fb2', '#8f6bd0', '#e8e2d2', '#c9b48a', '#3f8f9a', '#e0703a', '#7fbf6a'];
    const rows = 4, rowH = h / rows;
    for (let r = 0; r < rows; r++) {
      const y0 = r * rowH;
      let x = 4;
      while (x < w - 8) {
        const bw = 12 + rnd() * 15;
        const bh = rowH * 0.5 + rnd() * rowH * 0.34;
        ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
        ctx.fillRect(x, y0 + rowH - 13 - bh, bw, bh);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(x, y0 + rowH - 13 - bh, Math.max(2, bw * 0.32), bh);
        ctx.fillStyle = 'rgba(30,20,10,0.16)';
        ctx.fillRect(x + bw - 2, y0 + rowH - 13 - bh, 2, bh);
        x += bw + 3 + rnd() * 5;
      }
      ctx.fillStyle = '#bda67e';
      ctx.fillRect(0, y0 + rowH - 13, w, 13);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(0, y0 + rowH - 13, w, 3);
      ctx.fillStyle = 'rgba(40,26,12,0.2)';
      ctx.fillRect(0, y0 + rowH - 2, w, 2);
    }
    const lg = ctx.createLinearGradient(0, 0, 0, h * 0.35);
    lg.addColorStop(0, 'rgba(255,246,220,0.7)');
    lg.addColorStop(1, 'rgba(255,246,220,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, w, h * 0.35);
    ctx.fillStyle = 'rgba(90,74,50,0.25)';
    for (let i = 0; i < 4; i++) ctx.fillRect(i * (w / 4) + (w / 4) - 4, 0, 5, h);
  });

  /* vending machine fronts */
  function paintVending(ctx, w, h, body, panel, accent, label, tint) {
    ctx.fillStyle = body;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(0, 0, w, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(w - 8, 0, 8, h);
    ctx.fillStyle = panel;
    ctx.fillRect(10, 10, w - 20, 52);
    DIO.text(ctx, label, { x: w / 2, y: 37, size: 26, weight: 800, color: accent, align: 'center' });
    ctx.fillStyle = '#eef3f7';
    ctx.fillRect(10, 72, w - 20, 206);
    const cols = ['#e04a3c', '#3f7fd0', '#4aa860', '#e8b23c', '#e0609a', '#f2f4f6', '#7a4ad0', '#3aa8a0'];
    const rnd = DIO.rng(11);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const x = 20 + c * 66, y = 82 + r * 50;
        ctx.fillStyle = tint;
        ctx.fillRect(x - 3, y - 3, 54, 46);
        ctx.fillStyle = cols[(r * 3 + c + Math.floor(rnd() * 2)) % cols.length];
        DIO.roundRect(ctx, x, y, 48, 38, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x + 5, y + 4, 12, 30);
      }
    }
    ctx.fillStyle = '#20242c';
    ctx.fillRect(12, 282, w - 24, 14);
    ctx.fillStyle = '#191d24';
    ctx.fillRect(16, h - 66, w - 32, 46);
    ctx.fillStyle = '#2c3540';
    ctx.fillRect(24, h - 58, w - 48, 30);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, h - 14, w, 14);
  }
  atlas.define('vend_a', 224, 360, function (ctx, w, h) {
    paintVending(ctx, w, h, '#cf3a31', '#f6f2e8', '#c0392f', 'つめた〜い', '#f4efe2');
  });
  atlas.define('vend_b', 224, 360, function (ctx, w, h) {
    paintVending(ctx, w, h, '#2f5da8', '#f2f5f9', '#2f5da8', 'あったか〜い', '#e8eef6');
  });

  /* chest freezer front */
  atlas.define('freezer', 256, 192, function (ctx, w, h) {
    ctx.fillStyle = '#eef2f5';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#bcd6e8';
    ctx.fillRect(0, 0, w, 26);
    ctx.fillStyle = '#5a9bc8';
    ctx.fillRect(0, 26, w, 40);
    DIO.text(ctx, 'アイス', { x: w / 2, y: 46, size: 28, weight: 800, color: '#ffffff', align: 'center' });
    const cols = ['#e05a4a', '#4a9fd0', '#f0b73c', '#7fbf6a', '#e07fa8'];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = cols[i];
      ctx.beginPath();
      ctx.arc(30 + i * 48, 116 + (i % 2) * 10, 20, 0, PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(60,80,100,0.25)';
    ctx.fillRect(0, h - 16, w, 16);
  });

  /* ---------------------------------------------------------- *
   * geometry helpers (batch is assigned inside build)
   * ---------------------------------------------------------- */
  let B;
  function bx(m, w, h, d, x, y, z, ry) {
    B.box(m, [w, h, d], [x, y + h / 2, z], ry ? [0, ry, 0] : null);
  }
  function bxC(m, w, h, d, x, y, z, rot) {
    B.box(m, [w, h, d], [x, y, z], rot || null);
  }
  function cylB(m, r0, r1, h, seg, x, y, z) {
    B.cyl(m, r0, r1, h, seg, [x, y + h / 2, z]);
  }
  function quadUp(m, w, d, x, y, z, uvRect) {
    B.quadN(m, [x - w / 2, y, z + d / 2], [x + w / 2, y, z + d / 2], [x + w / 2, y, z - d / 2], [x - w / 2, y, z - d / 2], [0, 1, 0], uvRect);
  }
  function glowUp(m, w, d, x, y, z) {
    B.plane(m, w, d, [x, y, z], [-PI / 2, 0, 0]);
  }
  function wireSegments(a, b, sag, n) {
    const segs = [];
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t),
        a[2] + (b[2] - a[2]) * t
      ];
      if (prev) segs.push([prev, p]);
      prev = p;
    }
    return segs;
  }

  /* ---------------------------------------------------------- *
   * scene registration
   * ---------------------------------------------------------- */
  DIO.registerScene({
    id: 'night',
    title: '雨夜便利店',
    subtitle: 'RAINY NIGHT · AKARI MART',
    atlas: atlas,

    env: {
      sky: {
        top: '#070c1c', mid: '#0e1a34', bot: '#24384f',
        glowAPos: [0.56, 0.1], glowACol: '#4a3220', glowASize: 0.52,
        glowBPos: [0.22, 0.34], glowBCol: '#16394e', glowBSize: 0.6,
        haze: 0.58, hazeColor: '#2b4058', stars: 0.0, clouds: 0.18,
        cloudColor: '#080e18', exposure: 1.06
      },
      key: { dir: [0.32, 0.88, 0.36], color: '#6c8ec2' },
      fill: { dir: [0.2, 0.22, 0.95], color: '#96683f' },
      ambient: '#28344c',
      rim: { color: '#7d97c4', strength: 0.26 },
      fog: { near: 70, far: 190, color: '#0b1220' },
      ground: {
        size: [28, 20], center: [0, 0], y: 0.02,
        color: '#262d40', puddle: '#0a0f1a', tint: '#c4d2e8',
        wet: 0.92, reflect: 0.42
      },
      reflection: 0.78,
      bloom: 0.8,
      bloomThreshold: 0.74,
      vignette: 0.9,
      grain: 0.028,
      exposure: 1.1
    },

      views: [
      { label: '全景', az: 0.7, el: 0.34, radius: 31, target: [0, 2.5, 0.6] },
      { label: '店前', az: 0.4, el: 0.14, radius: 14, target: [-2.4, 2.1, 0.6] },
      { label: '街道', az: 0.05, el: 0.115, radius: 24, target: [-3.2, 2.3, 1.0] },
      { label: '俯拍', az: 0.62, el: 1.08, radius: 46, target: [2.4, 0.8, 2.4] }
    ],

    params: [
      {
        id: 'rain', label: '雨量', type: 'seg', value: 1,
        options: [{ label: '小雨', value: 0.4 }, { label: '中雨', value: 1 }, { label: '大雨', value: 1.6 }]
      }
    ],

    build: function (api) {
      const root = DIO.node('root');
      B = new DIO.Batch();
      const R = DIO.rng(2024);

      /* ---------------- materials ---------------- */
      const M = {
        baseA: G.mat('#232834', { spec: 0.1 }),
        baseB: G.mat('#3b352c', { spec: 0.06 }),
        baseC: G.mat('#2a211b', { spec: 0.05 }),

        wall: G.mat('#d3cdbd', { spec: 0.18 }),
        wallShade: G.mat('#aea896', { spec: 0.12 }),
        fascia: G.mat('#d5cfbe', { spec: 0.2 }),
        green: G.mat('#1f7a4c', { emissive: '#2fae70', emissiveStrength: 0.35 }),
        orange: G.mat('#e8902e', { emissive: '#e8902e', emissiveStrength: 0.55 }),

        dark: G.mat('#1e222a'),
        dark2: G.mat('#2a303a'),
        concrete: G.mat('#565247', { spec: 0.1 }),
        concreteDark: G.mat('#34322d'),
        metal: G.mat('#7e8592', { spec: 0.55 }),
        metalDark: G.mat('#41474f', { spec: 0.3 }),
        roof: G.mat('#20242c', { spec: 0.14 }),
        rust: G.mat('#4a3a30', { spec: 0.2 }),

        glass: G.mat('#a8cbe0', { alpha: 0.16, spec: 0.95 }),
        glassDark: G.mat('#7fa0b8', { alpha: 0.3, spec: 0.8 }),

        signBox: G.mat('#d9d4c6', { spec: 0.2 }),
        sign: G.mat('#ffffff', { unlit: true, tex: true, emissive: '#241d12', emissiveStrength: 0.8 }),
        signSide: G.mat('#ffffff', { unlit: true, tex: true, emissive: '#241d12', emissiveStrength: 0.8 }),

        warmFloor: G.mat('#a8916f', { unlit: true }),
        interiorWall: G.mat('#cdbb98', { unlit: true }),
        ceiling: G.mat('#c3b498', { unlit: true }),
        lightStrip: G.mat('#fff8e2', { unlit: true, emissive: '#ffe4ae', emissiveStrength: 0.8 }),
        shelfFace: G.mat('#d8cfc0', { unlit: true, tex: true }),
        counter: G.mat('#c9c2b2', { spec: 0.2 }),
        counterTop: G.mat('#ffefc8', { emissive: '#ffe6b0', emissiveStrength: 0.4 }),

        prodA: G.mat('#c82818', { spec: 0.3, emissive: '#e03018', emissiveStrength: 0.9 }),
        prodB: G.mat('#d89a10', { spec: 0.3, emissive: '#f0b020', emissiveStrength: 0.85 }),
        prodC: G.mat('#1a5fa8', { spec: 0.3, emissive: '#2a78d0', emissiveStrength: 0.9 }),
        prodD: G.mat('#1e8a48', { spec: 0.3, emissive: '#28a858', emissiveStrength: 0.85 }),
        prodE: G.mat('#d8d0bc', { spec: 0.3, emissive: '#e8e2d0', emissiveStrength: 0.5 }),
        prodF: G.mat('#9a3a9a', { spec: 0.3, emissive: '#c050c0', emissiveStrength: 0.85 }),

        vendA: G.mat('#ffffff', { unlit: true, tex: true, emissive: '#1a160e', emissiveStrength: 0.3 }),
        vendB: G.mat('#ffffff', { unlit: true, tex: true, emissive: '#0e1a22', emissiveStrength: 0.3 }),
        vendBodyA: G.mat('#c8332a', { spec: 0.35 }),
        vendBodyB: G.mat('#2f5ba8', { spec: 0.35 }),
        freezerFace: G.mat('#ffffff', { unlit: true, tex: true, emissive: '#1a2630', emissiveStrength: 0.3 }),
        freezerBody: G.mat('#e6ecf0', { spec: 0.3 }),
        poster: G.mat('#ffffff', { unlit: true, tex: true }),
        binLabel: G.mat('#ffffff', { unlit: true, tex: true }),

        pavement: G.mat('#ffffff', { unlit: true, tex: true, alpha: 0.42 }),
        curb: G.mat('#6e6d66', { spec: 0.15 }),
        markWhite: G.mat('#96968a', { unlit: true }),
        markYellow: G.mat('#b8901f', { unlit: true }),
        tactile: G.mat('#c2921f', { unlit: true }),

        guard: G.mat('#8d95a2', { spec: 0.4 }),
        coneOrange: G.mat('#e8622c', { spec: 0.3, emissive: '#8a2808', emissiveStrength: 1 }),
        coneWhite: G.mat('#e8e5d8', { spec: 0.3 }),

        pole: G.mat('#4e4a42', { spec: 0.12 }),
        poleMetal: G.mat('#575d66', { spec: 0.4 }),
        wire: G.mat('#454d5c', { unlit: true }),

        aptWall: G.mat('#19202e', { spec: 0.05 }),
        aptWall2: G.mat('#222a3a', { spec: 0.05 }),
        aptWinA: G.mat('#ffcf84', { emissive: '#ffcf84', emissiveStrength: 1.0, unlit: true }),
        aptWinB: G.mat('#9fb8d8', { emissive: '#9fb8d8', emissiveStrength: 0.55, unlit: true }),

        ramenWall: G.mat('#4a332c', { spec: 0.1 }),
        ramenSign: G.mat('#ffffff', { unlit: true, tex: true, emissive: '#5a2a20', emissiveStrength: 0.8 }),
        lantern: G.mat('#ff5436', { emissive: '#ff5436', emissiveStrength: 1.3 }),
        ramenWin: G.mat('#ffc078', { emissive: '#ffc078', emissiveStrength: 1.0, unlit: true }),

        streetSign: G.mat('#ffffff', { unlit: true, tex: true, emissive: '#1a3050', emissiveStrength: 0.5 }),
        streetSignBack: G.mat('#4a5260', { spec: 0.2 }),

        lampHead: G.mat('#fff0c8', { emissive: '#ffdfa0', emissiveStrength: 1.7 }),
        lampPole: G.mat('#3c4149', { spec: 0.3 }),

        sigRed: G.mat('#ff4a3c', { emissive: '#ff4a3c', emissiveStrength: 1.4, unlit: true }),
        sigGreen: G.mat('#4ae0a0', { emissive: '#4ae0a0', emissiveStrength: 1.4, unlit: true }),
        sigBox: G.mat('#262b34', { spec: 0.2 }),

        trunk: G.mat('#2b221c', { spec: 0.1 }),
        blossomA: G.mat('#f7a8c4', { emissive: '#7a3350', emissiveStrength: 0.7 }),
        blossomB: G.mat('#ee8fb2', { emissive: '#6e2a46', emissiveStrength: 0.7 }),
        blossomC: G.mat('#d9739a', { emissive: '#4e1a2e', emissiveStrength: 0.8 }),
        petal: G.mat('#ffcfe0', { unlit: true, tex: true, texAlpha: true }),

        bikeDark: G.mat('#2b323c', { spec: 0.4 }),
        bikeTire: G.mat('#191d23', { spec: 0.1 }),
        bikeBasket: G.mat('#6a7280', { spec: 0.3 }),

        ac: G.mat('#8b8f96', { spec: 0.3 }),
        plastic: G.mat('#2f3742', { spec: 0.25 }),

        umb: G.mat('#3a4763', { spec: 0.3 }),
        cloth: G.mat('#8a3a4a', { spec: 0.1 })
      };

      /* animated glow materials (own instances, not cached) */
      M.signHalo = G.mat('#ffe3b0', { additive: true, unlit: true, radial: true, alpha: 0.12 });
      M.signGlow = G.mat('#ffcf8a', { additive: true, unlit: true, radial: true, alpha: 0.34 });
      M.doorGlow = G.mat('#ffb264', { additive: true, unlit: true, radial: true, alpha: 0.34 });
      M.doorGlow2 = G.mat('#ffd7a0', { additive: true, unlit: true, radial: true, alpha: 0.42 });
      M.lampGlow = G.mat('#ffd9a0', { additive: true, unlit: true, radial: true, billboard: true, alpha: 0.42 });
      M.vendGlowA = G.mat('#ff9a72', { additive: true, unlit: true, radial: true, billboard: true, alpha: 0.34 });
      M.vendGlowB = G.mat('#9ad0ff', { additive: true, unlit: true, radial: true, billboard: true, alpha: 0.32 });
      M.lanternGlow = G.mat('#ff6a3c', { additive: true, unlit: true, radial: true, billboard: true, alpha: 0.42 });
      M.winGlow = G.mat('#ffc882', { additive: true, unlit: true, radial: true, alpha: 0.22 });
      M.iceGlow = G.mat('#bfe0ff', { additive: true, unlit: true, radial: true, alpha: 0.18 });
      M.ramenGlow = G.mat('#ffb070', { additive: true, unlit: true, radial: true, alpha: 0.32 });
      M.treeGlow = G.mat('#ffb98a', { additive: true, unlit: true, radial: true, alpha: 0.22 });
      M.signRefl = G.mat('#ffd9a8', { additive: true, unlit: true, radial: true, alpha: 0.14 });

      const uvSign = atlas.uv('sign_main');
      const uvSignSide = atlas.uv('sign_side');
      const uvStreet = atlas.uv('street_sign');
      const uvBin = atlas.uv('bin_label');
      const uvPetal = atlas.uv('petal');
      const uvPoster = atlas.uv('poster');
      const uvRamen = atlas.uv('ramen_sign');
      const uvPav = atlas.uv('pavement');
      const uvShelf = atlas.uv('shelfback');
      const uvVendA = atlas.uv('vend_a');
      const uvVendB = atlas.uv('vend_b');
      const uvFreezer = atlas.uv('freezer');

      /* ============================================================ *
       * 1. diorama base — layered cut-away strata
       * ============================================================ */
      B.box(M.baseA, [28, 0.9, 20], [0, -0.45, 0]);
      B.box(M.baseB, [28.24, 0.85, 20.24], [0, -1.32, 0]);
      B.box(M.baseC, [28.5, 0.8, 20.5], [0, -2.13, 0]);
      B.box(M.concreteDark, [28.3, 0.05, 20.3], [0, -0.89, 0]);

      /* ============================================================ *
       * 2. the convenience store  (x -9..2, z -6..0, front faces +z)
       * ============================================================ */
      const SX0 = -9, SX1 = 2, SZ0 = -6, SZ1 = 0;
      const SCX = (SX0 + SX1) / 2;
      const SZ_ = (SZ0 + SZ1) / 2;
      const WH = 4.8;

      bx(M.wall, 0.3, WH, 6.0, SX0 + 0.15, 0, SZ_);
      bx(M.wall, 0.3, WH, 6.0, SX1 - 0.15, 0, SZ_);
      bx(M.wallShade, 11.0, WH, 0.3, SCX, 0, SZ0 + 0.15);
      bx(M.wall, 11.0, 2.30, 0.3, SCX, 2.55, SZ1 - 0.15);

      bx(M.warmFloor, 10.4, 0.1, 5.7, SCX, 0, SZ_);
      bx(M.ceiling, 10.4, 0.16, 5.7, SCX, 2.68, SZ_);
      B.plane(M.interiorWall, 10.2, 2.62, [SCX, 1.36, SZ0 + 0.36]);

      for (let i = 0; i < 3; i++) {
        bx(M.lightStrip, 9.0, 0.07, 0.22, -3.6, 2.52, -1.15 - i * 1.45);
        bx(M.lightStrip, 9.4, 0.05, 0.5, -3.6, 2.6, -1.15 - i * 1.45);
      }
      // a warm strip right behind the window head, reads as the lit ceiling
      bx(M.lightStrip, 8.8, 0.09, 0.16, -4.0, 2.36, -0.62);

      const prodMats = [M.prodA, M.prodB, M.prodC, M.prodD, M.prodE, M.prodF];

      (function shelfRun() {
        const sx0 = -8.5, sx1 = 0.1, sz = -1.05;
        const wRun = sx1 - sx0;
        B.plane(M.shelfFace, wRun, 2.12, [(sx0 + sx1) / 2, 1.12, sz - 0.16], null, uvShelf);
        bx(M.wallShade, wRun + 0.16, 0.1, 0.5, (sx0 + sx1) / 2, 2.1, sz);
        bx(M.wallShade, 0.12, 2.1, 0.5, sx0 - 0.04, 0, sz);
        bx(M.wallShade, 0.12, 2.1, 0.5, sx1 + 0.04, 0, sz);
        bx(M.wallShade, 0.1, 2.1, 0.5, -4.2, 0, sz);
        for (let s = 0; s < 3; s++) {
          const by = 0.42 + s * 0.62;
          bx(M.counter, wRun, 0.06, 0.44, (sx0 + sx1) / 2, by, sz + 0.02);
          for (let k = 0; k < 27; k++) {
            const px = sx0 + 0.24 + k * 0.32;
            if (px > sx1 - 0.08) break;
            const pm = prodMats[Math.floor(R() * prodMats.length)];
            const ph = 0.18 + R() * 0.2;
            bx(pm, 0.24, ph, 0.26, px, by + 0.06, sz + 0.08);
            // second row deeper on the shelf for a bit of density
            if (R() > 0.35) {
              const pm2 = prodMats[Math.floor(R() * prodMats.length)];
              bx(pm2, 0.22, 0.16 + R() * 0.16, 0.22, px + 0.03, by + 0.06, sz - 0.09);
            }
          }
        }
      })();

      (function gondola(gx, gz) {
        bx(M.wallShade, 0.1, 1.2, 3.4, gx - 0.44, 0, gz);
        bx(M.wallShade, 0.1, 1.2, 3.4, gx + 0.44, 0, gz);
        for (let s = 0; s < 3; s++) {
          const sy = 0.3 + s * 0.42;
          bx(M.counter, 0.92, 0.05, 3.4, gx, sy, gz);
          for (let k = 0; k < 7; k++) {
            const pz = gz - 1.4 + k * 0.45;
            const pm = prodMats[Math.floor(R() * prodMats.length)];
            bx(pm, 0.3, 0.2 + R() * 0.12, 0.34, gx + 0.3, sy + 0.05, pz);
            const pm2 = prodMats[Math.floor(R() * prodMats.length)];
            bx(pm2, 0.3, 0.2 + R() * 0.12, 0.34, gx - 0.3, sy + 0.05, pz);
          }
        }
      })(-4.0, -3.4);

      bx(M.counter, 2.4, 1.0, 0.75, -1.9, 0, -2.15);
      bx(M.counterTop, 2.5, 0.09, 0.85, -1.9, 1.0, -2.15);
      bx(M.metalDark, 0.46, 0.38, 0.36, -2.3, 1.09, -2.2);
      bx(M.plastic, 0.32, 0.92, 0.3, -1.1, 0, -2.35);
      B.sphere(M.cloth, 0.15, 8, 6, [-1.1, 1.06, -2.35]);
      bx(M.prodA, 0.28, 0.32, 0.28, -3.0, 1.09, -2.1);
      bx(M.prodC, 0.26, 0.28, 0.26, -2.7, 1.09, -2.05);
      quadUp(M.cloth, 1.3, 0.9, 1.0, 0.11, -0.7);

      /* ---- storefront: plinth, glass, mullions, fascia ---- */
      bx(M.concreteDark, 11.0, 0.22, 0.34, SCX, 0, SZ1 - 0.08);
      bx(M.wall, 0.3, 2.9, 0.36, SX0 + 0.15, 0.2, SZ1 - 0.16);
      bx(M.wall, 0.3, 2.9, 0.36, SX1 - 0.15, 0.2, SZ1 - 0.16);

      B.plane(M.glass, 10.4, 2.33, [SCX, 1.37, SZ1 - 0.02]);
      const mullX = [-7.1, -5.3, -3.5, -1.7, 0.1];
      for (let i = 0; i < mullX.length; i++) {
        bx(M.metalDark, 0.1, 2.33, 0.16, mullX[i], 0.2, SZ1 + 0.02);
      }
      bx(M.metalDark, 10.4, 0.1, 0.16, SCX, 2.3, SZ1 + 0.02);
      bx(M.metal, 0.08, 2.12, 0.18, 0.16, 0.2, SZ1 + 0.03);
      bx(M.metal, 0.08, 2.12, 0.18, 1.5, 0.2, SZ1 + 0.03);
      bx(M.metal, 0.06, 0.5, 0.06, 0.3, 1.0, SZ1 + 0.12);
      bx(M.metal, 0.06, 0.5, 0.06, 1.36, 1.0, SZ1 + 0.12);
      B.plane(M.poster, 0.55, 0.75, [1.02, 1.75, SZ1 + 0.09], null, uvPoster);

      bx(M.fascia, 11.2, 0.4, 0.4, SCX, 2.55, SZ1 - 0.1);
      B.plane(M.orange, 9.9, 0.07, [SCX, 2.92, SZ1 + 0.06]);
      bxC(M.fascia, 9.9, 0.09, 0.95, SCX, 2.62, 0.48, [0.09, 0, 0]);
      bxC(M.green, 9.9, 0.09, 0.14, SCX, 2.55, 0.92, [0.09, 0, 0]);
      for (let i = 0; i < 4; i++) {
        bxC(M.metalDark, 0.06, 0.06, 0.8, -8.0 + i * 3.0, 2.46, 0.42, [0.55, 0, 0]);
      }

      /* ---- main lightbox sign ---- */
      bx(M.signBox, 9.9, 1.8, 0.42, SCX, 2.9, 0.24);
      B.plane(M.sign, 9.6, 1.74, [SCX, 3.8, 0.48], null, uvSign);
      bx(M.green, 10.05, 0.22, 0.5, SCX, 4.7, 0.24);
      bx(M.orange, 9.9, 0.06, 0.06, SCX, 2.9, 0.49);
      B.plane(M.signHalo, 11.6, 5.0, [SCX, 3.9, 0.62]);

      bx(M.signBox, 0.14, 0.95, 3.1, SX1 + 0.06, 3.3, -2.7);
      B.plane(M.signSide, 2.9, 0.85, [SX1 + 0.14, 3.78, -2.7], [0, PI / 2, 0], uvSignSide);
      B.plane(M.signHalo, 2.6, 2.8, [SX1 + 0.4, 3.75, -2.7]);

      // right-side wall detail (seen a lot from the street view)
      B.plane(M.glassDark, 2.2, 1.35, [SX1 + 0.02, 1.95, -4.5], [0, PI / 2, 0]);
      bx(M.metalDark, 0.06, 0.1, 2.4, SX1 + 0.06, 1.25, -4.5);
      bx(M.metalDark, 0.06, 0.1, 2.4, SX1 + 0.06, 2.6, -4.5);
      bx(M.metalDark, 0.06, 1.45, 0.1, SX1 + 0.06, 1.25, -5.7);
      bx(M.metalDark, 0.06, 1.45, 0.1, SX1 + 0.06, 1.25, -3.3);
      // service door
      bx(M.metalDark, 0.1, 2.0, 0.9, SX1 + 0.04, 0, -1.4);
      bx(M.metal, 0.12, 0.08, 0.12, SX1 + 0.1, 1.0, -1.05);
      // ground AC condenser + meter box + vents
      bx(M.ac, 0.62, 0.6, 0.9, SX1 + 0.42, 0.05, -2.4);
      B.disc(M.metalDark, 0.22, 10, [SX1 + 0.74, 0.36, -2.4], [0, PI / 2, 0]);
      bx(M.metalDark, 0.24, 0.44, 0.34, SX1 + 0.16, 1.5, -0.55);
      bx(M.metalDark, 0.06, 0.5, 0.6, SX1 + 0.05, 0.9, -5.0);
      bx(M.metalDark, 0.06, 0.5, 0.6, SX1 + 0.05, 2.2, -5.0);

      // wrap-around brand trim on the store sides
      bx(M.green, 0.1, 0.16, 5.8, SX0 - 0.02, 4.5, SZ_);
      bx(M.green, 0.1, 0.16, 5.8, SX1 + 0.02, 4.5, SZ_);
      bx(M.orange, 0.08, 0.06, 5.8, SX0 - 0.02, 4.36, SZ_);
      bx(M.orange, 0.08, 0.06, 5.8, SX1 + 0.02, 4.36, SZ_);

      bx(M.roof, 11.5, 0.32, 6.5, SCX, 4.8, -2.95);
      bx(M.wallShade, 11.5, 0.34, 0.22, SCX, 5.12, -6.14);
      bx(M.wallShade, 0.22, 0.34, 6.4, SX0 - 0.06, 5.12, -2.95);
      bx(M.wallShade, 0.22, 0.34, 6.4, SX1 + 0.06, 5.12, -2.95);
      for (let i = 0; i < 2; i++) {
        const ax = -6.6 + i * 2.5, az = -4.4;
        bx(M.ac, 1.1, 0.72, 0.72, ax, 5.04, az);
        B.disc(M.metalDark, 0.24, 10, [ax, 5.4, az + 0.37]);
        bx(M.metalDark, 1.1, 0.06, 0.74, ax, 5.02, az + 0.01);
      }
      cylB(M.metalDark, 0.55, 0.55, 1.1, 10, -1.6, 5.04, -5.0);
      cylB(M.metalDark, 0.12, 0.12, 1.6, 6, 1.2, 5.04, -5.2);
      B.lines(M.wire, [
        [[1.2, 6.6, -5.2], [1.2, 7.6, -5.2]],
        [[0.8, 7.2, -5.2], [1.6, 7.2, -5.2]],
        [[1.2, 7.6, -5.2], [1.0, 7.0, -4.6]]
      ], null, null);

      /* ---- exterior warm spill onto the pavement ---- */
      glowUp(M.doorGlow, 8.0, 6.0, -3.2, 0.07, 1.6);
      glowUp(M.doorGlow2, 5.0, 2.8, -1.2, 0.08, 0.95);
      glowUp(M.iceGlow, 5.0, 3.0, 4.0, 0.075, 1.2);
      // elongated lightbox reflections streaking across the wet ground
      glowUp(M.signRefl, 1.7, 8.0, -6.4, 0.076, 4.0);
      glowUp(M.signRefl, 2.0, 9.0, -3.0, 0.078, 4.2);
      glowUp(M.signRefl, 1.5, 6.5, 0.2, 0.076, 3.8);
      B.plane(DIO.shadow.material(0.5), 12.6, 7.4, [SCX, 0.045, -2.6], [-PI / 2, 0, 0]);

      /* ============================================================ *
       * 3. storefront props
       * ============================================================ */
      function vending(x, body, faceMat, uvRect, glow) {
        bx(body, 1.04, 1.92, 0.76, x, 0.06, 0.72);
        bx(M.metalDark, 1.08, 0.1, 0.8, x, 1.98, 0.72);
        B.plane(faceMat, 0.94, 1.78, [x, 1.03, 0.72 + 0.385], null, uvRect);
        B.plane(glow, 2.6, 2.6, [x, 1.1, 1.26]);
        B.plane(DIO.shadow.material(0.42), 1.7, 1.1, [x, 0.032, 0.78], [-PI / 2, 0, 0]);
      }
      vending(3.05, M.vendBodyA, M.vendA, uvVendA, M.vendGlowA);
      vending(4.25, M.vendBodyB, M.vendB, uvVendB, M.vendGlowB);
      // one more machine across the street on the left, so that side is not empty
      vending(-10.7, M.vendBodyB, M.vendB, uvVendB, M.vendGlowB);
      // warm wall lamp on the low apartment block
      bx(M.lampHead, 0.36, 0.1, 0.16, -12.4, 2.5, 0.52);
      B.plane(M.lampGlow, 2.0, 2.0, [-12.4, 2.45, 0.66]);
      glowUp(M.lampGlow, 4.2, 3.6, -12.4, 0.085, 1.1);

      bx(M.plastic, 0.44, 0.82, 0.4, 4.95, 0.06, 0.66);
      B.plane(M.binLabel, 0.36, 0.36, [4.95, 0.62, 0.87], null, uvBin);
      bx(M.plastic, 0.44, 0.82, 0.4, 5.48, 0.06, 0.66);
      B.plane(M.binLabel, 0.36, 0.36, [5.48, 0.62, 0.87], null, uvBin);

      bx(M.freezerBody, 1.7, 0.98, 0.82, -7.4, 0.06, 1.0);
      B.plane(M.freezerFace, 1.6, 0.9, [-7.4, 0.55, 1.42], null, uvFreezer);
      bx(M.freezerBody, 1.74, 0.08, 0.86, -7.4, 1.04, 1.0);

      cylB(M.umb, 0.26, 0.24, 0.72, 10, 2.0, 0.06, 0.55);
      B.cyl(M.dark, 0.06, 0.03, 0.9, 6, [1.92, 0.55, 0.5], [0.12, 0, 0.18]);
      B.cyl(M.cloth, 0.05, 0.03, 0.85, 6, [2.1, 0.52, 0.62], [-0.1, 0, -0.2]);
      B.cyl(M.dark, 0.05, 0.03, 0.95, 6, [2.06, 0.56, 0.42], [0.16, 0, 0.1]);

      function bike(px, pz, flip) {
        const sgn = flip ? -1 : 1;
        const WR = 0.32, AX = 0.58;
        function wheel(dx) {
          B.tube(M.bikeTire, WR, 0.055, 10, 'z', [px + dx, WR, pz], null);
          B.tube(M.metalDark, WR * 0.3, 0.02, 8, 'z', [px + dx, WR, pz], null);
        }
        wheel(-AX * sgn);
        wheel(AX * sgn);
        function bar(ax, ay, bx2, by2, th) {
          const dx = bx2 - ax, dy = by2 - ay;
          const len = Math.hypot(dx, dy);
          const ang = Math.atan2(dy, dx);
          B.box(M.bikeDark, [len, th, th], [px + (ax + bx2) / 2 * sgn, (ay + by2) / 2, pz], [0, 0, ang * sgn]);
        }
        bar(-0.58 * sgn, 0.32, -0.08 * sgn, 0.7, 0.045);
        bar(-0.08 * sgn, 0.7, 0.42 * sgn, 0.76, 0.05);
        bar(-0.08 * sgn, 0.7, 0.02 * sgn, 0.32, 0.05);
        bar(0.58 * sgn, 0.32, 0.42 * sgn, 0.76, 0.045);
        bar(0.02 * sgn, 0.32, 0.58 * sgn, 0.32, 0.04);
        bar(-0.08 * sgn, 0.7, -0.06 * sgn, 0.84, 0.04);
        bar(0.42 * sgn, 0.76, 0.38 * sgn, 0.88, 0.04);
        B.box(M.bikeDark, [0.24, 0.07, 0.13], [px - 0.08 * sgn, 0.86, pz], [0, 0, 0.06 * sgn]);
        B.box(M.metalDark, [0.05, 0.05, 0.42], [px + 0.4 * sgn, 0.9, pz], null);
        B.box(M.bikeBasket, [0.3, 0.2, 0.3], [px + 0.5 * sgn, 0.72, pz], [0, 0, 0]);
        B.box(M.bikeBasket, [0.26, 0.02, 0.26], [px + 0.5 * sgn, 0.62, pz], null);
        B.cyl(M.metalDark, 0.018, 0.018, 0.36, 4, [px - 0.02 * sgn, 0.18, pz + 0.08], [0.3, 0, 0.2]);
        B.plane(DIO.shadow.material(0.4), 1.9, 0.9, [px, 0.032, pz], [-PI / 2, 0, 0]);
      }
      bike(-5.5, 2.3, false);
      bike(-4.35, 2.45, true);
      bike(-9.0, 2.55, false);

      /* ============================================================ *
       * 4. sidewalk / street
       * ============================================================ */
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 2; j++) {
          quadUp(M.pavement, 4.0, 2.2, -12.5 + i * 4.0, 0.05, 1.1 + j * 2.2, uvPav);
        }
      }
      quadUp(M.pavement, 5.4, 4.6, 11.2, 0.05, 7.2, uvPav);
      quadUp(M.pavement, 5.4, 1.2, 11.2, 0.05, 9.9, uvPav);

      quadUp(M.tactile, 21.0, 0.36, -3.0, 0.06, 3.2);
      quadUp(M.tactile, 0.36, 2.6, 0.6, 0.06, 1.9);

      bx(M.curb, 15.4, 0.16, 0.26, -6.3, 0.02, 4.62);
      bx(M.curb, 3.2, 0.16, 0.26, 7.0, 0.02, 4.62);
      bx(M.curb, 0.26, 0.16, 5.3, 8.62, 0.02, 7.25);

      for (let i = 0; i < 7; i++) {
        quadUp(M.markYellow, 1.8, 0.2, -12.6 + i * 2.9, 0.04, 7.15);
      }
      for (let i = 0; i < 4; i++) {
        quadUp(M.markWhite, 0.42, 4.7, 2.2 + i * 0.78, 0.04, 7.05);
      }
      quadUp(M.markWhite, 4.4, 0.16, 4.4, 0.04, 9.35);
      quadUp(M.markWhite, 22.0, 0.12, -3.0, 0.04, 4.92);

      function rail(x0, x1) {
        const n = Math.max(2, Math.round((x1 - x0) / 1.3));
        for (let i = 0; i <= n; i++) {
          const x = x0 + (x1 - x0) * (i / n);
          cylB(M.guard, 0.045, 0.045, 0.92, 6, x, 0.06, 4.5);
        }
        bx(M.guard, x1 - x0, 0.05, 0.07, (x0 + x1) / 2, 0.94, 4.5);
        bx(M.guard, x1 - x0, 0.04, 0.06, (x0 + x1) / 2, 0.6, 4.5);
      }
      rail(-12.6, 1.2);
      rail(5.4, 8.3);

      function cone(x, z) {
        bx(M.coneWhite, 0.42, 0.04, 0.42, x, 0.03, z);
        B.taper(M.coneOrange, 0.32, 0.32, 0.06, 0.06, 0.56, [x, 0.33, z]);
        B.taper(M.coneWhite, 0.2, 0.2, 0.14, 0.14, 0.12, [x, 0.36, z]);
      }
      cone(5.85, 5.3);
      cone(6.5, 5.75);

      (function () {
        const x = 5.7, z = 4.3;
        cylB(M.lampPole, 0.06, 0.05, 2.9, 6, x, 0.05, z);
        bx(M.sigBox, 0.34, 0.62, 0.24, x, 2.36, z + 0.02);
        B.plane(M.sigRed, 0.2, 0.22, [x, 2.66, z + 0.15]);
        B.plane(M.sigGreen, 0.2, 0.22, [x, 2.46, z + 0.15]);
        bx(M.sigBox, 0.16, 0.12, 0.2, x, 2.98, z);
      })();

      function lamp(x, z, dir) {
        cylB(M.lampPole, 0.09, 0.07, 5.3, 8, x, 0.05, z);
        bxC(M.lampPole, 0.09, 0.09, 1.5, x + dir * 0.7, 5.3, z, [0, 0, dir * 0.12]);
        const hx = x + dir * 1.4;
        bx(M.lampHead, 0.5, 0.14, 0.26, hx, 5.28, z);
        B.plane(M.lampGlow, 3.4, 3.4, [hx, 5.2, z]);
        glowUp(M.lampGlow, 6.0, 6.0, hx, 0.09, z);
      }
      lamp(-8.7, 4.3, 1);
      lamp(9.4, 3.9, -1);

      (function () {
        const x = 8.0, z = 4.1;
        cylB(M.lampPole, 0.07, 0.06, 3.4, 8, x, 0.05, z);
        bx(M.streetSignBack, 1.72, 0.62, 0.1, x, 2.7, z);
        B.plane(M.streetSign, 1.64, 0.54, [x, 3.01, z + 0.06], null, uvStreet);
        B.plane(M.streetSign, 1.64, 0.54, [x, 3.01, z - 0.06], [0, PI, 0], uvStreet);
      })();

      /* ============================================================ *
       * 5. utility poles + overhead wires
       * ============================================================ */
      function pole(x, z, h, withTransformer) {
        cylB(M.pole, 0.17, 0.13, h, 8, x, 0, z);
        for (let a = 0; a < 2; a++) {
          const ay = h - 0.55 - a * 0.85;
          bx(M.pole, 2.0, 0.1, 0.13, x, ay, z);
          for (let i = -1; i <= 1; i += 2) {
            B.cyl(M.metalDark, 0.06, 0.05, 0.18, 6, [x + i * 0.85, ay + 0.14, z]);
          }
        }
        if (withTransformer) {
          cylB(M.metalDark, 0.33, 0.33, 0.95, 10, x + 0.45, h - 2.6, z);
          cylB(M.metal, 0.35, 0.35, 0.08, 10, x + 0.45, h - 1.68, z);
          bx(M.pole, 0.9, 0.08, 0.1, x + 0.2, h - 2.6, z);
        }
        return { x: x, z: z, h: h };
      }
      const P1 = pole(7.6, 3.55, 9.4, true);
      const P2 = pole(-11.9, 4.15, 8.6, false);
      const P3 = pole(13.1, -1.2, 7.6, false);

      function wireRun(a, b, sag, n) {
        B.lines(M.wire, wireSegments([a[0], a[1], a[2]], [b[0], b[1], b[2]], sag, n), null, null);
      }
      for (let k = 0; k < 3; k++) {
        const dy = k * 0.34;
        wireRun([P1.x - 0.85 + k * 0.1, P1.h - 0.29 - dy, P1.z], [P2.x + 0.85 - k * 0.1, P2.h - 0.29 - dy, P2.z], 1.1 + k * 0.15, 10);
        wireRun([P1.x + 0.2, P1.h - 0.29 - dy, P1.z], [P3.x - 0.2, P3.h - 0.29 - dy, P3.z], 0.9 + k * 0.12, 9);
      }
      wireRun([P1.x - 0.6, P1.h - 3.6, P1.z], [-1.0, 5.2, -4.6], 0.7, 8);
      wireRun([P1.x - 0.5, P1.h - 4.2, P1.z], [2.0, 4.9, -2.0], 0.5, 6);
      wireRun([P2.x + 0.7, P2.h - 2.4, P2.z], [-9.0, 4.6, 0.2], 0.6, 7);
      wireRun([P3.x - 0.5, P3.h - 1.2, P3.z], [9.6, 6.4, -3.4], 0.5, 6);
      wireRun([P1.x + 0.9, P1.h - 1.5, P1.z], [12.6, 6.2, 6.8], 0.8, 7);

      /* ============================================================ *
       * 6. background: apartment blocks + ramen shop
       * ============================================================ */
      function litWindow(mat, x, y, z, w, h, face) {
        if (face === 'x') B.plane(mat, w, h, [x, y, z], [0, PI / 2, 0]);
        else B.plane(mat, w, h, [x, y, z]);
      }

      bx(M.aptWall, 4.6, 9.2, 5.6, -11.6, 0, -7.0);
      bx(M.aptWall2, 4.8, 0.3, 5.8, -11.6, 9.2, -7.0);
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
          if ((r * 3 + c) % 3 === 2) continue;
          litWindow((r + c) % 3 === 0 ? M.aptWinB : M.aptWinA, -13.0 + c * 1.35, 1.35 + r * 1.55, -4.18, 0.62, 0.86, 'z');
        }
      }
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          if ((r * 3 + c) % 3 !== 1) continue;
          litWindow((r + c) % 2 ? M.aptWinA : M.aptWinB, -9.28, 1.5 + r * 1.6, -8.6 + c * 1.5, 0.7, 0.8, 'x');
        }
      }
      bx(M.aptWall2, 4.0, 6.4, 4.4, -11.8, 0, -1.6);
      bx(M.aptWall, 4.2, 0.26, 4.6, -11.8, 6.4, -1.6);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          if ((r + c) % 3 !== 0) continue;
          litWindow(r % 2 ? M.aptWinA : M.aptWinB, -13.0 + c * 1.5, 1.6 + r * 1.7, 0.62, 0.72, 0.9, 'z');
        }
      }
      bx(M.aptWall, 10.0, 6.8, 3.4, -3.0, 0, -8.2);
      bx(M.aptWall2, 10.2, 0.28, 3.6, -3.0, 6.8, -8.2);
      for (let c = 0; c < 4; c++) {
        if (c === 2) continue;
        litWindow(c % 2 ? M.aptWinB : M.aptWinA, -7.0 + c * 2.4, 4.9, -6.44, 0.8, 0.9, 'z');
      }
      // extra windows + rooftop silhouette on the tall block
      for (let r = 0; r < 5; r++) {
        if (r === 2) continue;
        litWindow(r % 2 ? M.aptWinA : M.aptWinB, -9.24, 1.4 + r * 1.55, -8.3, 0.66, 0.78, 'x');
      }
      cylB(M.metalDark, 0.9, 0.9, 1.6, 10, -12.2, 9.5, -7.6);
      bx(M.metalDark, 0.5, 0.16, 0.5, -12.2, 11.1, -7.6);
      B.lines(M.wire, [
        [[-11.0, 9.5, -6.2], [-11.0, 11.4, -6.2]],
        [[-11.5, 10.8, -6.2], [-10.5, 10.8, -6.2]],
        [[-12.6, 9.6, -7.8], [-12.6, 11.0, -7.8]]
      ], null, null);
      bx(M.concreteDark, 1.2, 0.8, 1.0, -1.0, 6.82, -7.6);
      // small vertical lightbox on the low block (warm accent on the left)
      bx(M.signBox, 0.1, 1.1, 0.5, -9.32, 3.4, -1.2);
      B.plane(M.signSide, 0.86, 0.44, [-9.38, 3.95, -1.2], [0, -PI / 2, 0], uvSignSide);
      B.plane(M.signHalo, 1.8, 1.6, [-9.5, 3.9, -1.2]);

      (function () {
        const x0 = 9.2, x1 = 13.7, z0 = -8.6, z1 = -3.8;
        const cx2 = (x0 + x1) / 2;
        bx(M.ramenWall, x1 - x0, 3.1, z1 - z0, cx2, 0, (z0 + z1) / 2);
        bxC(M.roof, x1 - x0 + 0.6, 0.16, 2.6, cx2, 3.32, z1 - 0.9, [0.42, 0, 0]);
        bxC(M.roof, x1 - x0 + 0.6, 0.16, 2.6, cx2, 3.32, z1 - 2.9, [-0.42, 0, 0]);
        litWindow(M.ramenWin, cx2 - 0.4, 1.5, z1 + 0.02, 2.0, 1.5, 'z');
        bx(M.dark, 0.9, 2.1, 0.1, x1 - 0.7, 0, z1 + 0.03);
        bx(M.ramenWall, 3.4, 0.86, 0.14, cx2 - 0.2, 2.5, z1 + 0.12);
        B.plane(M.ramenSign, 3.24, 0.76, [cx2 - 0.2, 2.93, z1 + 0.2], null, uvRamen);
        B.plane(M.ramenGlow, 4.2, 2.4, [cx2 - 0.2, 2.8, z1 + 0.3]);
        for (let i = 0; i < 2; i++) {
          const lx = cx2 - 1.2 + i * 1.9;
          B.sphere(M.lantern, 0.24, 8, 7, [lx, 1.85, z1 + 0.34]);
          bx(M.dark, 0.03, 0.3, 0.03, lx, 2.1, z1 + 0.34);
          B.plane(M.lanternGlow, 1.5, 1.5, [lx, 1.85, z1 + 0.5]);
        }
        bx(M.cloth, 1.4, 0.5, 0.05, x1 - 0.7, 1.7, z1 + 0.09);
        glowUp(M.ramenGlow, 5.0, 3.0, cx2, 0.08, z1 + 1.2);
      })();

      /* ============================================================ *
       * 7. sakura tree (bottom-right) + fallen petals
       * ============================================================ */
      (function () {
        const tx = 12.8, tz = 7.6;
        B.cyl(M.trunk, 0.4, 0.27, 2.0, 8, [tx, 1.0, tz], [0.05, 0, 0.06]);
        B.cyl(M.trunk, 0.27, 0.17, 1.4, 8, [tx - 0.06, 2.65, tz + 0.05], [0.12, 0, 0.18]);
        B.cyl(M.trunk, 0.15, 0.08, 1.1, 6, [tx + 0.2, 3.0, tz - 0.12], [-0.3, 0, -0.42]);
        B.cyl(M.trunk, 0.14, 0.07, 1.0, 6, [tx - 0.22, 3.05, tz - 0.1], [-0.25, 0, 0.5]);

        const under = [
          [-0.52, 3.5, 0.24, 0.54, 2],
          [-0.06, 3.45, -0.5, 0.52, 0],
          [0.5, 3.6, 0.22, 0.52, 2],
          [0.1, 3.6, 0.55, 0.5, 0],
          [-0.4, 3.72, -0.4, 0.48, 1],
          [0.42, 3.76, -0.4, 0.48, 1]
        ];
        const top = [
          [0, 4.25, 0, 0.68, 1],
          [-0.55, 4.05, 0.24, 0.54, 2],
          [0.55, 4.0, 0.2, 0.52, 0],
          [0.12, 4.6, -0.22, 0.5, 2],
          [-0.28, 4.45, 0.38, 0.45, 1],
          [0.44, 4.4, -0.4, 0.44, 0]
        ];
        const mats = [M.blossomA, M.blossomB, M.blossomC];
        function cluster(c, i, dark) {
          const cx3 = tx + c[0], cy3 = c[1], cz3 = tz + c[2];
          B.cyl(M.trunk, dark ? 0.065 : 0.045, 0.03, 1.0, 4,
            [tx + c[0] * 0.55, cy3 - 0.5, tz + c[2] * 0.55],
            [Math.atan2(c[2], 1.0), 0, -Math.atan2(c[0], 1.0)]);
          B.blob(dark ? M.blossomC : mats[c[4]], c[3], 9, 7, 0.36, 11 + i, [cx3, cy3, cz3]);
        }
        for (let i = 0; i < under.length; i++) cluster(under[i], i, true);
        for (let i = 0; i < top.length; i++) cluster(top[i], 20 + i, false);

        for (let i = 0; i < 18; i++) {
          const a = R() * PI * 2, r = 0.6 + R() * 2.6;
          quadUp(M.petal, 0.16, 0.12, tx + Math.cos(a) * r, 0.062, tz + Math.sin(a) * r * 0.8, uvPetal);
        }
        glowUp(M.treeGlow, 5.0, 4.6, tx, 0.085, tz);
        B.plane(DIO.shadow.material(0.34), 4.4, 3.8, [tx, 0.048, tz], [-PI / 2, 0, 0]);
        cylB(M.concrete, 0.66, 0.6, 0.26, 10, tx, 0.02, tz);
      })();

      /* ============================================================ *
       * 8. back-alley detail between store and ramen shop
       * ============================================================ */
      bx(M.concreteDark, 6.6, 1.5, 0.2, 5.6, 0, -3.5);
      bx(M.concrete, 6.7, 0.1, 0.26, 5.6, 1.5, -3.5);
      bx(M.plastic, 0.62, 0.42, 0.5, 3.1, 0.05, -1.4);
      bx(M.prodC, 0.58, 0.36, 0.46, 3.1, 0.47, -1.4);
      bx(M.plastic, 0.62, 0.42, 0.5, 3.9, 0.05, -1.7);
      bx(M.prodA, 0.58, 0.36, 0.46, 3.9, 0.47, -1.7);
      bx(M.lampHead, 0.34, 0.1, 0.16, 6.2, 2.4, -3.36);
      B.plane(M.lampGlow, 1.8, 1.8, [6.2, 2.35, -3.2]);
      bx(M.metalDark, 0.7, 2.0, 0.1, 6.2, 0, -3.34);
      bx(M.concreteDark, 0.9, 0.03, 0.5, 4.8, 0.05, 3.9);

      /* ============================================================ *
       * finish static geometry
       * ============================================================ */
      B.finish(root);

      /* ============================================================ *
       * 9. particles: two rain layers + sakura petals
       * ============================================================ */
      const rainNear = new DIO.Rain({
        count: 660, area: [34, 26], height: 18,
        len: [0.8, 1.7], speed: [22, 30], wind: [1.7, 0.5],
        color: '#cfe0ff', alpha: 0.26, seed: 11
      });
      root.add(rainNear.node);
      const rainFar = new DIO.Rain({
        count: 900, area: [40, 30], height: 22,
        len: [0.45, 1.0], speed: [15, 21], wind: [1.2, 0.35],
        color: '#93aacb', alpha: 0.11, seed: 29
      });
      root.add(rainFar.node);
      const petals = new DIO.Flakes({
        count: 150, area: [10, 9], height: 6.2,
        size: [0.06, 0.12], speed: [0.6, 1.4], sway: [0.3, 0.9],
        spin: [-2.6, 2.6], uv: uvPetal, color: '#ffc4da', alpha: 0.95, seed: 23
      });
      petals.node.position = [12.7, 0, 7.4];
      root.add(petals.node);

      /* geometry stats */
      let tris = 0;
      const matSet = new Set();
      root.traverse(function (n) {
        for (let i = 0; i < n.meshes.length; i++) {
          const m = n.meshes[i];
          tris += m.geometry.count / 3;
          matSet.add(m.material);
        }
      });
      DIO.nightStats = { triangles: Math.round(tris), materials: matSet.size };

      /* ============================================================ *
       * 10. animation (analytic in t only)
       * ============================================================ */
      const rainAmount = { value: 1 };
      function applyRain() {
        rainNear.material.alpha = 0.26 * rainAmount.value;
        rainFar.material.alpha = 0.11 * rainAmount.value;
      }
      applyRain();

      return {
        root: root,
        update: function (t) {
          rainNear.update(t);
          rainFar.update(t);
          petals.update(t);

          const breathe = 1 + 0.05 * Math.sin(t * 1.25) + 0.02 * Math.sin(t * 3.1);
          M.signHalo.alpha = 0.115 * breathe;
          M.doorGlow.alpha = 0.32 + 0.03 * Math.sin(t * 0.9 + 1.2);
          M.doorGlow2.alpha = 0.4 + 0.03 * Math.sin(t * 1.1 + 0.4);
          const fl = Math.sin(t * 13.7) * Math.sin(t * 4.3 + 0.8);
          M.lampGlow.alpha = 0.4 + 0.05 * Math.max(0, fl);
          M.vendGlowA.alpha = 0.32 + 0.02 * Math.sin(t * 2.3);
          M.vendGlowB.alpha = 0.3 + 0.02 * Math.sin(t * 2.1 + 1.7);
          M.lanternGlow.alpha = 0.4 + 0.05 * Math.sin(t * 1.9 + 0.4);
          M.ramenGlow.alpha = 0.3 + 0.03 * Math.sin(t * 1.4);
          const ph = t % 9;
          const green = ph < 5;
          M.sigGreen.emissiveStrength = green ? 1.6 * (0.6 + 0.4 * Math.abs(Math.sin(ph * 6.0))) : 0.12;
          M.sigRed.emissiveStrength = green ? 0.12 : 1.5;
        },
        onParam: function (id, value) {
          if (id === 'rain') {
            rainAmount.value = value === undefined || value === null ? 1 : value;
            applyRain();
          }
        }
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
