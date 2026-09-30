'use strict';
/* 迴路 05 的 3D 工作台：用滑鼠或手指拖曳表筆，讓筆尖接觸待測物的端子（three.js）
   單位：公分。相機從桌子前方（+z）往後看，桌面是 y = 0。 */
const Bench3D = (() => {
  const VER = '0.186.1';
  const CDN = `https://cdn.jsdelivr.net/npm/three@${VER}`;
  const HOVER_Y = 3.2;                    // 拖曳中筆尖離桌面的高度
  const MAT_X = 46, MAT_Z = 26;           // 桌墊半寬、半深
  const REST_Y = 0.55;                    // 表筆平放時筆尖的高度
  const DEFAULT_REST = { red: [-22, 19], black: [-27.5, 19] };
  const LAYOUT = {                        // 後排：插座、燈泡、開關；前排：電池、電阻
    out: { x: -13, z: -12 },
    out2: { x: 0, z: -12 },
    lamp: { x: 14, z: -6, ry: -0.35 },
    sw: { x: 27, z: -9 },
    bat1: { x: -17, z: 9, s: 1.4 },
    bat9: { x: -7, z: 8, s: 1.2 },
    r1: { x: 1.5, z: 10, s: 1.6 },
    r2: { x: 18.5, z: 10, s: 1.6 },
  };                                      // s：小零件放大一點，比較好瞄準
  const METER_AT = { x: -31, z: -8, ry: 0.35 };

  let libPromise = null;
  let current = null;                     // 目前頁面上的工作台（除錯用）
  function loadLib() {
    if (!libPromise) {
      libPromise = Promise.all([
        import(`${CDN}/+esm`),
        import(`${CDN}/examples/jsm/controls/OrbitControls.js/+esm`),
        import(`${CDN}/examples/jsm/environments/RoomEnvironment.js/+esm`),
      ]).then(([T, oc, re]) => ({ T, OrbitControls: oc.OrbitControls, RoomEnvironment: re.RoomEnvironment }));
      libPromise.catch(() => { libPromise = null; });
    }
    return libPromise;
  }

  function supported() {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return false;
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return true;
    } catch (e) { return false; }
  }

  /* 對外介面：先回傳，three.js 載入完成後才真正建立場景 */
  function create(container, opts) {
    let view = null, dead = false;
    const loading = h('div', { class: 'b3d-loading' }, '正在載入 3D 工作台…');
    container.replaceChildren(loading);
    const api = {
      sync() { if (view) view.sync(false); },
      home() { if (view) view.home(); },
      inspect() { return view ? view.inspect() : null; },
      dispose() { dead = true; if (view) view.dispose(); view = null; },
    };
    api.ready = loadLib().then(lib => {
      if (dead) return;
      view = buildView(lib, container, opts);
      loading.remove();
      view.sync(true);
    });
    current = api;
    return api;
  }

  /* 指針電表的刻度面（和 2D 電表同一套數學） */
  function drawFace(g) {
    const PX = 180, PY = 226, C = 20;
    const polar = (r, f) => { const a = (-48 + 96 * f) * Math.PI / 180; return [PX + r * Math.sin(a), PY - r * Math.cos(a)]; };
    const arc = r => { g.beginPath(); g.arc(PX, PY, r, -138 * Math.PI / 180, -42 * Math.PI / 180); g.stroke(); };
    const tick = (r0, r1, f, w) => { const [x0, y0] = polar(r0, f), [x1, y1] = polar(r1, f); g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    const fo = R => isFinite(R) ? C / (C + R) : 0;
    g.fillStyle = '#F8F7EF'; g.fillRect(16, 18, 328, 222);
    g.strokeStyle = '#1E1E1A'; g.lineWidth = 1.6; arc(188);
    [1000, 500, 300, 150, 70, 40, 25, 15, 8, 6, 4, 3, 1.5, 1, 0.5].forEach(R => tick(188, 181, fo(R), 1));
    g.textAlign = 'center';
    [['∞', Infinity], ['200', 200], ['100', 100], ['50', 50], ['30', 30], ['20', 20], ['10', 10], ['5', 5], ['2', 2], ['0', 0]].forEach(([t, R]) => {
      tick(188, 177, fo(R), 1.6);
      const [x, y] = polar(198, fo(R));
      g.font = '700 11px monospace'; g.fillStyle = '#1B6B3A'; g.fillText(t, x, y);
    });
    g.strokeStyle = 'rgba(191,198,201,.8)'; g.lineWidth = 7; arc(168);
    g.strokeStyle = '#1E1E1A'; g.lineWidth = 1.6; arc(152);
    for (let i = 0; i <= 50; i++) tick(152, 152 - (i % 10 === 0 ? 11 : i % 5 === 0 ? 7 : 4), i / 50, i % 10 === 0 ? 1.6 : 1);
    g.fillStyle = '#1E1E1A';
    [[137, [0, 50, 100, 150, 200, 250]], [124, [0, 10, 20, 30, 40, 50]], [111, [0, 2, 4, 6, 8, 10]]].forEach(([r, labs], ri) => {
      g.font = `${ri ? 500 : 700} 10px monospace`;
      labs.forEach((t, i) => { const [x, y] = polar(r, i / 5); g.fillText(String(t), x, y + 4); });
    });
    g.font = '10px monospace'; g.fillStyle = '#555'; g.fillText('DCV·ACV·DCmA', 180, 176);
    const [ox, oy] = polar(214, 0.04);
    g.textAlign = 'left'; g.font = '700 15px sans-serif'; g.fillStyle = '#1B6B3A'; g.fillText('Ω', ox, oy);
    g.fillStyle = '#2A2A26'; g.beginPath(); g.arc(180, 240, 30, Math.PI, 0); g.fill();
  }

  function buildView({ T, OrbitControls, RoomEnvironment }, container, opts) {
    const { items, getState, meter, onProbe, onToggleSwitch } = opts;
    const reduce = prefersReducedMotion();
    const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
    const UP = V3(0, 1, 0);
    let disposed = false;

    /* ---------- 渲染器、場景、相機 ---------- */
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.toneMapping = T.NeutralToneMapping;
    const canvas = renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '3D 工作台：拖曳紅、黑表筆接觸待測物的端子。無法使用滑鼠或觸控時，請切換到清單模式。');
    const labelsEl = h('div', { class: 'b3d-labels', 'aria-hidden': 'true' });
    const resetBtn = h('button', { type: 'button', class: 'btn btn-sm b3d-reset' }, '重設視角');
    container.append(canvas, labelsEl, resetBtn);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new T.Scene();
    const pmrem = new T.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envTex = pmrem.fromScene(room, 0.04).texture;
    if (room.dispose) room.dispose();
    scene.environment = envTex;
    scene.environmentIntensity = 0.55;

    const camera = new T.PerspectiveCamera(36, 1.6, 0.5, 800);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !reduce;
    controls.dampingFactor = 0.12;
    controls.minDistance = 18;
    controls.maxDistance = 190;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = 1.33;
    controls.screenSpacePanning = false;

    scene.add(new T.HemisphereLight(0xffffff, 0x6b5a45, 0.45));
    const sun = new T.DirectionalLight(0xffffff, 1.9);
    sun.position.set(-28, 70, 42);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -62, right: 62, top: 42, bottom: -42, near: 10, far: 200 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    scene.add(sun);

    /* ---------- 材質與小工具 ---------- */
    const std = (color, roughness, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
    const M = {
      metal: std(0xd2d6da, 0.3, 1), brass: std(0xd4ad55, 0.35, 1),
      white: std(0xf3f2ed, 0.55), ivory: std(0xe8e2d2, 0.6), wall: std(0xcdc8be, 0.9),
      dark: std(0x1c1c1c, 0.7), slot: std(0x080808, 0.95),
      batBlue: std(0x2f5d8c, 0.4, 0.1), batCap: std(0xc8962c, 0.35, 0.6),
      wood: std(0x9a7650, 0.8), meterBody: std(0xf2b705, 0.5), meterDark: std(0x2a302d, 0.55),
      needle: std(0xc0261b, 0.5), redJack: std(0xc0261b, 0.45), resBeige: std(0xd9c08c, 0.6), resBlue: std(0x4a79b8, 0.5),
      bandBeige: std(0xb9a071, 0.7), bandBlue: std(0x3d6597, 0.6), onDot: std(0xd0312d, 0.5),
      glass: new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.25, depthWrite: false }),
    };
    const cyl = (rt, rb, hh, seg = 24) => new T.CylinderGeometry(rt, rb, hh, seg);
    const box = (w, hh, d) => new T.BoxGeometry(w, hh, d);
    function mk(geo, mat, x = 0, y = 0, z = 0, o = {}) {
      const m = new T.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (o.rx) m.rotation.x = o.rx;
      if (o.ry) m.rotation.y = o.ry;
      if (o.rz) m.rotation.z = o.rz;
      if (o.s) m.scale.set(...o.s);
      m.castShadow = o.cast !== false;
      m.receiveShadow = !!o.recv;
      return m;
    }

    /* ---------- 桌子與防靜電桌墊 ---------- */
    function matTexture() {
      const c = document.createElement('canvas');
      c.width = 2048; c.height = Math.round(2048 * MAT_Z / MAT_X);
      const g = c.getContext('2d');
      const px = c.width / (MAT_X * 2);
      g.fillStyle = '#3c5a50'; g.fillRect(0, 0, c.width, c.height);
      for (let cm = 0; cm <= MAT_X * 2; cm++) {
        g.fillStyle = cm % 5 === 0 ? 'rgba(160,200,185,.28)' : 'rgba(160,200,185,.10)';
        g.fillRect(Math.round(cm * px), 0, cm % 5 === 0 ? 2 : 1, c.height);
      }
      for (let cm = 0; cm <= MAT_Z * 2; cm++) {
        g.fillStyle = cm % 5 === 0 ? 'rgba(160,200,185,.28)' : 'rgba(160,200,185,.10)';
        g.fillRect(0, Math.round(cm * px), c.width, cm % 5 === 0 ? 2 : 1);
      }
      g.fillStyle = 'rgba(255,255,255,.28)'; g.font = '700 26px sans-serif'; g.textAlign = 'right';
      g.fillText('ANTI-STATIC MAT · 防靜電桌墊', c.width - 30, c.height - 26);
      const tex = new T.CanvasTexture(c);
      tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = maxAniso;
      return tex;
    }
    scene.add(mk(box(124, 4, 72), M.wood, 0, -2.3, 2, { cast: false, recv: true }));
    scene.add(mk(box(MAT_X * 2, 0.3, MAT_Z * 2), new T.MeshStandardMaterial({ map: matTexture(), roughness: 0.92 }), 0, -0.15, 0, { cast: false, recv: true }));

    /* ---------- 待測物 ---------- */
    const BUILD = {
      bat1() {
        const g = new T.Group(), y = 1.2;
        g.add(mk(box(1.4, 0.5, 1.6), M.dark, -1.5, 0.25, 0), mk(box(1.4, 0.5, 1.6), M.dark, 1.5, 0.25, 0));
        g.add(mk(cyl(0.7, 0.7, 3.3, 32), M.batBlue, -0.65, y, 0, { rz: Math.PI / 2 }));
        g.add(mk(cyl(0.7, 0.7, 1.2, 32), M.batCap, 1.6, y, 0, { rz: Math.PI / 2 }));
        g.add(mk(cyl(0.28, 0.28, 0.22, 20), M.metal, 2.31, y, 0, { rz: Math.PI / 2 }));
        g.add(mk(cyl(0.6, 0.6, 0.06, 24), M.metal, -2.33, y, 0, { rz: Math.PI / 2 }));
        return { g, label: V3(0, 0, 1.3), below: true, terms: { '+': { p: V3(2.42, y, 0), n: V3(1, 0.5, 0.35) }, '-': { p: V3(-2.37, y, 0), n: V3(-1, 0.5, 0.35) } } };
      },
      bat9() {
        const g = new T.Group();
        g.add(mk(box(2.6, 3.8, 1.7), M.batBlue, 0, 1.9, 0));
        g.add(mk(box(2.62, 0.9, 1.72), M.dark, 0, 4.25, 0));
        g.add(mk(cyl(0.3, 0.3, 0.4, 20), M.metal, -0.62, 4.9, 0));
        g.add(mk(cyl(0.46, 0.46, 0.34, 6), M.metal, 0.62, 4.87, 0));
        return { g, label: V3(0, 7.4, 0), terms: { '+': { p: V3(-0.62, 5.1, 0), n: V3(-0.15, 1, 0.4) }, '-': { p: V3(0.62, 5.04, 0), n: V3(0.15, 1, 0.4) } } };
      },
      out: () => outlet(false),
      out2: () => outlet(true),
      r1: () => resistor(M.resBeige, M.bandBeige),
      r2: () => resistor(M.resBlue, M.bandBlue),
      sw() {
        const g = new T.Group();
        g.add(mk(box(6, 1.6, 8.6), M.white, 0, 0.8, 0));
        g.add(mk(box(4, 0.12, 10.4), M.metal, 0, 1.62, 0));
        const pivot = new T.Group();
        pivot.position.set(0, 1.7, 0);
        g.add(pivot);
        pivot.add(mk(box(3, 0.8, 4.2), M.ivory, 0, 0.35, 0), mk(box(0.8, 0.06, 0.5), M.onDot, 0, 0.78, 1.4, { cast: false }));
        g.add(mk(cyl(0.45, 0.45, 0.3, 16), M.brass, -3.15, 0.85, 1.9, { rz: Math.PI / 2 }));
        g.add(mk(cyl(0.45, 0.45, 0.3, 16), M.brass, 3.15, 0.85, 1.9, { rz: Math.PI / 2 }));
        return { g, pivot, label: V3(0, 0, 5.3), below: true, terms: { '1': { p: V3(-3.32, 0.85, 1.9), n: V3(-1, 0.6, 0.4) }, '2': { p: V3(3.32, 0.85, 1.9), n: V3(1, 0.6, 0.4) } } };
      },
      lamp() {
        const g = new T.Group();
        const inner = new T.Group();
        inner.position.set(0, 3.1, 0);
        inner.rotation.x = -Math.PI / 2;           // 燈泡軸線朝後，燈頭朝前
        g.add(inner);
        const glassPts = [new T.Vector2(1.15, 0), new T.Vector2(1.25, 1.0), new T.Vector2(1.9, 2.2)];
        for (let a = -0.87; a <= Math.PI / 2 + 1e-6; a += (Math.PI / 2 + 0.87) / 24) glassPts.push(new T.Vector2(Math.max(0, 3 * Math.cos(a)), 5 + 3 * Math.sin(a)));
        const glass = mk(new T.LatheGeometry(glassPts, 40), M.glass, 0, 0, 0, { cast: false });
        glass.renderOrder = 2;
        inner.add(glass);
        inner.add(mk(cyl(0.18, 0.35, 3, 12), M.ivory, 0, 1.5, 0, { cast: false }));
        inner.add(mk(new T.TorusGeometry(0.6, 0.05, 6, 20), M.dark, 0, 4.3, 0, { cast: false }));
        const thread = [];
        for (let i = 0; i <= 16; i++) thread.push(new T.Vector2(i % 2 ? 1.42 : 1.28, -2.4 + i * (2.35 / 16)));
        inner.add(mk(new T.LatheGeometry(thread, 32), M.metal));
        inner.add(mk(cyl(0.95, 1.1, 0.35, 24), M.dark, 0, -2.575, 0));
        inner.add(mk(cyl(0.36, 0.3, 0.22, 16), M.brass, 0, -2.86, 0));
        g.add(mk(box(2.4, 1.68, 2.4), M.wood, 0, 0.84, 1.3));
        return { g, label: V3(0, 7.4, -4), terms: { c: { p: V3(0, 3.1, 2.99), n: V3(0, 0.3, 1) }, s: { p: V3(0, 4.52, 1.1), n: V3(0, 1, 0.3) } } };
      },
    };
    function outlet(horizontal) {
      const g = new T.Group();
      g.add(mk(box(9, 12, 4), M.wall, 0, 6, 0));
      g.add(mk(box(7, 10.5, 0.35), M.white, 0, 6.4, 2.17));
      g.add(mk(box(4.6, 6.6, 0.25), M.ivory, 0, 6.6, 2.46));
      const yS = 7.7, yE = 5.1, xs = horizontal ? 1.25 : 1.1;
      const slot = (x, w, hh) => g.add(mk(box(w, hh, 0.12), M.slot, x, yS, 2.55, { cast: false }));
      if (horizontal) { slot(-xs, 1.5, 0.32); slot(xs, 1.5, 0.32); } else { slot(-xs, 0.32, 1.5); slot(xs, 0.32, 1.5); }
      g.add(mk(cyl(0.45, 0.45, 0.12, 20), M.slot, 0, yE, 2.55, { rx: Math.PI / 2, cast: false }));
      const n = V3(0, 0.22, 1), [a, b] = horizontal ? ['X', 'Y'] : ['A', 'B'];
      return { g, label: V3(0, 13.9, 0), terms: { [a]: { p: V3(-xs, yS, 2.3), n }, [b]: { p: V3(xs, yS, 2.3), n }, E: { p: V3(0, yE, 2.3), n } } };
    }
    function resistor(body, band) {
      const g = new T.Group(), y = 0.32;
      g.add(mk(cyl(0.3, 0.3, 1.3, 20), body, 0, y, 0, { rz: Math.PI / 2 }));
      g.add(mk(new T.SphereGeometry(0.34, 16, 12), body, -0.72, y, 0, { s: [0.8, 1, 1] }));
      g.add(mk(new T.SphereGeometry(0.34, 16, 12), body, 0.72, y, 0, { s: [0.8, 1, 1] }));
      [-0.35, -0.05, 0.25].forEach(x => g.add(mk(cyl(0.305, 0.305, 0.12, 20), band, x, y, 0, { rz: Math.PI / 2, cast: false })));
      g.add(mk(cyl(0.035, 0.035, 2.3, 8), M.metal, -2.08, y, 0, { rz: Math.PI / 2 }));
      g.add(mk(cyl(0.035, 0.035, 2.3, 8), M.metal, 2.08, y, 0, { rz: Math.PI / 2 }));
      return { g, label: V3(0, 2.6, 0), terms: { '1': { p: V3(-3.18, y, 0), n: V3(-0.35, 1, 0.35) }, '2': { p: V3(3.18, y, 0), n: V3(0.35, 1, 0.35) } } };
    }

    const terminals = [];
    const labels = [];
    let swParts = null, swLabel = null;
    for (const [id, L] of Object.entries(LAYOUT)) {
      const built = BUILD[id]();
      built.g.position.set(L.x, 0, L.z);
      built.g.rotation.y = L.ry || 0;
      built.g.scale.setScalar(L.s || 1);
      scene.add(built.g);
      built.g.updateMatrixWorld(true);
      for (const [key, spec] of Object.entries(built.terms)) {
        const p = spec.p.clone().applyMatrix4(built.g.matrixWorld);
        const n = spec.n.clone().normalize().transformDirection(built.g.matrixWorld);
        const lab = (items[id].terms.find(t => t[0] === key) || [key, key])[1];
        terminals.push({ id: id + ':' + key, item: id, key, name: items[id].name + '・' + lab, p, n, ring: null });
      }
      const el = h('div', { class: 'b3d-label' }, items[id].name);
      labelsEl.append(el);
      labels.push({ el, p: built.g.localToWorld(built.label.clone()), below: !!built.below });
      if (id === 'sw') { swParts = built; swLabel = el; }
    }

    /* ---------- 3D 電表 ---------- */
    const STEP = 360 / 17;
    const meter3 = (() => {
      const g = new T.Group();
      g.position.set(METER_AT.x, 0, METER_AT.z);
      g.rotation.y = METER_AT.ry;
      const mb = new T.Group();
      mb.rotation.x = -0.4;
      g.add(mb);
      mb.add(mk(box(9.6, 15.4, 3.4), M.meterBody, 0, 7.7, -1.7));
      mb.add(mk(box(8.8, 6.2, 0.12), M.meterDark, 0, 11.2, 0.02, { cast: false }));
      const fc = document.createElement('canvas');
      fc.width = 1024; fc.height = 693;
      const fg = fc.getContext('2d');
      fg.scale(1024 / 328, 693 / 222); fg.translate(-16, -18);
      drawFace(fg);
      const faceTex = new T.CanvasTexture(fc);
      faceTex.colorSpace = T.SRGBColorSpace; faceTex.anisotropy = maxAniso;
      const face = new T.Mesh(new T.PlaneGeometry(8.4, 5.68), new T.MeshStandardMaterial({ map: faceTex, roughness: 0.6 }));
      face.position.set(0, 11.2, 0.1);
      mb.add(face);
      const pivot = new T.Group();
      pivot.position.set(0, 8.72, 0.14);
      mb.add(pivot);
      pivot.add(mk(box(0.05, 5, 0.02), M.needle, 0, 2.5, 0, { cast: false }));
      const knob = new T.Group();
      knob.position.set(0, 4.5, 0.05);
      mb.add(knob);
      knob.add(mk(cyl(2.3, 2.3, 0.7, 40), M.meterDark, 0, 0, 0.35, { rx: Math.PI / 2 }));
      knob.add(mk(box(0.8, 4.2, 0.3), M.meterDark, 0, 0, 0.85));
      knob.add(mk(box(0.22, 1.2, 0.05), M.white, 0, 1.45, 1.02, { cast: false }));
      mb.add(mk(new T.TorusGeometry(2.7, 0.08, 6, 48), M.meterDark, 0, 4.5, 0.05, { cast: false }));
      mb.add(mk(cyl(0.7, 0.7, 0.4, 24), M.meterDark, -3.3, 7.4, 0.2, { rx: Math.PI / 2 }));
      mb.add(mk(cyl(0.5, 0.5, 0.3, 20), M.dark, -3.2, 1.3, 0.15, { rx: Math.PI / 2 }));
      mb.add(mk(cyl(0.5, 0.5, 0.3, 20), M.redJack, 3.2, 1.3, 0.15, { rx: Math.PI / 2 }));
      g.add(mk(box(6, 0.4, 7.5), M.meterDark, 0, 3.2, -6.4, { rx: 0.95 }));
      scene.add(g);
      g.updateMatrixWorld(true);
      const jack = (x) => ({ p: mb.localToWorld(V3(x, 1.3, 0.35)), d: V3(0, -0.25, 1).normalize().transformDirection(mb.matrixWorld) });
      return { pivot, knob, jacks: { black: jack(-3.2), red: jack(3.2) }, label: g.localToWorld(V3(0, 18.5, -6)) };
    })();
    {
      const el = h('div', { class: 'b3d-label' }, '三用電表');
      labelsEl.append(el);
      labels.push({ el, p: meter3.label });
    }

    /* ---------- 表筆 ---------- */
    function makeProbe(which) {
      const mat = std(which === 'red' ? 0xc72f28 : 0x222222, 0.45);
      const g = new T.Group();
      g.add(mk(new T.ConeGeometry(0.09, 0.35, 14), M.metal, 0, 0.175, 0, { rx: Math.PI }));
      g.add(mk(cyl(0.09, 0.09, 1.8, 12), M.metal, 0, 1.25, 0));
      g.add(mk(cyl(0.72, 0.6, 0.3, 24), mat, 0, 2.3, 0));
      g.add(mk(cyl(0.44, 0.5, 6.2, 24), mat, 0, 5.55, 0));
      for (let i = 0; i < 4; i++) g.add(mk(new T.TorusGeometry(0.47, 0.035, 6, 24), M.dark, 0, 3.2 + i * 0.5, 0, { rx: Math.PI / 2, cast: false }));
      g.add(mk(cyl(0.26, 0.42, 1.5, 16), mat, 0, 9.4, 0));
      const hit = new T.Mesh(cyl(1.4, 1.4, 10.6, 8), new T.MeshBasicMaterial());
      hit.position.y = 5.2;
      hit.visible = false;
      hit.userData.which = which;
      g.add(hit);
      scene.add(g);
      return { which, g, hit, mat, cur: { pos: V3(), q: new T.Quaternion() }, tgt: { pos: V3(), q: new T.Quaternion() }, anim: false, rest: null, cable: null, cableDirty: true };
    }
    const probes = { red: makeProbe('red'), black: makeProbe('black') };
    const other = p => probes[p.which === 'red' ? 'black' : 'red'];

    function updateCable(p) {
      p.g.updateMatrixWorld(true);
      const back = p.g.localToWorld(V3(0, 10.1, 0));
      const axis = UP.clone().applyQuaternion(p.g.quaternion);
      const p1 = back.clone().addScaledVector(axis, 3.5);
      const J = meter3.jacks[p.which];
      const j1 = J.p.clone().addScaledVector(J.d, 3);
      const mid = p1.clone().lerp(j1, 0.5);
      [p1, j1].forEach(v => { v.y = Math.max(v.y, 0.3); });
      mid.y = 0.3;
      const curve = new T.CatmullRomCurve3([back, p1, mid, j1, J.p.clone()], false, 'centripetal');
      const geo = new T.TubeGeometry(curve, 72, 0.17, 8, false);
      if (p.cable) { p.cable.geometry.dispose(); p.cable.geometry = geo; }
      else { p.cable = new T.Mesh(geo, p.mat); p.cable.castShadow = true; scene.add(p.cable); }
      p.cableDirty = false;
    }

    /* ---------- 姿勢 ---------- */
    const quatFor = axis => new T.Quaternion().setFromUnitVectors(UP, axis.clone().normalize());
    function termPose(t, twist) {
      const axis = t.n.clone();
      if (twist) axis.applyAxisAngle(UP, 0.55);
      return { pos: t.p.clone(), q: quatFor(axis) };
    }
    function lyingPose(which, x, z) {
      const pos = V3(x, REST_Y, z);
      const d = meter3.jacks[which].p.clone().sub(pos);
      d.y = 0;
      if (d.lengthSq() < 1) d.set(0, 0, -1);
      d.normalize();
      d.y = 0.03;
      return { pos, q: quatFor(d) };
    }
    function restPose(p) {
      const [x, z] = p.rest ? [p.rest.x, p.rest.z] : DEFAULT_REST[p.which];
      return lyingPose(p.which, x, z);
    }
    function crossedPose(which) {
      const q = V3(-19, REST_Y, 16.5);
      const sgn = which === 'red' ? 1 : -1;
      return { pos: q.clone().add(V3(0.1 * sgn, 0, 0)), q: quatFor(V3(0.5 * sgn, 0.03, -1)) };
    }
    function heldAxis(which, pos) {
      const toCam = camera.position.clone().sub(pos);
      toCam.y = 0;
      toCam.normalize();
      const side = V3(-toCam.z, 0, toCam.x);
      return UP.clone().addScaledVector(toCam, 0.8).addScaledVector(side, which === 'red' ? -0.18 : 0.18).normalize();
    }
    function apply(p) {
      p.g.position.copy(p.cur.pos);
      p.g.quaternion.copy(p.cur.q);
      p.cableDirty = true;
    }
    function setNow(p, pose) {
      p.cur.pos.copy(pose.pos); p.cur.q.copy(pose.q);
      p.tgt.pos.copy(pose.pos); p.tgt.q.copy(pose.q);
      p.anim = false;
      apply(p);
    }
    function setTarget(p, pose, instant) {
      if (instant || reduce) { setNow(p, pose); return; }
      if (p.tgt.pos.distanceTo(pose.pos) < 1e-3 && p.tgt.q.angleTo(pose.q) < 1e-3) return;
      p.tgt.pos.copy(pose.pos); p.tgt.q.copy(pose.q);
      p.anim = true;
    }
    function stepProbes(dt) {
      let active = false;
      for (const p of Object.values(probes)) {
        if (!p.anim) continue;
        const k = 1 - Math.exp(-dt * 16);
        p.cur.pos.lerp(p.tgt.pos, k);
        p.cur.q.slerp(p.tgt.q, k);
        if (p.cur.pos.distanceTo(p.tgt.pos) < 0.01 && p.cur.q.angleTo(p.tgt.q) < 0.003) { p.cur.pos.copy(p.tgt.pos); p.cur.q.copy(p.tgt.q); p.anim = false; }
        apply(p);
        active = true;
      }
      return active;
    }

    /* ---------- 端子提示圈 ---------- */
    const ringGeo = new T.TorusGeometry(0.55, 0.07, 8, 28);
    const Z = V3(0, 0, 1);
    for (const t of terminals) {
      const ring = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color: 0xf2b705, transparent: true, opacity: 0, depthTest: false }));
      ring.position.copy(t.p).addScaledVector(t.n, 0.35);
      ring.quaternion.setFromUnitVectors(Z, t.n);
      ring.renderOrder = 10;
      ring.visible = false;
      scene.add(ring);
      t.ring = ring;
    }
    const tipRing = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color: 0xf2b705, transparent: true, opacity: 0, depthTest: false }));
    tipRing.renderOrder = 10;
    tipRing.visible = false;
    scene.add(tipRing);
    const tag = h('div', { class: 'b3d-label b3d-tag', hidden: true });
    labelsEl.append(tag);

    /* ---------- 迴圈 ---------- */
    let raf = 0, last = 0, rockerTarget = -0.2, dragging = null, shortMode = null, userMoved = false, clickCand = null, hoverWas = '';
    function requestRender() { if (!raf && !disposed) raf = requestAnimationFrame(frame); }
    function frame(t) {
      raf = 0;
      if (disposed) return;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60;
      last = t;
      let active = controls.update();
      active = stepProbes(dt) || active;
      if (swParts) {
        const r = swParts.pivot.rotation;
        const k = reduce ? 1 : 1 - Math.exp(-dt * 14);
        r.x += (rockerTarget - r.x) * k;
        if (Math.abs(rockerTarget - r.x) > 0.001) active = true; else r.x = rockerTarget;
      }
      if (dragging) {
        const pulse = 0.35 + 0.2 * Math.sin(t / 160);
        for (const tm of terminals) {
          const hot = dragging.key === tm.id;
          tm.ring.material.opacity = hot ? 1 : pulse;
          tm.ring.scale.setScalar(hot ? 1.5 : 1);
        }
        if (tipRing.visible) {
          tipRing.material.opacity = dragging.key === 'short' ? 1 : pulse;
          tipRing.quaternion.copy(camera.quaternion);
        }
        active = true;
      }
      for (const p of Object.values(probes)) if (p.cableDirty) updateCable(p);
      renderer.render(scene, camera);
      updateLabels();
      if (active && !raf) raf = requestAnimationFrame(frame);
      if (!active) last = 0;
    }

    const tmpV = V3();
    function toScreen(v, w, hh) {
      tmpV.copy(v).project(camera);
      if (tmpV.z > 1) return null;
      return { x: (tmpV.x + 1) / 2 * w, y: (1 - tmpV.y) / 2 * hh };
    }
    function updateLabels() {
      const w = canvas.clientWidth, hh = canvas.clientHeight;
      const place = (el, p, dy = 0, below = false) => {
        const s = toScreen(p, w, hh);
        const show = s && s.x > -40 && s.x < w + 40 && s.y > 0 && s.y < hh + 20;
        el.style.visibility = show ? 'visible' : 'hidden';
        if (!show) return;
        const half = (el.offsetWidth || 0) / 2 + 4;          // 標籤不要超出畫布左右邊緣
        const x = half * 2 < w ? clamp(s.x, half, w - half) : s.x;
        el.style.transform = `translate(${x.toFixed(1)}px, ${(s.y - dy).toFixed(1)}px) translate(-50%, ${below ? '6px' : '-100%'})`;
      };
      labels.forEach(l => place(l.el, l.p, 0, l.below));
      if (!tag.hidden && dragging && dragging.tagAt) place(tag, dragging.tagAt, 14);
    }

    /* ---------- 相機 ---------- */
    function resetView() {
      const vf = camera.fov * Math.PI / 180;
      const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
      const narrow = camera.aspect < 1.3;                 // 手機：只框住器材那一段，視角稍微抬高
      const dist = Math.max((narrow ? 37 : 41) / Math.tan(hf / 2), 27 / Math.tan(vf / 2));
      const elev = narrow ? 0.95 : 0.8;
      controls.target.set(0, 2, -1);
      camera.position.set(0, 2 + dist * Math.sin(elev), -1 + dist * Math.cos(elev));
      camera.lookAt(controls.target);
      controls.update();
      userMoved = false;
      requestRender();
    }
    function fit() {
      const w = container.clientWidth, hh = container.clientHeight;
      if (!w || !hh) return;
      const dpr = renderer.getPixelRatio();
      if (canvas.width === Math.floor(w * dpr) && canvas.height === Math.floor(hh * dpr)) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh;
      camera.updateProjectionMatrix();
      if (!userMoved) resetView();
      requestRender();
    }
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    controls.addEventListener('start', () => { userMoved = true; });
    controls.addEventListener('change', () => {
      const tg = controls.target;
      tg.x = clamp(tg.x, -40, 40); tg.z = clamp(tg.z, -24, 24); tg.y = clamp(tg.y, 0, 12);
      requestRender();
    });
    resetBtn.addEventListener('click', resetView);

    /* ---------- 背景跟著頁面主題 ---------- */
    function applyTheme() {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim();
      try { scene.background = new T.Color(v || '#dce2db'); } catch (e) { scene.background = new T.Color('#dce2db'); }
      requestRender();
    }
    const mo = new MutationObserver(applyTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-app-theme', 'data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', applyTheme);
    applyTheme();

    /* ---------- 電表指針與旋鈕同步 ---------- */
    const unsub = meter.subscribe((deg, posI) => {
      meter3.pivot.rotation.z = -deg * Math.PI / 180;
      meter3.knob.rotation.z = -posI * STEP * Math.PI / 180;
      requestRender();
    });

    /* ---------- 拖曳 ---------- */
    const ray = new T.Raycaster();
    const ndc = new T.Vector2();
    const plane = new T.Plane(UP.clone(), -HOVER_Y);
    function aim(e, lift) {
      scene.updateMatrixWorld();
      camera.updateMatrixWorld();
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top - lift;
      ndc.set(x / r.width * 2 - 1, -(y / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return { x, y, w: r.width, h: r.height };
    }
    function findTarget(a, d) {
      const R = d.type === 'touch' ? 46 : 30;
      let best = null, bd = R;
      for (const t of terminals) {
        const s = toScreen(t.p, a.w, a.h);
        if (!s) continue;
        const dist = Math.hypot(s.x - a.x, s.y - a.y);
        if (dist < bd) { bd = dist; best = { kind: 'term', t }; }
      }
      const o = other(d.p);
      if (tipRing.visible) {
        const s = toScreen(o.cur.pos, a.w, a.h);
        if (s && Math.hypot(s.x - a.x, s.y - a.y) < bd) best = { kind: 'short' };
      }
      return best;
    }
    function startDrag(p, e) {
      const st = getState();
      dragging = { p, id: e.pointerId, type: e.pointerType, lift: e.pointerType === 'touch' ? 44 : 0, key: null, last: p.cur.pos.clone(), tagAt: null };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
      controls.enabled = false;
      canvas.style.cursor = 'grabbing';
      if (st.shorted) {
        const o = other(p);
        o.rest = V3(o.cur.pos.x, 0, o.cur.pos.z);
        shortMode = null;
      }
      if (st.shorted || st[p.which]) onProbe(p.which, null);
      p.rest = null;
      const o = other(p);
      const st2 = getState();
      tipRing.visible = !st2[o.which];
      if (tipRing.visible) tipRing.position.copy(o.cur.pos);
      terminals.forEach(t => { t.ring.visible = true; });
      moveDrag(e);
    }
    function moveDrag(e) {
      const d = dragging, p = d.p;
      const a = aim(e, d.lift);
      const hit = V3();
      if (ray.ray.intersectPlane(plane, hit)) {
        hit.x = clamp(hit.x, -MAT_X + 1.5, MAT_X - 1.5);
        hit.z = clamp(hit.z, -MAT_Z + 1.5, MAT_Z - 1.5);
        d.last.copy(hit);
      }
      const cand = findTarget(a, d);
      let key = null;
      if (cand && cand.kind === 'term') {
        const st = getState();
        const o = st[other(p).which];
        const same = o && o.item === cand.t.item && o.t === cand.t.key;
        setNow(p, termPose(cand.t, same));
        key = cand.t.id;
        d.tagAt = cand.t.p;
        tag.textContent = cand.t.name;
      } else if (cand && cand.kind === 'short') {
        const o = other(p);
        const pos = o.cur.pos.clone().add(V3(0.12, 0.05, 0.12));
        setNow(p, { pos, q: quatFor(heldAxis(p.which, pos)) });
        key = 'short';
        d.tagAt = o.cur.pos;
        tag.textContent = '碰到另一支筆尖（兩棒短接）';
      } else {
        setNow(p, { pos: d.last.clone(), q: quatFor(heldAxis(p.which, d.last)) });
        d.tagAt = null;
      }
      tag.hidden = !key;
      if (key !== d.key) {
        d.key = key;
        if (key === 'short') { shortMode = 'touch'; onProbe(p.which, 'short'); }
        else onProbe(p.which, key ? { item: cand.t.item, t: cand.t.key } : null);
      }
      requestRender();
    }
    function endDrag() {
      const d = dragging, p = d.p;
      try { canvas.releasePointerCapture(d.id); } catch (err) { /* 忽略 */ }
      controls.enabled = true;
      canvas.style.cursor = '';
      hoverWas = '';
      if (d.key === 'short') {
        const o = other(p).cur.pos;
        const pose = lyingPose(p.which, o.x + 0.25, o.z + 0.2);
        p.rest = V3(pose.pos.x, 0, pose.pos.z);
        setTarget(p, pose);
      } else if (!d.key) {
        p.rest = V3(d.last.x, 0, d.last.z);
        setTarget(p, restPose(p));
      }
      dragging = null;
      terminals.forEach(t => { t.ring.visible = false; });
      tipRing.visible = false;
      tag.hidden = true;
      requestRender();
    }

    function onDown(e) {
      if (e.target !== canvas) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (dragging) return;
      aim(e, 0);
      const hit = ray.intersectObjects([probes.red.hit, probes.black.hit], false)[0];
      if (hit) {
        e.stopPropagation();
        e.preventDefault();
        startDrag(probes[hit.object.userData.which], e);
        return;
      }
      clickCand = swParts && ray.intersectObject(swParts.pivot, true).length ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null;
    }
    function onMove(e) {
      if (dragging) { if (e.pointerId === dragging.id) moveDrag(e); return; }
      if (e.pointerType !== 'mouse' || e.buttons) return;
      aim(e, 0);
      let cur = '';
      if (ray.intersectObjects([probes.red.hit, probes.black.hit], false).length) cur = 'grab';
      else if (swParts && ray.intersectObject(swParts.pivot, true).length) cur = 'pointer';
      if (cur !== hoverWas) { canvas.style.cursor = cur; hoverWas = cur; }
    }
    function onUp(e) {
      if (dragging) { if (e.pointerId === dragging.id) endDrag(); return; }
      if (clickCand && e.pointerId === clickCand.id && Math.hypot(e.clientX - clickCand.x, e.clientY - clickCand.y) < 6) onToggleSwitch();
      clickCand = null;
    }
    container.addEventListener('pointerdown', onDown, { capture: true });
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', e => { if (dragging && e.pointerId === dragging.id) endDrag(); clickCand = null; });

    /* ---------- 與電表章節的狀態同步 ---------- */
    function termOf(ref) { return terminals.find(t => t.item === ref.item && t.key === ref.t); }
    function sync(instant) {
      const st = getState();
      if (!st.shorted) shortMode = null;
      for (const p of Object.values(probes)) {
        if (dragging && dragging.p === p) continue;
        if (st.shorted) {
          if (shortMode === 'touch') { if (instant) setNow(p, { pos: p.cur.pos.clone(), q: p.cur.q.clone() }); continue; }
          shortMode = 'crossed';
          setTarget(p, crossedPose(p.which), instant);
          p.rest = null;
        } else if (st[p.which]) {
          const t = termOf(st[p.which]);
          const o = st[other(p).which];
          const same = p.which === 'black' && o && o.item === st[p.which].item && o.t === st[p.which].t;
          if (t) setTarget(p, termPose(t, same), instant);
          p.rest = null;
        } else {
          setTarget(p, restPose(p), instant);
        }
      }
      rockerTarget = items.sw.on ? 0.2 : -0.2;
      if (instant && swParts) swParts.pivot.rotation.x = rockerTarget;
      if (swLabel) swLabel.textContent = `${items.sw.name}（${items.sw.on ? 'ON' : 'OFF'}）`;
      requestRender();
    }
    function home() { probes.red.rest = null; probes.black.rest = null; }
    /* 查詢表筆握把、筆尖與各端子在畫面上的位置（相對於畫布，給測試與除錯用） */
    function inspect() {
      fit();
      camera.updateMatrixWorld();
      const w = canvas.clientWidth, hh = canvas.clientHeight;
      const grip = p => toScreen(p.g.localToWorld(V3(0, 5.5, 0)), w, hh);
      return {
        probes: Object.fromEntries(Object.values(probes).map(p => [p.which, { grip: grip(p), tip: toScreen(p.cur.pos, w, hh) }])),
        terminals: Object.fromEntries(terminals.map(t => [t.id, toScreen(t.p, w, hh)])),
        rocker: swParts ? toScreen(swParts.pivot.localToWorld(V3(0, 0.7, 0)), w, hh) : null,
      };
    }

    function dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect(); mo.disconnect(); mq.removeEventListener('change', applyTheme); unsub();
      container.removeEventListener('pointerdown', onDown, { capture: true });
      controls.dispose();
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      });
      envTex.dispose(); pmrem.dispose();
      renderer.dispose(); renderer.forceContextLoss();
      canvas.remove(); labelsEl.remove(); resetBtn.remove();
    }

    resetView();
    fit();
    return { sync, home, dispose, inspect };
  }

  return { create, supported, loadLib, current: () => current };
})();
