/* ============================================================
   AKARI MART / 箱庭 DIORAMA — UI glue
   Binds the control deck to the renderer's public API.
   ============================================================ */
(function (global) {
  'use strict';

  const DIO = global.DIO;
  const app = DIO.app;
  if (!app) return;

  const $ = function (id) { return document.getElementById(id); };
  const body = document.body;
  const sceneTabs = $('sceneTabs');
  const viewsHost = $('views');
  const paramsHost = $('paramsHost');
  const titleEl = $('brandTitle');
  const subEl = $('brandSub');
  const hudScene = $('hudScene');
  const hudClock = $('hudClock');
  const hudWeather = $('hudWeather');
  const hudNote = $('hudNote');
  const panel = $('panel');
  const restoreBtn = $('restoreBtn');
  const autoRotateInput = $('autoRotate');
  const tourInput = $('tourToggle');
  const tourbar = $('tourbar');
  const toastEl = $('toast');

  const HUD = {
    night: { num: '01', en: 'NIGHT', clock: '22:47', weather: '雨 · 12mm/h', note: '深夜营业中 / OPEN 24H' },
    sakura: { num: '02', en: 'SAKURA', clock: '15:20', weather: '晴 · 微風 2m/s', note: '桜坂駅 · 上行 1 番線' }
  };

  let initialized = false;
  let sceneList = [];
  let activeId = null;
  let viewButtons = [];
  let tourLoop = 0;

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { toastEl.classList.remove('is-show'); }, 1700);
  }

  function setActiveView(index) {
    for (let i = 0; i < viewButtons.length; i++) {
      viewButtons[i].classList.toggle('is-active', i === index);
    }
  }

  function buildSceneTabs() {
    sceneTabs.innerHTML = '';
    sceneList.forEach(function (s) {
      const b = document.createElement('button');
      b.className = 'sceneTab';
      b.dataset.scene = s.id;
      b.innerHTML = '<small>' + (HUD[s.id] ? HUD[s.id].num + ' / ' + HUD[s.id].en : 'SCENE') + '</small><span>' + s.title + '</span>';
      b.addEventListener('click', function () {
        if (s.id === activeId) return;
        app.setScene(s.id);
        toast(s.title);
      });
      sceneTabs.appendChild(b);
    });
    syncSceneTabs();
  }

  function syncSceneTabs() {
    Array.prototype.forEach.call(sceneTabs.children, function (b) {
      b.classList.toggle('is-active', b.dataset.scene === activeId);
    });
  }

  function buildViews(views) {
    viewsHost.innerHTML = '';
    viewButtons = [];
    (views || []).forEach(function (v, i) {
      const b = document.createElement('button');
      b.className = 'viewbtn';
      b.textContent = v.label || ('镜头 ' + (i + 1));
      b.addEventListener('click', function () {
        app.setView(i);
        setActiveView(i);
      });
      viewsHost.appendChild(b);
      viewButtons.push(b);
    });
    setActiveView(0);
  }

  function buildParams(params) {
    paramsHost.innerHTML = '';
    if (!params || !params.length) return;
    params.forEach(function (p) {
      const label = document.createElement('div');
      label.className = 'panel__label';
      label.textContent = p.label || p.id;
      paramsHost.appendChild(label);
      if (p.type === 'seg' && p.options) {
        const seg = document.createElement('div');
        seg.className = 'seg';
        let current = p.value;
        p.options.forEach(function (o) {
          const b = document.createElement('button');
          b.textContent = o.label;
          if (o.value === p.value) b.classList.add('is-active');
          b.addEventListener('click', function () {
            seg.querySelectorAll('button').forEach(function (x) { x.classList.remove('is-active'); });
            b.classList.add('is-active');
            current = o.value;
            app.setParam(p.id, o.value);
          });
          seg.appendChild(b);
        });
        paramsHost.appendChild(seg);
        app.setParam(p.id, current);
      } else if (p.type === 'range') {
        const row = document.createElement('div');
        row.className = 'seg';
        row.style.alignItems = 'center';
        row.style.gap = '10px';
        const input = document.createElement('input');
        input.type = 'range';
        input.min = p.min; input.max = p.max; input.step = p.step || 0.01;
        input.value = p.value;
        input.style.flex = '1';
        input.style.accentColor = 'var(--accent)';
        const out = document.createElement('b');
        out.style.fontFamily = 'var(--mono)';
        out.style.fontSize = '10px';
        out.style.color = 'var(--ink-2)';
        out.style.minWidth = '34px';
        out.style.textAlign = 'right';
        out.textContent = Number(p.value).toFixed(1);
        input.addEventListener('input', function () {
          out.textContent = Number(input.value).toFixed(1);
          app.setParam(p.id, Number(input.value));
        });
        row.appendChild(input);
        row.appendChild(out);
        paramsHost.appendChild(row);
      }
    });
  }

  function onScene(detail) {
    const def = detail.scene || (DIO.sceneMap ? DIO.sceneMap[detail.id] : null) || {};
    activeId = detail.id;
    body.classList.remove('scene-night', 'scene-sakura');
    body.classList.add('scene-' + detail.id);
    titleEl.textContent = def.title || detail.id;
    subEl.textContent = def.subtitle || '';
    const h = HUD[detail.id] || { num: '00', en: 'SCENE' };
    hudScene.textContent = h.num + ' / ' + h.en;
    hudClock.textContent = h.clock || '--:--';
    hudWeather.textContent = h.weather || '—';
    hudNote.textContent = h.note || '';
    buildViews(detail.views || []);
    buildParams(detail.params || []);
    syncSceneTabs();
  }

  function collapse(on) {
    panel.classList.toggle('is-collapsed', on);
    restoreBtn.hidden = !on;
  }

  function startTourLoop() {
    cancelAnimationFrame(tourLoop);
    const info = app.tourInfo();
    if (!info) return;
    const step = function () {
      const s = app.state;
      tourbar.classList.toggle('is-on', !!s.tour);
      if (s.tour) {
        const p = (s.tourTime % info.total) / info.total;
        tourbar.querySelector('i').style.width = (p * 100).toFixed(2) + '%';
      }
      tourLoop = requestAnimationFrame(step);
    };
    step();
  }

  function init() {
    if (initialized) return;
    initialized = true;
    sceneList = app.scenes();
    buildSceneTabs();
    onScene({ id: app.state.sceneId, views: app.scenes().filter(function (s) { return s.id === app.state.sceneId; })[0].views, params: app.scenes().filter(function (s) { return s.id === app.state.sceneId; })[0].params, scene: DIO.sceneMap[app.state.sceneId] });

    // toggles
    autoRotateInput.addEventListener('change', function () {
      app.setAutoRotate(autoRotateInput.checked);
      toast(autoRotateInput.checked ? '自动旋转 ON' : '自动旋转 OFF');
    });
    tourInput.addEventListener('change', function () {
      app.setTour(tourInput.checked);
      if (tourInput.checked) toast('电影巡游 · CINEMATIC TOUR');
    });

    // buttons
    $('collapseBtn').addEventListener('click', function () { collapse(true); });
    restoreBtn.addEventListener('click', function () { collapse(false); });
    $('hideBtn').addEventListener('click', function () {
      app.setUiVisible(false);
      setTimeout(function () { toast('按 H 或点击左上角显示界面'); }, 400);
    });
    $('shotBtn').addEventListener('click', function () {
      const name = 'akari-mart-' + (app.state.sceneId || 'scene') + '.png';
      app.download(name);
      toast('已保存 · ' + name);
    });

    // keyboard
    global.addEventListener('keydown', function (e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === '1' || k === '2') {
        const s = sceneList[Number(k) - 1];
        if (s && s.id !== app.state.sceneId) { app.setScene(s.id); toast(s.title); }
      } else if (k === 'v') {
        const n = (app.state.viewIndex + 1) % Math.max(1, app.scenes().filter(function (s) { return s.id === app.state.sceneId; })[0].views.length);
        app.setView(n); setActiveView(n);
      } else if (k === 'r') {
        app.setView(0); setActiveView(0); toast('镜头复位');
      } else if (k === ' ') {
        e.preventDefault();
        app.toggleTour();
      } else if (k === 'h') {
        app.setUiVisible(!app.state.ui);
        if (!app.state.ui) setTimeout(function () { toast('按 H 显示界面'); }, 300);
      } else if (k === 'p') {
        app.download('akari-mart-' + (app.state.sceneId || 'scene') + '.png');
        toast('已保存画面');
      } else if (k === 'a') {
        autoRotateInput.checked = !autoRotateInput.checked;
        app.setAutoRotate(autoRotateInput.checked);
      }
    });

    // sync events
    global.addEventListener('dio:scene', function (e) { onScene(e.detail); });
    global.addEventListener('dio:view', function (e) { setActiveView(e.detail.index === undefined ? -1 : e.detail.index); });
    global.addEventListener('dio:tour', function (e) {
      tourInput.checked = !!e.detail.on;
      toast(e.detail.on ? '电影巡游 · CINEMATIC TOUR' : '自由镜头 · FREE CAMERA');
    });
    global.addEventListener('dio:autorotate', function (e) { autoRotateInput.checked = !!e.detail.on; });
    global.addEventListener('dio:ui', function (e) {
      if (!e.detail.on) toast('按 H 显示界面');
    });

    startTourLoop();

    // mobile: stow the deck, keep the scene unobstructed
    if (global.innerWidth < 860) collapse(true);

    const boot = $('boot');
    if (boot) {
      boot.classList.add('is-done');
      setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 900);
    }
  }

  if (app.state.sceneId) init();
  else global.addEventListener('dio:ready', function () { init(); });
})(typeof window !== 'undefined' ? window : globalThis);
